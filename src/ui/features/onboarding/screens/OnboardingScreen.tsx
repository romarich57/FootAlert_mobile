import { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import type { ThemeColors } from '@ui/shared/theme/theme';
import type { OnboardingEntityCardData } from '@ui/features/onboarding/components/OnboardingEntityCard';
import type { RootStackParamList } from '@ui/app/navigation/types';
import { useFollowsActions } from '@ui/features/follows/hooks/useFollowsActions';
import { StepIndicator } from '@ui/features/onboarding/components/StepIndicator';
import { OnboardingStep } from '@ui/features/onboarding/components/OnboardingStep';
import { useOnboardingModel } from '@ui/features/onboarding/hooks/useOnboardingModel';
import { MIN_TOUCH_TARGET } from '@ui/shared/theme/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Onboarding'>;

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      paddingHorizontal: 24,
      paddingTop: 24,
      paddingBottom: 16,
      backgroundColor: colors.surface,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    indicator: {
      marginBottom: 16,
    },
    title: {
      fontSize: 22,
      fontWeight: '800',
      color: colors.text,
      marginBottom: 6,
    },
    subtitle: {
      fontSize: 14,
      color: colors.textMuted,
      lineHeight: 20,
    },
    content: {
      flex: 1,
      overflow: 'hidden',
    },
    bottomBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: colors.surface,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    skipButton: {
      minHeight: MIN_TOUCH_TARGET,
      paddingHorizontal: 16,
      paddingVertical: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    skipText: {
      fontSize: 15,
      color: colors.textMuted,
    },
    continueButton: {
      minHeight: MIN_TOUCH_TARGET,
      paddingHorizontal: 24,
      paddingVertical: 10,
      borderRadius: 20,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    continueText: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.primaryContrast,
    },
  });
}

const STEP_TITLES: Record<string, string> = {
  teams: 'onboarding.teams.title',
  competitions: 'onboarding.competitions.title',
  players: 'onboarding.players.title',
};

const STEP_SUBTITLES: Record<string, string> = {
  teams: 'onboarding.teams.subtitle',
  competitions: 'onboarding.competitions.subtitle',
  players: 'onboarding.players.subtitle',
};

export function OnboardingScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const {
    currentStepIndex,
    currentStep,
    isLastStep,
    stepCount,
    selectedTab,
    setSelectedTab,
    slideX,
    handleContinue,
    handleSkip,
  } = useOnboardingModel();

  const { followedTeamIds, followedLeagueIds, followedPlayerIds, toggleTeamFollow, toggleLeagueFollow, togglePlayerFollow } =
    useFollowsActions();

  const slideStyle = useAnimatedStyle(() => ({
    flex: 1,
    transform: [{ translateX: slideX.value }],
  }));

  function getFollowedIds(): string[] {
    if (currentStep === 'teams') return followedTeamIds;
    if (currentStep === 'competitions') return followedLeagueIds;
    return followedPlayerIds;
  }

  function handleToggleFollow(item: OnboardingEntityCardData, source: 'trending' | 'search') {
    const followSource = source === 'trending' ? 'onboarding_trending' : 'onboarding_search';

    if (currentStep === 'teams') {
      toggleTeamFollow(item.id, {
        source: followSource,
        snapshot: {
          teamName: item.name,
          teamLogo: item.logo,
          country: item.country ?? item.subtitle,
        },
      }).catch(() => undefined);
    } else if (currentStep === 'competitions') {
      toggleLeagueFollow(item.id).catch(() => undefined);
    } else {
      togglePlayerFollow(item.id, {
        source: followSource,
        snapshot: {
          playerName: item.name,
          playerPhoto: item.logo,
          position: item.position ?? null,
          teamName: item.teamName ?? item.subtitle,
          teamLogo: item.teamLogo ?? null,
          leagueName: item.leagueName ?? null,
        },
      }).catch(() => undefined);
    }
  }

  function navigateToMainTabs() {
    navigation.replace('MainTabs', { screen: 'Matches' });
  }

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top, paddingBottom: insets.bottom },
      ]}
    >
      <View style={styles.header}>
        <View style={styles.indicator}>
          <StepIndicator stepCount={stepCount} currentIndex={currentStepIndex} />
        </View>
        <Text style={styles.title}>{t(STEP_TITLES[currentStep] ?? '')}</Text>
        <Text style={styles.subtitle}>{t(STEP_SUBTITLES[currentStep] ?? '')}</Text>
      </View>

      <View style={styles.content}>
        <Animated.View style={slideStyle}>
          <OnboardingStep
            step={currentStep}
            selectedTab={selectedTab}
            onTabChange={setSelectedTab}
            followedIds={getFollowedIds()}
            onToggleFollow={handleToggleFollow}
          />
        </Animated.View>
      </View>

      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.skipButton}
          onPress={() => handleSkip(navigateToMainTabs)}
          accessibilityRole="button"
        >
          <Text style={styles.skipText}>{t('onboarding.skip')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.continueButton}
          onPress={() => handleContinue(navigateToMainTabs)}
          accessibilityRole="button"
        >
          <Text style={styles.continueText}>
            {isLastStep ? t('onboarding.finish') : t('onboarding.continue')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
