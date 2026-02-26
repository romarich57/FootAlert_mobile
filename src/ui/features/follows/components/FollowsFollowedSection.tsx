import { useCallback } from 'react';
import { FollowedCarousel, FollowedPlayerCard, FollowedTeamCard, FollowsEmptyFollowedCard } from '@ui/features/follows/components';
import type { FollowEntityTab, FollowedPlayerCard as FollowedPlayerCardType, FollowedTeamCard as FollowedTeamCardType } from '@ui/features/follows/types/follows.types';

type FollowsFollowedSectionProps = {
  selectedTab: FollowEntityTab;
  teamCards: FollowedTeamCardType[];
  playerCards: FollowedPlayerCardType[];
  isEditMode: boolean;
  onPressAdd: () => void;
  onUnfollowTeam: (teamId: string) => void;
  onUnfollowPlayer: (playerId: string) => void;
  onPressTeam: (teamId: string) => void;
  onPressPlayer: (playerId: string) => void;
  labels: {
    addToFavorites: string;
    follow: string;
    unfollow: string;
    noNextMatch: string;
    goals: string;
    assists: string;
  };
};

export function FollowsFollowedSection({
  selectedTab,
  teamCards,
  playerCards,
  isEditMode,
  onPressAdd,
  onUnfollowTeam,
  onUnfollowPlayer,
  onPressTeam,
  onPressPlayer,
  labels,
}: FollowsFollowedSectionProps) {
  const renderTeamCard = useCallback(
    (item: FollowedTeamCardType) => (
      <FollowedTeamCard
        card={item}
        unfollowLabel={labels.unfollow}
        followLabel={labels.follow}
        onUnfollow={onUnfollowTeam}
        onPressTeam={onPressTeam}
        noNextMatchLabel={labels.noNextMatch}
        isEditMode={isEditMode}
      />
    ),
    [isEditMode, labels.follow, labels.noNextMatch, labels.unfollow, onPressTeam, onUnfollowTeam],
  );

  const renderPlayerCard = useCallback(
    (item: FollowedPlayerCardType) => (
      <FollowedPlayerCard
        card={item}
        followLabel={labels.follow}
        unfollowLabel={labels.unfollow}
        onUnfollow={onUnfollowPlayer}
        onPressPlayer={onPressPlayer}
        goalsLabel={labels.goals}
        assistsLabel={labels.assists}
        isEditMode={isEditMode}
      />
    ),
    [
      isEditMode,
      labels.assists,
      labels.follow,
      labels.goals,
      labels.unfollow,
      onPressPlayer,
      onUnfollowPlayer,
    ],
  );

  if (selectedTab === 'teams') {
    return (
      <FollowedCarousel
        items={teamCards}
        keyExtractor={item => item.teamId}
        renderItem={renderTeamCard}
        emptyState={<FollowsEmptyFollowedCard onPress={onPressAdd} label={labels.addToFavorites} />}
      />
    );
  }

  return (
    <FollowedCarousel
      items={playerCards}
      keyExtractor={item => item.playerId}
      renderItem={renderPlayerCard}
      emptyState={<FollowsEmptyFollowedCard onPress={onPressAdd} label={labels.addToFavorites} />}
    />
  );
}
