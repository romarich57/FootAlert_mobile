import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import type { Meta, StoryObj } from '@storybook/react-native';

import { IconActionButton } from '@ui/shared/components/IconActionButton';

const meta = {
  title: 'Shared/IconActionButton',
  component: IconActionButton,
  args: {
    accessibilityLabel: 'Open notifications',
    onPress: () => undefined,
    children: <MaterialCommunityIcons name="bell-outline" size={18} color="#111827" />,
  },
} satisfies Meta<typeof IconActionButton>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
