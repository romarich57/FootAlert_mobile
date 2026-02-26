import { useCallback } from 'react';
import { FollowedCarousel, FollowedPlayerCard, FollowedTeamCard, FollowsEmptyFollowedCard } from '@ui/features/follows/components';
import type { FollowEntityTab, FollowedPlayerCard as FollowedPlayerCardType, FollowedTeamCard as FollowedTeamCardType } from '@ui/features/follows/types/follows.types';

type FollowAvailabilityStatus = {
  disabled: boolean;
  reason?: 'checking' | 'missing';
  isCheckingAvailability: boolean;
};

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
  getTeamAvailabilityStatus: (teamId: string) => FollowAvailabilityStatus | undefined;
  getPlayerAvailabilityStatus: (playerId: string) => FollowAvailabilityStatus | undefined;
  labels: {
    addToFavorites: string;
    follow: string;
    unfollow: string;
    noNextMatch: string;
    goals: string;
    assists: string;
    checkingAvailability: string;
    noData: string;
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
  getTeamAvailabilityStatus,
  getPlayerAvailabilityStatus,
  labels,
}: FollowsFollowedSectionProps) {
  const renderTeamCard = useCallback(
    (item: FollowedTeamCardType) => {
      const availabilityStatus = getTeamAvailabilityStatus(item.teamId);

      return (
        <FollowedTeamCard
          card={item}
          unfollowLabel={labels.unfollow}
          followLabel={labels.follow}
          onUnfollow={onUnfollowTeam}
          onPressTeam={onPressTeam}
          noNextMatchLabel={labels.noNextMatch}
          isEditMode={isEditMode}
          disabled={availabilityStatus?.disabled}
          isCheckingAvailability={availabilityStatus?.isCheckingAvailability}
          disabledReason={
            availabilityStatus?.reason === 'checking'
              ? labels.checkingAvailability
              : availabilityStatus?.reason === 'missing'
                ? labels.noData
                : undefined
          }
        />
      );
    },
    [
      getTeamAvailabilityStatus,
      isEditMode,
      labels.checkingAvailability,
      labels.follow,
      labels.noData,
      labels.noNextMatch,
      labels.unfollow,
      onPressTeam,
      onUnfollowTeam,
    ],
  );

  const renderPlayerCard = useCallback(
    (item: FollowedPlayerCardType) => {
      const availabilityStatus = getPlayerAvailabilityStatus(item.playerId);

      return (
        <FollowedPlayerCard
          card={item}
          followLabel={labels.follow}
          unfollowLabel={labels.unfollow}
          onUnfollow={onUnfollowPlayer}
          onPressPlayer={onPressPlayer}
          goalsLabel={labels.goals}
          assistsLabel={labels.assists}
          isEditMode={isEditMode}
          disabled={availabilityStatus?.disabled}
          isCheckingAvailability={availabilityStatus?.isCheckingAvailability}
          disabledReason={
            availabilityStatus?.reason === 'checking'
              ? labels.checkingAvailability
              : availabilityStatus?.reason === 'missing'
                ? labels.noData
                : undefined
          }
        />
      );
    },
    [
      getPlayerAvailabilityStatus,
      isEditMode,
      labels.assists,
      labels.checkingAvailability,
      labels.follow,
      labels.goals,
      labels.noData,
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
