import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';

import { useFollowsActions } from '@ui/features/follows/hooks/useFollowsActions';
import { useOnboardingModel } from '@ui/features/onboarding/hooks/useOnboardingModel';
import { OnboardingScreen } from '@ui/features/onboarding/screens/OnboardingScreen';
import i18n from '@ui/shared/i18n';
import { renderWithAppProviders } from '@ui/shared/testing/renderWithAppProviders';

jest.mock('@ui/features/onboarding/hooks/useOnboardingModel');
jest.mock('@ui/features/follows/hooks/useFollowsActions');
jest.mock('@ui/features/onboarding/components/OnboardingStep', () => {
  const ReactLib = require('react');
  const { Text, View } = require('react-native');

  return {
    OnboardingStep: ({
      step,
      selectedTab,
    }: {
      step: string;
      selectedTab: string;
    }) =>
      ReactLib.createElement(
        View,
        { testID: `onboarding-step-${step}-${selectedTab}` },
        ReactLib.createElement(Text, null, `${step}-${selectedTab}`),
      ),
  };
});

const mockedUseOnboardingModel = jest.mocked(useOnboardingModel);
const mockedUseFollowsActions = jest.mocked(useFollowsActions);

const replaceMock = jest.fn();

function createOnboardingModel(
  overrides: Partial<ReturnType<typeof useOnboardingModel>> = {},
): ReturnType<typeof useOnboardingModel> {
  return {
    currentStepIndex: 0,
    currentStep: 'teams',
    isLastStep: false,
    stepCount: 3,
    selectedTab: 'trending',
    setSelectedTab: jest.fn(),
    slideX: { value: 0 } as ReturnType<typeof useOnboardingModel>['slideX'],
    handleContinue: jest.fn(async () => undefined),
    handleSkip: jest.fn(async () => undefined),
    ...overrides,
  };
}

function renderScreen() {
  return renderWithAppProviders(
    <OnboardingScreen
      navigation={{
        replace: replaceMock,
      } as never}
      route={{ key: 'Onboarding-key', name: 'Onboarding' } as never}
    />,
  );
}

describe('OnboardingScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockedUseFollowsActions.mockReturnValue({
      followedTeamIds: ['529'],
      followedLeagueIds: ['61'],
      followedPlayerIds: ['154'],
      toggleTeamFollow: jest.fn(async () => ({ ids: ['529'], changed: true })),
      toggleLeagueFollow: jest.fn(async () => ['61']),
      togglePlayerFollow: jest.fn(async () => ({ ids: ['154'], changed: true })),
    } as never);
    mockedUseOnboardingModel.mockReturnValue(createOnboardingModel());
  });

  it('renders the current onboarding step copy and content', () => {
    renderScreen();

    expect(screen.getByText(i18n.t('onboarding.teams.title'))).toBeTruthy();
    expect(screen.getByText(i18n.t('onboarding.teams.subtitle'))).toBeTruthy();
    expect(screen.getByTestId('onboarding-step-teams-trending')).toBeTruthy();
  });

  it('delegates skip to the model and navigates to matches when the callback completes', async () => {
    const handleSkip = jest.fn(async (onDone: () => void) => {
      onDone();
    });
    mockedUseOnboardingModel.mockReturnValue(
      createOnboardingModel({
        handleSkip,
      }),
    );

    renderScreen();

    fireEvent.press(screen.getByText(i18n.t('onboarding.skip')));

    expect(handleSkip).toHaveBeenCalledTimes(1);
    expect(replaceMock).toHaveBeenCalledWith('MainTabs', { screen: 'Matches' });
  });

  it('uses the finish CTA on the last step and navigates to matches after completion', () => {
    const handleContinue = jest.fn(async (onDone: () => void) => {
      onDone();
    });
    mockedUseOnboardingModel.mockReturnValue(
      createOnboardingModel({
        currentStepIndex: 2,
        currentStep: 'players',
        isLastStep: true,
        handleContinue,
      }),
    );

    renderScreen();

    const finishButton = screen.getByText(i18n.t('onboarding.finish'));
    expect(screen.getByText(i18n.t('onboarding.players.title'))).toBeTruthy();

    fireEvent.press(finishButton);

    expect(handleContinue).toHaveBeenCalledTimes(1);
    expect(replaceMock).toHaveBeenCalledWith('MainTabs', { screen: 'Matches' });
  });
});
