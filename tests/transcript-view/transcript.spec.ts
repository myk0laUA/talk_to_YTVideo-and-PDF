import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";

const exact = '  Café e\u0301 👩🏽‍🚀 日本語 مرحبا\n<script>window.INERT_SENTINEL = true</script>\n<img src="https://external.invalid/pixel" onerror="alert(1)"> & **plain**\t  ';
// Invoke the harness's ordinary React button handler without scrolling the page
// back to its fixture controls. No application injection hook or event mock.
async function act(page: Page, name: string) {
  const before = await page.getByLabel("Fixture revision").textContent();
  await page.getByRole("button", { name, exact: true, includeHidden: true }).evaluate((button: HTMLButtonElement) => button.click());
  await expect(page.getByLabel("Fixture revision")).not.toHaveText(before!);
}
const turns = (page: Page) => page.getByRole("list", { name: "Conversation turns" }).getByRole("listitem");

test("03G citation-looking prose is ordinary inert text without notices or links", async ({ page }, info) => {
  await act(page, "Citation-looking prose");
  await expect(page.locator(".transcript-part > .transcript-text")).toHaveText('An attributed claim. [segment-355]\nOrdinary words retained. <script>inert</script> https://evil.invalid');
  await expect(page.locator(".transcript")).not.toContainText("Source references");
  await expect(page.locator(".transcript a, .transcript blockquote, .transcript script")).toHaveCount(0);
  await fits(page); await capture(page, info, "03g-ordinary-prose");
  await act(page, "Replace source"); await expect(page.locator(".transcript")).not.toContainText("segment-355");
});

test("08K output limit preserves partial text and exposes only safe completion details", async ({ page }, info) => {
  await act(page, "Begin draft"); await act(page, "Output limit"); await act(page, "Stop");
  await expect(page.getByText("Answer incomplete. Any text received stays below.", { exact: true })).toBeVisible();
  await expect(page.getByText("The answer reached its output limit. Ask for a shorter answer or a specific part.", { exact: true })).toBeVisible();
  await expect(page.getByText("Draft answer", { exact: true })).toBeVisible();
  await page.getByText("Answer completion details", { exact: true }).click();
  await expect(page.getByText("Reason: max_output_tokens", { exact: true })).toBeVisible();
  await expect(page.getByText("Output tokens: 512; audio: 420; text: 92.", { exact: true })).toBeVisible();
  await expect(page.locator("body")).not.toContainText("PRIVATE_08K"); await fits(page);
  await capture(page, info, "08k-output-limit");
});
async function capture(page: Page, info: TestInfo, name: string) {
  await mkdir("artifacts/local/12e/regression/09b/screenshots", { recursive: true });
  await page.screenshot({ path: `artifacts/local/12e/regression/09b/screenshots/${info.project.name}-${name}.png`, fullPage: true });
}
async function fits(page: Page) {
  expect(await page.evaluate(() => ({ page: document.documentElement.scrollWidth <= innerWidth,
    parts: [...document.querySelectorAll(".transcript-text")].every(node => node.scrollWidth <= node.clientWidth + 1),
    pageScroll: [...document.querySelectorAll(".transcript, .transcript-turns, .conversation-panel")].every(node => !["auto", "scroll"].includes(getComputedStyle(node).overflowY)),
  }))).toEqual({ page: true, parts: true, pageScroll: true });
}

test.beforeEach(async ({ page }) => {
  const external: string[] = [], errors: string[] = [], requests: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("request", request => requests.push(request.url()));
  await page.route("**/*", route => {
    if (new URL(route.request().url()).hostname !== "127.0.0.1") { external.push(route.request().url()); return route.abort(); }
    return route.continue();
  });
  await page.addInitScript(() => {
    const audit = { media: 0, peers: 0, sockets: 0 };
    Object.defineProperty(window, "fixtureAudit", { value: audit });
    Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia: () => { audit.media++; throw new Error("Media forbidden"); } } });
    Object.defineProperty(window, "RTCPeerConnection", { value: class { constructor() { audit.peers++; throw new Error("Peer forbidden"); } } });
    Object.defineProperty(window, "WebSocket", { value: class { constructor() { audit.sockets++; throw new Error("Socket forbidden"); } } });
  });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Transcript", exact: true })).toBeVisible();
  // Each context is fresh, so these assertions also detect unintended persistence.
  test.info().annotations.push({ type: "context", description: "Loopback synthetic events; Chromium viewport only, no physical device/audio" });
  Object.assign(page, { fixtureEvidence: { external, errors, requests } });
});

test.afterEach(async ({ page }, info) => {
  const evidence = (page as Page & { fixtureEvidence: { external: string[]; errors: string[]; requests: string[] } }).fixtureEvidence;
  expect(evidence.external).toEqual([]); expect(evidence.errors).toEqual([]);
  const audit = await page.evaluate(() => ({ ...Reflect.get(window, "fixtureAudit"), localStorage: localStorage.length, sessionStorage: sessionStorage.length }));
  expect(audit).toEqual({ media: 0, peers: 0, sockets: 0, localStorage: 0, sessionStorage: 0 });
  expect(evidence.requests.some(url => /\/api\/|openai|supadata|scrapecreators/.test(url))).toBe(false);
  await writeFile(info.outputPath("safe-browser-audit.json"), JSON.stringify({ context: "isolated synthetic browser", ...evidence, audit }, null, 2));
});

test("truthful empty; incremental/final/late transcription, stable nodes and inert exact text", async ({ page }, info) => {
  await expect(page.getByText("Voice and text conversations are not connected yet.", { exact: true })).toBeVisible();
  await capture(page, info, "empty");
  await act(page, "Begin draft");
  await expect(turns(page)).toHaveCount(2);
  await expect(turns(page).nth(0).getByRole("heading")).toHaveText("You");
  await expect(turns(page).nth(1).getByRole("heading")).toHaveText("Assistant");
  const paragraph = await turns(page).nth(1).locator(".transcript-text").elementHandle();
  await page.getByRole("button", { name: "Jump to latest" }).click();
  const announcement = await page.locator(".transcript [role=status]").textContent();
  await act(page, "Append words");
  expect(await page.locator(".transcript [role=status]").textContent()).toBe(announcement);
  await expect(turns(page).nth(1).locator(".transcript-text")).toHaveText("Draft answer — more words 🌍\n");
  await capture(page, info, "streaming");
  await act(page, "Finalize"); await act(page, "Late question");
  await expect(turns(page)).toHaveCount(2);
  expect(await paragraph!.evaluate(node => node === document.querySelectorAll(".transcript-text")[1])).toBe(true);
  expect(await paragraph!.textContent()).toBe(exact);
  await expect(turns(page).nth(0).locator(".transcript-text")).toHaveText("A delayed spoken question.");
  await expect(page.locator(".transcript script, .transcript img, .transcript a")).toHaveCount(0);
  expect(await page.evaluate(() => Reflect.get(window, "INERT_SENTINEL"))).toBeUndefined();
  await expect(page.locator(".transcript")).not.toContainText(/PRIMING_MUST|IGNORED_|PRIVATE_PROVIDER|response_A|assistant_A|run_/);
  await act(page, "Second part");
  await expect(turns(page).nth(1).locator(".transcript-part")).toHaveCount(2);
  await fits(page);
});

test("interruption/Stop retain generated words with conservative playback and failure markers", async ({ page }, info) => {
  await act(page, "Begin draft"); await act(page, "Append words");
  const received = await turns(page).nth(1).locator(".transcript-text").textContent();
  await act(page, "Interrupt");
  await expect(page.getByText("Interrupted", { exact: true })).toBeVisible();
  await capture(page, info, "interrupted");
  await act(page, "Transcription failure"); await act(page, "Stop");
  expect(await turns(page).nth(1).locator(".transcript-text").textContent()).toBe(received);
  await expect(page.getByText("Speech could not be transcribed. Any earlier words above may be incomplete.")).toBeVisible();
  await expect(turns(page).nth(1).locator(".transcript-notice")).toHaveText("Interrupted");
  await expect(page.locator(".transcript-summary")).toContainText("Conversation stopped.");
  await act(page, "Append words");
  expect(await turns(page).nth(1).locator(".transcript-text").textContent()).toBe(received);
  await expect(page.getByText("Source preview remains independently readable.")).toBeVisible();
  await fits(page);
});

test("limits, provisional/conflicted order and failed generation remain visible", async ({ page }, info) => {
  await act(page, "Limit");
  await expect(page.locator(".transcript-summary")).toContainText("Transcript limit reached.");
  await expect(turns(page).nth(1).locator(".transcript-text")).toHaveText("Words retained before the transcript limit.");
  await capture(page, info, "limit");
  await act(page, "Append words"); await expect(turns(page).nth(1).locator(".transcript-text")).toHaveText("Words retained before the transcript limit.");
  await act(page, "Provisional order");
  await expect(page.getByText("Turn order is provisional while earlier turns arrive.")).toBeVisible();
  await act(page, "Conflicted order");
  await expect(page.getByText("Turn order could not be confirmed. Read this sequence with care.")).toBeVisible();
  await act(page, "Begin draft"); await act(page, "Failed answer");
  await expect(page.getByText("Answer failed. Any text received stays below.")).toBeVisible();
  await fits(page);
});

test("page scroll anchors through deltas/finals/late earlier text/new turns; keyboard jump follows without repeated focus", async ({ page }, info) => {
  await act(page, "Long answer");
  const text = turns(page).nth(1).locator(".transcript-text");
  await text.evaluate(node => window.scrollTo(0, node.getBoundingClientRect().top + scrollY + 500));
  const before = await text.evaluate(node => ({ top: node.getBoundingClientRect().top, y: scrollY }));
  await act(page, "Append long"); await act(page, "Long final"); await act(page, "Next turn");
  expect(Math.abs(await text.evaluate(node => node.getBoundingClientRect().top) - before.top)).toBeLessThanOrEqual(1);
  // scrollY may adjust when a status line above wraps differently. The passage's
  // viewport position is the invariant, rather than its old document coordinate.
  await act(page, "Late question");
  expect(Math.abs(await text.evaluate(node => node.getBoundingClientRect().top) - before.top)).toBeLessThanOrEqual(1);
  await expect(page.locator(".transcript-navigation")).toContainText("Updates below.");
  await expect(page.getByRole("button", { name: "Jump to latest" })).toBeInViewport();
  await page.screenshot({ path: `artifacts/local/12e/regression/09b/screenshots/${info.project.name}-reading-anchor.png` });
  // Keyboard only: source control -> Tab -> Jump, then Enter moves to latest.
  await page.getByRole("button", { name: "Inspect fixture source" }).focus();
  await page.keyboard.press("Tab");
  const jump = page.getByRole("button", { name: "Jump to latest" });
  await expect(jump).toBeFocused();
  expect(await jump.evaluate(node => node.getBoundingClientRect().height)).toBeGreaterThanOrEqual(48);
  expect(await jump.evaluate(node => getComputedStyle(node).outlineWidth)).toBe("3px");
  await page.keyboard.press("Enter");
  const latest = page.locator(".transcript-latest"); await expect(latest).toBeFocused();
  await expect(page.locator(".transcript-navigation")).not.toContainText("Updates below.");
  await act(page, "Second part");
  await expect(latest).toBeFocused();
  expect(await page.locator(".transcript-end").evaluate(node => node.getBoundingClientRect().bottom <= innerHeight + 2)).toBe(true);
  await writeFile(info.outputPath("scroll-evidence.json"), JSON.stringify({ before, afterEarlierTurn: "anchor within 1px", keyboardJump: true, focusRetained: true, pageScrollOnly: true }, null, 2));
  await fits(page);
});

test("source/new-session reset drops words and unread state without auto focus or carried scroll following", async ({ page }) => {
  await act(page, "Long answer");
  await page.evaluate(() => window.scrollTo(0, 500)); await act(page, "Append long");
  await expect(page.locator(".transcript-navigation")).toContainText("Updates below.");
  await act(page, "Replace source");
  await expect(page.getByRole("heading", { name: "Fixture source B" })).toBeVisible();
  await expect(page.locator(".transcript-turn")).toHaveCount(0);
  await expect(page.locator(".transcript")).not.toContainText("Updates below.");
  await expect(page.locator(".transcript-summary")).toContainText("A new session starts with an empty transcript.");
  await act(page, "Begin draft"); await act(page, "New session");
  await expect(page.locator(".transcript-turn")).toHaveCount(0);
  await expect(page.getByText("Waiting for the first turn.")).toBeVisible();
  await act(page, "Unavailable");
  await expect(page.getByText("Voice and text conversations are not connected yet.", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Inspect fixture source" })).toBeEnabled();
});

test("200% text in a short viewport leaves long transcript text reachable", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 400 });
  await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
  await act(page, "Long answer");
  const text = turns(page).nth(1).locator(".transcript-text");
  await text.evaluate(el => scrollTo(0, el.getBoundingClientRect().top + scrollY + 400));
  const nav = page.locator(".transcript-navigation");
  expect(await nav.evaluate(el => el.getBoundingClientRect().bottom)).toBeLessThan(0);
  const before = await text.evaluate(el => el.getBoundingClientRect().top);
  await act(page, "Append long");
  expect(await text.evaluate(el => el.getBoundingClientRect().top)).toBeCloseTo(before, 0);
  const jump = page.getByRole("button", { name: "Jump to latest" });
  await jump.focus(); await page.keyboard.press("Enter");
  await expect(page.locator(".transcript-latest")).toBeFocused();
  await fits(page);
});

test("reduced motion and 200% text zoom preserve reading, controls and wrapping", async ({ page }, info) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await act(page, "Begin draft"); await act(page, "Finalize"); await act(page, "Second part");
  // Exercise 200% CSS layout zoom, then 200% text scaling + viewport reflow.
  // This is not a physical-device or browser-toolbar zoom claim.
  await page.evaluate(() => { document.documentElement.style.zoom = "2"; });
  await fits(page);
  await page.evaluate(() => { document.documentElement.style.zoom = "1"; document.body.style.fontSize = "200%"; });
  await fits(page);
  const jump = page.getByRole("button", { name: "Jump to latest" });
  await jump.focus(); await page.keyboard.press("Enter"); await expect(page.locator(".transcript-latest")).toBeFocused();
  expect(await jump.evaluate(node => getComputedStyle(node).scrollBehavior)).toBe("auto");
  const original = page.viewportSize()!;
  await page.setViewportSize({ width: Math.max(320, Math.floor(original.width / 2)), height: original.height });
  await fits(page); await capture(page, info, "text-zoom-200");
});

test("production root has only empty transcript and no fixture route, query switch or transport", async ({ page }, info) => {
  await page.goto("http://127.0.0.1:3116/?fixture=transcript&scenario=streaming");
  await expect(page.getByRole("heading", { name: "Bring a source. Start a chat.", exact: true })).toBeVisible();
  await expect(page.locator(".transcript")).toBeHidden();
  for (const name of ["Start chat", "Upload a PDF", "Add a YouTube video"]) await expect(page.getByRole("button", { name, exact: true, includeHidden: true })).toBeDisabled();
  await expect(page.locator(".transcript-turn")).toHaveCount(0);
  await expect(page.getByText("About this temporary workspace", { exact: true })).toBeVisible();
  await expect(page.locator("textarea[name=question]")).toBeDisabled();
  await capture(page, info, "production-empty");
  for (const path of ["/fixture.js", "/transcript-fixture", "/tests/transcript-view/harness"]) {
    expect((await page.request.get(`http://127.0.0.1:3116${path}`)).status()).toBe(404);
  }
  await fits(page);
});

test("bounded transcript preserves anchor through late text and reset, and follows explicit Jump", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('.workspace').evaluate(e => e.classList.add('has-source'));
  await act(page, 'Long answer');
  const panel = page.locator('.transcript');
  await panel.evaluate(e => { e.scrollTop = 500; });
  const text = turns(page).nth(1).locator('.transcript-text');
  const top = await text.evaluate(e => e.getBoundingClientRect().top);
  await act(page, 'Append long'); await act(page, 'Long final'); await act(page, 'Next turn'); await act(page, 'Late question');
  expect(Math.abs(await text.evaluate(e => e.getBoundingClientRect().top) - top)).toBeLessThanOrEqual(1);
  await expect(page.locator('.transcript-navigation')).toContainText('Updates below.');
  await page.getByRole('button', { name: 'Jump to latest' }).click();
  await expect(page.locator('.transcript-latest')).toBeFocused();
  await act(page, 'Second part');
  await expect(page.locator('.transcript-latest')).toBeFocused();
  expect(await panel.evaluate(e => e.scrollHeight - e.scrollTop - e.clientHeight)).toBeLessThanOrEqual(2);
  await act(page, 'Replace source');
  await expect(page.locator('.transcript-turn')).toHaveCount(0);
  expect(await panel.evaluate(e => e.scrollTop)).toBe(0);
});
