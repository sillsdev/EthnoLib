import { test, expect, Page } from "@playwright/test";
import {
  clearSearch,
  clickLanguageCard,
  createPageAndLoadLanguageChooser,
  findChechenCyrlCard,
  findChechenCard,
  scriptCardTestId,
  search,
} from "./e2eHelpers";

let page: Page; // All the tests in this file use the same page object to save time; we only load the language chooser once.

test.describe("Selection toggle script card behavior", () => {
  test.beforeAll(async ({ browser }) => {
    page = await createPageAndLoadLanguageChooser(browser);
  });
  test.beforeEach(async () => {
    await clearSearch(page);
  });

  test("selecting langauge card makes script card visible", async () => {
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

  test("Selecting uzn preserves tag preview (does not shorten to uz)", async () => {
    await search(page, "uzn");
    await clickLanguageCard(page, "uzn");
    await expect(page.getByTestId("right-panel-langtag-preview")).toHaveText(
      "uzn",
    );
  });
});
