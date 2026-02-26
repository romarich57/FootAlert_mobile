import { Text, View } from 'react-native';

import type { TeamOverviewMiniStanding } from '@ui/features/teams/types/teams.types';
import { toDisplayNumber, toDisplayValue } from '@ui/features/teams/utils/teamDisplay';
import { AppImage } from '@ui/shared/media/AppImage';

import type { TeamOverviewStyles } from './TeamOverviewTab.styles';

type OverviewMiniStandingCardProps = {
  styles: TeamOverviewStyles;
  t: (key: string) => string;
  miniStanding: TeamOverviewMiniStanding | null;
};

export function OverviewMiniStandingCard({ styles, t, miniStanding }: OverviewMiniStandingCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.sectionHeader}>
        <Text style={styles.cardTitle}>{t('teamDetails.overview.miniStanding')}</Text>
        <View style={styles.miniStandingHeaderRight}>
          {miniStanding?.leagueLogo ? (
            <AppImage source={{ uri: miniStanding.leagueLogo }} style={styles.miniStandingLeagueLogo} />
          ) : null}
          <Text numberOfLines={1} style={styles.miniStandingTitle}>
            {toDisplayValue(miniStanding?.leagueName)}
          </Text>
        </View>
      </View>

      {(miniStanding?.rows.length ?? 0) > 0 ? (
        <>
          <View style={styles.tableHeader}>
            <View style={styles.colRank}><Text style={styles.tableHeaderText}>#</Text></View>
            <View style={styles.colTeam}><Text style={styles.tableHeaderText}>{t('teamDetails.standings.headers.team')}</Text></View>
            <View style={styles.colSmall}><Text style={styles.tableHeaderText}>{t('teamDetails.standings.headers.played')}</Text></View>
            <View style={styles.colSmall}><Text style={styles.tableHeaderText}>{t('teamDetails.standings.headers.win')}</Text></View>
            <View style={styles.colSmall}><Text style={styles.tableHeaderText}>{t('teamDetails.standings.headers.draw')}</Text></View>
            <View style={styles.colSmall}><Text style={styles.tableHeaderText}>{t('teamDetails.standings.headers.loss')}</Text></View>
            <View style={styles.colDiff}><Text style={styles.tableHeaderText}>{t('teamDetails.standings.headers.goalDiff')}</Text></View>
            <View style={styles.colPoints}><Text style={styles.tableHeaderText}>{t('teamDetails.standings.headers.points')}</Text></View>
          </View>

          {(miniStanding?.rows ?? []).map(row => (
            <View
              key={`mini-standing-${row.teamId ?? row.rank ?? 'unknown'}`}
              style={[styles.tableRow, row.isTargetTeam ? styles.tableRowTarget : null]}
            >
              <View style={styles.colRank}>
                <Text style={row.isTargetTeam ? styles.tableCellTextBold : styles.tableCellText}>
                  {toDisplayNumber(row.rank)}
                </Text>
              </View>
              <View style={styles.colTeam}>
                {row.teamLogo ? <AppImage source={{ uri: row.teamLogo }} style={styles.teamLogo} /> : null}
                <Text numberOfLines={1} style={styles.teamRowName}>
                  {toDisplayValue(row.teamName)}
                </Text>
              </View>
              <View style={styles.colSmall}><Text style={styles.tableCellText}>{toDisplayNumber(row.played)}</Text></View>
              <View style={styles.colSmall}><Text style={styles.tableCellText}>{toDisplayNumber(row.all.win)}</Text></View>
              <View style={styles.colSmall}><Text style={styles.tableCellText}>{toDisplayNumber(row.all.draw)}</Text></View>
              <View style={styles.colSmall}><Text style={styles.tableCellText}>{toDisplayNumber(row.all.lose)}</Text></View>
              <View style={styles.colDiff}><Text style={styles.tableCellText}>{toDisplayNumber(row.goalDiff)}</Text></View>
              <View style={styles.colPoints}>
                <Text style={row.isTargetTeam ? styles.tableCellTextBold : styles.tableCellText}>
                  {toDisplayNumber(row.points)}
                </Text>
              </View>
            </View>
          ))}
        </>
      ) : (
        <Text style={styles.stateText}>{t('teamDetails.states.empty')}</Text>
      )}
    </View>
  );
}
