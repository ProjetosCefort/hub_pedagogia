import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import fs from "fs/promises";

const appBase = process.env.VITE_APP_BASE_PATH || "/";

function copyApacheHtaccess() {
  return {
    name: "copy-apache-htaccess",
    apply: "build" as const,
    async closeBundle() {
      const src = path.resolve(__dirname, "public/.htaccess");
      const dest = path.resolve(__dirname, "dist/.htaccess");
      try {
        await fs.copyFile(src, dest);
      } catch (error) {
        console.warn("Could not copy public/.htaccess to dist/.htaccess:", error);
      }
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  base: appBase,
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: true,
      },
    },
  },
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), copyApacheHtaccess()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
