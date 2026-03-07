import { memo, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { FollowToggleButton } from '@ui/features/follows/components/FollowToggleButton';
import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import { AppImage } from '@ui/shared/media/AppImage';
import type { ThemeColors } from '@ui/shared/theme/theme';

export type OnboardingEntityCardData = {
  id: string;
  name: string;
  logo: string;
  subtitle: string;
  kind?: 'team' | 'competition' | 'player';
  country?: string;
  position?: string;
  teamName?: string;
  teamLogo?: string;
  leagueName?: string;
};

type Props = {
  item: OnboardingEntityCardData;
  isFollowing: boolean;
  onToggleFollow: (item: OnboardingEntityCardData) => void;
};

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      height: 72,
      paddingHorizontal: 16,
      backgroundColor: colors.surface,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    logo: {
      width: 40,
      height: 40,
      borderRadius: 4,
    },
    info: {
      flex: 1,
      marginLeft: 12,
      justifyContent: 'center',
    },
    name: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.text,
    },
    subtitle: {
      fontSize: 13,
      color: colors.textMuted,
      marginTop: 2,
    },
  });
}

export const OnboardingEntityCard = memo(function OnboardingEntityCard({
  item,
  isFollowing,
  onToggleFollow,
}: Props) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      <AppImage
        source={{ uri: item.logo }}
        style={styles.logo}
        resizeMode={item.kind === 'player' ? 'cover' : 'contain'}
      />
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {item.subtitle}
        </Text>
      </View>
      <FollowToggleButton
        isFollowing={isFollowing}
        onPress={() => onToggleFollow(item)}
        followLabel={t('follows.actions.follow')}
        unfollowLabel={t('follows.actions.unfollow')}
        accessibilityLabel={
          isFollowing
            ? t('follows.actions.unfollow')
            : t('follows.actions.follow')
        }
      />
    </View>
  );
});
