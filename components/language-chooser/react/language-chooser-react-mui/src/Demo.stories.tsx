import type { Meta, StoryObj } from "@storybook/react";
import Demo from "./Demo";

const meta: Meta<typeof Demo> = {
  component: Demo,
};

export default meta;
type Story = StoryObj<typeof Demo>;

export const Primary: Story = {
  args: {
    alreadyFilled: false,
  },
};

export const ReopenWithLanguageInformation: Story = {
  args: {
    alreadyFilled: true,
  },
};

export const InASmallDialog: Story = {
  args: {
    alreadyFilled: false,
    dialogHeight: "350px",
    dialogWidth: "650px",
  },
};
