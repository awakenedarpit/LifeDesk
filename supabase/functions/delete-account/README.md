# LifeDesk delete-account Edge Function

Securely deletes the currently authenticated user's Supabase Auth account.

## Deploy

Deploy this function to the LifeDesk Supabase project with JWT verification enabled.

The function uses the server-side `SUPABASE_SERVICE_ROLE_KEY`. Never expose that key in the frontend, GitHub Pages, or Vite environment variables.

The function validates the caller's access token and then calls `auth.admin.deleteUser`. LifeDesk tables reference `auth.users` with `ON DELETE CASCADE`, so the user's profile and related application records are removed with the account.
