import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { supabaseService } from '../services/supabaseService';
import { FeedbackCategory, FeedbackEntry } from '../types';
import {
  FEEDBACK_CATEGORIES,
  FEEDBACK_MESSAGE_MAX,
  FEEDBACK_SUBJECT_MAX,
  validateFeedbackSubmission,
} from '../utils/feedbackValidation';

const RATING_LABELS: Record<number, string> = {
  1: 'Needs work',
  2: 'Fair',
  3: 'Good',
  4: 'Very good',
  5: 'Love it',
};

const getLocalFeedbackKey = (userId: string) => `lifedesk_feedback_${userId || 'anon'}`;

export const FeedbackSection: React.FC = () => {
  const { user, showToast, isSupabaseConnected } = useApp();

  const [category, setCategory] = useState<FeedbackCategory>('Feature Request');
  const [rating, setRating] = useState<number>(5);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submittedConfirmation, setSubmittedConfirmation] = useState<{
    text: string;
    forwarded: boolean;
  } | null>(null);
  const [history, setHistory] = useState<FeedbackEntry[]>([]);

  useEffect(() => {
    if (!user.id) return;

    let cancelled = false;
    const localKey = getLocalFeedbackKey(user.id);

    try {
      const cached = localStorage.getItem(localKey);
      if (cached) {
        const parsed = JSON.parse(cached) as FeedbackEntry[];
        if (Array.isArray(parsed)) {
          setHistory(parsed.slice(0, 5));
        }
      }
    } catch {
      // Ignore malformed local feedback cache
    }

    if (isSupabaseConnected) {
      supabaseService
        .getFeedbackHistory(user.id)
        .then((remoteItems) => {
          if (cancelled || remoteItems.length === 0) return;
          setHistory(remoteItems.slice(0, 5));
          try {
            localStorage.setItem(localKey, JSON.stringify(remoteItems.slice(0, 5)));
          } catch {
            // Ignore storage quota errors
          }
        })
        .catch(() => {
          // Graceful fallback to local history
        });
    }

    return () => {
      cancelled = true;
    };
  }, [user.id, isSupabaseConnected]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSubmittedConfirmation(null);

    const validation = validateFeedbackSubmission({
      category,
      rating,
      subject,
      message,
    });

    if (!validation.valid || validation.error) {
      setFormError(validation.error);
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await supabaseService.submitFeedback(user.id, {
        ...validation.sanitized,
        senderName: user.fullName,
        senderEmail: user.email,
      });

      setHistory((prev) => {
        const updated = [
          result.entry,
          ...prev.filter((item) => item.id !== result.entry.id),
        ].slice(0, 5);
        try {
          localStorage.setItem(getLocalFeedbackKey(user.id), JSON.stringify(updated));
        } catch {
          // Ignore storage quota errors
        }
        return updated;
      });

      setSubject('');
      setMessage('');
      setCategory('Feature Request');
      setRating(5);

      if (result.emailForwarded) {
        setSubmittedConfirmation({
          forwarded: true,
          text: `Thank you! Your feedback has been saved and forwarded to ${result.recipientEmail}.`,
        });
        showToast(`Feedback sent to ${result.recipientEmail}.`, 'success');
      } else {
        setSubmittedConfirmation({
          forwarded: false,
          text: `Thank you! Your feedback has been saved. ${
            result.emailNote ||
            `Email forwarding to ${result.recipientEmail} requires RESEND_API_KEY in server or Edge Function secrets.`
          }`,
        });
        showToast('Feedback saved. Configure RESEND_API_KEY to forward emails.', 'info');
      }
    } catch (err: unknown) {
      const errMsg =
        err instanceof Error && err.message
          ? err.message
          : 'Could not submit feedback right now. Please try again.';
      setFormError(errMsg);
      showToast(errMsg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section
      aria-labelledby="feedback-section-heading"
      className="bg-surface-container-lowest rounded-2xl p-5 border border-outline-variant shadow-sm flex flex-col gap-4"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <span className="w-9 h-9 rounded-xl bg-primary-fixed text-primary-ink flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-[20px]">rate_review</span>
          </span>
          <div className="min-w-0">
            <h3
              id="feedback-section-heading"
              className="font-title-sm text-title-sm text-on-surface font-bold"
            >
              Share Feedback
            </h3>
            <p className="text-xs text-on-surface-variant">
              Report an issue, suggest a workflow improvement, or rate your LifeDesk experience.
            </p>
          </div>
        </div>
        {user.email && (
          <span className="font-label-xs text-[11px] px-2.5 py-1 rounded-lg bg-surface-container-low border border-outline-variant text-on-surface-variant truncate max-w-full">
            Sending as {user.email}
          </span>
        )}
      </div>

      {/* Confirmation or Error Banner */}
      {submittedConfirmation && (
        <div
          role="status"
          className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
            submittedConfirmation.forwarded
              ? 'bg-surface-container border-primary/40 text-on-surface'
              : 'bg-surface-container-low border-outline-variant text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-primary-ink text-[18px] flex-shrink-0">
            {submittedConfirmation.forwarded ? 'check_circle' : 'info'}
          </span>
          <span className="font-medium">{submittedConfirmation.text}</span>
        </div>
      )}

      {formError && (
        <div
          role="alert"
          className="p-3 rounded-xl bg-error-container border border-error/30 text-on-error-container text-xs flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-[18px] flex-shrink-0">error</span>
          <span className="font-medium">{formError}</span>
        </div>
      )}

      {/* Feedback Form */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Category Selection */}
          <div>
            <span className="font-label-xs text-label-xs text-on-surface-variant uppercase block mb-1.5">
              Feedback Type
            </span>
            <div
              role="radiogroup"
              aria-label="Feedback category"
              className="grid grid-cols-2 gap-1.5"
            >
              {FEEDBACK_CATEGORIES.map((item) => {
                const selected = category === item;
                return (
                  <button
                    key={item}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setCategory(item)}
                    className={`h-9 px-3 rounded-xl text-xs font-semibold border transition-colors text-left truncate ${
                      selected
                        ? 'bg-surface-container border-primary-deep text-primary-ink'
                        : 'bg-surface-container-low border-outline-variant text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    {item}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Star Rating */}
          <div>
            <span className="font-label-xs text-label-xs text-on-surface-variant uppercase block mb-1.5">
              Experience Rating
            </span>
            <div className="flex items-center justify-between gap-2 h-[78px] px-3.5 rounded-xl bg-surface-container-low border border-outline-variant">
              <div
                role="radiogroup"
                aria-label="Experience rating"
                className="flex items-center gap-1"
              >
                {[1, 2, 3, 4, 5].map((star) => {
                  const active = star <= rating;
                  return (
                    <button
                      key={star}
                      type="button"
                      role="radio"
                      aria-checked={rating === star}
                      aria-label={`${star} ${star === 1 ? 'Star' : 'Stars'}`}
                      onClick={() => setRating(star)}
                      className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
                        active
                          ? 'text-primary-deep dark:text-primary bg-surface-container'
                          : 'text-on-surface-variant/50 hover:text-on-surface-variant'
                      }`}
                    >
                      <span
                        className="material-symbols-outlined text-[22px]"
                        style={active ? { fontVariationSettings: "'FILL' 1" } : undefined}
                      >
                        star
                      </span>
                    </button>
                  );
                })}
              </div>
              <span className="text-xs font-bold text-primary-ink whitespace-nowrap">
                {RATING_LABELS[rating]}
              </span>
            </div>
          </div>
        </div>

        {/* Subject */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label
              htmlFor="feedback-subject"
              className="font-label-xs text-label-xs text-on-surface-variant uppercase"
            >
              Subject *
            </label>
            <span className="font-label-xs text-[11px] text-on-surface-variant tabular-nums">
              {subject.length}/{FEEDBACK_SUBJECT_MAX}
            </span>
          </div>
          <input
            id="feedback-subject"
            type="text"
            maxLength={FEEDBACK_SUBJECT_MAX}
            value={subject}
            onChange={(e) => {
              setSubject(e.target.value);
              if (formError) setFormError(null);
            }}
            placeholder="Short summary (e.g. Export academic calendar to ICS)"
            className="w-full h-10 px-3.5 bg-surface-container-low border border-outline-variant focus:border-primary-deep focus:bg-surface-container-lowest rounded-xl text-on-surface text-sm outline-none transition-colors"
            required
          />
        </div>

        {/* Details */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label
              htmlFor="feedback-message"
              className="font-label-xs text-label-xs text-on-surface-variant uppercase"
            >
              Details *
            </label>
            <span className="font-label-xs text-[11px] text-on-surface-variant tabular-nums">
              {message.length}/{FEEDBACK_MESSAGE_MAX}
            </span>
          </div>
          <textarea
            id="feedback-message"
            rows={4}
            maxLength={FEEDBACK_MESSAGE_MAX}
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              if (formError) setFormError(null);
            }}
            placeholder="Share what worked well, steps to reproduce a bug, or ideas you would love to see in LifeDesk..."
            className="w-full p-3.5 bg-surface-container-low border border-outline-variant focus:border-primary-deep focus:bg-surface-container-lowest rounded-xl text-on-surface text-sm outline-none resize-y transition-colors"
            required
          />
        </div>

        <div className="flex items-center justify-between gap-3 flex-wrap pt-1">
          <span className="text-[11px] text-on-surface-variant">
            Stored privately with your account via Supabase Row-Level Security.
          </span>
          <button
            type="submit"
            disabled={isSubmitting}
            className="h-10 px-5 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-primary-container hover:text-on-primary-container shadow-xs transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {isSubmitting ? (
              <span className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
            ) : (
              <span className="material-symbols-outlined text-[16px]">send</span>
            )}
            <span>{isSubmitting ? 'Submitting...' : 'Submit Feedback'}</span>
          </button>
        </div>
      </form>

      {/* Recent Submissions */}
      {history.length > 0 && (
        <div className="pt-3 border-t border-outline-variant flex flex-col gap-2">
          <span className="font-label-xs text-[11px] uppercase tracking-wider text-on-surface-variant font-bold">
            Recent Feedback Sent
          </span>
          <div className="flex flex-col gap-2">
            {history.map((entry) => (
              <div
                key={entry.id}
                className="p-3 rounded-xl bg-surface-container-low border border-outline-variant flex items-start justify-between gap-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-label-xs text-[10px] px-2 py-0.5 rounded-md bg-surface-container text-primary-ink border border-outline-variant font-bold">
                      {entry.category}
                    </span>
                    <span className="text-xs font-semibold text-on-surface truncate">
                      {entry.subject}
                    </span>
                  </div>
                  <p className="text-xs text-on-surface-variant mt-1 line-clamp-2">
                    {entry.message}
                  </p>
                </div>
                <div className="flex flex-col items-end flex-shrink-0 gap-0.5">
                  <span className="text-xs font-bold text-primary-ink tabular-nums">
                    {entry.rating}/5 ★
                  </span>
                  <span className="text-[10px] text-on-surface-variant tabular-nums">
                    {new Date(entry.createdAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};
