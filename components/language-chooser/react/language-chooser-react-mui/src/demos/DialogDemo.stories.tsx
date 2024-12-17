import type { Meta, StoryObj } from "@storybook/react";
import DialogDemo from "./DialogDemo";
import { within, userEvent } from "@storybook/testing-library";
import { expect } from "@storybook/jest";

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

export const TestTest: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // const button = canvas.getByTestId("clear-search-X-button");
    const button = canvas.getByRole("button");
    await userEvent.click(button);
    expect(canvas.getByRole("button").innerText).toBe(
      "You've clicked me 1 times"
    );
    // await expect(canvas.getByTestId("#search-bar").innerText).toBe("");
    // await expect(canvas.locator(".option-card-button")).not.toBeVisible();
  },
};
