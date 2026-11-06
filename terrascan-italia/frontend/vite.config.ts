/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// In sviluppo le chiamate a /api vengono inoltrate al backend FastAPI.
export default defineConfig({
  plugins: [react()],
  // MapLibre GL da solo pesa ~1 MB: il limite evita un avviso non significativo.
  build: { chunkSizeWarningLimit: 1600 },
  // Il worker di MapLibre è un modulo ES.
  worker: { format: "es" },
  server: {
    port: 5173,
    proxy: {
      "/api": "http://127.0.0.1:8000",
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    include: ["src/**/*.test.{ts,tsx}"],
    setupFiles: ["./src/setupTests.ts"],
  },
});
