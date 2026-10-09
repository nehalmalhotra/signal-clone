// Phase 7 smoke test: the Settings screen replaces the old nav-rail profile popover (D-39).
import { test, expect } from "@playwright/test";
import { ALICE_PHONE, loginAs } from "./helpers";

test("profile edits save and persist, theme switch persists across reload", async ({ browser }) => {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await loginAs(ctx, page, ALICE_PHONE);
  await page.goto("/");

  await page.getByRole("button", { name: "Your profile" }).click();
  await expect(page.getByRole("heading", { name: "Profile" })).toBeVisible();

  const about = `e2e about ${Date.now()}`;
  const aboutInput = page.getByPlaceholder("About");
  await aboutInput.fill(about);
  await aboutInput.blur();
  await page.waitForTimeout(300); // let the PATCH /me round-trip land

  await page.reload();
  await page.getByRole("button", { name: "Your profile" }).click();
  await expect(page.getByPlaceholder("About")).toHaveValue(about);

  // Appearance: switch to Dark, reload, confirm it stuck (no flash-back to light).
  await page.getByRole("button", { name: "Appearance" }).click();
  await page.getByLabel("Theme").selectOption("dark");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

  // Reset so other tests (and other runs) see the default theme.
  await page.getByRole("button", { name: "Your profile" }).click();
  await page.getByRole("button", { name: "Appearance" }).click();
  await page.getByLabel("Theme").selectOption("system");

  await ctx.close();
});

test("logout lives in Settings, not a nav-rail popover", async ({ browser }) => {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await loginAs(ctx, page, ALICE_PHONE);
  await page.goto("/");

  await page.getByRole("button", { name: "Your profile" }).click();
  await expect(page.getByRole("button", { name: "Log out" })).toBeVisible();

  await ctx.close();
});
