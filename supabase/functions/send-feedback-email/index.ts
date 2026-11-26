import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

// Fixed notification destination — arbitrary frontend recipients are never permitted.
const FEEDBACK_RECIPIENT = "raj2010arpit@gmail.com";
const DEFAULT_FROM = "LifeDesk Feedback <onboarding@resend.dev>";
const DEFAULT_SITE_URL = "https://awakenedarpit.xyz";
const VALID_CATEGORIES = new Set(["Feature Request", "Bug Report", "UI / UX", "General"]);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const RATE_LIMIT_MAX_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const DUPLICATE_WINDOW_MS = 5 * 60 * 1000;

const isAllowedOrigin = (origin: string | null): boolean => {
  if (!origin) return false;
  const configured = (Deno.env.get("ALLOWED_ORIGINS") || "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);

  if (configured.includes(origin)) return true;

  try {
    const parsed = new URL(origin);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return false;
    const host = parsed.hostname.toLowerCase();
    if (host === "awakenedarpit.xyz" || host === "www.awakenedarpit.xyz") return true;
    if (host.endsWith(".vercel.app") || host.endsWith(".run.app")) return true;
    if (host === "localhost" || host === "127.0.0.1") return true;
  } catch {
    return false;
  }
  return false;
};

const buildCorsHeaders = (req: Request) => {
  const origin = req.headers.get("origin");
  const allowedOrigin = isAllowedOrigin(origin) ? origin! : DEFAULT_SITE_URL;
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Vary": "Origin",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
};

const jsonResponse = (
  body: Record<string, unknown>,
  status: number,
  corsHeaders: Record<string, string>,
  extraHeaders?: Record<string, string>
) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, ...(extraHeaders || {}), "Content-Type": "application/json" },
  });

const escapeHtml = (raw: string): string =>
  String(raw)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const sanitizeHeaderText = (raw: string): string =>
  String(raw).replace(/[\r\n]+/g, " ").trim();

const resolveSafeSiteUrl = (raw?: string | null): string => {
  const candidate = String(raw || "").trim();
  if (!candidate) return DEFAULT_SITE_URL;
  try {
    const parsed = new URL(candidate);
    if (parsed.protocol === "https:" || parsed.protocol === "http:") {
      return parsed.origin;
    }
  } catch {
    // Fallback to default
  }
  return DEFAULT_SITE_URL;
};

const sanitizeStoredError = (raw: string, maxLen = 400): string => {
  const cleaned = String(raw || "Email delivery failed.")
    .replace(/re_[a-zA-Z0-9_-]{8,}/g, "[redacted-key]")
    .replace(/Bearer\s+[a-zA-Z0-9._~+/-]+=*/gi, "Bearer [redacted]")
    .replace(/eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/g, "[redacted-token]")
    .trim();
  return cleaned.length > maxLen ? `${cleaned.slice(0, maxLen - 3)}...` : cleaned;
};

const formatFeedbackSubject = (category: string, shortDescription: string): string => {
  const cleanCat = sanitizeHeaderText(category) || "General";
  const cleanDesc = sanitizeHeaderText(shortDescription);
  const clipped = cleanDesc.length > 80 ? `${cleanDesc.slice(0, 77)}...` : cleanDesc;
  return `[LifeDesk Feedback] ${cleanCat} – ${clipped}`;
};

const formatSubmissionTimestamp = (isoString: string): string => {
  const parsed = new Date(isoString);
  if (Number.isNaN(parsed.getTime())) {
    return sanitizeHeaderText(isoString) || new Date().toISOString();
  }
  const formatted = parsed.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "UTC",
  });
  return `${formatted} UTC (${parsed.toISOString()})`;
};

const isValidEmailAddress = (raw?: string | null): boolean => {
  if (!raw) return false;
  const trimmed = String(raw).trim();
  if (!trimmed || trimmed.length > 254 || /[\s\r\n\0<>]/.test(trimmed)) return false;
  const atIndex = trimmed.indexOf("@");
  if (atIndex <= 0 || atIndex !== trimmed.lastIndexOf("@")) return false;
  const local = trimmed.slice(0, atIndex);
  const domain = trimmed.slice(atIndex + 1);
  if (
    local.length > 64 ||
    local.startsWith(".") ||
    local.endsWith(".") ||
    local.includes("..") ||
    !/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+$/.test(local)
  ) {
    return false;
  }
  if (
    domain.length < 3 ||
    domain.length > 253 ||
    domain.startsWith(".") ||
    domain.endsWith(".") ||
    domain.includes("..")
  ) {
    return false;
  }
  const labels = domain.split(".");
  if (labels.length < 2) return false;
  if (!/^[a-zA-Z]{2,63}$/.test(labels[labels.length - 1])) return false;
  return labels.every(
    (label) =>
      label.length >= 1 &&
      label.length <= 63 &&
      /^[a-zA-Z0-9-]+$/.test(label) &&
      !label.startsWith("-") &&
      !label.endsWith("-")
  );
};

interface FeedbackRow {
  id: string;
  user_id: string;
  category: string;
  rating: number;
  subject: string;
  message: string;
  page_context?: string | null;
  created_at: string;
  email_status?: string;
  email_sent_at?: string | null;
  email_error?: string | null;
  email_attempts?: number;
  email_message_id?: string | null;
}

const isMissingColumnError = (error: { code?: string; message?: string } | null): boolean => {
  if (!error) return false;
  const code = (error.code || "").toUpperCase();
  const msg = (error.message || "").toLowerCase();
  return (
    code === "42703" ||
    code === "PGRST204" ||
    (msg.includes("column") && msg.includes("does not exist")) ||
    msg.includes("could not find the")
  );
};

Deno.serve(async (req: Request) => {
  const corsHeaders = buildCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405, corsHeaders);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const resendApiKey = (Deno.env.get("RESEND_API_KEY") || "").trim();
  const authHeader = req.headers.get("Authorization");

  if (!supabaseUrl || !serviceRoleKey || !authHeader) {
    return jsonResponse(
      { error: "Missing server configuration or authorization" },
      401,
      corsHeaders
    );
  }

  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) {
    return jsonResponse({ error: "Authorization bearer token required" }, 401, corsHeaders);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Never trust client-provided user IDs or email addresses — verify JWT with Supabase Auth.
  const {
    data: { user },
    error: authError,
  } = await admin.auth.getUser(token);

  if (authError || !user) {
    return jsonResponse({ error: "Invalid or expired session" }, 401, corsHeaders);
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return jsonResponse({ error: "Invalid JSON payload" }, 400, corsHeaders);
  }

  const feedbackId = typeof body.feedbackId === "string" ? body.feedbackId.trim() : "";
  if (!feedbackId || !UUID_RE.test(feedbackId)) {
    return jsonResponse(
      { error: "A valid feedbackId (UUID) is required." },
      400,
      corsHeaders
    );
  }

  // 1. Fetch authoritative feedback row (with graceful fallback for older schemas)
  let hasTrackingColumns = true;
  let feedbackRow: FeedbackRow | null = null;

  const fullQuery = await admin
    .from("feedback")
    .select(
      "id, user_id, category, rating, subject, message, page_context, created_at, email_status, email_sent_at, email_error, email_attempts, email_message_id"
    )
    .eq("id", feedbackId)
    .maybeSingle();

  if (fullQuery.error && isMissingColumnError(fullQuery.error)) {
    const trackingOnlyQuery = await admin
      .from("feedback")
      .select(
        "id, user_id, category, rating, subject, message, created_at, email_status, email_sent_at, email_error, email_attempts, email_message_id"
      )
      .eq("id", feedbackId)
      .maybeSingle();

    if (trackingOnlyQuery.error && isMissingColumnError(trackingOnlyQuery.error)) {
      hasTrackingColumns = false;
      const baseQuery = await admin
        .from("feedback")
        .select("id, user_id, category, rating, subject, message, created_at")
        .eq("id", feedbackId)
        .maybeSingle();

      if (baseQuery.error) {
        return jsonResponse({ error: "Unable to load saved feedback record." }, 500, corsHeaders);
      }
      feedbackRow = baseQuery.data as FeedbackRow | null;
    } else if (trackingOnlyQuery.error) {
      return jsonResponse({ error: "Unable to load saved feedback record." }, 500, corsHeaders);
    } else {
      feedbackRow = trackingOnlyQuery.data as FeedbackRow | null;
    }
  } else if (fullQuery.error) {
    return jsonResponse({ error: "Unable to load saved feedback record." }, 500, corsHeaders);
  } else {
    feedbackRow = fullQuery.data as FeedbackRow | null;
  }

  if (!feedbackRow) {
    return jsonResponse({ error: "Feedback record not found." }, 404, corsHeaders);
  }

  // 2. Strict ownership verification: only the feedback author may trigger notification
  if (feedbackRow.user_id !== user.id) {
    return jsonResponse(
      { error: "You do not have permission to send a notification for this feedback." },
      403,
      corsHeaders
    );
  }

  // 3. Idempotency: never send duplicate notifications if already sent
  if (hasTrackingColumns && feedbackRow.email_status === "sent") {
    return jsonResponse(
      {
        success: true,
        alreadySent: true,
        feedbackId: feedbackRow.id,
        emailStatus: "sent",
        emailSentAt: feedbackRow.email_sent_at || null,
        id: feedbackRow.email_message_id || null,
        to: FEEDBACK_RECIPIENT,
      },
      200,
      corsHeaders
    );
  }

  // 4. Duplicate-content suppression: prevent accidental duplicate submissions from spamming emails
  if (hasTrackingColumns) {
    const dupSince = new Date(Date.now() - DUPLICATE_WINDOW_MS).toISOString();
    const { data: recentSent } = await admin
      .from("feedback")
      .select("id, email_sent_at, email_message_id")
      .eq("user_id", user.id)
      .eq("email_status", "sent")
      .eq("category", feedbackRow.category)
      .eq("subject", feedbackRow.subject)
      .eq("message", feedbackRow.message)
      .neq("id", feedbackRow.id)
      .gte("email_sent_at", dupSince)
      .limit(1)
      .maybeSingle();

    if (recentSent) {
      return jsonResponse(
        {
          success: true,
          alreadySent: true,
          duplicateSuppressed: true,
          feedbackId: feedbackRow.id,
          emailStatus: "sent",
          emailSentAt: recentSent.email_sent_at || null,
          id: recentSent.email_message_id || null,
          to: FEEDBACK_RECIPIENT,
        },
        200,
        corsHeaders
      );
    }

    // 5. Database-backed per-user rate limit (max 5 sends/retries per 15 minutes)
    const rateSince = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();
    const { count: recentAttemptCount } = await admin
      .from("feedback")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gt("email_attempts", 0)
      .gte("updated_at", rateSince);

    if (typeof recentAttemptCount === "number" && recentAttemptCount >= RATE_LIMIT_MAX_ATTEMPTS) {
      return jsonResponse(
        {
          success: false,
          rateLimited: true,
          feedbackId: feedbackRow.id,
          emailStatus: feedbackRow.email_status || "pending",
          to: FEEDBACK_RECIPIENT,
          error:
            "Too many feedback email requests in a short period. Your feedback is safely saved; please retry in a few minutes.",
        },
        429,
        corsHeaders,
        { "Retry-After": "900" }
      );
    }

    // 6. Atomically claim the row to prevent concurrent duplicate sends
    const nextAttempts = (Number(feedbackRow.email_attempts) || 0) + 1;
    const claimResult = await admin
      .from("feedback")
      .update({
        email_status: "sending",
        email_attempts: nextAttempts,
        email_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", feedbackRow.id)
      .eq("user_id", user.id)
      .in("email_status", ["pending", "failed"])
      .select("id, email_status, email_sent_at, email_message_id")
      .maybeSingle();

    if (claimResult.error || !claimResult.data) {
      const latest = await admin
        .from("feedback")
        .select("email_status, email_sent_at, email_message_id")
        .eq("id", feedbackRow.id)
        .maybeSingle();

      if (latest.data?.email_status === "sent") {
        return jsonResponse(
          {
            success: true,
            alreadySent: true,
            feedbackId: feedbackRow.id,
            emailStatus: "sent",
            emailSentAt: latest.data.email_sent_at || null,
            id: latest.data.email_message_id || null,
            to: FEEDBACK_RECIPIENT,
          },
          200,
          corsHeaders
        );
      }

      return jsonResponse(
        {
          success: false,
          inProgress: true,
          feedbackId: feedbackRow.id,
          emailStatus: latest.data?.email_status || "sending",
          to: FEEDBACK_RECIPIENT,
          error: "Notification delivery is already in progress.",
        },
        202,
        corsHeaders
      );
    }
  }

  const recordFailure = async (errMsg: string) => {
    const safeError = sanitizeStoredError(errMsg);
    if (hasTrackingColumns) {
      await admin
        .from("feedback")
        .update({
          email_status: "failed",
          email_error: safeError,
          updated_at: new Date().toISOString(),
        })
        .eq("id", feedbackRow!.id)
        .eq("user_id", user.id);
    }
    return safeError;
  };

  if (!resendApiKey) {
    const safeError = await recordFailure(
      "Email forwarding secret (RESEND_API_KEY) is not configured in Supabase Edge Function secrets."
    );
    return jsonResponse(
      {
        success: false,
        feedbackId: feedbackRow.id,
        emailStatus: "failed",
        emailError: safeError,
        to: FEEDBACK_RECIPIENT,
        error: safeError,
      },
      503,
      corsHeaders
    );
  }

  // 7. Validate authoritative DB fields
  const category = VALID_CATEGORIES.has(String(feedbackRow.category || ""))
    ? String(feedbackRow.category)
    : "General";
  const rating = Math.round(Number(feedbackRow.rating));
  const subject = String(feedbackRow.subject || "").trim();
  const message = String(feedbackRow.message || "").trim();

  if (
    !Number.isFinite(rating) ||
    rating < 1 ||
    rating > 5 ||
    subject.length < 3 ||
    subject.length > 120 ||
    message.length < 10 ||
    message.length > 1500
  ) {
    const safeError = await recordFailure("Stored feedback record failed validation.");
    return jsonResponse(
      {
        success: false,
        feedbackId: feedbackRow.id,
        emailStatus: "failed",
        emailError: safeError,
        to: FEEDBACK_RECIPIENT,
        error: safeError,
      },
      400,
      corsHeaders
    );
  }

  // 8. Resolve submitter name & registered email from authoritative profile + auth record
  const { data: profileRow } = await admin
    .from("profiles")
    .select("full_name, email")
    .eq("id", user.id)
    .maybeSingle();

  const fromEmail = sanitizeHeaderText(Deno.env.get("FEEDBACK_FROM_EMAIL") || "") || DEFAULT_FROM;
  const siteUrl = resolveSafeSiteUrl(Deno.env.get("LIFEDESK_APP_URL") || DEFAULT_SITE_URL);
  const logoUrl = `${siteUrl}/assets/lifedesk-logo.png`;
  const senderName = sanitizeHeaderText(
    String(
      profileRow?.full_name ||
        (user.user_metadata?.full_name as string | undefined) ||
        (user.user_metadata?.name as string | undefined) ||
        user.email?.split("@")[0] ||
        "LifeDesk User"
    )
  );
  const senderEmail = sanitizeHeaderText(String(user.email || profileRow?.email || ""));
  const validReplyTo = isValidEmailAddress(senderEmail) ? senderEmail : undefined;
  const pageContext =
    sanitizeHeaderText(
      String(
        feedbackRow.page_context ||
          (typeof body.pageContext === "string" ? body.pageContext : "") ||
          "Profile & Settings (/profile)"
      )
    ).slice(0, 160) || "Profile & Settings (/profile)";
  const submittedAtFormatted = formatSubmissionTimestamp(
    feedbackRow.created_at || new Date().toISOString()
  );
  const starsText = `${"★".repeat(rating)}${"☆".repeat(5 - rating)} (${rating}/5)`;
  const emailSubject = formatFeedbackSubject(category, subject);
  const htmlMessage = escapeHtml(message).replace(/\r\n|\r|\n/g, "<br />");

  const resendPayload: Record<string, unknown> = {
    from: fromEmail,
    to: [FEEDBACK_RECIPIENT],
    subject: emailSubject,
    html: `<!doctype html>
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
                    <td style="padding:10px 14px;font-family:'JetBrains Mono',ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;color:#173C30;border-bottom:1px solid #E3F2EA;word-break:break-all;">${escapeHtml(feedbackRow.id)}</td>
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
                    <td style="padding:10px 14px;font-size:13px;color:#173C30;border-bottom:1px solid #E3F2EA;">${escapeHtml(senderName)}</td>
                  </tr>
                  <tr>
                    <td style="padding:10px 14px;font-size:12px;font-weight:700;color:#46695D;border-bottom:1px solid #E3F2EA;">User Email</td>
                    <td style="padding:10px 14px;font-size:13px;color:#173C30;border-bottom:1px solid #E3F2EA;word-break:break-word;">${validReplyTo ? escapeHtml(validReplyTo) : "Not provided"}</td>
                  </tr>
                  <tr>
                    <td style="padding:10px 14px;font-size:12px;font-weight:700;color:#46695D;border-bottom:1px solid #E3F2EA;">Page / Feature</td>
                    <td style="padding:10px 14px;font-size:13px;color:#173C30;border-bottom:1px solid #E3F2EA;word-break:break-word;">${escapeHtml(pageContext)}</td>
                  </tr>
                  <tr>
                    <td style="padding:10px 14px;font-size:12px;font-weight:700;color:#46695D;">Submitted At</td>
                    <td style="padding:10px 14px;font-size:13px;color:#173C30;">${escapeHtml(submittedAtFormatted)}</td>
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
</html>`,
    text: [
      "LifeDesk — New Feedback Received",
      "================================",
      `Feedback ID: ${feedbackRow.id}`,
      `Category: ${category}`,
      `Rating: ${rating}/5`,
      `Relevant Page / Feature: ${pageContext}`,
      `User Name: ${senderName}`,
      `User Email: ${validReplyTo || "Not provided"}`,
      `User ID: ${user.id}`,
      `Submitted At: ${submittedAtFormatted}`,
      `Subject: ${subject}`,
      "",
      "Feedback Message:",
      message,
      "",
      `Open LifeDesk: ${siteUrl}`,
    ].join("\n"),
  };

  if (validReplyTo) {
    resendPayload.reply_to = validReplyTo;
  }

  // 9. Send via Resend with provider-level Idempotency-Key and verify acceptance ID
  try {
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `lifedesk-feedback-${feedbackRow.id}`,
      },
      body: JSON.stringify(resendPayload),
    });

    if (!resendResponse.ok) {
      const errBody = await resendResponse.text();
      console.error("Resend feedback forwarding error:", resendResponse.status, errBody);
      const safeError = await recordFailure(
        `Email delivery service rejected the request (${resendResponse.status}).`
      );
      return jsonResponse(
        {
          success: false,
          feedbackId: feedbackRow.id,
          emailStatus: "failed",
          emailError: safeError,
          to: FEEDBACK_RECIPIENT,
          error: safeError,
        },
        502,
        corsHeaders
      );
    }

    const sent = (await resendResponse.json()) as { id?: string };
    const confirmedId = typeof sent?.id === "string" ? sent.id.trim() : "";
    if (!confirmedId) {
      const safeError = await recordFailure(
        "Resend did not return a delivery confirmation ID."
      );
      return jsonResponse(
        {
          success: false,
          feedbackId: feedbackRow.id,
          emailStatus: "failed",
          emailError: safeError,
          to: FEEDBACK_RECIPIENT,
          error: safeError,
        },
        502,
        corsHeaders
      );
    }

    const sentAt = new Date().toISOString();

    if (hasTrackingColumns) {
      await admin
        .from("feedback")
        .update({
          email_status: "sent",
          email_sent_at: sentAt,
          email_error: null,
          email_message_id: confirmedId,
          updated_at: sentAt,
        })
        .eq("id", feedbackRow.id)
        .eq("user_id", user.id);
    }

    return jsonResponse(
      {
        success: true,
        alreadySent: false,
        feedbackId: feedbackRow.id,
        emailStatus: "sent",
        emailSentAt: sentAt,
        id: confirmedId,
        to: FEEDBACK_RECIPIENT,
      },
      200,
      corsHeaders
    );
  } catch (err) {
    console.error("Resend network error:", err);
    const safeError = await recordFailure("Unable to reach Resend email service.");
    return jsonResponse(
      {
        success: false,
        feedbackId: feedbackRow.id,
        emailStatus: "failed",
        emailError: safeError,
        to: FEEDBACK_RECIPIENT,
        error: safeError,
      },
      502,
      corsHeaders
    );
  }
});
