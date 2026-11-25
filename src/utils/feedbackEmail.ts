import type { FeedbackCategory } from '../types/index.ts';
import { validateFeedbackSubmission } from './feedbackValidation.ts';

export const DEFAULT_FEEDBACK_RECIPIENT_EMAIL = 'raj2010arpit@gmail.com';
export const DEFAULT_FEEDBACK_FROM_EMAIL = 'LifeDesk Feedback <onboarding@resend.dev>';

export function escapeHtml(raw: string): string {
  return String(raw)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function sanitizeHeaderText(raw: string): string {
  return String(raw).replace(/[\r\n]+/g, ' ').trim();
}

export function isValidEmailAddress(raw?: string | null): boolean {
  if (!raw) return false;
  const trimmed = String(raw).trim();
  if (!trimmed || trimmed.length > 254 || /[\s\r\n\0<>]/.test(trimmed)) {
    return false;
  }

  const atIndex = trimmed.indexOf('@');
  if (atIndex <= 0 || atIndex !== trimmed.lastIndexOf('@')) {
    return false;
  }

  const local = trimmed.slice(0, atIndex);
  const domain = trimmed.slice(atIndex + 1);

  if (
    local.length > 64 ||
    local.startsWith('.') ||
    local.endsWith('.') ||
    local.includes('..') ||
    !/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+$/.test(local)
  ) {
    return false;
  }

  if (
    domain.length < 3 ||
    domain.length > 253 ||
    domain.startsWith('.') ||
    domain.endsWith('.') ||
    domain.includes('..')
  ) {
    return false;
  }

  const labels = domain.split('.');
  if (labels.length < 2) {
    return false;
  }

  const tld = labels[labels.length - 1];
  if (!/^[a-zA-Z]{2,63}$/.test(tld)) {
    return false;
  }

  return labels.every(
    (label) =>
      label.length >= 1 &&
      label.length <= 63 &&
      /^[a-zA-Z0-9-]+$/.test(label) &&
      !label.startsWith('-') &&
      !label.endsWith('-')
  );
}

export interface FeedbackEmailContext {
  category: FeedbackCategory;
  rating: number;
  subject: string;
  message: string;
  senderName?: string;
  senderEmail?: string;
  senderId?: string;
  fromEmail?: string;
  submittedAt?: string;
}

export interface ResendEmailRequestPayload {
  from: string;
  to: string[];
  reply_to?: string;
  subject: string;
  html: string;
  text: string;
}

export function buildFeedbackEmailPayload(
  input: FeedbackEmailContext
): { valid: true; payload: ResendEmailRequestPayload } | { valid: false; error: string } {
  const validation = validateFeedbackSubmission({
    category: input.category,
    rating: input.rating,
    subject: input.subject,
    message: input.message,
  });

  if (!validation.valid || validation.error) {
    return { valid: false, error: validation.error || 'Invalid feedback payload.' };
  }

  const { category, rating, subject, message } = validation.sanitized;
  const from = sanitizeHeaderText(input.fromEmail || '') || DEFAULT_FEEDBACK_FROM_EMAIL;
  const safeSenderName = sanitizeHeaderText(input.senderName || '') || 'LifeDesk Student';
  const candidateSenderEmail = sanitizeHeaderText(input.senderEmail || '');
  const validReplyTo = isValidEmailAddress(candidateSenderEmail) ? candidateSenderEmail : undefined;
  const timestamp = input.submittedAt || new Date().toISOString();
  const starsText = `${'★'.repeat(rating)}${'☆'.repeat(5 - rating)} (${rating}/5)`;

  const emailSubject = sanitizeHeaderText(
    `[LifeDesk Feedback • ${category}] ${subject}`
  );

  const textLines = [
    'New LifeDesk Student Feedback',
    '=============================',
    `Category: ${category}`,
    `Rating: ${rating}/5`,
    `Subject: ${subject}`,
    `From: ${safeSenderName}${validReplyTo ? ` <${validReplyTo}>` : ''}`,
    input.senderId ? `User ID: ${sanitizeHeaderText(input.senderId)}` : null,
    `Submitted At: ${timestamp}`,
    '',
    'Message:',
    message,
  ]
    .filter((line): line is string => line !== null)
    .join('\n');

  const htmlMessage = escapeHtml(message).replace(/\n/g, '<br />');

  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#F4FAF6;font-family:Inter,Arial,sans-serif;color:#173C30;">
    <div style="max-width:600px;margin:0 auto;background:#FFFFFF;border:1px solid #D0E6DA;border-radius:16px;padding:24px;">
      <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #D0E6DA;padding-bottom:14px;margin-bottom:18px;">
        <span style="font-size:18px;font-weight:700;color:#173C30;">LifeDesk Feedback</span>
        <span style="display:inline-block;padding:4px 10px;border-radius:8px;background:#DDF5E9;color:#239B70;font-size:12px;font-weight:700;">${escapeHtml(category)}</span>
      </div>
      <p style="margin:0 0 8px;font-size:13px;color:#46695D;"><strong>Rating:</strong> <span style="color:#239B70;">${escapeHtml(starsText)}</span></p>
      <p style="margin:0 0 8px;font-size:13px;color:#46695D;"><strong>From:</strong> ${escapeHtml(safeSenderName)}${validReplyTo ? ` (&lt;${escapeHtml(validReplyTo)}&gt;)` : ''}</p>
      <p style="margin:0 0 16px;font-size:13px;color:#46695D;"><strong>Submitted:</strong> ${escapeHtml(timestamp)}</p>
      <h2 style="margin:0 0 10px;font-size:16px;color:#173C30;">${escapeHtml(subject)}</h2>
      <div style="padding:14px 16px;background:#F4FAF6;border:1px solid #D0E6DA;border-radius:12px;font-size:14px;line-height:1.55;color:#173C30;">
        ${htmlMessage}
      </div>
    </div>
  </body>
</html>`;

  const payload: ResendEmailRequestPayload = {
    from,
    to: [DEFAULT_FEEDBACK_RECIPIENT_EMAIL],
    subject: emailSubject,
    html,
    text: textLines,
  };

  if (validReplyTo) {
    payload.reply_to = validReplyTo;
  }

  return { valid: true, payload };
}
