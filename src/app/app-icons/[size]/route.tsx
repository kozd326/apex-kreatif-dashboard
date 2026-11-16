import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";
export const runtime = "nodejs";
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ size: string }> },
) {
  const { size: requested } = await params;
  if (!["180.png", "192.png", "512.png"].includes(requested))
    return new Response("Not found", { status: 404 });
  const size = parseInt(requested, 10);
  const logo = await readFile(
    path.join(process.cwd(), "public/logo-apex-transparent.png"),
  );
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#17171f",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <img
          alt=""
          src={`data:image/png;base64,${logo.toString("base64")}`}
          width={Math.round(size * 0.78)}
          height={Math.round(size * 0.78)}
          style={{ objectFit: "contain" }}
        />
      </div>
    ),
    {
      width: size,
      height: size,
      headers: { "Cache-Control": "public, max-age=86400" },
    },
  );
}
