import { Text, View } from 'react-native';

import { AppPressable } from '@ui/shared/components';
import { AppImage } from '@ui/shared/media/AppImage';
import type { MatchLineupTeam } from '@ui/features/matches/types/matches.types';
import type { MatchDetailsTabStyles } from '@ui/features/matches/details/components/tabs/shared/matchDetailsTabStyles';

type TeamColumnLabelProps = {
  styles: MatchDetailsTabStyles;
  team: MatchLineupTeam;
  onPressTeam?: (teamId: string) => void;
};

export function TeamColumnLabel({ styles, team, onPressTeam }: TeamColumnLabelProps) {
  if (onPressTeam) {
    return (
      <AppPressable
        style={styles.lineupColumnHeader}
        onPress={() => onPressTeam(team.teamId)}
        accessibilityRole='button'
        accessibilityLabel={team.teamName}
      >
        {team.teamLogo ? (
          <AppImage source={{ uri: team.teamLogo }} style={styles.lineupColumnTeamLogo} resizeMode="contain" />
        ) : null}
        <Text style={styles.lineupColumnTeamName} numberOfLines={1}>
          {team.teamName}
        </Text>
      </AppPressable>
    );
  }

  return (
    <View style={styles.lineupColumnHeader}>
      {team.teamLogo ? (
        <AppImage source={{ uri: team.teamLogo }} style={styles.lineupColumnTeamLogo} resizeMode="contain" />
      ) : null}
      <Text style={styles.lineupColumnTeamName} numberOfLines={1}>
        {team.teamName}
      </Text>
    </View>
  );
}
