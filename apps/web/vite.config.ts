/// <reference types="vitest/config" />
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  // `vite` (dev) and `vite preview` forward /api to the API, dropping the /api prefix, the same
  // way the nginx image does in production.
  const target = loadEnv(mode, ".", "").DEV_API_PROXY || "http://localhost:8000";
  const proxy = {
    "/api": { target, changeOrigin: true, rewrite: (path: string) => path.replace(/^\/api/, "") },
  };
  return {
    plugins: [react()],
    server: { proxy },
    preview: { proxy },
    test: {
      environment: "jsdom",
      globals: true,
      setupFiles: ["./src/test/setup.ts"],
      css: false,
    },
  };
});
