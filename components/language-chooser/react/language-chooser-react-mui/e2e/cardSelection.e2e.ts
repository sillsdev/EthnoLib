import { test, expect } from "@playwright/test";
import { findCyrlCard, search, toggleLanguageCard } from "./e2eHelpers";

test.describe("Selection toggle script card behavior", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("selecting langauge card makes script card visible", async ({
    page,
  }) => {
    await findCyrlCard(page);
  });

  test("re-clicking (toggle unselecting) language card hides script card", async ({
    page,
  }) => {
    const cyrlCard = await findCyrlCard(page);
    const uzbekCard = page.getByTestId("language-card-container-uzb");
    await uzbekCard.getByText("ўзбек тили").click();
    await expect(cyrlCard).not.toBeVisible();
  });

  test("Selecting different language card hides previous selection script cards", async ({
    page,
  }) => {
    const cyrlCard = await findCyrlCard(page);

    // select Uzbeki Arabic, which does not show a Cyrillic script card
    const uzbekiArabicCard = page.getByTestId("language-card-container-auz");
    await uzbekiArabicCard.scrollIntoViewIfNeeded();
    await expect(uzbekiArabicCard).toBeVisible();
    await uzbekiArabicCard.click();
    await expect(cyrlCard).not.toBeVisible();
  });

  test("Adding to search string clears selections", async ({ page }) => {
    const cyrlCard = await findCyrlCard(page);

    // Add to search string
    await page.locator("#search-bar").fill("uzbek ");
    await expect(cyrlCard).not.toBeVisible();
  });
});

// Okay, this is testing the OK button which is part of the demo, but it's a good way to test
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

  test("Ok button enables when toggle selecting a language with only 1 script option", async ({
    page,
  }) => {
    await search(page, "russian");
    await toggleLanguageCard(page, "rus");
    await expectOkButtonEnabled(page);
    await toggleLanguageCard(page, "rus");
    await expectOkButtonDisabled(page);
  });

  async function selectCyrlCard(page) {
    const cyrlCard = await findCyrlCard(page);
    expectOkButtonDisabled(page);
    await cyrlCard.click();
    expectOkButtonEnabled(page);
    return cyrlCard;
  }

  test("Ok button enables when toggling script card", async ({ page }) => {
    const cyrlCard = await selectCyrlCard(page);
    await cyrlCard.click();
    await expectOkButtonDisabled(page);
  });

  test("Ok button disables when language card is unselected in various ways", async ({
    page,
  }) => {
    // unselect language card
    await selectCyrlCard(page);
    await toggleLanguageCard(page, "uzb");
    await expectOkButtonDisabled(page);

    // select other langauge card
    await selectCyrlCard(page);
    await toggleLanguageCard(page, "crh"); //crimean tartar, which also has multiple scripts
    await expectOkButtonDisabled(page);

    // change search string
    await selectCyrlCard(page);
    await search(page, "uzbek ");
    await expectOkButtonDisabled(page);
  });
});
