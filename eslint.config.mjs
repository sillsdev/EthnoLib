// @ts-check

import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import reactPlugin from "eslint-plugin-react";
import eslintConfigPrettier from "eslint-config-prettier";
import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended";
import eslintPluginReactHooks from "eslint-plugin-react-hooks";
// TODO future work: eslint-plugin-react-hooks support for flat-config looks like it's on it's way:
// https://github.com/facebook/react/pull/30774. When released, we should switch to that.

export default [
  {
    ignores: ["**/node_modules/**/*", "**/dist/**"],
  },
  eslint.configs.recommended,
  eslintConfigPrettier, // disables eslint rules that could conflict with prettier
  eslintPluginPrettierRecommended,
  ...tseslint.config(
    // tseslint.config() is a helper function giving autocomplete and documentation https://typescript-eslint.io/packages/typescript-eslint#config
    // not sure if we want this, we can get rid of it if it causes any trouble
    ...tseslint.configs.recommended,
    {
      files: ["**/*.{ts,tsx}"],
      plugins: {
        "@typescript-eslint": tseslint.plugin,
      },
      rules: {
        // Copied from BloomDesktop
        "prettier/prettier": "off",
        "no-var": "warn",
        "prefer-const": "warn",
        "no-useless-escape": "off",
        "no-irregular-whitespace": [
          "error",
          { skipStrings: true, skipTemplates: true },
        ],
        "no-warning-comments": [
          1,
          { terms: ["nocommit"], location: "anywhere" },
        ],
        // Downgraded from error to warnings
        "@typescript-eslint/no-empty-function": "warn",
        "@typescript-eslint/no-empty-interface": "warn",
        "@typescript-eslint/no-explicit-any": "warn",
        "@typescript-eslint/no-unused-vars": [
          "warn",
          { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
        ],
        "@typescript-eslint/no-var-requires": "warn",
        "no-case-declarations": "warn",
        "prefer-rest-params": "warn",
        "prefer-spread": "warn",
        eqeqeq: ["warn", "always"],
        // Disabled
        "@typescript-eslint/ban-types": "off", // Record<string, never> is not intuitive for us compared to {}
        "@typescript-eslint/no-inferrable-types": "off", // not worth worrying about (not even convinced it's a problem at all)
      },
    }
  ),

  // React configs to be applied to react files only
  ...[
    reactPlugin.configs.flat?.recommended,
    reactPlugin.configs.flat?.["jsx-runtime"],
    {
      settings: {
        react: {
          version: "17.0", // React version. Should match the version which the react packages are using. Currently cannot be automatically detected because we don't have react installed at the root (here)
        },
      },
      plugins: {
        react: reactPlugin,
        "react-hooks": eslintPluginReactHooks,
      },
      rules: {
        // Copied from BloomDesktop
        "react/no-unknown-property": ["error", { ignore: ["css"] }], // allow emotion css: https://emotion.sh/docs/eslint-plugin-react
        "react/no-unescaped-entities": "off", // Complains about some special chars that sort of work, but due to the burden that encoded chars present to localizers, we'd prefer not to encode them if not necessary.
        "react/prop-types": "off", // Seems to require validation on the props parameter itself, but Typescript can already figure out the types through annotations in different places, seems unnecessary
        ...eslintPluginReactHooks.configs.recommended.rules, // See TODO above
      },
    },
  ].map((c) => {
    return { ...c, files: ["**/*.{jsx,mjsx,tsx,mtsx}"] };
  }),
];
