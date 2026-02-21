import { Pressable, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';

import { FollowsTrendRow } from '@ui/features/follows/components/FollowsTrendRow';
import type { FollowEntityTab, TrendPlayerItem, TrendTeamItem } from '@ui/features/follows/types/follows.types';

type FollowsTrendsSectionProps = {
  selectedTab: FollowEntityTab;
  hideTrends: boolean;
  followedTeamIds: string[];
  followedPlayerIds: string[];
  teamTrends: TrendTeamItem[];
  playerTrends: TrendPlayerItem[];
  onToggleFollowTeam: (teamId: string) => void;
  onToggleFollowPlayer: (playerId: string) => void;
  onPressTeam: (teamId: string) => void;
  onPressPlayer: (playerId: string) => void;
  onToggleVisibility: () => void;
  labels: {
    title: string;
    show: string;
    hide: string;
    noTrends: string;
    follow: string;
    unfollow: string;
  };
  styles: {
    trendsSection: StyleProp<ViewStyle>;
    trendsHeader: StyleProp<ViewStyle>;
    trendsTitle: StyleProp<TextStyle>;
    trendsActionText: StyleProp<TextStyle>;
    infoText: StyleProp<TextStyle>;
  };
};

export function FollowsTrendsSection({
  selectedTab,
  hideTrends,
  followedTeamIds,
  followedPlayerIds,
  teamTrends,
  playerTrends,
  onToggleFollowTeam,
  onToggleFollowPlayer,
  onPressTeam,
  onPressPlayer,
  onToggleVisibility,
  labels,
  styles,
}: FollowsTrendsSectionProps) {
  return (
    <View style={styles.trendsSection}>
      <View style={styles.trendsHeader}>
        <Text style={styles.trendsTitle}>{labels.title}</Text>
        <Pressable
          accessibilityRole="button"
          onPress={onToggleVisibility}
          accessibilityLabel={hideTrends ? labels.show : labels.hide}
        >
          <Text style={styles.trendsActionText}>{hideTrends ? labels.show : labels.hide}</Text>
        </Pressable>
      </View>

      {!hideTrends && selectedTab === 'teams' && teamTrends.length === 0 ? (
        <Text style={styles.infoText}>{labels.noTrends}</Text>
      ) : null}

      {!hideTrends && selectedTab === 'players' && playerTrends.length === 0 ? (
        <Text style={styles.infoText}>{labels.noTrends}</Text>
      ) : null}

      {!hideTrends &&
        selectedTab === 'teams' &&
        teamTrends.map(item => (
          <FollowsTrendRow
            key={`trend-team-${item.teamId}`}
            title={item.teamName}
            subtitle={item.leagueName}
            avatarUrl={item.teamLogo}
            onPressItem={() => onPressTeam(item.teamId)}
            itemAccessibilityLabel={item.teamName}
            isFollowing={followedTeamIds.includes(item.teamId)}
            onToggleFollow={() => onToggleFollowTeam(item.teamId)}
            followLabel={labels.follow}
            unfollowLabel={labels.unfollow}
            accessibilityLabel={`${labels.follow} ${item.teamName}`}
          />
        ))}

      {!hideTrends &&
        selectedTab === 'players' &&
        playerTrends.map(item => (
          <FollowsTrendRow
            key={`trend-player-${item.playerId}`}
            title={item.playerName}
            subtitle={[item.position, item.teamName].filter(Boolean).join(' • ')}
            avatarUrl={item.playerPhoto}
            onPressItem={() => onPressPlayer(item.playerId)}
            itemAccessibilityLabel={item.playerName}
            isFollowing={followedPlayerIds.includes(item.playerId)}
            onToggleFollow={() => onToggleFollowPlayer(item.playerId)}
            followLabel={labels.follow}
            unfollowLabel={labels.unfollow}
            accessibilityLabel={`${labels.follow} ${item.playerName}`}
          />
        ))}
    </View>
  );
}
