import type { Preview } from "@storybook/react";
import React from "react";
import { I18nProvider } from "../../common/I18nProvider";

const uiLanguages = [
  { code: "en", name: "English" },
  { code: "fr", name: "Français" },
  // { code: "es", name: "Español" },
  // { code: "ar", name: "العربية" },
  // { code: "zh", name: "中文" },
];

const preview: Preview = {
  parameters: {
    locale: "en",
  },
  globalTypes: {
    locale: {
      name: "UI Language",
      description: "Language for the component UI",
      defaultValue: "en",
      toolbar: {
        icon: "globe",
        items: uiLanguages.map((lang) => ({
          value: lang.code,
          title: lang.name,
        })),
      },
    },
  },
  decorators: [
    (Story, context) => {
      const locale = context.globals.locale || "en";

      return (
        <I18nProvider locale={locale}>
          <Story />
        </I18nProvider>
      );
    },
  ],
};

export default preview;
