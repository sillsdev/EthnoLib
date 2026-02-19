import { test, expect, Page } from "@playwright/test";
import {
  clickCustomizationButton,
  createPageAndLoadLanguageChooser,
  languageCardTestId,
  search,
  selectChechenCard,
  resetBeforeEach,
  cleanupDialogHandlers,
} from "./e2eHelpers";

let page: Page;

async function tabToElement(
  page: Page,
  checkElement: (element: Element) => boolean,
  maxTries: number,
  elementDescription: string
): Promise<void> {
  for (let i = 0; i < maxTries; i++) {
    await page.keyboard.press("Tab");

    // Get the currently focused element and check with the function
    const focused = await page.evaluateHandle(() => document.activeElement);
    const element = await focused.asElement();
    if (element) {
      const meetsCriteria = await element.evaluate(checkElement);
      if (meetsCriteria) {
        return;
      }
    }
  }
  throw new Error(
    `${elementDescription} was not reachable via Tab key within ${maxTries} attempts`
  );
}

test.describe("initial focus", () => {
  test.beforeAll(async ({ browser }) => {
    page = await createPageAndLoadLanguageChooser(browser);
  });
  test("Search bar receives focus on mount", async () => {
    // Reload the page
    await page.reload();
    await page.waitForLoadState("load");

    const searchBar = page.locator("#search-bar");

    // Search bar should be focused
    await expect(searchBar).toBeFocused();

    // sanity check expect clear button not to be focused
    const clearButton = page.getByTestId("clear-search-X-button");
    await expect(clearButton).toBeVisible();
    await expect(clearButton).not.toBeFocused();
  });
});

test.describe("Keyboard navigation", () => {
  test.beforeAll(async ({ browser }) => {
    page = await createPageAndLoadLanguageChooser(browser);
  });

  test.beforeEach(async () => {
    await resetBeforeEach(page);
  });

  test.afterEach(async () => {
    await cleanupDialogHandlers(page);
  });

  test("Tab and enter keys search and selection", async () => {
    await search(page, "chechen");
    const chechenCard = page.getByTestId(languageCardTestId("che"));
    await expect(chechenCard).toBeVisible();

    // Search should be focused initially
    const searchBar = page.locator("#search-bar");
    await searchBar.focus();
    await expect(searchBar).toBeFocused();

    // Press Tab to move to next element
    await page.keyboard.press("Tab");

    // Should move to the clear button
    const clearButton = page.getByTestId("clear-search-X-button");
    const isClearButtonFocused = await clearButton.evaluate((el) =>
      el.matches(":focus")
    );
    expect(isClearButtonFocused).toBe(true);

    // Enhance: Fix up the check for the Chechen card receiving focus. Currently it takes one tab to get from the
    // clear button to the first card, but we should make the test more flexible/robust against that changing. But right now
    // it is taking me too much time trying to get the below approach to work, where we try tabbing until we detect that
    // the chechen card has received focus.
    // function isOnChechenCard(element: Element): boolean {
    //   // element is a descendant of the element with id="language-card-list" not including the element with id="language-card-list"
    //   // and is a ancestor of the chechenCard or is the chechenCard itself
    //   const languageCardList = document.getElementById("language-card-list");
    //   if (!languageCardList) return false;
    //   const isDescendantOfList =
    //     languageCardList.contains(element) && element !== languageCardList;
    //   const chechenCardElement = document.querySelector(
    //     `[data-testid="${languageCardTestId("che")}"]`
    //   );
    //   if (!chechenCardElement) return false;
    //   const isAncestorOfChechenCard =
    //     element.contains(chechenCardElement) || element === chechenCardElement;
    //   return isDescendantOfList && isAncestorOfChechenCard;
    // }
    //
    // await tabToElement(page, isOnChechenCard, 10, "Chechen card");

    // Enhance: see comment above.
    await page.keyboard.press("Tab");

    // Press Enter to select the language card
    await page.keyboard.press("Enter");

    // Chechen Card should now be selected
    // chechen card should have an ancestor  that has class selected-option-card-button
    const selectedChechenCardButton = chechenCard.locator(
      'xpath=ancestor::*[contains(@class, "selected-option-card-button")]'
    );
    await expect(selectedChechenCardButton).toBeVisible();

    // Tab again to the first script card, which is currently Cyrl
    // Enhance: Cyrl is currently the first script card but it doesn't need to be. Make this test more robust for other
    // possible script orderings
    await page.keyboard.press("Tab");

    // Press Enter to select the script card
    await page.keyboard.press("Enter");

    // Script Card should now be selected
    const cyrlCard = page.locator("[data-testid='script-card-Cyrl']");
    const scriptCardButton = cyrlCard.locator(
      'xpath=ancestor::*[contains(@class, "selected-option-card-button")]'
    );
    await expect(scriptCardButton).toBeVisible();
  });

  test("Tab key navigates to customization button", async () => {
    // Focus the search bar first
    const searchBar = page.locator("#search-bar");
    await searchBar.focus();

    // Tab to the customization button
    await tabToElement(
      page,
      (element) =>
        element.getAttribute("data-testid") === "customization-button",
      10,
      "Customization button"
    );
  });

  test("Escape key dismisses customization dialog", async () => {
    await selectChechenCard(page);
    await clickCustomizationButton(page);

    const customizationDialog = page.getByTestId("customization-dialog");
    await expect(customizationDialog).toBeVisible();

    // Press Escape
    await page.keyboard.press("Escape");

    // Dialog should close
    await expect(customizationDialog).not.toBeVisible();
  });

  test("Arrow keys navigate within dropdowns in customization dialog", async () => {
    await selectChechenCard(page);
    await clickCustomizationButton(page);

    const customizationDialog = page.getByTestId("customization-dialog");
    await expect(customizationDialog).toBeVisible();

    // Open the script dropdown
    const scriptField = customizationDialog.locator(
      "#customize-script-field-wrapper"
    );
    await scriptField.click();

    // Wait for dropdown to open
    await page.waitForTimeout(200);

    // Press ArrowDown to navigate in the dropdown
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowDown");

    // Should be able to select with Enter
    await page.keyboard.press("Enter");

    // The script field should now have a value
    const scriptInput = customizationDialog.locator("#customize-script-field");
    const value = await scriptInput.inputValue();
    expect(value).toBeTruthy();
    expect(value.length).toBeGreaterThan(0);
  });

  test("Search bar receives focus on clearing search", async () => {
    await search(page, "chechen");

    // Click clear button
    await page.getByTestId("clear-search-X-button").click();

    // Search bar should be focused
    const searchBar = page.locator("#search-bar");
    await expect(searchBar).toBeFocused();
  });
});
