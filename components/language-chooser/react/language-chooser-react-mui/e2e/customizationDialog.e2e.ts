import { test, expect } from "@playwright/test";
import { clearSearch, findCyrlCard } from "./e2eHelpers";

test.describe("create unlisted language dialog", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("no language selected, button should say 'Create Unlisted Language'", async ({
    page,
  }) => {
    await clearSearch(page);
    const customizationButton = page.getByTestId("customization-button");
    await expect(customizationButton).toHaveText(/Create Unlisted Language.*/);
    await expect(customizationButton.getByTestId("EditIcon")).not.toBeVisible();
  });

  test("if language selected, button should say 'Customize'", async ({
    page,
  }) => {
    await findCyrlCard(page);
    const customizationButton = page.getByTestId("customization-button");
    await expect(customizationButton).toHaveText(/Customize.*/);
    await expect(customizationButton.getByTestId("EditIcon")).toBeVisible();
  });

  test("open and cancel dialog", async ({ page }) => {
    await expect(page.getByTestId("customization-dialog")).not.toBeVisible();
    await page.getByTestId("customization-button").click();
    await expect(page.getByTestId("customization-dialog")).toBeVisible();
    await page.getByTestId("customization-dialog-cancel-button").click();
    await expect(page.getByTestId("customization-dialog")).not.toBeVisible();
  });

  // TODO what fields tests, prefilling tests, ok button enabling tests, dialog resetting between selections,
  // required labels, info icon hover, tag previews
});

/* 
  right side (display name and tag preview)
*/

// TODO compare lameta
// TODO fix bash prompt
// TODO try storybook tests
// TODO where expect and where await? expect(await page.locator("h1").innerText()).toContain("Welcome");
