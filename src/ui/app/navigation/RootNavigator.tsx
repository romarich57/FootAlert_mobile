import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { MainTabParamList, RootStackParamList } from '@ui/app/navigation/types';
import { useMainTabsPrefetch } from '@ui/app/navigation/useMainTabsPrefetch';
import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import { CompetitionsScreen } from '@ui/features/competitions';
import { FollowsScreen } from '@ui/features/follows';
import { MatchesScreen } from '@ui/features/matches';
import { MoreScreen } from '@ui/features/more';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tabs = createBottomTabNavigator<MainTabParamList>();

const getMatchDetailsScreen = () =>
  require('@ui/features/matches/screens/MatchDetailsScreen').MatchDetailsScreen;
const getCompetitionDetailsScreen = () =>
  require('@ui/features/competitions/screens/CompetitionDetailsScreen').CompetitionDetailsScreen;
const getTeamDetailsScreen = () =>
  require('@ui/features/teams/screens/TeamDetailsScreen').TeamDetailsScreen;
const getPlayerDetailsScreen = () =>
  require('@ui/features/players/screens/PlayerDetailsScreen').PlayerDetailsScreen;
const getSearchScreen = () => require('@ui/features/search').SearchScreen;

type TabBarIconProps = {
  routeName: keyof MainTabParamList;
  color: string;
  size: number;
  focused: boolean;
};

function TabBarIcon({ routeName, color, size, focused }: TabBarIconProps) {
  const iconNameByRoute: Record<keyof MainTabParamList, string> = {
    Matches: focused ? 'soccer' : 'soccer',
    Competitions: focused ? 'trophy' : 'trophy',
    Follows: focused ? 'star' : 'star',
    More: focused ? 'dots-horizontal' : 'dots-horizontal',
  };

  return <MaterialCommunityIcons name={iconNameByRoute[routeName]} color={color} size={size} />;
}

function TabsNavigator() {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const prefetchListeners = useMainTabsPrefetch();
  const bottomPadding = Math.max(insets.bottom, 8);

  return (
    <Tabs.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 56 + bottomPadding,
          paddingBottom: bottomPadding,
        },
        // React Navigation requires a render callback for tabBarIcon.
        // eslint-disable-next-line react/no-unstable-nested-components
        tabBarIcon: ({ color, size, focused }) => (
          <TabBarIcon
            routeName={route.name}
            color={color}
            size={size}
            focused={focused}
          />
        ),
      })}
    >
      <Tabs.Screen
        name="Matches"
        component={MatchesScreen}
        listeners={prefetchListeners.Matches}
        options={{
          title: t('tabs.matches'),
        }}
      />
      <Tabs.Screen
        name="Competitions"
        component={CompetitionsScreen}
        listeners={prefetchListeners.Competitions}
        options={{
          title: t('tabs.competitions'),
        }}
      />
      <Tabs.Screen
        name="Follows"
        component={FollowsScreen}
        listeners={prefetchListeners.Follows}
        options={{
          title: t('tabs.follows'),
        }}
      />
      <Tabs.Screen
        name="More"
        component={MoreScreen}
        options={{
          title: t('tabs.more'),
        }}
      />
    </Tabs.Navigator>
  );
}

export function RootNavigator() {
  const { t } = useTranslation();

  return (
    <Stack.Navigator>
      <Stack.Screen
        name="MainTabs"
        component={TabsNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen name="MatchDetails" getComponent={getMatchDetailsScreen} options={{ headerShown: false }} />
      <Stack.Screen
        name="CompetitionDetails"
        getComponent={getCompetitionDetailsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen name="TeamDetails" getComponent={getTeamDetailsScreen} options={{ headerShown: false }} />
      <Stack.Screen name="PlayerDetails" getComponent={getPlayerDetailsScreen} options={{ headerShown: false }} />
      <Stack.Screen
        name="SearchPlaceholder"
        getComponent={getSearchScreen}
        options={{ title: t('screens.search.title') }}
      />
    </Stack.Navigator>
  );
}
