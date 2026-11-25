# LifeDesk `send-feedback-email` Edge Function

Automatically forwards every authenticated student feedback submission saved in `public.feedback` to the fixed destination `raj2010arpit@gmail.com` via Resend.

## Security & Reliability Guarantees

- **Fixed Destination:** Always sends to `raj2010arpit@gmail.com` (never accepts recipient addresses from the client).
- **Ownership Enforcement:** Verifies the caller's Supabase JWT and confirms `public.feedback.user_id === auth.uid()` before sending.
- **Duplicate Prevention:** Atomically claims `email_status` (`pending`/`failed` → `sending` → `sent`) and passes `Idempotency-Key: lifedesk-feedback-<feedbackId>` to Resend so retries or double-clicks never produce duplicate emails.
- **Failure Safety:** If Resend fails or secrets are missing, the feedback row remains intact and `email_status = 'failed'` + `email_error` are recorded so it can be retried safely.

## 1. Apply the Non-Destructive Database Migration

Run `supabase/migrations/20261125_feedback_email_notifications.sql` in **Supabase Dashboard → SQL Editor** (or via `supabase db push`). It adds `email_status`, `email_sent_at`, `email_error`, `email_attempts`, `email_message_id`, and `updated_at` to `public.feedback` without deleting existing rows.

## 2. Configure Edge Function Secrets

```bash
supabase secrets set RESEND_API_KEY=re_your_api_key_here
# Optional (recommended once your sending domain is verified in Resend):
supabase secrets set FEEDBACK_FROM_EMAIL="LifeDesk Feedback <noreply@yourdomain.com>"
```

*(Note: `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically by Supabase Edge Functions.)*

## 3. Deploy the Edge Function

```bash
supabase functions deploy send-feedback-email
```

## 4. Verify End-to-End

1. Sign in to LifeDesk as a registered user and submit feedback from **Profile & Settings → Share Feedback**.
2. Confirm the new row exists in `public.feedback` with `email_status = 'sent'` and `email_sent_at` populated.
3. Confirm the email arrived at `raj2010arpit@gmail.com` containing the Feedback ID, category, subject, message, submitter details, and timestamp.
