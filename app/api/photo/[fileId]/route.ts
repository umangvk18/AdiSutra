import { Readable } from "stream";
import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/session";
import { getDriveClient } from "@/lib/google/auth";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ fileId: string }> }
) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { fileId } = await params;
  const drive = getDriveClient();

  const fileRes = await drive.files.get(
    { fileId, alt: "media" },
    { responseType: "stream" }
  );

  const webStream = Readable.toWeb(
    fileRes.data as unknown as Readable
  ) as ReadableStream<Uint8Array>;

  const contentType =
    (fileRes.headers as Record<string, string> | undefined)?.["content-type"] ??
    "image/jpeg";

  return new Response(webStream, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "private, max-age=86400",
    },
  });
}
