import { test, expect, type Page, type TestInfo } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
type Mode = "voice" | "text";
const choose = (p: Page, m: Mode) => p.getByRole("button", { name: m === "voice" ? "Voice mode" : "Text mode", exact: true });
const start = (p: Page, m: Mode) => p.getByRole("button", { name: m === "voice" ? /^(Start|Retry) voice$/ : /^(Start chat|Start a fresh text session)$/, exact: true });
const turns = (p: Page) => p.locator(".transcript-turn");
const question = (p: Page) => p.getByRole("textbox", { name: "Your question", includeHidden: true });
const selected = (p: Page, m: Mode) => p.locator(`.${m}-session-status`);
async function act(p: Page, name: string) {
  const revision = await p.getByLabel("Fixture revision").textContent();
  await p.getByRole("button", { name, exact: true, includeHidden: true }).evaluate((b: HTMLButtonElement) => b.click());
  await expect(p.getByLabel("Fixture revision")).not.toHaveText(revision!);
}
type Transport = { closes: number; subscriptions: number; unsubscribes: number; listening: boolean; questions: number; responses: number; exact: string[]; commands: { type: string; event_id: string; item_id?: string }[]; trace: string[] };
type Base = { states: (string | { phase: string })[]; disposed: number; turns: number; prepare: number; connects: number; timers: number };
type Audit = {
  ownership: { maxOwners: number; maxTransferred: number; maxUntransferred: number; untransferred: number; owners: number; transferred: number; chronology: { event: string; owner?: number; liveOwners?: number; liveTransferred?: number; mode?: Mode; source?: string }[] };
  voice: (Base & { media: number; resources: { closes: number; playbackReleases: number; plays: number; mediaReleases: number; mediaReturned: boolean; transport: Transport;
    tracks: { enabled: boolean; stops: number; listeners: number; removals: number; subscriptions: number }[] }[] })[];
  text: (Base & { transports: Transport[] })[];
};
async function audit(p: Page): Promise<Audit> { await act(p, "Refresh audit"); return JSON.parse((await p.getByLabel("Fixture audit").textContent())!); }
const opposite = (m: Mode): Mode => m === "voice" ? "text" : "voice";
async function mode(p: Page, m: Mode, scenario = "success") {
  await p.getByLabel(m === "voice" ? "Voice scenario" : "Text scenario").selectOption(scenario);
  // Scenario is captured per owner. Deliberate remount exercises the real selector.
  await choose(p, opposite(m)).click(); await choose(p, m).click();
}
async function prime(p: Page, m: Mode) {
  for (const ack of ["initial", "source", "final"]) await act(p, `${m === "voice" ? "Voice" : "Text"} ACK ${ack}`);
}
async function begin(p: Page, m: Mode) {
  if (await start(p, m).isVisible()) await start(p, m).click(); await prime(p, m);
  await expect(selected(p, m)).toContainText(m === "voice" ? "Voice session ready" : "Ready for your question");
}
const exact = "FIXTURE10C question 日本語\nWhat does this source say?";
async function ask(p: Page) { await question(p).fill(exact); await p.getByRole("button", { name: "Send question", exact: true }).click(); }
async function textAnswer(p: Page, finish = false) { await act(p, "Text ACK receipt"); await act(p, "Text answer"); if (finish) await act(p, "Text finish"); }
async function capture(p: Page, info: TestInfo, name: string) {
  await mkdir(`${process.env.VERIFICATION_ROOT ?? "artifacts/local"}/11b/screenshots`, { recursive: true });
  await p.locator('pre[aria-label="Fixture audit"], output[aria-label="Fixture revision"]').evaluateAll(es => es.forEach(e => { (e as HTMLElement).style.display = "none"; }));
  const details = p.locator("details").filter({ has: p.getByText("Fixture controls", { exact: true }) });
  const wasOpen = await details.count() > 0 && await details.getAttribute("open") !== null;
  await details.evaluateAll(es => es.forEach(e => { (e as HTMLDetailsElement).open = false; }));
  if (name.includes("200-text")) await p.locator(name.startsWith("voice") ? ".voice-session-status" : ".text-session-status").evaluate(e => e.scrollIntoView({ block: "start" }));
  await p.screenshot({ path: `${process.env.VERIFICATION_ROOT ?? "artifacts/local"}/11b/screenshots/${info.project.name}-${name}.png`, fullPage: !name.includes("200-text") });
  await p.locator('pre[aria-label="Fixture audit"], output[aria-label="Fixture revision"]').evaluateAll(es => es.forEach(e => { (e as HTMLElement).style.display = ""; }));
  if (wasOpen) await details.evaluateAll(es => es.forEach(e => { (e as HTMLDetailsElement).open = true; }));
}
async function fits(p: Page) {
  expect(await p.evaluate(() => ({ page: document.documentElement.scrollWidth <= innerWidth,
    buttons: [...document.querySelectorAll(".conversation-area button")].filter(e => e.getClientRects().length > 0).every(e => { const b = e.getBoundingClientRect(); return b.width <= innerWidth && b.height >= 48 && e.scrollWidth <= e.clientWidth + 1; }),
    text: [...document.querySelectorAll(".transcript-text")].every(e => e.scrollWidth <= e.clientWidth + 1) }))).toEqual({ page: true, buttons: true, text: true });
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
    const tracked = new Map<string, Set<EventListenerOrEventListenerObject>>();
    const rawAdd = window.addEventListener, rawRemove = window.removeEventListener;
    const stale: (() => void)[] = [];
    Reflect.set(window, "recoveryListeners", { tracked, stale });
    window.addEventListener = function(type: string, listener: EventListenerOrEventListenerObject | null, options?: boolean | AddEventListenerOptions) {
      if (["pagehide", "pageshow", "offline", "online"].includes(type) && listener) {
        const set = tracked.get(type) ?? new Set(); set.add(listener); tracked.set(type, set);
        if (type === "online" && typeof listener === "function") stale.push(() => listener(new Event("online")));
      }
      if (listener) rawAdd.call(this, type, listener, options);
    };
    window.removeEventListener = function(type: string, listener: EventListenerOrEventListenerObject | null, options?: boolean | EventListenerOptions) {
      if (listener) { tracked.get(type)?.delete(listener); rawRemove.call(this, type, listener, options); }
    };
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
  await expect(start(page, "text")).toBeEnabled();
});


test.afterEach(async ({ page }, info) => {
  let records: Audit | undefined;
  await expect(page.locator("main")).not.toContainText(/PRIVATE10C_ERROR|STALE10C_MUST_NOT_APPEAR/);
  if (new URL(page.url()).port === "3123") {
    await act(page, "Unmount session"); await act(page, "Release all"); await act(page, "Deliver stale events"); records = await audit(page);
    expect(await page.evaluate(() => [...Reflect.get(window, "recoveryListeners").tracked.values()].map((s: Set<unknown>) => s.size))).toEqual([0, 0, 0, 0]);
    expect(records.ownership).toMatchObject({ maxOwners: 1, owners: 0, transferred: 0, untransferred: 0, identityReused: false, controllerReused: false }); expect(records.ownership.maxTransferred).toBeLessThanOrEqual(1);
    let live = 0;
    for (const e of records.ownership.chronology) {
      if (e.event === "mount") live++; if (e.event === "dispose") live--;
      expect(live).toBeGreaterThanOrEqual(0); expect(live).toBeLessThanOrEqual(1);
    }
    expect(live).toBe(0);
    for (const r of [...records.voice, ...records.text]) { expect(r.disposed).toBe(1); expect(r.timers).toBe(0); expect(r.turns).toBe(0); }
    const transports = [...records.text.flatMap(r => r.transports), ...records.voice.flatMap(r => r.resources.map(x => x.transport))];
    for (const t of transports) {
      expect(t.closes).toBe(1); expect(t.unsubscribes).toBe(t.subscriptions); expect(t.listening).toBe(false);
      expect(new Set(t.commands.map(c => c.event_id)).size).toBe(t.commands.length);
      expect(t.commands.filter(c => c.type === "session.update").length).toBeLessThanOrEqual(2);
      const items = t.commands.filter(c => c.item_id).map(c => c.item_id); expect(new Set(items).size).toBe(items.length);
      const close = t.trace.indexOf("close"); expect(close).toBeGreaterThanOrEqual(0);
      expect(t.trace.slice(close + 1).some(e => e.startsWith("send:"))).toBe(false);
    }
    for (const r of records.voice) for (const x of r.resources) {
      expect(x.closes).toBe(1); expect(x.playbackReleases).toBe(1); expect(x.mediaReleases).toBe(x.mediaReturned ? 1 : 0);
      for (const t of x.tracks) { expect(t.enabled).toBe(false); expect(t.stops).toBe(x.mediaReturned ? 1 : 0); expect(t.listeners).toBe(0); expect(t.removals).toBe(t.subscriptions); }
    }
    for (const r of records.text) for (const t of r.transports) { expect(t.questions).toBeLessThanOrEqual(1); expect(t.responses).toBeLessThanOrEqual(1); }
  }
  const counters = await page.evaluate(() => ({ ...Reflect.get(window, "fixtureAudit"), localStorage: localStorage.length, sessionStorage: sessionStorage.length }));
  expect(counters).toEqual({ media: 0, peers: 0, sockets: 0, audio: 0, scrollListeners: 0, abortListeners: 0, localStorage: 0, sessionStorage: 0 });
  const observed = observations.get(page)!;
  await writeFile(info.outputPath("safe-counts.json"), JSON.stringify({ context: "actual composed controllers; scripted adapters/answers/clock; no provider/device/audio", ...observed, counters, records }, null, 2));
  expect(observed.external).toEqual([]); expect(observed.errors).toEqual([]);
});

const stages: Record<Mode, string[]> = {
  voice: ["preparation", "connection", "priming", "microphone", "playback", "cancel", "clear", "answer"],
  text: ["preparation", "connection", "priming", "admission", "write", "receipt", "response", "answer"],
};
async function pending(p: Page, m: Mode, stage: string) {
  const held = ["preparation", "connection", "microphone", "playback", "cancel", "clear", "admission", "write"].includes(stage);
  await mode(p, m, held ? `hold-${stage}` : "success"); await start(p, m).click();
  if (["preparation", "connection", "priming"].includes(stage)) return;
  await prime(p, m);
  if (m === "voice") {
    if (stage === "playback") expect((await audit(p)).voice.at(-1)!.resources.at(-1)!.plays).toBe(1); // Automatic intended-on playback is held.
    if (["cancel", "clear", "answer"].includes(stage)) await act(p, "Voice answer");
    if (["cancel", "clear"].includes(stage)) await p.getByRole("button", { name: "Interrupt answer", exact: true }).click();
  } else {
    await ask(p);
    if (["response", "answer"].includes(stage)) await act(p, "Text ACK receipt");
    if (stage === "answer") await act(p, "Text answer");
    if (stage === "write") await act(p, "Text ACK receipt"); // ACK before settled write
    if (stage === "receipt") await act(p, "Text ACK added"); // nonfinal receipt
  }
}

async function connectivity(p: Page, online: boolean, dispatch = true) {
  await p.evaluate(({ online, dispatch }) => {
    Object.defineProperty(navigator, "onLine", { configurable: true, get: () => online });
    if (dispatch) window.dispatchEvent(new Event(online ? "online" : "offline"));
  }, { online, dispatch });
}
async function departure(p: Page, persisted: boolean, type = "pagehide") {
  const sync = await p.evaluate(({ persisted, type }) => {
    window.dispatchEvent(new PageTransitionEvent(type, { persisted }));
    return Reflect.get(window, "recoverySynchronousAudit")?.();
  }, { persisted, type });
  if (type === "pagehide" && sync) {
    expect(sync.ownership.transferred).toBe(0);
    expect([...sync.voice, ...sync.text].every(r => r.phase === "idle" || r.phase === "ended" || r.phase === "failed")).toBe(true);
  }
}
async function restart(p: Page, m: Mode) {
  await start(p, m).click();
  await expect(selected(p, m)).toContainText("Loading your source");
  await prime(p, m);
}

for (const m of ["voice", "text"] as const) for (const stage of stages[m]) for (const signal of ["persisted", "discarded", "offline"] as const)
test(`${m} ${stage}: ${signal} releases resources; departure or explicit End cancels recovery`, async ({ page }) => {
  await pending(page, m, stage);
  const old = (await audit(page))[m].at(-1)!;
  const content = await page.locator(".transcript-text").allTextContents();
  const draft = m === "text" ? await question(page).inputValue() : "";
  if (signal === "offline") await connectivity(page, false);
  else await departure(page, signal === "persisted");
  // Assert transferred resources released in the same JS dispatch turn, not an effect.
  const stopped = await audit(page);
  expect(stopped.ownership.transferred).toBe(0);
  expect(stopped[m].at(-1)!.timers).toBe(0);
  const ended = stopped[m].at(-1)!.states.filter(s => (typeof s === "string" ? s : s.phase) === "ended");
  expect(ended).toHaveLength(1);
  for (let n = 0; n < 3; n++) {
    if (signal === "offline") await connectivity(page, false); else await departure(page, signal === "persisted");
  }
  await act(page, "Release all"); await act(page, "Deliver stale events");
  expect(await page.locator(".transcript-text").allTextContents()).toEqual(content);
  if (m === "text") await expect(question(page)).toHaveValue(draft);
  if (m === "voice" && signal === "offline" && await page.getByRole("button", { name: "End voice", exact: true }).isVisible()) {
    await expect(selected(page, m)).toContainText("we’ll reconnect");
    await page.getByRole("button", { name: "End voice", exact: true }).click();
  }
  await expect(start(page, m)).toBeDisabled();
  if (signal === "offline") { await expect(selected(page, m)).toContainText("appear to be offline"); await connectivity(page, true); }
  else { await expect(selected(page, m)).toContainText("page departure"); await departure(page, true, "pageshow"); }
  for (let n = 0; n < 3; n++) { await connectivity(page, true); await departure(page, true, "pageshow"); }
  const after = (await audit(page))[m].at(-1)!;
  expect(after.states.filter(s => (typeof s === "string" ? s : s.phase) === "ended")).toHaveLength(1);
  expect(after.prepare).toBe(old.prepare); expect(after.connects).toBe(old.connects);
  await expect(start(page, m)).toBeEnabled();
  await expect(page.locator(".text-source")).toContainText("source A");
  // A deliberate new owner and source can proceed; the old returns remain inert.
  await choose(page, opposite(m)).click(); await act(page, "Replace source"); await begin(page, opposite(m));
  await act(page, "Deliver stale events");
  await expect(page.locator(".text-source")).toContainText("source B");
  await expect(selected(page, opposite(m))).toContainText(opposite(m) === "voice" ? "Voice session ready" : "Ready for your question");
});

for (const m of ["voice", "text"] as const) test(`${m}: partial answer retained, offline/online recovery requires fresh ACKs`, async ({ page }, info) => {
  await mode(page, m); await begin(page, m);
  if (m === "voice") await act(page, "Voice answer"); else { await ask(page); await textAnswer(page); }
  await expect(turns(page)).toHaveCount(2);
  await choose(page, m).focus();
  const before = await page.locator(".transcript-text").allTextContents();
  await connectivity(page, false);
  await expect(choose(page, m)).toBeFocused();
  await expect(selected(page, m)).not.toContainText(/session ready|Ready for your question|Use Start/);
  if (m === "voice") await expect(page.getByRole("button", { name: "End voice", exact: true })).toBeEnabled();
  else await expect(start(page, m)).toBeDisabled();
  await page.getByRole("button", { name: "Inspect source", exact: true }).click(); await expect(page.locator(".page-text")).toBeVisible();
  expect(await page.locator(".transcript-text").allTextContents()).toEqual(before);
  await expect(page.locator(".transcript-part").last()).toContainText("Text unfinished when the conversation stopped");
  await capture(page, info, `${m}-offline`); await fits(page);
  await connectivity(page, true);
  if (m === "voice") {
    await expect.poll(async () => (await audit(page)).voice.at(-1)!.prepare).toBe(2);
    await expect(turns(page)).toHaveCount(2);
  } else {
    await expect(selected(page, m)).toContainText("Connection may be back");
    expect((await audit(page))[m].at(-1)!.prepare).toBe(1);
    await start(page, m).click();
    expect((await audit(page))[m].at(-1)!.prepare).toBe(2);
    await expect(turns(page)).toHaveCount(0);
  }
  if (m === "text") await expect(page.getByRole("button", { name: "Send question", exact: true })).toBeDisabled();
  else expect((await audit(page)).voice.at(-1)!.media).toBe(1);
  await act(page, `${m === "voice" ? "Voice" : "Text"} ACK initial`);
  await act(page, `${m === "voice" ? "Voice" : "Text"} ACK source`);
  await expect(selected(page, m)).toContainText(m === "voice" ? "Reconnecting" : "Loading your source");
  await act(page, `${m === "voice" ? "Voice" : "Text"} ACK final`);
  if (m === "voice") {
    expect((await audit(page)).voice.at(-1)!.media).toBe(1);
    await act(page, "Voice ACK history");
    await expect(turns(page)).toHaveCount(2);
    expect(await page.locator(".transcript-text").allTextContents()).toEqual(before);
  }
  await expect(selected(page, m)).toContainText(m === "voice" ? "Reconnected" : "Ready for your question");
  if (m === "voice") {
    await expect(selected(page, m)).toHaveText("Reconnected");
    await page.clock.runFor(3100);
    await expect(selected(page, m)).not.toContainText("Reconnected");
    await expect(selected(page, m)).toHaveClass(/visually-hidden/);
    await expect(turns(page)).toHaveCount(2);
  }
  const records = await audit(page);
  const commands = m === "voice" ? records.voice.at(-1)!.resources : records.text.at(-1)!.transports;
  expect(commands).toHaveLength(2);
  const transports = m === "voice" ? records.voice.at(-1)!.resources.map(r => r.transport) : records.text.at(-1)!.transports;
  const previousItems = new Set(transports[0].commands.map(c => c.item_id).filter(Boolean));
  expect(transports[1].commands.filter(c => c.item_id && previousItems.has(c.item_id))).toHaveLength(0);
  if (m === "text") expect(records.text.at(-1)!.transports[1].questions).toBe(0);
  await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
  await connectivity(page, false);
  await selected(page, m).evaluate(e => e.scrollIntoView({ block: "start" }));
  await fits(page); await capture(page, info, `${m}-200-text`);
});

test("unconfirmed question survives offline, late receipt and online without retransmission", async ({ page }, info) => {
  await begin(page, "text"); await ask(page); await act(page, "Text ACK added");
  await question(page).focus(); await connectivity(page, false);
  await expect(question(page)).toBeFocused(); await expect(question(page)).toHaveValue(exact);
  await expect(question(page)).toHaveAttribute("readonly", "");
  await expect(page.getByRole("button", { name: "Send question", exact: true })).toBeDisabled();
  await act(page, "Deliver stale events"); await connectivity(page, true);
  await expect(question(page)).toHaveValue(exact); await expect(turns(page)).toHaveCount(0);
  const a = await audit(page); expect(a.text.at(-1)!.transports[0]).toMatchObject({ questions: 1, responses: 0, closes: 1 });
  await capture(page, info, "unconfirmed-online"); await restart(page, "text");
  await expect(question(page)).toHaveValue(exact); // Accepted draft retention; no automatic retransmission.
  expect((await audit(page)).text.at(-1)!.transports[1].questions).toBe(0);
});

for (const m of ["voice", "text"] as const) for (const stage of ["priming", "answer"])
test(`${m}: authoritative transport closure in ${stage} while browser is online`, async ({ page }, info) => {
  await pending(page, m, stage);
  expect(await page.evaluate(() => navigator.onLine)).toBe(true);
  const before = await page.locator(".transcript-text").allTextContents();
  await act(page, `Close ${m} transport`);
  if (m === "voice" && stage === "answer") {
    await expect(selected(page, m)).toContainText("Reconnecting");
    await page.getByRole("button", { name: "End voice", exact: true }).click();
  } else await expect(selected(page, m)).toContainText("connection failed or closed");
  await expect(selected(page, m)).not.toContainText("appear to be offline");
  await connectivity(page, true); // duplicate online must not hide the failure
  if (m !== "voice" || stage !== "answer") await expect(selected(page, m)).toContainText("connection failed or closed");
  expect(await page.locator(".transcript-text").allTextContents()).toEqual(before);
  expect((await audit(page)).ownership.transferred).toBe(0);
  await capture(page, info, `${m}-${stage}-closed`);
  await restart(page, m);
  await expect(selected(page, m)).toContainText(m === "voice" ? "Voice session ready" : "Ready for your question");
});

for (const m of ["voice", "text"] as const) test(`${m}: synchronous click guards, hidden tab, replaced owner and initially offline mount`, async ({ page }) => {
  await mode(page, m, m === "voice" ? "blocked-playback" : "success");
  // The event is intentionally withheld: an enabled DOM button must still be guarded.
  await connectivity(page, false, false);
  await start(page, m).evaluate((b: HTMLButtonElement) => b.click());
  expect((await audit(page))[m].at(-1)!.prepare).toBe(0);
  await choose(page, opposite(m)).click(); await choose(page, m).click();
  await expect(start(page, m)).toBeDisabled();
  expect(await page.evaluate(() => [...Reflect.get(window, "recoveryListeners").tracked.values()].map((s: Set<unknown>) => s.size))).toEqual([1, 1, 1, 1]);
  await connectivity(page, true); await begin(page, m);
  await page.evaluate(() => { Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "hidden" }); document.dispatchEvent(new Event("visibilitychange")); });
  await expect(selected(page, m)).toContainText(m === "voice" ? "Voice session ready" : "Ready for your question");
  if (m === "text") {
    await question(page).fill(exact); await connectivity(page, false, false);
    await page.getByRole("button", { name: "Send question", exact: true }).evaluate((b: HTMLButtonElement) => b.click());
    expect((await audit(page)).text.at(-1)!.transports[0].questions).toBe(0);
  } else {
    await connectivity(page, false, false);
    const plays = (await audit(page)).voice.at(-1)!.resources[0].plays;
    expect(plays).toBe(1); // Automatic intended-on attempt was blocked by the fixture.
    await page.getByRole("button", { name: "Tap to enable sound", exact: true }).evaluate((b: HTMLButtonElement) => b.click());
    expect((await audit(page)).voice.at(-1)!.resources[0].plays).toBe(plays);
  }
  await act(page, "Replace source"); await choose(page, opposite(m)).click();
  await connectivity(page, true);
  await page.evaluate(() => Reflect.get(window, "recoveryListeners").stale.slice(0, -1).forEach((f: () => void) => f()));
  expect((await audit(page))[opposite(m)].at(-1)!.prepare).toBe(0);
  await begin(page, opposite(m));
});

test("production stays unavailable through browser events and query attempts", async ({ page }) => {
  await page.goto("http://127.0.0.1:3124/?fixture=11b&recovery=true");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Bring a source.Start a chat.");
  await connectivity(page, false); await connectivity(page, true); await departure(page, true); await departure(page, true, "pageshow");
  await expect(page.locator(".conversation-area")).toBeHidden();
  await expect(page.getByRole("button", { name: "Upload a PDF" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Add a YouTube video" })).toBeDisabled();
  await expect(page.getByText("Source import is unavailable right now. Please check again later.")).toBeVisible();
  for (const path of ["/fixture", "/recovery", "/11b"]) expect((await page.request.get(`http://127.0.0.1:3124${path}`)).status()).toBe(404);
});

test("mixed racing departure/connectivity events cannot start while frozen; rapid replacements clean listeners", async ({ page }) => {
  await begin(page, "text"); await question(page).fill(exact);
  const immediate = await page.evaluate(() => {
    Object.defineProperty(navigator, "onLine", { configurable: true, get: () => false });
    window.dispatchEvent(new Event("offline"));
    window.dispatchEvent(new PageTransitionEvent("pagehide", { persisted: true }));
    Object.defineProperty(navigator, "onLine", { configurable: true, get: () => true });
    window.dispatchEvent(new Event("online"));
    // React may still show the pre-event enabled Send/Start controls.
    (document.querySelector(".text-session-actions button") as HTMLButtonElement).click();
    (document.querySelector(".text-composer button") as HTMLButtonElement).click();
    return Reflect.get(window, "recoverySynchronousAudit")();
  });
  expect(immediate.ownership.transferred).toBe(0);
  await expect(selected(page, "text")).toContainText("page departure");
  await expect(page.getByRole("button", { name: "Start a fresh text session" })).toBeDisabled();
  await departure(page, true, "pageshow"); await expect(question(page)).toHaveValue(exact);
  expect((await audit(page)).text.at(-1)!.prepare).toBe(1);
  await connectivity(page, false);
  for (let n = 0; n < 6; n++) { await choose(page, n % 2 ? "text" : "voice").click(); await act(page, "Replace source"); }
  await connectivity(page, true);
  await page.evaluate(() => Reflect.get(window, "recoveryListeners").stale.slice(0, -1).forEach((f: () => void) => f()));
  expect(await page.evaluate(() => [...Reflect.get(window, "recoveryListeners").tracked.values()].map((s: Set<unknown>) => s.size))).toEqual([1, 1, 1, 1]);
  expect((await audit(page)).text.at(-1)!.prepare).toBe(0);
  await begin(page, "text");
});

for (const m of ["voice", "text"] as const) test(`${m}: default budget gate and ordinary Stop stay distinct from offline and transport failure`, async ({ page }) => {
  await mode(page, m, "source-default"); await start(page, m).click();
  await expect(selected(page, m)).toContainText(m === "voice" ? "cannot be used for a conversation in this build" : "could not be loaded into chat within its limits");
  expect((await audit(page))[m].at(-1)!.connects).toBe(0);
  await mode(page, m); await begin(page, m);
  await page.getByRole("button", { name: m === "voice" ? "End voice" : "Stop text session", exact: true }).click();
  await expect(selected(page, m)).toContainText("Session ended.");
  await expect(selected(page, m)).not.toContainText(/offline|page departure|connection failed/);
  if (m === "text") {
    await restart(page, m); await act(page, "Fail text");
    await expect(selected(page, m)).toContainText("text session failed");
    await expect(selected(page, m)).not.toContainText(/offline|page departure|connection failed/);
  }
});

test("actual browser back/forward navigation observation, BFCache reported separately", async ({ page }, info) => {
  await begin(page, "text"); await ask(page); await textAnswer(page);
  // Add observational listeners after lifecycle to see synchronous release in pagehide.
  await page.evaluate(() => {
    const state = { shows: [] as boolean[], hidden: false, stopped: false };
    Reflect.set(window, "navigationObservation", state);
    const hide = () => {
      state.hidden = true;
      state.stopped = Reflect.get(window, "recoverySynchronousAudit")().ownership.transferred === 0;
    };
    const show = (event: PageTransitionEvent) => state.shows.push(event.persisted);
    window.addEventListener("pagehide", hide);
    window.addEventListener("pageshow", show);
    Reflect.set(window, "removeNavigationObservers", () => { window.removeEventListener("pagehide", hide); window.removeEventListener("pageshow", show); });
  });
  await page.goto("/away"); await page.goBack();
  await expect(page.getByRole("heading", { name: "Isolated mode switching fixture 10C" })).toBeVisible();
  const navigation = await page.evaluate(() => Reflect.get(window, "navigationObservation") ?? null);
  const restored = navigation?.shows.includes(true) === true;
  await page.evaluate(() => Reflect.get(window, "removeNavigationObservers")?.());
  if (restored) {
    await expect(selected(page, "text")).toContainText("page departure");
    expect((await audit(page)).ownership.transferred).toBe(0);
    await expect(turns(page)).toHaveCount(2);
  } else {
    await expect(start(page, "text")).toBeEnabled(); await expect(turns(page)).toHaveCount(0);
  }
  await writeFile(info.outputPath("actual-navigation.json"), JSON.stringify({ actualBackNavigation: "PASS", actualBFCacheRestoration: restored ? "PASS" : "NOT_RUN: browser restored by reload; persisted pageshow not established", navigation }, null, 2));
  await page.goForward(); await expect(page).toHaveTitle("Away"); await page.goBack();
  await expect(page.getByRole("heading", { name: "Isolated mode switching fixture 10C" })).toBeVisible();
  await page.getByText("Fixture controls", { exact: true }).click();
});

test("voice reconnect attempts are bounded; manual retry retains chat and End cancels it", async ({ page }) => {
  await mode(page, "voice"); await begin(page, "voice"); await act(page, "Voice answer");
  await page.clock.install();
  await act(page, "Close voice transport");
  for (const [i, wait] of [1000, 3000, 7000].entries()) {
    await page.clock.runFor(wait + 100);
    expect((await audit(page)).voice.at(-1)!.prepare).toBe(i + 2);
    await act(page, "Close voice transport");
  }
  await expect(selected(page, "voice")).toContainText("Couldn’t reconnect");
  await expect(turns(page)).toHaveCount(2);
  await page.clock.runFor(30000);
  expect((await audit(page)).voice.at(-1)!.prepare).toBe(4);
  await page.getByRole("button", { name: "Retry connection", exact: true }).click();
  await page.clock.runFor(1100);
  expect((await audit(page)).voice.at(-1)!.prepare).toBe(5);
  await page.getByRole("button", { name: "End voice", exact: true }).click();
  await act(page, "Deliver stale events"); await page.clock.runFor(30000);
  expect((await audit(page)).voice.at(-1)!.prepare).toBe(5);
  expect((await audit(page)).ownership.transferred).toBe(0);
});

for (const action of ["mode", "source", "departure"] as const)
test(`voice pending reconnect is cancelled by ${action}`, async ({ page }) => {
  await mode(page, "voice"); await begin(page, "voice"); await act(page, "Voice answer");
  await page.clock.install(); await act(page, "Close voice transport");
  if (action === "mode") await choose(page, "text").click();
  else if (action === "source") await act(page, "Replace source");
  else await departure(page, true);
  await page.clock.runFor(15000); await act(page, "Deliver stale events");
  const result = await audit(page);
  expect(result.voice.every(r => r.prepare <= 1)).toBe(true);
  expect(result.voice.flatMap(r => r.resources).every(r => r.closes === 1)).toBe(true);
  expect(result.ownership.transferred).toBe(action === "mode" ? 1 : 0);
  if (action === "mode") {
    await expect(turns(page)).toHaveCount(2);
    await prime(page, "text"); await act(page, "Text ACK history");
    await expect(selected(page, "text")).toContainText("Ready for your question");
    expect((await audit(page)).text.at(-1)!.transports[0]).toMatchObject({ questions: 0, responses: 0 });
  }
});
