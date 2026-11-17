import { NextRequest, NextResponse } from "next/server";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { ApiError, allRows, check, context } from "./server";
import { monthNow } from "./domain";
import { financeSheets, sheetRequests } from "./finance-sheet.mjs";

type Context = Awaited<ReturnType<typeof context>>;
const origin = (req: NextRequest) =>
  process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
const callback = (req: NextRequest) =>
  new URL("/api/apex/sheets-callback", origin(req)).toString();
const scope = "https://www.googleapis.com/auth/drive.file";
const cookie = "apex_sheets_state";

async function google(
  url: string,
  accessToken: string,
  init: RequestInit = {},
) {
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
    signal: AbortSignal.timeout(25000),
  });
  if (!response.ok)
    throw new ApiError(
      502,
      "Ortak tabloya erişilemedi. Google bağlantısını ve tablo izinlerini kontrol edip yeniden deneyin.",
    );
  return response.json();
}
async function setting(admin: Context["admin"], key: string) {
  const { data, error } = await admin
    .from("apex_settings")
    .select("value")
    .eq("key", key)
    .maybeSingle();
  check(error);
  return data?.value;
}
async function save(admin: Context["admin"], key: string, value: any) {
  check((await admin.from("apex_settings").upsert({ key, value })).error);
}
async function token(body: Record<string, string>) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID || "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
      ...body,
    }),
    signal: AbortSignal.timeout(15000),
  });
  const result = await response.json();
  if (!response.ok || !result.access_token)
    throw new ApiError(
      502,
      "Google tablo bağlantısını yenileyin. Panel kayıtları korunuyor.",
    );
  return result;
}

export async function sheetsAction(
  req: NextRequest,
  c: Context,
  action: string,
) {
  if (c.member.role !== "partner")
    throw new ApiError(
      403,
      "Ortak tablo bağlantısını yalnızca ortaklar yönetebilir.",
    );
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET)
    throw new ApiError(503, "Google bağlantı ayarları eksik.");
  if (action === "sheets-connect") {
    const state = randomBytes(32).toString("hex");
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    Object.entries({
      client_id: process.env.GOOGLE_CLIENT_ID,
      redirect_uri: callback(req),
      response_type: "code",
      scope,
      access_type: "offline",
      prompt: "consent",
      state,
    }).forEach(([k, v]) => url.searchParams.set(k, v));
    const res = NextResponse.redirect(url);
    res.cookies.set(cookie, `${c.user.id}:${state}`, {
      httpOnly: true,
      secure: new URL(origin(req)).protocol === "https:",
      sameSite: "lax",
      path: "/api/apex",
      maxAge: 600,
    });
    return res;
  }
  if (action === "sheets-callback") {
    const expected = Buffer.from(req.cookies.get(cookie)?.value || "");
    const actual = Buffer.from(
      `${c.user.id}:${req.nextUrl.searchParams.get("state") || ""}`,
    );
    if (
      !expected.length ||
      expected.length !== actual.length ||
      !timingSafeEqual(expected, actual)
    )
      throw new ApiError(
        400,
        "Bağlantı süresi doldu. Ayarlardan tekrar başlayın.",
      );
    const code = req.nextUrl.searchParams.get("code");
    if (!code) throw new ApiError(400, "Google tablo izni verilmedi.");
    const granted = await token({
      code,
      redirect_uri: callback(req),
      grant_type: "authorization_code",
    });
    if (!granted.refresh_token || !granted.scope?.split(" ").includes(scope))
      throw new ApiError(
        400,
        "Otomatik aktarım için Google dosya iznini verin.",
      );
    const existing = await setting(c.admin, "sheets");
    // Check access before replacing credentials: another account must not take over the report.
    if (existing?.spreadsheet_id)
      await google(
        `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(existing.spreadsheet_id)}?fields=spreadsheetId`,
        granted.access_token,
      );
    await save(c.admin, "sheets", {
      ...existing,
      refresh_token: granted.refresh_token,
      connected_by: c.user.id,
    });
    const res = NextResponse.redirect(
      new URL("/settings?sheets=connected", origin(req)),
    );
    res.cookies.set(cookie, "", { path: "/api/apex", maxAge: 0 });
    return res;
  }
  const result = await syncSheets(c.admin, true);
  if (result.connected === false)
    throw new ApiError(400, "Önce Google tablo bağlantısını kurun.");
  return NextResponse.json(result);
}

let inFlight: Promise<any> | null = null;
export function syncSheets(
  admin: Context["admin"],
  force = false,
): Promise<any> {
  if (inFlight) return inFlight;
  inFlight = sync(admin, force).finally(() => {
    inFlight = null;
  });
  return inFlight;
}
async function sync(admin: Context["admin"], force: boolean) {
  const connection = await setting(admin, "sheets");
  if (!connection?.refresh_token) return { connected: false };
  try {
    const [invoices, cash, entities, customers] = await Promise.all(
      ["apex_invoices", "apex_cash", "apex_entities", "apex_customers"].map(
        (table) => allRows(admin, table),
      ),
    );
    const sheets = financeSheets(
      { invoices, cash, entities, customers },
      monthNow(),
    );
    const fingerprint = createHash("sha256")
      .update(JSON.stringify(sheets))
      .digest("hex");
    const status = await setting(admin, "sheets_sync");
    if (
      !force &&
      connection.spreadsheet_id &&
      status?.fingerprint === fingerprint &&
      !status?.error
    )
      return { unchanged: true };
    const access = await token({
      refresh_token: connection.refresh_token,
      grant_type: "refresh_token",
    });
    let id = connection.spreadsheet_id;
    if (!id) {
      // Recover a file if a previous creation succeeded but saving its id failed.
      const q =
        "trashed = false and mimeType = 'application/vnd.google-apps.spreadsheet' and appProperties has { key='apexReport' and value='finance-v1' }";
      const found = await google(
        `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id)&pageSize=2`,
        access.access_token,
      );
      if (found.files?.length > 1)
        throw new ApiError(
          409,
          "Birden fazla Apex finans tablosu bulundu; bağlantıyı kontrol edin.",
        );
      if (found.files?.length) id = found.files[0].id;
      else {
        const file = await google(
          "https://www.googleapis.com/drive/v3/files?fields=id",
          access.access_token,
          {
            method: "POST",
            body: JSON.stringify({
              name: "Apex • Ortak Finans",
              mimeType: "application/vnd.google-apps.spreadsheet",
              appProperties: { apexReport: "finance-v1" },
            }),
          },
        );
        id = file.id;
      }
      if (!id) throw new ApiError(502, "Ortak tablo oluşturulamadı.");
      await save(admin, "sheets", { ...connection, spreadsheet_id: id });
    }
    const base = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(id)}`;
    const meta = await google(
      `${base}?fields=sheets.properties`,
      access.access_token,
    );
    const existing = meta.sheets.map((s: any) => s.properties);
    const requests: any[] = [];
    // Dedicated report owns only its three named sheets. Other user-created tabs are untouched.
    const mapped = sheets.map((s: any) => {
      const match = existing.find((p: any) => p.title === s.title);
      if (match) return { ...s, id: match.sheetId };
      const maxId = Math.max(100, ...existing.map((p: any) => p.sheetId));
      const sheetId = maxId + s.id + 1;
      requests.push({ addSheet: { properties: { sheetId, title: s.title } } });
      return { ...s, id: sheetId };
    });
    requests.push({
      updateSpreadsheetProperties: {
        properties: { locale: "tr_TR", timeZone: "Europe/Istanbul" },
        fields: "locale,timeZone",
      },
    });
    requests.push(
      ...sheetRequests(
        mapped,
        Object.fromEntries(
          existing.map((p: any) => [p.sheetId, p.gridProperties.rowCount]),
        ),
      ),
    );
    // A Drive-created spreadsheet may start with a blank default tab; hide it, never delete it.
    for (const p of existing)
      if (
        !mapped.some((s: any) => s.id === p.sheetId) &&
        ["Sheet1", "Sayfa1"].includes(p.title)
      )
        requests.push({
          updateSheetProperties: {
            properties: { sheetId: p.sheetId, hidden: true },
            fields: "hidden",
          },
        });
    await google(`${base}:batchUpdate`, access.access_token, {
      method: "POST",
      body: JSON.stringify({ requests }),
    });
    const result = {
      spreadsheet_id: id,
      fingerprint,
      last_synced_at: new Date().toISOString(),
      rows: sheets.reduce((n: number, s: any) => n + s.rows.length, 0),
      error: null,
    };
    await save(admin, "sheets_sync", result);
    return {
      synced: result.rows,
      url: `https://docs.google.com/spreadsheets/d/${id}/edit`,
    };
  } catch (e) {
    const previous = await setting(admin, "sheets_sync");
    await save(admin, "sheets_sync", {
      ...previous,
      error:
        e instanceof ApiError
          ? e.message
          : "Aktarım tamamlanamadı. Yeniden deneyin.",
      last_attempt_at: new Date().toISOString(),
    });
    throw e;
  }
}

// The existing drive.file consent is limited to files created/opened by Apex.
export async function googleDriveToken(
  admin: Context["admin"],
): Promise<string> {
  const connection = await setting(admin, "sheets");
  if (!connection?.refresh_token)
    throw new ApiError(
      503,
      "Drive bağlantısı kurulmalı. Ayarlar’dan Google tablo bağlantısını yenileyin.",
    );
  const access = await token({
    refresh_token: connection.refresh_token,
    grant_type: "refresh_token",
  });
  return access.access_token;
}
