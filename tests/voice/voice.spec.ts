import { expect, test, type Page } from "@playwright/test";
import path from "node:path";

type MockState = { order: string[]; stopped: number; closed: number; channelsClosed: number; mediaMode: string; autoplay: boolean; releaseMedia?: () => void; event: (value: unknown) => void; connect: () => void };
declare global { interface Window { voiceMock: MockState } }

async function setup(page: Page, options: { media?: string; mintStatus?: number; connecting?: boolean } = {}) {
  const calls: string[] = []; const errors: string[] = [];
  page.on("pageerror", e => errors.push(e.name));
  // Every API write and all external HTTP traffic are fulfilled/blocked before the server.
  await page.route("**/*", async route => {
    const url = new URL(route.request().url());
    if (url.hostname === "api.openai.com") {
      calls.push("sdp");
      if (url.pathname !== "/v1/realtime/calls") return route.abort();
      const valid = route.request().headers().authorization === "Bearer ek_browser_synthetic";
      expect(valid).toBe(true); // Boolean assertion keeps credentials out of failure output.
      return route.fulfill({ contentType: "application/sdp", body: "v=0\r\nm=audio 9 UDP/TLS/RTP/SAVPF 111\r\n" });
    }
    if (url.hostname !== "127.0.0.1") return route.abort();
    if (url.pathname === "/api/proof-source") {
      calls.push("source"); return route.fulfill({ json: { id: "00000000-0000-4000-8000-000000000001", title: "Synthetic lighthouse",
        text: "The blue lighthouse has seven windows.", expiresAt: new Date(Date.now() + 3600000).toISOString() } });
    }
    if (url.pathname === "/api/realtime/client-secret") {
      calls.push("mint"); return route.fulfill({ status: options.mintStatus ?? 200, json: options.mintStatus ? { error: "Service unavailable" } : { clientSecret: "ek_browser_synthetic", expiresAt: Math.floor(Date.now() / 1000) + 60 } });
    }
    if (url.pathname.startsWith("/api/")) return route.abort();
    return route.continue();
  });
  await page.addInitScript(({ media, connecting }) => {
    const mock: MockState = window.voiceMock = { order: [], stopped: 0, closed: 0, channelsClosed: 0, mediaMode: media ?? "ok", autoplay: false, event() {}, connect() {} };
    const track = () => ({ onended: null, stop() { mock.stopped++; } });
    const stream = () => { const t = track(); return { getTracks: () => [t], getAudioTracks: () => [t], addTrack() {} }; };
    navigator.mediaDevices.getUserMedia = async () => {
      mock.order.push("media");
      if (mock.mediaMode === "deny") throw new DOMException("Denied", "NotAllowedError");
      if (mock.mediaMode === "pending") await new Promise<void>(resolve => { mock.releaseMedia = resolve; });
      return stream() as unknown as MediaStream;
    };
    class FakeAudio {
      srcObject = null; autoplay = false;
      async play() { if (!mock.autoplay) throw new DOMException("Blocked", "NotAllowedError"); }
      pause() {} load() {} removeAttribute() {}
    }
    class FakePeer {
      connectionState = "new";
      ontrack: ((e: unknown) => void) | null = null;
      onconnectionstatechange: (() => void) | null = null;
      channel = { readyState: "connecting", onopen: null as (() => void) | null, onmessage: null as ((e: unknown) => void) | null, onerror: null, onclose: null, close() { mock.channelsClosed++; } };
      constructor() {
        mock.event = value => this.channel.onmessage?.({ data: JSON.stringify(value) });
        mock.connect = () => {
          this.connectionState = "connected"; this.channel.readyState = "open"; this.channel.onopen?.(); this.onconnectionstatechange?.();
          mock.event({ type: "session.created", session: { type: "realtime", id: "sess_synthetic" } });
          const remote = stream(); this.ontrack?.({ track: remote.getTracks()[0], streams: [remote] });
        };
      }
      addTrack() {} createDataChannel() { return this.channel; }
      async createOffer() { return { type: "offer", sdp: "v=0\r\nm=audio 9 UDP/TLS/RTP/SAVPF 111\r\n" }; }
      async setLocalDescription() {}
      async setRemoteDescription() { if (!connecting) mock.connect(); }
      close() { mock.closed++; }
    }
    Object.defineProperty(window, "RTCPeerConnection", { value: FakePeer });
    Object.defineProperty(window, "Audio", { value: FakeAudio });
    Object.defineProperty(window, "MediaStream", { value: class { addTrack() {} } });
  }, { media: options.media, connecting: options.connecting });
  await page.goto("/proof/voice");
  await expect(page.getByRole("button", { name: "Start", exact: true })).toBeEnabled();
  expect(calls).toEqual([]); expect(await page.evaluate(() => window.voiceMock.order)).toEqual([]);
  return { calls, errors };
}
async function screenshot(page: Page, project: string, state: string) {
  await page.screenshot({ path: path.resolve(`artifacts/local/02b/${project}-${state}.png`), fullPage: true });
}

test("mocked voice events, autoplay action, Stop, keyboard focus and retry", async ({ page }, info) => {
  const h = await setup(page);
  await page.getByRole("button", { name: "Start", exact: true }).focus(); await page.keyboard.press("Enter");
  await expect(page.getByRole("status")).toHaveText("Ready. Ask about the synthetic lighthouse.");
  await expect(page.getByRole("button", { name: "Start unavailable while active" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Enable audio playback" })).toBeVisible();
  await page.evaluate(() => {
    window.voiceMock.autoplay = true;
    window.voiceMock.event({ type: "conversation.item.input_audio_transcription.completed", item_id: "user1", content_index: 0, transcript: "How many windows?" });
    window.voiceMock.event({ type: "response.output_audio_transcript.delta", item_id: "answer1", content_index: 0, delta: "Seven" });
    window.voiceMock.event({ type: "response.output_audio_transcript.done", item_id: "answer1", content_index: 0, transcript: "Seven windows." });
  });
  await page.getByRole("button", { name: "Enable audio playback" }).click();
  await expect(page.getByText("Audio playback enabled; audible output depends on the device.")).toBeVisible();
  await expect(page.getByRole("list", { name: "Proof transcript" })).toContainText("Seven windows.");
  expect(h.calls).toEqual(["source", "mint", "sdp"]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await screenshot(page, info.project.name, "success");
  await page.getByRole("button", { name: "Stop", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Ended.");
  await expect(page.getByRole("button", { name: "Start", exact: true })).toBeFocused();
  expect(await page.evaluate(() => [window.voiceMock.stopped, window.voiceMock.closed, window.voiceMock.channelsClosed])).toEqual([2, 1, 1]);
  await screenshot(page, info.project.name, "ended");
  await page.getByRole("button", { name: "Start", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Ready.");
  await page.getByRole("link", { name: "Talk to a Document" }).click();
  await expect(page.getByRole("heading", { name: "A little more understanding." })).toBeVisible();
  expect(await page.evaluate(() => window.voiceMock.closed)).toBe(2); expect(h.errors).toEqual([]);
});
test("permission denial makes no credential request", async ({ page }, info) => {
  const h = await setup(page, { media: "deny" }); await page.getByRole("button", { name: "Start", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Microphone permission denied"); expect(h.calls).toEqual(["source"]);
  await screenshot(page, info.project.name, "error"); expect(h.errors).toEqual([]);
});
test("Stop during unresolved permission releases late media without mint", async ({ page }) => {
  const h = await setup(page, { media: "pending" }); await page.getByRole("button", { name: "Start", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Waiting for microphone"); await page.getByRole("button", { name: "Stop", exact: true }).click();
  await page.evaluate(() => window.voiceMock.releaseMedia?.());
  await expect.poll(() => page.evaluate(() => window.voiceMock.stopped)).toBe(1);
  expect(h.calls).toEqual(["source"]); await expect(page.getByRole("status")).toContainText("Ended.");
});
test("Stop while connecting ignores late ready event", async ({ page }) => {
  await setup(page, { connecting: true }); await page.getByRole("button", { name: "Start", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Connecting;"); await page.getByRole("button", { name: "Stop", exact: true }).click();
  await page.evaluate(() => window.voiceMock.event({ type: "session.created", session: { type: "realtime", id: "late" } }));
  await expect(page.getByRole("status")).toContainText("Ended.");
});
test("admission failure safely releases microphone", async ({ page }) => {
  const h = await setup(page, { mintStatus: 429 }); await page.getByRole("button", { name: "Start", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Proof limit reached"); expect(h.calls).toEqual(["source", "mint"]);
  expect(await page.evaluate(() => window.voiceMock.stopped)).toBe(1);
});
