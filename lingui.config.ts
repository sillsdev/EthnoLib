module.exports = {
  locales: ["en", "fr"],
  // locales: ["en", "fr", "es", "zh", "ar"],
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
