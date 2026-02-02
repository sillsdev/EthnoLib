import { test, expect, Page } from "@playwright/test";
import {
  clearSearch,
  clickCustomizationButton,
  clickLanguageCard,
  createPageAndLoadLanguageChooser,
  customizationButtonLocator,
  findChechenCyrlCard,
  loadLanguageChooser,
  manuallyEnterValidLanguageTag,
  scriptCardTestId,
  search,
  selectChechenCard,
} from "./e2eHelpers";

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
  await page.getByRole("option", { name: scriptName }).click();
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
  await page.getByRole("option", { name: regionName }).click();
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

let page: Page; // All the tests in this file use the same page object to save time; we only reload the language chooser when necessary

async function cleanupDialogHandlers() {
  await page.removeAllListeners("dialog");
}

async function resetBeforeEach() {
  // In case some got left for some reason
  await cleanupDialogHandlers();

  // close customization dialog if open
  const customizationDialog = await customizationDialogLocator(page);
  if (await customizationDialog.isVisible()) {
    await cancelButtonLocator(customizationDialog).click();
  }
  // clear search
  await clearSearch(page);
}

test.describe("Customization button and dialog", () => {
  test.beforeAll(async ({ browser }) => {
    page = await createPageAndLoadLanguageChooser(browser);
  });

  test.beforeEach(async () => {
    await resetBeforeEach();
  });

  test.afterEach(async () => {
    await cleanupDialogHandlers();
  });

  test("no language selected, button should say 'Create Unlisted Language'", async () => {
    const customizationButton = await customizationButtonLocator(page);
    await expect(customizationButton).toHaveText(/Create Unlisted Language.*/);
    await expect(customizationButton.getByTestId("EditIcon")).not.toBeVisible();
  });

  test("unlisted tag preview removes spaces and invalid characters", async () => {
    await search(page, " hi-there-12-5 6-12345@{}(* 6789 ");
    const customizationButton = await customizationButtonLocator(page);
    await expect(customizationButton).toContainText(
      "qaa-x-hi-there-12-56-12345678"
    );
    await clickCustomizationButton(page);
    const customizationDialogTagPreview = await page.getByTestId(
      "customization-dialog-tag-preview"
    );
    await expect(customizationDialogTagPreview).toContainText(
      "qaa-x-hi-there-12-56-12345678"
    );
  });

  test("if language selected, button should say 'Customize'", async () => {
    await selectChechenCard(page);
    const customizationButton = await customizationButtonLocator(page);
    await expect(customizationButton).toHaveText(/Customize.*/);
    await expect(customizationButton.getByTestId("EditIcon")).toBeVisible();
  });

  test("if manually entered language tag, button should say 'Edit Language Tag'", async () => {
    await manuallyEnterValidLanguageTag(page, "zzz-Foo-x-barbaz");
    const customizationButton = await customizationButtonLocator(page);
    await expect(customizationButton).toHaveText(/Edit Language Tag.*/);
    await expect(customizationButton.getByTestId("EditIcon")).toBeVisible();
  });

  test("if manually entered language tag, clicking button should open windows prompt to edit the tag", async () => {
    await clickCustomizationButton(page);
    const customizationDialogTagPreview = await page.getByTestId(
      "customization-dialog-tag-preview"
    );
    await expect(customizationDialogTagPreview).toBeVisible();
    const dialogHandled = page.waitForEvent("dialog").then(async (dialog) => {
      expect(dialog.type()).toBe("prompt");
      expect(dialog.message()).toMatch(
        /.*If this user interface is not offering you a code that you know is valid ISO 639 code, you can enter it here.*/
      );
      await dialog.dismiss();
    });
    await customizationDialogTagPreview.click({ modifiers: ["Control"] });
    await dialogHandled;
  });

  test("dialog starts closed; open and cancel dialog", async () => {
    await loadLanguageChooser(page);
    const customizationDialog = await customizationDialogLocator(page);
    await expect(customizationDialog).not.toBeVisible();
    await clickCustomizationButton(page);
    await expect(customizationDialog).toBeVisible();
    await cancelButtonLocator(customizationDialog).click();
    await expect(customizationDialog).not.toBeVisible();
  });

  test("unlisted language dialog features", async () => {
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

  test("customize language dialog features", async () => {
    await selectChechenCard(page);
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

  test("Selected script is automatically filled into script field", async () => {
    // select cyrillic script
    const cyrlCard = await findChechenCyrlCard(page);
    await cyrlCard.click();
    await clickCustomizationButton(page);
    await expect(customizationDialogLocator(page)).toBeVisible();
    const scriptField = await scriptFieldLocator(page);
    await expect(scriptField).toBeVisible();
    await expect(scriptField).toHaveValue(/.*Cyr.*/);
  });

  test("Reopening customize dialog should maintain selected details", async () => {
    // Open customize dialog and enter a script, region, and variant name
    await selectChechenCard(page);
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

  test("Cancel should clear selections", async () => {
    // Open customize dialog and enter a script, region, and variant name
    await selectChechenCard(page);
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

  test("Selecting another langauge should clear customizations", async () => {
    // Open customize dialog and enter a script, region, and variant name
    await selectChechenCard(page);
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

  test("Selecting a script in customize dialog selects that script card if it exists", async () => {
    await selectChechenCard(page);
    await clickCustomizationButton(page);
    const customizationDialog = await customizationDialogLocator(page);
    await expect(customizationDialog).toBeVisible();
    await customizationDialog
      .locator("#customize-script-field-wrapper")
      .getByLabel("Open")
      .click();
    await page
      .getByRole("option", { name: "Arabic" })
      .filter({ hasNotText: "Arabic (Nastaliq variant)" })
      .click();
    await okButtonLocator(customizationDialog).click();
    await expect(
      page.locator(`button:has([data-testid="${scriptCardTestId("Arab")}"])`)
    ).toHaveClass(/.*selected-option-card-button.*/);
  });

  test("name and country are required in the unlisted language dialog", async () => {
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

    // invalid name should keep ok button disabled
    await enterName(customizationDialog, "!!!");
    expect(okButton).toBeDisabled();
    // fill in name and country, ok button enabled
    await enterName(customizationDialog, "foo");
    expect(okButton).not.toBeDisabled();

    // the word "required" should appear in labels twice, once for name and once for country
    await expect(
      customizationDialog.getByLabel(/.*required.*/).locator("visible=true")
    ).toHaveCount(2);
  });

  test("ok button is always enabled in customize dialog, no required fields", async () => {
    await selectChechenCard(page);
    await clickCustomizationButton(page);
    const customizationDialog = await customizationDialogLocator(page);
    await expect(customizationDialog).toBeVisible();
    const okButton = okButtonLocator(customizationDialog);
    await expect(okButton).not.toBeDisabled();
  });

  test("search string automatically fills into unlisted dialog name field", async () => {
    await search(page, "foo");
    await clickCustomizationButton(page);
    const customizationDialog = await customizationDialogLocator(page);
    await expect(customizationDialog).toBeVisible();
    await expect(customizationDialog.getByLabel("Name")).toHaveValue("foo");
  });
});

test.describe("Manually entered language tag behavior", () => {
  test.beforeAll(async ({ browser }) => {
    page = await createPageAndLoadLanguageChooser(browser);
  });

  test.beforeEach(async () => {
    await resetBeforeEach();
  });

  test.afterEach(async () => {
    await cleanupDialogHandlers();
  });

  test("invalid manually entered tag gets rejected, leaves selection untouched", async () => {
    await selectChechenCard(page);
    await clickCustomizationButton(page);
    const customizationDialogTagPreview = await page.getByTestId(
      "customization-dialog-tag-preview"
    );
    const chechenTag = "ce";
    await expect(customizationDialogTagPreview).toContainText(chechenTag);
    // clicking the tag preview will trigger a windows.prompt dialog, enter an invalid tag
    const dialogHandled = page
      .waitForEvent("dialog")
      .then((dialog) => dialog.accept("invalid-tag!"));
    await customizationDialogTagPreview.click({ modifiers: ["Control"] });
    await dialogHandled;
    // Dialog should still be up with chechen tag
    await expect(customizationDialogTagPreview).toContainText(chechenTag);
  });

  test("response to valid manually entered language tag submission", async () => {
    const tag = "zzz-Foo-x-barbaz";
    await manuallyEnterValidLanguageTag(page, tag);
    // expect tag to be visible on the right panel
    await expect(page.getByTestId("right-panel-langtag-preview")).toContainText(
      tag
    );

    // Should have closed the dialog
    await expect(customizationDialogLocator(page)).not.toBeVisible();

    // search should be cleared and there should be no option cards
    await expect(page.locator("#search-bar")).toBeEmpty();
    await expect(page.locator(".option-card-button")).not.toBeVisible();
  });
});
