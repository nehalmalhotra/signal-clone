// Enter should submit the onboarding phone step exactly like clicking Continue, but only once the
// number is valid — covers the <form onSubmit> + type="submit" wiring (not a keydown listener).
import { test, expect } from "@playwright/test";

test("pressing Enter on the phone step submits only once the number is valid", async ({ page }) => {
  await page.goto("/register");
  const input = page.getByPlaceholder("Phone number");

  // Invalid (too short): Enter must not open the confirm modal.
  await input.fill("555");
  await input.press("Enter");
  await expect(page.getByText("Is your phone number above correct?")).not.toBeVisible();

  // Valid 10-digit NANP number: Enter behaves like clicking Continue.
  await input.fill("2025551234");
  await input.press("Enter");
  await expect(page.getByText("Is your phone number above correct?")).toBeVisible();
  await expect(page.getByText("+1 202-555-1234")).toBeVisible();
});
