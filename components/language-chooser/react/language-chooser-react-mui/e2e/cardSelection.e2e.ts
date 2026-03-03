import { test, expect, Page } from "@playwright/test";
import {
  clearSearch,
  clickLanguageCard,
  createPageAndLoadLanguageChooser,
  findChechenCyrlCard,
  findChechenCard,
  scriptCardTestId,
  search,
  selectChechenCard,
} from "./e2eHelpers";

let page: Page; // All the tests in this file use the same page object to save time; we only load the language chooser once.

test.describe("Selection toggle card behavior", () => {
  test.beforeAll(async ({ browser }) => {
    page = await createPageAndLoadLanguageChooser(browser);
  });
  test.beforeEach(async () => {
    await clearSearch(page);
  });

  test("selecting language card makes script card visible", async () => {
    // Cyrillic card is initially not visible
    const chechenCard = await findChechenCard(page);
    const cyrlCardTestId = scriptCardTestId("Cyrl");
    await expect(page.getByTestId(cyrlCardTestId)).not.toBeVisible();

    // select Chechen card
    await chechenCard.click();

    // Cyrillic card is now visible and contains some text with "Cyr..."
    const cyrlCard = page.getByTestId(cyrlCardTestId);
    await expect(cyrlCard).toBeVisible();
    await expect(cyrlCard).toContainText(/Cyr.*/);
  });

  test("re-clicking (toggle unselecting) language card hides script card", async () => {
    const cyrlCard = await findChechenCyrlCard(page);
    clickLanguageCard(page, "che");
    await expect(cyrlCard).not.toBeVisible();
  });

  test("Selecting different language card hides previous selection script cards", async () => {
    const cyrlCard = await findChechenCyrlCard(page);

    // select Chichewa, which does not have a Cyrillic script card
    clickLanguageCard(page, "nya");
    await expect(cyrlCard).not.toBeVisible();
  });

  test("Adding to search string clears selections", async () => {
    const cyrlCard = await findChechenCyrlCard(page);

    // Add to search string
    await page.locator("#search-bar").fill("uzbek ");
    await expect(cyrlCard).not.toBeVisible();
  });

  test("Rapid clicking doesn't break selection state", async () => {
    await page.locator("#search-bar").fill("chechen");

    const chechenCard = page.getByTestId("language-card-che");

    // Click rapidly multiple times
    await chechenCard.click();
    await chechenCard.click();
    await chechenCard.click();
    await chechenCard.click();

    // Wait a moment for state to settle
    await page.waitForTimeout(300);

    // Card should be in a consistent state (unselected after even number of clicks)
    const cardButton = page.locator(
      `button:has([data-testid="language-card-che"])`
    );

    // Should be unselected (4 clicks = toggled 4 times)
    await expect(cardButton).not.toHaveClass(/.*selected-option-card-button.*/);
  });

  test("Toggling script cards multiple times maintains consistency", async () => {
    await selectChechenCard(page);

    const cyrlCard = page.getByTestId("script-card-Cyrl");
    const cardButton = page.locator(
      `button:has([data-testid="script-card-Cyrl"])`
    );

    // Toggle on
    await cyrlCard.click();
    await expect(cardButton).toHaveClass(/.*selected-option-card-button.*/);

    // Toggle off
    await cyrlCard.click();
    await expect(cardButton).not.toHaveClass(/.*selected-option-card-button.*/);

    // Toggle on again
    await cyrlCard.click();
    await expect(cardButton).toHaveClass(/.*selected-option-card-button.*/);

    // Toggle off again
    await cyrlCard.click();
    await expect(cardButton).not.toHaveClass(/.*selected-option-card-button.*/);

    // Final state should be consistent
    const tagPreview = page.getByTestId("right-panel-langtag-preview");
    await expect(tagPreview).toContainText("ce");
    await expect(tagPreview).not.toContainText("ce-Cyrl");
  });

  test("Selected language card scrolls to top when clicked", async () => {
    await search(page, "zebra");
    const cards = page.locator(".option-card-button");
    const thirdCard = cards.nth(2);
    const initialThirdCardPosition = await thirdCard.evaluate(
      (el) => el.getBoundingClientRect().top
    );

    // without any scrolling, third card should be visible but lower down without scrolling
    await expect(thirdCard).toBeVisible();
    // click on third card, which should scroll it to top
    await thirdCard.click();
    // Wait a bit for smooth scroll
    await page.waitForTimeout(500);

    const newThirdCardPosition = await thirdCard.evaluate(
      (el) => el.getBoundingClientRect().top
    );

    // the third card should have moved up by more than 100px
    await expect(newThirdCardPosition).toBeLessThan(
      initialThirdCardPosition - 100
    );
  });
});
