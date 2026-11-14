import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  base: "./",
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  build: {
    rollupOptions: {
      input: {
        dashboard: path.resolve(__dirname, "dashboard-react.html"),
      },
    },
  },
  server: {
    port: 3000,
  },
});
