import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react-native';

import { MoreScreen } from '@ui/features/more/screens/MoreScreen';
import { useMoreSettings } from '@ui/features/more/hooks/useMoreSettings';
import i18n from '@ui/shared/i18n';

jest.mock('@ui/features/more/hooks/useMoreSettings');
jest.mock('@ui/app/providers/ThemeProvider', () => ({
  useAppTheme: () => ({
    preference: 'dark',
    mode: 'dark',
    colors: {
      background: '#000',
      surface: '#111',
      surfaceElevated: '#222',
      border: '#333',
      text: '#fff',
      textMuted: '#aaa',
      primary: '#14E15C',
      primaryContrast: '#000',
      success: '#14E15C',
      warning: '#F59E0B',
      danger: '#F87171',
      overlay: 'rgba(0,0,0,0.7)',
      skeleton: '#444',
      cardBackground: '#111',
      cardBorder: '#333',
      chipBackground: '#222',
      chipBorder: '#444',
      adGradientStart: '#111',
      adGradientEnd: '#000',
    },
    navigationTheme: {
      dark: true,
      colors: {
        primary: '#14E15C',
        background: '#000',
        card: '#111',
        text: '#fff',
        border: '#333',
        notification: '#14E15C',
      },
      fonts: {},
    },
    statusBarStyle: 'light-content',
  }),
}));

const mockedUseMoreSettings = jest.mocked(useMoreSettings);
const openSystemNotificationSettingsMock = jest.fn(async () => undefined);
const handleThemeChangeMock = jest.fn(async () => undefined);
const handleLanguageChangeMock = jest.fn(async () => undefined);
const handleCurrencyChangeMock = jest.fn(async () => undefined);
const handleMeasurementChangeMock = jest.fn(async () => undefined);
const handleNotificationsChangeMock = jest.fn(async () => undefined);
const setPermissionDeniedMock = jest.fn();
const openPrivacyPolicyMock = jest.fn(async () => true);
const openSupportMock = jest.fn(async () => true);
const openFollowUsMock = jest.fn(async () => true);
const openRateAppMock = jest.fn(async () => true);

function createMoreSettingsMock(
  overrides: Partial<ReturnType<typeof useMoreSettings>> = {},
): ReturnType<typeof useMoreSettings> {
  return {
    preferences: {
      theme: 'system',
      language: 'fr',
      currencyCode: 'EUR',
      measurementSystem: 'metric',
      notificationsEnabled: true,
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    isHydrated: true,
    appVersion: '0.0.1 (1)',
    currencyCatalog: [
      { code: 'EUR', name: 'Euro', symbol: '€', fractionDigits: 2 },
      { code: 'USD', name: 'Dollar US', symbol: '$', fractionDigits: 2 },
    ],
    currentCurrency: {
      code: 'EUR',
      name: 'Euro',
      symbol: '€',
      fractionDigits: 2,
    },
    themeOptions: [
      { value: 'system', label: 'system' },
      { value: 'light', label: 'light' },
      { value: 'dark', label: 'dark' },
    ],
    languageOptions: [
      { value: 'fr', label: 'fr' },
      { value: 'en', label: 'en' },
    ],
    measurementOptions: [
      { value: 'metric', label: 'metric' },
      { value: 'imperial', label: 'imperial' },
    ],
    isUpdatingNotifications: false,
    permissionDenied: false,
    hasPrivacyPolicyUrl: true,
    hasSupportUrl: true,
    hasFollowUsUrl: true,
    hasRateAppUrl: true,
    setPermissionDenied: setPermissionDeniedMock,
    handleThemeChange: handleThemeChangeMock,
    handleLanguageChange: handleLanguageChangeMock,
    handleCurrencyChange: handleCurrencyChangeMock,
    handleMeasurementChange: handleMeasurementChangeMock,
    handleNotificationsChange: handleNotificationsChangeMock,
    openPrivacyPolicy: openPrivacyPolicyMock,
    openSupport: openSupportMock,
    openFollowUs: openFollowUsMock,
    openRateApp: openRateAppMock,
    openSystemNotificationSettings: openSystemNotificationSettingsMock,
    ...overrides,
  };
}

function renderScreen() {
  return render(<MoreScreen />);
}

describe('MoreScreen', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    mockedUseMoreSettings.mockReturnValue(createMoreSettingsMock());
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    cleanup();
    jest.useRealTimers();
  });

  it('renders settings sections and rows', () => {
    renderScreen();

    expect(screen.getByText(i18n.t('more.sections.preferences'))).toBeTruthy();
    expect(screen.getByText(i18n.t('more.sections.information'))).toBeTruthy();
    expect(screen.getByText(i18n.t('more.rows.theme'))).toBeTruthy();
    expect(screen.getByText(i18n.t('more.rows.language'))).toBeTruthy();
    expect(screen.getByText(i18n.t('more.rows.currency'))).toBeTruthy();
    expect(screen.getByText(i18n.t('more.rows.appVersion'))).toBeTruthy();
  });

  it('opens theme modal and selects a value', () => {
    renderScreen();

    fireEvent.press(screen.getByLabelText(i18n.t('more.rows.theme')));
    fireEvent.press(screen.getByText(i18n.t('more.values.theme.light')));

    expect(handleThemeChangeMock).toHaveBeenCalledWith('light');
  });

  it('opens language modal and selects a value', () => {
    renderScreen();

    fireEvent.press(screen.getByLabelText(i18n.t('more.rows.language')));
    fireEvent.press(screen.getByText(i18n.t('more.values.language.en')));

    expect(handleLanguageChangeMock).toHaveBeenCalledWith('en');
  });

  it('opens measurement modal and selects a value', () => {
    renderScreen();

    fireEvent.press(screen.getByLabelText(i18n.t('more.rows.measurement')));
    fireEvent.press(screen.getByText(i18n.t('more.values.measurement.imperial')));

    expect(handleMeasurementChangeMock).toHaveBeenCalledWith('imperial');
  });

  it('opens currency modal and selects a currency', () => {
    renderScreen();

    fireEvent.press(screen.getByLabelText(i18n.t('more.rows.currency')));
    fireEvent.press(screen.getByText('USD'));

    expect(handleCurrencyChangeMock).toHaveBeenCalledWith('USD');
  });

  it('toggles notifications switch', () => {
    renderScreen();

    fireEvent(screen.getByRole('switch'), 'valueChange', false);
    expect(handleNotificationsChangeMock).toHaveBeenCalledWith(false);
  });

  it('renders information rows', () => {
    renderScreen();

    expect(screen.getByText(i18n.t('more.rows.followUs'))).toBeTruthy();
    expect(screen.getByText(i18n.t('more.rows.tipsSupport'))).toBeTruthy();
    expect(screen.getByText(i18n.t('more.rows.privacyPolicy'))).toBeTruthy();
    expect(screen.getByText(i18n.t('more.rows.rateApp'))).toBeTruthy();
  });

  it('opens legal and social links when rows are pressed', () => {
    renderScreen();

    fireEvent.press(screen.getByLabelText(i18n.t('more.rows.followUs')));
    fireEvent.press(screen.getByLabelText(i18n.t('more.rows.tipsSupport')));
    fireEvent.press(screen.getByLabelText(i18n.t('more.rows.privacyPolicy')));
    fireEvent.press(screen.getByLabelText(i18n.t('more.rows.rateApp')));

    expect(openFollowUsMock).toHaveBeenCalled();
    expect(openSupportMock).toHaveBeenCalled();
    expect(openPrivacyPolicyMock).toHaveBeenCalled();
    expect(openRateAppMock).toHaveBeenCalled();
  });

  it('disables legal/social rows when URLs are missing', () => {
    mockedUseMoreSettings.mockReturnValueOnce(
      createMoreSettingsMock({
        hasFollowUsUrl: false,
        hasSupportUrl: false,
        hasPrivacyPolicyUrl: false,
        hasRateAppUrl: false,
      }),
    );

    renderScreen();

    expect(screen.queryByLabelText(i18n.t('more.rows.followUs'))).toBeNull();
    expect(screen.queryByLabelText(i18n.t('more.rows.tipsSupport'))).toBeNull();
    expect(screen.queryByLabelText(i18n.t('more.rows.privacyPolicy'))).toBeNull();
    expect(screen.queryByLabelText(i18n.t('more.rows.rateApp'))).toBeNull();
  });

  it('shows app version value', () => {
    renderScreen();

    expect(screen.getByText('0.0.1 (1)')).toBeTruthy();
  });

  it('renders loading state when preferences are not hydrated', () => {
    mockedUseMoreSettings.mockReturnValueOnce(
      createMoreSettingsMock({ isHydrated: false }),
    );

    renderScreen();
    expect(screen.getByText(i18n.t('more.states.loading'))).toBeTruthy();
  });

  it('shows permission warning and opens settings action', () => {
    mockedUseMoreSettings.mockReturnValueOnce(
      createMoreSettingsMock({ permissionDenied: true }),
    );

    renderScreen();

    fireEvent.press(screen.getByLabelText(i18n.t('more.notifications.openSettings')));
    expect(setPermissionDeniedMock).toHaveBeenCalledWith(false);
    expect(openSystemNotificationSettingsMock).toHaveBeenCalled();
  });
});
