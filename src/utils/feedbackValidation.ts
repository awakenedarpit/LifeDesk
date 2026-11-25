import type { FeedbackCategory } from '../types/index.ts';

export const FEEDBACK_CATEGORIES: FeedbackCategory[] = [
  'Feature Request',
  'Bug Report',
  'UI / UX',
  'General',
];

export const FEEDBACK_SUBJECT_MIN = 3;
export const FEEDBACK_SUBJECT_MAX = 120;
export const FEEDBACK_MESSAGE_MIN = 10;
export const FEEDBACK_MESSAGE_MAX = 1500;

export interface FeedbackDraft {
  category: FeedbackCategory;
  rating: number;
  subject: string;
  message: string;
}

export interface FeedbackValidationResult {
  valid: boolean;
  error: string | null;
  fieldErrors: Partial<Record<'category' | 'rating' | 'subject' | 'message', string>>;
  sanitized: FeedbackDraft;
}

export function validateFeedbackSubmission(draft: FeedbackDraft): FeedbackValidationResult {
  const category: FeedbackCategory = FEEDBACK_CATEGORIES.includes(draft.category)
    ? draft.category
    : 'General';
  const rating = Number.isFinite(draft.rating) ? Math.round(draft.rating) : 0;
  const subject = (draft.subject || '').trim();
  const message = (draft.message || '').trim();

  const fieldErrors: Partial<Record<'category' | 'rating' | 'subject' | 'message', string>> = {};

  if (rating < 1 || rating > 5) {
    fieldErrors.rating = 'Please select an experience rating from 1 to 5 stars.';
  }

  if (subject.length < FEEDBACK_SUBJECT_MIN) {
    fieldErrors.subject = `Subject must be at least ${FEEDBACK_SUBJECT_MIN} characters.`;
  } else if (subject.length > FEEDBACK_SUBJECT_MAX) {
    fieldErrors.subject = `Subject cannot exceed ${FEEDBACK_SUBJECT_MAX} characters.`;
  }

  if (message.length < FEEDBACK_MESSAGE_MIN) {
    fieldErrors.message = `Feedback details must be at least ${FEEDBACK_MESSAGE_MIN} characters.`;
  } else if (message.length > FEEDBACK_MESSAGE_MAX) {
    fieldErrors.message = `Feedback details cannot exceed ${FEEDBACK_MESSAGE_MAX} characters.`;
  }

  const firstError =
    fieldErrors.rating ||
    fieldErrors.subject ||
    fieldErrors.message ||
    fieldErrors.category ||
    null;

  return {
    valid: firstError === null,
    error: firstError,
    fieldErrors,
    sanitized: {
      category,
      rating,
      subject,
      message,
    },
  };
}
