import { test, expect, Page } from "@playwright/test";
import {
  clearSearch,
  clickLanguageCard,
  createPageAndLoadLanguageChooser,
  findCyrlCard,
  search,
  selectCyrlCard,
} from "./e2eHelpers";

let page: Page; // All the tests in this file use the same page object to save time; we only load the language chooser once.

// Okay, this is testing the OK button which is part of the demo, but it's a easy way to test
// whether the language chooser is detecting and outputing a valid langauge selection at the right times
test.describe("Language selection validity", () => {
  async function expectOkButtonEnabled(page) {
    await expect(
      page.getByTestId("lang-chooser-dialog-ok-button")
    ).toBeEnabled();
  }

  async function expectOkButtonDisabled(page) {
    await expect(
      page.getByTestId("lang-chooser-dialog-ok-button")
    ).toBeDisabled();
  }

  test.beforeAll(async ({ browser }) => {
    page = await createPageAndLoadLanguageChooser(browser);
  });
  test.beforeEach(async () => {
    await clearSearch(page);
  });

  test("Ok button disabled when no language selected", async () => {
    await page.getByTestId("clear-search-X-button").click();
    await expectOkButtonDisabled(page);
  });

  test("toggling a language with only 1 script option toggles the ok button disabling", async () => {
    await search(page, "russian");
    await clickLanguageCard(page, "rus");
    await expectOkButtonEnabled(page);
    await clickLanguageCard(page, "rus");
    await expectOkButtonDisabled(page);
  });

  test("Ok button enables when toggling script card", async () => {
    const cyrlCard = await findCyrlCard(page);
    await expectOkButtonDisabled(page);
    await cyrlCard.click();
    await expectOkButtonEnabled(page);
    await cyrlCard.click();
    await expectOkButtonDisabled(page);
  });

  test("Ok button disables when language card is unselected in various ways", async () => {
    // unselect language card
    await selectCyrlCard(page);
    await clickLanguageCard(page, "uzb");
    await expectOkButtonDisabled(page);

    // select other langauge card
    await selectCyrlCard(page);
    await clickLanguageCard(page, "crh"); //crimean tartar, which also has multiple scripts
    await expectOkButtonDisabled(page);

    // change search string
    await selectCyrlCard(page);
    await search(page, "uzbek ");
    await expectOkButtonDisabled(page);
  });
});
