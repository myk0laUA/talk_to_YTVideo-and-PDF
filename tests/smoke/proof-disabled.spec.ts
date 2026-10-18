import { expect, test } from "@playwright/test";

test("production proof endpoints fail closed with no-store when disabled", async ({ request }) => {
  for (const path of ["/api/proof-source", "/api/realtime/client-secret"]) {
    const response = await request.post(path, { data: {}, headers: { origin: "http://127.0.0.1:3100" } });
    expect(response.status()).toBe(503);
    expect(response.headers()["cache-control"]).toBe("no-store");
    expect(response.headers()["set-cookie"]).toBeUndefined();
    expect(await response.json()).toEqual({ error: "Feature unavailable" });
    expect((await request.get(path)).status()).toBe(405);
  }
});

test("default voice page never requests media or proof endpoints", async ({ page }) => {
  let requests = 0;
  await page.route("**/api/**", route => { requests++; return route.abort(); });
  await page.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = async () => { throw new Error("Unexpected microphone request"); };
  });
  const errors: string[] = []; page.on("pageerror", e => errors.push(e.message));
  await page.goto("/proof/voice");
  await expect(page.getByRole("heading", { name: "Voice proof unavailable" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Start unavailable" })).toBeDisabled();
  expect(requests).toBe(0); expect(errors).toEqual([]);
});

test("default text page is unavailable with no requests, sockets or media", async ({ page }) => {
  let requests = 0;
  await page.route("**/api/**", route => { requests++; return route.abort(); });
  await page.routeWebSocket(/.*/, ws => ws.close());
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "mediaDevices", { value: undefined });
    for (const name of ["WebSocket", "RTCPeerConnection", "Audio"]) Object.defineProperty(window, name, { value: class { constructor() { throw new Error("Unexpected transport/media"); } } });
  });
  const errors: string[] = []; page.on("pageerror", e => errors.push(e.message));
  await page.goto("/proof/text");
  await expect(page.getByRole("heading", { name: "Text proof unavailable" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Start unavailable" })).toBeDisabled();
  expect(requests).toBe(0); expect(errors).toEqual([]);
});
