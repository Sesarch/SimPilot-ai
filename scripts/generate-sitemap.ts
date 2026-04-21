/**
 * Standalone sitemap generator. Run via:
 *   npx tsx scripts/generate-sitemap.ts
 * Also auto-invoked by the Vite plugin in vite.config.ts on every build.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { PUBLIC_ROUTES, buildSitemapXml } from "./sitemap-routes";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = resolve(__dirname, "../public/sitemap.xml");

const xml = buildSitemapXml(PUBLIC_ROUTES);
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, xml, "utf8");
console.log(`✓ sitemap.xml written (${PUBLIC_ROUTES.length} routes) → ${outPath}`);
