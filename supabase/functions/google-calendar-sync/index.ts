import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID")!;
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET")!;

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_CALENDAR_API = "https://www.googleapis.com/calendar/v3";
const DEFAULT_TIME_ZONE = "Asia/Kolkata";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://awakenedarpit.github.io",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

async function getUser(req: Request) {
  const authorization = req.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) return null;

  const token = authorization.replace("Bearer ", "").trim();
  if (!token) return null;

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
}

async function refreshAccessToken(
  admin: ReturnType<typeof createClient>,
  connection: Record<string, any>,
) {
  const expiresAt = connection.access_token_expires_at
    ? new Date(connection.access_token_expires_at).getTime()
    : 0;

  if (
    connection.access_token &&
    expiresAt > Date.now() + 60_000
  ) {
    return connection.access_token as string;
  }

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: connection.refresh_token,
      grant_type: "refresh_token",
    }),
  });

  const data = await response.json();

  if (!response.ok || !data.access_token) {
    await admin
      .from("google_calendar_connections")
      .update({
        sync_status: "error",
        last_error: `Google token refresh failed: ${data.error_description || data.error || "unknown error"}`,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", connection.user_id);

    throw new Error("Google access token could not be refreshed.");
  }

  const expiresIn = Number(data.expires_in || 3600);
  const accessTokenExpiresAt = new Date(
    Date.now() + expiresIn * 1000,
  ).toISOString();

  await admin
    .from("google_calendar_connections")
    .update({
      access_token: data.access_token,
      access_token_expires_at: accessTokenExpiresAt,
      sync_status: "connected",
      last_error: null,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", connection.user_id);

  return data.access_token as string;
}

function normaliseDateTime(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Task deadline is not a valid date/time.");
  }
  return parsed.toISOString();
}

function buildGoogleEvent(task: Record<string, any>) {
  const start = normaliseDateTime(task.deadline);
  const end = new Date(new Date(start).getTime() + 60 * 60 * 1000).toISOString();

  const descriptionParts = [
    task.description || "",
    task.notes ? `Notes: ${task.notes}` : "",
    `LifeDesk Task ID: ${task.id}`,
  ].filter(Boolean);

  return {
    summary: task.title || "LifeDesk Task",
    description: descriptionParts.join("\n\n"),
    start: {
      dateTime: start,
      timeZone: DEFAULT_TIME_ZONE,
    },
    end: {
      dateTime: end,
      timeZone: DEFAULT_TIME_ZONE,
    },
    extendedProperties: {
      private: {
        lifedesk_task_id: task.id,
        lifedesk_user_id: task.user_id,
      },
    },
  };
}

async function googleRequest(
  accessToken: string,
  path: string,
  method: string,
  body?: unknown,
) {
  const response = await fetch(`${GOOGLE_CALENDAR_API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const text = await response.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }

  return { response, data };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "POST is required." }, 405);
  }

  try {
    const user = await getUser(req);
    if (!user) {
      return json({ error: "You must be signed in." }, 401);
    }

    const body = await req.json();
    const action = body?.action;
    const task = body?.task;

    if (!action || !["upsert", "delete"].includes(action)) {
      return json({ error: "action must be upsert or delete." }, 400);
    }

    if (!task?.id) {
      return json({ error: "A LifeDesk task id is required." }, 400);
    }

    const admin = createClient(
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY,
    );

    const { data: connection, error: connectionError } = await admin
      .from("google_calendar_connections")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (connectionError) {
      console.error("Connection lookup failed:", connectionError);
      return json({ error: "Could not read Google Calendar connection." }, 500);
    }

    if (!connection?.refresh_token) {
      return json({
        error: "Google Calendar is not connected.",
        code: "NOT_CONNECTED",
      }, 409);
    }

    const accessToken = await refreshAccessToken(admin, connection);
    const calendarId = connection.google_calendar_id || "primary";

    const { data: existingLink, error: linkError } = await admin
      .from("google_calendar_event_links")
      .select("id, google_event_id, google_calendar_id")
      .eq("user_id", user.id)
      .eq("task_id", task.id)
      .maybeSingle();

    if (linkError) {
      console.error("Event link lookup failed:", linkError);
      return json({ error: "Could not read Google Calendar event link." }, 500);
    }

    if (action === "delete") {
      if (!existingLink?.google_event_id) {
        return json({ ok: true, deleted: false, reason: "not_linked" });
      }

      const result = await googleRequest(
        accessToken,
        `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(existingLink.google_event_id)}`,
        "DELETE",
      );

      if (!result.response.ok && result.response.status !== 404) {
        console.error("Google delete failed:", result.data);
        return json({ error: "Google Calendar event could not be deleted." }, 502);
      }

      await admin
        .from("google_calendar_event_links")
        .delete()
        .eq("id", existingLink.id);

      return json({ ok: true, deleted: true });
    }

    if (task.status === "Completed") {
      // Completed tasks remain in Google Calendar; their title is prefixed
      // so the calendar does not silently lose historical work.
    }

    const googleEvent = buildGoogleEvent({
      ...task,
      user_id: user.id,
    });

    let googleEventId = existingLink?.google_event_id as string | undefined;
    let operation: "created" | "updated" = "updated";

    if (googleEventId) {
      const updateResult = await googleRequest(
        accessToken,
        `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(googleEventId)}`,
        "PUT",
        googleEvent,
      );

      if (updateResult.response.ok) {
        operation = "updated";
      } else if (updateResult.response.status === 404) {
        googleEventId = undefined;
      } else {
        console.error("Google update failed:", updateResult.data);
        return json({ error: "Google Calendar event could not be updated." }, 502);
      }
    }

    if (!googleEventId) {
      const createResult = await googleRequest(
        accessToken,
        `/calendars/${encodeURIComponent(calendarId)}/events`,
        "POST",
        googleEvent,
      );

      if (!createResult.response.ok || !createResult.data?.id) {
        console.error("Google create failed:", createResult.data);
        return json({ error: "Google Calendar event could not be created." }, 502);
      }

      googleEventId = createResult.data.id;
      operation = "created";
    }

    const { error: linkUpsertError } = await admin
      .from("google_calendar_event_links")
      .upsert({
        user_id: user.id,
        task_id: task.id,
        google_calendar_id: calendarId,
        google_event_id: googleEventId,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: "user_id,task_id",
      });

    if (linkUpsertError) {
      console.error("Event link save failed:", linkUpsertError);
      return json({
        ok: true,
        synced: true,
        operation,
        warning: "Google event was synced, but the local mapping could not be saved.",
      });
    }

    await admin
      .from("google_calendar_connections")
      .update({
        sync_status: "connected",
        last_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id);

    return json({
      ok: true,
      synced: true,
      operation,
      google_event_id: googleEventId,
    });
  } catch (error) {
    console.error("Google Calendar sync error:", error);
    return json({
      error: error instanceof Error
        ? error.message
        : "Google Calendar sync failed.",
    }, 500);
  }
});
