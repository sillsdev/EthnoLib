import { test, expect, Page } from "@playwright/test";
import {
  clearSearch,
  createPageAndLoadLanguageChooser,
  languageCardTestId,
  scriptCardTestId,
  search,
} from "./e2eHelpers";

let page: Page; // All the tests in this file use the same page object to save time; we only load the language chooser once.

test.describe("Language tag creation and preview", () => {
  test.beforeAll(async ({ browser }) => {
    page = await createPageAndLoadLanguageChooser(browser);
  });
  test.beforeEach(async () => {
    await clearSearch(page);
  });

  test("Northern Uzbek with Cyrillic script displays uzn-Cyrl tag", async () => {
    await search(page, "uzbek");

    // Find and click the Northern Uzbek card
    const uzbCard = page.getByTestId(languageCardTestId("uzn"));
    await uzbCard.scrollIntoViewIfNeeded();
    await expect(uzbCard).toBeVisible();
    await uzbCard.click();

    // Select Cyrillic script
    const cyrlCard = page.getByTestId(scriptCardTestId("Cyrl"));
    await expect(cyrlCard).toBeVisible();
    await cyrlCard.click();

    // Verify the language tag preview
    const tagPreview = page.getByTestId("right-panel-langtag-preview");
    await expect(tagPreview).toBeVisible();
    await expect(tagPreview).toContainText("uzn-Cyrl");
  });

  test("Chechen with Cyrillic script displays ce tag", async () => {
    await search(page, "chechen");

    const chechenCard = page.getByTestId(languageCardTestId("che"));
    await chechenCard.scrollIntoViewIfNeeded();
    await expect(chechenCard).toBeVisible();
    await expect(chechenCard).toContainText(/chechen/i);
    await chechenCard.click();

    // Select Cyrillic script
    const cyrlCard = page.getByTestId(scriptCardTestId("Cyrl"));
    await expect(cyrlCard).toBeVisible();
    await cyrlCard.click();

    // Verify the language tag preview
    const tagPreview = page.getByTestId("right-panel-langtag-preview");
    await expect(tagPreview).toBeVisible();
    await expect(tagPreview).toContainText("ce");
  });

  test("Serbian with Latin script displays sr-Latn tag", async () => {
    await search(page, "serbian");

    const serbianCard = page.getByTestId(languageCardTestId("srp"));
    await serbianCard.scrollIntoViewIfNeeded();
    await expect(serbianCard).toBeVisible();
    await expect(serbianCard).toContainText(/serbian/i);
    await serbianCard.click();

    // Select Latin script
    const latnCard = page.getByTestId(scriptCardTestId("Latn"));
    await expect(latnCard).toBeVisible();
    await latnCard.click();

    // Verify the language tag preview
    const tagPreview = page.getByTestId("right-panel-langtag-preview");
    await expect(tagPreview).toBeVisible();
    await expect(tagPreview).toContainText("sr-Latn");
  });

  test("Japanese without script selection displays ja tag", async () => {
    await search(page, "japanese");

    const japaneseCard = page.getByTestId(languageCardTestId("jpn"));
    await japaneseCard.scrollIntoViewIfNeeded();
    await expect(japaneseCard).toBeVisible();
    await expect(japaneseCard).toContainText(/japanese/i);
    await japaneseCard.click();

    // Verify the language tag preview shows just the base language code
    const tagPreview = page.getByTestId("right-panel-langtag-preview");
    await expect(tagPreview).toBeVisible();
    await expect(tagPreview).toContainText("ja");
  });

  test("Tok Pisin displays tpi tag", async () => {
    await search(page, "tok pisin");

    const tpiCard = page.getByTestId(languageCardTestId("tpi"));
    await tpiCard.scrollIntoViewIfNeeded();
    await expect(tpiCard).toBeVisible();
    await expect(tpiCard).toContainText(/tok pisin/i);
    await tpiCard.click();

    // Verify the language tag preview
    const tagPreview = page.getByTestId("right-panel-langtag-preview");
    await expect(tagPreview).toBeVisible();
    await expect(tagPreview).toContainText("tpi");
  });

  test("Deselecting script card removes script from tag", async () => {
    await search(page, "uzbek");

    const uzbCard = page.getByTestId(languageCardTestId("uzn"));
    await uzbCard.scrollIntoViewIfNeeded();
    await expect(uzbCard).toBeVisible();
    await uzbCard.click();

    // Select Cyrillic script
    const cyrlCard = page.getByTestId(scriptCardTestId("Cyrl"));
    await expect(cyrlCard).toBeVisible();
    await cyrlCard.click();

    // Verify tag includes script
    let tagPreview = page.getByTestId("right-panel-langtag-preview");
    await expect(tagPreview).toContainText("uzn-Cyrl");

    // Deselect script
    await cyrlCard.click();

    // Verify tag no longer includes script
    await expect(tagPreview).toContainText("uzn");
    await expect(tagPreview).not.toContainText("uzn-Cyrl");
  });

  test("Akan special case", async () => {
    await search(page, "akan");

    const akanCard = page.getByTestId(languageCardTestId("aka"));
    await akanCard.scrollIntoViewIfNeeded();
    await expect(akanCard).toBeVisible();
    await expect(akanCard).toContainText(/akan/i);
    await akanCard.click();

    // Select Latin script
    const latnCard = page.getByTestId(scriptCardTestId("Latn"));
    await expect(latnCard).toBeVisible();
    await latnCard.click();

    // Verify the language tag preview shows just "ak" (Latin is suppressed)
    const tagPreview = page.getByTestId("right-panel-langtag-preview");
    await expect(tagPreview).toBeVisible();
    await expect(tagPreview).toContainText("ak");
    await expect(tagPreview).not.toContainText("twi");
    await expect(tagPreview).not.toContainText("aka");

    // Select Arabic script
    const arabCard = page.getByTestId(scriptCardTestId("Arab"));
    await expect(arabCard).toBeVisible();
    await arabCard.click();

    // Verify the language tag preview
    const arabTagPreview = page.getByTestId("right-panel-langtag-preview");
    await expect(arabTagPreview).toBeVisible();
    await expect(arabTagPreview).toContainText("ak-Arab");
  });

  test("Sanskrit special case", async () => {
    await search(page, "sanskrit");

    const sanskritCard = page.getByTestId(languageCardTestId("san"));
    await sanskritCard.scrollIntoViewIfNeeded();
    await expect(sanskritCard).toBeVisible();
    await expect(sanskritCard).toContainText(/sanskrit/i);
    await sanskritCard.click();

    // Verify the language tag preview shows just the base language code
    const tagPreview = page.getByTestId("right-panel-langtag-preview");
    await expect(tagPreview).toBeVisible();
    await expect(tagPreview).toContainText("sa");

    // Select Latin script
    const latnCard = page.getByTestId(scriptCardTestId("Latn"));
    await expect(latnCard).toBeVisible();
    await latnCard.click();

    // Verify the language tag preview
    const saLatnTagPreview = page.getByTestId("right-panel-langtag-preview");
    await expect(saLatnTagPreview).toBeVisible();
    await expect(saLatnTagPreview).toContainText("sa-Latn");
  });

  test("Chinese special case", async () => {
    await search(page, "chinese");

    const chineseCard = page.getByTestId(languageCardTestId("cmn"));
    await chineseCard.scrollIntoViewIfNeeded();
    await expect(chineseCard).toBeVisible();
    await expect(chineseCard).toContainText(/chinese/i);
    await chineseCard.click();

    const noScriptTagPreview = page.getByTestId("right-panel-langtag-preview");
    await expect(noScriptTagPreview).toBeVisible();
    await expect(noScriptTagPreview).toContainText("zh");

    // select Chinese (Traditional) script
    const tradCard = page.getByTestId(scriptCardTestId("Hant"));
    await expect(tradCard).toBeVisible();
    await tradCard.click();

    const tradTagPreview = page.getByTestId("right-panel-langtag-preview");
    await expect(tradTagPreview).toBeVisible();
    await expect(tradTagPreview).toContainText("zh-TW");

    // select Chinese (Simplified) script
    const simpCard = page.getByTestId(scriptCardTestId("Hans"));
    await expect(simpCard).toBeVisible();
    await simpCard.click();

    const simpTagPreview = page.getByTestId("right-panel-langtag-preview");
    await expect(simpTagPreview).toBeVisible();
    await expect(simpTagPreview).toContainText("zh-CN");
  });

  test("Tag preview updates when customizations applied via dialog", async () => {
    await search(page, "uzbek");

    const uzbCard = page.getByTestId(languageCardTestId("uzn"));
    await uzbCard.scrollIntoViewIfNeeded();
    await expect(uzbCard).toBeVisible();
    await uzbCard.click();

    // Select a script first
    const cyrlCard = page.getByTestId(scriptCardTestId("Cyrl"));
    await cyrlCard.click();

    let tagPreview = page.getByTestId("right-panel-langtag-preview");
    await expect(tagPreview).toContainText("uzn-Cyrl");

    // Open customization dialog and add region
    const customizationButton = page.getByTestId("customization-button");
    await customizationButton.click();

    const customizationDialog = page.getByTestId("customization-dialog");
    await expect(customizationDialog).toBeVisible();

    // Add a region
    const regionField = customizationDialog.locator(
      "#customize-region-field-wrapper"
    );
    await regionField.getByLabel("Open").click();
    await page
      .getByRole("option", { name: /Afghanistan/ })
      .first()
      .click();

    // Dialog tag preview should update
    const dialogTagPreview = customizationDialog.getByTestId(
      "customization-dialog-tag-preview"
    );
    await expect(dialogTagPreview).toContainText("uzn-Cyrl-AF");

    // Click OK
    await customizationDialog.getByRole("button", { name: "OK" }).click();

    // Main tag preview should now show the region
    tagPreview = page.getByTestId("right-panel-langtag-preview");
    await expect(tagPreview).toContainText("uzn-Cyrl-AF");
  });

  test("Tag preview updates when variant/dialect added", async () => {
    await search(page, "chechen");

    const chechenCard = page.getByTestId(languageCardTestId("che"));
    await chechenCard.click();

    // Open customization dialog
    const customizationButton = page.getByTestId("customization-button");
    await customizationButton.click();

    const customizationDialog = page.getByTestId("customization-dialog");
    await expect(customizationDialog).toBeVisible();

    // Add a variant
    const variantField = customizationDialog.locator(
      "#customize-variant-field"
    );
    await variantField.fill("foobar");

    // Dialog tag preview should update
    const dialogTagPreview = customizationDialog.getByTestId(
      "customization-dialog-tag-preview"
    );
    await expect(dialogTagPreview).toContainText("ce-x-foobar");

    // Click OK
    await customizationDialog.getByRole("button", { name: "OK" }).click();

    // Main tag preview should include the variant
    const tagPreview = page.getByTestId("right-panel-langtag-preview");
    await expect(tagPreview).toContainText("ce-x-foobar");
  });

  test("Tag preview updates correctly when switching between languages", async () => {
    // Select first language
    await search(page, "chechen");
    const chechenCard = page.getByTestId(languageCardTestId("che"));
    await chechenCard.click();

    let tagPreview = page.getByTestId("right-panel-langtag-preview");
    await expect(tagPreview).toContainText("ce");

    // Switch to different language
    await search(page, "japanese");
    const japaneseCard = page.getByTestId(languageCardTestId("jpn"));
    await japaneseCard.click();

    // Tag preview should update to Japanese
    tagPreview = page.getByTestId("right-panel-langtag-preview");
    await expect(tagPreview).toContainText("ja");
    await expect(tagPreview).not.toContainText("ce");

    // Switch again
    await search(page, "german");
    const germanCard = page.getByTestId(languageCardTestId("deu"));
    await germanCard.click();

    // Tag preview should update to German
    tagPreview = page.getByTestId("right-panel-langtag-preview");
    await expect(tagPreview).toContainText("de");
    await expect(tagPreview).not.toContainText("ja");
  });

  test("Tag preview shows complex tag with script, region, and variant", async () => {
    await search(page, "serbian");

    const serbianCard = page.getByTestId(languageCardTestId("srp"));
    await serbianCard.click();

    // Select Latin script
    const latnCard = page.getByTestId(scriptCardTestId("Latn"));
    await latnCard.click();

    // Open customization dialog
    const customizationButton = page.getByTestId("customization-button");
    await customizationButton.click();

    const customizationDialog = page.getByTestId("customization-dialog");

    // Add region
    const regionField = customizationDialog.locator(
      "#customize-region-field-wrapper"
    );
    await regionField.getByLabel("Open").click();
    await page
      .getByRole("option", { name: /Bosnia/ })
      .first()
      .click();

    // Add variant
    const variantField = customizationDialog.locator(
      "#customize-variant-field"
    );
    await variantField.fill("variant1");

    // Dialog should show complete tag
    const dialogTagPreview = customizationDialog.getByTestId(
      "customization-dialog-tag-preview"
    );
    await expect(dialogTagPreview).toContainText("sr-Latn-BA-x-variant1");

    // Click OK
    await customizationDialog.getByRole("button", { name: "OK" }).click();

    // Main tag preview should show complete tag
    const tagPreview = page.getByTestId("right-panel-langtag-preview");
    await expect(tagPreview).toContainText("sr-Latn-BA-x-variant1");
  });
});
