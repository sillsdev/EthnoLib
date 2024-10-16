import type { Meta, StoryObj } from "@storybook/react";
import DialogDemo from "./DialogDemo";

const meta: Meta<typeof DialogDemo> = {
  component: DialogDemo,
};

export default meta;
type Story = StoryObj<typeof DialogDemo>;

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

export const AdditionalRightPanelComponent: Story = {
  args: {
    alreadyFilled: false,
    demoRightPanelComponent: true,
  },
};

export const InASmallDialog: Story = {
  args: {
    alreadyFilled: false,
    dialogHeight: "350px",
    dialogWidth: "650px",
  },
};
