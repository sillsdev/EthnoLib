import { test, expect, Page } from "@playwright/test";
import {
  clickLanguageCard,
  createPageAndLoadHostIntegrationDemo,
  loadHostIntegrationDemo,
  scriptCardTestId,
  search,
} from "./e2eHelpers";

let page: Page;

// What the chooser tells a host application, which is the half of the contract no other e2e file
// touches: they all drive the LanguageChooserDialog wrapper, whose own OK button stands in for the
// host. Bloom instead supplies its own actionButtons, passes no rightPanelComponent, and learns
// about the selection solely through onSelectionChange -- so these tests assert on what that
// callback reports, via src/demos/HostIntegrationDemo.tsx. They deliberately do not re-test search
// or card behavior, which the other files already cover.
test.describe("What onSelectionChange reports to the host", () => {
  test.beforeAll(async ({ browser }) => {
    page = await createPageAndLoadHostIntegrationDemo(browser);
  });

  // These tests change the selection, and there is no host UI here to reset it, so reload between
  // them rather than trying to click our way back to a pristine state.
  test.beforeEach(async () => {
    await loadHostIntegrationDemo(page);
  });

  test("chooser renders and is usable with no rightPanelComponent supplied", async () => {
    // The right pane itself still exists (it holds the display name bar, tag preview and the
    // host's action buttons); it's the client-supplied slot within it that is empty.
    await expect(page.locator("#right-panel-component-container")).toBeEmpty();

    await search(page, "russian");
    await clickLanguageCard(page, "rus");

    // The parts of the right pane the component owns still work
    await expect(page.locator("#language-name-bar")).toHaveValue(
      "русский язык"
    );
    await expect(page.getByTestId("right-panel-langtag-preview")).toContainText(
      "ru"
    );
  });

  test("onSelectionChange reports the tag and orthography once a language and script are chosen", async () => {
    const reportedTag = page.getByTestId("host-integration-reported-tag");
    const reportedScript = page.getByTestId("host-integration-reported-script");

    // Nothing is reported before there is a complete selection
    await expect(page.getByTestId("host-integration-report-count")).toHaveText(
      "0"
    );

    await search(page, "chechen");
    await clickLanguageCard(page, "che");
    // Chechen has several scripts, so the selection is not complete until one is picked
    await expect(reportedTag).toBeEmpty();

    await page.getByTestId(scriptCardTestId("Cyrl")).click();
    await expect(reportedTag).toHaveText("ce");
    await expect(
      page.getByTestId("host-integration-reported-language")
    ).toHaveText("ce");
    await expect(reportedScript).toHaveText("Cyrl");

    // Switching script re-reports, which is how the host learns the tag changed
    await page.getByTestId(scriptCardTestId("Arab")).click();
    await expect(reportedTag).toHaveText("ce-Arab");
    await expect(reportedScript).toHaveText("Arab");
  });

  test("onSelectionChange reports an undefined selection when the selection is cleared", async () => {
    const reportCount = page.getByTestId("host-integration-report-count");
    const reportedTag = page.getByTestId("host-integration-reported-tag");

    await search(page, "russian");
    await clickLanguageCard(page, "rus"); // Russian has a single script, so this alone is complete
    await expect(reportedTag).toHaveText("ru");
    const countWhenSelected = await reportCount.textContent();

    // Re-clicking the selected card unselects it
    await clickLanguageCard(page, "rus");
    // The host must be told the selection went away, not merely left holding the stale one, so
    // check that a report actually happened rather than only that the fields went empty.
    await expect(reportCount).not.toHaveText(countWhenSelected as string);
    await expect(reportedTag).toBeEmpty();
    await expect(
      page.getByTestId("host-integration-reported-language")
    ).toBeEmpty();
  });

  test("host-supplied action button enables and disables off the reported selection", async () => {
    const okButton = page.getByTestId("host-integration-ok-button");
    await expect(okButton).toBeDisabled();

    await search(page, "russian");
    await clickLanguageCard(page, "rus");
    await expect(okButton).toBeEnabled();

    await clickLanguageCard(page, "rus");
    await expect(okButton).toBeDisabled();
  });

  // A plain selection carries NO custom display name -- the chooser only fills that in once the
  // user edits the name field. A host that reads only customDisplayName therefore gets nothing for
  // the ordinary case and has to fall back to defaultDisplayName, which is what Bloom does.
  test("a selection the user did not rename reports a default name but no custom one", async () => {
    await search(page, "arabic");
    await clickLanguageCard(page, "arb");
    await page.getByTestId(scriptCardTestId("Arab")).click();

    await expect(page.getByTestId("host-integration-reported-tag")).toHaveText(
      "arb"
    );
    await expect(
      page.getByTestId("host-integration-reported-display-name")
    ).toBeEmpty();
    await expect(
      page.getByTestId("host-integration-default-display-name")
    ).not.toBeEmpty();
    // ...so the name a host would actually use comes from the default, not the custom field.
    await expect(
      page.getByTestId("host-integration-name-a-host-would-use")
    ).not.toBeEmpty();
  });

  // A host has to be able to tell "this script reads right-to-left", "this one reads
  // left-to-right", and "this script does not say" apart -- Bloom stores the difference (its IsRtl
  // is nullable) and conflating the last two is what BL-13982 was about.
  test("the script's reading direction is reported, and distinguishes unknown from false", async () => {
    const direction = page.getByTestId("host-integration-script-is-rtl");
    await expect(direction).toBeEmpty(); // nothing selected yet

    await search(page, "chechen");
    await clickLanguageCard(page, "che");
    await page.getByTestId(scriptCardTestId("Cyrl")).click();
    await expect(direction).toHaveText("false");

    await page.getByTestId(scriptCardTestId("Arab")).click();
    await expect(direction).toHaveText("true");
  });

  test("the country Bloom would store is derived from the reported tag", async () => {
    await expect(page.getByTestId("host-integration-country")).toBeEmpty();

    await search(page, "russian");
    await clickLanguageCard(page, "rus");
    await expect(page.getByTestId("host-integration-country")).not.toBeEmpty();
  });

  test("the host action button commits what it was told", async () => {
    await expect(page.getByTestId("host-integration-submitted")).toBeEmpty();

    await search(page, "russian");
    await clickLanguageCard(page, "rus");
    await page.getByTestId("host-integration-ok-button").click();

    await expect(page.getByTestId("host-integration-submitted")).toContainText(
      "ru"
    );
  });

  test("edits to the display name are reported to the host", async () => {
    // Bloom reads customDetails.customDisplayName off the reported selection to name the language,
    // so the report has to keep up with the display name field, not just the tag.
    await search(page, "russian");
    await clickLanguageCard(page, "rus");
    await expect(page.getByTestId("host-integration-reported-tag")).toHaveText(
      "ru"
    );

    await page.locator("#language-name-bar").fill("Ruso");
    await expect(
      page.getByTestId("host-integration-reported-display-name")
    ).toHaveText("Ruso");
  });
});
