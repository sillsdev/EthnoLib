import type { Meta, StoryObj } from "@storybook/react";
import { PageDemo } from "./PageDemo";

const meta: Meta<typeof PageDemo> = {
  title: "Demos/Page Demo",
  component: PageDemo,
};

export default meta;
type Story = StoryObj<typeof PageDemo>;

export const Primary: Story = {
  render: (args, context) => (
    <PageDemo {...args} uiLanguage={context.parameters.uiLanguage} />
  ),
};
