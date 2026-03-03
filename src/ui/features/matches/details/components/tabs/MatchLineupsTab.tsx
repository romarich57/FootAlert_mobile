import { Pressable, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';

import { AppImage } from '@ui/shared/media/AppImage';
import { AppPressable } from '@ui/shared/components';
import type {
  MatchLifecycleState,
  MatchLineupAbsence,
  MatchLineupPlayer,
  MatchLineupTeam,
} from '@ui/features/matches/types/matches.types';
import type { MatchDetailsTabStyles } from '@ui/features/matches/details/components/tabs/shared/matchDetailsTabStyles';
import { toText } from '@ui/features/matches/details/components/tabs/shared/matchDetailsParsing';
import { groupPlayersByPitchRows } from '@ui/features/matches/details/components/tabs/shared/matchDetailsSelectors';
import type { MatchDetailsDatasetErrorReason } from '@ui/features/matches/details/components/tabs/shared/matchDetailsTabTypes';

type MatchLineupsTabProps = {
  styles: MatchDetailsTabStyles;
  lifecycleState: MatchLifecycleState;
  lineupTeams: MatchLineupTeam[];
  onRefreshLineups?: () => void;
  isLineupsRefetching?: boolean;
  hasLineupsError?: boolean;
  lineupsErrorReason?: MatchDetailsDatasetErrorReason;
  lineupsDataSource?: 'query' | 'fixture_fallback' | 'none';
  onPressPlayer?: (playerId: string) => void;
  onPressTeam?: (teamId: string) => void;
};

type RatingVariant = 'elite' | 'good' | 'warning' | 'neutral';

function toInitials(value: string): string {
  const tokens = value
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (tokens.length === 0) {
    return '?';
  }

  const first = tokens[0]?.[0] ?? '';
  const second = tokens[1]?.[0] ?? '';
  const initials = `${first}${second}`.trim().toUpperCase();
  return initials || tokens[0].slice(0, 2).toUpperCase();
}

function formatRating(value: number | null | undefined): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return '--';
  }

  return value.toFixed(1).replace('.', ',');
}

function resolveRatingVariant(value: number | null | undefined): RatingVariant {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 'neutral';
  }
  if (value >= 8.5) {
    return 'elite';
  }
  if (value >= 7) {
    return 'good';
  }
  return 'warning';
}

function formatShortPlayerName(player: MatchLineupPlayer): string {
  const fullName = toText(player.name, '');
  if (!fullName) {
    return '--';
  }

  const chunks = fullName.split(/\s+/).filter(Boolean);
  const shortName = chunks.length > 1 ? chunks[chunks.length - 1] : fullName;
  return `${player.number ?? '--'} ${shortName}`;
}

function parseGridIndex(value: string | null | undefined): { row: number; col: number } {
  const fallback = { row: 999, col: 999 };
  if (!value || !value.includes(':')) {
    return fallback;
  }

  const [rowValue, colValue] = value.split(':');
  const row = Number.parseInt(rowValue ?? '', 10);
  const col = Number.parseInt(colValue ?? '', 10);

  if (!Number.isFinite(row) || !Number.isFinite(col)) {
    return fallback;
  }

  return {
    row,
    col,
  };
}

function normalizeAbsence(absence: MatchLineupAbsence | string): MatchLineupAbsence {
  if (typeof absence === 'string') {
    return {
      id: null,
      name: absence,
      photo: null,
      reason: null,
      status: null,
      type: null,
    };
  }

  return absence;
}

function sanitizeAbsenceText(rawValue: string | null | undefined, t: (key: string) => string): string | null {
  const rawLabel = toText(rawValue, '');
  if (!rawLabel) {
    return null;
  }

  const normalizedKey = rawLabel.replace(/^matchsDetails\./i, 'matchDetails.');
  if (/^matchDetails\./.test(normalizedKey)) {
    const translated = t(normalizedKey);
    return translated !== normalizedKey ? translated : t('matchDetails.values.unavailable');
  }

  if (/^missing(\s|_)?fixture$/i.test(rawLabel)) {
    return t('matchDetails.values.unavailable');
  }

  return rawLabel;
}

function resolveAbsenceTagLabel(rawValue: string | null | undefined, t: (key: string) => string): string | null {
  const normalized = toText(rawValue, '').toLowerCase().trim();
  if (!normalized) {
    return null;
  }

  if (
    normalized.includes('injur')
    || normalized.includes('bless')
  ) {
    return t('matchDetails.lineups.absenceTags.injured');
  }

  if (
    normalized.includes('suspend')
    || normalized.includes('ban')
  ) {
    return t('matchDetails.lineups.absenceTags.suspended');
  }

  if (
    normalized.includes('doubt')
    || normalized.includes('incertain')
  ) {
    return t('matchDetails.lineups.absenceTags.doubtful');
  }

  if (normalized.includes('question')) {
    return t('matchDetails.lineups.absenceTags.questionable');
  }

  if (
    normalized.includes('illness')
    || normalized.includes('sick')
    || normalized.includes('malad')
    || normalized.includes('virus')
    || normalized.includes('flu')
  ) {
    return t('matchDetails.lineups.absenceTags.illness');
  }

  if (
    normalized === 'out'
    || normalized.includes('unavailable')
    || normalized.includes('absent')
    || normalized.includes('indisponible')
  ) {
    return t('matchDetails.lineups.absenceTags.out');
  }

  return sanitizeAbsenceText(rawValue, t);
}

function resolvePositionLabel(position: string | null | undefined, t: (key: string) => string): string {
  switch (position) {
    case 'G':
      return t('playerPositions.goalkeeper');
    case 'D':
      return t('playerPositions.defender');
    case 'M':
      return t('playerPositions.midfielder');
    case 'F':
      return t('playerPositions.attacker');
    default:
      return t('matchDetails.values.unavailable');
  }
}

function computeTeamAverageRating(players: MatchLineupPlayer[]): number | null {
  const ratings = players
    .map(player => player.rating)
    .filter((rating): rating is number => typeof rating === 'number' && Number.isFinite(rating));

  if (ratings.length === 0) {
    return null;
  }

  const sum = ratings.reduce((acc, rating) => acc + rating, 0);
  return sum / ratings.length;
}

function renderRatingChip(
  styles: MatchDetailsTabStyles,
  rating: number | null | undefined,
  variant: RatingVariant,
  testId?: string,
  extraStyle?: StyleProp<ViewStyle>,
) {
  if (rating === null || rating === undefined) {
    return null;
  }

  const chipStyle =
    variant === 'elite'
      ? styles.lineupRatingChipElite
      : variant === 'good'
        ? styles.lineupRatingChipGood
        : variant === 'warning'
          ? styles.lineupRatingChipWarning
          : styles.lineupRatingChipNeutral;

  return (
    <View style={[styles.lineupRatingChip, chipStyle, extraStyle]} testID={testId}>
      <Text style={styles.lineupRatingChipText}>{formatRating(rating)}</Text>
    </View>
  );
}

function LineupPlayerNode({
  styles,
  player,
  eventMode,
  onPressPlayer,
}: {
  styles: MatchDetailsTabStyles;
  player: MatchLineupPlayer;
  eventMode: 'pitch' | 'bench';
  onPressPlayer?: (playerId: string) => void;
}) {
  const ratingVariant = resolveRatingVariant(player.rating);
  const hasOutgoingSub = typeof player.outMinute === 'number' && Number.isFinite(player.outMinute);
  const hasIncomingSub = typeof player.inMinute === 'number' && Number.isFinite(player.inMinute);
  const hasGoal = typeof player.goals === 'number' && player.goals > 0;
  const hasYellow = typeof player.yellowCards === 'number' && player.yellowCards > 0;
  const hasRed = typeof player.redCards === 'number' && player.redCards > 0;

  const content = (
    <View style={styles.lineupPlayerNode}>
      <View style={styles.lineupPlayerAvatarWrap}>
        <View style={styles.lineupPlayerImageWrap}>
          {player.photo ? (
            <AppImage source={{ uri: player.photo }} style={styles.lineupPlayerAvatar} resizeMode="contain" />
          ) : (
            <View style={styles.lineupPlayerAvatarFallback}>
              <Text style={styles.lineupPlayerAvatarFallbackText}>{toInitials(player.name)}</Text>
            </View>
          )}
        </View>

        {player.isCaptain ? (
          <View style={styles.lineupCaptainArmbandWrap}>
            <MaterialCommunityIcons name="alpha-c-box" size={18} color="#FDE047" />
          </View>
        ) : null}

        {renderRatingChip(styles, player.rating, ratingVariant)}

        {eventMode === 'pitch' && (hasOutgoingSub || hasIncomingSub) ? (
          <View style={styles.lineupPlayerEventWrap}>
            <Text style={styles.lineupPlayerEventMinute}>
              {(hasOutgoingSub ? player.outMinute : player.inMinute) ?? '--'}'
            </Text>
            <MaterialCommunityIcons
              name="swap-vertical"
              size={16}
              color={hasOutgoingSub ? '#F87171' : '#34D399'}
            />
          </View>
        ) : null}

        {eventMode === 'bench' && hasIncomingSub ? (
          <View style={styles.lineupBenchEventWrap}>
            <Text style={styles.lineupBenchEventMinute}>{player.inMinute}'</Text>
            <MaterialCommunityIcons name="swap-vertical" size={16} color="#34D399" />
          </View>
        ) : null}

        {hasGoal ? (
          <View style={styles.lineupPlayerGoalIconWrap}>
            <MaterialCommunityIcons name="soccer" size={13} color="#111827" />
          </View>
        ) : null}

        {hasYellow || hasRed ? (
          <View style={styles.lineupPlayerCardIconWrap}>
            <MaterialCommunityIcons
              name="card"
              size={12}
              color={hasRed ? '#EF4444' : '#F59E0B'}
            />
          </View>
        ) : null}
      </View>

      <Text style={styles.lineupPlayerName} numberOfLines={2}>
        {formatShortPlayerName(player)}
      </Text>
    </View>
  );

  if (player.id && onPressPlayer) {
    return (
      <AppPressable
        onPress={() => onPressPlayer(player.id)}
        accessibilityRole='button'
        accessibilityLabel={player.name}
      >
        {content}
      </AppPressable>
    );
  }

  return content;
}

function UnifiedLineupsPitch({
  styles,
  homeTeam,
  awayTeam,
  onPressPlayer,
  onPressTeam,
}: {
  styles: MatchDetailsTabStyles;
  homeTeam: MatchLineupTeam;
  awayTeam: MatchLineupTeam;
  onPressPlayer?: (playerId: string) => void;
  onPressTeam?: (teamId: string) => void;
}) {
  const processTeamRows = (team: MatchLineupTeam) => {
    return groupPlayersByPitchRows(team.startingXI)
      .map(row =>
        [...row].sort((playerA, playerB) => {
          const gridA = parseGridIndex(playerA.grid);
          const gridB = parseGridIndex(playerB.grid);
          return gridB.col - gridA.col;
        }),
      )
      .sort((rowA, rowB) => {
        const rowAIndex = parseGridIndex(rowA[0]?.grid).row;
        const rowBIndex = parseGridIndex(rowB[0]?.grid).row;
        return rowAIndex - rowBIndex;
      });
  };

  const homeRows = processTeamRows(homeTeam);
  const awayRows = processTeamRows(awayTeam);

  const homeTeamRating = computeTeamAverageRating(homeTeam.startingXI);
  const awayTeamRating = computeTeamAverageRating(awayTeam.startingXI);

  return (
    <View style={styles.lineupTeamBlock}>
      {/* Home Team Header */}
      <View style={styles.lineupTeamHeader}>
        {renderRatingChip(styles, homeTeamRating, resolveRatingVariant(homeTeamRating), 'lineup-home-rating', styles.lineupTeamRatingChip)}
        {homeTeam.teamLogo ? (
          <AppImage source={{ uri: homeTeam.teamLogo }} style={styles.lineupTeamLogo} resizeMode="contain" />
        ) : null}
        {onPressTeam ? (
          <AppPressable
            onPress={() => onPressTeam(homeTeam.teamId)}
            accessibilityRole='button'
            accessibilityLabel={homeTeam.teamName}
          >
            <Text style={styles.lineupTeamName}>{homeTeam.teamName}</Text>
          </AppPressable>
        ) : (
          <Text style={styles.lineupTeamName}>{homeTeam.teamName}</Text>
        )}
        <Text style={styles.lineupTeamFormation}>{homeTeam.formation ?? '--'}</Text>
      </View>

      {/* Unified Pitch Surface */}
      <View style={styles.lineupPitchSurface}>
        <View style={styles.lineupPitchCenterLine} />
        <View style={styles.lineupPitchCenterCircle} />
        <View style={styles.lineupPitchPenaltyTop} />
        <View style={styles.lineupPitchPenaltyBottom} />

        <View style={styles.lineupPitchHalfHome}>
          {homeRows.map((row, index) => (
            <View key={`${homeTeam.teamId}-pitch-row-${index}`} style={[styles.lineupPitchRow, { zIndex: 10 - index }]}>
              {row.map(player => (
                <LineupPlayerNode
                  key={player.id}
                  styles={styles}
                  player={player}
                  eventMode="pitch"
                  onPressPlayer={onPressPlayer}
                />
              ))}
            </View>
          ))}
        </View>

        <View style={styles.lineupPitchHalfAway}>
          {awayRows.map((row, index) => (
            <View key={`${awayTeam.teamId}-pitch-row-${index}`} style={[styles.lineupPitchRow, { zIndex: index }]}>
              {row.map(player => (
                <LineupPlayerNode
                  key={player.id}
                  styles={styles}
                  player={player}
                  eventMode="pitch"
                  onPressPlayer={onPressPlayer}
                />
              ))}
            </View>
          ))}
        </View>
      </View>

      {/* Away Team Footer */}
      <View style={styles.lineupTeamHeaderAway}>
        <Text style={[styles.lineupTeamFormation, styles.lineupTeamFormationAway]}>
          {awayTeam.formation ?? '--'}
        </Text>
        {renderRatingChip(styles, awayTeamRating, resolveRatingVariant(awayTeamRating), 'lineup-away-rating', styles.lineupTeamRatingChip)}
        {onPressTeam ? (
          <AppPressable
            onPress={() => onPressTeam(awayTeam.teamId)}
            accessibilityRole='button'
            accessibilityLabel={awayTeam.teamName}
          >
            <Text style={styles.lineupTeamName}>{awayTeam.teamName}</Text>
          </AppPressable>
        ) : (
          <Text style={styles.lineupTeamName}>{awayTeam.teamName}</Text>
        )}
        {awayTeam.teamLogo ? (
          <AppImage source={{ uri: awayTeam.teamLogo }} style={styles.lineupTeamLogo} resizeMode="contain" />
        ) : null}
      </View>
    </View>
  );
}

function TeamColumnLabel({
  styles,
  team,
  onPressTeam,
}: {
  styles: MatchDetailsTabStyles;
  team: MatchLineupTeam;
  onPressTeam?: (teamId: string) => void;
}) {
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

function FinishedBenchColumn({
  styles,
  team,
  t,
  onPressPlayer,
}: {
  styles: MatchDetailsTabStyles;
  team: MatchLineupTeam;
  t: (key: string) => string;
  onPressPlayer?: (playerId: string) => void;
}) {
  if (team.substitutes.length === 0) {
    return <Text style={styles.newsText}>{t('matchDetails.values.unavailable')}</Text>;
  }

  return (
    <View style={styles.lineupColumnList}>
      {team.substitutes.map(player => (
        <View key={`${team.teamId}-sub-finished-${player.id}`} style={styles.lineupBenchItem}>
          <LineupPlayerNode
            styles={styles}
            player={player}
            eventMode="bench"
            onPressPlayer={onPressPlayer}
          />
          <Text style={styles.lineupBenchPosition}>{resolvePositionLabel(player.position, t)}</Text>
        </View>
      ))}
    </View>
  );
}

function FinishedAbsenceColumn({
  styles,
  team,
  t,
  onPressPlayer,
}: {
  styles: MatchDetailsTabStyles;
  team: MatchLineupTeam;
  t: (key: string) => string;
  onPressPlayer?: (playerId: string) => void;
}) {
  if (team.absences.length === 0) {
    return null;
  }

  return (
    <View style={styles.lineupColumnList}>
      {team.absences.map((rawAbsence, index) => {
        const absence = normalizeAbsence(rawAbsence);
        const displayName = sanitizeAbsenceText(absence.name, t) ?? t('matchDetails.values.unavailable');
        const tags = [
          resolveAbsenceTagLabel(absence.reason, t),
          resolveAbsenceTagLabel(absence.status, t),
          resolveAbsenceTagLabel(absence.type, t),
        ].filter((tag): tag is string => Boolean(tag));
        const dedupedTags = tags.filter((tag, idx) => tags.indexOf(tag) === idx);
        const fallbackTag = t('matchDetails.values.unavailable');
        const displayTags = dedupedTags.length > 0 ? dedupedTags : [fallbackTag];

        const rowContent = (
          <View key={`${team.teamId}-absence-${absence.id ?? absence.name}-${index}`} style={styles.rosterRow}>
            <Text style={styles.rosterName} numberOfLines={1}>
              {displayName}
            </Text>
            {displayTags.map(tag => (
              <Text key={`${team.teamId}-absence-tag-${absence.id ?? absence.name}-${tag}`} style={styles.newsText}>
                {tag}
              </Text>
            ))}
          </View>
        );

        if (absence.id && onPressPlayer) {
          return (
            <AppPressable
              key={`${team.teamId}-absence-press-${absence.id}-${index}`}
              onPress={() => onPressPlayer(absence.id ?? '')}
              accessibilityRole='button'
              accessibilityLabel={displayName}
            >
              {rowContent}
            </AppPressable>
          );
        }

        return rowContent;
      })}
    </View>
  );
}

function FinishedLegend({ styles, t }: { styles: MatchDetailsTabStyles; t: (key: string) => string }) {
  const items = [
    { icon: 'hand-back-right-outline', label: t('matchDetails.lineups.legend.savedPenalties'), color: '#E5E7EB' },
    { icon: 'cards-outline', label: t('matchDetails.lineups.legend.yellowCard'), color: '#FACC15' },
    { icon: 'shoe-print', label: t('matchDetails.lineups.legend.assist'), color: '#E5E7EB' },
    { icon: 'card', label: t('matchDetails.lineups.legend.redCard'), color: '#F87171' },
    { icon: 'soccer', label: t('matchDetails.lineups.legend.goal'), color: '#E5E7EB' },
    { icon: 'cards-playing-outline', label: t('matchDetails.lineups.legend.secondYellow'), color: '#F59E0B' },
    { icon: 'soccer-field', label: t('matchDetails.lineups.legend.ownGoal'), color: '#FCA5A5' },
    { icon: 'medical-bag', label: t('matchDetails.lineups.legend.injured'), color: '#F87171' },
    { icon: 'close-circle-outline', label: t('matchDetails.lineups.legend.missedPenalty'), color: '#E5E7EB' },
    { icon: 'earth', label: t('matchDetails.lineups.legend.nationalTeam'), color: '#60A5FA' },
  ];

  return (
    <View style={styles.lineupLegendGrid}>
      {items.map(item => (
        <View key={item.label} style={styles.lineupLegendItem}>
          <MaterialCommunityIcons name={item.icon} size={17} color={item.color} />
          <Text style={styles.lineupLegendText}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
}

function FinishedLineups({
  styles,
  lineupTeams,
  t,
  onPressPlayer,
  onPressTeam,
}: {
  styles: MatchDetailsTabStyles;
  lineupTeams: MatchLineupTeam[];
  t: (key: string) => string;
  onPressPlayer?: (playerId: string) => void;
  onPressTeam?: (teamId: string) => void;
}) {
  const teams = lineupTeams.slice(0, 2);
  const homeTeam = teams[0];
  const awayTeam = teams[1];
  const hasAbsencesData = teams.some(team => team.absences.length > 0);

  return (
    <>
      {homeTeam && awayTeam ? (
        <UnifiedLineupsPitch
          styles={styles}
          homeTeam={homeTeam}
          awayTeam={awayTeam}
          onPressPlayer={onPressPlayer}
          onPressTeam={onPressTeam}
        />
      ) : null}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('matchDetails.lineups.coach')}</Text>
        <View style={styles.lineupTwoColumnsWrap}>
          {teams.map(team => (
            <View key={`coach-${team.teamId}`} style={styles.lineupColumn}>
              <TeamColumnLabel styles={styles} team={team} onPressTeam={onPressTeam} />
              <View style={styles.lineupCoachCard}>
                <View style={styles.lineupCoachAvatarWrap}>
                  <View style={styles.lineupPlayerImageWrap}>
                    {team.coachPhoto ? (
                      <AppImage source={{ uri: team.coachPhoto }} style={styles.lineupCoachAvatar} resizeMode="contain" />
                    ) : (
                      <View style={styles.lineupCoachAvatarFallback}>
                        <Text style={styles.lineupPlayerAvatarFallbackText}>{toInitials(team.coach ?? team.teamName)}</Text>
                      </View>
                    )}
                  </View>
                </View>
                <Text style={styles.lineupCoachName}>{team.coach ?? t('matchDetails.values.unavailable')}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('matchDetails.lineups.substitutes')}</Text>
        <View style={styles.lineupTwoColumnsWrap}>
          {teams.map(team => (
            <View key={`subs-${team.teamId}`} style={styles.lineupColumn}>
              <TeamColumnLabel styles={styles} team={team} onPressTeam={onPressTeam} />
              <FinishedBenchColumn styles={styles} team={team} t={t} onPressPlayer={onPressPlayer} />
            </View>
          ))}
        </View>
      </View>

      {hasAbsencesData ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('matchDetails.lineups.absencesDetailedTitle')}</Text>
          <View style={styles.lineupTwoColumnsWrap}>
            {teams.map(team => (
              <View key={`absences-${team.teamId}`} style={styles.lineupColumn}>
                <TeamColumnLabel styles={styles} team={team} onPressTeam={onPressTeam} />
                <FinishedAbsenceColumn styles={styles} team={team} t={t} onPressPlayer={onPressPlayer} />
              </View>
            ))}
          </View>
        </View>
      ) : null}

      <View style={styles.card}>
        <FinishedLegend styles={styles} t={t} />
      </View>
    </>
  );
}

export function MatchLineupsTab({
  styles,
  lifecycleState,
  lineupTeams,
  onRefreshLineups,
  isLineupsRefetching,
  hasLineupsError = false,
  lineupsErrorReason = 'none',
  lineupsDataSource,
  onPressPlayer,
  onPressTeam,
}: MatchLineupsTabProps) {
  const { t } = useTranslation();

  const showFinishedLayout = lifecycleState === 'finished';
  const lineupsEmptyStateKey =
    hasLineupsError && lineupsErrorReason === 'endpoint_not_available'
      ? 'matchDetails.states.datasetErrorsUnsupported.lineups'
      : hasLineupsError
        ? 'matchDetails.states.datasetErrors.lineups'
        : 'matchDetails.values.unavailable';

  return (
    <View style={styles.content}>
      {lineupTeams.length === 0 ? (
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.cardTitle}>{t('matchDetails.tabs.lineups')}</Text>
            {onRefreshLineups ? (
              <Pressable onPress={onRefreshLineups} disabled={isLineupsRefetching}>
                <Text style={styles.metricLabel}>
                  {isLineupsRefetching ? t('matchDetails.live.updating') : t('actions.retry')}
                </Text>
              </Pressable>
            ) : null}
          </View>
          <Text style={styles.emptyText}>
            {t(lineupsEmptyStateKey)}
          </Text>
        </View>
      ) : null}

      {lineupTeams.length > 0 && showFinishedLayout ? (
        <FinishedLineups
          styles={styles}
          lineupTeams={lineupTeams}
          t={t}
          onPressPlayer={onPressPlayer}
          onPressTeam={onPressTeam}
        />
      ) : null}

      {lineupTeams.length > 0 && lineupsDataSource === 'fixture_fallback' ? (
        <View style={styles.card}>
          <Text style={styles.newsText}>{t('matchDetails.states.fallbackSource')}</Text>
        </View>
      ) : null}

      {lineupTeams.length > 0 && !showFinishedLayout
        ? lineupTeams.map((team: MatchLineupTeam) => {
          const pitchRows = groupPlayersByPitchRows(team.startingXI);

          const formatPlayerChange = (player: MatchLineupPlayer) => {
            const inLabel =
              typeof player.inMinute === 'number' && Number.isFinite(player.inMinute)
                ? `↗ ${player.inMinute}'`
                : '';
            const outLabel =
              typeof player.outMinute === 'number' && Number.isFinite(player.outMinute)
                ? ` ↘ ${player.outMinute}'`
                : '';
            return `${inLabel}${outLabel}`.trim();
          };

          const formatPlayerCards = (player: MatchLineupPlayer) => {
            if (player.redCards && player.redCards > 0) return `R${player.redCards}`;
            if (player.yellowCards && player.yellowCards > 0) return `J${player.yellowCards}`;
            return 'J0';
          };

          return (
            <View key={team.teamId || team.teamName} style={styles.card}>
              {onPressTeam ? (
                <AppPressable
                  style={styles.teamHeaderRow}
                  onPress={() => onPressTeam(team.teamId)}
                  accessibilityRole='button'
                  accessibilityLabel={team.teamName}
                >
                  {team.teamLogo ? (
                    <AppImage source={{ uri: team.teamLogo }} style={styles.teamLogo} resizeMode="contain" />
                  ) : null}
                  <Text style={styles.cardTitle}>{team.teamName}</Text>
                </AppPressable>
              ) : (
                <View style={styles.teamHeaderRow}>
                  {team.teamLogo ? (
                    <AppImage source={{ uri: team.teamLogo }} style={styles.teamLogo} resizeMode="contain" />
                  ) : null}
                  <Text style={styles.cardTitle}>{team.teamName}</Text>
                </View>
              )}
              <Text style={styles.cardSubtitle}>
                {t('matchDetails.lineups.formation')}: {team.formation}
              </Text>
              <Text style={styles.cardSubtitle}>
                {t('matchDetails.lineups.coach')}: {team.coach}
              </Text>

              <View style={styles.pitchCard}>
                {pitchRows.map((row, index) => (
                  <View key={`${team.teamId}-pitch-row-${index}`} style={styles.pitchRow}>
                    {row.map(player => (
                      player.id && onPressPlayer ? (
                        <AppPressable
                          key={player.id}
                          style={styles.playerChip}
                          onPress={() => onPressPlayer(player.id)}
                          accessibilityRole='button'
                          accessibilityLabel={player.name}
                        >
                          <Text style={styles.playerChipText} numberOfLines={1}>
                            {player.number ?? '--'} {player.name}
                          </Text>
                        </AppPressable>
                      ) : (
                        <View key={player.id} style={styles.playerChip}>
                          <Text style={styles.playerChipText} numberOfLines={1}>
                            {player.number ?? '--'} {player.name}
                          </Text>
                        </View>
                      )
                    ))}
                  </View>
                ))}
              </View>

              <Text style={styles.metricLabel}>{t('matchDetails.lineups.substitutes')}</Text>
              {team.substitutes.map(player => (
                player.id && onPressPlayer ? (
                  <AppPressable
                    key={`${team.teamId}-sub-${player.id}`}
                    style={styles.rosterRow}
                    onPress={() => onPressPlayer(player.id)}
                    accessibilityRole='button'
                    accessibilityLabel={player.name}
                  >
                    <Text style={styles.rosterName} numberOfLines={1}>
                      {player.number ?? '--'} {player.name} {formatPlayerChange(player)}
                    </Text>
                    <Text style={styles.rosterMeta}>
                      ★ {player.rating ?? '--'} · G {player.goals ?? 0} · A {player.assists ?? 0} ·{' '}
                      {formatPlayerCards(player)}
                    </Text>
                  </AppPressable>
                ) : (
                  <View key={`${team.teamId}-sub-${player.id}`} style={styles.rosterRow}>
                    <Text style={styles.rosterName} numberOfLines={1}>
                      {player.number ?? '--'} {player.name} {formatPlayerChange(player)}
                    </Text>
                    <Text style={styles.rosterMeta}>
                      ★ {player.rating ?? '--'} · G {player.goals ?? 0} · A {player.assists ?? 0} ·{' '}
                      {formatPlayerCards(player)}
                    </Text>
                  </View>
                )
              ))}

              <Text style={styles.metricLabel}>{t('matchDetails.lineups.reserves')}</Text>
              {team.reserves.length > 0 ? (
                team.reserves.map(player => (
                  player.id && onPressPlayer ? (
                    <AppPressable
                      key={`${team.teamId}-reserve-${player.id}`}
                      style={styles.rosterRow}
                      onPress={() => onPressPlayer(player.id)}
                      accessibilityRole='button'
                      accessibilityLabel={player.name}
                    >
                      <Text style={styles.rosterName} numberOfLines={1}>
                        {player.number ?? '--'} {player.name}
                      </Text>
                      <Text style={styles.rosterMeta}>
                        ★ {player.rating ?? '--'} · G {player.goals ?? 0} · A {player.assists ?? 0} ·{' '}
                        {formatPlayerCards(player)}
                      </Text>
                    </AppPressable>
                  ) : (
                    <View key={`${team.teamId}-reserve-${player.id}`} style={styles.rosterRow}>
                      <Text style={styles.rosterName} numberOfLines={1}>
                        {player.number ?? '--'} {player.name}
                      </Text>
                      <Text style={styles.rosterMeta}>
                        ★ {player.rating ?? '--'} · G {player.goals ?? 0} · A {player.assists ?? 0} ·{' '}
                        {formatPlayerCards(player)}
                      </Text>
                    </View>
                  )
                ))
              ) : (
                <Text style={styles.newsText}>{t('matchDetails.values.unavailable')}</Text>
              )}
            </View>
          );
        })
        : null}
    </View>
  );
}
