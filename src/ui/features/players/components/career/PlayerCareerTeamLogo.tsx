import { Image, View } from 'react-native';

import type { PlayerCareerTabStyles } from '@ui/features/players/components/career/PlayerCareerTab.styles';

type PlayerCareerTeamLogoProps = {
  logo: string | null;
  styles: PlayerCareerTabStyles;
  size?: number;
};

export function PlayerCareerTeamLogo({ logo, styles, size = 36 }: PlayerCareerTeamLogoProps) {
  if (logo) {
    return (
      <Image
        source={{ uri: logo }}
        style={[styles.teamLogo, { width: size, height: size, borderRadius: size / 2 }]}
      />
    );
  }

  return (
    <View
      style={[
        styles.teamLogo,
        styles.teamLogoFallback,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
    />
  );
}
