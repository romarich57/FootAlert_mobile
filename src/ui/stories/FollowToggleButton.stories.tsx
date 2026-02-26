import type { Meta, StoryObj } from '@storybook/react-native';

import { FollowToggleButton } from '@ui/features/follows/components/FollowToggleButton';

const meta = {
  title: 'Follows/FollowToggleButton',
  component: FollowToggleButton,
  args: {
    isFollowing: false,
    onPress: () => undefined,
    followLabel: 'Follow',
    unfollowLabel: 'Following',
    accessibilityLabel: 'Toggle follow',
  },
} satisfies Meta<typeof FollowToggleButton>;

export default meta;

type Story = StoryObj<typeof meta>;

export const NotFollowing: Story = {};

export const Following: Story = {
  args: {
    isFollowing: true,
  },
};
