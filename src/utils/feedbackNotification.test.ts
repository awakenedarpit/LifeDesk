import test from 'node:test';
import assert from 'node:assert/strict';
import {
  InMemoryFeedbackNotificationStore,
  processFeedbackNotification,
  type FeedbackEmailSender,
  type StoredFeedbackRecord,
} from './feedbackNotification.ts';
import { DEFAULT_FEEDBACK_RECIPIENT_EMAIL, type ResendEmailRequestPayload } from './feedbackEmail.ts';

function createFeedbackRecord(overrides: Partial<StoredFeedbackRecord> = {}): StoredFeedbackRecord {
  return {
    id: overrides.id ?? '11111111-1111-4111-8111-111111111111',
    userId: overrides.userId ?? 'user-alice',
    category: overrides.category ?? 'Feature Request',
    rating: overrides.rating ?? 5,
    subject: overrides.subject ?? 'Calendar keyboard shortcuts',
    message: overrides.message ?? 'Please add J/K navigation for weekly calendar views.',
    pageContext: overrides.pageContext ?? 'Profile & Settings (/profile)',
    createdAt: overrides.createdAt ?? '2026-11-25T12:00:00.000Z',
    emailStatus: overrides.emailStatus ?? 'pending',
    emailSentAt: overrides.emailSentAt ?? null,
    emailError: overrides.emailError ?? null,
    emailAttempts: overrides.emailAttempts ?? 0,
    emailMessageId: overrides.emailMessageId ?? null,
  };
}

test('1. Authenticated user submits feedback -> persisted, emailed to raj2010arpit@gmail.com with full metadata and Idempotency-Key', async () => {
  const store = new InMemoryFeedbackNotificationStore();
  const record = createFeedbackRecord();
  store.upsert(record);

  const sentRequests: Array<{ payload: ResendEmailRequestPayload; idempotencyKey: string }> = [];
  const sender: FeedbackEmailSender = {
    async send(payload, options) {
      sentRequests.push({ payload, idempotencyKey: options.idempotencyKey });
      return { ok: true, id: 'resend-msg-001' };
    },
  };

  const result = await processFeedbackNotification(
    {
      feedbackId: record.id,
      authenticatedUser: {
        id: 'user-alice',
        email: 'alice@university.edu',
        fullName: 'Alice Verma',
      },
      now: () => '2026-11-25T12:00:05.000Z',
    },
    store,
    sender
  );

  assert.equal(result.httpStatus, 200);
  assert.equal(result.forwarded, true);
  assert.equal(result.alreadySent, false);
  assert.equal(result.emailStatus, 'sent');
  assert.equal(result.emailSentAt, '2026-11-25T12:00:05.000Z');
  assert.equal(result.id, 'resend-msg-001');
  assert.equal(result.to, DEFAULT_FEEDBACK_RECIPIENT_EMAIL);

  assert.equal(sentRequests.length, 1);
  assert.deepEqual(sentRequests[0].payload.to, ['raj2010arpit@gmail.com']);
  assert.equal(
    sentRequests[0].payload.subject,
    '[LifeDesk Feedback] Feature Request – Calendar keyboard shortcuts'
  );
  assert.equal(sentRequests[0].payload.reply_to, 'alice@university.edu');
  assert.equal(
    sentRequests[0].idempotencyKey,
    'lifedesk-feedback-11111111-1111-4111-8111-111111111111'
  );
  assert.match(sentRequests[0].payload.html, /New Feedback Received/);
  assert.match(sentRequests[0].payload.html, /11111111-1111-4111-8111-111111111111/);
  assert.match(sentRequests[0].payload.html, /Alice Verma/);
  assert.match(sentRequests[0].payload.html, /alice@university\.edu/);
  assert.match(sentRequests[0].payload.html, /Profile &amp; Settings \(\/profile\)/);
  assert.match(sentRequests[0].payload.html, /https:\/\/awakenedarpit\.xyz/);

  const saved = store.getSnapshot(record.id);
  assert.equal(saved?.emailStatus, 'sent');
  assert.equal(saved?.emailSentAt, '2026-11-25T12:00:05.000Z');
  assert.equal(saved?.emailError, null);
  assert.equal(saved?.emailAttempts, 1);
  assert.equal(saved?.emailMessageId, 'resend-msg-001');
});

test('2. Unauthenticated caller is rejected (401) and cross-user trigger is blocked (403)', async () => {
  const store = new InMemoryFeedbackNotificationStore();
  const aliceRecord = createFeedbackRecord({
    id: '22222222-2222-4222-8222-222222222222',
    userId: 'user-alice',
    subject: 'Alice dark mode note',
  });
  store.upsert(aliceRecord);

  let sendCount = 0;
  const sender: FeedbackEmailSender = {
    async send() {
      sendCount += 1;
      return { ok: true, id: `msg-${sendCount}` };
    },
  };

  // Unauthenticated / anonymous attempt -> rejected with 401
  const anonAttempt = await processFeedbackNotification(
    {
      feedbackId: aliceRecord.id,
      authenticatedUser: { id: '' },
    },
    store,
    sender
  );
  assert.equal(anonAttempt.httpStatus, 401);
  assert.equal(anonAttempt.forwarded, false);
  assert.equal(sendCount, 0);

  // Cross-user attempt -> blocked with 403
  const crossUserAttempt = await processFeedbackNotification(
    {
      feedbackId: aliceRecord.id,
      authenticatedUser: { id: 'user-bob', email: 'bob@campus.edu', fullName: 'Bob Nair' },
    },
    store,
    sender
  );
  assert.equal(crossUserAttempt.httpStatus, 403);
  assert.equal(crossUserAttempt.forwarded, false);
  assert.equal(sendCount, 0);
});

test('3. Missing or invalid feedback fails validation without calling Resend', async () => {
  const store = new InMemoryFeedbackNotificationStore();
  const invalidRecord = createFeedbackRecord({
    id: '33333333-3333-4333-8333-333333333333',
    subject: 'Hi',
    message: 'Too short',
  });
  store.upsert(invalidRecord);

  let sendCount = 0;
  const sender: FeedbackEmailSender = {
    async send() {
      sendCount += 1;
      return { ok: true, id: 'never-sent' };
    },
  };

  const missingIdRes = await processFeedbackNotification(
    {
      feedbackId: '',
      authenticatedUser: { id: 'user-alice' },
    },
    store,
    sender
  );
  assert.equal(missingIdRes.httpStatus, 400);
  assert.equal(missingIdRes.forwarded, false);

  const invalidDataRes = await processFeedbackNotification(
    {
      feedbackId: invalidRecord.id,
      authenticatedUser: { id: 'user-alice' },
    },
    store,
    sender
  );
  assert.equal(invalidDataRes.httpStatus, 400);
  assert.equal(invalidDataRes.forwarded, false);
  assert.equal(sendCount, 0);
  assert.equal(store.getSnapshot(invalidRecord.id)?.emailStatus, 'failed');
});

test('4. Resend API failure or unconfirmed response (missing id) preserves saved feedback and redacts secrets', async () => {
  const store = new InMemoryFeedbackNotificationStore();
  const record1 = createFeedbackRecord({
    id: '44444444-4444-4444-8444-444444444444',
    subject: 'Offline sync request',
    message: 'Keep tasks editable when campus Wi-Fi drops.',
  });
  const record2 = createFeedbackRecord({
    id: '44444444-4444-4444-8444-444444444445',
    subject: 'Dark mode polish',
    message: 'Make dark card borders slightly crisper on mobile.',
  });
  store.upsert(record1);
  store.upsert(record2);

  const failingSender: FeedbackEmailSender = {
    async send() {
      return {
        ok: false,
        statusCode: 503,
        error: 'Resend API failed for key re_liveSecretKey123456',
      };
    },
  };

  const result1 = await processFeedbackNotification(
    {
      feedbackId: record1.id,
      authenticatedUser: { id: 'user-alice', email: 'alice@campus.edu', fullName: 'Alice' },
    },
    store,
    failingSender
  );

  assert.equal(result1.httpStatus, 503);
  assert.equal(result1.forwarded, false);
  assert.equal(result1.emailStatus, 'failed');
  assert.doesNotMatch(result1.emailError || '', /re_liveSecretKey123456/);

  // Feedback remains completely intact in storage
  const saved = store.getSnapshot(record1.id);
  assert.ok(saved);
  assert.equal(saved.subject, 'Offline sync request');
  assert.equal(saved.message, 'Keep tasks editable when campus Wi-Fi drops.');
  assert.equal(saved.emailStatus, 'failed');
  assert.equal(saved.emailSentAt, null);
  assert.equal(saved.emailAttempts, 1);

  // Provider returns 200 without confirmation ID -> MUST NOT report as sent
  const unconfirmedSender: FeedbackEmailSender = {
    async send() {
      return { ok: true, id: null };
    },
  };
  const result2 = await processFeedbackNotification(
    {
      feedbackId: record2.id,
      authenticatedUser: { id: 'user-alice', email: 'alice@campus.edu', fullName: 'Alice' },
    },
    store,
    unconfirmedSender
  );
  assert.equal(result2.httpStatus, 502);
  assert.equal(result2.forwarded, false);
  assert.equal(result2.emailStatus, 'failed');
});

test('5. Safe retry recovers after failure and duplicate retries/submissions never send a second email', async () => {
  const store = new InMemoryFeedbackNotificationStore();
  const record = createFeedbackRecord({
    id: '55555555-5555-4555-8555-555555555555',
  });
  store.upsert(record);

  let sendCount = 0;
  const flakySender: FeedbackEmailSender = {
    async send(_payload, options) {
      sendCount += 1;
      assert.equal(options.idempotencyKey, 'lifedesk-feedback-55555555-5555-4555-8555-555555555555');
      if (sendCount === 1) {
        throw new Error('Upstream socket timeout');
      }
      return { ok: true, id: 'resend-retry-ok' };
    },
  };

  // First attempt fails
  const first = await processFeedbackNotification(
    {
      feedbackId: record.id,
      authenticatedUser: { id: 'user-alice', email: 'alice@campus.edu', fullName: 'Alice' },
      now: () => '2026-11-25T12:00:00.000Z',
    },
    store,
    flakySender
  );
  assert.equal(first.httpStatus, 502);
  assert.equal(first.emailStatus, 'failed');

  // Second attempt (retry) succeeds
  const second = await processFeedbackNotification(
    {
      feedbackId: record.id,
      authenticatedUser: { id: 'user-alice', email: 'alice@campus.edu', fullName: 'Alice' },
      now: () => '2026-11-25T12:01:00.000Z',
    },
    store,
    flakySender
  );
  assert.equal(second.httpStatus, 200);
  assert.equal(second.forwarded, true);
  assert.equal(second.alreadySent, false);
  assert.equal(sendCount, 2);

  // Third attempt on same ID is suppressed
  const third = await processFeedbackNotification(
    {
      feedbackId: record.id,
      authenticatedUser: { id: 'user-alice', email: 'alice@campus.edu', fullName: 'Alice' },
      now: () => '2026-11-25T12:01:30.000Z',
    },
    store,
    flakySender
  );
  assert.equal(third.httpStatus, 200);
  assert.equal(third.alreadySent, true);
  assert.equal(sendCount, 2);

  // Duplicate submission with a brand-new ID but identical content within 5 minutes is suppressed
  const dupRecord = createFeedbackRecord({
    id: '55555555-5555-4555-8555-555555555556',
    createdAt: '2026-11-25T12:02:00.000Z',
  });
  store.upsert(dupRecord);

  const dupResult = await processFeedbackNotification(
    {
      feedbackId: dupRecord.id,
      authenticatedUser: { id: 'user-alice', email: 'alice@campus.edu', fullName: 'Alice' },
      now: () => '2026-11-25T12:02:05.000Z',
    },
    store,
    flakySender
  );
  assert.equal(dupResult.httpStatus, 200);
  assert.equal(dupResult.alreadySent, true);
  assert.equal(dupResult.duplicateSuppressed, true);
  assert.equal(sendCount, 2);
});

test('6. Concurrent requests for the same feedbackId send only a single email', async () => {
  const store = new InMemoryFeedbackNotificationStore();
  const record = createFeedbackRecord({
    id: '66666666-6666-4666-8666-666666666666',
  });
  store.upsert(record);

  let sendCount = 0;
  let releaseSend!: () => void;
  const gate = new Promise<void>((resolve) => {
    releaseSend = resolve;
  });

  const slowSender: FeedbackEmailSender = {
    async send() {
      sendCount += 1;
      await gate;
      return { ok: true, id: 'resend-single-send' };
    },
  };

  const firstPromise = processFeedbackNotification(
    {
      feedbackId: record.id,
      authenticatedUser: { id: 'user-alice', email: 'alice@campus.edu', fullName: 'Alice' },
    },
    store,
    slowSender
  );

  const secondPromise = processFeedbackNotification(
    {
      feedbackId: record.id,
      authenticatedUser: { id: 'user-alice', email: 'alice@campus.edu', fullName: 'Alice' },
    },
    store,
    slowSender
  );

  await new Promise((resolve) => setTimeout(resolve, 10));
  releaseSend();

  const [first, second] = await Promise.all([firstPromise, secondPromise]);

  assert.equal(sendCount, 1);
  assert.equal(first.httpStatus, 200);
  assert.equal(first.forwarded, true);
  assert.equal(second.httpStatus, 202);
  assert.equal(second.inProgress, true);
  assert.equal(second.forwarded, false);
});

test('7. Rate limiting returns 429 after max attempts in window and recovers once window expires', async () => {
  const store = new InMemoryFeedbackNotificationStore();
  let sendCount = 0;
  const sender: FeedbackEmailSender = {
    async send() {
      sendCount += 1;
      return { ok: true, id: `resend-rl-${sendCount}` };
    },
  };

  for (let i = 1; i <= 2; i++) {
    const rec = createFeedbackRecord({
      id: `77777777-7777-4777-8777-77777777770${i}`,
      subject: `Unique feedback subject ${i}`,
      message: `Unique feedback details message number ${i} for rate limit test.`,
    });
    store.upsert(rec);
    const res = await processFeedbackNotification(
      {
        feedbackId: rec.id,
        authenticatedUser: { id: 'user-alice', email: 'alice@campus.edu', fullName: 'Alice' },
        rateLimitMax: 2,
        rateLimitWindowMs: 15 * 60 * 1000,
        now: () => `2026-11-25T12:0${i}:00.000Z`,
      },
      store,
      sender
    );
    assert.equal(res.httpStatus, 200);
  }

  // Third distinct feedback within window -> rate limited (429), saved record preserved
  const rec3 = createFeedbackRecord({
    id: '77777777-7777-4777-8777-777777777703',
    subject: 'Unique feedback subject 3',
    message: 'Unique feedback details message number 3 should be rate limited.',
  });
  store.upsert(rec3);

  const limited = await processFeedbackNotification(
    {
      feedbackId: rec3.id,
      authenticatedUser: { id: 'user-alice', email: 'alice@campus.edu', fullName: 'Alice' },
      rateLimitMax: 2,
      rateLimitWindowMs: 15 * 60 * 1000,
      now: () => '2026-11-25T12:03:00.000Z',
    },
    store,
    sender
  );
  assert.equal(limited.httpStatus, 429);
  assert.equal(limited.rateLimited, true);
  assert.equal(limited.forwarded, false);
  assert.equal(sendCount, 2);

  // After 15-minute window expires, safe retry succeeds
  const recovered = await processFeedbackNotification(
    {
      feedbackId: rec3.id,
      authenticatedUser: { id: 'user-alice', email: 'alice@campus.edu', fullName: 'Alice' },
      rateLimitMax: 2,
      rateLimitWindowMs: 15 * 60 * 1000,
      now: () => '2026-11-25T12:20:00.000Z',
    },
    store,
    sender
  );
  assert.equal(recovered.httpStatus, 200);
  assert.equal(recovered.forwarded, true);
  assert.equal(sendCount, 3);
});
