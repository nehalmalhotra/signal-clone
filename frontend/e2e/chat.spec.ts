// Phase 5 end-to-end: two real browser contexts (Alice and Bob) talking over the live
// WebSocket, against the already-running dev servers (backend on :8000, frontend on :3000) and
// the seeded Alice<->Bob direct chat. Run with PLAYWRIGHT_BROWSERS_PATH pointed at the existing
// browser install (DECISIONS.md D-53) and both servers already up.
import { test, expect, type Page } from "@playwright/test";
import { ALICE_PHONE, BOB_PHONE, loginAs, openAliceBobChat } from "./helpers";

test.describe.configure({ mode: "serial" }); // shares one seeded conversation's live state

async function sendMessage(page: Page, text: string): Promise<void> {
  const input = page.getByPlaceholder("Message");
  await input.fill(text);
  await input.press("Enter");
}

/** The message bubble's own text, scoped to the timeline — the chat list's preview can show the
 * same text, so an unscoped page.getByText() matches both. */
function bubbleText(page: Page, text: string) {
  return page.getByTestId("timeline").getByText(text, { exact: true });
}

test.describe("1:1 chat over WebSocket", () => {
  test("Alice sends, Bob receives live, and the status icon advances sent -> delivered -> read", async ({
    browser,
  }) => {
    const aliceCtx = await browser.newContext();
    const bobCtx = await browser.newContext();
    const alice = await aliceCtx.newPage();
    const bob = await bobCtx.newPage();

    await loginAs(aliceCtx, alice, ALICE_PHONE);
    await loginAs(bobCtx, bob, BOB_PHONE);
    await openAliceBobChat(alice);
    // Bob stays on the chat list first, so the message arrives as "unread" there before he opens it.
    await bob.goto("/");

    const text = `e2e send ${Date.now()}`;
    await sendMessage(alice, text);

    // Alice's own bubble: optimistic "sending" -> "sent" once the ack arrives.
    const aliceBubble = bubbleText(alice, text).locator("..").locator("..");
    await expect(aliceBubble.getByLabel("Sent")).toBeVisible({ timeout: 8000 });

    // Bob's chat list: the row moves to the top with an unread badge and the live preview.
    const bobRow = bob.getByRole("button", { name: new RegExp(text) });
    await expect(bobRow).toBeVisible({ timeout: 5000 });

    // Delivered: Bob has the message (even unopened), so the server marks it delivered.
    await expect(aliceBubble.getByLabel("Delivered")).toBeVisible({ timeout: 5000 });

    // Bob opens the chat -> read.
    await bobRow.click();
    await expect(bubbleText(bob, text)).toBeVisible();
    await expect(aliceBubble.getByLabel("Read")).toBeVisible({ timeout: 5000 });

    await aliceCtx.close();
    await bobCtx.close();
  });

  test("typing dots appear for the recipient and clear after 3s idle", async ({ browser }) => {
    const aliceCtx = await browser.newContext();
    const bobCtx = await browser.newContext();
    const alice = await aliceCtx.newPage();
    const bob = await bobCtx.newPage();

    await loginAs(aliceCtx, alice, ALICE_PHONE);
    await loginAs(bobCtx, bob, BOB_PHONE);
    await openAliceBobChat(alice);
    await openAliceBobChat(bob);

    await alice.getByPlaceholder("Message").pressSequentially("typing...", { delay: 20 });
    await expect(bob.getByLabel("Typing")).toBeVisible({ timeout: 3000 });
    await expect(bob.getByLabel("Typing")).toBeHidden({ timeout: 6000 }); // 3s idle timeout + margin

    await alice.getByPlaceholder("Message").fill("");
    await aliceCtx.close();
    await bobCtx.close();
  });

  test("two tabs of the same user stay in sync", async ({ browser }) => {
    const aliceCtx = await browser.newContext();
    const aliceTab1 = await aliceCtx.newPage();
    const aliceTab2 = await aliceCtx.newPage();

    await loginAs(aliceCtx, aliceTab1, ALICE_PHONE);
    await openAliceBobChat(aliceTab1);
    await openAliceBobChat(aliceTab2);

    const text = `e2e two-tab ${Date.now()}`;
    await sendMessage(aliceTab1, text);
    await expect(bubbleText(aliceTab2, text)).toBeVisible({ timeout: 5000 }); // message.new reaches the other tab

    await aliceCtx.close();
  });

  test("a send made while offline is queued and delivered once (no duplicate) on reconnect", async ({
    browser,
  }) => {
    const aliceCtx = await browser.newContext();
    const bobCtx = await browser.newContext();
    const alice = await aliceCtx.newPage();
    const bob = await bobCtx.newPage();

    await loginAs(aliceCtx, alice, ALICE_PHONE);
    await loginAs(bobCtx, bob, BOB_PHONE);
    await openAliceBobChat(alice);
    await openAliceBobChat(bob);

    const text = `e2e offline ${Date.now()}`;
    await aliceCtx.setOffline(true);
    await sendMessage(alice, text);
    // Still shown locally (optimistic), but not yet delivered to Bob.
    await expect(bubbleText(alice, text)).toBeVisible();
    await expect(bubbleText(bob, text)).not.toBeVisible();

    await aliceCtx.setOffline(false);
    // Reconnect resends the same client_id; Bob sees it exactly once.
    await expect(bubbleText(bob, text)).toBeVisible({ timeout: 15_000 });
    await expect(bubbleText(bob, text)).toHaveCount(1);

    await aliceCtx.close();
    await bobCtx.close();
  });

  test("a send with no ack shows failed, and retry resends it", async ({ browser }) => {
    const aliceCtx = await browser.newContext();
    const alice = await aliceCtx.newPage();
    await loginAs(aliceCtx, alice, ALICE_PHONE);
    await openAliceBobChat(alice);

    await alice.clock.install();
    await aliceCtx.setOffline(true);

    const text = `e2e failed ${Date.now()}`;
    await sendMessage(alice, text);
    await alice.clock.fastForward(16_000); // past the 15s ack timeout (lib/ws/realtime.ts)

    const bubble = bubbleText(alice, text).locator("..").locator("..");
    const retryButton = bubble.getByRole("button", { name: /Send failed/ });
    await expect(retryButton).toBeVisible({ timeout: 5000 });

    // Let real time resume before going back online: the reconnect backoff and the retry's own
    // ack timer both use setTimeout, which the fake clock above is still intercepting.
    await alice.clock.resume();
    await aliceCtx.setOffline(false);
    // dispatchEvent (not click()): retrying flips the bubble straight back to "sending" and the
    // button unmounts, which can race a real click's actionability wait into "element detached,
    // retrying" against a button that's gone for good because the retry already worked.
    await retryButton.dispatchEvent("click");
    await expect(bubble.getByLabel("Sent")).toBeVisible({ timeout: 10_000 });

    await aliceCtx.close();
  });
});

test.describe("visual reference comparison", () => {
  for (const theme of ["light", "dark"] as const) {
    test(`chat screen screenshot (${theme})`, async ({ browser }) => {
      const ctx = await browser.newContext({ colorScheme: theme });
      const page = await ctx.newPage();
      await loginAs(ctx, page, ALICE_PHONE);
      await openAliceBobChat(page);
      if (theme === "dark") {
        // Set after hydration, not via addInitScript: React strips attributes it doesn't own
        // off <html>/<body> during hydration (same rule that protects against browser-extension
        // attributes), so an attribute added before hydration gets wiped the moment React mounts.
        await page.evaluate(() => document.documentElement.setAttribute("data-theme", "dark"));
      }
      await page.waitForTimeout(300); // let fonts/avatars/the theme repaint settle
      await page.screenshot({ path: `e2e/screenshots/chat-${theme}.png`, fullPage: false });
      await ctx.close();
    });
  }
});
