import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FEEDBACK_MESSAGE_MAX,
  FEEDBACK_SUBJECT_MAX,
  validateFeedbackSubmission,
} from './feedbackValidation';

test('rejects invalid rating outside 1..5', () => {
  const result = validateFeedbackSubmission({
    category: 'Feature Request',
    rating: 0,
    subject: 'Keyboard shortcut',
    message: 'Please add a keyboard shortcut for switching dark mode.',
  });
  assert.equal(result.valid, false);
  assert.ok(result.fieldErrors.rating);
});

test('rejects too-short subject and message', () => {
  const shortSubject = validateFeedbackSubmission({
    category: 'Bug Report',
    rating: 4,
    subject: 'Hi',
    message: 'This is a long enough message for feedback.',
  });
  assert.equal(shortSubject.valid, false);
  assert.ok(shortSubject.fieldErrors.subject);

  const shortMessage = validateFeedbackSubmission({
    category: 'Bug Report',
    rating: 4,
    subject: 'Calendar bug',
    message: 'Too short',
  });
  assert.equal(shortMessage.valid, false);
  assert.ok(shortMessage.fieldErrors.message);
});

test('rejects overly long subject or message', () => {
  const result = validateFeedbackSubmission({
    category: 'UI / UX',
    rating: 5,
    subject: 'A'.repeat(FEEDBACK_SUBJECT_MAX + 5),
    message: 'B'.repeat(FEEDBACK_MESSAGE_MAX + 10),
  });
  assert.equal(result.valid, false);
  assert.ok(result.fieldErrors.subject);
  assert.ok(result.fieldErrors.message);
});

test('trims valid feedback submission cleanly', () => {
  const result = validateFeedbackSubmission({
    category: 'Feature Request',
    rating: 5,
    subject: '   Export calendar ICS   ',
    message: '   Allow exporting deadlines and events to Google Calendar.   ',
  });
  assert.equal(result.valid, true);
  assert.equal(result.error, null);
  assert.equal(result.sanitized.subject, 'Export calendar ICS');
  assert.equal(
    result.sanitized.message,
    'Allow exporting deadlines and events to Google Calendar.'
  );
});
