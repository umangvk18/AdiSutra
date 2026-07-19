// Client-safe: resizes/re-encodes a photo to JPEG in the browser before
// upload. This matters specifically for iPhones, which often capture HEIC
// photos -- the server's image library (sharp) frequently can't decode HEIC
// on serverless platforms, but the browser's own decoder can (it's what
// renders the photo on screen at all), so converting here sidesteps that
// entirely. It also shrinks large camera photos before they hit the
// platform's request-size limit.
export async function compressImageFile(
  file: File,
  maxDimension = 1600,
  quality = 0.85
): Promise<File> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });

  let { width, height } = bitmap;
  if (width > maxDimension || height > maxDimension) {
    const scale = maxDimension / Math.max(width, height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not supported on this browser");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob: Blob | null = await new Promise((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", quality)
  );
  if (!blob) throw new Error("Failed to process the photo");

  const newName = file.name.replace(/\.[^.]+$/, "") + ".jpg";
  return new File([blob], newName, { type: "image/jpeg" });
}
