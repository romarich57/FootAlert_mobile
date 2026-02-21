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
  if (selectedTab === 'teams') {
    return (
      <FollowedCarousel
        items={teamCards}
        keyExtractor={item => item.teamId}
        renderItem={item => (
          <FollowedTeamCard
            card={item}
            unfollowLabel={labels.unfollow}
            followLabel={labels.follow}
            onUnfollow={onUnfollowTeam}
            onPressTeam={onPressTeam}
            noNextMatchLabel={labels.noNextMatch}
            isEditMode={isEditMode}
          />
        )}
        emptyState={<FollowsEmptyFollowedCard onPress={onPressAdd} label={labels.addToFavorites} />}
      />
    );
  }

  return (
    <FollowedCarousel
      items={playerCards}
      keyExtractor={item => item.playerId}
      renderItem={item => (
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
      )}
      emptyState={<FollowsEmptyFollowedCard onPress={onPressAdd} label={labels.addToFavorites} />}
    />
  );
}
