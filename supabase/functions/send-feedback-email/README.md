# LifeDesk `send-feedback-email` Edge Function

Automatically forwards every authenticated student feedback submission saved in `public.feedback` to `raj2010arpit@gmail.com` via Resend.

## Security & Reliability Guarantees

- **Fixed Recipient:** Always sends to `raj2010arpit@gmail.com` (client-supplied recipients are ignored).
- **Verified Identity & Ownership:** Verifies the caller's Supabase JWT via `auth.getUser(token)`, confirms `public.feedback.user_id === auth.uid()`, and reads the user's name and email from Supabase Auth / `public.profiles` rather than trusting client payload fields.
- **Duplicate Prevention:** Atomically claims `email_status` (`pending`/`failed` → `sending` → `sent`), suppresses identical duplicate submissions within 5 minutes, and sends `Idempotency-Key: lifedesk-feedback-<feedbackId>` to Resend.
- **Rate Limiting:** Limits email notification triggers to 5 attempts per user per 15 minutes (`HTTP 429` with `Retry-After`) backed by `public.feedback`.
- **Verified Delivery Reporting:** Only marks `email_status = 'sent'` when Resend returns `2xx` with a valid message confirmation `id`.
- **Failure Safety:** If Resend fails or secrets are missing, the feedback row stays intact and a redacted error is stored in `email_error` for safe retries.

## 1. Apply the Non-Destructive Database Migrations

Run both additive migrations in **Supabase Dashboard → SQL Editor** (or via `supabase db push`):

1. `supabase/migrations/20261125_feedback_email_notifications.sql`
2. `supabase/migrations/20261126_feedback_page_context_and_ratelimit.sql`

Both migrations preserve all existing rows in `public.feedback` and maintain strict Row-Level Security (RLS).

## 2. Configure Edge Function Secrets

```bash
supabase secrets set RESEND_API_KEY=re_your_api_key_here
supabase secrets set FEEDBACK_FROM_EMAIL="LifeDesk Feedback <feedback@awakenedarpit.xyz>"
# Optional overrides:
supabase secrets set LIFEDESK_APP_URL="https://awakenedarpit.xyz"
supabase secrets set ALLOWED_ORIGINS="https://awakenedarpit.xyz,https://www.awakenedarpit.xyz"
```

*(Note: `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically by Supabase Edge Functions. Use a verified domain sender in `FEEDBACK_FROM_EMAIL` from your Resend dashboard.)*

## 3. Deploy the Edge Function

```bash
supabase functions deploy send-feedback-email
```

## 4. Verify Delivery in Resend

1. Sign in to LifeDesk and submit feedback from **Profile & Settings → Share Feedback**.
2. Confirm the new row in `public.feedback` has `email_status = 'sent'`, `email_sent_at`, and `email_message_id` populated.
3. Open **Resend Dashboard → Emails** (or query `GET https://api.resend.com/emails/<email_message_id>`) to verify the message status (`delivered`) to `raj2010arpit@gmail.com`.
