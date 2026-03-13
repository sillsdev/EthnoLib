import { spawn } from "node:child_process";

const storybookRefsByMode = {
  build: [
    {
      id: "svelte-daisyui",
      title: "Svelte DaisyUI",
      url: "./svelte",
    },
  ],
  dev: [
    {
      id: "svelte-daisyui",
      title: "Svelte DaisyUI",
      url: "http://localhost:6007",
    },
  ],
};

const mode = process.argv[2] === "build" ? "build" : "dev";
const command =
  mode === "build"
    ? "npx storybook build"
    : "npx storybook dev -p 6006";

const child = spawn(command, {
  shell: true,
  stdio: "inherit",
  env: {
    ...process.env,
    STORYBOOK_REFS: JSON.stringify(storybookRefsByMode[mode]),
  },
});

child.on("exit", (code) => {
  process.exit(code ?? 1);
});
