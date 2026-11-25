import 'dotenv/config';
import express, { type Request, type Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import {
  DEFAULT_FEEDBACK_RECIPIENT_EMAIL,
  type ResendEmailRequestPayload,
} from './src/utils/feedbackEmail.ts';
import {
  type FeedbackEmailSender,
  InMemoryFeedbackNotificationStore,
  processFeedbackNotification,
} from './src/utils/feedbackNotification.ts';
import type { FeedbackCategory } from './src/types/index.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isPlaceholderSupabaseConfig = (url: string, key: string): boolean =>
  !url ||
  !key ||
  !url.startsWith('http') ||
  url.includes('your-project-ref') ||
  url.includes('your-project.supabase.co') ||
  key.includes('your-anon-key-here');

function isAllowedSameOrigin(req: Request): boolean {
  const origin = req.headers.origin;
  const rawForwardedHost = req.headers['x-forwarded-host'];
  const forwardedHost = Array.isArray(rawForwardedHost)
    ? rawForwardedHost[0]
    : rawForwardedHost?.split(',')[0]?.trim();
  const host = forwardedHost || req.headers.host;
  if (origin && host) {
    try {
      return new URL(origin).host === host;
    } catch {
      return false;
    }
  }
  return true;
}

async function verifySupabaseBearerToken(
  token: string
): Promise<{ id: string; email?: string; fullName?: string } | null> {
  const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
  const supabaseAnonKey = (
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    ''
  ).trim();

  if (isPlaceholderSupabaseConfig(supabaseUrl, supabaseAnonKey)) {
    if (process.env.NODE_ENV === 'production') {
      return null;
    }
    // Allow same-origin authenticated preview requests when local dev env lacks Supabase project keys,
    // while still requiring a non-empty Bearer token from the logged-in client session.
    return token.length >= 16 ? { id: 'session-user' } : null;
  }

  try {
    const response = await fetch(`${supabaseUrl.replace(/\/$/, '')}/auth/v1/user`, {
      method: 'GET',
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${token}`,
      },
    });
    if (!response.ok) return null;
    const user = (await response.json()) as {
      id?: string;
      email?: string;
      user_metadata?: { full_name?: string; name?: string };
    };
    if (!user?.id) return null;
    return {
      id: user.id,
      email: user.email,
      fullName: user.user_metadata?.full_name || user.user_metadata?.name,
    };
  } catch {
    return null;
  }
}

const serverFeedbackStore = new InMemoryFeedbackNotificationStore();

const createResendSender = (resendApiKey: string): FeedbackEmailSender => ({
  async send(payload: ResendEmailRequestPayload, options: { idempotencyKey: string }) {
    if (!resendApiKey) {
      return {
        ok: false,
        statusCode: 503,
        error: `Email forwarding to ${DEFAULT_FEEDBACK_RECIPIENT_EMAIL} is not configured yet (set RESEND_API_KEY in server secrets).`,
      };
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    };
    if (options.idempotencyKey) {
      headers['Idempotency-Key'] = options.idempotencyKey;
    }

    try {
      const resendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (!resendRes.ok) {
        const detail = await resendRes.text();
        console.error('Resend feedback forwarding error:', resendRes.status, detail);
        return {
          ok: false,
          statusCode: 502,
          error: `Email delivery service rejected the request (${resendRes.status}).`,
        };
      }

      const data = (await resendRes.json()) as { id?: string };
      return { ok: true, id: data.id || null };
    } catch {
      return {
        ok: false,
        statusCode: 502,
        error: 'Unable to reach Resend email service.',
      };
    }
  },
});

const OAUTH_CALLBACK_HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>LifeDesk Sign In</title>
    <style>
      body {
        margin: 0;
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #F4FAF6;
        color: #173C30;
        font-family: system-ui, -apple-system, sans-serif;
        padding: 24px;
        text-align: center;
      }
      .card {
        background: #FFFFFF;
        border: 1px solid #D0E6DA;
        border-radius: 16px;
        padding: 24px 28px;
        max-width: 360px;
      }
      p { margin: 8px 0 0; font-size: 14px; color: #46695D; }
    </style>
  </head>
  <body>
    <div class="card">
      <strong>Completing Google sign-in…</strong>
      <p>This window will close automatically.</p>
    </div>
    <script>
      (function () {
        var searchParams = new URLSearchParams(window.location.search || '');
        var hashRaw = (window.location.hash || '').replace(/^#/, '');
        var hashParams = new URLSearchParams(hashRaw);

        var payload = {
          type: 'LIFEDESK_OAUTH_CALLBACK',
          code: searchParams.get('code') || '',
          accessToken: hashParams.get('access_token') || '',
          refreshToken: hashParams.get('refresh_token') || '',
          error: searchParams.get('error') || hashParams.get('error') || '',
          errorDescription:
            searchParams.get('error_description') ||
            hashParams.get('error_description') ||
            ''
        };

        if (window.opener && !window.opener.closed) {
          try {
            window.opener.postMessage(payload, window.location.origin);
          } catch (e) {
            window.opener.postMessage(payload, '*');
          }
          window.close();
          return;
        }

        window.location.replace('/' + (window.location.search || '') + (window.location.hash || ''));
      })();
    </script>
  </body>
</html>`;

async function startServer() {
  const app = express();
  const port = Number(process.env.PORT || 3000);
  const isProd = process.env.NODE_ENV === 'production';

  app.set('trust proxy', 1);
  app.use(express.json({ limit: '64kb' }));

  app.get(['/auth/callback', '/auth/callback/'], (_req: Request, res: Response) => {
    res.status(200).type('html').send(OAUTH_CALLBACK_HTML);
  });

  app.post('/api/feedback-email', async (req: Request, res: Response) => {
    if (!isAllowedSameOrigin(req)) {
      res.status(403).json({ error: 'Cross-origin request rejected.' });
      return;
    }

    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (!token) {
      res.status(401).json({ error: 'Authentication required to submit feedback.' });
      return;
    }

    const verifiedUser = await verifySupabaseBearerToken(token);
    if (!verifiedUser) {
      res.status(401).json({ error: 'Invalid or expired authentication session.' });
      return;
    }

    const body = (req.body || {}) as Record<string, unknown>;
    const feedbackId =
      typeof body.feedbackId === 'string' && body.feedbackId.trim()
        ? body.feedbackId.trim()
        : `fb-${Date.now()}`;

    // Register record once per feedbackId so retries cannot overwrite ownership or bypass dedup.
    const existing = await serverFeedbackStore.getById(feedbackId);
    if (!existing) {
      serverFeedbackStore.upsert({
        id: feedbackId,
        userId: verifiedUser.id,
        category: String(body.category || 'General') as FeedbackCategory,
        rating: Number(body.rating),
        subject: String(body.subject || ''),
        message: String(body.message || ''),
        createdAt:
          typeof body.createdAt === 'string' && body.createdAt.trim()
            ? body.createdAt.trim()
            : new Date().toISOString(),
        emailStatus: 'pending',
        emailSentAt: null,
        emailError: null,
        emailAttempts: 0,
        emailMessageId: null,
      });
    }

    const resendApiKey = (process.env.RESEND_API_KEY || '').trim();
    const result = await processFeedbackNotification(
      {
        feedbackId,
        authenticatedUser: {
          id: verifiedUser.id,
          fullName:
            verifiedUser.fullName ||
            (typeof body.senderName === 'string' ? body.senderName : undefined),
          email:
            verifiedUser.email ||
            (typeof body.senderEmail === 'string' ? body.senderEmail : undefined),
        },
        fromEmail: process.env.FEEDBACK_FROM_EMAIL,
      },
      serverFeedbackStore,
      createResendSender(resendApiKey)
    );

    res.status(result.httpStatus).json({
      forwarded: result.forwarded,
      alreadySent: Boolean(result.alreadySent),
      inProgress: Boolean(result.inProgress),
      configured: Boolean(resendApiKey),
      feedbackId: result.feedbackId,
      emailStatus: result.emailStatus,
      emailSentAt: result.emailSentAt || null,
      emailError: result.emailError || null,
      to: DEFAULT_FEEDBACK_RECIPIENT_EMAIL,
      id: result.id || null,
      ...(result.error ? { error: result.error } : {}),
    });
  });

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`LifeDesk server listening on http://0.0.0.0:${port}`);
  });
}

startServer();
