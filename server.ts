import 'dotenv/config';
import express, { type Request, type Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import {
  buildFeedbackEmailPayload,
  DEFAULT_FEEDBACK_RECIPIENT_EMAIL,
} from './src/utils/feedbackEmail.ts';
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
  const host = (req.headers['x-forwarded-host'] as string | undefined) || req.headers.host;
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
      user_metadata?: { full_name?: string };
    };
    if (!user?.id) return null;
    return {
      id: user.id,
      email: user.email,
      fullName: user.user_metadata?.full_name,
    };
  } catch {
    return null;
  }
}

async function startServer() {
  const app = express();
  const port = Number(process.env.PORT || 3000);
  const isProd = process.env.NODE_ENV === 'production';

  app.set('trust proxy', 1);
  app.use(express.json({ limit: '64kb' }));

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

    const recipientEmail = DEFAULT_FEEDBACK_RECIPIENT_EMAIL;
    const resendApiKey = (process.env.RESEND_API_KEY || '').trim();
    if (!resendApiKey) {
      res.status(503).json({
        forwarded: false,
        to: recipientEmail,
        error: 'RESEND_API_KEY is not configured on the server.',
      });
      return;
    }

    const body = (req.body || {}) as Record<string, unknown>;
    const built = buildFeedbackEmailPayload({
      category: String(body.category || 'General') as FeedbackCategory,
      rating: Number(body.rating),
      subject: String(body.subject || ''),
      message: String(body.message || ''),
      senderName:
        verifiedUser.fullName ||
        (typeof body.senderName === 'string' ? body.senderName : undefined),
      senderEmail:
        verifiedUser.email ||
        (typeof body.senderEmail === 'string' ? body.senderEmail : undefined),
      senderId: verifiedUser.id,
      fromEmail: process.env.FEEDBACK_FROM_EMAIL,
    });

    if (built.valid === false) {
      res.status(400).json({ error: built.error });
      return;
    }

    try {
      const resendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(built.payload),
      });

      if (!resendRes.ok) {
        const detail = await resendRes.text();
        console.error('Resend feedback forwarding error:', resendRes.status, detail);
        res.status(502).json({
          forwarded: false,
          to: recipientEmail,
          error: `Email delivery service rejected the request (${resendRes.status}).`,
        });
        return;
      }

      const data = (await resendRes.json()) as { id?: string };
      res.status(200).json({
        forwarded: true,
        to: recipientEmail,
        id: data.id || null,
      });
    } catch {
      res.status(502).json({
        forwarded: false,
        to: recipientEmail,
        error: 'Unable to reach Resend email service.',
      });
    }
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
