import type { FeedbackCategory } from '../types/index.ts';
import { validateFeedbackSubmission } from './feedbackValidation.ts';

export const DEFAULT_FEEDBACK_RECIPIENT_EMAIL = 'raj2010arpit@gmail.com';
export const DEFAULT_FEEDBACK_FROM_EMAIL = 'LifeDesk Feedback <onboarding@resend.dev>';
export const DEFAULT_LIFEDESK_SITE_URL = 'https://awakenedarpit.xyz';

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

export function resolveSafeSiteUrl(raw?: string | null): string {
  const candidate = String(raw || '').trim();
  if (!candidate) return DEFAULT_LIFEDESK_SITE_URL;
  try {
    const parsed = new URL(candidate);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return parsed.origin;
    }
  } catch {
    // Fall back to default site URL
  }
  return DEFAULT_LIFEDESK_SITE_URL;
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
  feedbackId?: string;
  category: FeedbackCategory;
  rating: number;
  subject: string;
  message: string;
  pageContext?: string;
  senderName?: string;
  senderEmail?: string;
  senderId?: string;
  fromEmail?: string;
  siteUrl?: string;
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

export function buildResendIdempotencyKey(feedbackId: string): string {
  const cleaned = String(feedbackId || '')
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .slice(0, 128);
  return cleaned ? `lifedesk-feedback-${cleaned}` : '';
}

/**
 * Redacts potential API keys, bearer tokens, and JWTs before storing delivery errors.
 */
export function sanitizeStoredError(raw: unknown, maxLen = 400): string {
  const msg = extractErrorMessage(raw, 'Email delivery failed.')
    .replace(/re_[a-zA-Z0-9_-]{8,}/g, '[redacted-key]')
    .replace(/Bearer\s+[a-zA-Z0-9._~+/-]+=*/gi, 'Bearer [redacted]')
    .replace(/eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/g, '[redacted-token]')
    .trim();
  return msg.length > maxLen ? `${msg.slice(0, maxLen - 3)}...` : msg;
}

export function truncateErrorMessage(raw: unknown, maxLen = 400): string {
  return sanitizeStoredError(raw, maxLen);
}

export function formatFeedbackSubject(category: FeedbackCategory, shortDescription: string): string {
  const cleanCategory = sanitizeHeaderText(category) || 'General';
  const cleanDesc = sanitizeHeaderText(shortDescription);
  const clippedDesc = cleanDesc.length > 80 ? `${cleanDesc.slice(0, 77)}...` : cleanDesc;
  return `[LifeDesk Feedback] ${cleanCategory} – ${clippedDesc}`;
}

export function formatSubmissionTimestamp(isoString: string): string {
  const parsed = new Date(isoString);
  if (Number.isNaN(parsed.getTime())) {
    return sanitizeHeaderText(isoString) || new Date().toISOString();
  }
  const formatted = parsed.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: 'UTC',
  });
  return `${formatted} UTC (${parsed.toISOString()})`;
}

export function extractErrorMessage(
  err: unknown,
  fallback = 'Could not submit feedback right now. Please try again.'
): string {
  if (typeof err === 'string' && err.trim()) {
    return err.trim();
  }
  if (err instanceof Error && err.message.trim()) {
    return err.message.trim();
  }
  if (typeof err === 'object' && err !== null) {
    const record = err as Record<string, unknown>;
    const candidate =
      (typeof record.message === 'string' && record.message.trim()) ||
      (typeof record.error_description === 'string' && record.error_description.trim()) ||
      (typeof record.error === 'string' && record.error.trim()) ||
      (typeof record.details === 'string' && record.details.trim()) ||
      '';
    if (candidate) {
      return candidate;
    }
  }
  return fallback;
}

export function isMissingFeedbackTableError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const record = err as Record<string, unknown>;
  const code = typeof record.code === 'string' ? record.code.toUpperCase() : '';
  const message = extractErrorMessage(err, '').toLowerCase();

  return (
    code === '42P01' ||
    code === 'PGRST205' ||
    code === 'PGRST204' ||
    message.includes('does not exist') ||
    message.includes('schema cache') ||
    message.includes('could not find the table') ||
    message.includes('relation "public.feedback"')
  );
}

export function isMissingFeedbackColumnError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const record = err as Record<string, unknown>;
  const code = typeof record.code === 'string' ? record.code.toUpperCase() : '';
  const message = extractErrorMessage(err, '').toLowerCase();

  return (
    code === '42703' ||
    code === 'PGRST204' ||
    (message.includes('column') && message.includes('does not exist')) ||
    message.includes('could not find the')
  );
}

export function buildFeedbackMailtoHref(input: {
  feedbackId?: string;
  category: FeedbackCategory;
  rating: number;
  subject: string;
  message: string;
  pageContext?: string;
}): string {
  const safeSubject = formatFeedbackSubject(input.category, input.subject);
  const body = [
    input.feedbackId ? `Feedback ID: ${sanitizeHeaderText(input.feedbackId)}` : null,
    `Category: ${input.category}`,
    `Rating: ${input.rating}/5`,
    input.pageContext ? `Page / Feature: ${sanitizeHeaderText(input.pageContext)}` : null,
    '',
    input.message,
  ]
    .filter((line): line is string => line !== null)
    .join('\n');

  return `mailto:${DEFAULT_FEEDBACK_RECIPIENT_EMAIL}?subject=${encodeURIComponent(safeSubject)}&body=${encodeURIComponent(body)}`;
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
  const siteUrl = resolveSafeSiteUrl(input.siteUrl);
  const logoUrl = `${siteUrl}/assets/lifedesk-logo.png`;
  const safeFeedbackId = sanitizeHeaderText(input.feedbackId || '') || 'unassigned';
  const safeSenderName = sanitizeHeaderText(input.senderName || '') || 'LifeDesk User';
  const candidateSenderEmail = sanitizeHeaderText(input.senderEmail || '');
  const validReplyTo = isValidEmailAddress(candidateSenderEmail) ? candidateSenderEmail : undefined;
  const safePageContext =
    sanitizeHeaderText(input.pageContext || '').slice(0, 160) || 'Profile & Settings (/profile)';
  const rawTimestamp = input.submittedAt || new Date().toISOString();
  const formattedTimestamp = formatSubmissionTimestamp(rawTimestamp);
  const starsText = `${'★'.repeat(rating)}${'☆'.repeat(5 - rating)} (${rating}/5)`;

  const emailSubject = formatFeedbackSubject(category, subject);

  const textLines = [
    'LifeDesk — New Feedback Received',
    '================================',
    `Feedback ID: ${safeFeedbackId}`,
    `Category: ${category}`,
    `Rating: ${rating}/5`,
    `Relevant Page / Feature: ${safePageContext}`,
    `User Name: ${safeSenderName}`,
    `User Email: ${validReplyTo || 'Not provided'}`,
    input.senderId ? `User ID: ${sanitizeHeaderText(input.senderId)}` : null,
    `Submitted At: ${formattedTimestamp}`,
    `Subject: ${subject}`,
    '',
    'Feedback Message:',
    message,
    '',
    `Open LifeDesk: ${siteUrl}`,
  ]
    .filter((line): line is string => line !== null)
    .join('\n');

  const htmlMessage = escapeHtml(message).replace(/\r\n|\r|\n/g, '<br />');

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(emailSubject)}</title>
  </head>
  <body style="margin:0;padding:0;background-color:#F4FAF6;font-family:'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#173C30;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#F4FAF6;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;background-color:#FFFFFF;border:1px solid #D0E6DA;border-radius:16px;overflow:hidden;">
            <tr>
              <td style="background-color:#173C30;padding:20px 24px;">
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                  <tr>
                    <td style="vertical-align:middle;">
                      <img src="${escapeHtml(logoUrl)}" alt="LifeDesk" height="28" style="display:block;height:28px;width:auto;border:0;outline:none;background:#FFFFFF;padding:4px 8px;border-radius:8px;" />
                    </td>
                    <td align="right" style="vertical-align:middle;">
                      <span style="display:inline-block;padding:5px 12px;border-radius:8px;background-color:#DDF5E9;color:#187A56;font-size:12px;font-weight:700;letter-spacing:0.01em;">
                        ${escapeHtml(category)}
                      </span>
                    </td>
                  </tr>
                </table>
                <h1 style="margin:16px 0 4px;font-size:20px;line-height:1.3;font-weight:700;color:#FFFFFF;">
                  New Feedback Received
                </h1>
                <p style="margin:0;font-size:13px;line-height:1.5;color:#B9E8D3;">
                  Submitted via LifeDesk Student Command Center
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:24px;">
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;background-color:#F4FAF6;border:1px solid #D0E6DA;border-radius:12px;margin-bottom:20px;">
                  <tr>
                    <td style="padding:10px 14px;width:155px;font-size:12px;font-weight:700;color:#46695D;border-bottom:1px solid #E3F2EA;">Feedback ID</td>
                    <td style="padding:10px 14px;font-family:'JetBrains Mono',ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;color:#173C30;border-bottom:1px solid #E3F2EA;word-break:break-all;">${escapeHtml(safeFeedbackId)}</td>
                  </tr>
                  <tr>
                    <td style="padding:10px 14px;font-size:12px;font-weight:700;color:#46695D;border-bottom:1px solid #E3F2EA;">Category</td>
                    <td style="padding:10px 14px;font-size:13px;font-weight:600;color:#173C30;border-bottom:1px solid #E3F2EA;">${escapeHtml(category)}</td>
                  </tr>
                  <tr>
                    <td style="padding:10px 14px;font-size:12px;font-weight:700;color:#46695D;border-bottom:1px solid #E3F2EA;">Rating</td>
                    <td style="padding:10px 14px;font-size:13px;font-weight:700;color:#187A56;border-bottom:1px solid #E3F2EA;">${escapeHtml(starsText)}</td>
                  </tr>
                  <tr>
                    <td style="padding:10px 14px;font-size:12px;font-weight:700;color:#46695D;border-bottom:1px solid #E3F2EA;">User Name</td>
                    <td style="padding:10px 14px;font-size:13px;color:#173C30;border-bottom:1px solid #E3F2EA;">${escapeHtml(safeSenderName)}</td>
                  </tr>
                  <tr>
                    <td style="padding:10px 14px;font-size:12px;font-weight:700;color:#46695D;border-bottom:1px solid #E3F2EA;">User Email</td>
                    <td style="padding:10px 14px;font-size:13px;color:#173C30;border-bottom:1px solid #E3F2EA;word-break:break-word;">${validReplyTo ? escapeHtml(validReplyTo) : 'Not provided'}</td>
                  </tr>
                  <tr>
                    <td style="padding:10px 14px;font-size:12px;font-weight:700;color:#46695D;border-bottom:1px solid #E3F2EA;">Page / Feature</td>
                    <td style="padding:10px 14px;font-size:13px;color:#173C30;border-bottom:1px solid #E3F2EA;word-break:break-word;">${escapeHtml(safePageContext)}</td>
                  </tr>
                  <tr>
                    <td style="padding:10px 14px;font-size:12px;font-weight:700;color:#46695D;">Submitted At</td>
                    <td style="padding:10px 14px;font-size:13px;color:#173C30;">${escapeHtml(formattedTimestamp)}</td>
                  </tr>
                </table>

                <p style="margin:0 0 6px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#46695D;">
                  Summary
                </p>
                <h2 style="margin:0 0 14px;font-size:16px;line-height:1.4;font-weight:700;color:#173C30;word-break:break-word;">
                  ${escapeHtml(subject)}
                </h2>

                <p style="margin:0 0 8px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#46695D;">
                  Complete Message
                </p>
                <div style="padding:16px;background-color:#F4FAF6;border:1px solid #D0E6DA;border-left:4px solid #187A56;border-radius:10px;font-size:14px;line-height:1.65;color:#173C30;word-break:break-word;">
                  ${htmlMessage}
                </div>

                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-top:22px;">
                  <tr>
                    <td>
                      <a href="${escapeHtml(siteUrl)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:10px 18px;background-color:#187A56;color:#FFFFFF;text-decoration:none;font-size:13px;font-weight:700;border-radius:10px;">
                        Open LifeDesk
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 24px;background-color:#F4FAF6;border-top:1px solid #E3F2EA;font-size:11px;line-height:1.5;color:#46695D;">
                Automated notification from <a href="${escapeHtml(siteUrl)}" style="color:#187A56;font-weight:600;text-decoration:none;">LifeDesk</a>. Reply directly to this email to respond to the student when an email address is available.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  // Destination is always fixed to raj2010arpit@gmail.com; never allow arbitrary recipients.
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
