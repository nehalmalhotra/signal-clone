// Phase 6 smoke test: create a group as Alice with Carmen, check the group chat renders a
// group_update line and lets Alice open the details panel. Kept to one flow given the phase's
// time budget — admin add/remove and the removed-member banner are covered manually (DECISIONS.md).
import { test, expect } from "@playwright/test";
import { ALICE_PHONE, loginAs } from "./helpers";

test("Alice creates a group with Carmen, sees the group chat and details panel", async ({ browser }) => {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await loginAs(ctx, page, ALICE_PHONE);
  await page.goto("/");

  await page.getByRole("button", { name: /New chat/i }).click();
  await page.getByRole("button", { name: "New group" }).click();

  const groupName = `E2E Group ${Date.now()}`;
  await page.getByRole("button", { name: /Carmen Ruiz/ }).click();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByPlaceholder("Group 1").fill(groupName);
  await page.getByRole("button", { name: "Create" }).click();

  await page.waitForSelector("textarea[placeholder='Message']");
  await expect(page.getByText("You created the group.")).toBeVisible({ timeout: 5000 });
  await expect(page.getByText(/You added Carmen Ruiz\./)).toBeVisible();

  await page.getByRole("button", { name: new RegExp(`${groupName}.*members`) }).click();
  const dialog = page.getByRole("dialog", { name: "Group settings" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("Carmen Ruiz")).toBeVisible();
  await expect(dialog.getByText("Admin")).toBeVisible(); // Alice, the creator

  await ctx.close();
});
