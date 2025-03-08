import availableLocales from "./available-locales.json" with { type: "json" };

module.exports = {
  locales: availableLocales,
  catalogs: [
    {
      path: "<rootDir>/locales/{locale}/messages",
      include: ["components"],
      exclude: [
        "**/node_modules/**",
        "**/*.stories.tsx",
        "**/*.stories.ts",
        "**/*.test.ts",
        "**/*.test.tsx",
        "**/*.spec.ts",
        "**/*.spec.tsx",
        "**/storybook/**",
        "**/test/**",
        "**/tests/**",
        "**/playwright/**",
        "**/e2e/**",
      ],
    },
  ],
  format: "po",
  sourceLocale: "en",
  orderBy: "messageId",
  compileNamespace: "ts",
};
