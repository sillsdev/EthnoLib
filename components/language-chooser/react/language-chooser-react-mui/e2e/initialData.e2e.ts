import { test, expect } from "@playwright/test";
import {
  languageCardTestId,
  scriptCardTestId,
  customizationDialogLocator,
  clickCustomizationButton,
} from "./e2eHelpers";

async function createPageWithParams(browser, params: Record<string, string>) {
  const page = await browser.newPage();
  const queryString = new URLSearchParams(params).toString();
  await page.goto(`/?${queryString}`, { waitUntil: "load" });
  return page;
}

test.describe("Initial data via URL parameters", () => {
  let page;

  test.afterEach(async () => {
    if (page) {
      await page.close();
      page = undefined;
    }
  });

  test("initialLanguageTag with language only selects the language card", async ({
    browser,
  }) => {
    page = await createPageWithParams(browser, {
      initialLanguageTag: "jpn",
    });

    // Check that the Japanese language card is selected
    const japaneseCardButton = page.locator(
      `button:has([data-testid="${languageCardTestId("jpn")}"])`
    );
    await expect(japaneseCardButton).toBeVisible();
    await expect(japaneseCardButton).toHaveClass(
      /.*selected-option-card-button.*/
    );

    // Verify tag preview shows "ja"
    const tagPreview = page.getByTestId("right-panel-langtag-preview");
    await expect(tagPreview).toBeVisible();
    await expect(tagPreview).toContainText("ja");
  });

  test("initialLanguageTag with explicit script selects the language and script cards", async ({
    browser,
  }) => {
    page = await createPageWithParams(browser, {
      initialLanguageTag: "sr-Latn", // Serbian with Latin (Cyrillic is default)
    });

    // Check that Serbian language card is selected
    const serbianCardButton = page.locator(
      `button:has([data-testid="${languageCardTestId("srp")}"])`
    );
    await expect(serbianCardButton).toBeVisible();
    await expect(serbianCardButton).toHaveClass(
      /.*selected-option-card-button.*/
    );

    // Check that Latin script card is selected
    const latnCardButton = page.locator(
      `button:has([data-testid="${scriptCardTestId("Latn")}"])`
    );
    await expect(latnCardButton).toBeVisible();
    await expect(latnCardButton).toHaveClass(/.*selected-option-card-button.*/);

    // Verify tag preview shows "sr-Latn"
    const tagPreview = page.getByTestId("right-panel-langtag-preview");
    await expect(tagPreview).toContainText("sr-Latn");
  });

  test("initialLanguageTag with implied script selects language and script (ce implies Cyrl)", async ({
    browser,
  }) => {
    page = await createPageWithParams(browser, {
      initialLanguageTag: "ce", // Chechen, Cyrillic is the default/suppressed script
    });

    // Check that Chechen language card is selected
    const chechenCardButton = page.locator(
      `button:has([data-testid="${languageCardTestId("che")}"])`
    );
    await expect(chechenCardButton).toBeVisible();
    await expect(chechenCardButton).toHaveClass(
      /.*selected-option-card-button.*/
    );

    // Check that Cyrillic script card is visible and selected (implied script)
    const cyrlCardButton = page.locator(
      `button:has([data-testid="${scriptCardTestId("Cyrl")}"])`
    );
    await expect(cyrlCardButton).toBeVisible();
    await expect(cyrlCardButton).toHaveClass(/.*selected-option-card-button.*/);

    // Verify tag preview shows "ce" (script is suppressed)
    const tagPreview = page.getByTestId("right-panel-langtag-preview");
    await expect(tagPreview).toContainText("ce");
    await expect(tagPreview).not.toContainText("ce-Cyrl");
  });

  test("initialLanguageTag with implied script selects language and script (uzn-AF implies Arab)", async ({
    browser,
  }) => {
    page = await createPageWithParams(browser, {
      initialLanguageTag: "uzn-AF",
    });

    // Check that Northern Uzbek language card is selected
    const uzbCardButton = page.locator(
      `button:has([data-testid="${languageCardTestId("uzn")}"])`
    );
    await expect(uzbCardButton).toBeVisible();
    await expect(uzbCardButton).toHaveClass(/.*selected-option-card-button.*/);

    // Check that Arabic script card is selected
    const arabCardButton = page.locator(
      `button:has([data-testid="${scriptCardTestId("Arab")}"])`
    );
    await expect(arabCardButton).toBeVisible();
    await expect(arabCardButton).toHaveClass(/.*selected-option-card-button.*/);

    // Verify tag preview
    const tagPreview = page.getByTestId("right-panel-langtag-preview");
    await expect(tagPreview).toContainText("uzn-AF");
  });

  test("initialLanguageTag with region populates region field", async ({
    browser,
  }) => {
    page = await createPageWithParams(browser, {
      initialLanguageTag: "en-GB",
    });

    // Check that English language card is selected
    const englishCardButton = page.locator(
      `button:has([data-testid="${languageCardTestId("eng")}"])`
    );
    await expect(englishCardButton).toBeVisible();
    await expect(englishCardButton).toHaveClass(
      /.*selected-option-card-button.*/
    );

    // Open customization dialog to check region
    const customizeButton = page.getByTestId("customization-button");
    await customizeButton.click();

    const customizationDialog = customizationDialogLocator(page);
    await expect(customizationDialog).toBeVisible();

    // Check that region field has "GB" or "United Kingdom"
    const regionField = customizationDialog.locator("#customize-region-field");
    await expect(regionField).toHaveValue(/GB|United Kingdom/);

    // Verify tag preview shows "en-GB"
    const tagPreview = page.getByTestId("right-panel-langtag-preview");
    await expect(tagPreview).toContainText("en-GB");
  });

  test("initialLanguageTag with variant populates variant field", async ({
    browser,
  }) => {
    page = await createPageWithParams(browser, {
      initialLanguageTag: "sr-Latn-x-foobar",
    });

    // Check that Serbian language card is selected
    const serbianCardButton = page.locator(
      `button:has([data-testid="${languageCardTestId("srp")}"])`
    );
    await expect(serbianCardButton).toBeVisible();
    await expect(serbianCardButton).toHaveClass(
      /.*selected-option-card-button.*/
    );

    // Open customization dialog to check variant
    const customizeButton = page.getByTestId("customization-button");
    await customizeButton.click();

    const customizationDialog = customizationDialogLocator(page);
    await expect(customizationDialog).toBeVisible();

    // Check that variant field has "foobar"
    const variantField = customizationDialog.locator(
      "#customize-variant-field"
    );
    await expect(variantField).toHaveValue("foobar");

    // Verify tag preview shows the variant
    const tagPreview = page.getByTestId("right-panel-langtag-preview");
    await expect(tagPreview).toContainText("sr-Latn-x-foobar");
  });

  test("initialLanguageTag with complex tag (script, region, variant)", async ({
    browser,
  }) => {
    page = await createPageWithParams(browser, {
      initialLanguageTag: "uzn-Cyrl-AT-x-dialect1",
    });

    // Check that Northern Uzbek language card is selected
    const uzbCardButton = page.locator(
      `button:has([data-testid="${languageCardTestId("uzn")}"])`
    );
    await expect(uzbCardButton).toBeVisible();
    await expect(uzbCardButton).toHaveClass(/.*selected-option-card-button.*/);

    // Check that Cyrillic script card is selected
    const cyrlCardButton = page.locator(
      `button:has([data-testid="${scriptCardTestId("Cyrl")}"])`
    );
    await expect(cyrlCardButton).toBeVisible();
    await expect(cyrlCardButton).toHaveClass(/.*selected-option-card-button.*/);

    // Open customization dialog to check region and variant
    const customizeButton = page.getByTestId("customization-button");
    await customizeButton.click();

    const customizationDialog = customizationDialogLocator(page);
    await expect(customizationDialog).toBeVisible();

    // Check region field
    const regionField = customizationDialog.locator("#customize-region-field");
    await expect(regionField).toHaveValue(/AT|Austria/);

    // Check variant field
    const variantField = customizationDialog.locator(
      "#customize-variant-field"
    );
    await expect(variantField).toHaveValue("dialect1");

    // Verify tag preview
    const tagPreview = page.getByTestId("right-panel-langtag-preview");
    await expect(tagPreview).toContainText("uzn-Cyrl-AT-x-dialect1");
  });

  test("initialCustomDisplayName sets the display name field", async ({
    browser,
  }) => {
    page = await createPageWithParams(browser, {
      initialLanguageTag: "jpn",
      initialCustomDisplayName: "My Custom Japanese Name",
    });

    // Check that display name field has the custom name
    const displayNameField = page.locator("#language-name-bar");
    await expect(displayNameField).toBeVisible();
    await expect(displayNameField).toHaveValue("My Custom Japanese Name");
  });

  test("invalid initialLanguageTag is handled gracefully", async ({
    browser,
  }) => {
    const invalidTag = "&&&&&&&&&&&&&&&&not-a-valid-tag-12345";
    page = await createPageWithParams(browser, {
      initialLanguageTag: invalidTag,
    });

    // Application should load without errors
    await expect(page.getByText("Choose Language")).toBeVisible();

    // No language card should be selected
    const selectedCards = page.locator(
      'button[class*="selected-option-card-button"]'
    );
    await expect(selectedCards).toHaveCount(0);

    // ok button should be disabled
    const okButton = page.getByTestId("lang-chooser-dialog-ok-button");
    await expect(okButton).toBeDisabled();
  });

  test("invalid script in initialLanguageTag is handled gracefully", async ({
    browser,
  }) => {
    page = await createPageWithParams(browser, {
      initialLanguageTag: "eng-Xyzt", // Invalid script code
    });

    // Application should load
    await expect(page.getByText("Choose Language")).toBeVisible();
  });

  test("all URL parameters combined work together", async ({ browser }) => {
    page = await createPageWithParams(browser, {
      uiLanguage: "en",
      initialLanguageTag: "sr-Latn-US",
      initialSearchString: "serbian",
      initialCustomDisplayName: "My Serbian Variant",
    });

    // Check language selection
    const serbianCardButton = page.locator(
      `button:has([data-testid="${languageCardTestId("srp")}"])`
    );
    await expect(serbianCardButton).toBeVisible();
    await expect(serbianCardButton).toHaveClass(
      /.*selected-option-card-button.*/
    );

    // Check script selection
    const latnCardButton = page.locator(
      `button:has([data-testid="${scriptCardTestId("Latn")}"])`
    );
    await expect(latnCardButton).toBeVisible();
    await expect(latnCardButton).toHaveClass(/.*selected-option-card-button.*/);

    // Check display name
    const displayNameField = page.locator("#language-name-bar");
    await expect(displayNameField).toHaveValue("My Serbian Variant");

    // Check region in customization dialog
    const customizeButton = page.getByTestId("customization-button");
    await customizeButton.click();

    const customizationDialog = customizationDialogLocator(page);
    const regionField = customizationDialog.locator("#customize-region-field");
    await expect(regionField).toHaveValue(/US|United States/);

    // Verify tag preview
    const tagPreview = page.getByTestId("right-panel-langtag-preview");
    await expect(tagPreview).toContainText("sr-Latn-US");
  });

  test("initialLanguageTag with manually entered language tag", async ({
    browser,
  }) => {
    page = await createPageWithParams(browser, {
      initialLanguageTag: "zzz-Foo-x-barbaz",
    });

    // Application should load without errors
    await expect(page.getByText("Choose Language")).toBeVisible();

    // Verify tag preview shows the manually entered tag
    const tagPreview = page.getByTestId("right-panel-langtag-preview");
    await expect(tagPreview).toBeVisible();
    await expect(tagPreview).toContainText("zzz-Foo-x-barbaz");

    // Verify customization button says "Edit Language Tag" for manually entered tags
    const customizeButton = page.getByTestId("customization-button");
    await expect(customizeButton).toHaveText(/Edit Language Tag.*/);

    // Open customization dialog
    const dialogHandled = page.waitForEvent("dialog").then(async (dialog) => {
      await expect(dialog.type()).toBe("prompt");
      await expect(dialog.message()).toMatch(
        /.*If this user interface is not offering you a code that you know is valid ISO 639 code, you can enter it here.*/
      );
      await dialog.dismiss();
    });
    await clickCustomizationButton(page);
    await dialogHandled;
  });
});
