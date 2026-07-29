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

// The result list lazy-renders its cards (react-lazyload): a card far enough down the list isn't
// in the DOM until the list is scrolled near it, so getByTestId can't find it and
// scrollIntoViewIfNeeded has nothing to scroll to. This scrolls the results list a screenful at a
// time — letting lazyload mount the newly-visible cards — until the requested card exists, then
// brings it into view. Use this instead of a bare scrollIntoViewIfNeeded when the target card may
// be below the initially-rendered window (e.g. a fuzzy match that isn't near the top).
// Results also arrive in batches, so reaching the bottom of the list does NOT mean the card is
// absent — more results may still be on their way. Sweeping only once and giving up at the bottom
// made this flaky under load, so keep sweeping from the top until the card mounts or we run out of
// time, and let the caller's expect() report the failure if it never does.
//
// Consequence: this is for asserting a card IS there. Don't use it to assert a card is absent —
// it deliberately burns the full timeout below before returning an empty locator.
const SCROLL_FOR_CARD_TIMEOUT_MS = 15000;
export async function scrollListToLanguageCard(page, isoCode: string) {
  const card = page.getByTestId(languageCardTestId(isoCode));
  const list = page.locator("#language-card-list");
  const giveUpAt = Date.now() + SCROLL_FOR_CARD_TIMEOUT_MS;
  while ((await card.count()) === 0 && Date.now() < giveUpAt) {
    const reachedBottom = await list.evaluate((el: HTMLElement) => {
      const before = el.scrollTop;
      el.scrollBy(0, Math.max(1, el.clientHeight - 40));
      if (el.scrollTop > before) return false;
      el.scrollTop = 0; // at the bottom; sweep again in case more results have arrived since
      return true;
    });
    // Let react-lazyload (and any still-streaming search results) render the newly-visible cards.
    await page.waitForTimeout(reachedBottom ? 300 : 150);
  }
  await card.scrollIntoViewIfNeeded();
  return card;
}

export async function clearSearch(page) {
  const clearButton = page.getByTestId("clear-search-X-button");
  await clearButton.click();
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

export function customizationButtonLocator(page) {
  return page.getByTestId("customization-button");
}

export async function clickCustomizationButton(page) {
  const button = await customizationButtonLocator(page);
  await button.click();
}

// Should only be used with valid BCP 47 tags
export async function manuallyEnterValidLanguageTag(page, tag) {
  await clickCustomizationButton(page);
  const customizationDialogTagPreview = await page.getByTestId(
    "customization-dialog-tag-preview"
  );
  await expect(customizationDialogTagPreview).toBeVisible();
  // clicking the tag preview will trigger a windows.prompt dialog, enter tag into it
  const dialogHandled = page.waitForEvent("dialog").then(async (dialog) => {
    await expect(dialog.type()).toBe("prompt");
    return dialog.accept(tag);
  });
  await customizationDialogTagPreview.click({ modifiers: ["Control"] });
  await dialogHandled;
  // Check that the tag was accepted. Not a robust check, but see that it is at least visible somewhere
  await expect(page.getByText(/.*tag.*/)).toBeVisible();
}

export function customizationDialogLocator(page) {
  return page.getByTestId("customization-dialog");
}

export function cancelButtonLocator(customizationDialog) {
  return customizationDialog.getByRole("button", { name: "Cancel" });
}

export async function cleanupDialogHandlers(page) {
  await page.removeAllListeners("dialog");
}

export async function resetBeforeEach(page) {
  // In case some got left for some reason
  await cleanupDialogHandlers(page);

  // close customization dialog if open
  const customizationDialog = await customizationDialogLocator(page);
  if (await customizationDialog.isVisible()) {
    await cancelButtonLocator(customizationDialog).click();
  }
  // clear search
  await clearSearch(page);
}
