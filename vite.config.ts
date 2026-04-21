import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { writeFileSync, mkdirSync } from "node:fs";
import { componentTagger } from "lovable-tagger";
import { PUBLIC_ROUTES, buildSitemapXml } from "./scripts/sitemap-routes";

/**
 * Generates public/sitemap.xml from PUBLIC_ROUTES at build start so the
 * deployed sitemap always matches the actual route list.
 */
function sitemapPlugin(): Plugin {
  return {
    name: "simpilot-sitemap",
    apply: "build",
    buildStart() {
      const outPath = path.resolve(__dirname, "public/sitemap.xml");
      mkdirSync(path.dirname(outPath), { recursive: true });
      writeFileSync(outPath, buildSitemapXml(PUBLIC_ROUTES), "utf8");
      this.info?.(`sitemap.xml generated with ${PUBLIC_ROUTES.length} routes`);
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), sitemapPlugin(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"],
  },
  optimizeDeps: {
    include: ["react-leaflet", "@react-leaflet/core", "leaflet"],
  },
}));
