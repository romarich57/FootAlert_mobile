import type { Meta, StoryObj } from '@storybook/react-native';

import { SectionInProgressView } from '@ui/shared/components/SectionInProgressView';

const meta = {
  title: 'Shared/SectionInProgressView',
  component: SectionInProgressView,
} satisfies Meta<typeof SectionInProgressView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
