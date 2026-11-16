import { NextRequest, NextResponse } from "next/server";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { ApiError, check, context, allRows } from "./server";
import { calendarEntries, calendarEventId } from "./calendar-sync.mjs";
type Context = Awaited<ReturnType<typeof context>>;
const redirect = (req: NextRequest) =>
  `${process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin}/api/apex/google-callback`;
export async function googleAction(
  req: NextRequest,
  c: Context,
  action: string,
) {
  if (c.member.role !== "partner")
    throw new ApiError(403, "Takvim bağlantısını ortaklar yönetebilir.");
  const client_id = process.env.GOOGLE_CLIENT_ID,
    client_secret = process.env.GOOGLE_CLIENT_SECRET;
  if (!client_id || !client_secret)
    throw new ApiError(
      503,
      "Google Takvim bağlantısı henüz kurulmadı. Panel takvimi kullanılabilir.",
    );
  if (action === "google-connect") {
    const state = randomBytes(32).toString("hex");
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    Object.entries({
      client_id,
      redirect_uri: redirect(req),
      response_type: "code",
      scope: "https://www.googleapis.com/auth/calendar.app.created",
      access_type: "offline",
      prompt: "consent",
      state,
    }).forEach(([k, v]) => url.searchParams.set(k, v));
    const res = NextResponse.redirect(url);
    res.cookies.set("apex_google_state", `${c.user.id}:${state}`, {
      httpOnly: true,
      secure: req.nextUrl.protocol === "https:",
      sameSite: "lax",
      maxAge: 600,
      path: "/api/apex",
    });
    return res;
  }
  if (action === "google-callback") {
    const expected = req.cookies.get("apex_google_state")?.value || "";
    const actual = `${c.user.id}:${req.nextUrl.searchParams.get("state") || ""}`;
    if (
      !expected ||
      expected.length !== actual.length ||
      !timingSafeEqual(Buffer.from(expected), Buffer.from(actual))
    )
      throw new ApiError(
        400,
        "Bağlantı süresi doldu. Ayarlardan yeniden başlayın.",
      );
    const code = req.nextUrl.searchParams.get("code");
    if (!code) throw new ApiError(400, "Google bağlantısı tamamlanmadı.");
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      body: new URLSearchParams({
        code,
        client_id,
        client_secret,
        redirect_uri: redirect(req),
        grant_type: "authorization_code",
      }),
      signal: AbortSignal.timeout(15000),
    });
    const token = await response.json();
    if (!response.ok || !token.refresh_token)
      throw new ApiError(502, "Google yetkisi alınamadı. Tekrar bağlayın.");
    const { data: existing } = await c.admin
      .from("apex_settings")
      .select("value")
      .eq("key", "google")
      .maybeSingle();
    let calendar_id = existing?.value?.calendar_id;
    if (!calendar_id) {
      const calendar = await fetch(
        "https://www.googleapis.com/calendar/v3/calendars",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            summary: "Apex • Ortak Takvim",
            timeZone: "Europe/Istanbul",
          }),
          signal: AbortSignal.timeout(15000),
        },
      );
      const result = await calendar.json();
      if (!calendar.ok) throw new ApiError(502, "Ortak takvim oluşturulamadı.");
      calendar_id = result.id;
    }
    check(
      (
        await c.admin.from("apex_settings").upsert({
          key: "google",
          value: {
            refresh_token: token.refresh_token,
            calendar_id,
            connected_by: c.user.id,
          },
        })
      ).error,
    );
    const res = NextResponse.redirect(
      new URL("/settings?calendar=connected", req.url),
    );
    res.cookies.set("apex_google_state", "", { path: "/api/apex", maxAge: 0 });
    return res;
  }
  return NextResponse.json(await syncGoogle(c.admin));
}
export async function syncGoogle(admin: any) {
  const { data: setting, error } = await admin
    .from("apex_settings")
    .select("value")
    .eq("key", "google")
    .maybeSingle();
  check(error);
  if (!setting)
    throw new ApiError(400, "Önce Google Takvim hesabını bağlayın.");
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID || "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
      refresh_token: setting.value.refresh_token,
      grant_type: "refresh_token",
    }),
    signal: AbortSignal.timeout(15000),
  });
  const token = await tokenResponse.json();
  if (!tokenResponse.ok)
    throw new ApiError(
      502,
      "Google bağlantısını yenileyin. Paneldeki kayıtlarınız güvende.",
    );
  const headers = {
    Authorization: `Bearer ${token.access_token}`,
    "Content-Type": "application/json",
  };
  const base = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(setting.value.calendar_id)}/events`;
  const [tasks, events, projects, deliverables, jobRows] = await Promise.all(
    [
      "apex_tasks",
      "apex_events",
      "apex_projects",
      "apex_deliverables",
      "apex_calendar_jobs",
    ].map((table) => allRows(admin, table)),
  );
  const wanted = calendarEntries({ tasks, events, projects, deliverables });
  let synced = 0,
    failed = 0;
  const existing = new Map<string, any>(jobRows.map((j: any) => [j.key, j]));
  for (const item of wanted) {
    const fingerprint = createHash("sha256")
      .update(JSON.stringify(item.body))
      .digest("hex");
    const old = existing.get(item.key);
    existing.delete(item.key);
    if (old?.fingerprint === fingerprint && old.status === "synced") continue;
    let generation =
      (old?.generation || 0) + (old?.status === "deleted" ? 1 : 0);
    let id = calendarEventId(item.key, generation);
    try {
      let response = await fetch(`${base}/${id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify(item.body),
        signal: AbortSignal.timeout(10000),
      });
      if (response.status === 410) {
        generation++;
        id = calendarEventId(item.key, generation);
      }
      if (response.status === 404 || response.status === 410) {
        response = await fetch(base, {
          method: "POST",
          headers,
          body: JSON.stringify({ id, ...item.body }),
          signal: AbortSignal.timeout(10000),
        });
        if (response.status === 409)
          response = await fetch(`${base}/${id}`, {
            method: "PUT",
            headers,
            body: JSON.stringify(item.body),
            signal: AbortSignal.timeout(10000),
          });
      }
      if (!response.ok) throw new Error("sync failed");
      check(
        (
          await admin.from("apex_calendar_jobs").upsert({
            key: item.key,
            google_id: id,
            generation,
            fingerprint,
            status: "synced",
            error: null,
            synced_at: new Date().toISOString(),
          })
        ).error,
      );
      synced++;
    } catch {
      failed++;
      check(
        (
          await admin.from("apex_calendar_jobs").upsert({
            key: item.key,
            google_id: id,
            generation,
            status: "failed",
            error: "Google’a aktarılamadı. Yeniden eşitleyin.",
          })
        ).error,
      );
    }
  }
  for (const [key, old] of Array.from(existing)) {
    if (old.status === "deleted") continue;
    try {
      const r = await fetch(`${base}/${old.google_id}`, {
        method: "DELETE",
        headers,
        signal: AbortSignal.timeout(10000),
      });
      if (!r.ok && ![404, 410].includes(r.status)) throw new Error();
      check(
        (
          await admin
            .from("apex_calendar_jobs")
            .update({ status: "deleted", synced_at: new Date().toISOString() })
            .eq("key", key)
        ).error,
      );
    } catch {
      failed++;
      check(
        (
          await admin
            .from("apex_calendar_jobs")
            .update({
              status: "failed",
              error: "İptal Google’a aktarılamadı; yeniden denenecek.",
            })
            .eq("key", key)
        ).error,
      );
    }
  }
  return { synced, failed };
}
