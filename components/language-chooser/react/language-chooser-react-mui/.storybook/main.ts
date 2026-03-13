import type { StorybookConfig } from "@storybook/react-vite";

type ExternalStorybookRef = {
  id: string;
  title: string;
  url: string;
};

const externalStorybookRefs = parseExternalStorybookRefs(
  process.env.STORYBOOK_REFS,
);

function parseExternalStorybookRefs(
  rawStorybookRefs: string | undefined,
): ExternalStorybookRef[] {
  if (!rawStorybookRefs) {
    return [];
  }

  try {
    const parsedStorybookRefs = JSON.parse(rawStorybookRefs);

    if (!Array.isArray(parsedStorybookRefs)) {
      return [];
    }

    return parsedStorybookRefs.flatMap((value) => {
      if (!value || typeof value !== "object") {
        return [];
      }

      const ref = value as ExternalStorybookRef;

      if (!ref.id || !ref.title || !ref.url) {
        return [];
      }

      return [ref];
    });
  } catch {
    return [];
  }
}

const config: StorybookConfig = {
  stories: [
    {
      directory: "../src",
      files: "**/*.@(mdx|stories.@(js|jsx|ts|tsx))",
      titlePrefix: "React MUI",
    },
  ],
  addons: ["@storybook/addon-essentials"],
  refs: externalStorybookRefs.length
    ? Object.fromEntries(
        externalStorybookRefs.map((ref) => [
          ref.id,
          {
            title: ref.title,
            url: ref.url,
          },
        ]),
      )
    : undefined,
  framework: {
    name: "@storybook/react-vite",
    options: {
      builder: {
        viteConfigPath: "vite.config.ts",
      },
    },
  },
};

export default config;

// To customize your Vite configuration you can use the viteFinal field.
// Check https://storybook.js.org/docs/react/builders/vite#configuration
// and https://nx.dev/recipes/storybook/custom-builder-configs
