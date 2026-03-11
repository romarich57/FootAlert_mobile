import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';

import { LanguageSelector } from '@ui/features/more/components/LanguageSelector';
import { LANGUAGE_SELECTOR_OPTIONS } from '@ui/features/more/components/languageSelector.constants';
import { renderWithAppProviders } from '@ui/shared/testing/renderWithAppProviders';

describe('LanguageSelector', () => {
  it('renders only released native language labels', () => {
    renderWithAppProviders(
      <LanguageSelector
        visible
        title='Language'
        selectedValue='fr'
        onSelect={() => undefined}
        onClose={() => undefined}
      />,
    );

    expect(LANGUAGE_SELECTOR_OPTIONS).toHaveLength(2);
    LANGUAGE_SELECTOR_OPTIONS.forEach(option => {
      expect(screen.getByText(option.label)).toBeTruthy();
    });
    expect(screen.queryByText('Deutsch')).toBeNull();
  });

  it('calls onSelect with the chosen language', () => {
    const onSelect = jest.fn();

    renderWithAppProviders(
      <LanguageSelector
        visible
        title='Language'
        selectedValue='fr'
        onSelect={onSelect}
        onClose={() => undefined}
      />,
    );

    fireEvent.press(screen.getByText('English'));

    expect(onSelect).toHaveBeenCalledWith('en');
  });
});
