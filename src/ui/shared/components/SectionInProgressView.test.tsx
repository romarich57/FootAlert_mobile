import React from 'react';
import { screen } from '@testing-library/react-native';

import { SectionInProgressView } from '@ui/shared/components/SectionInProgressView';
import i18n from '@ui/shared/i18n';
import { renderWithAppProviders } from '@ui/shared/testing/renderWithAppProviders';
import '@ui/shared/i18n';

describe('SectionInProgressView', () => {
  it('renders localized fallback content when custom props are not provided', () => {
    renderWithAppProviders(<SectionInProgressView />);

    expect(screen.getByTestId('section-in-progress-title').props.children).toBe(
      i18n.t('placeholders.inProgress'),
    );
    expect(screen.getByTestId('section-in-progress-subtitle').props.children).toBe(
      i18n.t('placeholders.inProgressSubtitle'),
    );
  });

  it('renders custom content and custom test ids', () => {
    renderWithAppProviders(
      <SectionInProgressView
        title="Feature pending"
        subtitle="Coming soon"
        testID="pending-view"
        titleTestID="pending-title"
        subtitleTestID="pending-subtitle"
      />,
    );

    expect(screen.getByTestId('pending-view')).toBeTruthy();
    expect(screen.getByTestId('pending-title').props.children).toBe('Feature pending');
    expect(screen.getByTestId('pending-subtitle').props.children).toBe('Coming soon');
  });

  it('uses a deterministic accessibility label', () => {
    renderWithAppProviders(<SectionInProgressView />);

    expect(screen.getByTestId('section-in-progress-view').props.accessibilityLabel).toBe(
      `${i18n.t('placeholders.inProgress')}. ${i18n.t('placeholders.inProgressSubtitle')}`,
    );
  });
});
