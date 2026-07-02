#!/usr/bin/env node
/**
 * Generate two solid-color JPEG fixtures used by `e2e/scan-and-add.spec.ts`.
 * Idempotent: skips files that already exist.
 *
 * These are tiny (~5KB) JPEGs — enough to drive the file-upload path
 * through `resizeImageToBlob`. Real leaf photos would be better but the
 * v1 e2e harness only needs something the canvas resize accepts.
 *
 * Run manually: `node scripts/generate-fixtures.cjs`
 */
const fs = require("fs");
const path = require("path");

const FIXTURE_DIR = path.join(__dirname, "..", "e2e", "fixtures");

// Minimal solid-color JPEG generators: a single MCU of pure color.
// We avoid any external dep so this runs on a fresh checkout.
function buildSolidJpeg(width, height, r, g, b) {
  // The smallest possible valid JPEG is ~125 bytes; we emit a tiny
  // hand-rolled single-color JPEG. The base64 below decodes to a 1x1
  // JPEG that `resizeImageToBlob` happily ingests (canvas normalizes
  // dimensions during decode).
  //
  // Layout: SOI(FFD8) + quantization + frame header + scan + EOI(FFD9).
  // Using a known-good 1x1 JPEG and letting the browser resize.
  const base64 =
    // 8x8 solid green JPEG (decodes to ~64x64 after browser resize)
    r === 60 && g === 140 && b === 70
      ? GREEN_JPEG_B64
      : // 8x8 solid tan/sand JPEG (cactus-ish)
        SAND_JPEG_B64;
  return Buffer.from(base64, "base64");
}

// Minimal valid 8x8 JPEGs. Generated once with `sharp` during slice #10
// dev and base64-encoded for repo portability. The browser canvas
// normalizes the dimensions during `resizeImageToBlob`.
const GREEN_JPEG_B64 =
  "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQ" +
  "FxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMK" +
  "ChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgo" +
  "KCgoKCj/wAARCAEAAQADASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAU" +
  "EAEAAAAAAAAAAAAAAAAAAAAJ/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEA" +
  "AAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwBVAAH/2Q==";

const SAND_JPEG_B64 =
  "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQ" +
  "FxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMK" +
  "ChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgo" +
  "KCgoKCj/wAARCAEAAQADASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAU" +
  "EAEAAAAAAAAAAAAAAAAAAAAJ/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEA" +
  "AAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdAAH/2Q==";

function ensure(file, r, g, b) {
  if (fs.existsSync(file)) {
    console.log(`[fixtures] exists: ${path.basename(file)}`);
    return;
  }
  const buf = buildSolidJpeg(8, 8, r, g, b);
  fs.writeFileSync(file, buf);
  console.log(
    `[fixtures] wrote: ${path.basename(file)} (${buf.length} bytes)`,
  );
}

function main() {
  if (!fs.existsSync(FIXTURE_DIR)) fs.mkdirSync(FIXTURE_DIR, { recursive: true });
  ensure(path.join(FIXTURE_DIR, "pothos-small.jpg"), 60, 140, 70);
  ensure(path.join(FIXTURE_DIR, "cactus-small.jpg"), 200, 170, 110);
}

main();