import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  root: import.meta.dirname,
  plugins: [react()],
  server: { proxy: { "/api": "http://localhost:3000" } },
  build: { outDir: "../dist", emptyOutDir: true },
});
