import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/**
 * Локально и на своём домене: base: "/"
 * GitHub Pages (репозиторий https://user.github.io/REPO/): base: "/REPO/"
 */
export default defineConfig({
  plugins: [react()],
  base: "/",
  server: {
    proxy: {
      "/api": { target: "http://localhost:3001", changeOrigin: true },
    },
  },
});
