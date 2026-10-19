import { test, expect, type Page, type TestInfo } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";

const exact = "  café 🌱 e\u0301\n雪\t مرحبا  ";
const question = (p: Page) => p.getByRole("textbox", { name: "Your question" });
const send = (p: Page) => p.getByRole("button", { name: "Send question", exact: true });
const start = (p: Page) => p.getByRole("button", { name: "Start text session", exact: true });
const stop = (p: Page) => p.getByRole("button", { name: "Stop text session", exact: true });
const turns = (p: Page) => p.locator(".transcript-turn");
async function act(p: Page, name: string) {
  const revision = await p.getByLabel("Fixture revision").textContent();
  await p.getByRole("button", { name, exact: true, includeHidden: true }).evaluate((b: HTMLButtonElement) => b.click());
  await expect(p.getByLabel("Fixture revision")).not.toHaveText(revision!);
}
type Audit = { disposed: number; prepare: number; connects: number; timers: number; states: string[];
  transports: { questions: number; responses: number; exact: string[]; closes: number; subscriptions: number; unsubscribes: number; listening: boolean; trace: string[] }[] }[];
async function audit(p: Page): Promise<Audit> { await act(p, "Refresh audit"); return JSON.parse((await p.getByLabel("Fixture audit").textContent())!); }
async function mode(p: Page, value: string) { await p.getByLabel("Scenario").selectOption(value); await act(p, "Mount session"); }
async function ready(p: Page) {
  await act(p, "ACK initial"); await expect(send(p)).toBeDisabled();
  await act(p, "ACK source"); await expect(send(p)).toBeDisabled();
  await act(p, "ACK final"); await expect(send(p)).toBeEnabled();
}
async function begin(p: Page) { await start(p).click(); await ready(p); }
async function ask(p: Page, text = exact) { await question(p).fill(text); await send(p).click(); await expect(p.locator(".text-session-status")).toContainText("Receipt has not been confirmed"); }
async function answer(p: Page) { await act(p, "ACK question final"); await act(p, "Begin answer"); await act(p, "Stream partial"); }
async function capture(p: Page, info: TestInfo, name: string) {
  await mkdir("artifacts/local/10b/screenshots", { recursive: true });
  await p.screenshot({ path: `artifacts/local/10b/screenshots/${info.project.name}-${name}.png`, fullPage: !["long-reading", "text-200"].includes(name) });
}
async function fits(p: Page) {
  expect(await p.evaluate(() => ({ page: document.documentElement.scrollWidth <= innerWidth,
    text: [...document.querySelectorAll(".transcript-text, textarea")].every(e => e.scrollWidth <= e.clientWidth + 1),
    controls: [...document.querySelectorAll(".text-session button, .text-session textarea")].every(e => {
      const box = e.getBoundingClientRect(), parent = e.closest(".text-session")!.getBoundingClientRect();
      return box.left >= parent.left - 1 && box.right <= parent.right + 1 && box.width <= innerWidth;
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
    const a = { media: 0, peers: 0, sockets: 0, audio: 0, scrollListeners: 0 };
    Reflect.set(window, "fixtureAudit", a);
    Object.defineProperty(navigator, "mediaDevices", { configurable: true, get() { a.media++; throw new Error("Denied media sentinel"); } });
    for (const [name, key] of [["RTCPeerConnection", "peers"], ["WebSocket", "sockets"], ["Audio", "audio"], ["AudioContext", "audio"]] as const)
      Object.defineProperty(window, name, { configurable: true, get() { a[key]++; throw new Error("Forbidden API access"); } });
    const add = window.addEventListener, remove = window.removeEventListener;
    const listeners = new Set<EventListenerOrEventListenerObject>();
    window.addEventListener = function(type: string, listener: EventListenerOrEventListenerObject | null, options?: boolean | AddEventListenerOptions) { if (type === "scroll" && listener) { listeners.add(listener); a.scrollListeners = listeners.size; } if (listener) return add.call(this, type, listener, options); };
    window.removeEventListener = function(type: string, listener: EventListenerOrEventListenerObject | null, options?: boolean | EventListenerOptions) { if (type === "scroll" && listener) { listeners.delete(listener); a.scrollListeners = listeners.size; } if (listener) return remove.call(this, type, listener, options); };
  });
  await page.goto("/"); await page.getByText("Fixture controls", { exact: true }).click();
  await expect(start(page)).toBeEnabled();
});

test.afterEach(async ({ page }, info) => {
  let records: Audit = [];
  await expect(page.locator("main")).not.toContainText(/PRIVATE10B_ERROR|STALE10B_MUST_NOT_APPEAR/);
  if (new URL(page.url()).port === "3117") {
    await act(page, "Unmount session");
    for (const name of ["Release preparation", "Release connection", "Release admission", "Deliver stale events"]) await act(page, name);
    records = await audit(page);
    for (const r of records) {
      expect(r.disposed).toBe(1); expect(r.timers).toBe(0);
      for (const t of r.transports) { expect(t.closes).toBe(1); expect(t.unsubscribes).toBe(t.subscriptions); expect(t.listening).toBe(false); }
    }
  }
  const counters = await page.evaluate(() => ({ ...Reflect.get(window, "fixtureAudit"), localStorage: localStorage.length, sessionStorage: sessionStorage.length }));
  expect(counters).toEqual({ media: 0, peers: 0, sockets: 0, audio: 0, scrollListeners: new URL(page.url()).port === "3117" ? 0 : 1, localStorage: 0, sessionStorage: 0 });
  const evidence = observations.get(page)!;
  await writeFile(info.outputPath("safe-counts.json"), JSON.stringify({ context: "local synthetic transports/accounting; denied media sentinel; Chromium viewport only", ...evidence, counters, records }, null, 2));
  expect(evidence.external).toEqual([]); expect(evidence.errors).toEqual([]);
});

test("explicit start, exact Unicode, finalized receipt barrier, one response and fresh same-question receipt", async ({ page }, info) => {
  expect((await audit(page)).every(r => r.prepare === 0 && r.connects === 0)).toBe(true);
  await begin(page); await question(page).focus(); await page.keyboard.insertText(exact);
  await page.keyboard.press("Enter"); await page.keyboard.press("Shift+Enter");
  await expect(question(page)).toHaveValue(exact + "\n\n");
  expect((await audit(page)).at(-1)!.transports[0].questions).toBe(0);
  await question(page).fill(exact); await send(page).click();
  await expect(question(page)).toHaveValue(exact);
  await send(page).evaluate((b: HTMLButtonElement) => { b.click(); b.click(); });
  await question(page).press("Enter");
  await act(page, "ACK question added");
  let t = (await audit(page)).at(-1)!.transports[0]; expect(t.questions).toBe(1); expect(t.responses).toBe(0); expect(t.exact).toEqual([exact]);
  await expect(question(page)).toHaveValue(exact); await expect(turns(page)).toHaveCount(0);
  await act(page, "ACK question final"); await expect(question(page)).toHaveValue("");
  t = (await audit(page)).at(-1)!.transports[0]; expect(t.responses).toBe(1);
  expect(t.trace.slice(-3)).toEqual(["receive:conversation.item.added", "receive:conversation.item.done", "send:response.create"]);
  await act(page, "Begin answer"); await act(page, "Stream partial"); await expect(turns(page)).toHaveCount(2);
  await capture(page, info, "partial"); await act(page, "Finish answer"); await expect(send(page)).toBeEnabled();
  await expect(turns(page).first().locator(".transcript-text")).toHaveText(exact);
  await ask(page); await expect(question(page)).toHaveValue(exact); // Prior identical question cannot clear a new pending draft.
  await act(page, "ACK question final"); await expect(question(page)).toHaveValue("");
  await act(page, "Begin answer"); await act(page, "Finish answer");
  await expect(turns(page)).toHaveCount(4);
  await page.getByRole("button", { name: "Inspect source", exact: true }).click();
  await expect(page.locator(".page-text")).toContainText("END-OF-PDF");
  await capture(page, info, "complete-preview"); await fits(page);
});

test("validation, exact 1000 units, no truncation, and composition never submits", async ({ page }) => {
  await begin(page); await send(page).click();
  await expect(page.getByText("Type a question before sending.", { exact: false })).toBeVisible(); await expect(question(page)).toBeFocused();
  await question(page).fill(" \n\t"); await send(page).click(); await expect(question(page)).toHaveValue(" \n\t");
  const over = "雪".repeat(999) + "🌱"; await question(page).fill(over); await expect(question(page)).toHaveValue(over);
  await expect(send(page)).toBeDisabled(); await expect(page.locator(".text-validation")).toContainText("nothing has been cut off");
  const boundary = " 雪".repeat(500); await question(page).fill(boundary);
  await question(page).dispatchEvent("compositionstart"); await question(page).press("Enter");
  await send(page).evaluate((b: HTMLButtonElement) => b.click());
  expect((await audit(page)).at(-1)!.transports[0].questions).toBe(0);
  await question(page).dispatchEvent("compositionend"); await question(page).fill(boundary); await send(page).click();
  expect((await audit(page)).at(-1)!.transports[0].exact).toEqual([boundary]);
});

for (const stage of ["initial", "source", "final"]) test(`withheld ${stage} source receipt blocks all questions`, async ({ page }) => {
  await start(page).click(); if (stage !== "initial") await act(page, "ACK initial");
  if (stage === "final") await act(page, "ACK source");
  await expect(send(page)).toBeDisabled(); await expect(stop(page)).toBeEnabled();
  const t = (await audit(page)).at(-1)!.transports[0]; expect(t.questions).toBe(0); expect(t.responses).toBe(0);
  await act(page, "Expire timers"); await expect(page.locator(".text-session-status")).toContainText("failed");
});

for (const gate of ["source-default", "turn-default"]) test(`actual default ${gate} refusal has no question send`, async ({ page }) => {
  await mode(page, gate); await start(page).click();
  if (gate === "turn-default") { await ready(page); await question(page).fill(exact); await send(page).click(); }
  await expect(page.locator(".text-session-status")).toContainText(gate === "source-default" ? "This source cannot be used" : "It was not sent");
  const r = (await audit(page)).at(-1)!;
  expect(r.connects).toBe(gate === "source-default" ? 0 : 1); expect(r.transports.every(t => t.questions === 0)).toBe(true);
  if (gate === "turn-default") await expect(question(page)).toHaveValue(exact);
});

for (const ending of ["Stop", "error", "timeout"]) test(`partial answer preserved on ${ending}; retry is explicit and clears history`, async ({ page }, info) => {
  await begin(page); await ask(page); await answer(page);
  if (ending === "Stop") await stop(page).click(); else await act(page, ending === "error" ? "Fail answer" : "Expire timers");
  await expect(page.locator(".transcript-text").last()).toContainText("FIXTURE10B partial answer");
  await expect(page.getByText("Text unfinished when the conversation stopped.", { exact: true })).toBeVisible();
  await expect(send(page)).toBeDisabled(); await act(page, "Deliver stale events");
  await expect(page.getByText("STALE10B_MUST_NOT_APPEAR", { exact: true })).toHaveCount(0);
  await capture(page, info, `retained-${ending}`);
  const count = (await audit(page)).at(-1)!.connects;
  await page.getByRole("button", { name: "Start a fresh text session", exact: true }).click();
  await expect(turns(page)).toHaveCount(0); await expect(question(page)).toHaveValue("");
  expect((await audit(page)).at(-1)!.connects).toBe(count + 1); await ready(page);
  expect((await audit(page)).at(-1)!.transports.at(-1)!.questions).toBe(0);
});

for (const phase of ["preparation", "connection", "priming", "admission", "sending", "waiting", "responding"]) test(`Stop during ${phase} closes once and late work cannot revive`, async ({ page }) => {
  const modeName = phase === "preparation" ? "hold-preparation" : phase === "connection" ? "hold-connection" : phase === "admission" ? "hold-admission" : "success";
  await mode(page, modeName); await start(page).click();
  if (!["preparation", "connection", "priming"].includes(phase)) {
    await ready(page); await question(page).fill(exact); await send(page).click();
    if (phase === "waiting" || phase === "responding") await act(page, "ACK question final");
    if (phase === "responding") { await act(page, "Begin answer"); await act(page, "Stream partial"); }
  }
  await stop(page).click();
  for (const action of ["Release preparation", "Release connection", "Release admission", "Deliver stale events", "ACK question final"]) await act(page, action);
  await expect(page.locator(".text-session-status")).toContainText("Session ended"); await expect(send(page)).toBeDisabled();
  if (phase === "sending") await expect(question(page)).toHaveValue(exact);
});

for (const pending of ["admission", "receipt"]) test(`source A to B, removal and unmount during pending ${pending} erase drafts/history`, async ({ page }, info) => {
  if (pending === "admission") await mode(page, "hold-admission");
  await begin(page); await question(page).fill(exact); await send(page).click();
  await act(page, "Replace source"); await expect(question(page)).toHaveValue(""); await expect(turns(page)).toHaveCount(0);
  await expect(page.locator(".text-source")).toContainText("source B");
  await act(page, "Release admission"); await act(page, "Deliver stale events");
  await expect(start(page)).toBeEnabled(); await expect(turns(page)).toHaveCount(0);
  await start(page).click(); await act(page, "Remove source");
  await expect(question(page)).toBeDisabled(); await expect(turns(page)).toHaveCount(0);
  await act(page, "Unmount session"); await act(page, "Deliver stale events");
  await expect(page.getByText("Session unmounted.", { exact: true })).toBeVisible(); await capture(page, info, `replacement-${pending}`);
});

test("final question receipt does not bypass pending local write; unmount releases late connection", async ({ page }) => {
  await mode(page, "hold-write"); await begin(page); await ask(page); await act(page, "ACK question final");
  await expect(question(page)).toHaveValue(""); expect((await audit(page)).at(-1)!.transports[0].responses).toBe(0);
  await act(page, "Release question write"); expect((await audit(page)).at(-1)!.transports[0].responses).toBe(1);
  await stop(page).click(); await mode(page, "hold-connection"); await start(page).click(); await act(page, "Unmount session");
  await act(page, "Release connection"); expect((await audit(page)).at(-1)!.transports[0].closes).toBe(1);
});

test("uncertain unacknowledged send keeps draft, never retransmits and requires deliberate restart", async ({ page }) => {
  await begin(page); await ask(page); await act(page, "Expire timers");
  await expect(question(page)).toHaveValue(exact); await expect(page.locator(".text-session-status")).toContainText("may have arrived");
  await act(page, "ACK question final");
  expect((await audit(page)).at(-1)!.transports[0].responses).toBe(0); await expect(question(page)).toHaveValue(exact);
  await page.getByRole("button", { name: "Start a fresh text session", exact: true }).click(); await ready(page);
  await expect(question(page)).toHaveValue(""); expect((await audit(page)).at(-1)!.transports.at(-1)!.questions).toBe(0);
});

test("streaming keeps keyboard focus and reading anchor; Jump, reduced motion and 200 percent reflow", async ({ page }, info) => {
  await page.emulateMedia({ reducedMotion: "reduce" }); await begin(page); await ask(page); await answer(page);
  await question(page).focus(); await act(page, "Stream partial"); await expect(question(page)).toBeFocused();
  await act(page, "Stream long");
  await turns(page).first().scrollIntoViewIfNeeded();
  const anchor = turns(page).first().getByRole("heading"); const top = await anchor.evaluate(e => e.getBoundingClientRect().top);
  await act(page, "Stream long"); expect(Math.abs((await anchor.evaluate(e => e.getBoundingClientRect().top)) - top)).toBeLessThan(3);
  await expect(page.getByText("Updates below.", { exact: false }).first()).toBeVisible();
  const jump = page.getByRole("button", { name: "Jump to latest", exact: true }); await jump.focus(); await page.keyboard.press("Enter");
  await expect(page.locator(".transcript-latest")).toBeFocused(); await fits(page);
  await capture(page, info, "long-reading");
  await page.evaluate(() => { document.documentElement.style.zoom = "2"; }); await fits(page);
  await page.evaluate(() => { document.documentElement.style.zoom = "1"; document.documentElement.style.fontSize = "200%"; }); await fits(page);
  await question(page).focus(); await expect(question(page)).toBeInViewport();
  await stop(page).focus(); await expect(stop(page)).toBeInViewport(); await expect(stop(page)).toBeEnabled();
  await capture(page, info, "text-200");
});

test("separate actual production stays unavailable and excludes fixture activation", async ({ page }, info) => {
  await page.goto("http://127.0.0.1:3118/?fixture=text&scenario=success");
  await expect(page.locator(".text-session-status")).toContainText("unavailable in this build");
  for (const name of ["Start text session", "Stop text session", "Send question"]) await expect(page.getByRole("button", { name, exact: true })).toBeDisabled();
  await expect(question(page)).toBeDisabled(); await expect(turns(page)).toHaveCount(0);
  for (const path of ["/fixture.js", "/text-fixture", "/tests/text-session/harness"]) expect((await page.request.get(`http://127.0.0.1:3118${path}`)).status()).toBe(404);
  await fits(page); await capture(page, info, "production-unavailable");
});
