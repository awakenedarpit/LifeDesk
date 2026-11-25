# LifeDesk send-feedback-email Edge Function

Forwards all authenticated student feedback submissions directly to `raj2010arpit@gmail.com` using Resend.

## Required & Optional Secrets

Set these secrets in your Supabase project (`Edge Functions -> Secrets`) or server `.env`:

- `RESEND_API_KEY`: Your server-side Resend API key (never expose in `VITE_*` variables).
- `FEEDBACK_FROM_EMAIL` *(optional)*: Verified Resend sender identity (for example `LifeDesk Feedback <noreply@mail.awakenedarpit.xyz>`, defaulting to `LifeDesk Feedback <onboarding@resend.dev>`).

## Deploy

```bash
supabase functions deploy send-feedback-email
```
