import type { FeedbackCategory, FeedbackEmailStatus } from '../types/index.ts';
import {
  buildFeedbackEmailPayload,
  buildResendIdempotencyKey,
  DEFAULT_FEEDBACK_RECIPIENT_EMAIL,
  type ResendEmailRequestPayload,
  sanitizeStoredError,
} from './feedbackEmail.ts';

export const DEFAULT_FEEDBACK_RATE_LIMIT_MAX = 5;
export const DEFAULT_FEEDBACK_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
export const DEFAULT_DUPLICATE_WINDOW_MS = 5 * 60 * 1000;

export interface StoredFeedbackRecord {
  id: string;
  userId: string;
  category: FeedbackCategory;
  rating: number;
  subject: string;
  message: string;
  pageContext?: string;
  createdAt: string;
  updatedAt?: string;
  emailStatus: FeedbackEmailStatus;
  emailSentAt: string | null;
  emailError: string | null;
  emailAttempts: number;
  emailMessageId: string | null;
}

export interface FeedbackNotificationStore {
  getById(feedbackId: string): Promise<StoredFeedbackRecord | null>;
  countRecentAttempts?(userId: string, sinceIso: string): Promise<number>;
  findRecentSentDuplicate?(
    record: Pick<StoredFeedbackRecord, 'id' | 'userId' | 'category' | 'subject' | 'message'>,
    sinceIso: string
  ): Promise<StoredFeedbackRecord | null>;
  claimForSending(
    feedbackId: string,
    userId: string,
    attemptedAtIso?: string
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
  siteUrl?: string;
  rateLimitMax?: number;
  rateLimitWindowMs?: number;
  duplicateWindowMs?: number;
  now?: () => string;
}

export interface ProcessFeedbackNotificationResult {
  httpStatus: number;
  forwarded: boolean;
  alreadySent?: boolean;
  inProgress?: boolean;
  rateLimited?: boolean;
  duplicateSuppressed?: boolean;
  feedbackId: string;
  emailStatus: FeedbackEmailStatus;
  emailSentAt?: string | null;
  emailError?: string | null;
  id?: string | null;
  to: string;
  error?: string;
}

/**
 * Coordinates ownership verification, rate limiting, duplicate-send suppression,
 * atomic claim, Resend acceptance verification, delivery status persistence,
 * and safe retry semantics for a saved feedback record.
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
  const currentIso = nowIso();
  const currentMs = Date.parse(currentIso) || Date.now();
  const rateLimitMax = input.rateLimitMax ?? DEFAULT_FEEDBACK_RATE_LIMIT_MAX;
  const rateLimitWindowMs = input.rateLimitWindowMs ?? DEFAULT_FEEDBACK_RATE_LIMIT_WINDOW_MS;
  const duplicateWindowMs = input.duplicateWindowMs ?? DEFAULT_DUPLICATE_WINDOW_MS;

  if (!input.authenticatedUser?.id) {
    return {
      httpStatus: 401,
      forwarded: false,
      feedbackId,
      emailStatus: 'failed',
      to: recipient,
      error: 'Authentication is required to send feedback notifications.',
    };
  }

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

  // Suppress duplicate emails if an identical feedback submission was already sent recently
  if (store.findRecentSentDuplicate && duplicateWindowMs > 0) {
    const dupSinceIso = new Date(currentMs - duplicateWindowMs).toISOString();
    const recentDup = await store.findRecentSentDuplicate(
      {
        id: existing.id,
        userId: existing.userId,
        category: existing.category,
        subject: existing.subject,
        message: existing.message,
      },
      dupSinceIso
    );
    if (recentDup) {
      return {
        httpStatus: 200,
        forwarded: true,
        alreadySent: true,
        duplicateSuppressed: true,
        feedbackId,
        emailStatus: 'sent',
        emailSentAt: recentDup.emailSentAt,
        emailError: null,
        id: recentDup.emailMessageId,
        to: recipient,
      };
    }
  }

  // Enforce per-user rate limit before claiming and calling Resend
  if (store.countRecentAttempts && rateLimitMax > 0 && rateLimitWindowMs > 0) {
    const rateSinceIso = new Date(currentMs - rateLimitWindowMs).toISOString();
    const recentCount = await store.countRecentAttempts(input.authenticatedUser.id, rateSinceIso);
    if (recentCount >= rateLimitMax) {
      const rateMsg = 'Too many feedback email requests. Your feedback is saved; please try again in a few minutes.';
      return {
        httpStatus: 429,
        forwarded: false,
        rateLimited: true,
        feedbackId,
        emailStatus: existing.emailStatus,
        emailError: rateMsg,
        to: recipient,
        error: rateMsg,
      };
    }
  }

  const claim = await store.claimForSending(feedbackId, input.authenticatedUser.id, currentIso);
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
    pageContext: record.pageContext,
    senderName: input.authenticatedUser.fullName,
    senderEmail: input.authenticatedUser.email,
    senderId: input.authenticatedUser.id,
    fromEmail: input.fromEmail,
    siteUrl: input.siteUrl,
    submittedAt: record.createdAt,
  });

  if (built.valid === false) {
    const safeErr = sanitizeStoredError(built.error);
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
      const safeErr = sanitizeStoredError(delivery.error);
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

    // Never report email as sent unless Resend returned a confirmed message acceptance ID.
    const confirmedId = typeof delivery.id === 'string' ? delivery.id.trim() : '';
    if (!confirmedId) {
      const safeErr = 'Email provider did not return a delivery confirmation ID.';
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

    const sentAt = nowIso();
    await store.markSent(feedbackId, { sentAt, messageId: confirmedId });
    return {
      httpStatus: 200,
      forwarded: true,
      alreadySent: false,
      feedbackId,
      emailStatus: 'sent',
      emailSentAt: sentAt,
      emailError: null,
      id: confirmedId,
      to: recipient,
    };
  } catch (err) {
    const safeErr = sanitizeStoredError(err);
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
 * In-memory store implementing atomic claim, idempotency, rate-limiting,
 * and duplicate-content detection for local Express fallback and unit tests.
 */
export class InMemoryFeedbackNotificationStore implements FeedbackNotificationStore {
  private readonly records = new Map<string, StoredFeedbackRecord>();
  private readonly attemptTimestamps = new Map<string, number[]>();

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

  async countRecentAttempts(userId: string, sinceIso: string): Promise<number> {
    const sinceMs = Date.parse(sinceIso) || 0;
    const timestamps = this.attemptTimestamps.get(userId) || [];
    const recent = timestamps.filter((ts) => ts >= sinceMs);
    this.attemptTimestamps.set(userId, recent);
    return recent.length;
  }

  async findRecentSentDuplicate(
    record: Pick<StoredFeedbackRecord, 'id' | 'userId' | 'category' | 'subject' | 'message'>,
    sinceIso: string
  ): Promise<StoredFeedbackRecord | null> {
    const sinceMs = Date.parse(sinceIso) || 0;
    const normSubject = record.subject.trim().toLowerCase();
    const normMessage = record.message.trim().toLowerCase();

    for (const candidate of this.records.values()) {
      if (candidate.id === record.id) continue;
      if (candidate.userId !== record.userId) continue;
      if (candidate.emailStatus !== 'sent') continue;
      const sentMs = Date.parse(candidate.emailSentAt || candidate.createdAt) || 0;
      if (sentMs < sinceMs) continue;
      if (
        candidate.category === record.category &&
        candidate.subject.trim().toLowerCase() === normSubject &&
        candidate.message.trim().toLowerCase() === normMessage
      ) {
        return { ...candidate };
      }
    }
    return null;
  }

  async claimForSending(
    feedbackId: string,
    userId: string,
    attemptedAtIso?: string
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

    const nowMs = (attemptedAtIso && Date.parse(attemptedAtIso)) || Date.now();
    const prev = this.attemptTimestamps.get(userId) || [];
    prev.push(nowMs);
    this.attemptTimestamps.set(userId, prev);

    const next: StoredFeedbackRecord = {
      ...existing,
      emailStatus: 'sending',
      emailAttempts: existing.emailAttempts + 1,
      emailError: null,
      updatedAt: new Date(nowMs).toISOString(),
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
      updatedAt: info.sentAt,
    });
  }

  async markFailed(feedbackId: string, errorMessage: string): Promise<void> {
    const existing = this.records.get(feedbackId);
    if (!existing) return;
    this.records.set(feedbackId, {
      ...existing,
      emailStatus: 'failed',
      emailError: errorMessage,
      updatedAt: new Date().toISOString(),
    });
  }
}
