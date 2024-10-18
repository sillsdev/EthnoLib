import type { Meta, StoryObj } from "@storybook/react";
import { PageDemo } from "./PageDemo";

const meta: Meta<typeof PageDemo> = {
  component: PageDemo,
};

export default meta;
type Story = StoryObj<typeof PageDemo>;

export const Primary: Story = {};
