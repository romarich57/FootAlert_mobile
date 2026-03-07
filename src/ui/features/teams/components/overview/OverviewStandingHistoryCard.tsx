import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';

import { toDisplayValue } from '@ui/features/teams/utils/teamDisplay';
import { AppImage } from '@ui/shared/media/AppImage';

import {
  buildHistoryDisplayPoints,
  computeHistoryVisualPoints,
  resolveHistoryRankColor,
  toCompactSeasonLabel,
  type HistoryVisualPoint,
} from './overviewSelectors';
import type { TeamOverviewStyles } from './TeamOverviewTab.styles';

type OverviewStandingHistoryCardProps = {
  styles: TeamOverviewStyles;
  t: (key: string) => string;
  historyPoints: Array<{ season: number; rank: number | null }>;
  historyLeague: {
    name: string | null;
    logo: string | null;
  };
};

export function OverviewStandingHistoryCard({
  styles,
  t,
  historyPoints,
  historyLeague,
}: OverviewStandingHistoryCardProps) {
  const [historyChartWidth, setHistoryChartWidth] = useState(0);
  const historyDisplayPoints = useMemo(
    () => buildHistoryDisplayPoints(historyPoints),
    [historyPoints],
  );
  const effectiveChartWidth = historyChartWidth > 0 ? historyChartWidth : Math.max(240, historyPoints.length * 56);
  const historyVisualPoints = useMemo<HistoryVisualPoint[]>(
    () => computeHistoryVisualPoints(historyDisplayPoints, effectiveChartWidth),
    [effectiveChartWidth, historyDisplayPoints],
  );

  return (
    <View style={styles.card}>
      <View style={styles.sectionHeader}>
        <Text numberOfLines={1} style={[styles.cardTitle, styles.historyTitle]}>
          {t('teamDetails.overview.standingHistory')}
        </Text>
        {historyLeague.logo || historyLeague.name ? (
          <View style={styles.historyHeaderRight}>
            <View style={styles.historyLeagueBadge}>
              {historyLeague.logo ? (
                <AppImage source={{ uri: historyLeague.logo }} style={styles.historyLeagueLogo} />
              ) : null}
              <Text numberOfLines={1} style={styles.historyLeagueName}>
                {toDisplayValue(historyLeague.name)}
              </Text>
            </View>
          </View>
        ) : null}
      </View>
      {historyPoints.length > 0 ? (
        <View style={styles.historyChart}>
          <View
            style={styles.historyGraphCanvas}
            onLayout={event => {
              const width = event.nativeEvent.layout.width;
              if (Math.abs(width - historyChartWidth) > 1) {
                setHistoryChartWidth(width);
              }
            }}
          >
            <View style={styles.historyColumns}>
              {historyPoints.map((point, index, array) => (
                <View
                  key={`history-col-${point.season}`}
                  style={[
                    styles.historyColumn,
                    index % 2 === 1 ? styles.historyColumnAlt : null,
                    index === array.length - 1 ? styles.historyColumnCurrent : null,
                    index === array.length - 1 ? styles.historyColumnLast : null,
                  ]}
                />
              ))}
            </View>

            {historyVisualPoints.slice(1).map((point, index) => {
              const previous = historyVisualPoints[index];
              const horizontalWidth = Math.max(2, point.x - previous.x);
              const verticalTop = Math.min(previous.y, point.y);
              const verticalHeight = Math.max(2, Math.abs(point.y - previous.y));
              const hasMissingRank = previous.isMissing || point.isMissing;

              return (
                <View key={`history-connection-${point.season}`}>
                  <View
                    style={[
                      styles.historyConnectionHorizontal,
                      {
                        left: previous.x,
                        top: previous.y,
                        width: horizontalWidth,
                        backgroundColor: hasMissingRank ? 'rgba(148,163,184,0.55)' : 'rgba(114,234,193,0.8)',
                      },
                    ]}
                  />
                  <View
                    style={[
                      styles.historyConnectionVertical,
                      {
                        left: point.x,
                        top: verticalTop,
                        height: verticalHeight,
                        backgroundColor: hasMissingRank ? 'rgba(148,163,184,0.35)' : 'rgba(114,234,193,0.45)',
                      },
                    ]}
                  />
                </View>
              );
            })}

            {historyVisualPoints.map(point => {
              const rankColor = resolveHistoryRankColor(point.rank, point.isLatest);

              return (
                <View
                  key={`history-point-${point.season}`}
                  accessibilityLabel={
                    point.isMissing
                      ? `${toCompactSeasonLabel(point.season)} ${t('teamDetails.overview.rankUnavailable')}`
                      : undefined
                  }
                  style={[
                    styles.historyItem,
                    {
                      left: point.x - 15,
                      top: point.y - 15,
                      backgroundColor: rankColor.fill,
                      borderColor: rankColor.border,
                    },
                  ]}
                >
                  <Text style={[styles.historyItemText, { color: rankColor.text }]}>
                    {point.label}
                  </Text>
                </View>
              );
            })}
          </View>

          <View style={styles.historySeasonRow}>
            {historyPoints.map((point, index, array) => (
              <View
                key={`history-season-${point.season}`}
                style={[
                  styles.historySeasonItem,
                  index === array.length - 1 ? styles.historySeasonItemActive : null,
                ]}
              >
                <Text
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.82}
                  style={[
                    styles.historySeasonText,
                    index === array.length - 1 ? styles.historySeasonTextActive : null,
                  ]}
                >
                  {toCompactSeasonLabel(point.season)}
                </Text>
              </View>
            ))}
          </View>
        </View>
      ) : (
        <Text style={styles.stateText}>{t('teamDetails.states.empty')}</Text>
      )}
    </View>
  );
}
