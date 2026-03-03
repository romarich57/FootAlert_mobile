import { useMemo } from 'react';
import { ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import { PlayerProfileCharacteristicsCard } from '@ui/features/players/components/profile/PlayerProfileCharacteristicsCard';
import { PlayerProfileCompetitionCard } from '@ui/features/players/components/profile/PlayerProfileCompetitionCard';
import { PlayerProfileInfoTilesCard } from '@ui/features/players/components/profile/PlayerProfileInfoTilesCard';
import { PlayerProfilePositionsCard } from '@ui/features/players/components/profile/PlayerProfilePositionsCard';
import {
  createPlayerProfileTabStyles,
} from '@ui/features/players/components/profile/PlayerProfileTab.styles';
import { PlayerProfileTrophiesCard } from '@ui/features/players/components/profile/PlayerProfileTrophiesCard';
import {
  buildCompetitionKpis,
  buildInfoTiles,
  EMPTY_CHARACTERISTICS,
} from '@ui/features/players/components/profile/playerProfile.helpers';
import type {
  PlayerCharacteristics,
  PlayerPositionsData,
  PlayerProfile,
  PlayerProfileCompetitionStats,
  PlayerTrophiesByClub,
} from '@ui/features/players/types/players.types';

type PlayerProfileTabProps = {
  profile: PlayerProfile;
  competitionStats: PlayerProfileCompetitionStats | null;
  characteristics: PlayerCharacteristics | null;
  positions: PlayerPositionsData | null;
  trophiesByClub: PlayerTrophiesByClub;
  onPressCompetition?: (competitionId: string) => void;
};

export function PlayerProfileTab({
  profile,
  competitionStats,
  characteristics,
  positions,
  trophiesByClub,
  onPressCompetition,
}: PlayerProfileTabProps) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createPlayerProfileTabStyles(colors), [colors]);

  const infoTiles = useMemo(() => buildInfoTiles(profile, t), [profile, t]);
  const competitionKpis = useMemo(() => buildCompetitionKpis(competitionStats, t), [competitionStats, t]);
  const profileCharacteristics = characteristics ?? EMPTY_CHARACTERISTICS;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      removeClippedSubviews
      scrollEventThrottle={16}
    >
      <PlayerProfileInfoTilesCard infoTiles={infoTiles} styles={styles} mutedColor={colors.textMuted} />

      <PlayerProfileCompetitionCard
        competitionStats={competitionStats}
        competitionKpis={competitionKpis}
        styles={styles}
        t={t}
        textColor={colors.text}
        textMutedColor={colors.textMuted}
        primaryContrast={colors.primaryContrast}
        borderColor={colors.border}
        onPressCompetition={onPressCompetition}
      />

      <PlayerProfileCharacteristicsCard
        characteristics={profileCharacteristics}
        styles={styles}
        textColor={colors.text}
        t={t}
      />

      <PlayerProfilePositionsCard
        positions={positions}
        styles={styles}
        textColor={colors.text}
        borderColor={colors.border}
        surfaceColor={colors.surface}
        primaryColor={colors.primary}
        primaryContrast={colors.primaryContrast}
        t={t}
      />

      <PlayerProfileTrophiesCard
        trophiesByClub={trophiesByClub}
        styles={styles}
        textColor={colors.text}
        textMutedColor={colors.textMuted}
        t={t}
      />
    </ScrollView>
  );
}
