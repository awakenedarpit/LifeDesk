import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildFeedbackEmailPayload,
  buildFeedbackMailtoHref,
  DEFAULT_FEEDBACK_RECIPIENT_EMAIL,
  escapeHtml,
  extractErrorMessage,
  isMissingFeedbackTableError,
  isValidEmailAddress,
  sanitizeHeaderText,
} from './feedbackEmail.ts';

test('DEFAULT_FEEDBACK_RECIPIENT_EMAIL is fixed to raj2010arpit@gmail.com', () => {
  assert.equal(DEFAULT_FEEDBACK_RECIPIENT_EMAIL, 'raj2010arpit@gmail.com');
});

test('escapeHtml escapes angle brackets, quotes, and ampersands', () => {
  const escaped = escapeHtml('<script>alert("xss" & \'test\')</script>');
  assert.equal(
    escaped,
    '&lt;script&gt;alert(&quot;xss&quot; &amp; &#39;test&#39;)&lt;/script&gt;'
  );
});

test('sanitizeHeaderText strips CR/LF breaks and trims', () => {
  assert.equal(sanitizeHeaderText("Hello\r\nBcc: evil@test.com"), 'Hello Bcc: evil@test.com');
  assert.equal(isValidEmailAddress('raj2010arpit@gmail.com'), true);
  assert.equal(isValidEmailAddress('bad\r\n@gmail.com'), false);
});

test('buildFeedbackEmailPayload formats safe Resend payload to raj2010arpit@gmail.com and escapes HTML', () => {
  const result = buildFeedbackEmailPayload({
    category: 'Bug Report',
    rating: 4,
    subject: 'Sync issue on <b>Calendar</b>',
    message: 'Line 1\n<img src=x onerror=alert(1)>',
    senderName: 'Aarav',
    senderEmail: 'aarav@campus.edu',
    submittedAt: '2026-11-25T10:00:00.000Z',
  });

  assert.equal(result.valid, true);
  if (result.valid) {
    assert.deepEqual(result.payload.to, ['raj2010arpit@gmail.com']);
    assert.equal(result.payload.reply_to, 'aarav@campus.edu');
    assert.match(result.payload.html, /&lt;img src=x onerror=alert\(1\)&gt;/);
    assert.doesNotMatch(result.payload.html, /<img/);
  }
});

test('buildFeedbackEmailPayload drops invalid reply_to addresses', () => {
  const result = buildFeedbackEmailPayload({
    category: 'General',
    rating: 5,
    subject: 'Great mint theme',
    message: 'Really enjoying the clean dark mode contrast.',
    senderEmail: 'invalid\r\n@email',
  });

  assert.equal(result.valid, true);
  if (result.valid) {
    assert.deepEqual(result.payload.to, ['raj2010arpit@gmail.com']);
    assert.equal(result.payload.reply_to, undefined);
  }
});

test('extractErrorMessage reads plain PostgREST error objects and Error instances', () => {
  assert.equal(
    extractErrorMessage({
      code: 'PGRST205',
      message: "Could not find the table 'public.feedback' in the schema cache",
    }),
    "Could not find the table 'public.feedback' in the schema cache"
  );
  assert.equal(extractErrorMessage(new Error('Network down')), 'Network down');
  assert.equal(extractErrorMessage(null, 'Fallback msg'), 'Fallback msg');
});

test('isMissingFeedbackTableError detects PostgREST schema cache and Postgres 42P01 codes', () => {
  assert.equal(
    isMissingFeedbackTableError({
      code: 'PGRST205',
      message: "Could not find the table 'public.feedback' in the schema cache",
    }),
    true
  );
  assert.equal(isMissingFeedbackTableError({ code: '42P01', message: 'relation does not exist' }), true);
  assert.equal(isMissingFeedbackTableError({ code: '23505', message: 'duplicate key' }), false);
});

test('buildFeedbackMailtoHref encodes subject and body with safe recipient', () => {
  const href = buildFeedbackMailtoHref({
    category: 'Feature Request',
    rating: 5,
    subject: 'Add Google Sign-Up',
    message: 'Would love one-click Google onboarding.',
    recipientEmail: 'invalid\r\n@bad',
  });
  assert.equal(href.startsWith('mailto:raj2010arpit@gmail.com?subject='), true);
  assert.match(href, /Add%20Google%20Sign-Up/);
});
