import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { readFileSync } from "node:fs";

const packageJson = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8")) as { version?: string };

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version ?? "0.0.0"),
    __GIT_COMMIT_SHA__: JSON.stringify(process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.GIT_COMMIT_SHA ?? "local"),
    __GIT_COMMIT_REF__: JSON.stringify(process.env.VERCEL_GIT_COMMIT_REF ?? process.env.GIT_BRANCH ?? "local"),
    __VERCEL_ENV__: JSON.stringify(process.env.VERCEL_ENV ?? "local"),
    __BUILD_DATE__: JSON.stringify(process.env.BUILD_DATE ?? new Date().toISOString())
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          charts: ["recharts"],
          icons: ["lucide-react"]
        }
      }
    }
  },
  server: {
    proxy: {
      "/api": "http://127.0.0.1:8000"
    }
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./vitest.setup.ts",
    css: true
  }
});
