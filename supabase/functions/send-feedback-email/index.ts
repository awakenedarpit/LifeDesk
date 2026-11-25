import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

// Fixed notification destination — arbitrary frontend recipients are never permitted.
const FEEDBACK_RECIPIENT = "raj2010arpit@gmail.com";
const DEFAULT_FROM = "LifeDesk Feedback <onboarding@resend.dev>";
const VALID_CATEGORIES = new Set(["Feature Request", "Bug Report", "UI / UX", "General"]);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const buildCorsHeaders = (req: Request) => {
  const origin = req.headers.get("origin");
  return {
    "Access-Control-Allow-Origin": origin || "null",
    "Vary": "Origin",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
};

const jsonResponse = (
  body: Record<string, unknown>,
  status: number,
  corsHeaders: Record<string, string>
) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
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

const truncateError = (raw: string, maxLen = 400): string => {
  const cleaned = String(raw || "Email delivery failed.").trim();
  return cleaned.length > maxLen ? `${cleaned.slice(0, maxLen - 3)}...` : cleaned;
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
    (msg.includes("column") && msg.includes("does not exist"))
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

  // 1. Fetch authoritative feedback row and detect whether tracking columns exist
  let hasTrackingColumns = true;
  let feedbackRow: FeedbackRow | null = null;

  const fullQuery = await admin
    .from("feedback")
    .select(
      "id, user_id, category, rating, subject, message, created_at, email_status, email_sent_at, email_error, email_attempts, email_message_id"
    )
    .eq("id", feedbackId)
    .maybeSingle();

  if (fullQuery.error && isMissingColumnError(fullQuery.error)) {
    hasTrackingColumns = false;
    const baseQuery = await admin
      .from("feedback")
      .select("id, user_id, category, rating, subject, message, created_at")
      .eq("id", feedbackId)
      .maybeSingle();

    if (baseQuery.error) {
      return jsonResponse(
        { error: "Unable to load saved feedback record." },
        500,
        corsHeaders
      );
    }
    feedbackRow = baseQuery.data as FeedbackRow | null;
  } else if (fullQuery.error) {
    return jsonResponse(
      { error: "Unable to load saved feedback record." },
      500,
      corsHeaders
    );
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

  // 4. Atomically claim the row to prevent concurrent duplicate sends
  if (hasTrackingColumns) {
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
    const safeError = truncateError(errMsg);
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

  // 5. Validate authoritative DB fields
  const category = VALID_CATEGORIES.has(String(feedbackRow.category || ""))
    ? String(feedbackRow.category)
    : "General";
  const rating = Math.round(Number(feedbackRow.rating));
  const subject = String(feedbackRow.subject || "").trim();
  const message = String(feedbackRow.message || "").trim();

  if (!Number.isFinite(rating) || rating < 1 || rating > 5 || subject.length < 3 || message.length < 10) {
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

  // 6. Resolve submitter name & registered email from profile + auth record
  const { data: profileRow } = await admin
    .from("profiles")
    .select("full_name, email")
    .eq("id", user.id)
    .maybeSingle();

  const fromEmail = sanitizeHeaderText(Deno.env.get("FEEDBACK_FROM_EMAIL") || "") || DEFAULT_FROM;
  const senderName = sanitizeHeaderText(
    String(
      profileRow?.full_name ||
        (user.user_metadata?.full_name as string | undefined) ||
        (user.user_metadata?.name as string | undefined) ||
        user.email?.split("@")[0] ||
        "LifeDesk Student"
    )
  );
  const senderEmail = sanitizeHeaderText(String(user.email || profileRow?.email || ""));
  const submittedAt = feedbackRow.created_at || new Date().toISOString();
  const starsText = `${"★".repeat(rating)}${"☆".repeat(5 - rating)} (${rating}/5)`;

  const resendPayload: Record<string, unknown> = {
    from: fromEmail,
    to: [FEEDBACK_RECIPIENT],
    subject: sanitizeHeaderText(`[LifeDesk Feedback • ${category}] ${subject}`),
    html: `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#F4FAF6;font-family:'Plus Jakarta Sans',Inter,Arial,sans-serif;color:#173C30;">
    <div style="max-width:600px;margin:0 auto;background:#FFFFFF;border:1px solid #D0E6DA;border-radius:16px;padding:24px;">
      <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #D0E6DA;padding-bottom:14px;margin-bottom:18px;">
        <div>
          <span style="font-size:18px;font-weight:700;color:#173C30;display:block;">LifeDesk Feedback</span>
          <span style="font-size:12px;color:#46695D;">Student Command Center Notification</span>
        </div>
        <span style="display:inline-block;padding:4px 10px;border-radius:8px;background:#DDF5E9;color:#187A56;font-size:12px;font-weight:700;">${escapeHtml(category)}</span>
      </div>
      <table role="presentation" style="width:100%;border-collapse:collapse;margin-bottom:16px;font-size:13px;color:#46695D;">
        <tr>
          <td style="padding:4px 0;width:130px;font-weight:600;color:#173C30;">Feedback ID</td>
          <td style="padding:4px 0;font-family:'JetBrains Mono',monospace;font-size:12px;color:#173C30;">${escapeHtml(feedbackRow.id)}</td>
        </tr>
        <tr>
          <td style="padding:4px 0;font-weight:600;color:#173C30;">Rating</td>
          <td style="padding:4px 0;color:#187A56;font-weight:600;">${escapeHtml(starsText)}</td>
        </tr>
        <tr>
          <td style="padding:4px 0;font-weight:600;color:#173C30;">Submitted By</td>
          <td style="padding:4px 0;">${escapeHtml(senderName)}${isValidEmailAddress(senderEmail) ? ` (&lt;${escapeHtml(senderEmail)}&gt;)` : ""}</td>
        </tr>
        <tr>
          <td style="padding:4px 0;font-weight:600;color:#173C30;">Submitted At</td>
          <td style="padding:4px 0;">${escapeHtml(submittedAt)}</td>
        </tr>
      </table>
      <h2 style="margin:0 0 10px;font-size:16px;color:#173C30;">${escapeHtml(subject)}</h2>
      <div style="padding:14px 16px;background:#F4FAF6;border:1px solid #D0E6DA;border-radius:12px;font-size:14px;line-height:1.6;color:#173C30;">
        ${escapeHtml(message).replace(/\n/g, "<br />")}
      </div>
      <p style="margin:18px 0 0;font-size:11px;color:#46695D;border-top:1px solid #E3F2EA;padding-top:12px;">
        Automatic notification from LifeDesk. Reply directly to respond to the student when an email address is provided.
      </p>
    </div>
  </body>
</html>`,
    text: [
      "New LifeDesk Student Feedback",
      "=============================",
      `Feedback ID: ${feedbackRow.id}`,
      `Category: ${category}`,
      `Rating: ${rating}/5`,
      `Subject: ${subject}`,
      `From: ${senderName}${senderEmail ? ` <${senderEmail}>` : ""}`,
      `User ID: ${user.id}`,
      `Submitted At: ${submittedAt}`,
      "",
      "Message:",
      message,
    ].join("\n"),
  };

  if (isValidEmailAddress(senderEmail)) {
    resendPayload.reply_to = senderEmail;
  }

  // 7. Send via Resend with provider-level Idempotency-Key
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
    const sentAt = new Date().toISOString();

    if (hasTrackingColumns) {
      await admin
        .from("feedback")
        .update({
          email_status: "sent",
          email_sent_at: sentAt,
          email_error: null,
          email_message_id: sent?.id || null,
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
        id: sent?.id || null,
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
