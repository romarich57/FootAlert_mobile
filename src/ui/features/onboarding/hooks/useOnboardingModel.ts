import { useCallback, useState } from 'react';
import { useSharedValue, withSpring } from 'react-native-reanimated';

import { markOnboardingCompleted } from '@data/storage/onboardingStorage';
import type { OnboardingStep, OnboardingTab } from '@ui/features/onboarding/types/onboarding.types';

const STEPS: OnboardingStep[] = ['teams', 'competitions', 'players'];
const STEP_COUNT = STEPS.length;

type UseOnboardingModelReturn = {
  currentStepIndex: number;
  currentStep: OnboardingStep;
  isLastStep: boolean;
  stepCount: number;
  selectedTab: OnboardingTab;
  setSelectedTab: (tab: OnboardingTab) => void;
  slideX: ReturnType<typeof useSharedValue<number>>;
  handleContinue: (onDone: () => void) => Promise<void>;
  handleSkip: (onDone: () => void) => Promise<void>;
};

export function useOnboardingModel(): UseOnboardingModelReturn {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [selectedTab, setSelectedTab] = useState<OnboardingTab>('trending');
  const slideX = useSharedValue(0);

  const currentStep = STEPS[currentStepIndex] ?? 'teams';
  const isLastStep = currentStepIndex === STEP_COUNT - 1;

  const advance = useCallback(
    async (onDone: () => void) => {
      if (isLastStep) {
        await markOnboardingCompleted();
        onDone();
        return;
      }

      // Slide vers la gauche (sortie de l'écran courant)
      const nextIndex = currentStepIndex + 1;
      slideX.value = withSpring(-400, { damping: 20, stiffness: 100 }, () => {
        // La transition est gérée via le parent
      });

      setCurrentStepIndex(nextIndex);
      setSelectedTab('trending');
      slideX.value = 400;
      slideX.value = withSpring(0, { damping: 20, stiffness: 100 });
    },
    [currentStepIndex, isLastStep, slideX],
  );

  const handleContinue = useCallback(
    async (onDone: () => void) => {
      await advance(onDone);
    },
    [advance],
  );

  const handleSkip = useCallback(
    async (onDone: () => void) => {
      await advance(onDone);
    },
    [advance],
  );

  return {
    currentStepIndex,
    currentStep,
    isLastStep,
    stepCount: STEP_COUNT,
    selectedTab,
    setSelectedTab,
    slideX,
    handleContinue,
    handleSkip,
  };
}
