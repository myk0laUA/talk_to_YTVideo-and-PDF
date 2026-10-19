import { expect, test, type Page, type Route } from "@playwright/test";
import { readFile } from "node:fs/promises";
import type { SourceContent } from "../../src/shared/source";

const idA = "11111111-1111-4111-8111-111111111111", idB = "22222222-2222-4222-8222-222222222222";
const source = (id = idA): SourceContent => ({ id, title: "Uploaded PDF", kind: "PDF", parser: "pdf-parse@2.4.5", pageCount: 2,
  characterCount: 20, wordCount: 4, warnings: ["Synthetic extraction note"], expiresAt: "2026-10-19T20:00:00.000Z", fullText: "First page\nFinal marker",
  sections: [{ id: "page-1", pageNumber: 1, text: "First page\n<script>alert('untrusted')</script>\n" + "longword".repeat(40) }, { id: "page-2", pageNumber: 2, text: "Final marker" }] });
const reply = (route: Route, status: number, body: unknown) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
const fail = (route: Route, status: number, code: string) => reply(route, status, { ok: false, error: { code, message: "PRIVATE parser SQL internals must not appear" } });
// Exercise the actual chooser button: writing a hidden input immediately after navigation
// can dispatch change before hydration has installed the React listener.
const choose = async (page: Page, name = "Résumé 日本語.pdf", size = 10) => {
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: /^(Upload a PDF|Replace PDF)$/ }).click();
  await (await chooser).setFiles({ name, mimeType: "application/pdf", buffer: Buffer.alloc(size, "x") });
};
async function load(page: Page) { await choose(page); await expect(page.locator(".source-panel").getByRole("status")).toContainText("PDF text ready"); }
async function remove(page: Page) { await page.getByRole("button", { name: "Remove", exact: true }).click(); await page.getByRole("button", { name: "Confirm remove", exact: true }).click(); }

test.beforeEach(async ({ page }) => {
  await page.route("**/*", route => new URL(route.request().url()).hostname === "127.0.0.1" ? route.continue() : route.abort());
});

test("mocked: one 401 retry, Unicode/safe filename, source navigation, keyboard, text safety and reload policy", async ({ page }, info) => {
  let posts = 0, gets = 0;
  const errors: string[] = [];
  page.on("pageerror", e => errors.push(e.message));
  page.on("console", m => { if (m.type() === "error" && !/401 \(Unauthorized\)/.test(m.text())) errors.push(m.text()); });
  await page.route("**/api/sources/**", route => {
    if (route.request().method() === "POST") {
      posts++;
      const body = route.request().postDataBuffer()!.toString();
      expect(body).toContain('filename="document.pdf"'); expect(body).not.toContain("Résumé");
      expect(route.request().headers().origin).toBe("http://127.0.0.1:3107");
      return posts === 1 ? fail(route, 401, "visitor_required") : reply(route, 201, { ok: true, source: source() });
    }
    gets++; return reply(route, 200, { ok: true, source: source() });
  });
  await page.goto("/");
  await page.keyboard.press("Tab"); await expect(page.getByRole("link", { name: "Skip to workspace" })).toBeFocused();
  await page.keyboard.press("Enter"); await expect(page.getByRole("main")).toBeFocused();
  await expect(page.getByText("Up to 25 MB (25,000,000 bytes). Text PDFs only; no OCR.")).toBeVisible();
  await load(page); expect(posts).toBe(2); expect(gets).toBe(1);
  await expect(page.getByText("Résumé 日本語.pdf", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Inspect extracted text" }).focus(); await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "Page 2", exact: true })).toBeVisible();
  await expect(page.getByText("<script>alert('untrusted')</script>", { exact: false })).toBeVisible();
  await expect(page.getByText("Synthetic extraction note")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(page.getByRole("heading", { name: "Extracted PDF text" })).toBeFocused();
  const focus = await page.getByRole("heading", { name: "Extracted PDF text" }).evaluate(el => getComputedStyle(el).outlineWidth);
  expect(focus).toBe("3px");
  await page.screenshot({ path: `artifacts/local/05a/${info.project.name}-mocked-reader.png`, fullPage: true });
  await page.getByRole("button", { name: "Close text and return" }).first().click();
  await expect(page.getByRole("button", { name: "Inspect extracted text" })).toBeFocused();
  await page.getByRole("link", { name: "Conversation", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Conversation", exact: true })).toBeFocused();
  await expect(page.getByRole("button", { name: "Start text session" })).toBeDisabled();
  expect(await page.evaluate(() => ({ local: localStorage.length, session: sessionStorage.length }))).toEqual({ local: 0, session: 0 });
  await page.reload(); await expect(page.getByRole("button", { name: "Upload a PDF" })).toBeVisible(); expect(gets).toBe(1);
  expect(errors).toEqual([]);
});

const classes: [string, number, string][] = [
  ["too_large", 413, "25 MB"], ["wrong_type", 415, "Export your document"], ["malformed", 422, "Export a fresh PDF"],
  ["encrypted", 422, "unencrypted copy"], ["no_text", 422, "selectable text"], ["extraction_limit", 422, "fewer pages"],
  ["limit_reached", 429, "Wait before"], ["disabled", 503, "currently unavailable"], ["forbidden", 403, "Reload this page"],
  ["invalid_request", 400, "Choose one PDF"], ["timeout", 504, "outcome is uncertain"], ["cancelled", 408, "outcome is uncertain"],
  ["storage_unavailable", 503, "temporarily unavailable"], ["replacement_conflict", 409, "cannot be identified"], ["internal", 500, "outcome is uncertain"],
];
for (const [code, status, text] of classes) test(`mocked: authored ${code} recovery preserves accessible prior source`, async ({ page }) => {
  let posts = 0;
  await page.route("**/api/sources/**", route => route.request().method() === "POST"
    ? ++posts === 1 ? reply(route, 201, { ok: true, source: source() }) : fail(route, status, code)
    : reply(route, 200, { ok: true, source: source() }));
  await page.goto("/"); await load(page); await choose(page, "replacement.pdf");
  await expect(page.locator(".source-panel").getByRole("status")).toContainText(text);
  await expect(page.getByRole("button", { name: "Replace PDF" })).toBeEnabled();
  await page.getByRole("button", { name: "Inspect extracted text" }).click();
  await expect(page.getByText("Final marker", { exact: true })).toBeVisible();
  await expect(page.locator(".source-panel").getByRole("status")).not.toContainText("PRIVATE"); expect(posts).toBe(2);
});

test("mocked: second 401 stops retry and expired prior source is cleared", async ({ page }) => {
  let posts = 0;
  await page.route("**/api/sources/**", route => {
    if (route.request().method() === "POST") { posts++; return posts === 1 ? reply(route, 201, { ok: true, source: source() }) : fail(route, 401, "visitor_required"); }
    return posts === 1 ? reply(route, 200, { ok: true, source: source() }) : fail(route, 404, "unavailable");
  });
  await page.goto("/"); await load(page); await choose(page);
  await expect(page.locator(".source-panel").getByRole("status")).toContainText("cookies are unavailable");
  await expect(page.getByRole("button", { name: "Upload a PDF" })).toBeEnabled(); expect(posts).toBe(3);
});

test("mocked: byte boundary accepts exact limit; larger file and non-PDF do not upload", async ({ page }) => {
  let posts = 0;
  await page.route("**/api/sources/**", route => { if (route.request().method() === "POST") posts++; return route.request().method() === "POST" ? reply(route, 201, { ok: true, source: source() }) : reply(route, 200, { ok: true, source: source() }); });
  await page.goto("/"); await choose(page, "limit.pdf", 25_000_000); await expect(page.locator(".source-panel").getByRole("status")).toContainText("PDF text ready"); expect(posts).toBe(1);
  await choose(page, "over.pdf", 25_000_001); await expect(page.locator(".source-panel").getByRole("status")).toContainText("too large"); expect(posts).toBe(1);
  await choose(page, "not.txt"); await expect(page.locator(".source-panel").getByRole("status")).toContainText("Choose a PDF file"); expect(posts).toBe(1);
});

test("mocked: replacement, text-fetch retry without reupload, remove and already removed", async ({ page }) => {
  let posts = 0, gets = 0, deletes = 0;
  await page.route("**/api/sources/**", route => {
    const method = route.request().method();
    if (method === "POST") { posts++; return reply(route, 201, { ok: true, source: source(posts === 1 ? idA : idB) }); }
    if (method === "DELETE") return ++deletes === 1 ? reply(route, 200, { ok: true }) : fail(route, 404, "unavailable");
    gets++; return gets === 2 ? fail(route, 503, "storage_unavailable") : reply(route, 200, { ok: true, source: source(route.request().url().endsWith(idA) ? idA : idB) });
  });
  await page.goto("/"); await load(page); await choose(page, "replacement.pdf");
  await expect(page.locator(".source-panel").getByRole("status")).toContainText("PDF stored, but"); expect(posts).toBe(2);
  await page.getByRole("button", { name: "Retry text" }).click(); await expect(page.locator(".source-panel").getByRole("status")).toContainText("PDF text ready"); expect(posts).toBe(2);
  await expect(page.getByText("replacement.pdf", { exact: true })).toBeVisible();
  await remove(page); await expect(page.locator(".source-panel").getByRole("status")).toContainText("Source removed or already unavailable");
  await load(page); await remove(page); await expect(page.locator(".source-panel").getByRole("status")).toContainText("Source removed or already unavailable"); expect(deletes).toBe(2);
});

test("mocked: uncertain committed replacement clears prior 404; deliberate retry recovers", async ({ page }) => {
  let posts = 0;
  await page.route("**/api/sources/**", route => {
    if (route.request().method() === "POST") { posts++; return posts === 2 ? route.abort("failed") : reply(route, 201, { ok: true, source: source(posts === 1 ? idA : idB) }); }
    return posts === 2 ? fail(route, 404, "unavailable") : reply(route, 200, { ok: true, source: source(posts === 1 ? idA : idB) });
  });
  await page.goto("/"); await load(page); await choose(page);
  await expect(page.locator(".source-panel").getByRole("status")).toContainText("previous source is no longer accessible"); expect(posts).toBe(2);
  await load(page); expect(posts).toBe(3);
});

test("mocked: cancellation ignores late success while one mutation is active", async ({ page }) => {
  // Controlled browser fetch adapter deliberately ignores AbortSignal to exercise stale-result guards.
  await page.addInitScript(() => {
    const original = window.fetch;
    let count = 0;
    window.fetch = async (url, init) => {
      if (String(url) === "/api/sources/pdf" && ++count === 2) {
        return new Promise<Response>(resolve => {
          Object.assign(window, { releaseLate: () => resolve(new Response(JSON.stringify({ ok: true, source: { id: "22222222-2222-4222-8222-222222222222" } }), { status: 201 })) });
        });
      }
      return original(url, init);
    };
  });
  await page.route("**/api/sources/**", route => reply(route, route.request().method() === "POST" ? 201 : 200, { ok: true, source: source() }));
  await page.goto("/"); await load(page); await choose(page, "late.pdf");
  await expect(page.getByRole("button", { name: "Replace PDF" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Remove", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Cancel import" }).click();
  await expect(page.locator(".source-panel").getByRole("status")).toContainText("may still replace it");
  await page.evaluate(() => (window as unknown as { releaseLate: () => void }).releaseLate());
  await page.getByRole("button", { name: "Check source" }).click(); await expect(page.locator(".source-panel").getByRole("status")).toContainText("PDF text ready");
  await expect(page.getByText("Résumé 日本語.pdf", { exact: true })).toBeVisible();
  await expect(page.getByText("late.pdf", { exact: true })).toHaveCount(0);
});

for (const network of [false, true]) test(`mocked: removal ${network ? "network loss" : "503"} does not confirm deletion`, async ({ page }) => {
  await page.route("**/api/sources/**", route => route.request().method() === "DELETE" ? network ? route.abort("failed") : fail(route, 503, "storage_unavailable")
    : reply(route, route.request().method() === "POST" ? 201 : 200, { ok: true, source: source() }));
  await page.goto("/"); await load(page); await remove(page);
  await expect(page.locator(".source-panel").getByRole("status")).toContainText("Removal is not confirmed");
  await expect(page.getByRole("button", { name: "Inspect extracted text" })).toBeEnabled();
});

test("mocked: explicit content recheck handles generic expired 404", async ({ page }) => {
  let gets = 0;
  await page.route("**/api/sources/**", route => route.request().method() === "POST" ? reply(route, 201, { ok: true, source: source() })
    : ++gets === 1 ? reply(route, 200, { ok: true, source: source() }) : fail(route, 404, "unavailable"));
  await page.goto("/"); await load(page); await page.getByRole("button", { name: "Check source" }).click();
  await expect(page.locator(".source-panel").getByRole("status")).toContainText("expired or is no longer available");
  await expect(page.getByRole("button", { name: "Upload a PDF" })).toBeEnabled();
});

test("integrated: actual PDF parser + synthetic repository, full 384-line preview, replace/failure/remove", async ({ page }, info) => {
  const errors: string[] = [], posts: number[] = [];
  let lastId = "";
  page.on("pageerror", e => errors.push(e.message));
  page.on("console", m => { if (m.type() === "error" && !/401 \(Unauthorized\)|422 \(Unprocessable (Entity|Content)\)/.test(m.text())) errors.push(m.text()); });
  page.on("response", async response => {
    if (response.url().endsWith("/api/sources/pdf")) { posts.push(response.status()); if (response.status() === 201) lastId = (await response.json()).source.id; }
  });
  await page.goto("/");
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Upload a PDF" }).click();
  await (await chooser).setFiles("artifacts/local/04a/fixtures/small.pdf");
  await expect(page.locator(".source-panel").getByRole("status")).toContainText("PDF text ready"); const firstId = lastId;
  await page.locator('input[type="file"]').setInputFiles("artifacts/local/04a/fixtures/multi.pdf");
  await expect(page.locator(".source-panel").getByRole("status")).toContainText("PDF text ready"); expect(lastId).not.toBe(firstId);
  expect((await page.request.get(`/api/sources/${firstId}`)).status()).toBe(404);
  await page.screenshot({ path: `artifacts/local/05a/${info.project.name}-integrated-loaded.png`, fullPage: true });
  await page.getByRole("button", { name: "Inspect extracted text" }).click();
  const manifest = JSON.parse(await readFile("artifacts/local/04a/fixtures/manifest.json", "utf8"));
  const pages: string[][] = manifest.fixtures.find((f: { name: string }) => f.name === "multi").expectedPages;
  const actual = await page.locator(".page-text").allTextContents();
  expect(actual).toHaveLength(12);
  for (let index = 0; index < pages.length; index++) for (const line of pages[index]) expect(actual[index]).toContain(line);
  await page.getByRole("heading", { name: "Page 1", exact: true }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: `artifacts/local/05a/${info.project.name}-integrated-first.png` });
  await page.getByRole("heading", { name: "Page 12", exact: true }).scrollIntoViewIfNeeded();
  await expect(page.getByText("PAGE 12 FINAL marker", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Close text and return" }).last().scrollIntoViewIfNeeded();
  await page.screenshot({ path: `artifacts/local/05a/${info.project.name}-integrated-final.png` });
  await page.getByRole("button", { name: "Close text and return" }).last().click();
  await expect(page.getByRole("button", { name: "Inspect extracted text" })).toBeFocused();
  await page.locator('input[type="file"]').setInputFiles("artifacts/local/04a/fixtures/corrupt.pdf");
  await expect(page.locator(".source-panel").getByRole("status")).toContainText("Export a fresh PDF");
  await page.getByRole("button", { name: "Inspect extracted text" }).click(); await expect(page.getByRole("heading", { name: "Page 12", exact: true })).toBeVisible();
  await remove(page); await expect(page.locator(".source-panel").getByRole("status")).toContainText("Source removed or already unavailable");
  expect((await page.request.get(`/api/sources/${lastId}`)).status()).toBe(404);
  expect(posts).toEqual([401, 201, 201, 422]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});
