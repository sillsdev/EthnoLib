import type { Meta, StoryObj } from "@storybook/react";
import DialogDemo from "./DialogDemo";

const meta: Meta<typeof DialogDemo> = {
  component: DialogDemo,
  parameters: {
    docs: {
      description: {
        component:
          "The main demo component that shows a language chooser in a dialog. UI language can be switched using the Storybook toolbar's language selector.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof DialogDemo>;

export const Primary: Story = {
  args: {},
  parameters: {
    docs: {
      description: {
        story:
          "Basic dialog demo. You can change the UI language using the globe icon in the Storybook toolbar.",
      },
    },
  },
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
