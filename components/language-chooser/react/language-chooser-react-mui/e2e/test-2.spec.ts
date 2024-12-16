import { test, expect } from "@playwright/test";

test.describe("Search", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  // TODO where expect and where await? expect(await page.locator("h1").innerText()).toContain("Welcome");

  test("basic search by name", async ({ page }) => {
    await page.locator("#clear-search-X-button").click();
    await page.locator("#search-bar").fill("tok pisin");
    const tpiCard = page.getByTestId("language-card-container-tpi");
    await tpiCard.scrollIntoViewIfNeeded();
    await expect(tpiCard).toBeVisible();
    await expect(tpiCard).toContainText("Tok Pisin");
  });

  test("basic search by code", async ({ page }) => {
    await page.locator("#clear-search-X-button").click();
    await page.locator("#search-bar").fill("tpi");
    const tpiCard = page.getByTestId("language-card-container-tpi");
    await tpiCard.scrollIntoViewIfNeeded();
    await expect(tpiCard).toBeVisible();
    await expect(tpiCard).toContainText("Tok Pisin");
  });

  test("basic search by country", async ({ page }) => {
    await page.locator("#clear-search-X-button").click();
    await page.locator("#search-bar").fill("Switzerland");
    const swissGermanCard = page.getByTestId("language-card-container-gsw");
    await swissGermanCard.scrollIntoViewIfNeeded();
    await expect(swissGermanCard).toBeVisible();
    await expect(swissGermanCard).toContainText("Schwiizerdütsch");
  });

  test("X button clears search and results", async ({ page }) => {
    await page.locator("#search-bar").fill("tok pisin");
    // some results exist

    await page.locator("#clear-search-X-button").click();

    // search bar is empty
    await expect(page.locator("#search-bar")).toHaveText("");

    // no results
    await expect(page.locator(".option-card-button")).not.toBeVisible();
  });
});

test.describe("Selection toggle script card behavior", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  async function findUzbekCard({ page }) {
    // search for "uzbek"
    await page.locator("#clear-search-X-button").click();
    await page.locator("#search-bar").fill("uzbek");
    const uzbekCard = page.getByTestId("language-card-container-uzb");
    await uzbekCard.scrollIntoViewIfNeeded();
    await expect(uzbekCard).toBeVisible();
    await expect(uzbekCard).toContainText("Uzbek");

    return uzbekCard;
  }

  async function selectCyrl({ page }) {
    // Cyrillic card is initially not visible
    const uzbekCard = await findUzbekCard({ page });
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

  test("selecting langauge card makes script card visible", async ({
    page,
  }) => {
    await selectCyrl({ page });
  });

  test("re-clicking (toggle unselecting) language card hides script card", async ({
    page,
  }) => {
    const cyrlCard = await selectCyrl({ page });
    const uzbekCard = page.getByTestId("language-card-container-uzb");
    await uzbekCard.getByText("ўзбек тили").click();
    await expect(cyrlCard).not.toBeVisible();
  });

  test("Selecting different language card hides previous selection script cards", async ({
    page,
  }) => {
    const cyrlCard = await selectCyrl({ page });

    // select Uzbeki Arabic, which does not show a Cyrillic script card
    const uzbekiArabicCard = page.getByTestId("language-card-container-auz");
    await uzbekiArabicCard.scrollIntoViewIfNeeded();
    await expect(uzbekiArabicCard).toBeVisible();
    await uzbekiArabicCard.click();
    await expect(cyrlCard).not.toBeVisible();
  });

  test("Adding to search string clears selections", async ({ page }) => {
    const cyrlCard = await selectCyrl({ page });

    // Add to search string
    await page.locator("#search-bar").fill("uzbek ");
    await expect(cyrlCard).not.toBeVisible();
  });
});

// Okay, this is testing the OK button which is part of the demo, but it's a good way to test
// whether the language chooser is detecting and outputing a valid langauge selection at the right times
test.describe("Language selection validity", () => {
  async function expectOkButtonEnabled(page) {
    await expect(page.getByRole("button").getByText("OK")).toBeEnabled();
  }

  async function expectOkButtonDisabled(page) {
    await expect(page.getByRole("button").getByText("OK")).toBeDisabled();
  }

  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("Ok button disabled when no language selected", async ({ page }) => {
    await page.locator("#clear-search-X-button").click();
    await expectOkButtonDisabled(page);
  });
});

/* 
 customize dialog
 unlisted language dialog
 ok button enabled

*/

// TODO compare lameta
// TODO fix bash prompt
// TODO try storybook tests
// TODO break this file up
