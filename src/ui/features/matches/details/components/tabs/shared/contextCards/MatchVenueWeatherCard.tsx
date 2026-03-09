import { Text, View } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import type { TFunction } from 'i18next';

import type { ThemeColors } from '@ui/shared/theme/theme';
import type { MatchPreMatchVenueWeatherPayload } from '@ui/features/matches/types/matches.types';
import type { MatchDetailsTabStyles } from '@ui/features/matches/details/components/tabs/shared/matchDetailsTabStyles';

type MatchVenueWeatherCardProps = {
  styles: MatchDetailsTabStyles;
  colors: ThemeColors;
  t: TFunction;
  locale: string;
  payload: MatchPreMatchVenueWeatherPayload;
};

function formatLocaleNumber(value: number, locale: string): string {
  return new Intl.NumberFormat(locale).format(value);
}

export function MatchVenueWeatherCard({
  styles,
  colors,
  t,
  locale,
  payload,
}: MatchVenueWeatherCardProps) {
  const weatherLabel = payload.weather?.description ?? null;
  const weatherTemp = payload.weather?.temperature;
  const hasCapacity = typeof payload.capacity === 'number';
  const hasSurface = Boolean(payload.surface);
  const hasWeather = typeof weatherTemp === 'number' || Boolean(weatherLabel);
  const weatherText =
    typeof weatherTemp === 'number' && weatherLabel
      ? `${Math.round(weatherTemp)}°C · ${weatherLabel}`
      : typeof weatherTemp === 'number'
        ? `${Math.round(weatherTemp)}°C`
        : (weatherLabel ?? '');

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{t('matchDetails.preMatch.venueWeather.title')}</Text>

      <View style={styles.preMatchGridContainer}>
        <View style={styles.preMatchGridItem}>
          <View style={styles.preMatchGridIconRow}>
            <MaterialCommunityIcons name="stadium-variant" size={18} color={colors.primary} />
            <Text style={styles.preMatchGridLabel}>{t('matchDetails.labels.venue')}</Text>
          </View>
          <Text style={styles.preMatchGridValue} numberOfLines={1}>
            {payload.venueName ?? t('matchDetails.values.unavailable')}
          </Text>
        </View>

        <View style={styles.preMatchGridItem}>
          <View style={styles.preMatchGridIconRow}>
            <MaterialCommunityIcons name="city-variant" size={18} color={colors.primary} />
            <Text style={styles.preMatchGridLabel}>{t('matchDetails.labels.city')}</Text>
          </View>
          <Text style={styles.preMatchGridValue} numberOfLines={1}>
            {payload.venueCity ?? t('matchDetails.values.unavailable')}
          </Text>
        </View>

        {hasCapacity ? (
          <View style={styles.preMatchGridItem}>
            <View style={styles.preMatchGridIconRow}>
              <MaterialCommunityIcons name="account-group" size={18} color={colors.primary} />
              <Text style={styles.preMatchGridLabel}>{t('matchDetails.labels.capacity')}</Text>
            </View>
            <Text style={styles.preMatchGridValue}>{formatLocaleNumber(payload.capacity ?? 0, locale)}</Text>
          </View>
        ) : null}

        {hasSurface ? (
          <View style={styles.preMatchGridItem}>
            <View style={styles.preMatchGridIconRow}>
              <MaterialCommunityIcons name="grass" size={18} color={colors.primary} />
              <Text style={styles.preMatchGridLabel}>{t('matchDetails.labels.surface')}</Text>
            </View>
            <Text style={styles.preMatchGridValue} numberOfLines={1}>{payload.surface}</Text>
          </View>
        ) : null}

        {hasWeather ? (
          <View style={[styles.preMatchGridItem, styles.preMatchGridItemFull]}>
            <View style={styles.preMatchGridIconRow}>
              <MaterialCommunityIcons name="weather-partly-cloudy" size={18} color={colors.primary} />
              <Text style={styles.preMatchGridLabel}>{t('matchDetails.preMatch.venueWeather.title')}</Text>
            </View>
            <Text style={styles.preMatchGridValue}>{weatherText}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}
