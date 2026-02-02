import type { Meta, StoryObj } from "@storybook/react";
import DialogDemo from "./DialogDemo";

const meta: Meta<typeof DialogDemo> = {
  component: DialogDemo,
};

export default meta;
type Story = StoryObj<typeof DialogDemo>;

export const Primary: Story = {
  args: {},
  render: (args, context) => (
    <DialogDemo {...args} uiLanguage={context.parameters.uiLanguage} />
  ),
};

export const ReopenWithLanguageInformation: Story = {
  args: {
    initialSearchString: "Uz",
    initialLanguageTag: "uz-Cyrl",
    initialCustomDisplayName: "ÖzbekCustomizedName",
  },
  render: (args, context) => (
    <DialogDemo {...args} uiLanguage={context.parameters.uiLanguage} />
  ),
};

// This is useless now that we don't show anything in the search bar on reopening. See https://issues.bloomlibrary.org/youtrack/issue/BL-15114
// TODO Future work: make these demos work (BL-15114)
// export const SearchWithTypo: Story = {
//   args: {
//     initialSearchString: "jpanese",
//   },
//   render: (args, context) => (
//     <DialogDemo {...args} uiLanguage={context.parameters.uiLanguage} />
//   ),
// };

export const SearchByRegionName: Story = {
  args: {
    initialSearchString: "afghanistan",
  },
  render: (args, context) => (
    <DialogDemo {...args} uiLanguage={context.parameters.uiLanguage} />
  ),
};

// These don't make a lot of sense now that we don't show anything in the search bar on reopening. See https://issues.bloomlibrary.org/youtrack/issue/BL-15114
// TODO Future work: make these demos work (BL-15114)
// export const SearchByAlternativeName: Story = {
//   args: {
//     initialSearchString: "barbadian creole english",
//   },
//   render: (args, context) => (
//     <DialogDemo {...args} uiLanguage={context.parameters.uiLanguage} />
//   ),
// };

// export const SearchByISO639Code: Story = {
//   args: {
//     initialSearchString: "sdk",
//   },
//   render: (args, context) => (
//     <DialogDemo {...args} uiLanguage={context.parameters.uiLanguage} />
//   ),
// };

export const MacrolanguageBehavior: Story = {
  args: {
    initialSearchString: "Luyia",
  },
  render: (args, context) => (
    <DialogDemo {...args} uiLanguage={context.parameters.uiLanguage} />
  ),
};

export const AdditionalRightPanelComponent: Story = {
  args: {
    demoRightPanelComponent: true,
  },
  render: (args, context) => (
    <DialogDemo {...args} uiLanguage={context.parameters.uiLanguage} />
  ),
};

export const InTooSmallDialog: Story = {
  args: {
    dialogHeight: "350px",
    dialogWidth: "650px",
  },
  render: (args, context) => (
    <DialogDemo {...args} uiLanguage={context.parameters.uiLanguage} />
  ),
};
