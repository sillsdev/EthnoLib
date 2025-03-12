import { i18n } from "@lingui/core";
import availableLocales from "../../../../available-locales.json";

/**
 * Initialize the i18n instance with the specified locale and messages
 * @param locale The locale to activate (can be region-specific like 'es-ES' or base locale like 'es')
 */
export async function initI18n(locale: string) {
  let targetLocale = getBestAvailableLocale(locale);

  try {
    const { messages } = await import(
      `../../../../locales/${targetLocale}/messages.ts`
    );

    if (!messages) {
      throw new Error(`No messages found for locale "${targetLocale}"`);
    }

    i18n.load(targetLocale, messages);
    i18n.activate(targetLocale);
  } catch (error) {
    console.error(
      `Failed to load messages for locale "${targetLocale}":`,
      error
    );
    // If even English fails, we'll return i18n without any messages loaded
    if (targetLocale !== "en") {
      targetLocale = "en";
      console.log("Falling back to English locale");
      try {
        const { messages } = await import(`../../../../locales/en/messages.ts`);
        if (messages) {
          i18n.load("en", messages);
          i18n.activate("en");
        }
      } catch (fallbackError) {
        console.error("Failed to load English messages:", fallbackError);
      }
    }
  }

  return i18n;
}

function getBestAvailableLocale(requestedLocale: string) {
  // First check if the exact locale is available
  if (availableLocales.includes(requestedLocale)) {
    return requestedLocale;
  }
  // Then check if base locale is available
  const baseLocale = requestedLocale.split("-")[0];
  if (availableLocales.includes(baseLocale)) {
    console.log(
      `Using base locale "${baseLocale}" for region-specific locale "${requestedLocale}"`
    );
    return baseLocale;
  }
  // Finally fall back to English
  else {
    console.log(
      `Locale "${requestedLocale}" not available; falling back to English`
    );
    return "en";
  }
}

export { i18n };
