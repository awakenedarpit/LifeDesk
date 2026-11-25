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
    createdAt: overrides.createdAt ?? '2026-11-25T12:00:00.000Z',
    emailStatus: overrides.emailStatus ?? 'pending',
    emailSentAt: overrides.emailSentAt ?? null,
    emailError: overrides.emailError ?? null,
    emailAttempts: overrides.emailAttempts ?? 0,
    emailMessageId: overrides.emailMessageId ?? null,
  };
}

test('1. Registered user submits feedback -> persisted, emailed to raj2010arpit@gmail.com with full metadata and Idempotency-Key', async () => {
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
  assert.equal(sentRequests[0].payload.reply_to, 'alice@university.edu');
  assert.equal(
    sentRequests[0].idempotencyKey,
    'lifedesk-feedback-11111111-1111-4111-8111-111111111111'
  );
  assert.match(sentRequests[0].payload.html, /11111111-1111-4111-8111-111111111111/);
  assert.match(sentRequests[0].payload.html, /Alice Verma/);
  assert.match(sentRequests[0].payload.html, /alice@university\.edu/);
  assert.match(sentRequests[0].payload.html, /2026-11-25T12:00:00\.000Z/);
  assert.match(sentRequests[0].payload.html, /Calendar keyboard shortcuts/);
  assert.match(sentRequests[0].payload.html, /Feature Request/);

  const saved = store.getSnapshot(record.id);
  assert.equal(saved?.emailStatus, 'sent');
  assert.equal(saved?.emailSentAt, '2026-11-25T12:00:05.000Z');
  assert.equal(saved?.emailError, null);
  assert.equal(saved?.emailAttempts, 1);
  assert.equal(saved?.emailMessageId, 'resend-msg-001');
});

test('2. Multiple users submit feedback independently and ownership is strictly enforced (403 cross-user)', async () => {
  const store = new InMemoryFeedbackNotificationStore();
  const aliceRecord = createFeedbackRecord({
    id: '22222222-2222-4222-8222-222222222222',
    userId: 'user-alice',
    subject: 'Alice dark mode note',
  });
  const bobRecord = createFeedbackRecord({
    id: '33333333-3333-4333-8333-333333333333',
    userId: 'user-bob',
    category: 'Bug Report',
    subject: 'Bob hackathon countdown bug',
  });
  store.upsert(aliceRecord);
  store.upsert(bobRecord);

  const sentIds: string[] = [];
  const sender: FeedbackEmailSender = {
    async send(payload, options) {
      assert.deepEqual(payload.to, ['raj2010arpit@gmail.com']);
      sentIds.push(options.idempotencyKey);
      return { ok: true, id: `msg-${sentIds.length}` };
    },
  };

  // Bob attempts to trigger notification for Alice's feedback -> blocked with 403
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
  assert.equal(sentIds.length, 0);

  // Alice and Bob each trigger their own feedback independently
  const aliceResult = await processFeedbackNotification(
    {
      feedbackId: aliceRecord.id,
      authenticatedUser: { id: 'user-alice', email: 'alice@campus.edu', fullName: 'Alice' },
    },
    store,
    sender
  );
  const bobResult = await processFeedbackNotification(
    {
      feedbackId: bobRecord.id,
      authenticatedUser: { id: 'user-bob', email: 'bob@campus.edu', fullName: 'Bob' },
    },
    store,
    sender
  );

  assert.equal(aliceResult.httpStatus, 200);
  assert.equal(bobResult.httpStatus, 200);
  assert.deepEqual(sentIds, [
    'lifedesk-feedback-22222222-2222-4222-8222-222222222222',
    'lifedesk-feedback-33333333-3333-4333-8333-333333333333',
  ]);
});

test('3. Email delivery failure preserves saved feedback and records email_error securely', async () => {
  const store = new InMemoryFeedbackNotificationStore();
  const record = createFeedbackRecord({
    id: '44444444-4444-4444-8444-444444444444',
    subject: 'Offline sync request',
    message: 'Keep tasks editable when campus Wi-Fi drops.',
  });
  store.upsert(record);

  const failingSender: FeedbackEmailSender = {
    async send() {
      return { ok: false, statusCode: 503, error: 'Resend API temporarily unavailable' };
    },
  };

  const result = await processFeedbackNotification(
    {
      feedbackId: record.id,
      authenticatedUser: { id: 'user-alice', email: 'alice@campus.edu', fullName: 'Alice' },
    },
    store,
    failingSender
  );

  assert.equal(result.httpStatus, 503);
  assert.equal(result.forwarded, false);
  assert.equal(result.emailStatus, 'failed');
  assert.match(result.emailError || '', /Resend API temporarily unavailable/);

  // Feedback remains completely intact in storage
  const saved = store.getSnapshot(record.id);
  assert.ok(saved);
  assert.equal(saved.subject, 'Offline sync request');
  assert.equal(saved.message, 'Keep tasks editable when campus Wi-Fi drops.');
  assert.equal(saved.emailStatus, 'failed');
  assert.equal(saved.emailSentAt, null);
  assert.equal(saved.emailAttempts, 1);
  assert.match(saved.emailError || '', /Resend API temporarily unavailable/);
});

test('4. Safe retry recovers after failure and subsequent retries never send duplicate emails', async () => {
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

  // First attempt fails (thrown network error)
  const first = await processFeedbackNotification(
    {
      feedbackId: record.id,
      authenticatedUser: { id: 'user-alice', email: 'alice@campus.edu', fullName: 'Alice' },
    },
    store,
    flakySender
  );
  assert.equal(first.httpStatus, 502);
  assert.equal(first.emailStatus, 'failed');
  assert.equal(store.getSnapshot(record.id)?.emailAttempts, 1);

  // Second attempt (retry) succeeds
  const second = await processFeedbackNotification(
    {
      feedbackId: record.id,
      authenticatedUser: { id: 'user-alice', email: 'alice@campus.edu', fullName: 'Alice' },
      now: () => '2026-11-25T12:05:00.000Z',
    },
    store,
    flakySender
  );
  assert.equal(second.httpStatus, 200);
  assert.equal(second.forwarded, true);
  assert.equal(second.alreadySent, false);
  assert.equal(second.emailStatus, 'sent');
  assert.equal(sendCount, 2);

  // Third attempt (duplicate retry) is suppressed without calling Resend again
  const third = await processFeedbackNotification(
    {
      feedbackId: record.id,
      authenticatedUser: { id: 'user-alice', email: 'alice@campus.edu', fullName: 'Alice' },
    },
    store,
    flakySender
  );
  assert.equal(third.httpStatus, 200);
  assert.equal(third.forwarded, true);
  assert.equal(third.alreadySent, true);
  assert.equal(third.emailStatus, 'sent');
  assert.equal(third.id, 'resend-retry-ok');
  assert.equal(sendCount, 2);
});

test('5. Concurrent requests for the same feedbackId send only a single email', async () => {
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

  // Let both requests hit claim step before resolving Resend call
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
