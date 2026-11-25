import type { FeedbackCategory, FeedbackEmailStatus } from '../types/index.ts';
import {
  buildFeedbackEmailPayload,
  buildResendIdempotencyKey,
  DEFAULT_FEEDBACK_RECIPIENT_EMAIL,
  type ResendEmailRequestPayload,
  truncateErrorMessage,
} from './feedbackEmail.ts';

export interface StoredFeedbackRecord {
  id: string;
  userId: string;
  category: FeedbackCategory;
  rating: number;
  subject: string;
  message: string;
  createdAt: string;
  emailStatus: FeedbackEmailStatus;
  emailSentAt: string | null;
  emailError: string | null;
  emailAttempts: number;
  emailMessageId: string | null;
}

export interface FeedbackNotificationStore {
  getById(feedbackId: string): Promise<StoredFeedbackRecord | null>;
  claimForSending(
    feedbackId: string,
    userId: string
  ): Promise<{ claimed: true; record: StoredFeedbackRecord } | { claimed: false; current: StoredFeedbackRecord | null }>;
  markSent(
    feedbackId: string,
    info: { sentAt: string; messageId: string | null }
  ): Promise<void>;
  markFailed(feedbackId: string, errorMessage: string): Promise<void>;
}

export interface FeedbackEmailSender {
  send(
    payload: ResendEmailRequestPayload,
    options: { idempotencyKey: string }
  ): Promise<{ ok: true; id: string | null } | { ok: false; statusCode: number; error: string }>;
}

export interface ProcessFeedbackNotificationInput {
  feedbackId: string;
  authenticatedUser: {
    id: string;
    email?: string;
    fullName?: string;
  };
  fromEmail?: string;
  now?: () => string;
}

export interface ProcessFeedbackNotificationResult {
  httpStatus: number;
  forwarded: boolean;
  alreadySent?: boolean;
  inProgress?: boolean;
  feedbackId: string;
  emailStatus: FeedbackEmailStatus;
  emailSentAt?: string | null;
  emailError?: string | null;
  id?: string | null;
  to: string;
  error?: string;
}

/**
 * Coordinates ownership verification, atomic duplicate-send protection, email rendering,
 * delivery status persistence, and safe retry semantics for a saved feedback record.
 * Never deletes or mutates user feedback content when email delivery fails.
 */
export async function processFeedbackNotification(
  input: ProcessFeedbackNotificationInput,
  store: FeedbackNotificationStore,
  sender: FeedbackEmailSender
): Promise<ProcessFeedbackNotificationResult> {
  const feedbackId = String(input.feedbackId || '').trim();
  const recipient = DEFAULT_FEEDBACK_RECIPIENT_EMAIL;
  const nowIso = input.now || (() => new Date().toISOString());

  if (!feedbackId) {
    return {
      httpStatus: 400,
      forwarded: false,
      feedbackId: '',
      emailStatus: 'failed',
      to: recipient,
      error: 'A valid feedbackId is required.',
    };
  }

  const existing = await store.getById(feedbackId);
  if (!existing) {
    return {
      httpStatus: 404,
      forwarded: false,
      feedbackId,
      emailStatus: 'failed',
      to: recipient,
      error: 'Feedback record not found.',
    };
  }

  if (existing.userId !== input.authenticatedUser.id) {
    return {
      httpStatus: 403,
      forwarded: false,
      feedbackId,
      emailStatus: existing.emailStatus,
      to: recipient,
      error: 'You do not have permission to trigger notifications for this feedback.',
    };
  }

  if (existing.emailStatus === 'sent') {
    return {
      httpStatus: 200,
      forwarded: true,
      alreadySent: true,
      feedbackId,
      emailStatus: 'sent',
      emailSentAt: existing.emailSentAt,
      emailError: null,
      id: existing.emailMessageId,
      to: recipient,
    };
  }

  const claim = await store.claimForSending(feedbackId, input.authenticatedUser.id);
  if (claim.claimed === false) {
    const current = claim.current;
    if (current?.emailStatus === 'sent') {
      return {
        httpStatus: 200,
        forwarded: true,
        alreadySent: true,
        feedbackId,
        emailStatus: 'sent',
        emailSentAt: current.emailSentAt,
        emailError: null,
        id: current.emailMessageId,
        to: recipient,
      };
    }

    return {
      httpStatus: 202,
      forwarded: false,
      inProgress: true,
      feedbackId,
      emailStatus: current?.emailStatus || 'sending',
      to: recipient,
      error: 'Feedback email delivery is already in progress.',
    };
  }

  const record = claim.record;
  const built = buildFeedbackEmailPayload({
    feedbackId: record.id,
    category: record.category,
    rating: record.rating,
    subject: record.subject,
    message: record.message,
    senderName: input.authenticatedUser.fullName,
    senderEmail: input.authenticatedUser.email,
    senderId: input.authenticatedUser.id,
    fromEmail: input.fromEmail,
    submittedAt: record.createdAt,
  });

  if (built.valid === false) {
    const safeErr = truncateErrorMessage(built.error);
    await store.markFailed(feedbackId, safeErr);
    return {
      httpStatus: 400,
      forwarded: false,
      feedbackId,
      emailStatus: 'failed',
      emailError: safeErr,
      to: recipient,
      error: safeErr,
    };
  }

  try {
    const delivery = await sender.send(built.payload, {
      idempotencyKey: buildResendIdempotencyKey(record.id),
    });

    if (delivery.ok === false) {
      const safeErr = truncateErrorMessage(delivery.error);
      await store.markFailed(feedbackId, safeErr);
      return {
        httpStatus: delivery.statusCode >= 400 ? delivery.statusCode : 502,
        forwarded: false,
        feedbackId,
        emailStatus: 'failed',
        emailError: safeErr,
        to: recipient,
        error: safeErr,
      };
    }

    const sentAt = nowIso();
    await store.markSent(feedbackId, { sentAt, messageId: delivery.id });
    return {
      httpStatus: 200,
      forwarded: true,
      alreadySent: false,
      feedbackId,
      emailStatus: 'sent',
      emailSentAt: sentAt,
      emailError: null,
      id: delivery.id,
      to: recipient,
    };
  } catch (err) {
    const safeErr = truncateErrorMessage(err);
    await store.markFailed(feedbackId, safeErr);
    return {
      httpStatus: 502,
      forwarded: false,
      feedbackId,
      emailStatus: 'failed',
      emailError: safeErr,
      to: recipient,
      error: safeErr,
    };
  }
}

/**
 * In-memory store implementing atomic claim + idempotency for local Express fallback and unit tests.
 */
export class InMemoryFeedbackNotificationStore implements FeedbackNotificationStore {
  private readonly records = new Map<string, StoredFeedbackRecord>();

  upsert(record: StoredFeedbackRecord): void {
    this.records.set(record.id, { ...record });
  }

  getSnapshot(feedbackId: string): StoredFeedbackRecord | undefined {
    const rec = this.records.get(feedbackId);
    return rec ? { ...rec } : undefined;
  }

  async getById(feedbackId: string): Promise<StoredFeedbackRecord | null> {
    const rec = this.records.get(feedbackId);
    return rec ? { ...rec } : null;
  }

  async claimForSending(
    feedbackId: string,
    userId: string
  ): Promise<
    { claimed: true; record: StoredFeedbackRecord } | { claimed: false; current: StoredFeedbackRecord | null }
  > {
    const existing = this.records.get(feedbackId);
    if (!existing || existing.userId !== userId) {
      return { claimed: false, current: existing ? { ...existing } : null };
    }
    if (existing.emailStatus !== 'pending' && existing.emailStatus !== 'failed') {
      return { claimed: false, current: { ...existing } };
    }

    const next: StoredFeedbackRecord = {
      ...existing,
      emailStatus: 'sending',
      emailAttempts: existing.emailAttempts + 1,
      emailError: null,
    };
    this.records.set(feedbackId, next);
    return { claimed: true, record: { ...next } };
  }

  async markSent(
    feedbackId: string,
    info: { sentAt: string; messageId: string | null }
  ): Promise<void> {
    const existing = this.records.get(feedbackId);
    if (!existing) return;
    this.records.set(feedbackId, {
      ...existing,
      emailStatus: 'sent',
      emailSentAt: info.sentAt,
      emailError: null,
      emailMessageId: info.messageId,
    });
  }

  async markFailed(feedbackId: string, errorMessage: string): Promise<void> {
    const existing = this.records.get(feedbackId);
    if (!existing) return;
    this.records.set(feedbackId, {
      ...existing,
      emailStatus: 'failed',
      emailError: errorMessage,
    });
  }
}
