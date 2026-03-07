import { memo, useEffect, useMemo, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  type ImageResizeMode,
  type ImageStyle,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { buildApiSportsPlayerPhoto, normalizeFollowDiscoveryPlayerId } from '@app-core';
import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import { AppImage } from '@ui/shared/media/AppImage';
import type { ThemeColors } from '@ui/shared/theme/theme';

type DiscoveryEntityAvatarProps = {
  kind: 'team' | 'player';
  entityId: string;
  imageUrl: string;
  name: string;
  resizeMode?: ImageResizeMode;
  containerStyle?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
  fallbackTextStyle?: StyleProp<TextStyle>;
};

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    fallbackText: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '800',
    },
  });
}

function buildAvatarFallbackLabel(name: string): string {
  const fallback = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part.charAt(0).toUpperCase())
    .join('');

  return fallback || '?';
}

export const DiscoveryEntityAvatar = memo(function DiscoveryEntityAvatar({
  kind,
  entityId,
  imageUrl,
  name,
  resizeMode = 'cover',
  containerStyle,
  imageStyle,
  fallbackTextStyle,
}: DiscoveryEntityAvatarProps) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const normalizedEntityId = useMemo(
    () =>
      kind === 'player'
        ? normalizeFollowDiscoveryPlayerId(entityId)
        : String(entityId).trim(),
    [entityId, kind],
  );
  const resolvedImageUrl = useMemo(() => {
    const trimmedImageUrl = imageUrl.trim();

    if (kind !== 'player') {
      return trimmedImageUrl;
    }

    const canonicalImageUrl = buildApiSportsPlayerPhoto(normalizedEntityId);
    return canonicalImageUrl || trimmedImageUrl;
  }, [imageUrl, kind, normalizedEntityId]);
  const [hasImageError, setHasImageError] = useState(resolvedImageUrl.length === 0);
  const fallbackLabel = useMemo(() => buildAvatarFallbackLabel(name), [name]);

  useEffect(() => {
    setHasImageError(resolvedImageUrl.length === 0);
  }, [resolvedImageUrl]);

  return (
    <View style={[styles.container, containerStyle]}>
      {hasImageError ? (
        <Text style={[styles.fallbackText, fallbackTextStyle]}>{fallbackLabel}</Text>
      ) : (
        <AppImage
          key={`${kind}|${normalizedEntityId}|${resolvedImageUrl}`}
          source={{ uri: resolvedImageUrl }}
          style={imageStyle}
          resizeMode={resizeMode}
          onError={() => {
            setHasImageError(true);
          }}
        />
      )}
    </View>
  );
});
