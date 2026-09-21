/**
 * Shrinks camera photos in the browser before they are uploaded.
 *
 * A Vercel function request body cannot exceed 4.5 MB, so uploads are capped
 * at 3 MB - but phone cameras routinely produce 3-6 MB JPEGs, so an agent
 * photographing an Aadhaar card hits the limit on a perfectly ordinary file.
 * Resizing here turns a 5 MB photo into a few hundred KB, uploads far faster
 * on a field connection, and keeps the documents table smaller.
 *
 * Anything that cannot be decoded as an image - PDFs, or HEIC on a browser
 * that will not read it - passes through untouched and is left to the
 * server-side cap, which still has to hold: this runs on the client and is
 * therefore a convenience, never a control.
 */

export const MAX_UPLOAD_BYTES = 3 * 1024 * 1024;

/** Long edge in pixels. Keeps an Aadhaar number legible, well under a 12MP photo. */
const MAX_EDGE = 1600;

/** Tried in order until the result fits; the last is used regardless. */
const QUALITY_STEPS = [0.8, 0.6, 0.45];

/** Factor that fits width x height inside a maxEdge box. Never enlarges. */
export function fitScale(width: number, height: number, maxEdge = MAX_EDGE): number {
  const longest = Math.max(width, height);
  if (longest <= 0) return 1;
  return longest <= maxEdge ? 1 : maxEdge / longest;
}

function encode(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
}

/** Returns a smaller JPEG, or null when the original should be sent as-is. */
export async function downscaleImage(file: File): Promise<File | null> {
  if (!file.type.startsWith("image/")) return null;

  let bitmap: ImageBitmap;
  try {
    // "from-image" applies EXIF rotation. Without it, portrait photos from a
    // phone arrive on their side, because the orientation tag is dropped when
    // the pixels are redrawn.
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return null;
  }

  try {
    const scale = fitScale(bitmap.width, bitmap.height);
    if (scale === 1 && file.size <= MAX_UPLOAD_BYTES) return null;

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);

    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    // A transparent PNG flattens to black on a JPEG without this.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    let blob: Blob | null = null;
    for (const quality of QUALITY_STEPS) {
      blob = await encode(canvas, quality);
      if (!blob || blob.size <= MAX_UPLOAD_BYTES) break;
    }

    // If re-encoding gained nothing, keep the original rather than sending a
    // needlessly re-compressed copy.
    if (!blob || blob.size >= file.size) return null;

    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", {
      type: "image/jpeg",
      lastModified: file.lastModified,
    });
  } finally {
    bitmap.close();
  }
}
