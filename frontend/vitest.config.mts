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
  test: {
    // e2e/ holds Playwright specs (chat.spec.ts), not vitest ones — exclude it, plus vitest's
    // own default exclusions which this `test.exclude` override would otherwise drop.
    exclude: ["**/node_modules/**", "**/dist/**", "**/.next/**", "e2e/**"],
  },
});
