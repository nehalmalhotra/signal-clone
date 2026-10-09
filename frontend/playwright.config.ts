// Set PLAYWRIGHT_BROWSERS_PATH=D:\pwbrowsers before running `npx playwright test` — the browser
// binaries already live there (D-53 in DECISIONS.md); never run `playwright install` on this
// machine, it would download to C:, which is nearly full.
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false, // the suite shares one seeded backend; tests run in a known order
  retries: 0,
  reporter: [["list"]],
  use: {
    // E2E_BASE_URL lets the same suite target a deployed frontend after a smoke deploy.
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // Both servers are started by hand in this phase (backend: uvicorn app.main:app --port 8000;
  // frontend: npm run dev) rather than webServer here, so the same seeded SQLite data is reused
  // across a whole test run instead of restarting per run.
});
