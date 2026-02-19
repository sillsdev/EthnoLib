import { test, expect, Page } from "@playwright/test";
import {
  clearSearch,
  createPageAndLoadLanguageChooser,
  search,
  selectChechenCard,
  selectChechenCyrlCard,
  toggleScriptCard,
} from "./e2eHelpers";

let page: Page;

test.describe("Right panel functionality", () => {
  test.beforeAll(async ({ browser }) => {
    page = await createPageAndLoadLanguageChooser(browser);
  });

  test.beforeEach(async () => {
    await clearSearch(page);
  });

  test("Display name field shows default name when no custom name entered", async () => {
    await selectChechenCard(page);

    const displayNameField = page.locator("#language-name-bar");
    await expect(displayNameField).toBeVisible();

    await expect(displayNameField).toHaveValue("Нохчийн мотт");
  });

  test("Display name field edits update the value", async () => {
    await selectChechenCard(page);

    const displayNameField = page.locator("#language-name-bar");
    const customName = "My Custom Chechen Name";
    await displayNameField.fill(customName);

    await expect(displayNameField).toHaveValue(customName);
  });

  test("Display name field shows 'required' label when empty and blocking submission", async () => {
    await selectChechenCyrlCard(page);

    const displayNameField = page.locator("#language-name-bar");

    // Clear the display name
    await displayNameField.fill("");

    // The "required" label should appear
    const requiredLabel = page.getByText("required");
    await expect(requiredLabel).toBeVisible();

    // And the OK button should be disabled
    const okButton = page.getByTestId("lang-chooser-dialog-ok-button");
    await expect(okButton).toBeDisabled();
  });

  test("Display name clears when selecting different language", async () => {
    await selectChechenCard(page);

    const displayNameField = page.locator("#language-name-bar");

    // Set a custom display name
    const customName = "Custom Chechen Name";
    await displayNameField.fill(customName);
    await expect(displayNameField).toHaveValue(customName);

    await search(page, "english");
    const englishCard = page.getByTestId("language-card-eng");
    await englishCard.click();
    await expect(displayNameField).toHaveValue("English");
    await expect(displayNameField).not.toHaveValue(customName);
  });

  test("Tag preview updates when language selected", async () => {
    await selectChechenCard(page);

    const tagPreview = page.getByTestId("right-panel-langtag-preview");
    await expect(tagPreview).toBeVisible();

    // Should show "ce" for Chechen
    await expect(tagPreview).toContainText("ce");
  });

  test("Tag preview updates when script selected", async () => {
    await selectChechenCyrlCard(page);

    const tagPreview = page.getByTestId("right-panel-langtag-preview");

    // Should still show "ce" (Cyrillic is suppressed for Chechen as it's the default)
    await expect(tagPreview).toContainText("ce");
    await expect(tagPreview).not.toContainText("ce-Cyrl");

    // Now select Arabic script
    await toggleScriptCard(page, "Arab");

    // Should show "ce-Arab"
    await expect(tagPreview).toContainText("ce-Arab");
  });
});
