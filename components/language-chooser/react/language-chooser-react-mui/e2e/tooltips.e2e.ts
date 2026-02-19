import { test, expect, Page } from "@playwright/test";
import {
  clearSearch,
  clickCustomizationButton,
  createPageAndLoadLanguageChooser,
  search,
  selectChechenCard,
  resetBeforeEach,
  cleanupDialogHandlers,
} from "./e2eHelpers";

let page: Page;

// Don't do our usual beforeEach clear search
test.describe("Initial tooltip behavior", () => {
  test.beforeAll(async ({ browser }) => {
    page = await createPageAndLoadLanguageChooser(browser);
  });
  test("Initial 'Start typing' prompt tooltip appears on first load", async () => {
    // The initial prompt tooltip should be visible
    const tooltipText = page.getByText("Start typing to find your language.");
    await expect(tooltipText).toBeVisible();
  });

  test("Initial tooltip disappears when user types in search", async () => {
    // Reload to get the initial state
    await page.reload();
    await page.waitForLoadState("load");

    // Verify tooltip is visible
    const tooltipText = page.getByText("Start typing to find your language.");
    await expect(tooltipText).toBeVisible();

    // Start typing
    await search(page, "che");

    // Tooltip should now be hidden
    await expect(tooltipText).not.toBeVisible();
  });
});

test.describe("Tooltip behavior", () => {
  test.beforeAll(async ({ browser }) => {
    page = await createPageAndLoadLanguageChooser(browser);
  });

  test.beforeEach(async () => {
    await resetBeforeEach(page);
  });

  test.afterEach(async () => {
    await cleanupDialogHandlers(page);
  });

  test("'Select a script' tooltip appears when language with multiple scripts selected and no script chosen", async () => {
    // Select a language with multiple scripts (Chechen has Cyrillic, Latin, and Arabic)
    await selectChechenCard(page);

    // The "Select a script" tooltip should appear
    const scriptTooltip = page.getByText("Select a script");
    await expect(scriptTooltip).toBeVisible();
  });

  test("'Select a script' tooltip hides when script card scrolled out of view", async () => {
    await selectChechenCard(page);

    // Verify tooltip is visible
    const scriptTooltip = page.getByText("Select a script");
    await expect(scriptTooltip).toBeVisible();

    // Search for something else to scroll the script cards out of view
    await search(page, "japanese");

    // Tooltip should be hidden (the script cards are no longer visible)
    await expect(scriptTooltip).not.toBeVisible();
  });

  test("Info icon tooltip on customization button shows correct text for unlisted language state", async () => {
    // With no language selected, we're in "Create Unlisted Language" mode
    await clearSearch(page);

    const customizationButton = page.getByTestId("customization-button");
    const infoIcon = customizationButton.getByTestId("InfoOutlinedIcon");

    // Hover over the info icon to trigger tooltip
    await infoIcon.hover();

    // Check for unlisted language tooltip text
    const unlistedTooltip = page.getByText(
      /If you cannot find a language and it does not appear in ethnologue.com/
    );
    await expect(unlistedTooltip).toBeVisible();
  });

  test("Info icon tooltip on customization button shows correct text for customize state", async () => {
    // Select a language to enter "Customize" mode
    await selectChechenCard(page);

    const customizationButton = page.getByTestId("customization-button");
    const infoIcon = customizationButton.getByTestId("InfoOutlinedIcon");

    // Hover over the info icon
    await infoIcon.hover();

    // Check for customize tooltip text
    const customizeTooltip = page.getByText(
      /If you found the main language but need to change some of the specifics/
    );
    await expect(customizeTooltip).toBeVisible();
  });

  test("Manual tag entry tooltip appears on tag preview in customization dialog", async () => {
    await selectChechenCard(page);
    await clickCustomizationButton(page);

    const tagPreview = page.getByTestId("customization-dialog-tag-preview");
    await expect(tagPreview).toBeVisible();

    const infoIcon = tagPreview.getByTestId("InfoOutlinedIcon");

    // Hover over the info icon
    await infoIcon.hover();

    // Look for the advanced/manual entry tooltip
    const manualEntryTooltip = page.getByText(/Advanced/);
    await expect(manualEntryTooltip).toBeVisible();

    // Should also show the warning/instruction about CTRL+click
    const instructionText = page.getByText(
      /If this user interface is not offering you a code/
    );
    await expect(instructionText).toBeVisible();
  });
});
