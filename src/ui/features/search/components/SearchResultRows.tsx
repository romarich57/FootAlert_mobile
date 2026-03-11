import { Text, View } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import type { TFunction } from 'i18next';

import { DiscoveryEntityAvatar } from '@ui/features/follows/components/DiscoveryEntityAvatar';
import { AppPressable } from '@ui/shared/components';
import { AppImage } from '@ui/shared/media/AppImage';
import { localizePlayerPosition } from '@ui/shared/i18n/playerPosition';
import type {
  SearchCompetitionResult,
  SearchMatchResult,
  SearchPlayerResult,
  SearchTeamResult,
} from '@ui/features/search/types/search.types';

type SearchResultsRowStyles = {
  sectionHeader: object;
  sectionHeaderText: object;
  resultCard: object;
  logoWrap: object;
  logo: object;
  textWrap: object;
  title: object;
  subtitle: object;
};

export function SearchSectionHeader({
  title,
  styles,
}: {
  title: string;
  styles: SearchResultsRowStyles;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionHeaderText}>{title}</Text>
    </View>
  );
}

export function SearchTeamRow({
  item,
  styles,
  onPress,
}: {
  item: SearchTeamResult;
  styles: SearchResultsRowStyles;
  onPress: (teamId: string) => void;
}) {
  return (
    <AppPressable
      onPress={() => onPress(item.teamId)}
      style={styles.resultCard}
      accessibilityRole="button"
      accessibilityLabel={`${item.teamName} ${item.country}`.trim()}
      testID={`search-result-team-${item.teamId}`}
    >
      <View style={styles.logoWrap}>
        <DiscoveryEntityAvatar
          kind="team"
          entityId={item.teamId}
          imageUrl={item.teamLogo}
          name={item.teamName}
          imageStyle={styles.logo}
          resizeMode="contain"
        />
      </View>
      <View style={styles.textWrap}>
        <Text style={styles.title} numberOfLines={1}>
          {item.teamName}
        </Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {item.country}
        </Text>
      </View>
    </AppPressable>
  );
}

export function SearchPlayerRow({
  item,
  styles,
  t,
  onPress,
}: {
  item: SearchPlayerResult;
  styles: SearchResultsRowStyles;
  t: TFunction;
  onPress: (playerId: string) => void;
}) {
  const subtitle = [
    localizePlayerPosition(item.position, t),
    item.teamName,
    item.leagueName,
  ]
    .filter(Boolean)
    .join(' • ');

  return (
    <AppPressable
      onPress={() => onPress(item.playerId)}
      style={styles.resultCard}
      accessibilityRole="button"
      accessibilityLabel={`${item.playerName} ${subtitle}`.trim()}
      testID={`search-result-player-${item.playerId}`}
    >
      <View style={styles.logoWrap}>
        <DiscoveryEntityAvatar
          kind="player"
          entityId={item.playerId}
          imageUrl={item.playerPhoto}
          name={item.playerName}
          imageStyle={styles.logo}
          resizeMode="cover"
        />
      </View>
      <View style={styles.textWrap}>
        <Text style={styles.title} numberOfLines={1}>
          {item.playerName}
        </Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
    </AppPressable>
  );
}

export function SearchCompetitionRow({
  item,
  styles,
  iconColor,
  onPress,
}: {
  item: SearchCompetitionResult;
  styles: SearchResultsRowStyles;
  iconColor: string;
  onPress: (competitionId: string) => void;
}) {
  const subtitle = [item.country, item.type].filter(Boolean).join(' • ');

  return (
    <AppPressable
      onPress={() => onPress(item.competitionId)}
      style={styles.resultCard}
      accessibilityRole="button"
      accessibilityLabel={`${item.competitionName} ${subtitle}`.trim()}
      testID={`search-result-competition-${item.competitionId}`}
    >
      <View style={styles.logoWrap}>
        {item.competitionLogo ? (
          <AppImage source={{ uri: item.competitionLogo }} style={styles.logo} resizeMode="contain" />
        ) : (
          <MaterialCommunityIcons name="trophy-outline" size={18} color={iconColor} />
        )}
      </View>
      <View style={styles.textWrap}>
        <Text style={styles.title} numberOfLines={1}>
          {item.competitionName}
        </Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
    </AppPressable>
  );
}

export function SearchMatchRow({
  item,
  styles,
  iconColor,
  kickoff,
  statusLabel,
  t,
  onPress,
}: {
  item: SearchMatchResult;
  styles: SearchResultsRowStyles;
  iconColor: string;
  kickoff: string | null;
  statusLabel: string;
  t: TFunction;
  onPress: (fixtureId: string) => void;
}) {
  const title = t('common:match.fixtureLabel', {
    home: item.homeTeamName,
    away: item.awayTeamName,
  });
  const subtitle = [item.competitionName, kickoff || statusLabel]
    .filter(Boolean)
    .join(' • ');

  return (
    <AppPressable
      onPress={() => onPress(item.fixtureId)}
      style={styles.resultCard}
      accessibilityRole="button"
      accessibilityLabel={`${title} ${subtitle}`.trim()}
      testID={`search-result-match-${item.fixtureId}`}
    >
      <View style={styles.logoWrap}>
        <MaterialCommunityIcons name="soccer" size={18} color={iconColor} />
      </View>
      <View style={styles.textWrap}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
    </AppPressable>
  );
}
