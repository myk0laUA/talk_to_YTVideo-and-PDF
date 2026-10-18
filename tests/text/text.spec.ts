import { expect, test, type Page } from "@playwright/test";
import path from "node:path";
type TextMock = { media: number; peers: number; audio: number; sockets: number; closed: number; sent: unknown[]; connect: () => void; event: (e: unknown) => void };
declare global { interface Window { textMock: TextMock } }
async function setup(page: Page, options: { absent?: boolean; hold?: boolean; status?: number } = {}) {
  const calls: string[] = [];
  await page.routeWebSocket(/.*/, ws => ws.close());
  await page.route("**/*", route => {
    const url = new URL(route.request().url());
    if (url.origin !== "http://127.0.0.1:3102") return route.abort();
    if (url.pathname === "/api/proof-source") { calls.push("source"); return route.fulfill({ json: { id: "00000000-0000-4000-8000-000000000001", title: "Synthetic lighthouse", text: "The blue lighthouse has seven windows. The keeper is Rowan.", expiresAt: new Date(Date.now() + 3600000).toISOString() } }); }
    if (url.pathname === "/api/realtime/client-secret") { calls.push("mint"); expect(route.request().postDataJSON().mode).toBe("text"); return route.fulfill({ status: options.status ?? 200, json: { clientSecret: "ek_synthetic_browser", expiresAt: Math.floor(Date.now() / 1000) + 60, model: "gpt-realtime" } }); }
    if (url.pathname.startsWith("/api/")) return route.abort();
    return route.continue();
  });
  await page.addInitScript(({ absent, hold }) => {
    const m: TextMock = window.textMock = { media: 0, peers: 0, audio: 0, sockets: 0, closed: 0, sent: [], connect() {}, event() {} };
    Object.defineProperty(navigator, "mediaDevices", { value: absent ? undefined : { getUserMedia: async () => { m.media++; throw new DOMException("Denied", "NotAllowedError"); } } });
    Object.defineProperty(window, "RTCPeerConnection", { value: class { constructor() { m.peers++; throw new Error("Forbidden"); } } });
    Object.defineProperty(window, "Audio", { value: class { constructor() { m.audio++; throw new Error("Forbidden"); } } });
    const create = document.createElement.bind(document);
    document.createElement = ((tag: string, ...args: unknown[]) => { if (tag.toLowerCase() === "audio") { m.audio++; throw new Error("Forbidden"); } return create(tag, ...args as []); }) as typeof document.createElement;
    class FakeSocket {
      readyState = 0; onopen: (() => void) | null = null; onmessage: ((e: { data: string }) => void) | null = null; onclose = null; onerror = null;
      constructor(url: string, protocols: string[]) {
        if (url !== "wss://api.openai.com/v1/realtime?model=gpt-realtime" || protocols.length !== 2 || protocols[0] !== "realtime" || protocols[1] !== "openai-insecure-api-key.ek_synthetic_browser") throw new Error("Unexpected handshake");
        m.sockets++; m.event = e => this.onmessage?.({ data: JSON.stringify(e) });
        m.connect = () => { this.readyState = 1; this.onopen?.(); m.event({ type: "session.created", session: { id: "sess_browser", type: "realtime", model: "gpt-realtime", output_modalities: ["text"], max_output_tokens: 256, audio: { input: { turn_detection: null } } } }); };
        if (!hold) setTimeout(() => m.connect(), 10);
      }
      send(data: string) { m.sent.push(JSON.parse(data)); }
      close() { this.readyState = 3; m.closed++; }
    }
    Object.defineProperty(window, "WebSocket", { value: FakeSocket });
  }, options);
  return calls;
}
async function noMedia(page: Page) { expect(await page.evaluate(() => [window.textMock.media, window.textMock.peers, window.textMock.audio])).toEqual([0, 0, 0]); }
async function answer(page: Page) {
  await page.evaluate(() => {
    const event = window.textMock.event;
    event({ type: "response.created", response: { id: "resp_browser" } });
    event({ type: "response.output_text.delta", response_id: "resp_browser", item_id: "item_browser", output_index: 0, content_index: 0, delta: "Seven" });
  });
  await expect(page.getByLabel("Received answers")).toContainText("Seven");
  await page.evaluate(() => window.textMock.event({ type: "response.done", response: { id: "resp_browser", status: "completed", output: [{ id: "item_browser", type: "message", role: "assistant", status: "completed", content: [{ type: "output_text", text: "Seven windows." }] }] } }));
}

test("no automatic requests; keyboard text success with absent media; Stop and navigation", async ({ page }, info) => {
  const calls = await setup(page, { absent: true }); await page.goto("/proof/text"); expect(calls).toEqual([]); await noMedia(page);
  await page.getByRole("button", { name: "Start", exact: true }).click(); await expect(page.getByRole("status")).toContainText("Ready.");
  const input = page.getByLabel("Question about the lighthouse"); await expect(input).toBeFocused();
  await input.fill("How many windows?"); await input.press("Enter"); await expect(page.getByRole("button", { name: "Send", exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Start", exact: true })).toBeDisabled();
  await answer(page); await expect(input).toBeFocused(); await expect(page.getByLabel("Received answers")).toHaveText("Assistant: Seven windows.");
  expect(calls).toEqual(["source", "mint"]); await noMedia(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: path.resolve(`artifacts/local/02c/${info.project.name}-success.png`), fullPage: true });
  await page.getByRole("button", { name: "Stop", exact: true }).click(); await expect(page.getByRole("status")).toContainText("Ended."); await expect(page.getByRole("button", { name: "Start", exact: true })).toBeFocused();
  expect(await page.evaluate(() => window.textMock.closed)).toBe(1);
  await page.screenshot({ path: path.resolve(`artifacts/local/02c/${info.project.name}-ended.png`), fullPage: true });
  await page.getByRole("button", { name: "Start", exact: true }).click(); await expect(page.getByRole("status")).toContainText("Ready.");
  await page.getByRole("link", { name: /Open voice proof/ }).click(); await expect(page).toHaveURL(/proof\/voice/); expect(await page.evaluate(() => window.textMock.closed)).toBe(2);
});
test("denial offers text navigation; denied media is never called in text", async ({ page }) => {
  await setup(page); await page.goto("/proof/voice"); await page.getByRole("button", { name: "Start", exact: true }).click(); await expect(page.getByRole("status")).toContainText("denied");
  await page.getByRole("link", { name: /Use text without/ }).click(); await expect(page).toHaveURL(/proof\/text/);
  await page.evaluate(() => { window.textMock.media = 0; });
  await page.getByRole("button", { name: "Start", exact: true }).click(); await expect(page.getByRole("status")).toContainText("Ready."); await noMedia(page);
  await page.getByRole("button", { name: "Stop", exact: true }).click();
});
test("Stop connecting; explicit retry; Stop answering ignores late result", async ({ page }) => {
  await setup(page, { hold: true }); await page.goto("/proof/text"); await page.getByRole("button", { name: "Start", exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.textMock.sockets)).toBe(1);
  await page.getByRole("button", { name: "Stop", exact: true }).click(); await page.evaluate(() => window.textMock.connect()); await expect(page.getByRole("status")).toContainText("Ended.");
  await page.getByRole("button", { name: "Start", exact: true }).click(); await expect.poll(() => page.evaluate(() => window.textMock.sockets)).toBe(2);
  await page.evaluate(() => window.textMock.connect()); await page.getByLabel("Question about the lighthouse").fill("Who?"); await page.getByRole("button", { name: "Send", exact: true }).click();
  await page.getByRole("button", { name: "Stop", exact: true }).click(); await page.evaluate(() => window.textMock.event({ type: "error" })); await expect(page.getByRole("status")).toContainText("Ended."); await noMedia(page);
});
test("safe error, validation and retry", async ({ page }, info) => {
  await setup(page); await page.goto("/proof/text"); await page.getByRole("button", { name: "Start", exact: true }).click(); await expect(page.getByRole("status")).toContainText("Ready.");
  await page.getByRole("button", { name: "Send", exact: true }).click(); await expect(page.locator("#question-error")).toContainText("1–1000");
  await page.getByLabel("Question about the lighthouse").fill("x".repeat(1001)); await page.getByRole("button", { name: "Send", exact: true }).click(); await expect(page.locator("#question-error")).toContainText("1–1000");
  await page.evaluate(() => window.textMock.event({ type: "error", error: { message: "Do not display this provider detail" } })); await expect(page.getByRole("status")).toContainText("Provider reported an error");
  await expect(page.getByRole("button", { name: "Start", exact: true })).toBeFocused(); await page.screenshot({ path: path.resolve(`artifacts/local/02c/${info.project.name}-error.png`), fullPage: true });
  await page.getByRole("button", { name: "Start", exact: true }).click(); await expect(page.getByRole("status")).toContainText("Ready."); await noMedia(page); await page.getByRole("button", { name: "Stop", exact: true }).click();
});
test("pagehide closes active socket", async ({ page }) => { await setup(page); await page.goto("/proof/text"); await page.getByRole("button", { name: "Start", exact: true }).click(); await expect(page.getByRole("status")).toContainText("Ready."); await page.evaluate(() => dispatchEvent(new Event("pagehide"))); await expect(page.getByRole("status")).toContainText("Ended."); expect(await page.evaluate(() => window.textMock.closed)).toBe(1); });

