import type { Meta, StoryObj } from '@storybook/react';
import Demo from './Demo.tsx';

const meta: Meta<typeof Demo> = {
  component: Demo,
};

export default meta;
type Story = StoryObj<typeof Demo>;

export const Primary: Story = {
  args: {
    primary: true,
    label: 'Demo',
  },
};
