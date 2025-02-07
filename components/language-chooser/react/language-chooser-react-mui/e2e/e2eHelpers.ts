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

export async function findChechenCard(page) {
  await clearSearch(page);
  await search(page, "chechen");
  const chechenCard = await page.getByTestId(languageCardTestId("che"));
  await chechenCard.scrollIntoViewIfNeeded();
  await expect(chechenCard).toBeVisible();
  await expect(chechenCard).toContainText("Chechen");

  return chechenCard;
}

export async function selectChechenCard(page) {
  const chechenCard = await findChechenCard(page);
  await chechenCard.click();
  return chechenCard;
}

export async function findChechenCyrlCard(page) {
  await selectChechenCard(page);
  // Cyrillic card is now visible and contains some text with "Cyr..."
  const cyrlCard = await page.getByTestId(scriptCardTestId("Cyrl"));
  await expect(cyrlCard).toBeVisible();
  await expect(cyrlCard).toContainText(/Cyr.*/);
  return cyrlCard;
}

export async function selectChechenCyrlCard(page) {
  const cyrlCard = await findChechenCyrlCard(page);
  await cyrlCard.click();
  return cyrlCard;
}
