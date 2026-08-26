import type { Meta, StoryObj } from "@storybook/react";
import { HostIntegrationDemo } from "./HostIntegrationDemo";

const meta: Meta<typeof HostIntegrationDemo> = {
  title: "Demos/Host Integration Demo",
  component: HostIntegrationDemo,
};

export default meta;
type Story = StoryObj<typeof HostIntegrationDemo>;

// Nothing selected yet, so the readout across the top starts empty with a report count of 0.
// Pick a language and a script and watch what the host is told, and when.
export const Primary: Story = {
  args: {},
  render: (args, context) => (
    <HostIntegrationDemo {...args} uiLanguage={context.parameters.uiLanguage} />
  ),
};

// Opened with a selection already in hand, the way a host reopens the chooser on a language the
// user picked earlier. Shows that the host is told about that starting selection rather than
// having to remember it.
export const ReopenedWithASelection: Story = {
  args: {
    initialLanguageTag: "uz-Cyrl",
    initialCustomDisplayName: "ÖzbekCustomizedName",
  },
  render: (args, context) => (
    <HostIntegrationDemo {...args} uiLanguage={context.parameters.uiLanguage} />
  ),
};
