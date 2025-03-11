// Script to dynamically generate available-locales.json
// based on the folders present in the locales directory.
// See README-l10n.md for more information.
// (This was mostly created by copilot.)

import * as fs from "fs";
import * as path from "path";

// Path to locales directory and JSON output file
const localesDir = path.resolve(__dirname, "../locales");
const localesJsonPath = path.resolve(__dirname, "../available-locales.json");

// Function to get all directory names in the locales folder
function getLocaleDirs(): string[] {
  try {
    return fs
      .readdirSync(localesDir)
      .filter((file) => fs.statSync(path.join(localesDir, file)).isDirectory());
  } catch (err) {
    console.error("Error reading locales directory:", err);
    return [];
  }
}

// Function to generate the available-locales.json file
function generateLocalesJson(locales: string[]): boolean {
  try {
    fs.writeFileSync(localesJsonPath, JSON.stringify(locales, null, 2), "utf8");
    console.log(
      `Successfully generated available-locales.json with ${locales.length} locales`
    );
    return true;
  } catch (err) {
    console.error("Error generating available-locales.json:", err);
    return false;
  }
}

// Main function
function main(): void {
  const locales = getLocaleDirs();

  if (locales.length === 0) {
    console.warn("No locale directories found!");
    return;
  }

  generateLocalesJson(locales);
}

// Run the script
main();
