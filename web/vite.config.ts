import { defineConfig } from "vite";
import path from "node:path";

export default defineConfig(({ isSsrBuild }) => ({
  root: ".",
  publicDir: "public",
  resolve: {
    alias: {
      "@repo": path.resolve(__dirname, ".."),
      // Prerender ne crta dijagrame (v. src/mermaid-stub.ts).
      ...(isSsrBuild ? { mermaid: path.resolve(__dirname, "src/mermaid-stub.ts") } : {}),
    },
  },
  build: isSsrBuild
    ? { outDir: "dist-ssr", emptyOutDir: true, target: "node20", sourcemap: false }
    : { outDir: "dist", emptyOutDir: true, target: "es2022", sourcemap: false },
  server: {
    fs: {
      // allow serving files from the parent repo (SOT.md, research/, sources/)
      allow: [path.resolve(__dirname, "..")],
    },
  },
}));
