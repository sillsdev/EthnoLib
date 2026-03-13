import type { StorybookConfig } from "@storybook/svelte-vite";

const config: StorybookConfig = {
  stories: ["../src/**/*.@(mdx|stories.@(js|ts|svelte))"],
  addons: ["@storybook/addon-essentials"],
  framework: {
    name: "@storybook/svelte-vite",
    options: {
      builder: {
        viteConfigPath: "vite.config.ts",
      },
    },
  },
};

export default config;
