import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID")!;
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET")!;

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_CALENDAR_API = "https://www.googleapis.com/calendar/v3";
const LOOKBACK_DAYS = 30;
const LOOKAHEAD_DAYS = 365;

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://awakenedarpit.github.io",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function getUser(req: Request) {
  const authorization = req.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) return null;
  const token = authorization.replace("Bearer ", "").trim();
  if (!token) return null;

  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
}

async function getAccessToken(admin: ReturnType<typeof createClient>, connection: Record<string, any>) {
  const expiresAt = connection.access_token_expires_at
    ? new Date(connection.access_token_expires_at).getTime()
    : 0;

  if (connection.access_token && expiresAt > Date.now() + 60_000) {
    return connection.access_token as string;
  }

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: connection.refresh_token,
      grant_type: "refresh_token",
    }),
  });

  const data = await response.json();
  if (!response.ok || !data.access_token) {
    await admin.from("google_calendar_connections").update({
      sync_status: "error",
      last_error: `Google token refresh failed: ${data.error_description || data.error || "unknown error"}`,
      updated_at: new Date().toISOString(),
    }).eq("user_id", connection.user_id);
    throw new Error("Google access token could not be refreshed.");
  }

  const expiresIn = Number(data.expires_in || 3600);
  await admin.from("google_calendar_connections").update({
    access_token: data.access_token,
    access_token_expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
    sync_status: "connected",
    last_error: null,
    updated_at: new Date().toISOString(),
  }).eq("user_id", connection.user_id);

  return data.access_token as string;
}

async function googleGet(accessToken: string, path: string) {
  const response = await fetch(`${GOOGLE_CALENDAR_API}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const text = await response.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
  return { response, data };
}

function eventDateTime(event: any): string | null {
  if (event.start?.dateTime) return new Date(event.start.dateTime).toISOString();
  if (event.start?.date) return new Date(`${event.start.date}T09:00:00+05:30`).toISOString();
  return null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "POST is required." }, 405);

  try {
    const user = await getUser(req);
    if (!user) return json({ error: "You must be signed in." }, 401);

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: connection, error: connectionError } = await admin
      .from("google_calendar_connections")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (connectionError) return json({ error: "Could not read Google Calendar connection.", details: connectionError.message }, 500);
    if (!connection?.refresh_token) return json({ ok: true, synced: false, reason: "NOT_CONNECTED" });

    const accessToken = await getAccessToken(admin, connection);
    const calendarId = connection.google_calendar_id || "primary";
    const now = new Date();
    const timeMin = new Date(now.getTime() - LOOKBACK_DAYS * 86400000).toISOString();
    const timeMax = new Date(now.getTime() + LOOKAHEAD_DAYS * 86400000).toISOString();

    const allEvents: any[] = [];
    let pageToken = "";

    do {
      const params = new URLSearchParams({
        timeMin,
        timeMax,
        singleEvents: "true",
        showDeleted: "true",
        maxResults: "2500",
        orderBy: "startTime",
      });
      if (pageToken) params.set("pageToken", pageToken);

      const result = await googleGet(
        accessToken,
        `/calendars/${encodeURIComponent(calendarId)}/events?${params.toString()}`,
      );

      if (!result.response.ok) {
        console.error("Google events.list failed:", result.data);
        return json({ error: "Could not read Google Calendar events.", details: result.data }, 502);
      }

      allEvents.push(...(result.data.items || []));
      pageToken = result.data.nextPageToken || "";
    } while (pageToken);

    const { data: links, error: linksError } = await admin
      .from("google_calendar_event_links")
      .select("id, task_id, google_event_id, google_calendar_id")
      .eq("user_id", user.id)
      .eq("google_calendar_id", calendarId);

    if (linksError) return json({ error: "Could not read calendar mappings.", details: linksError.message }, 500);

    const linkByEventId = new Map((links || []).map((link: any) => [link.google_event_id, link]));
    const seenEventIds = new Set<string>();
    let created = 0;
    let updated = 0;
    let deleted = 0;
    let skipped = 0;

    for (const event of allEvents) {
      if (!event.id) continue;
      seenEventIds.add(event.id);

      const link = linkByEventId.get(event.id);

      if (event.status === "cancelled") {
        if (link) {
          const { error: taskDeleteError } = await admin.from("tasks")
            .delete().eq("id", link.task_id).eq("user_id", user.id);
          if (!taskDeleteError) {
            await admin.from("google_calendar_event_links").delete().eq("id", link.id);
            deleted++;
          } else {
            console.error("Failed to delete LifeDesk task for cancelled Google event:", taskDeleteError);
          }
        }
        continue;
      }

      const title = String(event.summary || "").trim();
      const deadline = eventDateTime(event);
      if (!title || !deadline) {
        skipped++;
        continue;
      }

      const description = event.description || "";
      const privateProps = event.extendedProperties?.private || {};

      if (link) {
        const { error } = await admin.from("tasks").update({
          title,
          description,
          deadline,
          notes: privateProps.lifedesk_source === "google"
            ? "Imported from Google Calendar"
            : "Google Calendar synced event",
          updated_at: new Date().toISOString(),
        }).eq("id", link.task_id).eq("user_id", user.id);

        if (!error) updated++;
        else console.error("Failed to update linked LifeDesk task:", error);
        continue;
      }

      /*
       * Events created by LifeDesk already carry the task ID. If a mapping
       * disappeared, reconnect it instead of creating a duplicate task.
       */
      const googleTaskId = privateProps.lifedesk_task_id;
      if (googleTaskId) {
        const { data: existingTask } = await admin.from("tasks")
          .select("id")
          .eq("id", googleTaskId)
          .eq("user_id", user.id)
          .maybeSingle();

        if (existingTask) {
          const { error: remapError } = await admin.from("google_calendar_event_links").upsert({
            user_id: user.id,
            task_id: existingTask.id,
            google_calendar_id: calendarId,
            google_event_id: event.id,
            updated_at: new Date().toISOString(),
          }, { onConflict: "user_id,task_id" });

          if (!remapError) updated++;
          else console.error("Failed to restore event mapping:", remapError);
          continue;
        }
      }

      /*
       * Import a normal Google Calendar event as a valid LifeDesk task.
       * 'Personal' is part of LifeDesk's actual TaskCategory union/schema;
       * the old 'Google Calendar' category was invalid and could make the
       * insert fail silently from the UI's perspective.
       */
      const { data: task, error: taskError } = await admin.from("tasks")
        .insert({
          user_id: user.id,
          title,
          description,
          category: "Personal",
          deadline,
          priority: "Medium",
          status: "Not Started",
          notes: "Imported from Google Calendar",
          tags: ["google-calendar", "imported"],
        })
        .select("id")
        .single();

      if (taskError || !task) {
        console.error("Failed to import Google event into LifeDesk:", taskError);
        continue;
      }

      const { error: linkInsertError } = await admin.from("google_calendar_event_links").insert({
        user_id: user.id,
        task_id: task.id,
        google_calendar_id: calendarId,
        google_event_id: event.id,
      });

      if (linkInsertError) {
        await admin.from("tasks").delete().eq("id", task.id).eq("user_id", user.id);
        console.error("Failed to save Google event mapping:", linkInsertError);
        continue;
      }

      /*
       * Tag imported Google events so future syncs can identify their source.
       * This PATCH is best-effort; the task and mapping remain valid if it fails.
       */
      const patchResponse = await fetch(
        `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(event.id)}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            extendedProperties: {
              private: {
                ...privateProps,
                lifedesk_task_id: task.id,
                lifedesk_user_id: user.id,
                lifedesk_source: "google",
              },
            },
          }),
        },
      );

      if (!patchResponse.ok) {
        console.warn("Could not mark imported Google event with LifeDesk metadata:", await patchResponse.text());
      }

      created++;
    }

    /*
     * Do NOT infer deletion merely because an event is absent from this
     * time-window query. Google already returns cancelled events when
     * showDeleted=true. Deleting absent mappings here could remove valid
     * LifeDesk tasks when the event is outside the current query window.
     */

    await admin.from("google_calendar_connections").update({
      sync_status: "connected",
      last_error: null,
      updated_at: new Date().toISOString(),
    }).eq("user_id", user.id);

    return json({
      ok: true,
      synced: true,
      created,
      updated,
      deleted,
      skipped,
      window: { timeMin, timeMax },
    });
  } catch (error) {
    console.error("Google Calendar pull error:", error);
    return json({
      error: error instanceof Error ? error.message : "Google Calendar pull failed.",
    }, 500);
  }
});
