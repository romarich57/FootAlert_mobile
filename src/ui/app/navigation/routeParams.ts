import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { RootStackParamList } from '@ui/app/navigation/types';

const NUMERIC_ENTITY_ID_PATTERN = /^[1-9]\d{0,11}$/;

type EntityRouteName =
  | 'MatchDetails'
  | 'CompetitionDetails'
  | 'TeamDetails'
  | 'PlayerDetails';

const ENTITY_ID_KEY_BY_ROUTE: Record<EntityRouteName, string> = {
  MatchDetails: 'matchId',
  CompetitionDetails: 'competitionId',
  TeamDetails: 'teamId',
  PlayerDetails: 'playerId',
};

type EntityNavigation = Pick<NativeStackNavigationProp<RootStackParamList>, 'navigate'>;

type EntityRouteExtraParams<RouteName extends EntityRouteName> = Omit<
  RootStackParamList[RouteName],
  (typeof ENTITY_ID_KEY_BY_ROUTE)[RouteName]
>;

export function sanitizeNumericEntityId(rawValue: unknown): string | null {
  if (typeof rawValue !== 'string') {
    return null;
  }

  const trimmed = rawValue.trim();
  if (!NUMERIC_ENTITY_ID_PATTERN.test(trimmed)) {
    return null;
  }

  return trimmed;
}

export function safeNavigateEntity<RouteName extends EntityRouteName>(
  navigation: EntityNavigation,
  routeName: RouteName,
  rawEntityId: unknown,
  extraParams?: EntityRouteExtraParams<RouteName>,
): boolean {
  const normalizedRawValue =
    typeof rawEntityId === 'number' && Number.isFinite(rawEntityId)
      ? String(rawEntityId)
      : rawEntityId;
  const safeEntityId = sanitizeNumericEntityId(normalizedRawValue);
  if (!safeEntityId) {
    return false;
  }

  const entityIdKey = ENTITY_ID_KEY_BY_ROUTE[routeName];
  const routeParams = {
    ...(extraParams ?? ({} as EntityRouteExtraParams<RouteName>)),
    [entityIdKey]: safeEntityId,
  } as RootStackParamList[RouteName];
  const navigateWithParams = navigation.navigate as (
    screen: RouteName,
    params: RootStackParamList[RouteName],
  ) => void;
  navigateWithParams(routeName, routeParams);
  return true;
}
