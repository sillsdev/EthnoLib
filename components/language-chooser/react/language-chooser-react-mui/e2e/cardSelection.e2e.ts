import { test, expect } from "@playwright/test";
import {
  clickLanguageCard,
  findCyrlCard,
  findUzbekCard,
  scriptCardTestId,
  search,
  selectCyrlCard,
} from "./e2eHelpers";

test.describe("Selection toggle script card behavior", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("selecting langauge card makes script card visible", async ({
    page,
  }) => {
    // Cyrillic card is initially not visible
    const uzbekCard = await findUzbekCard(page);
    const cyrlCardTestId = scriptCardTestId("Cyrl");
    await expect(page.getByTestId(cyrlCardTestId)).not.toBeVisible();

    // select Uzbek card
    await uzbekCard.click();

    // Cyrillic card is now visible and contains some text with "Cyr..."
    const cyrlCard = page.getByTestId(cyrlCardTestId);
    await expect(cyrlCard).toBeVisible();
    await expect(cyrlCard).toContainText(/Cyr.*/);
  });

  test("re-clicking (toggle unselecting) language card hides script card", async ({
    page,
  }) => {
    const cyrlCard = await findCyrlCard(page);
    clickLanguageCard(page, "uzb");
    await expect(cyrlCard).not.toBeVisible();
  });

  test("Selecting different language card hides previous selection script cards", async ({
    page,
  }) => {
    const cyrlCard = await findCyrlCard(page);

    // select Uzbeki Arabic, which does not have a Cyrillic script card
    clickLanguageCard(page, "auz");
    await expect(cyrlCard).not.toBeVisible();
  });

  test("Adding to search string clears selections", async ({ page }) => {
    const cyrlCard = await findCyrlCard(page);

    // Add to search string
    await page.locator("#search-bar").fill("uzbek ");
    await expect(cyrlCard).not.toBeVisible();
  });
});

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

  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("Ok button disabled when no language selected", async ({ page }) => {
    await page.getByTestId("clear-search-X-button").click();
    await expectOkButtonDisabled(page);
  });

  test("toggling a language with only 1 script option toggles the ok button disabling", async ({
    page,
  }) => {
    await search(page, "russian");
    await clickLanguageCard(page, "rus");
    await expectOkButtonEnabled(page);
    await clickLanguageCard(page, "rus");
    await expectOkButtonDisabled(page);
  });

  test("Ok button enables when toggling script card", async ({ page }) => {
    const cyrlCard = await findCyrlCard(page);
    await expectOkButtonDisabled(page);
    await cyrlCard.click();
    await expectOkButtonEnabled(page);
    await cyrlCard.click();
    await expectOkButtonDisabled(page);
  });

  test("Ok button disables when language card is unselected in various ways", async ({
    page,
  }) => {
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
