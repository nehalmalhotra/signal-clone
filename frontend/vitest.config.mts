// Needed from Phase 5 on: store tests import modules via the "@/" tsconfig path alias
// (e.g. "@/lib/endpoints"), which Vite doesn't resolve on its own without this.
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
});
