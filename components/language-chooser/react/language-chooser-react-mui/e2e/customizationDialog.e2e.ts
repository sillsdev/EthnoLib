import { test, expect } from "@playwright/test";
import {
  clearSearch,
  clickLanguageCard,
  findCyrlCard,
  scriptCardTestId,
  search,
  selectUzbekCard,
} from "./e2eHelpers";

function customizationButtonLocator(page) {
  return page.getByTestId("customization-button");
}

async function clickCustomizationButton(page) {
  const button = await customizationButtonLocator(page);
  await button.click();
}

function customizationDialogLocator(page) {
  return page.getByTestId("customization-dialog");
}

function okButtonLocator(customizationDialog) {
  return customizationDialog.getByRole("button", { name: "OK" });
}

function cancelButtonLocator(customizationDialog) {
  return customizationDialog.getByRole("button", { name: "Cancel" });
}

function scriptFieldLocator(customizationDialog) {
  return customizationDialog.locator("#customize-script-field");
}

async function enterScript(customizationDialog, scriptName) {
  // open  dropdown
  await customizationDialog
    .locator("#customize-script-field-wrapper")
    .getByLabel("Open")
    .click();
  await customizationDialog.getByRole("option", { name: scriptName }).click();
}

function regionFieldLocator(customizationDialog) {
  return customizationDialog.locator("#customize-region-field");
}

async function enterRegion(customizationDialog, regionName) {
  // open  dropdown
  await customizationDialog
    .locator("#customize-region-field-wrapper")
    .getByLabel("Open")
    .click();
  await customizationDialog.getByRole("option", { name: regionName }).click();
}

function variantFieldLocator(customizationDialog) {
  return customizationDialog.locator("#customize-variant-field");
}

async function enterVariant(customizationDialog, variantName) {
  await customizationDialog
    .locator("#customize-variant-field")
    .fill(variantName);
}

function nameFieldLocator(customizationDialog) {
  return customizationDialog.locator("#unlisted-lang-name-field");
}

function enterName(customizationDialog, name) {
  return nameFieldLocator(customizationDialog).fill(name);
}

test.describe("Customization button and dialog", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("no language selected, button should say 'Create Unlisted Language'", async ({
    page,
  }) => {
    await clearSearch(page);
    const customizationButton = await customizationButtonLocator(page);
    await expect(customizationButton).toHaveText(/Create Unlisted Language.*/);
    await expect(customizationButton.getByTestId("EditIcon")).not.toBeVisible();
  });

  test("if language selected, button should say 'Customize'", async ({
    page,
  }) => {
    await selectUzbekCard(page);
    const customizationButton = await customizationButtonLocator(page);
    await expect(customizationButton).toHaveText(/Customize.*/);
    await expect(customizationButton.getByTestId("EditIcon")).toBeVisible();
  });

  test("open and cancel dialog", async ({ page }) => {
    const customizationDialog = await customizationDialogLocator(page);
    await expect(customizationDialog).not.toBeVisible();
    await clickCustomizationButton(page);
    await expect(customizationDialog).toBeVisible();
    await cancelButtonLocator(customizationDialog).click();
    await expect(customizationDialog).not.toBeVisible();
  });

  test("unlisted language dialog features", async ({ page }) => {
    await clearSearch(page);
    await clickCustomizationButton(page);
    await expect(page.getByText("Unlisted Language Tag")).toBeVisible();
    await expect(page.getByText("Custom Language Tag")).not.toBeVisible();
    await expect(
      page.getByText(/If you cannot find a language*/)
    ).toBeVisible();
    await expect(
      page.getByText(/If you found the main language but*/)
    ).not.toBeVisible();
    const customizationDialog = await customizationDialogLocator(page);
    await expect(customizationDialog.getByLabel("Name")).toBeVisible();
    await expect(customizationDialog.getByLabel("Country")).toBeVisible();
    await expect(
      customizationDialog.locator("#customize-variant-field")
    ).not.toBeVisible();
  });

  test("customize language dialog features", async ({ page }) => {
    await selectUzbekCard(page);
    await clickCustomizationButton(page);
    const customizationDialog = await customizationDialogLocator(page);
    await expect(customizationDialog).toBeVisible();
    await expect(
      customizationDialog.getByText("Unlisted Language Tag")
    ).not.toBeVisible();
    await expect(
      customizationDialog.getByText("Custom Language Tag")
    ).toBeVisible();
    await expect(
      customizationDialog.getByText(/If you cannot find a language.*/)
    ).not.toBeVisible();
    await expect(
      customizationDialog.getByText(/If you found the main language but.*/)
    ).toBeVisible();
    await expect(customizationDialog).toBeVisible();
    await expect(customizationDialog.getByLabel("Name")).not.toBeVisible();
    await expect(customizationDialog.getByLabel("Script")).toBeVisible();
    await expect(customizationDialog.getByLabel("Country")).toBeVisible();
    await expect(
      customizationDialog.getByLabel("Variant (dialect)")
    ).toBeVisible();
  });

  test("Selected script is automatically filled into script field", async ({
    page,
  }) => {
    // select cyrillic script
    const cyrlCard = await findCyrlCard(page);
    await cyrlCard.click();
    await clickCustomizationButton(page);
    await expect(customizationDialogLocator(page)).toBeVisible();
    const scriptField = await scriptFieldLocator(page);
    await expect(scriptField).toBeVisible();
    await expect(scriptField).toHaveValue(/.*Cyr.*/);
  });

  test("Reopening customize dialog should maintain selected details", async ({
    page,
  }) => {
    // Open customize dialog and enter a script, region, and variant name
    await selectUzbekCard(page);
    await clickCustomizationButton(page);
    const customizationDialog = await customizationDialogLocator(page);
    await expect(customizationDialog).toBeVisible();
    await enterScript(customizationDialog, "Balinese");
    await enterRegion(customizationDialog, "Austria");
    await enterVariant(customizationDialog, "foobar");
    // Click OK
    await okButtonLocator(customizationDialog).click();
    await expect(customizationDialog).not.toBeVisible();

    // Immediately reopen dialog. Selections should still be filled
    await clickCustomizationButton(page);
    const customizationDialog2 = await customizationDialogLocator(page);

    await expect(customizationDialog2).toBeVisible();
    await expect(scriptFieldLocator(customizationDialog2)).toHaveValue(
      /Balinese.*/
    );
    await expect(regionFieldLocator(customizationDialog2)).toHaveValue(
      /Austria.*/
    );
    await expect(variantFieldLocator(customizationDialog2)).toHaveValue(
      "foobar"
    );
  });

  test("Cancel should clear selections", async ({ page }) => {
    // Open customize dialog and enter a script, region, and variant name
    await selectUzbekCard(page);
    await clickCustomizationButton(page);
    const customizationDialog = await customizationDialogLocator(page);
    await expect(customizationDialog).toBeVisible();
    await enterScript(customizationDialog, "Balinese");
    await enterRegion(customizationDialog, "Austria");
    await enterVariant(customizationDialog, "foobar");

    // Click Cancel
    await cancelButtonLocator(customizationDialog).click();
    await expect(customizationDialog).not.toBeVisible();

    // Immediately reopen dialog. Selections should be cleared
    await clickCustomizationButton(page);
    const customizationDialog2 = customizationDialogLocator(page);
    await expect(customizationDialog2).toBeVisible();
    await expect(scriptFieldLocator(customizationDialog2)).toHaveValue("");
    await expect(regionFieldLocator(customizationDialog2)).toHaveValue("");
    await expect(variantFieldLocator(customizationDialog2)).toHaveValue("");
  });

  test("Selecting another langauge should clear customizations", async ({
    page,
  }) => {
    // Open customize dialog and enter a script, region, and variant name
    await selectUzbekCard(page);
    await clickCustomizationButton(page);
    const customizationDialog = await customizationDialogLocator(page);
    await expect(customizationDialog).toBeVisible();
    await enterScript(customizationDialog, "Balinese");
    await enterRegion(customizationDialog, "Austria");
    await enterVariant(customizationDialog, "foobar");

    // Click Ok
    await okButtonLocator(customizationDialog).click();
    await expect(customizationDialog).not.toBeVisible();

    // Select another language
    await clearSearch(page);
    await search(page, "Japanese");
    await clickLanguageCard(page, "jpn");

    // Reopen dialog. Selections should be cleared
    await clickCustomizationButton(page);
    const customizationDialog2 = await customizationDialogLocator(page);
    await expect(customizationDialog2).toBeVisible();
    await expect(scriptFieldLocator(customizationDialog2)).toHaveValue("");
    await expect(regionFieldLocator(customizationDialog2)).toHaveValue("");
    await expect(variantFieldLocator(customizationDialog2)).toHaveValue("");
  });

  test("Selecting a script in customize dialog selects that script card if it exists", async ({
    page,
  }) => {
    await selectUzbekCard(page);
    await clickCustomizationButton(page);
    const customizationDialog = await customizationDialogLocator(page);
    await expect(customizationDialog).toBeVisible();
    await customizationDialog
      .locator("#customize-script-field-wrapper")
      .getByLabel("Open")
      .click();
    await customizationDialog
      .getByRole("option", { name: "Arabic" })
      .filter({ hasNotText: "Arabic (Nastaliq variant)" })
      .click();
    await okButtonLocator(customizationDialog).click();
    await expect(page.getByTestId(scriptCardTestId("Arab"))).toHaveClass(
      /.*selected-option-card-button.*/
    );
  });

  test("name and country are required in the unlisted language dialog", async ({
    page,
  }) => {
    await clearSearch(page);
    await clickCustomizationButton(page);
    const customizationDialog = await customizationDialogLocator(page);
    await expect(customizationDialog).toBeVisible();
    const okButton = okButtonLocator(customizationDialog);
    expect(okButton).toBeVisible();
    // nothing filled, ok button disabled
    expect(okButton).toBeDisabled();

    // fill in name, ok button still disabled
    await enterName(customizationDialog, "foo");
    expect(okButton).toBeDisabled();

    // fill in country but clear name, ok button still disabled
    await enterRegion(customizationDialog, "Austria");
    await enterName(customizationDialog, "");
    expect(okButton).toBeDisabled();

    // fill in name and country, ok button enabled
    await enterName(customizationDialog, "foo");
    expect(okButton).not.toBeDisabled();

    // the word "required" should appear in labels twice, once for name and once for country
    await expect(
      customizationDialog.getByLabel(/.*required.*/).locator("visible=true")
    ).toHaveCount(2);
  });

  test("ok button is always enabled in customize dialog, no required fields", async ({
    page,
  }) => {
    await selectUzbekCard(page);
    await clickCustomizationButton(page);
    const customizationDialog = await customizationDialogLocator(page);
    await expect(customizationDialog).toBeVisible();
    const okButton = okButtonLocator(customizationDialog);
    await expect(okButton).not.toBeDisabled();
  });

  test("search string automatically fills into unlisted dialog name field", async ({
    page,
  }) => {
    await clearSearch(page);
    await search(page, "foo");
    await clickCustomizationButton(page);
    const customizationDialog = await customizationDialogLocator(page);
    await expect(customizationDialog).toBeVisible();
    await expect(customizationDialog.getByLabel("Name")).toHaveValue("foo");
  });
});
