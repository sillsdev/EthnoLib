import { expect } from "@playwright/test";

export async function clearSearch(page) {
  await page.getByTestId("clear-search-X-button").click();
}

export async function search(page, searchString: string) {
  await page.locator("#search-bar").fill(searchString);
}

export async function toggleLanguageCard(page, isoCode) {
  const card = await page.getByTestId(`language-card-${isoCode}`);
  if (card) {
    await card.scrollIntoViewIfNeeded();
    await expect(card).toBeVisible();
    await card.click();
  }
}

export async function toggleScriptCard(page, isoCode) {
  const card = await page.getByTestId(`script-card-${isoCode}`);
  if (card) {
    await card.scrollIntoViewIfNeeded();
    await expect(card).toBeVisible();
    await card.click();
  }
}

async function findUzbekCard(page) {
  // search for "uzbek"
  await page.getByTestId("clear-search-X-button").click();
  await page.locator("#search-bar").fill("uzbek");
  const uzbekCard = page.getByTestId("language-card-container-uzb");
  await uzbekCard.scrollIntoViewIfNeeded();
  await expect(uzbekCard).toBeVisible();
  await expect(uzbekCard).toContainText("Uzbek");

  return uzbekCard;
}

export async function findCyrlCard(page) {
  // Cyrillic card is initially not visible
  const uzbekCard = await findUzbekCard(page);
  const cyrlCardTestId = "script-card-Cyrl";
  await expect(page.getByTestId(cyrlCardTestId)).not.toBeVisible();

  // select Uzbek card
  await uzbekCard.click();

  // Cyrillic card is now visible and contains some text with "Cyr..."
  const cyrlCard = page.getByTestId(cyrlCardTestId);
  await expect(cyrlCard).toBeVisible();
  await expect(cyrlCard).toContainText(/Cyr.*/);
  return cyrlCard;
}
