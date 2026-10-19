import { test, expect, type Page, type TestInfo } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";

const start = (p: Page) => p.getByRole("button", { name: "Start voice session", exact: true });
const stop = (p: Page) => p.getByRole("button", { name: "Stop session", exact: true });
const interrupt = (p: Page) => p.getByRole("button", { name: "Interrupt answer", exact: true });
const play = (p: Page) => p.getByRole("button", { name: "Enable speaker playback", exact: true });
const media = (p: Page) => p.locator(".voice-device-status");
const response = (p: Page) => p.locator(".voice-media-announcement");
const turns = (p: Page) => p.locator(".transcript-turn");
async function act(p: Page, name: string) {
  const revision = await p.getByLabel("Fixture revision").textContent();
  await p.getByRole("button", { name, exact: true, includeHidden: true }).evaluate((b: HTMLButtonElement) => b.click());
  await expect(p.getByLabel("Fixture revision")).not.toHaveText(revision!);
}
type Audit = { disposed: number; prepare: number; connects: number; media: number; timers: number; states: unknown[];
  resources: { closes: number; playbackReleases: number; plays: number; mediaReleases: number; attaches: number; mediaReturned: boolean;
    tracks: { enabled: boolean; changes: boolean[]; stops: number; subscriptions: number; removals: number; listeners: number }[];
    transport: { closes: number; subscriptions: number; unsubscribes: number; listening: boolean; commands: { type: string; event_id: string; response_id?: string; item_id?: string }[]; trace: string[] } }[] }[];
async function audit(p: Page): Promise<Audit> { await act(p, "Refresh audit"); return JSON.parse((await p.getByLabel("Fixture audit").textContent())!); }
async function latest(p: Page) { return (await audit(p)).at(-1)!; }
async function resource(p: Page) { return (await latest(p)).resources.at(-1)!; }
async function commands(p: Page) { return (await resource(p)).transport.commands.filter(c => ["response.cancel", "output_audio_buffer.clear"].includes(c.type)); }
async function mode(p: Page, value: string) { await p.getByLabel("Scenario").selectOption(value); await act(p, "Mount session"); }
async function prime(p: Page) { await act(p, "ACK initial"); await act(p, "ACK source"); await act(p, "ACK final"); }
async function begin(p: Page) { await start(p).click(); await prime(p); await expect(media(p)).toContainText("Outgoing microphone audio is on"); }
async function answer(p: Page) { await act(p, "Begin answer"); await act(p, "Stream partial"); await act(p, "Output started"); }
async function capture(p: Page, info: TestInfo, name: string) {
  await mkdir("artifacts/local/08c/screenshots", { recursive: true });
  const details = p.locator("details").filter({ has: p.getByText("Fixture controls", { exact: true }) });
  const open = await details.count() && await details.getAttribute("open") !== null;
  if (open) await details.evaluate((e: HTMLDetailsElement) => { e.open = false; });
  // Property writes work under the fixture's strict style CSP; injected styles do not.
  const audits = p.locator('pre[aria-label="Fixture audit"], output[aria-label="Fixture revision"]');
  await audits.evaluateAll(elements => elements.forEach(e => { (e as HTMLElement).style.display = "none"; }));
  await p.screenshot({ path: `artifacts/local/08c/screenshots/${info.project.name}-${name}.png`, fullPage: ["ready", "interrupted", "denied", "blocked", "retained", "production"].includes(name) });
  await audits.evaluateAll(elements => elements.forEach(e => { (e as HTMLElement).style.display = ""; }));
  if (open) await details.evaluate((e: HTMLDetailsElement) => { e.open = true; });
}
async function fits(p: Page) {
  expect(await p.evaluate(() => ({ page: document.documentElement.scrollWidth <= innerWidth,
    text: [...document.querySelectorAll(".transcript-text")].every(e => e.scrollWidth <= e.clientWidth + 1),
    controls: [...document.querySelectorAll(".voice-session button")].every(e => {
      const box = e.getBoundingClientRect(), parent = e.closest(".voice-session")!.getBoundingClientRect();
      return box.left >= parent.left - 1 && box.right <= parent.right + 1 && box.width <= innerWidth && box.height >= 48 && e.scrollWidth <= e.clientWidth + 1;
    }) }))).toEqual({ page: true, text: true, controls: true });
}
const observations = new WeakMap<Page, { external: string[]; errors: string[] }>();
test.beforeEach(async ({ page }) => {
  const evidence = { external: [] as string[], errors: [] as string[] }; observations.set(page, evidence);
  page.on("pageerror", error => evidence.errors.push(error.message));
  await page.route("**/*", route => {
    if (new URL(route.request().url()).hostname !== "127.0.0.1") { evidence.external.push(route.request().url()); return route.abort(); }
    return route.continue();
  });
  await page.addInitScript(() => {
    const a = { media: 0, peers: 0, sockets: 0, audio: 0, scrollListeners: 0, abortListeners: 0 };
    Reflect.set(window, "fixtureAudit", a);
    Object.defineProperty(navigator, "mediaDevices", { configurable: true, get() { a.media++; throw new Error("Denied media sentinel"); } });
    for (const [name, key] of [["RTCPeerConnection", "peers"], ["WebSocket", "sockets"], ["Audio", "audio"], ["AudioContext", "audio"]] as const)
      Object.defineProperty(window, name, { configurable: true, get() { a[key]++; throw new Error("Forbidden API access"); } });
    const htmlPlay = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function() { a.audio++; return htmlPlay.call(this); };
    const add = window.addEventListener, remove = window.removeEventListener;
    const listeners = new Set<EventListenerOrEventListenerObject>();
    window.addEventListener = function(type: string, listener: EventListenerOrEventListenerObject | null, options?: boolean | AddEventListenerOptions) { if (type === "scroll" && listener) { listeners.add(listener); a.scrollListeners = listeners.size; } if (listener) return add.call(this, type, listener, options); };
    window.removeEventListener = function(type: string, listener: EventListenerOrEventListenerObject | null, options?: boolean | EventListenerOptions) { if (type === "scroll" && listener) { listeners.delete(listener); a.scrollListeners = listeners.size; } if (listener) return remove.call(this, type, listener, options); };
    const addAbort = AbortSignal.prototype.addEventListener, removeAbort = AbortSignal.prototype.removeEventListener;
    const aborts = new WeakMap<AbortSignal, Set<EventListenerOrEventListenerObject>>();
    AbortSignal.prototype.addEventListener = function(type: string, listener: EventListenerOrEventListenerObject | null, options?: boolean | AddEventListenerOptions) {
      if (type === "abort" && listener) { const set = aborts.get(this) ?? new Set(); if (!set.has(listener)) { set.add(listener); a.abortListeners++; } aborts.set(this, set); }
      if (listener) addAbort.call(this, type, listener, options);
    };
    AbortSignal.prototype.removeEventListener = function(type: string, listener: EventListenerOrEventListenerObject | null, options?: boolean | EventListenerOptions) {
      if (type === "abort" && listener && aborts.get(this)?.delete(listener)) a.abortListeners--;
      if (listener) removeAbort.call(this, type, listener, options);
    };
  });
  await page.goto("/"); await page.getByText("Fixture controls", { exact: true }).click();
  await expect(start(page)).toBeEnabled();
});
test.afterEach(async ({ page }, info) => {
  let records: Audit = [];
  await expect(page.locator("main")).not.toContainText(/PRIVATE08C_ERROR|STALE08C_MUST_NOT_APPEAR/);
  if (new URL(page.url()).port === "3119") {
    await act(page, "Unmount session");
    for (const name of ["Release preparation", "Release connection", "Release microphone", "Release playback", "Release cancel", "Release clear", "Deliver stale events"]) await act(page, name);
    records = await audit(page);
    for (const r of records) {
      expect(r.disposed).toBe(1); expect(r.timers).toBe(0);
      for (const x of r.resources) {
        expect(x.closes).toBe(1); expect(x.playbackReleases).toBe(1); expect(x.transport.closes).toBe(1);
        expect(x.transport.unsubscribes).toBe(x.transport.subscriptions); expect(x.transport.listening).toBe(false);
        expect(x.mediaReleases).toBe(x.mediaReturned ? 1 : 0);
        for (const track of x.tracks) { expect(track.enabled).toBe(false); expect(track.stops).toBe(x.mediaReturned ? 1 : 0); expect(track.listeners).toBe(0); expect(track.removals).toBe(track.subscriptions); }
        const outbound = x.transport.commands;
        expect(outbound.every(c => ["session.update", "conversation.item.create", "response.cancel", "output_audio_buffer.clear"].includes(c.type))).toBe(true);
        expect(new Set(outbound.map(c => c.event_id)).size).toBe(outbound.length);
        const sourceIds = outbound.filter(c => c.item_id).map(c => c.item_id);
        expect(new Set(sourceIds).size).toBe(sourceIds.length); // no source retransmission
        expect(outbound.filter(c => c.type === "session.update").length).toBeLessThanOrEqual(2);
      }
    }
  }
  const counters = await page.evaluate(() => ({ ...Reflect.get(window, "fixtureAudit"), localStorage: localStorage.length, sessionStorage: sessionStorage.length }));
  expect(counters).toEqual({ media: 0, peers: 0, sockets: 0, audio: 0, scrollListeners: new URL(page.url()).port === "3119" ? 0 : 1, abortListeners: 0, localStorage: 0, sessionStorage: 0 });
  const evidence = observations.get(page)!;
  await writeFile(info.outputPath("safe-counts.json"), JSON.stringify({ context: "actual08A/08B/09A/09B; test-only admission, simulated tracks/playback/transport/clock; no audio/device/provider", ...evidence, counters, records }, null, 2));
  expect(evidence.external).toEqual([]); expect(evidence.errors).toEqual([]);
});

test("explicit Start, full source ACK barrier, exact mute changes and independent playback", async ({ page }, info) => {
  expect((await audit(page)).every(r => r.prepare === 0 && r.connects === 0 && r.media === 0)).toBe(true);
  await start(page).click(); await start(page).evaluate((b: HTMLButtonElement) => { b.click(); b.click(); });
  expect((await latest(page)).prepare).toBe(1); expect((await latest(page)).connects).toBe(1); expect((await latest(page)).media).toBe(0);
  await expect(stop(page)).toBeEnabled(); await act(page, "ACK initial"); await act(page, "ACK all but one source"); await act(page, "ACK final");
  expect((await latest(page)).media).toBe(0); await expect(page.locator(".voice-session-status")).toContainText("microphone has not been requested");
  await act(page, "ACK source"); expect((await latest(page)).media).toBe(0); await act(page, "ACK final");
  await expect(media(page)).toContainText("Outgoing microphone audio is on"); expect((await latest(page)).media).toBe(1);
  const before = (await resource(page)).transport.commands;
  await page.getByRole("button", { name: "Mute microphone", exact: true }).click();
  await expect(page.getByRole("button", { name: "Unmute microphone", exact: true })).toHaveAttribute("aria-pressed", "true");
  expect((await resource(page)).tracks.map(t => t.changes)).toEqual([[true, false], [true, false]]);
  await play(page).click(); await expect(media(page)).toContainText("Playback enabled");
  await page.getByRole("button", { name: "Unmute microphone", exact: true }).click();
  expect((await resource(page)).tracks.map(t => t.changes)).toEqual([[true, false, true], [true, false, true]]);
  expect((await resource(page)).transport.commands).toEqual(before);
  await stop(page).focus(); await fits(page); await capture(page, info, "ready");
});

test("default admission refuses before any connection or microphone", async ({ page }) => {
  await mode(page, "source-default"); await start(page).click();
  await expect(page.locator(".voice-session-status")).toContainText("cannot be used");
  expect(await latest(page)).toMatchObject({ prepare: 1, connects: 0, media: 0, timers: 0 });
  await expect(stop(page)).toBeDisabled(); await expect(page.getByRole("button", { name: "Start a fresh voice session" })).toBeEnabled();
});

test("manual interrupt waits for both confirmations and retains unheard text", async ({ page }, info) => {
  await begin(page); await answer(page); await play(page).click();
  await interrupt(page).focus(); await page.keyboard.press("Enter");
  await interrupt(page).evaluate((b: HTMLButtonElement) => { b.click(); b.click(); });
  expect(await commands(page)).toEqual([
    { type: "response.cancel", event_id: "voice_1_interrupt_1_cancel", response_id: "answer_A" },
    { type: "output_audio_buffer.clear", event_id: "voice_1_interrupt_2_clear" },
  ]);
  await expect(response(page)).toContainText("Interruption pending"); await act(page, "Generation cancelled");
  await stop(page).focus();
  await expect(response(page)).toContainText("Interruption pending"); await act(page, "Output cleared");
  await expect(response(page)).toContainText("Interruption confirmed");
  await expect(page.locator(".transcript")).toContainText("Words shown may include speech you did not hear");
  await expect(page.locator(".transcript")).toContainText("FIXTURE08C generated speech text");
  await expect(stop(page)).toBeFocused(); await capture(page, info, "interrupted");
});

test("generation done leaves streaming output and clear-only interrupt", async ({ page }) => {
  await begin(page); await answer(page); await act(page, "Generation done");
  await expect(response(page)).toContainText("Answer generation complete. Audio output is streaming");
  await expect(interrupt(page)).toBeEnabled(); await interrupt(page).click();
  expect((await commands(page)).map(c => c.type)).toEqual(["output_audio_buffer.clear"]);
  await expect(response(page)).toContainText("Interruption pending"); await act(page, "Output cleared");
  await expect(response(page)).toContainText("Interruption confirmed");
});

test("VAD interruption is observed without client commands", async ({ page }) => {
  await begin(page); await answer(page); await act(page, "Speech started");
  await expect(response(page)).toContainText("Speech activity detected"); await expect(response(page)).toContainText("Interruption pending");
  expect(await commands(page)).toEqual([]); await act(page, "Output cleared"); await expect(response(page)).toContainText("Interruption pending");
  await act(page, "Generation cancelled"); await act(page, "Speech stopped");
  await expect(response(page)).toContainText("Interruption confirmed"); await expect(response(page)).toContainText("Speech activity ended"); expect(await commands(page)).toEqual([]);
});

for (const hold of ["cancel", "clear"]) test(`interrupt ACKs before deferred ${hold} write settle stay pending`, async ({ page }) => {
  await mode(page, `hold-${hold}`); await begin(page); await answer(page); await interrupt(page).click();
  await act(page, "Generation cancelled"); await act(page, "Output cleared");
  await expect(response(page)).toContainText("Interruption pending"); await expect(stop(page)).toBeEnabled();
  await act(page, `Release ${hold}`); await expect(response(page)).toContainText("Interruption confirmed");
  expect((await commands(page)).map(c => c.type)).toEqual(hold === "cancel" ? ["response.cancel"] : ["response.cancel", "output_audio_buffer.clear"]);
});

for (const origin of ["manual", "vad"]) test(`${origin} timeout is honest and never retried`, async ({ page }) => {
  await begin(page); await answer(page);
  if (origin === "manual") await interrupt(page).click(); else await act(page, "Speech started");
  await act(page, "Generation cancelled"); await act(page, "Expire timers");
  await expect(response(page)).toContainText("Interruption could not be confirmed"); await expect(response(page)).toContainText("Audio output state is uncertain");
  await expect(interrupt(page)).toBeDisabled(); await expect(stop(page)).toBeEnabled();
  const before = await commands(page); await act(page, "Expire timers"); expect(await commands(page)).toEqual(before);
});

test("correlated interruption error uses safe copy; response failure permits Stop", async ({ page }) => {
  await begin(page); await answer(page); await interrupt(page).click(); await act(page, "Fail interruption");
  await expect(response(page)).toContainText("Interruption could not be confirmed");
  await act(page, "Generation failed"); await expect(response(page)).toContainText("Answer generation failed");
  await expect(stop(page)).toBeEnabled();
});

test("duplicate, foreign and retired response events cannot replace current output", async ({ page }) => {
  await begin(page); await answer(page); const before = await response(page).textContent();
  await act(page, "Duplicate response"); await act(page, "Foreign response"); expect(await response(page).textContent()).toBe(before);
  await act(page, "Generation done"); await act(page, "Output stopped"); await act(page, "Next response"); await act(page, "Output started");
  const current = await response(page).textContent(); await act(page, "Old response events"); expect(await response(page).textContent()).toBe(current);
  await interrupt(page).click(); expect((await commands(page))[0].response_id).toBe("answer_B");
});

test("new response during cancel write cannot clear newer audio", async ({ page }) => {
  await mode(page, "hold-cancel"); await begin(page); await answer(page); await interrupt(page).click();
  await act(page, "Next response"); await act(page, "Output started"); await act(page, "Release cancel");
  await expect(response(page)).toContainText("Interruption could not be confirmed");
  expect((await commands(page)).map(c => c.type)).toEqual(["response.cancel"]);
});

test("bounded response capacity pauses outgoing tracks and requires explicit fresh recovery", async ({ page }) => {
  await begin(page); await act(page, "Exhaust response capacity");
  await expect(media(page)).toContainText("microphone input is paused");
  expect((await resource(page)).tracks.map(t => t.enabled)).toEqual([false, false]);
  await expect(interrupt(page)).toBeDisabled(); await expect(stop(page)).toBeEnabled();
  expect(await commands(page)).toEqual([]);
});

test("denied microphone and ended track are separate from speaker playback", async ({ page }, info) => {
  await mode(page, "denied-microphone"); await start(page).click(); await prime(page);
  await expect(page.locator(".voice-session-status")).toContainText("Text mode is a separate next step");
  await expect(media(page)).toContainText("Access denied, unavailable, or timed out");
  expect((await resource(page)).plays).toBe(0); await expect(play(page)).toBeDisabled();
  await expect(page.getByRole("button", { name: /switch|text mode/i })).toHaveCount(0); await capture(page, info, "denied");
  await mode(page, "success"); await begin(page); await act(page, "End microphone");
  await expect(page.locator(".voice-session-status")).toContainText("microphone ended"); await expect(media(page)).toContainText("Ended.");
});

test("blocked playback recovers explicitly with no new microphone or transport", async ({ page }, info) => {
  await mode(page, "blocked-playback"); await begin(page); await answer(page); await play(page).click();
  await expect(media(page)).toContainText("Playback could not start"); await expect(media(page)).toContainText("Outgoing microphone audio is on");
  await page.getByRole("button", { name: "Try speaker playback", exact: true }).focus(); await capture(page, info, "blocked");
  expect((await resource(page)).plays).toBe(1); await act(page, "Stream partial"); expect((await resource(page)).plays).toBe(1);
  await page.keyboard.press("Enter"); await expect(media(page)).toContainText("Playback enabled");
  expect(await latest(page)).toMatchObject({ connects: 1, media: 1 }); expect((await resource(page)).plays).toBe(2);
});

test("pending microphone and playback are independent with duplicate playback rejected", async ({ page }) => {
  await mode(page, "hold-microphone"); await start(page).click(); await prime(page);
  await expect(media(page)).toContainText("Waiting for access"); expect((await resource(page)).tracks.map(t => t.enabled)).toEqual([false, false]);
  await play(page).click(); await expect(media(page)).toContainText("Playback enabled"); await expect(media(page)).toContainText("Waiting for access");
  await act(page, "Release microphone"); await expect(media(page)).toContainText("Outgoing microphone audio is on");
  await mode(page, "hold-playback"); await begin(page); await play(page).click();
  await play(page).evaluate((b: HTMLButtonElement) => { b.click(); b.click(); });
  await expect(media(page)).toContainText("Waiting for playback"); expect((await resource(page)).plays).toBe(1);
  await act(page, "Release playback"); await expect(media(page)).toContainText("Playback enabled");
});

for (const stage of ["preparation", "connection", "initial-ack", "source-ack", "final-ack", "microphone", "playback", "cancel", "clear", "confirmation"]) {
  test(`Stop during ${stage} keeps teardown final after late work`, async ({ page }) => {
    await mode(page, ["preparation", "connection", "microphone", "playback", "cancel", "clear"].includes(stage) ? `hold-${stage}` : "success");
    await start(page).click();
    if (!["preparation", "connection", "initial-ack"].includes(stage)) await act(page, "ACK initial");
    if (!["preparation", "connection", "initial-ack", "source-ack"].includes(stage)) await act(page, "ACK source");
    if (!["preparation", "connection", "initial-ack", "source-ack", "final-ack"].includes(stage)) await act(page, "ACK final");
    if (stage === "playback") await play(page).click();
    if (["cancel", "clear", "confirmation"].includes(stage)) { await answer(page); await interrupt(page).click(); }
    await expect(stop(page)).toBeEnabled(); await stop(page).click();
    const before = (await latest(page)).resources.map(x => x.transport.commands);
    for (const name of ["Release preparation", "Release connection", "Release microphone", "Release playback", "Release cancel", "Release clear", "Deliver stale events", "Expire timers"]) await act(page, name);
    await expect(page.locator(".voice-session-status")).toContainText("Session ended");
    expect((await latest(page)).resources.map(x => x.transport.commands)).toEqual(before);
    expect((await latest(page)).timers).toBe(0);
    if (["cancel", "clear", "confirmation"].includes(stage)) await expect(page.locator(".transcript")).toContainText("FIXTURE08C generated speech text");
  });
}

for (const operation of ["Replace source", "Remove source", "Unmount session"]) {
  for (const stage of ["hold-connection", "hold-microphone", "hold-playback", "hold-cancel", "hold-clear"]) {
    test(`${operation} during ${stage} clears text before late callbacks and resources`, async ({ page }) => {
      await mode(page, stage); await start(page).click();
      if (stage !== "hold-connection") await prime(page);
      if (!["hold-connection", "hold-microphone"].includes(stage)) {
        await answer(page); if (stage === "hold-playback") await play(page).click(); else await interrupt(page).click();
        await expect(turns(page)).toHaveCount(2);
      }
      await act(page, operation); await expect(turns(page)).toHaveCount(0);
      for (const action of ["Release connection", "Release microphone", "Release playback", "Release cancel", "Release clear", "Deliver stale events"]) await act(page, action);
      await expect(turns(page)).toHaveCount(0);
      if (operation === "Replace source") {
        await expect(page.locator(".text-source")).toContainText("source B");
        await expect(start(page)).toBeEnabled(); expect((await latest(page)).prepare).toBe(0);
      }
    });
  }
}

test("Stop retains partial text, deliberate fresh Start clears it and never starts eagerly", async ({ page }, info) => {
  await begin(page); await answer(page); await stop(page).click();
  await expect(response(page)).toHaveText("No active answer. Any received text stays below.");
  await expect(page.locator(".transcript")).toContainText("Text unfinished when the conversation stopped");
  await capture(page, info, "retained"); const n = (await latest(page)).prepare;
  await act(page, "Deliver stale events"); expect((await latest(page)).prepare).toBe(n);
  await page.getByRole("button", { name: "Start a fresh voice session" }).click(); await expect(turns(page)).toHaveCount(0);
  expect((await latest(page)).prepare).toBe(n + 1); await prime(page);
  await expect(page.locator(".transcript")).toContainText("No turns yet");
  await page.getByRole("button", { name: "Inspect source", exact: true }).click(); await expect(page.locator(".source-reader .page-text")).toBeVisible();
});

for (const stage of ["hold-connection", "hold-microphone"]) test(`active B rejects late A callbacks during ${stage}`, async ({ page }) => {
  await mode(page, stage); await start(page).click();
  if (stage === "hold-microphone") await prime(page);
  await act(page, "Replace source"); await start(page).click();
  if (stage === "hold-connection") await act(page, "Release connection");
  await prime(page);
  if (stage === "hold-microphone") await act(page, "Release microphone");
  await expect(media(page)).toContainText("Outgoing microphone audio is on");
  const before = await response(page).textContent();
  await act(page, "Deliver stale events");
  await expect(page.locator(".voice-session-status")).toContainText("Voice session ready");
  expect(await response(page).textContent()).toBe(before); await expect(turns(page)).toHaveCount(0);
  await expect(page.locator(".text-source")).toContainText("source B");
});

for (const stage of ["preparation", "connection", "source", "microphone", "playback"]) test(`${stage} deadline gives an explicit recovery with no automatic retry`, async ({ page }) => {
  await mode(page, stage === "source" ? "success" : `hold-${stage}`); await start(page).click();
  if (["microphone", "playback"].includes(stage)) await prime(page);
  if (stage === "playback") await play(page).click();
  await act(page, "Expire timers");
  if (stage === "playback") {
    await expect(media(page)).toContainText("Playback could not start"); await expect(stop(page)).toBeEnabled();
  } else {
    await expect(page.getByRole("button", { name: "Start a fresh voice session" })).toBeEnabled();
    await expect(stop(page)).toBeDisabled();
  }
  const before = await latest(page); await act(page, "Expire timers");
  expect(await latest(page)).toMatchObject({ prepare: before.prepare, connects: before.connects, media: before.media });
});

test("streaming preserves focus and reading anchor; keyboard Jump follows latest", async ({ page }, info) => {
  await begin(page); await answer(page); await act(page, "Stream long");
  const anchor = page.locator(".transcript-text").last();
  await anchor.scrollIntoViewIfNeeded(); await page.evaluate(() => scrollTo(0, document.querySelector(".transcript-turns")!.getBoundingClientRect().top + scrollY - 250));
  // Focus with preventScroll keeps the earlier reading position.
  await stop(page).evaluate((b: HTMLButtonElement) => b.focus({ preventScroll: true }));
  const top = await anchor.evaluate(e => e.getBoundingClientRect().top);
  const summary = await response(page).textContent();
  await act(page, "Stream partial");
  await expect(stop(page)).toBeFocused(); expect(await anchor.evaluate(e => e.getBoundingClientRect().top)).toBeCloseTo(top, 0);
  expect(await response(page).textContent()).toBe(summary);
  const jump = page.getByRole("button", { name: "Jump to latest", exact: true });
  await jump.focus(); await page.keyboard.press("Enter"); await expect(page.locator(".transcript-latest")).toBeFocused();
  await capture(page, info, "reading");
});

test("four-width reflow, reduced motion and 200 percent text retain named touch controls", async ({ page }, info) => {
  await page.emulateMedia({ reducedMotion: "reduce" }); await begin(page); await answer(page);
  await page.getByText("Fixture controls", { exact: true }).click();
  await fits(page); await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; }); await fits(page);
  await page.keyboard.press("Tab"); await stop(page).focus(); await expect(stop(page)).toBeFocused();
  expect(await stop(page).evaluate(e => getComputedStyle(e).outlineStyle)).not.toBe("none");
  await capture(page, info, "text-200");
  await page.evaluate(() => { document.documentElement.style.fontSize = ""; document.body.style.zoom = "2"; }); await fits(page);
});

test("separate production retains disabled entry and excludes fixture routes and query activation", async ({ page }, info) => {
  await page.goto("http://127.0.0.1:3120/?fixture=voice&scenario=success");
  await expect(page.getByRole("button", { name: "Start Voice Chat", exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Start text session", exact: true })).toBeDisabled();
  await expect(page.getByRole("textbox", { name: "Your question" })).toBeDisabled();
  await expect(page.locator(".voice-session")).toHaveCount(0); await expect(turns(page)).toHaveCount(0);
  for (const route of ["/voice-session-fixture", "/fixtures/voice", "/tests/voice-session", "/harness/fixture.js"]) expect((await page.request.get(`http://127.0.0.1:3120${route}`)).status()).toBe(404);
  await expect(page.locator("main")).not.toContainText(/FIXTURE08C|synthetic spoken question|Isolated voice controls/);
  await capture(page, info, "production");
});
