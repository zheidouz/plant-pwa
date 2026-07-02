/**
 * Client-side image resize utility. Targets a ≤1MB JPEG so the Firebase
 * Function proxy and Pl@ntNet both stay happy (Pl@ntNet rejects >5MB, and a
 * 1MB ceiling keeps the function invocation under the 32MB HTTP body limit
 * with comfortable margin for the multipart overhead).
 *
 * Strategy: downscale dimensions to a max of 1280px on the long edge, then
 * binary-search the JPEG quality parameter between 0.5 and 0.95 until we
 * land at or under the byte budget.
 */

const MAX_DIMENSION = 1280;
const MIN_QUALITY = 0.5;
const MAX_QUALITY = 0.95;

export interface ResizeOptions {
  /** Default 1_000_000. */
  maxBytes?: number;
  /** Default 1280. */
  maxDimension?: number;
  /** Default "image/jpeg". */
  mimeType?: string;
}

export async function resizeImageToBlob(
  blob: Blob,
  options: ResizeOptions = {},
): Promise<Blob> {
  const maxBytes = options.maxBytes ?? 1_000_000;
  const maxDim = options.maxDimension ?? MAX_DIMENSION;
  const mimeType = options.mimeType ?? "image/jpeg";

  const bitmap = await blobToImageBitmap(blob);

  // Step 1: downscale to the max-dimension bounding box (preserving aspect).
  const { width, height } = fitWithin(bitmap.width, bitmap.height, maxDim);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close?.();
    throw new Error("canvas_unavailable");
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();

  // Step 2: binary-search JPEG quality between MIN_QUALITY and MAX_QUALITY
  // until we hit ≤ maxBytes. Failure to reach the ceiling just returns the
  // lowest-quality blob — better something than nothing.
  let lo = MIN_QUALITY;
  let hi = MAX_QUALITY;
  let best: Blob | null = null;
  for (let i = 0; i < 6; i++) {
    const q = (lo + hi) / 2;
    const candidate = await canvasToBlob(canvas, mimeType, q);
    if (candidate.size <= maxBytes) {
      best = candidate;
      // Try higher quality (the search space narrows toward MAX_QUALITY).
      lo = q;
    } else {
      // Still too big — push quality down.
      hi = q;
    }
    if (candidate.size <= maxBytes && q === MAX_QUALITY) break;
  }
  if (best) return best;
  // Worst case: emit the lowest-quality blob we tried (which is the last
  // `candidate` returned to the loop). We just recompute it cleanly:
  return canvasToBlob(canvas, mimeType, MIN_QUALITY);
}

function blobToImageBitmap(blob: Blob): Promise<ImageBitmap> {
  if (typeof createImageBitmap === "function") {
    return createImageBitmap(blob);
  }
  // Older fallback: load via <img>. Used by jsdom in tests too.
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img as unknown as ImageBitmap);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, mimeType: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("toBlob_failed"))),
      mimeType,
      quality,
    );
  });
}

/** Returns the largest (w,h) that fits inside `maxDim` on either side. */
export function fitWithin(w: number, h: number, maxDim: number): { width: number; height: number } {
  if (w <= maxDim && h <= maxDim) return { width: w, height: h };
  const scale = maxDim / Math.max(w, h);
  return { width: Math.round(w * scale), height: Math.round(h * scale) };
}
