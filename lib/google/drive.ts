import "server-only";
import { Readable } from "stream";
import sharp from "sharp";
import { getDriveClient } from "./auth";
import { getDriveFolderId } from "./config";

/**
 * Compresses a saree photo (max width 1200px, JPEG q80) and uploads it to
 * the configured Drive folder, then sets "anyone with the link can view"
 * so the stored link is directly clickable from the spreadsheet itself
 * (manual verification outside the app).
 *
 * The app itself does NOT load this link directly in <img> tags -- Google's
 * CDN applies hotlink protection to image-embed requests (it works when you
 * navigate to the link directly, but silently fails when embedded), so the
 * UI instead fetches photos through /api/photo/[fileId], which streams the
 * file server-side via this same authenticated Drive client.
 */
export async function uploadSareePhoto(
  fileBuffer: Buffer,
  filename: string
): Promise<string> {
  const folderId = getDriveFolderId();

  const compressed = await sharp(fileBuffer)
    .rotate()
    .resize({ width: 1200, withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toBuffer();

  const drive = getDriveClient();
  const created = await drive.files.create({
    requestBody: {
      name: filename,
      parents: [folderId],
    },
    media: {
      mimeType: "image/jpeg",
      body: Readable.from(compressed),
    },
    fields: "id",
  });

  const fileId = created.data.id;
  if (!fileId) {
    throw new Error("Drive upload did not return a file id");
  }

  await drive.permissions.create({
    fileId,
    requestBody: { role: "reader", type: "anyone" },
  });

  return `https://drive.google.com/file/d/${fileId}/view`;
}
