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
});
