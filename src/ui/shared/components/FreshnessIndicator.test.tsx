import React from 'react';
import { act, screen } from '@testing-library/react-native';

import { FreshnessIndicator } from '@ui/shared/components/FreshnessIndicator';
import i18n from '@ui/shared/i18n';
import { renderWithAppProviders } from '@ui/shared/testing/renderWithAppProviders';
import '@ui/shared/i18n';

describe('FreshnessIndicator', () => {
  const now = new Date('2026-03-10T18:00:00.000Z').getTime();
  const lastUpdatedAt = new Date('2026-03-10T17:55:00.000Z').toISOString();

  afterEach(async () => {
    jest.restoreAllMocks();
    await act(async () => {
      await i18n.changeLanguage('en');
    });
  });

  it('renders a freshness label when Intl.RelativeTimeFormat is available', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(now);

    await act(async () => {
      await i18n.changeLanguage('fr');
    });

    renderWithAppProviders(<FreshnessIndicator lastUpdatedAt={lastUpdatedAt} />);

    expect(screen.getByText(/^Mis a jour /)).toBeTruthy();
  });

  it('falls back to localized formatting when Intl.RelativeTimeFormat is unavailable', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(now);

    await act(async () => {
      await i18n.changeLanguage('fr');
    });

    const relativeTimeFormatDescriptor = Object.getOwnPropertyDescriptor(Intl, 'RelativeTimeFormat');
    Object.defineProperty(Intl, 'RelativeTimeFormat', {
      value: undefined,
      configurable: true,
      writable: true,
    });

    try {
      renderWithAppProviders(<FreshnessIndicator lastUpdatedAt={lastUpdatedAt} />);

      expect(screen.getByText('Mis a jour il y a 5 min')).toBeTruthy();
    } finally {
      if (relativeTimeFormatDescriptor) {
        Object.defineProperty(Intl, 'RelativeTimeFormat', relativeTimeFormatDescriptor);
      } else {
        Object.defineProperty(Intl, 'RelativeTimeFormat', {
          value: undefined,
          configurable: true,
          writable: true,
        });
      }
    }
  });

  it('does not render when the freshness state resolves to now', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(now);

    await act(async () => {
      await i18n.changeLanguage('fr');
    });

    const { queryByText } = renderWithAppProviders(
      <FreshnessIndicator lastUpdatedAt={new Date(now).toISOString()} />,
    );

    expect(queryByText(/^Mis a jour /)).toBeNull();
    expect(queryByText("Mis a jour a l'instant")).toBeNull();
  });
});
