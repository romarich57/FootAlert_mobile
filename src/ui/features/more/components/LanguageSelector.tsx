import type { AppLanguage } from '@/shared/types/preferences.types';
import { LANGUAGE_SELECTOR_OPTIONS } from '@ui/features/more/components/languageSelector.constants';
import { SettingsSelectionModal } from '@ui/features/more/components/SettingsSelectionModal';

type LanguageSelectorProps = {
  visible: boolean;
  title: string;
  selectedValue: AppLanguage;
  onSelect: (value: AppLanguage) => void;
  onClose: () => void;
};

export function LanguageSelector({
  visible,
  title,
  selectedValue,
  onSelect,
  onClose,
}: LanguageSelectorProps) {
  return (
    <SettingsSelectionModal
      visible={visible}
      title={title}
      options={LANGUAGE_SELECTOR_OPTIONS}
      selectedValue={selectedValue}
      onSelect={onSelect}
      onClose={onClose}
    />
  );
}
