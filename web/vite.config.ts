import { defineConfig } from "vite";
import path from "node:path";

export default defineConfig({
  root: ".",
  publicDir: "public",
  resolve: {
    alias: {
      "@repo": path.resolve(__dirname, ".."),
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    target: "es2022",
    sourcemap: false,
  },
  server: {
    fs: {
      // allow serving files from the parent repo (SOT.md, research/, sources/)
      allow: [path.resolve(__dirname, "..")],
    },
  },
});
