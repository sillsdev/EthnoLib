import type { Meta, StoryObj } from "@storybook/svelte";
import BasicDemo from "./BasicDemo.svelte";

const meta = {
  title: "Demos/Basic Demo",
  component: BasicDemo,
} satisfies Meta<BasicDemo>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Primary: Story = {};
