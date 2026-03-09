import { Image, Text, View } from 'react-native';

import { AppPressable } from '@ui/shared/components';
import type { H2HFixture } from '@ui/features/matches/details/components/tabs/shared/matchFaceOffHelpers';
import { formatH2HDate } from '@ui/features/matches/details/components/tabs/shared/matchFaceOffHelpers';
import type { MatchDetailsTabStyles } from '@ui/features/matches/details/components/tabs/shared/matchDetailsTabStyles';
import {
  matchFaceOffLocalStyles,
  type MatchFaceOffDynamicStyles,
} from '@ui/features/matches/details/components/tabs/MatchFaceOffTab.styles';

type MatchFaceOffMatchRowProps = {
  fixture: H2HFixture;
  styles: MatchDetailsTabStyles;
  dynamicStyles: MatchFaceOffDynamicStyles;
  locale: string;
  onPressMatch?: (matchId: string) => void;
  onPressTeam?: (teamId: string) => void;
  onPressCompetition?: (competitionId: string) => void;
};

export function MatchFaceOffMatchRow({
  fixture,
  styles,
  dynamicStyles,
  locale,
  onPressMatch,
  onPressTeam,
  onPressCompetition,
}: MatchFaceOffMatchRowProps) {
  const isHomeWinner =
    fixture.homeGoals !== null &&
    fixture.awayGoals !== null &&
    fixture.homeGoals > fixture.awayGoals;
  const isAwayWinner =
    fixture.homeGoals !== null &&
    fixture.awayGoals !== null &&
    fixture.awayGoals > fixture.homeGoals;
  const homeTeamResultStyle = isHomeWinner
    ? dynamicStyles.teamNameWin
    : isAwayWinner
      ? dynamicStyles.teamNameLoss
      : dynamicStyles.teamNameDraw;
  const awayTeamResultStyle = isAwayWinner
    ? dynamicStyles.teamNameWin
    : isHomeWinner
      ? dynamicStyles.teamNameLoss
      : dynamicStyles.teamNameDraw;
  const scoreText =
    fixture.homeGoals !== null && fixture.awayGoals !== null
      ? `${fixture.homeGoals} - ${fixture.awayGoals}`
      : '- - -';

  return (
    <View style={[matchFaceOffLocalStyles.h2hRow, dynamicStyles.h2hRow]}>
      <View style={styles.inlineRow}>
        <Text style={styles.newsText}>{formatH2HDate(fixture.date, locale)}</Text>
        {onPressCompetition ? (
          <AppPressable
            style={styles.badge}
            onPress={() => onPressCompetition(fixture.leagueId)}
            accessibilityRole='button'
            accessibilityLabel={fixture.leagueName}
          >
            <Text style={styles.badgeText} numberOfLines={1}>
              {fixture.leagueName}
            </Text>
          </AppPressable>
        ) : (
          <View style={styles.badge}>
            <Text style={styles.badgeText} numberOfLines={1}>
              {fixture.leagueName}
            </Text>
          </View>
        )}
      </View>

      <View style={matchFaceOffLocalStyles.scoreRow}>
        {onPressTeam ? (
          <AppPressable
            onPress={() => onPressTeam(fixture.homeTeamId)}
            accessibilityRole='button'
            accessibilityLabel={fixture.homeTeamName}
          >
            <Text style={[matchFaceOffLocalStyles.teamName, homeTeamResultStyle]} numberOfLines={1}>
              {fixture.homeTeamName}
            </Text>
          </AppPressable>
        ) : (
          <Text style={[matchFaceOffLocalStyles.teamName, homeTeamResultStyle]} numberOfLines={1}>
            {fixture.homeTeamName}
          </Text>
        )}

        {fixture.homeTeamLogo ? (
          onPressTeam ? (
            <AppPressable
              onPress={() => onPressTeam(fixture.homeTeamId)}
              accessibilityRole='button'
              accessibilityLabel={fixture.homeTeamName}
            >
              <Image source={{ uri: fixture.homeTeamLogo }} style={matchFaceOffLocalStyles.teamLogo} />
            </AppPressable>
          ) : (
            <Image source={{ uri: fixture.homeTeamLogo }} style={matchFaceOffLocalStyles.teamLogo} />
          )
        ) : null}

        {onPressMatch ? (
          <AppPressable
            style={[matchFaceOffLocalStyles.scoreBadge, dynamicStyles.scoreBadge]}
            onPress={() => onPressMatch(fixture.fixtureId)}
            accessibilityRole='button'
            accessibilityLabel={scoreText}
          >
            <Text style={[matchFaceOffLocalStyles.scoreText, dynamicStyles.scoreText]}>{scoreText}</Text>
          </AppPressable>
        ) : (
          <View style={[matchFaceOffLocalStyles.scoreBadge, dynamicStyles.scoreBadge]}>
            <Text style={[matchFaceOffLocalStyles.scoreText, dynamicStyles.scoreText]}>{scoreText}</Text>
          </View>
        )}

        {fixture.awayTeamLogo ? (
          onPressTeam ? (
            <AppPressable
              onPress={() => onPressTeam(fixture.awayTeamId)}
              accessibilityRole='button'
              accessibilityLabel={fixture.awayTeamName}
            >
              <Image source={{ uri: fixture.awayTeamLogo }} style={matchFaceOffLocalStyles.teamLogo} />
            </AppPressable>
          ) : (
            <Image source={{ uri: fixture.awayTeamLogo }} style={matchFaceOffLocalStyles.teamLogo} />
          )
        ) : null}

        {onPressTeam ? (
          <AppPressable
            onPress={() => onPressTeam(fixture.awayTeamId)}
            accessibilityRole='button'
            accessibilityLabel={fixture.awayTeamName}
          >
            <Text style={[matchFaceOffLocalStyles.teamName, awayTeamResultStyle]} numberOfLines={1}>
              {fixture.awayTeamName}
            </Text>
          </AppPressable>
        ) : (
          <Text style={[matchFaceOffLocalStyles.teamName, awayTeamResultStyle]} numberOfLines={1}>
            {fixture.awayTeamName}
          </Text>
        )}
      </View>
    </View>
  );
}
