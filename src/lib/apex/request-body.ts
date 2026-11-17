import { NextRequest } from "next/server";
import { ApiError } from "./server";
export async function boundedBody(req: NextRequest, max: number) {
  if (Number(req.headers.get("content-length")) > max)
    throw new ApiError(413, "Dosya boyutu sınırı aşıldı.");
  const reader = req.body?.getReader();
  if (!reader) throw new ApiError(400, "Dosya içeriği eksik.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > max) {
      await reader.cancel();
      throw new ApiError(413, "Dosya boyutu sınırı aşıldı.");
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}
export function attachmentSignature(bytes: Uint8Array, mime: string) {
  const b = Buffer.from(bytes);
  return mime === "application/pdf"
    ? b.subarray(0, 5).toString() === "%PDF-"
    : mime === "image/jpeg"
      ? b[0] === 255 && b[1] === 216 && b[2] === 255
      : mime === "image/png"
        ? b
            .subarray(0, 8)
            .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
        : mime === "image/webp"
          ? b.subarray(0, 4).toString() === "RIFF" &&
            b.subarray(8, 12).toString() === "WEBP"
          : false;
}
