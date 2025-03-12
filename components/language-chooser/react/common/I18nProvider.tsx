import React, { useState, useEffect } from "react";
import { I18nProvider as LinguiI18nProvider } from "@lingui/react";
import { i18n, initI18n } from "./i18n";

interface I18nProviderProps {
  locale?: string;
  children: React.ReactNode;
}

export const I18nProvider: React.FC<I18nProviderProps> = ({
  locale,
  children,
}) => {
  const [isI18nInitialized, setIsI18nInitialized] = useState(false);
  const effectiveLocale = locale || detectBrowserLocale();

  useEffect(() => {
    const setupI18n = async () => {
      await initI18n(effectiveLocale);
      setIsI18nInitialized(true);
    };

    setupI18n();
  }, [effectiveLocale]);

  if (!isI18nInitialized) {
    // You can replace this with a loading indicator if needed
    return null;
  }

  return <LinguiI18nProvider i18n={i18n}>{children}</LinguiI18nProvider>;
};

/**
 * Detects the browser's preferred language
 * @returns The detected browser locale or 'en' as fallback
 */
function detectBrowserLocale(): string {
  if (typeof window === "undefined") {
    return "en"; // Default for server-side rendering
  }

  // Use navigator language APIs to get the user's preferred language
  const browserLocale =
    navigator.languages?.[0] ||
    navigator.language ||
    (navigator as any).userLanguage ||
    (navigator as any).browserLanguage ||
    "en";

  return browserLocale;
}
