import { test, expect, Page } from "@playwright/test";
import {
  clearSearch,
  clickLanguageCard,
  createPageAndLoadLanguageChooser,
  findChechenCyrlCard,
  manuallyEnterValidLanguageTag,
  search,
  selectChechenCyrlCard,
} from "./e2eHelpers";

let page: Page; // All the tests in this file use the same page object to save time; we only load the language chooser once.

// Okay, this is testing the OK button which is part of the demo, but it's a easy way to test
// whether the language chooser is detecting and outputing a valid language selection at the right times
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
    const cyrlCard = await findChechenCyrlCard(page);
    await expectOkButtonDisabled(page);
    await cyrlCard.click();
    await expectOkButtonEnabled(page);
    await cyrlCard.click();
    await expectOkButtonDisabled(page);
  });

  test("Ok button disables when language card is unselected in various ways", async () => {
    // unselect language card
    await selectChechenCyrlCard(page);
    await clickLanguageCard(page, "che");
    await expectOkButtonDisabled(page);

    // select other language card
    await selectChechenCyrlCard(page);
    await clickLanguageCard(page, "ace"); // another of the results with multiple script options
    await expectOkButtonDisabled(page);

    // change search string
    await selectChechenCyrlCard(page);
    await search(page, "foobar");
    await expectOkButtonDisabled(page);
  });

  test("Ok button disables if display name is empty", async () => {
    await selectChechenCyrlCard(page);
    await expectOkButtonEnabled(page);
    await page.locator("#language-name-bar").fill("");
    await expectOkButtonDisabled(page);
  });

  test("If manually selected language tag, OK is disabled until display name is entered then enabled", async () => {
    await manuallyEnterValidLanguageTag(page, "zzz");
    // We should be forcing the user to enter a display name
    await expect(page.locator("#language-name-bar")).toHaveText("");
    // And giving them the red "required" label until they do
    await expect(page.getByText("required")).toBeVisible();
    await expectOkButtonDisabled(page);
    await page.locator("#language-name-bar").fill("foobar");
    await expectOkButtonEnabled(page);
  });
});
