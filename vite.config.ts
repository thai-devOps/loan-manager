import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { loanApiDevPlugin } from "./plugins/api-dev-plugin.ts";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

function isLocalhostHost(host: string): boolean {
  const h = host.toLowerCase();
  return (
    h === "localhost" ||
    h === "127.0.0.1" ||
    h === "0.0.0.0" ||
    h === "::1" ||
    h.endsWith(".localhost")
  );
}

/** Mirror of scripts/site-url.mjs — keep vite.config free of .mjs imports for tsc. */
function resolveSiteUrl(env: Record<string, string | undefined>): string {
  const candidates = [
    env.VITE_SITE_URL,
    env.VERCEL_PROJECT_PRODUCTION_URL,
    env.VERCEL_URL,
  ];
  for (const raw of candidates) {
    const trimmed = (raw ?? "").trim().replace(/\/+$/, "");
    if (!trimmed) continue;
    try {
      const url = new URL(
        trimmed.includes("://") ? trimmed : `https://${trimmed}`,
      );
      if (url.protocol !== "http:" && url.protocol !== "https:") continue;
      if (isLocalhostHost(url.hostname)) continue;
      return `https://${url.host}`;
    } catch {
      continue;
    }
  }
  return "";
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, rootDir, "");
  const siteUrl = resolveSiteUrl({
    VITE_SITE_URL: env.VITE_SITE_URL || process.env.VITE_SITE_URL,
    VERCEL_PROJECT_PRODUCTION_URL: process.env.VERCEL_PROJECT_PRODUCTION_URL,
    VERCEL_URL: process.env.VERCEL_URL,
  });

  if (siteUrl) {
    process.env.VITE_SITE_URL = siteUrl;
  }

  return {
    plugins: [react(), tailwindcss(), loanApiDevPlugin()],
    resolve: {
      alias: {
        "@": path.resolve(rootDir, "./src"),
        "@shared": path.resolve(rootDir, "./shared"),
      },
    },
    server: {
      // API handled by loanApiDevPlugin in the same Vite process
    },
    define: siteUrl
      ? {
          "import.meta.env.VITE_SITE_URL": JSON.stringify(siteUrl),
        }
      : undefined,
  };
});
