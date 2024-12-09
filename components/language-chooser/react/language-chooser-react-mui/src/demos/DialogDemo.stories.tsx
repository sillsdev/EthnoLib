import type { Meta, StoryObj } from "@storybook/react";
import DialogDemo from "./DialogDemo";

const meta: Meta<typeof DialogDemo> = {
  component: DialogDemo,
};

export default meta;
type Story = StoryObj<typeof DialogDemo>;

export const Primary: Story = {
  args: {},
};

export const ReopenWithLanguageInformation: Story = {
  args: {
    initialSearchString: "Uz",
    initialLanguageTag: "uz-Cyrl",
    initialCustomDisplayName: "ÖzbekCustomizedName",
  },
};

export const SearchWithTypo: Story = {
  args: {
    initialSearchString: "jpanese",
  },
};

export const SearchByRegionName: Story = {
  args: {
    initialSearchString: "afghanistan",
  },
};

export const SearchByAlternativeName: Story = {
  args: {
    initialSearchString: "barbadian creole english",
  },
};

export const SearchByISO639Code: Story = {
  args: {
    initialSearchString: "sdk",
  },
};

export const AdditionalRightPanelComponent: Story = {
  args: {
    demoRightPanelComponent: true,
  },
};

export const InTooSmallDialog: Story = {
  args: {
    dialogHeight: "350px",
    dialogWidth: "650px",
  },
};
