import { expect, test } from "@playwright/test";

test("shell loads, describes unavailable features, and fits the viewport", async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  const response = await page.goto("/");
  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle("Talk to a Document");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("A little more understanding.");
  await expect(page.getByRole("button", { name: "Upload a PDF" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Add a YouTube video" })).toBeDisabled();
  await expect(page.getByText("Voice and text conversations are not connected yet.")).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to workspace" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("main")).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect(errors).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath("shell.png"), fullPage: true });
});
