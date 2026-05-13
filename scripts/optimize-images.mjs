import sharp from "sharp";
import { statSync } from "fs";

const tasks = [
  // PWA icons — re-encode PNGs at proper sizes
  { in: "public/icon-192x192.png", out: "public/icon-192x192.png", w: 192, h: 192, png: true },
  { in: "public/icon-512x512.png", out: "public/icon-512x512.png", w: 512, h: 512, png: true },
  { in: "public/icon-maskable-512x512.png", out: "public/icon-maskable-512x512.png", w: 512, h: 512, png: true },
  // Oversized OG jpegs
  { in: "public/og-competitors.jpg", out: "public/og-competitors.jpg", w: 1200, h: 630, jpg: 82 },
  { in: "public/og-for-schools.jpg", out: "public/og-for-schools.jpg", w: 1200, h: 630, jpg: 82 },
  // Hero — generate WebP variants alongside originals
  { in: "src/assets/hero-cockpit.jpg", out: "src/assets/hero-cockpit.webp", w: 1920, webp: 72 },
  { in: "src/assets/hero-cockpit-morning.jpg", out: "src/assets/hero-cockpit-morning.webp", w: 1920, webp: 72 },
  // Re-encode hero JPGs slightly tighter as fallback
  { in: "src/assets/hero-cockpit.jpg", out: "src/assets/hero-cockpit.jpg", w: 1920, jpg: 78 },
  { in: "src/assets/hero-cockpit-morning.jpg", out: "src/assets/hero-cockpit-morning.jpg", w: 1920, jpg: 78 },
];

for (const t of tasks) {
  const before = statSync(t.in).size;
  let img = sharp(t.in).resize({ width: t.w, height: t.h, fit: "cover", withoutEnlargement: true });
  if (t.png) img = img.png({ compressionLevel: 9, palette: true, quality: 80 });
  if (t.jpg) img = img.jpeg({ quality: t.jpg, mozjpeg: true });
  if (t.webp) img = img.webp({ quality: t.webp, effort: 6 });
  const buf = await img.toBuffer();
  await sharp(buf).toFile(t.out + ".tmp");
  const { renameSync } = await import("fs");
  renameSync(t.out + ".tmp", t.out);
  const after = statSync(t.out).size;
  console.log(`${t.in} -> ${t.out}: ${(before/1024).toFixed(0)}K -> ${(after/1024).toFixed(0)}K`);
}
