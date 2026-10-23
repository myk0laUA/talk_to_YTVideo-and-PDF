import { expect, test, type Page, type Route, type TestInfo } from "@playwright/test";
import { readFile } from "node:fs/promises";
import type { PdfSourceContent, YoutubeSourceContent, SourceContent } from "../../src/shared/source";

const idA = "11111111-1111-4111-8111-111111111111", idB = "22222222-2222-4222-8222-222222222222", idC = "33333333-3333-4333-8333-333333333333";
const url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
const youtube = (id = idA): YoutubeSourceContent => {
  const sections = Array.from({ length: 64 }, (_, i) => ({ id: `segment-${i + 1}`, text: `Caption ${i + 1} marker ${id}`,
    startSeconds: i === 0 ? 0 : i === 1 ? 1.2505 : i === 2 ? 1.125 : i === 3 ? 1e-7 : i === 63 ? 3601.000125 : i * 2,
    durationSeconds: i === 1 ? 0.500125 : i === 2 ? 0 : 2 }));
  sections[3].text = "<script>alert('caption')</script> " + "longcaption".repeat(50);
  return { id, kind: "YOUTUBE", title: "YouTube captions", videoId: "dQw4w9WgXcQ", canonicalUrl: url,
    provider: "youtube-transcript-plus@2.0.3", language: "en", trackType: "automatic", segmentCount: sections.length,
    characterCount: 2000, wordCount: 250, warnings: ["Synthetic caption note"], expiresAt: "2026-10-19T20:00:00.000Z",
    fullText: sections.map(s => s.text).join("\n"), sections };
};
const pdf = (id = idB): PdfSourceContent => ({ id, kind: "PDF", title: "Uploaded PDF", parser: "pdf-parse@2.4.5", pageCount: 1,
  characterCount: 16, wordCount: 3, warnings: [], expiresAt: "2026-10-19T20:00:00.000Z", fullText: "PDF final marker",
  sections: [{ id: "page-1", pageNumber: 1, text: "PDF final marker" }] });
const metadata = (content: SourceContent) => Object.fromEntries(Object.entries(content).filter(([key]) => key !== "fullText" && key !== "sections"));
const reply = (route: Route, status: number, body: unknown) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
const fail = (route: Route, status: number, code: string) => reply(route, status, { ok: false, error: { code, message: "PRIVATE upstream SQL details" } });
const submit = async (page: Page, video = url) => { if (await page.getByRole("dialog").count()) await page.keyboard.press("Escape"); if (!await page.locator(".replacement-dialog").count() && await page.locator("button[aria-haspopup=menu][aria-expanded=false]").count()) await page.getByText("Source actions", { exact: true }).click(); if (await page.locator(".source-menu button").count() && !await page.locator(".replacement-dialog").count()) await page.getByRole("menuitem", { name: "Replace source", exact: true }).click(); await page.getByRole("textbox", { name: "YouTube URL" }).fill(video); await page.getByRole("textbox", { name: "YouTube URL" }).press("Enter"); };
const loaded = (page: Page) => expect(page.locator("body:has(.replacement-dialog) .replacement-dialog > [role=status], body:not(:has(.replacement-dialog)) .source-panel > [role=status]")).toContainText("YouTube captions ready");
const open = async (page: Page) => { if (await page.locator(".replacement-dialog").count()) await page.keyboard.press("Escape"); await page.getByRole("button", { name: "View source" }).click(); await expect(page.getByRole("heading", { name: "YouTube caption text" })).toBeFocused(); };
const remove = async (page: Page) => { if (await page.getByRole("dialog").count()) await page.keyboard.press("Escape"); await page.getByRole("button", { name: "Source actions", exact: true }).click(); await page.getByRole("menuitem", { name: "Remove source", exact: true }).click(); await page.getByRole("button", { name: "Confirm remove" }).click(); };
const counts = (info: TestInfo, value: object) => info.attach("request-counts", { body: JSON.stringify(value), contentType: "application/json" });

test.beforeEach(async ({ page }) => {
  await page.route("**/*", route => new URL(route.request().url()).hostname === "127.0.0.1" ? route.continue() : route.abort());
});

test("mocked: native submit, one 401, metadata then full GET, complete ordered captions, precision and focus", async ({ page }, info) => {
  let posts = 0, gets = 0;
  const errors: string[] = []; page.on("pageerror", e => errors.push(e.message));
  const source = youtube();
  await page.route("**/api/sources/**", route => {
    if (route.request().method() === "POST") {
      expect(route.request().postDataJSON()).toEqual({ video: url });
      expect(route.request().headers().origin).toBe("http://127.0.0.1:3109");
      return ++posts === 1 ? fail(route, 401, "visitor_required") : reply(route, 201, { ok: true, source: metadata(source) });
    }
    gets++; expect(route.request().url()).toContain(idA); return reply(route, 200, { ok: true, source });
  });
  await page.goto("/");
  await page.keyboard.press("Tab"); await expect(page.getByRole("link", { name: "Skip to workspace" })).toBeFocused();
  await page.keyboard.press("Enter"); await expect(page.getByRole("main")).toBeFocused();
  await submit(page, ` ${url} `); await loaded(page);
  expect(posts).toBe(2); expect(gets).toBe(1);
  await page.screenshot({ path: `artifacts/local/12e/regression/05b/${info.project.name}-loaded.png`, fullPage: true });
  await open(page);
  await expect(page.getByText("Caption language:", { exact: false })).toContainText("en · Automatic captions");
  expect(await page.locator(".caption-segment").evaluateAll(nodes => nodes.map(n => n.id))).toEqual(source.sections.map(s => `source-${s.id}`));
  expect(await page.locator(".page-text").allTextContents()).toEqual(source.sections.map(s => s.text));
  await expect(page.locator("#source-segment-1 h3")).toHaveText("0:00 · duration 2 s");
  await expect(page.locator("#source-segment-2 h3")).toHaveText("0:01.2505 · duration 0.500125 s");
  await expect(page.locator("#source-segment-3 h3")).toHaveText("0:01.125 · duration 0 s");
  await expect(page.locator("#source-segment-4 h3")).toHaveText("1e-7 s · duration 2 s");
  await expect(page.locator("#source-segment-64 h3")).toHaveText("60:01.000125 · duration 2 s");
  expect(await page.locator("#source-text").getAttribute("aria-live")).toBeNull();
  expect(await page.locator("#source-text script").count()).toBe(0);
  await page.getByText("Extraction notes",{exact:true}).click();
  await expect(page.getByText("Synthetic caption note")).toBeVisible();
  await page.locator("#source-segment-1").scrollIntoViewIfNeeded();
  await page.screenshot({ path: `artifacts/local/12e/regression/05b/${info.project.name}-first.png` });
  await page.locator("#source-segment-64").scrollIntoViewIfNeeded();
  await expect(page.locator("#source-segment-64 .page-text")).toBeInViewport();
  await expect.poll(() => page.locator("#source-segment-64 .page-text").evaluate(el => el.checkVisibility({ contentVisibilityAuto: true }))).toBe(true);
  await page.screenshot({ path: `artifacts/local/12e/regression/05b/${info.project.name}-final.png` });
  await page.getByRole("button", { name: "Close text and return" }).last().click();
  await expect(page.getByRole("button", { name: "View source" })).toBeFocused();
  expect(await page.getByRole("button", { name: "View source" }).evaluate(el => getComputedStyle(el).outlineWidth)).toBe("3px");
  await page.screenshot({ path: `artifacts/local/12e/regression/05b/${info.project.name}-focus-return.png` });
  await expect(page.getByRole("button", { name: "Start chat" })).toBeDisabled();
  expect(await page.evaluate(() => ({ local: localStorage.length, session: sessionStorage.length, fits: document.documentElement.scrollWidth <= innerWidth }))).toEqual({ local: 0, session: 0, fits: true });
  expect(errors).toEqual([]);
  await page.reload(); await expect(page.getByRole("button", { name: "Import YouTube video", exact: true })).toBeVisible(); expect(gets).toBe(1);
  await counts(info, { posts, gets });
});

test("mocked: invalid/long URLs focus inline error; typing never extracts", async ({ page }, info) => {
  let posts = 0;
  await page.route("**/api/sources/**", route => { posts++; return reply(route, 201, { ok: true }); });
  await page.goto("/");
  for (const value of ["", "https://evil.invalid/watch?v=dQw4w9WgXcQ", "http://youtube.com/watch?v=dQw4w9WgXcQ", "https://youtube.com/watch?v=bad", `${url}&v=dQw4w9WgXcQ`, `${url}&long=${"x".repeat(400)}`]) {
    await submit(page, value); await expect(page.locator("#youtube-error")).toContainText("Enter an HTTPS YouTube video URL");
    await expect(page.getByRole("textbox", { name: "YouTube URL" })).toBeFocused();
  }
  await page.getByRole("textbox", { name: "YouTube URL" }).fill(url);
  await expect(page.locator("#youtube-error")).toHaveCount(0); expect(posts).toBe(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await counts(info, { posts });
});

const failures: [string, number, string, boolean][] = [
  ["invalid_input", 400, "valid HTTPS", false], ["invalid_request", 400, "could not be sent", false],
  ["unavailable", 422, "video is unavailable", false], ["no_captions", 422, "No captions are available", false],
  ["blocked", 502, "access was blocked", false], ["rate_limited", 429, "rate limited", false],
  ["quota_exhausted", 503, "no quota remaining", false], ["provider_limited", 503, "operator review", false],
  ["limit_reached", 429, "import is busy", false], ["disabled", 503, "currently unavailable", false],
  ["too_large", 413, "captions exceed", false], ["malformed", 502, "invalid or incomplete captions", false],
  ["upstream_failure", 502, "could not finish retrieval", false], ["forbidden", 403, "Reload this page", false],
  ["timeout", 504, "outcome is uncertain", true], ["cancelled", 408, "outcome is uncertain", true],
  ["storage_unavailable", 503, "storage is temporarily unavailable", true], ["replacement_conflict", 409, "cannot be identified", true],
  ["internal", 500, "outcome is uncertain", true],
];
for (const [code, status, text, rechecks] of failures) test(`mocked: ${code} recovery preserves prior without automatic extraction/fallback`, async ({ page }, info) => {
  let posts = 0, gets = 0;
  await page.route("**/api/sources/**", route => {
    if (route.request().method() === "POST") return ++posts === 1 ? reply(route, 201, { ok: true, source: metadata(youtube()) }) : fail(route, status, code);
    gets++; return reply(route, 200, { ok: true, source: youtube() });
  });
  await page.goto("/"); await submit(page); await loaded(page); await submit(page);
  await expect(page.locator("body:has(.replacement-dialog) .replacement-dialog > [role=status], body:not(:has(.replacement-dialog)) .source-panel > [role=status]")).toContainText(text);
  await expect(page.getByRole("button", { name: "Replace with YouTube video" })).toBeEnabled();
  expect(posts).toBe(2); expect(gets).toBe(rechecks ? 2 : 1);
  await expect(page.locator("body:has(.replacement-dialog) .replacement-dialog > [role=status], body:not(:has(.replacement-dialog)) .source-panel > [role=status]")).not.toContainText(/PRIVATE|another provider|fallback/i);
  if (code === "blocked") await page.screenshot({ path: `artifacts/local/12e/regression/05b/${info.project.name}-failure.png`, fullPage: true });
  await open(page); await expect(page.locator("#source-segment-64")).toContainText("Caption 64 marker");
  await counts(info, { posts, gets, rechecks });
});

test("mocked: second 401 ends handshake, preserves input, rechecks expired prior", async ({ page }, info) => {
  let posts = 0, gets = 0;
  await page.route("**/api/sources/**", route => {
    if (route.request().method() === "POST") return ++posts === 1 ? reply(route, 201, { ok: true, source: metadata(youtube()) }) : fail(route, 401, "visitor_required");
    return ++gets === 1 ? reply(route, 200, { ok: true, source: youtube() }) : fail(route, 404, "unavailable");
  });
  await page.goto("/"); await submit(page); await loaded(page); await submit(page);
  await expect(page.locator("body:has(.replacement-dialog) .replacement-dialog > [role=status], body:not(:has(.replacement-dialog)) .source-panel > [role=status]")).toContainText("cookies are unavailable");
  await expect(page.getByRole("textbox", { name: "YouTube URL" })).toHaveValue(url);
  await expect(page.locator(".active-source")).toHaveCount(0); expect(posts).toBe(3); expect(gets).toBe(2);
  await counts(info, { posts, gets });
});

test("mocked: saved-ID GET retry never repeats POST", async ({ page }, info) => {
  let posts = 0, gets = 0;
  await page.route("**/api/sources/**", route => {
    if (route.request().method() === "POST") { posts++; return reply(route, 201, { ok: true, source: metadata(youtube()) }); }
    expect(route.request().url()).toContain(idA);
    return ++gets === 1 ? fail(route, 503, "storage_unavailable") : reply(route, 200, { ok: true, source: youtube() });
  });
  await page.goto("/"); await submit(page); await expect(page.locator("body:has(.replacement-dialog) .replacement-dialog > [role=status], body:not(:has(.replacement-dialog)) .source-panel > [role=status]")).toContainText("YouTube stored, but");
  await page.getByRole("button", { name: "Retry text" }).click(); await loaded(page); expect(posts).toBe(1); expect(gets).toBe(2);
  await counts(info, { posts, gets });
});

test("mocked: YouTube to PDF to YouTube to YouTube uses one card and no pre-delete", async ({ page }, info) => {
  let posts = 0, deletes = 0;
  let current: SourceContent = youtube();
  await page.route("**/api/sources/**", route => {
    const method = route.request().method();
    if (method === "DELETE") deletes++;
    if (method === "POST") { posts++; current = route.request().url().endsWith("/pdf") ? pdf() : youtube(posts === 1 ? idA : idC); return reply(route, 201, { ok: true, source: metadata(current) }); }
    return reply(route, 200, { ok: true, source: current });
  });
  await page.goto("/"); await submit(page); await loaded(page);
  if (!await page.locator(".replacement-dialog").count() && await page.locator("button[aria-haspopup=menu][aria-expanded=false]").count()) await page.getByText("Source actions", { exact: true }).click(); if (await page.locator(".source-menu button").count() && !await page.locator(".replacement-dialog").count()) await page.getByRole("menuitem", { name: "Replace source", exact: true }).click();
  const chooser = page.waitForEvent("filechooser"); await page.getByRole("button", { name: "Replace PDF", exact: true }).click();
  await (await chooser).setFiles({ name: "Résumé 日本語.pdf", mimeType: "application/pdf", buffer: Buffer.from("mock") });
  await expect(page.locator("body:has(.replacement-dialog) .replacement-dialog > [role=status], body:not(:has(.replacement-dialog)) .source-panel > [role=status]")).toContainText("PDF text ready");
  await expect(page.getByText("Résumé 日本語.pdf", { exact: true })).toBeVisible();
  await submit(page); await loaded(page); await submit(page, "https://youtu.be/abcdefghijk"); await loaded(page);
  expect(await page.locator(".active-source").count()).toBe(1); expect(posts).toBe(4); expect(deletes).toBe(0);
  await counts(info, { posts, deletes });
});

for (const code of ["network", "replacement_conflict"]) test(`mocked: uncertain ${code} loses prior ID; deliberate replacement recovers`, async ({ page }, info) => {
  let posts = 0, gets = 0;
  await page.route("**/api/sources/**", route => {
    if (route.request().method() === "POST") {
      posts++; return posts === 2 ? code === "network" ? route.abort("failed") : fail(route, 409, code)
        : reply(route, 201, { ok: true, source: metadata(youtube(posts === 1 ? idA : idC)) });
    }
    gets++; return posts === 2 ? fail(route, 404, "unavailable") : reply(route, 200, { ok: true, source: youtube(posts === 1 ? idA : idC) });
  });
  await page.goto("/"); await submit(page); await loaded(page); await submit(page);
  await expect(page.locator("body:has(.replacement-dialog) .replacement-dialog > [role=status], body:not(:has(.replacement-dialog)) .source-panel > [role=status]")).toContainText("previous source is no longer accessible");
  await expect(page.locator(".active-source")).toHaveCount(0);
  await submit(page); await loaded(page); expect(posts).toBe(3); expect(gets).toBe(3);
  await counts(info, { posts, gets });
});

test("mocked: cancel aborts request, excludes parallel mutation and ignores late success after new import", async ({ page }, info) => {
  await page.addInitScript(() => {
    const original = window.fetch; let posts = 0;
    window.fetch = async (input, init) => {
      if (String(input) === "/api/sources/youtube" && ++posts === 2) {
        Object.assign(window, { cancelledSignal: init?.signal });
        return new Promise<Response>(resolve => Object.assign(window, { releaseLate: () => resolve(new Response(JSON.stringify({ ok: true, source: { id: "22222222-2222-4222-8222-222222222222", kind: "YOUTUBE" } }), { status: 201 })) }));
      }
      return original(input, init);
    };
  });
  let posts = 0, gets = 0;
  await page.route("**/api/sources/**", route => {
    const source = youtube(posts ? idC : idA);
    if (route.request().method() === "POST") { posts++; return reply(route, 201, { ok: true, source: metadata(source) }); }
    gets++; return reply(route, 200, { ok: true, source: youtube(route.request().url().endsWith(idA) ? idA : idC) });
  });
  await page.goto("/"); await submit(page); await loaded(page); await submit(page);
  await expect(page.getByRole("button", { name: "Replace PDF", exact: true })).toBeDisabled();
  await expect(page.getByRole("menuitem", { name: "Remove source", exact: true, includeHidden: true })).toBeDisabled();
  await page.getByRole("button", { name: "Cancel import" }).click();
  await expect(page.locator("body:has(.replacement-dialog) .replacement-dialog > [role=status], body:not(:has(.replacement-dialog)) .source-panel > [role=status]")).toContainText("may still replace it");
  expect(await page.evaluate(() => (window as unknown as { cancelledSignal: AbortSignal }).cancelledSignal.aborted)).toBe(true);
  await submit(page); await loaded(page);
  await page.evaluate(() => (window as unknown as { releaseLate: () => void }).releaseLate());
  await open(page); await expect(page.locator("#source-segment-64")).toContainText(idC);
  expect(posts).toBe(2); expect(gets).toBe(3);
  await counts(info, { routedPosts: posts, clientPosts: 3, gets });
});

test("mocked: removal confirmation, keep, repeat and already removed", async ({ page }, info) => {
  let posts = 0, deletes = 0;
  await page.route("**/api/sources/**", route => {
    if (route.request().method() === "DELETE") return ++deletes === 1 ? reply(route, 200, { ok: true }) : fail(route, 404, "unavailable");
    if (route.request().method() === "POST") posts++;
    return reply(route, route.request().method() === "POST" ? 201 : 200, { ok: true, source: youtube() });
  });
  await page.goto("/"); await submit(page); await loaded(page);
  await page.getByRole("button", { name: "Source actions", exact: true }).click(); await page.getByRole("menuitem", { name: "Remove source", exact: true }).click(); await page.getByRole("button", { name: "Keep source" }).click(); expect(deletes).toBe(0);
  await remove(page); await expect(page.locator("body:has(.replacement-dialog) .replacement-dialog > [role=status], body:not(:has(.replacement-dialog)) .source-panel > [role=status]")).toContainText("Source removed or already unavailable");
  await submit(page); await loaded(page); await remove(page);
  await expect(page.locator("body:has(.replacement-dialog) .replacement-dialog > [role=status], body:not(:has(.replacement-dialog)) .source-panel > [role=status]")).toContainText("Source removed or already unavailable"); expect(deletes).toBe(2); expect(posts).toBe(2);
  await counts(info, { posts, deletes });
});

test("mocked: local deadline aborts extraction and still revalidates known prior", async ({ page }, info) => {
  await page.addInitScript(() => {
    const original = window.fetch; let posts = 0;
    window.fetch = async (input, init) => {
      if (String(input) === "/api/sources/youtube" && ++posts === 2) {
        return new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => { Object.assign(window, { deadlineAborted: true }); reject(new DOMException("Aborted", "AbortError")); }, { once: true });
        });
      }
      return original(input, init);
    };
  });
  let gets = 0, posts = 0;
  await page.route("**/api/sources/**", route => {
    if (route.request().method() === "POST") posts++; else gets++;
    return reply(route, route.request().method() === "POST" ? 201 : 200, { ok: true, source: youtube() });
  });
  await page.goto("/"); await submit(page); await loaded(page); await page.clock.install(); await submit(page);
  await expect(page.locator("body:has(.replacement-dialog) .replacement-dialog > [role=status], body:not(:has(.replacement-dialog)) .source-panel > [role=status]")).toContainText("Importing YouTube");
  await page.clock.fastForward(55_001);
  await expect(page.locator("body:has(.replacement-dialog) .replacement-dialog > [role=status], body:not(:has(.replacement-dialog)) .source-panel > [role=status]")).toContainText("previous source is readable now");
  expect(await page.evaluate(() => (window as unknown as { deadlineAborted: boolean }).deadlineAborted)).toBe(true);
  expect(gets).toBe(2); expect(posts).toBe(1);
  await counts(info, { routedPosts: posts, clientPosts: 2, gets, clock: "mocked 55-second deadline" });
});

for (const network of [true, false]) test(`mocked: failed removal ${network ? "network" : "storage"} rechecks without confirming deletion`, async ({ page }, info) => {
  let gets = 0, deletes = 0;
  await page.route("**/api/sources/**", route => {
    if (route.request().method() === "DELETE") { deletes++; return network ? route.abort("failed") : fail(route, 503, "storage_unavailable"); }
    if (route.request().method() === "GET") gets++;
    return reply(route, route.request().method() === "POST" ? 201 : 200, { ok: true, source: youtube() });
  });
  await page.goto("/"); await submit(page); await loaded(page); await remove(page);
  await expect(page.locator("body:has(.replacement-dialog) .replacement-dialog > [role=status], body:not(:has(.replacement-dialog)) .source-panel > [role=status]")).toContainText("Removal is not confirmed");
  await expect(page.getByRole("button", { name: "View source" })).toBeEnabled(); expect(deletes).toBe(1); expect(gets).toBe(2);
  await counts(info, { gets, deletes });
});

test("mocked: expiry clears inaccessible source on missing-content Retry", async ({ page }, info) => {
  let gets = 0, posts = 0;
  await page.route("**/api/sources/**", route => {
    if (route.request().method() === "POST") { posts++; return reply(route, 201, { ok: true, source: metadata(youtube()) }); }
    return ++gets === 1 ? fail(route, 503, "storage_unavailable") : fail(route, 404, "unavailable");
  });
  await page.goto("/"); await submit(page); await expect(page.getByRole("button", { name: "Retry text" })).toBeVisible(); await page.getByRole("button", { name: "Retry text", exact: true }).click();
  await expect(page.locator("body:has(.replacement-dialog) .replacement-dialog > [role=status], body:not(:has(.replacement-dialog)) .source-panel > [role=status]")).toContainText("expired or is no longer available");
  await expect(page.locator(".active-source")).toHaveCount(0); expect(posts).toBe(1); expect(gets).toBe(2);
  await counts(info, { posts, gets });
});

test("integrated: actual direct adapter/DTO, synthetic upstream/Prisma, YouTube to 384-line PDF and back, remove", async ({ page }, info) => {
  const requests: { method: string; status: number; path: string }[] = [], ids: string[] = [], errors: string[] = [];
  page.on("pageerror", e => errors.push(e.message));
  page.on("response", async response => {
    const path = new URL(response.url()).pathname;
    if (!path.startsWith("/api/sources")) return;
    requests.push({ method: response.request().method(), status: response.status(), path });
    if (response.status() === 201) ids.push((await response.json()).source.id);
  });
  await page.goto("/"); await submit(page); await loaded(page); await open(page);
  expect(await page.locator(".page-text").allTextContents()).toEqual([" FIRST synthetic marker ", "MIDDLE synthetic marker", "LAST synthetic marker"]);
  await expect(page.locator("#source-segment-1 h3")).toHaveText("0:01.2505 · duration 0.500125 s");
  await expect(page.locator("#source-segment-2 h3")).toHaveText("0:25 · duration 0 s");
  await expect(page.locator("#source-segment-3 h3")).toHaveText("0:50.125 · duration 3.75 s");
  await page.screenshot({ path: `artifacts/local/12e/regression/05b/${info.project.name}-integrated-captions.png`, fullPage: true });
  await page.getByRole("button", { name: "Close text and return" }).first().click();
  if (!await page.locator(".replacement-dialog").count() && await page.locator("button[aria-haspopup=menu][aria-expanded=false]").count()) await page.getByText("Source actions", { exact: true }).click(); if (await page.locator(".source-menu button").count() && !await page.locator(".replacement-dialog").count()) await page.getByRole("menuitem", { name: "Replace source", exact: true }).click();
  const chooser = page.waitForEvent("filechooser"); await page.getByRole("button", { name: "Replace PDF", exact: true }).click();
  await (await chooser).setFiles("artifacts/local/04a/fixtures/multi.pdf");
  await expect(page.locator("body:has(.replacement-dialog) .replacement-dialog > [role=status], body:not(:has(.replacement-dialog)) .source-panel > [role=status]")).toContainText("PDF text ready");
  expect((await page.request.get(`/api/sources/${ids[0]}`)).status()).toBe(404);
  if (await page.locator(".replacement-dialog").count()) await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "View source" }).click();
  const manifest = JSON.parse(await readFile("artifacts/local/04a/fixtures/manifest.json", "utf8"));
  const expected: string[][] = manifest.fixtures.find((f: { name: string }) => f.name === "multi").expectedPages;
  const actual = await page.locator(".page-text").allTextContents(); expect(actual).toHaveLength(12);
  let lines = 0;
  for (let i = 0; i < expected.length; i++) for (const line of expected[i]) { expect(actual[i]).toContain(line); lines++; }
  expect(lines).toBe(384);
  await page.getByRole("heading", { name: "Page 12", exact: true }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: `artifacts/local/12e/regression/05b/${info.project.name}-integrated-pdf-final.png` });
  await page.getByRole("button", { name: "Close text and return" }).last().click();
  await expect(page.getByRole("button", { name: "View source" })).toBeFocused();
  await submit(page); await loaded(page);
  expect((await page.request.get(`/api/sources/${ids[1]}`)).status()).toBe(404);
  await open(page); expect(await page.locator(".page-text").allTextContents()).toEqual([" FIRST synthetic marker ", "MIDDLE synthetic marker", "LAST synthetic marker"]);
  await remove(page); await expect(page.locator("body:has(.replacement-dialog) .replacement-dialog > [role=status], body:not(:has(.replacement-dialog)) .source-panel > [role=status]")).toContainText("Source removed or already unavailable");
  expect((await page.request.get(`/api/sources/${ids[2]}`)).status()).toBe(404);
  expect(requests.filter(r => r.method === "POST").map(r => r.status)).toEqual([401, 201, 201, 201]);
  expect(requests.filter(r => r.method === "GET")).toHaveLength(3);
  expect(requests.filter(r => r.method === "DELETE")).toHaveLength(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true); expect(errors).toEqual([]);
  await counts(info, { requests, verifiedPdfLines: lines, verifiedCaptionSegmentsPerImport: 3, replacementChecks: 2, removed404: true });
});
