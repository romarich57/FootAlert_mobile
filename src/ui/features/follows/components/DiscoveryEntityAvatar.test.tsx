import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { DiscoveryEntityAvatar } from '@ui/features/follows/components/DiscoveryEntityAvatar';

jest.mock('@ui/app/providers/ThemeProvider', () => ({
  useAppTheme: () => ({
    colors: {
      text: '#fff',
    },
  }),
}));

jest.mock('@ui/shared/media/AppImage', () => ({
  AppImage: ({ source, onError }: { source: { uri?: string }; onError?: () => void }) => {
    const mockReact = require('react');
    const ReactNative = require('react-native');

    return mockReact.createElement(
      ReactNative.View,
      null,
      mockReact.createElement(
        ReactNative.Text,
        { testID: 'avatar-source' },
        source?.uri ?? '',
      ),
      mockReact.createElement(ReactNative.Pressable, {
        testID: 'avatar-force-error',
        onPress: () => onError?.(),
      }),
    );
  },
}));

describe('DiscoveryEntityAvatar', () => {
  it('uses the canonical player photo derived from the player id', () => {
    render(
      <DiscoveryEntityAvatar
        kind="player"
        entityId="278"
        imageUrl="https://wrong.example/player.png"
        name="Kylian Mbappe"
      />,
    );

    expect(screen.getByTestId('avatar-source').props.children).toBe(
      'https://media.api-sports.io/football/players/278.png',
    );
  });

  it('falls back to text only after a real image error', () => {
    render(
      <DiscoveryEntityAvatar
        kind="player"
        entityId="278"
        imageUrl="https://wrong.example/player.png"
        name="Kylian Mbappe"
      />,
    );

    fireEvent.press(screen.getByTestId('avatar-force-error'));

    expect(screen.getByText('KM')).toBeTruthy();
  });
});
