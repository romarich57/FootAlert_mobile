import { View } from 'react-native';
import type { TFunction } from 'i18next';

import type { ThemeColors } from '@ui/shared/theme/theme';
import {
  MatchCompetitionMetaCard,
  MatchRecentResultsCard,
  MatchStandingsCard,
  MatchUpcomingMatchesCard,
  MatchVenueWeatherCard,
} from '@ui/features/matches/details/components/tabs/shared/matchContextCards';
import type { MatchDetailsTabStyles } from '@ui/features/matches/details/components/tabs/shared/matchDetailsTabStyles';
import type { MatchPrimaryPostMatchSection } from '@ui/features/matches/details/components/tabs/components/primary/MatchPrimaryTab.types';

type MatchPrimaryPostMatchSectionsProps = {
  styles: MatchDetailsTabStyles;
  colors: ThemeColors;
  t: TFunction;
  locale: string;
  sections: MatchPrimaryPostMatchSection[];
  onPressMatch?: (matchId: string) => void;
  onPressTeam?: (teamId: string) => void;
  onPressCompetition?: (competitionId: string) => void;
};

export function MatchPrimaryPostMatchSections({
  styles,
  colors,
  t,
  locale,
  sections,
  onPressMatch,
  onPressTeam,
  onPressCompetition,
}: MatchPrimaryPostMatchSectionsProps) {
  return (
    <>
      {sections.map(section => {
        if (!section.payload) {
          return null;
        }

        if (section.id === 'venueWeather') {
          return (
            <View key={section.id} testID="match-summary-section-venueWeather">
              <MatchVenueWeatherCard
                styles={styles}
                colors={colors}
                t={t}
                locale={locale}
                payload={section.payload}
              />
            </View>
          );
        }

        if (section.id === 'competitionMeta') {
          return (
            <View key={section.id} testID="match-summary-section-competitionMeta">
              <MatchCompetitionMetaCard
                styles={styles}
                colors={colors}
                t={t}
                payload={section.payload}
                onPressCompetition={onPressCompetition}
              />
            </View>
          );
        }

        if (section.id === 'standings') {
          return (
            <View key={section.id} testID="match-summary-section-standings">
              <MatchStandingsCard
                styles={styles}
                t={t}
                payload={section.payload}
                onPressTeam={onPressTeam}
              />
            </View>
          );
        }

        if (section.id === 'recentResults') {
          return (
            <View key={section.id} testID="match-summary-section-recentResults">
              <MatchRecentResultsCard
                styles={styles}
                t={t}
                payload={section.payload}
                onPressMatch={onPressMatch}
                onPressTeam={onPressTeam}
              />
            </View>
          );
        }

        return (
          <View key={section.id} testID="match-summary-section-upcomingMatches">
            <MatchUpcomingMatchesCard
              styles={styles}
              t={t}
              payload={section.payload}
              onPressMatch={onPressMatch}
              onPressTeam={onPressTeam}
            />
          </View>
        );
      })}
    </>
  );
}
