import { i18n } from "@lingui/core";

/**
 * Initialize the i18n instance with the specified locale and messages
 * @param locale The locale to activate
 */
export async function initI18n(locale: string) {
  try {
    // Dynamic import of the messages.ts file
    const { messages } = await import(
      `../../../../locales/${locale}/messages.ts`
    );

    if (!messages) {
      throw new Error(`No messages found for locale "${locale}"`);
    }

    i18n.load(locale, messages);
    i18n.activate(locale);
  } catch (error) {
    console.error(`Failed to load messages for locale "${locale}":`, error);

    // Fallback to English if the requested locale fails to load
    if (locale !== "en") {
      console.log("Falling back to English locale");
      return initI18n("en");
    }
  }

  return i18n;
}

export { i18n };
