import type { Meta, StoryObj } from "@storybook/react";
import { ThemeDemo } from "./ThemeDemo";

const meta: Meta<typeof ThemeDemo> = {
  title: "Demos/Theme Demo",
  component: ThemeDemo,
};

export default meta;
type Story = StoryObj<typeof ThemeDemo>;

export const Primary: Story = {
  render: (args, context) => (
    <ThemeDemo {...args} uiLanguage={context.parameters.uiLanguage} />
  ),
};
