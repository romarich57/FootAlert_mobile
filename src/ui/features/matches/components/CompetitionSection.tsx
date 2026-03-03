import { useMemo } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import { MatchCard } from '@ui/features/matches/components/MatchCard';
import type {
  CompetitionSection as CompetitionSectionType,
  MatchItem,
} from '@ui/features/matches/types/matches.types';
import type { ThemeColors } from '@ui/shared/theme/theme';

type CompetitionSectionProps = {
  section: CompetitionSectionType;
  collapsed: boolean;
  onToggle: (sectionId: string) => void;
  onPressMatch: (match: MatchItem) => void;
  onToggleMatchFollow: (match: MatchItem) => void;
  isMatchFollowed: (fixtureId: string) => boolean;
  onPressNotification: (match: MatchItem) => void;
  onPressHomeTeam?: (teamId: string) => void;
  onPressAwayTeam?: (teamId: string) => void;
};

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      gap: 12,
      marginBottom: 16,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
      paddingVertical: 12,
      paddingHorizontal: 16,
      backgroundColor: colors.surfaceElevated,
      borderRadius: 16,
    },
    leftHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      flex: 1,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      flexShrink: 1,
    },
    logo: {
      width: 24,
      height: 24,
      borderRadius: 6,
      backgroundColor: colors.surface,
    },
    title: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    list: {
      gap: 16,
      marginTop: 4,
    },
    emptyText: {
      color: colors.textMuted,
      fontSize: 14,
      fontWeight: '500',
      paddingVertical: 20,
      textAlign: 'center',
      fontStyle: 'italic',
    },
    actionsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    actionButton: {
      width: 32,
      height: 32,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface,
    },
  });
}

export function CompetitionSection({
  section,
  collapsed,
  onToggle,
  onPressMatch,
  onToggleMatchFollow,
  isMatchFollowed,
  onPressNotification,
  onPressHomeTeam,
  onPressAwayTeam,
}: CompetitionSectionProps) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const translatedCountry = section.country
    ? t(`countries.${section.country}`, { defaultValue: section.country })
    : '';

  const displayTitle =
    translatedCountry && !section.isFollowSection ? `${translatedCountry} - ${section.name}` : section.name;

  return (
    <View style={styles.container}>
      <Pressable onPress={() => onToggle(section.id)} style={styles.header}>
        <View style={styles.leftHeader}>
          {section.logo ? (
            <Image source={{ uri: section.logo }} style={styles.logo} />
          ) : (
            <View style={styles.logo} />
          )}
          <View style={styles.titleRow}>
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
              style={styles.title}
            >
              {displayTitle}
            </Text>
          </View>
        </View>
        <View style={styles.actionsRow}>
          <View style={styles.actionButton}>
            <MaterialCommunityIcons
              name={collapsed ? 'chevron-down' : 'chevron-up'}
              size={18}
              color={colors.textMuted}
            />
          </View>
        </View>
      </Pressable>

      {collapsed ? null : (
        <View style={styles.list}>
          {section.matches.length > 0 ? (
            section.matches.map(match => (
              <MatchCard
                key={match.fixtureId}
                match={match}
                onPress={onPressMatch}
                isFollowed={isMatchFollowed(match.fixtureId)}
                onToggleFollow={onToggleMatchFollow}
                onPressNotification={onPressNotification}
                onPressHomeTeam={onPressHomeTeam}
                onPressAwayTeam={onPressAwayTeam}
              />
            ))
          ) : (
            <Text style={styles.emptyText}>{t('matches.followsEmpty')}</Text>
          )}
        </View>
      )}
    </View>
  );
}
