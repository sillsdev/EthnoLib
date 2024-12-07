import type { Meta, StoryObj } from "@storybook/react";
import { ThemeDemo } from "./ThemeDemo";

const meta: Meta<typeof ThemeDemo> = {
  component: ThemeDemo,
};

export default meta;
type Story = StoryObj<typeof ThemeDemo>;

export const Primary: Story = {};
