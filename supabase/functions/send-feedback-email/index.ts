import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const FEEDBACK_RECIPIENT = "raj2010arpit@gmail.com";
const DEFAULT_FROM = "LifeDesk Feedback <onboarding@resend.dev>";
const VALID_CATEGORIES = new Set(["Feature Request", "Bug Report", "UI / UX", "General"]);

const buildCorsHeaders = (req: Request) => {
  const origin = req.headers.get("origin");
  return {
    "Access-Control-Allow-Origin": origin || "null",
    "Vary": "Origin",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
};

const escapeHtml = (raw: string): string =>
  String(raw)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const sanitizeHeaderText = (raw: string): string =>
  String(raw).replace(/[\r\n]+/g, " ").trim();

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

Deno.serve(async (req: Request) => {
  const corsHeaders = buildCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  const authHeader = req.headers.get("Authorization");

  if (!supabaseUrl || !serviceRoleKey || !authHeader) {
    return new Response(JSON.stringify({ error: "Missing server configuration or authorization" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!resendApiKey) {
    return new Response(JSON.stringify({ error: "Email forwarding secret (RESEND_API_KEY) is not configured" }), {
      status: 503,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: { user }, error: authError } = await admin.auth.getUser(token);
  if (authError || !user) {
    return new Response(JSON.stringify({ error: "Invalid or expired session" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON payload" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const category = VALID_CATEGORIES.has(String(body.category || ""))
    ? String(body.category)
    : "General";
  const rating = Math.round(Number(body.rating));
  const subject = String(body.subject || "").trim();
  const message = String(body.message || "").trim();

  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    return new Response(JSON.stringify({ error: "Rating must be between 1 and 5." }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (subject.length < 3 || subject.length > 120) {
    return new Response(JSON.stringify({ error: "Subject must be between 3 and 120 characters." }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (message.length < 10 || message.length > 1500) {
    return new Response(JSON.stringify({ error: "Feedback message must be between 10 and 1500 characters." }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const fromEmail = sanitizeHeaderText(Deno.env.get("FEEDBACK_FROM_EMAIL") || "") || DEFAULT_FROM;
  const senderName = sanitizeHeaderText(
    String((user.user_metadata?.full_name as string | undefined) || user.email?.split("@")[0] || "LifeDesk Student")
  );
  const senderEmail = sanitizeHeaderText(user.email || "");
  const submittedAt = new Date().toISOString();
  const starsText = `${"★".repeat(rating)}${"☆".repeat(5 - rating)} (${rating}/5)`;

  const resendPayload: Record<string, unknown> = {
    from: fromEmail,
    to: [FEEDBACK_RECIPIENT],
    subject: sanitizeHeaderText(`[LifeDesk Feedback • ${category}] ${subject}`),
    html: `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#F4FAF6;font-family:Inter,Arial,sans-serif;color:#173C30;">
    <div style="max-width:600px;margin:0 auto;background:#FFFFFF;border:1px solid #D0E6DA;border-radius:16px;padding:24px;">
      <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #D0E6DA;padding-bottom:14px;margin-bottom:18px;">
        <span style="font-size:18px;font-weight:700;color:#173C30;">LifeDesk Feedback</span>
        <span style="display:inline-block;padding:4px 10px;border-radius:8px;background:#DDF5E9;color:#239B70;font-size:12px;font-weight:700;">${escapeHtml(category)}</span>
      </div>
      <p style="margin:0 0 8px;font-size:13px;color:#46695D;"><strong>Rating:</strong> <span style="color:#239B70;">${escapeHtml(starsText)}</span></p>
      <p style="margin:0 0 8px;font-size:13px;color:#46695D;"><strong>From:</strong> ${escapeHtml(senderName)}${isValidEmailAddress(senderEmail) ? ` (&lt;${escapeHtml(senderEmail)}&gt;)` : ""}</p>
      <p style="margin:0 0 16px;font-size:13px;color:#46695D;"><strong>Submitted:</strong> ${escapeHtml(submittedAt)}</p>
      <h2 style="margin:0 0 10px;font-size:16px;color:#173C30;">${escapeHtml(subject)}</h2>
      <div style="padding:14px 16px;background:#F4FAF6;border:1px solid #D0E6DA;border-radius:12px;font-size:14px;line-height:1.55;color:#173C30;">
        ${escapeHtml(message).replace(/\n/g, "<br />")}
      </div>
    </div>
  </body>
</html>`,
    text: [
      "New LifeDesk Student Feedback",
      "=============================",
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

  const resendResponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(resendPayload),
  });

  if (!resendResponse.ok) {
    const errBody = await resendResponse.text();
    console.error("Resend feedback forwarding error:", resendResponse.status, errBody);
    return new Response(
      JSON.stringify({ error: `Email delivery service rejected the request (${resendResponse.status}).` }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const sent = await resendResponse.json();
  return new Response(
    JSON.stringify({ success: true, id: sent?.id || null, to: FEEDBACK_RECIPIENT }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
