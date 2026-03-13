import { test, expect, Page } from "@playwright/test";
import {
  clickCustomizationButton,
  search,
  selectChechenCard,
} from "./e2eHelpers";

test.describe("UI Localization", () => {
  test("French translations are present and English is absent", async ({
    page,
  }) => {
    await page.goto("/?uiLanguage=fr", { waitUntil: "load" });

    // Test 1: "Choose Language" -> "Sélectionnez une langue"
    await expect(page.getByText("Sélectionnez une langue")).toBeVisible();
    await expect(
      page.getByText("Choose Language", { exact: true })
    ).toHaveCount(0);

    // Select a language to access the Customize button
    await search(page, "chechen");
    await selectChechenCard(page);

    // Test 2: "Customize" -> "Personnaliser"
    const customizeButton = page.getByTestId("customization-button");
    await expect(customizeButton).toContainText("Personnaliser");
    await expect(customizeButton).not.toContainText("Customize");

    // Open customization dialog to access more labels
    await clickCustomizationButton(page);
    const dialog = page.getByTestId("customization-dialog");

    // Test 3: "Cancel" -> "Annuler"
    const cancelButton = dialog.getByRole("button", { name: "Annuler" });
    await expect(cancelButton).toBeVisible();
    await expect(
      dialog.getByRole("button", { name: "Cancel", exact: true })
    ).toHaveCount(0);
  });

  test("English translations are present", async ({ page }) => {
    await page.goto("/?uiLanguage=en", { waitUntil: "load" });

    // Verify English versions are present
    await expect(page.getByText("Choose Language")).toBeVisible();

    await search(page, "chechen");
    await selectChechenCard(page);

    const customizeButton = page.getByTestId("customization-button");
    await expect(customizeButton).toContainText("Customize");

    await clickCustomizationButton(page);
    const dialog = page.getByTestId("customization-dialog");
    const cancelButton = dialog.getByRole("button", { name: "Cancel" });
    await expect(cancelButton).toBeVisible();
  });
});
