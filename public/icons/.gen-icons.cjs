// Generates two solid-green PNGs at 192x192 and 512x512.
// Run with: `node public/icons/.gen-icons.cjs`
// The output files are committed; the script lives next to them so the
// generation is reproducible without depending on the binary blobs.
//
// We use `sharp` (already on the global npm prefix in this env) for an
// ergonomic one-shot rasterise. If sharp is not available at regen time,
// fall back to `pngjs` (a pure-JS PNG encoder that has no native deps).
const fs = require("fs");
const path = require("path");

const OUT_DIR = __dirname;
const SIZES = [
  { name: "icon-192.png", size: 192 },
  { name: "icon-512.png", size: 512 },
];

async function generateSharp() {
  // Dynamically require so the script can still run without sharp.
  // eslint-disable-next-line global-require
  const sharp = require("sharp");

  for (const { name, size } of SIZES) {
    const buf = await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: { r: 22, g: 163, b: 74, alpha: 1 }, // tailwind leaf-600
      },
    })
      .png()
      .toBuffer();
    const out = path.join(OUT_DIR, name);
    fs.writeFileSync(out, buf);
    // eslint-disable-next-line no-console
    console.log(`wrote ${out} (${buf.length} bytes)`);
  }
}

async function generatePngjs() {
  // eslint-disable-next-line global-require
  const { PNG } = require("pngjs");
  for (const { name, size } of SIZES) {
    const png = new PNG({ width: size, height: size });
    for (let i = 0; i < png.data.length; i += 4) {
      png.data[i] = 22; // r
      png.data[i + 1] = 163; // g
      png.data[i + 2] = 74; // b
      png.data[i + 3] = 255; // a
    }
    const buf = PNG.sync.write(png);
    const out = path.join(OUT_DIR, name);
    fs.writeFileSync(out, buf);
    // eslint-disable-next-line no-console
    console.log(`wrote ${out} (${buf.length} bytes)`);
  }
}

(async () => {
  try {
    await generateSharp();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("sharp unavailable, falling back to pngjs:", err.message);
    await generatePngjs();
  }
})();
