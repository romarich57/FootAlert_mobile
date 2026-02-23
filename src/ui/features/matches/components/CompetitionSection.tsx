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
  onPressNotification: (match: MatchItem) => void;
  onPressHomeTeam?: (teamId: string) => void;
  onPressAwayTeam?: (teamId: string) => void;
};

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      gap: 12,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
    },
    leftHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      flex: 1,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      flexShrink: 1,
      flexWrap: 'wrap',
    },
    logo: {
      width: 26,
      height: 26,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    title: {
      color: colors.text,
      fontSize: 17,
      fontWeight: '800',
      textTransform: 'uppercase',
      maxWidth: '100%',
    },
    topBadge: {
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.primary,
      backgroundColor: 'rgba(21,248,106,0.14)',
      paddingHorizontal: 8,
      paddingVertical: 2,
    },
    topBadgeText: {
      color: colors.primary,
      fontSize: 10,
      fontWeight: '900',
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
    count: {
      color: colors.textMuted,
      fontSize: 13,
      fontWeight: '700',
    },
    list: {
      gap: 12,
    },
    emptyText: {
      color: colors.textMuted,
      fontSize: 14,
      fontWeight: '600',
      paddingVertical: 8,
      paddingHorizontal: 4,
    },
  });
}

export function CompetitionSection({
  section,
  collapsed,
  onToggle,
  onPressMatch,
  onPressNotification,
  onPressHomeTeam,
  onPressAwayTeam,
}: CompetitionSectionProps) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(colors), [colors]);

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
            <Text numberOfLines={1} style={styles.title}>
              {section.name}
            </Text>
            {section.isTopCompetition ? (
              <View style={styles.topBadge}>
                <Text style={styles.topBadgeText}>{t('matches.topCompetitionBadge')}</Text>
              </View>
            ) : null}
            <Text style={styles.count}>{section.matches.length}</Text>
          </View>
        </View>
        <MaterialCommunityIcons
          name={collapsed ? 'chevron-down' : 'chevron-up'}
          size={20}
          color={colors.textMuted}
        />
      </Pressable>

      {collapsed ? null : (
        <View style={styles.list}>
          {section.matches.length > 0 ? (
            section.matches.map(match => (
              <MatchCard
                key={match.fixtureId}
                match={match}
                onPress={onPressMatch}
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
