import { test, expect, type Page, type TestInfo } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
type Mode = "voice" | "text";
const choose = (p: Page, m: Mode) => p.getByRole("button", { name: m === "voice" ? "Voice mode" : "Text mode", exact: true });
const start = (p: Page, m: Mode) => p.getByRole("button", { name: m === "voice" ? /^(Start|Retry) voice$/ : "Start chat", exact: true });
const turns = (p: Page) => p.locator(".transcript-turn");
const question = (p: Page) => p.getByRole("textbox", { name: "Your question", includeHidden: true });
const selected = (p: Page, m: Mode) => p.locator(`.${m}-session-status`);
async function act(p: Page, name: string) {
  const revision = await p.getByLabel("Fixture revision").textContent();
  await p.getByRole("button", { name, exact: true, includeHidden: true }).evaluate((b: HTMLButtonElement) => b.click());
  await expect(p.getByLabel("Fixture revision")).not.toHaveText(revision!);
}
type Transport = { closes: number; subscriptions: number; unsubscribes: number; listening: boolean; questions: number; responses: number; exact: string[]; commands: { type: string; event_id: string; item_id?: string }[]; trace: string[] };
type Base = { disposed: number; turns: number; prepare: number; connects: number; timers: number };
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
  await start(p, m).click(); await prime(p, m);
  await expect(selected(p, m)).toContainText(m === "voice" ? "Voice session ready" : "Ready for your question");
}
const exact = "FIXTURE10C question 日本語\nWhat does this source say?";
async function ask(p: Page) { await question(p).fill(exact); await p.getByRole("button", { name: "Send question", exact: true }).click(); }
async function textAnswer(p: Page, finish = false) { await act(p, "Text ACK receipt"); await act(p, "Text answer"); if (finish) await act(p, "Text finish"); }
async function capture(p: Page, info: TestInfo, name: string) {
  await mkdir(`${process.env.VERIFICATION_ROOT ?? "artifacts/local"}/12e/regression/10c/screenshots`, { recursive: true });
  await p.locator('pre[aria-label="Fixture audit"], output[aria-label="Fixture revision"]').evaluateAll(es => es.forEach(e => { (e as HTMLElement).style.display = "none"; }));
  const details = p.locator("details").filter({ has: p.getByText("Fixture controls", { exact: true }) });
  const wasOpen = await details.count() > 0 && await details.getAttribute("open") !== null;
  await details.evaluateAll(es => es.forEach(e => { (e as HTMLDetailsElement).open = false; }));
  await p.screenshot({ path: `${process.env.VERIFICATION_ROOT ?? "artifacts/local"}/12e/regression/10c/screenshots/${info.project.name}-${name}.png`, fullPage: !name.includes("200-text") });
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
  if (new URL(page.url()).port === "3121") {
    await act(page, "Unmount session"); await act(page, "Release all"); await act(page, "Deliver stale events"); records = await audit(page);
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

test("explicit mode, inert repeat selection, one owner, keyboard focus and no eager resources", async ({ page }) => {
  await expect(page.getByRole("group", { name: "Conversation mode" })).toHaveAccessibleDescription(/ends the session and clears/);
  await expect(choose(page, "text")).toHaveAttribute("aria-pressed", "true");
  const a = await audit(page); expect(a.voice).toHaveLength(0); expect(a.text.every(r => r.prepare === 0)).toBe(true);
  await choose(page, "text").dblclick(); expect((await audit(page)).text.length).toBe(a.text.length);
  await choose(page, "voice").focus(); await page.keyboard.press("Enter"); await expect(choose(page, "voice")).toBeFocused();
  await expect(page.locator(".text-session")).toHaveCount(0); await expect(start(page, "voice")).toBeEnabled();
  const b = await audit(page); expect(b.text.every(r => r.disposed === 1)).toBe(true); expect(b.voice.every(r => r.prepare === 0 && r.media === 0 && r.connects === 0)).toBe(true);
  await choose(page, "voice").dblclick(); expect((await audit(page)).voice.length).toBe(b.voice.length);
  await choose(page, "text").focus(); await page.keyboard.press("Space"); await expect(choose(page, "text")).toBeFocused(); await expect(question(page)).toHaveValue("");
});

test("repeat text selection preserves an unsent draft; switching and returning clears it before Start", async ({ page }) => {
  await begin(page, "text"); await question(page).fill("Unsent draft 雪");
  const before = (await audit(page)).text.length;
  await choose(page, "text").dblclick(); await expect(question(page)).toHaveValue("Unsent draft 雪"); expect((await audit(page)).text.length).toBe(before);
  await choose(page, "voice").click(); await choose(page, "text").click(); await expect(question(page)).toHaveValue("");
  expect((await audit(page)).text.at(-1)!.prepare).toBe(0); await expect(start(page, "text")).toBeEnabled();
});

for (const failure of ["denied", "unavailable", "ended"]) test(`${failure} microphone to complete text exchange and deliberate fresh voice ACKs`, async ({ page }, info) => {
  await mode(page, "voice", failure === "denied" ? "denied-microphone" : failure === "unavailable" ? "hold-microphone" : "success");
  await start(page, "voice").click(); await prime(page, "voice");
  if (failure === "unavailable") await act(page, "Expire timers"); if (failure === "ended") await act(page, "End microphone");
  await expect(page.getByRole("button", { name: /^(Start|Retry) voice$/ })).toBeEnabled();
  expect((await audit(page)).voice.at(-1)!.resources[0].closes).toBe(1);
  if (failure === "denied") await capture(page, info, "denied");
  await choose(page, "text").click(); await expect(choose(page, "text")).toBeFocused(); await expect(question(page)).toHaveValue("");
  await begin(page, "text"); await ask(page); await textAnswer(page, true);
  await expect(selected(page, "text")).toContainText("Ready for your question"); await expect(turns(page)).toHaveCount(2); await expect(page.locator(".transcript-text").last()).toContainText("Complete synthetic answer");
  if (failure === "denied") await capture(page, info, "text-complete");
  await page.getByLabel("Voice scenario").selectOption("success"); await choose(page, "voice").click();
  await expect(turns(page)).toHaveCount(0); expect((await audit(page)).voice.at(-1)!.prepare).toBe(0);
  await start(page, "voice").click(); expect((await audit(page)).voice.at(-1)!.media).toBe(0);
  await act(page, "Voice ACK initial"); await act(page, "Voice ACK source"); expect((await audit(page)).voice.at(-1)!.media).toBe(0);
  await act(page, "Voice ACK final"); await expect(selected(page, "voice")).toContainText("Voice session ready");
  if (failure === "denied") await capture(page, info, "voice-return");
});

for (const m of ["voice", "text"] as const) for (const state of ["partial", "stopped", "error"]) test(`${m} ${state} switching clears old history and draft; returning starts empty`, async ({ page }) => {
  await mode(page, m); await begin(page, m);
  if (m === "text") { await ask(page); await textAnswer(page); } else await act(page, "Voice answer");
  await expect(turns(page)).toHaveCount(2);
  if (state === "stopped") { await page.getByRole("button", { name: m === "voice" ? "End voice" : "Stop text session", exact: true }).click(); await expect(turns(page)).toHaveCount(2); }
  if (state === "error") await act(page, m === "voice" ? "End microphone" : "Fail text");
  await choose(page, opposite(m)).click(); await expect(turns(page)).toHaveCount(0);
  await choose(page, m).click(); await expect(turns(page)).toHaveCount(0); await expect(start(page, m)).toBeEnabled();
  if (m === "text") await expect(question(page)).toHaveValue("");
  expect((await audit(page))[m].at(-1)!.prepare).toBe(0);
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
    if (stage === "playback") await expect(p.getByRole("button", { name: "Mute speaker", exact: true })).toBeVisible();
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
for (const m of ["voice", "text"] as const) for (const stage of stages[m]) test(`switch ${m} during ${stage}; late resources/events cannot alter successful new session`, async ({ page }, info) => {
  await pending(page, m, stage); const old = (await audit(page))[m].at(-1)!;
  expect(old.prepare).toBe(1); expect(old.connects).toBe(stage === "preparation" ? 0 : 1);
  if (["preparation", "connection"].includes(stage)) await expect(selected(page, m)).toContainText(m === "voice" ? "Preparing the connection" : "Connecting");
  if (stage === "priming") await expect(selected(page, m)).toContainText("Loading your source");
  if (m === "text" && !["preparation", "connection", "priming"].includes(stage)) {
    await expect(selected(page, m)).toContainText({ admission: "Checking whether", write: "Question received. Finishing", receipt: "Receipt has not been confirmed", response: "Waiting for an answer", answer: "Answer arriving" }[stage]!);
  }
  if (m === "voice" && stage === "microphone") await expect(selected(page, m)).toContainText("Waiting for microphone");
  if (m === "voice" && stage === "playback") await expect(page.locator(".voice-device-status")).toContainText("Waiting for playback");
  if (m === "voice" && ["cancel", "clear"].includes(stage)) await expect(page.locator(".voice-media-announcement")).toContainText("Interruption pending");
  if (m === "voice" && stage === "answer") await expect(page.locator(".voice-media-announcement")).toContainText("Answer being generated");
  await choose(page, opposite(m)).click(); await expect(turns(page)).toHaveCount(0);
  await begin(page, opposite(m));
  if (m === "voice") { await ask(page); await textAnswer(page, true); await question(page).fill("New draft remains"); } else await act(page, "Voice answer");
  if (stage === "connection") expect((await audit(page)).ownership).toMatchObject({ untransferred: 1, transferred: 1 });
  const before = await page.locator(".conversation-area").innerText();
  await act(page, "Release all"); await act(page, "Deliver stale events");
  expect(await page.locator(".conversation-area").innerText()).toBe(before);
  const a = await audit(page); expect(a[m].filter(r => r.prepare > 0).at(-1)!.prepare).toBe(old.prepare);
  expect(a.ownership.maxTransferred).toBe(1); expect(a.ownership.maxOwners).toBe(1);
  if (m === "voice") await expect(question(page)).toHaveValue("New draft remains");
  if (["playback", "receipt"].includes(stage)) await capture(page, info, `${m}-${stage}-late`);
});

for (const m of ["voice", "text"] as const) for (const action of ["Replace source", "Remove source", "Unmount session"]) test(`${m} pending resources and ${action} isolate source A from B`, async ({ page }) => {
  await pending(page, m, m === "voice" ? "microphone" : "write"); await act(page, action);
  await expect(turns(page)).toHaveCount(0);
  if (action === "Remove source") {
    await expect(start(page, m)).toBeDisabled();
    await choose(page, opposite(m)).click(); await expect(start(page, opposite(m))).toBeDisabled();
    const a = await audit(page); expect(a.ownership.owners).toBe(0);
    await act(page, "Replace source");
  }
  if (action === "Unmount session") { await act(page, "Replace source"); await act(page, "Mount session"); }
  await page.getByLabel(m === "voice" ? "Voice scenario" : "Text scenario").selectOption("success");
  await choose(page, opposite(m)).click(); await begin(page, opposite(m));
  await expect(page.locator(".text-source")).toContainText(action === "Remove source" ? "source A" : "source B");
  const before = await page.locator(".conversation-area").innerText();
  await act(page, "Release all"); await act(page, "Deliver stale events"); expect(await page.locator(".conversation-area").innerText()).toBe(before);
});

test("rapid voice text voice switches, duplicate Start and abandoned callbacks keep one owner", async ({ page }) => {
  for (let n = 0; n < 5; n++) {
    for (const m of ["voice", "text"] as const) {
      await choose(page, m).click(); await choose(page, m).dblclick();
      await start(page, m).evaluate((b: HTMLButtonElement) => { b.click(); b.click(); });
      expect((await audit(page))[m].at(-1)!.prepare).toBe(1);
    }
  }
  await choose(page, "voice").click(); await begin(page, "voice"); await act(page, "Voice answer");
  const before = await selected(page, "voice").innerText(); await act(page, "Deliver stale events"); expect(await selected(page, "voice").innerText()).toBe(before);
  const a = await audit(page); expect(a.ownership.maxOwners).toBe(1); expect(a.ownership.maxTransferred).toBe(1);
});

for (const m of ["voice", "text"] as const) test(`${m} default source accounting refuses before connection; text default turn refuses`, async ({ page }) => {
  await mode(page, m, "source-default"); await start(page, m).click();
  await expect(selected(page, m)).toContainText(m === "text" ? "could not be loaded into chat within its limits" : "cannot be used"); const a = await audit(page); expect(a[m].at(-1)!.connects).toBe(0);
  if (m === "voice") expect(a.voice.at(-1)!.media).toBe(0);
  await mode(page, "text", "turn-default"); await begin(page, "text"); await ask(page);
  await expect(selected(page, "text")).toContainText("could not be checked"); await expect(question(page)).toHaveValue(exact);
  expect((await audit(page)).text.at(-1)!.transports[0]).toMatchObject({ questions: 0, responses: 0 });
});

for (const m of ["voice", "text"] as const) test(`${m} selected transcript keeps reading and Jump; widths, 200 percent text, reduced motion and source preview`, async ({ page }, info) => {
  await page.emulateMedia({ reducedMotion: "reduce" }); await mode(page, m); await begin(page, m);
  if (m === "text") { await ask(page); await textAnswer(page); } else await act(page, "Voice answer");
  await act(page, m === "voice" ? "Voice long" : "Text long");
  const anchor = turns(page).first().getByRole("heading"); await anchor.scrollIntoViewIfNeeded();
  await choose(page, m).evaluate((b: HTMLButtonElement) => b.focus({ preventScroll: true }));
  const top = await anchor.evaluate(e => e.getBoundingClientRect().top);
  await act(page, m === "voice" ? "Voice long" : "Text long"); expect(await anchor.evaluate(e => e.getBoundingClientRect().top)).toBeCloseTo(top, 0); await expect(choose(page, m)).toBeFocused();
  await page.getByRole("button", { name: "Jump to latest", exact: true }).focus(); await page.keyboard.press("Enter"); await expect(page.locator(".transcript-latest")).toBeFocused();
  await page.getByRole("button", { name: "Inspect source" }).click(); await expect(page.locator(".page-text")).toBeVisible();
  await fits(page); await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; }); await fits(page);
  await page.locator(".source-reader").screenshot({ path: `${process.env.VERIFICATION_ROOT ?? "artifacts/local"}/12e/regression/10c/screenshots/${info.project.name}-${m}-source-preview-200.png` });
  await page.keyboard.press("Tab"); await choose(page, m).focus(); await expect(choose(page, m)).toBeFocused(); expect(await choose(page, m).evaluate(e => getComputedStyle(e).outlineStyle)).not.toBe("none");
  await capture(page, info, `${m}-200-text-preview`);
  await page.evaluate(() => { document.documentElement.style.fontSize = ""; document.body.style.zoom = "2"; }); await fits(page);
});

test("separate production mode selection is real, both owners unavailable, fixture routes and queries inert", async ({ page }, info) => {
  await page.goto("http://127.0.0.1:3122/?fixture=mode-switch&scenario=success&mode=voice");
  await expect(page.locator(".text-session-status")).toContainText("unavailable in this build"); await expect(page.locator("textarea[name=question]")).toBeDisabled();
  await expect(page.locator(".conversation-panel")).toBeHidden();
  await expect(page.locator(".voice-session")).toHaveCount(0); await expect(turns(page)).toHaveCount(0);
  for (const route of ["/mode-switch-fixture", "/fixtures/voice", "/tests/mode-switch", "/harness/fixture.js"]) expect((await page.request.get(`http://127.0.0.1:3122${route}`)).status()).toBe(404);
  await expect(page.locator("main")).not.toContainText(/FIXTURE10C|Isolated mode switching|Complete synthetic answer/); await fits(page); await capture(page, info, "production");
});
