// Shared helpers for the Phase 5 chat E2E suite. Logs in via the API directly (POST
// /auth/verify, same mocked OTP "123456" the onboarding UI uses) rather than driving the
// onboarding screens — those are covered by Phase 4's own testing; this suite is about the
// chat screen and the WebSocket.
import type { BrowserContext, Page } from "@playwright/test";

// Overridable so the same suite can run against the deployed URLs after a smoke deploy
// (E2E_API_URL=https://... E2E_BASE_URL=https://... npx playwright test), not just localhost.
export const API_URL = process.env.E2E_API_URL ?? "http://localhost:8000";
export const OTP = "123456";

export const ALICE_PHONE = "+12025550100";
export const BOB_PHONE = "+12025550101";

/** Logs `page`'s browser context in as the given seeded user before any navigation. */
export async function loginAs(context: BrowserContext, page: Page, phoneNumber: string): Promise<void> {
  const res = await context.request.post(`${API_URL}/auth/verify`, {
    data: { phone_number: phoneNumber, code: OTP },
  });
  const body = await res.json();
  if (body.status !== "logged_in") {
    throw new Error(`Expected a seeded, already-registered user; got status "${body.status}" for ${phoneNumber}`);
  }
  await page.addInitScript((token: string) => {
    localStorage.setItem("signal-clone.token", token);
  }, body.token as string);
}

/** Opens the Alice<->Bob direct chat and waits for the first bubble to render. */
export async function openAliceBobChat(page: Page): Promise<void> {
  await page.goto("/");
  const row = page.getByRole("button", { name: /Bob Okafor|Alice Chen/ }).first();
  await row.click();
  await page.waitForSelector("textarea[placeholder='Message']");
}
