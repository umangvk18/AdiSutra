// Client-safe (no "server-only"): converts a stored Drive "shareable link"
// (https://drive.google.com/file/d/<fileId>/view) into our own proxy path,
// which the UI uses instead of the Drive link directly -- see lib/google/drive.ts
// for why the raw Drive link doesn't work reliably in <img> tags.
export function photoProxySrc(photoUrl: string): string {
  const match = photoUrl.match(/\/d\/([^/]+)/);
  const fileId = match?.[1];
  return fileId ? `/api/photo/${fileId}` : photoUrl;
}
