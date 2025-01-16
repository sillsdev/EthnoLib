import { expect } from "@playwright/test";

export async function createPageAndLoadLanguageChooser(browser) {
  const page = await browser.newPage();
  await loadLanguageChooser(page);
  return page;
}

export async function loadLanguageChooser(page) {
  await page.goto("/", { waitUntil: "load" });
}

export function scriptCardTestId(scriptCode: string) {
  return `script-card-${scriptCode}`;
}

export function languageCardTestId(languageCode: string) {
  return `language-card-${languageCode}`;
}

export async function clearSearch(page) {
  await page.getByTestId("clear-search-X-button").click();
}

export async function search(page, searchString: string) {
  await page.locator("#search-bar").fill(searchString);
}

export async function clickLanguageCard(page, isoCode) {
  const card = await page.getByTestId(languageCardTestId(isoCode));
  await card.scrollIntoViewIfNeeded();
  await expect(card).toBeVisible();
  await card.click();
}

export async function toggleScriptCard(page, isoCode) {
  const card = await page.getByTestId(scriptCardTestId(isoCode));
  if (card) {
    await card.scrollIntoViewIfNeeded();
    await expect(card).toBeVisible();
    await card.click();
  }
}

export async function findUzbekCard(page) {
  // search for "uzbek"
  await clearSearch(page);
  await search(page, "uzbek");
  const uzbekCard = await page.getByTestId(languageCardTestId("uzb"));
  await uzbekCard.scrollIntoViewIfNeeded();
  await expect(uzbekCard).toBeVisible();
  await expect(uzbekCard).toContainText("Uzbek");

  return uzbekCard;
}

export async function selectUzbekCard(page) {
  const uzbekCard = await findUzbekCard(page);
  await uzbekCard.click();
  return uzbekCard;
}

export async function findCyrlCard(page) {
  await selectUzbekCard(page);
  // Cyrillic card is now visible and contains some text with "Cyr..."
  const cyrlCard = await page.getByTestId(scriptCardTestId("Cyrl"));
  await expect(cyrlCard).toBeVisible();
  await expect(cyrlCard).toContainText(/Cyr.*/);
  return cyrlCard;
}

export async function selectCyrlCard(page) {
  const cyrlCard = await findCyrlCard(page);
  await cyrlCard.click();
  return cyrlCard;
}
