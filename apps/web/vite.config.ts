/// <reference types="vitest/config" />
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  // Local dev and `vite preview` forward /api to the FastAPI app, the way the Docker image does.
  const target = loadEnv(mode, ".", "").DEV_API_TARGET || "http://localhost:8000";
  const proxy = { "/api": { target, rewrite: (path: string) => path.replace(/^\/api/, "") } };
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
