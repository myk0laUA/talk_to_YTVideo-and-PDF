import assert from "node:assert/strict";
import { expect } from "@playwright/test";

// Keep the target in the viewport and let content-visibility settle before capture.
export async function captureVisible(page, target, filename) {
  await target.scrollIntoViewIfNeeded();
  await expect(target).toBeInViewport();
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const geometry = await target.evaluate(element => {
    const r = element.getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: r.height,
      rendered: element.checkVisibility({ contentVisibilityAuto: true }), text: element.textContent };
  });
  assert.ok(geometry.rendered && geometry.height > 0, "target is rendered");
  await page.screenshot({ path: filename });
  return geometry;
}

export async function stopSession(page, snapshot) {
  const before = await page.locator(".transcript-text").allTextContents();
  const response = page.waitForResponse(r => new URL(r.url()).pathname === "/api/text-sessions/stop" && r.request().method() === "POST");
  await page.getByRole("button", { name: "Stop text session", exact: true }).click();
  assert.equal((await response).status(), 200);
  await expect(page.getByText(/Session ended\./).first()).toBeVisible();
  await expect.poll(async () => (await snapshot()).active).toBe(0);
  assert.deepEqual(await page.locator(".transcript-text").allTextContents(), before);
  return { stopped: true, transcriptRetained: true, resources: await snapshot() };
}

// A cleanup error must reject the case. Callers close context/server in finally.
export async function removeSource(page, id, evidence) {
  await page.getByRole("button", { name: "Remove", exact: true }).click();
  const response = page.waitForResponse(r => new URL(r.url()).pathname === `/api/sources/${id}` && r.request().method() === "DELETE");
  await page.getByRole("button", { name: "Confirm remove", exact: true }).click();
  evidence.deleteStatus = (await response).status();
  evidence.readStatus = await page.evaluate(async sourceId => (await fetch(`/api/sources/${sourceId}`, { cache: "no-store" })).status, id);
  assert.equal(evidence.deleteStatus, 200, "source DELETE must succeed");
  assert.equal(evidence.readStatus, 404, "removed source must subsequently be inaccessible");
  evidence.removed = true;
}
