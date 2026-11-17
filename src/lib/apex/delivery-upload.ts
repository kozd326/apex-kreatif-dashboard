import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { ApiError, check, context } from "./server";
import { customerAllowed } from "./customer-actions";
import { googleDriveToken } from "./sheets";
import { driveApi, verifyFolder } from "./drive-workflow.mjs";
import { syncCustomerDrive } from "./drive";
import { uploadType, uploadedBytes } from "./customer-workflow.mjs";
type Context = Awaited<ReturnType<typeof context>>;
const CHUNK = 8 * 1024 * 1024;
function sessionUrl(url: string) {
  const u = new URL(url);
  if (
    u.protocol !== "https:" ||
    u.hostname !== "www.googleapis.com" ||
    u.pathname !== "/upload/drive/v3/files"
  )
    throw new ApiError(502, "Google yükleme adresi doğrulanamadı.");
  return u.href;
}
async function locked(
  c: Context,
  id: string,
  fn: (row: any, patch: (value: any) => Promise<void>) => Promise<any>,
) {
  const lease = randomUUID();
  const { data: row, error } = await c.admin
    .from("apex_uploads")
    .update({
      lease_token: lease,
      lease_until: new Date(Date.now() + 90000).toISOString(),
    })
    .eq("id", id)
    .eq("created_by", c.user.id)
    .or(`lease_until.is.null,lease_until.lt.${new Date().toISOString()}`)
    .select("*")
    .maybeSingle();
  check(error);
  if (!row)
    throw new ApiError(
      409,
      "Yükleme sürüyor veya bu yükleme size ait değil. Biraz sonra yeniden deneyin.",
    );
  const patch = async (value: any) => {
    const { data, error } = await c.admin
      .from("apex_uploads")
      .update(value)
      .eq("id", id)
      .eq("lease_token", lease)
      .select("id")
      .maybeSingle();
    check(error);
    if (!data)
      throw new ApiError(409, "Yükleme denemesi değişti. Yeniden deneyin.");
  };
  try {
    await customerAllowed(c, row.customer_id);
    return await fn(row, patch);
  } finally {
    check(
      (
        await c.admin
          .from("apex_uploads")
          .update({ lease_token: null, lease_until: null })
          .eq("id", id)
          .eq("lease_token", lease)
      ).error,
    );
  }
}
function publicUpload(row: any) {
  return {
    id: row.id,
    uploaded: Number(row.uploaded),
    size: Number(row.size),
    ready: row.status === "ready",
    ...(row.status === "ready"
      ? {
          url: `https://drive.google.com/file/d/${row.file_id}/view`,
          name: row.name,
        }
      : {}),
  };
}
async function progress(
  row: any,
  access: string,
  patch: (value: any) => Promise<void>,
) {
  const r = await fetch(sessionUrl(row.session_url), {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${access}`,
      "Content-Range": `bytes */${row.size}`,
      "Content-Length": "0",
    },
    signal: AbortSignal.timeout(15000),
  });
  return recordProgress(r, row, access, patch);
}
async function recordProgress(
  r: Response,
  row: any,
  access: string,
  patch: (value: any) => Promise<void>,
) {
  if (r.status === 404 || r.status === 410)
    throw new ApiError(
      410,
      "Yükleme oturumunun süresi doldu. Dosyayı yeniden seçin.",
    );
  let uploaded: number;
  try {
    uploaded = uploadedBytes(r, Number(row.size));
  } catch (e) {
    throw new ApiError(502, (e as Error).message);
  }
  if (uploaded === Number(row.size)) {
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(row.file_id)}?fields=id,size,parents,trashed,appProperties`,
      {
        headers: { Authorization: `Bearer ${access}` },
        signal: AbortSignal.timeout(15000),
      },
    );
    if (!response.ok)
      throw new ApiError(
        502,
        "Yüklenen dosya henüz doğrulanamadı. Yeniden deneyin.",
      );
    const file = await response.json();
    if (
      file.trashed ||
      Number(file.size) !== Number(row.size) ||
      !file.parents?.includes(row.folder_id) ||
      file.appProperties?.apexUpload !== row.id
    )
      throw new ApiError(409, "Yüklenen dosya doğrulanamadı.");
    await patch({ uploaded, status: "ready", session_url: null });
    return publicUpload({ ...row, uploaded, status: "ready" });
  }
  await patch({ uploaded });
  return publicUpload({ ...row, uploaded });
}
export async function startUpload(c: Context, body: any) {
  const input = z
    .object({
      id: z.string().uuid(),
      customer_id: z.string().uuid(),
      name: z.string().max(200),
      size: z.number().int().positive(),
    })
    .strict()
    .parse(body);
  let mime: string;
  try {
    mime = uploadType(input.name, input.size);
  } catch (e) {
    throw new ApiError(400, (e as Error).message);
  }
  await customerAllowed(c, input.customer_id);
  const { data: old, error } = await c.admin
    .from("apex_uploads")
    .select("id,created_by,customer_id,name,size,status")
    .eq("id", input.id)
    .maybeSingle();
  check(error);
  if (
    old &&
    (old.created_by !== c.user.id ||
      old.customer_id !== input.customer_id ||
      old.name !== input.name ||
      Number(old.size) !== input.size)
  )
    throw new ApiError(409, "Yükleme bilgileri değişti; dosyayı tekrar seçin.");
  if (!old) {
    const { count, error: ce } = await c.admin
      .from("apex_uploads")
      .select("id", { count: "exact", head: true })
      .eq("created_by", c.user.id)
      .gte("created_at", new Date(Date.now() - 3600000).toISOString());
    check(ce);
    if ((count || 0) >= 50)
      throw new ApiError(
        429,
        "Çok sayıda yükleme başlatıldı; biraz sonra deneyin.",
      );
    const { data: folder, error: fe } = await c.admin
      .from("apex_drive_folders")
      .select("file_id,status,error")
      .eq("customer_id", input.customer_id)
      .maybeSingle();
    check(fe);
    if (!folder || folder.status !== "ready" || folder.error) {
      const result = await syncCustomerDrive(c.admin, input.customer_id);
      if (!result.ready)
        throw new ApiError(
          503,
          result.warning || "Teslim klasörü hazırlanıyor.",
        );
    }
    const { data: ready, error: re } = await c.admin
      .from("apex_drive_folders")
      .select("file_id")
      .eq("customer_id", input.customer_id)
      .single();
    check(re);
    if (!ready?.file_id)
      throw new ApiError(503, "Teslim klasörü henüz hazır değil.");
    check(
      (
        await c.admin
          .from("apex_uploads")
          .insert({
            ...input,
            mime,
            created_by: c.user.id,
            folder_id: ready.file_id,
          })
      ).error,
    );
  }
  return locked(c, input.id, async (row, patch) => {
    if (row.status === "ready") return publicUpload(row);
    const access = await googleDriveToken(c.admin);
    const drive = driveApi(access);
    verifyFolder(await drive.getFolder(row.folder_id), row.customer_id);
    if (row.session_url) return progress(row, access, patch);
    const fileId = row.file_id || (await drive.reserveId());
    if (!row.file_id) await patch({ file_id: fileId });
    const r = await fetch(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,size,parents,appProperties",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${access}`,
          "Content-Type": "application/json",
          "X-Upload-Content-Type": mime,
          "X-Upload-Content-Length": String(input.size),
        },
        body: JSON.stringify({
          id: fileId,
          name: input.name,
          mimeType: mime,
          parents: [row.folder_id],
          appProperties: { apexUpload: row.id, apexCustomer: row.customer_id },
        }),
        signal: AbortSignal.timeout(15000),
      },
    );
    if (!r.ok)
      throw new ApiError(
        502,
        "Drive yüklemesi başlatılamadı. Yeniden deneyin.",
      );
    const location = r.headers.get("location");
    if (!location) throw new ApiError(502, "Yükleme adresi alınamadı.");
    await patch({ session_url: sessionUrl(location), status: "uploading" });
    return publicUpload({ ...row, status: "uploading" });
  });
}
export async function chunkUpload(req: NextRequest, c: Context) {
  const id = z.string().uuid().parse(req.nextUrl.searchParams.get("id"));
  const offset = z.coerce
    .number()
    .int()
    .min(0)
    .parse(req.nextUrl.searchParams.get("offset"));
  if (Number(req.headers.get("content-length")) > CHUNK)
    throw new ApiError(413, "Dosya parçası çok büyük.");
  const reader = req.body?.getReader();
  if (!reader) throw new ApiError(400, "Dosya parçası eksik.");
  let length = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.length;
    if (length > CHUNK) {
      await reader.cancel();
      throw new ApiError(413, "Dosya parçası çok büyük.");
    }
    chunks.push(value);
  }
  if (!length) throw new ApiError(400, "Boş dosya parçası.");
  const bytes = Buffer.concat(chunks);
  const result = await locked(c, id, async (row, patch) => {
    if (row.status === "ready") return publicUpload(row);
    if (!row.session_url) throw new ApiError(409, "Önce yüklemeyi başlatın.");
    if (
      offset + length > Number(row.size) ||
      (offset + length < Number(row.size) && length % 262144 !== 0)
    )
      throw new ApiError(400, "Dosya parçası sınırları geçersiz.");
    const access = await googleDriveToken(c.admin);
    const state = await progress(row, access, patch);
    if (state.ready || state.uploaded !== offset) return state;
    const response = await fetch(sessionUrl(row.session_url), {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${access}`,
        "Content-Type": row.mime,
        "Content-Length": String(length),
        "Content-Range": `bytes ${offset}-${offset + length - 1}/${row.size}`,
      },
      body: bytes,
      signal: AbortSignal.timeout(30000),
    });
    return recordProgress(response, row, access, patch);
  });
  return NextResponse.json(result);
}
