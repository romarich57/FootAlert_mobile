import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { MainTabParamList, RootStackParamList } from '@ui/app/navigation/types';
import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import { CompetitionsScreen } from '@ui/features/competitions';
import { CompetitionDetailsScreen } from '@ui/features/competitions/screens/CompetitionDetailsScreen';
import { FollowsScreen } from '@ui/features/follows';
import { MatchesScreen } from '@ui/features/matches';
import { MatchDetailsScreen } from '@ui/features/matches/screens/MatchDetailsScreen';
import { MoreScreen } from '@ui/features/more';
import { PlayerDetailsScreen } from '@ui/features/players/screens/PlayerDetailsScreen';
import { SearchPlaceholderScreen } from '@ui/features/search';
import { TeamDetailsScreen } from '@ui/features/teams';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tabs = createBottomTabNavigator<MainTabParamList>();

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
        options={{
          title: t('tabs.matches'),
        }}
      />
      <Tabs.Screen
        name="Competitions"
        component={CompetitionsScreen}
        options={{
          title: t('tabs.competitions'),
        }}
      />
      <Tabs.Screen
        name="Follows"
        component={FollowsScreen}
        options={{
          title: t('tabs.follows'),
        }}
      />
      <Tabs.Screen
        name="More"
        component={MoreScreen}
        options={{
          title: t('tabs.more'),
          lazy: false,
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
      <Stack.Screen name="MatchDetails" component={MatchDetailsScreen} />
      <Stack.Screen
        name="CompetitionDetails"
        component={CompetitionDetailsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen name="TeamDetails" component={TeamDetailsScreen} options={{ headerShown: false }} />
      <Stack.Screen name="PlayerDetails" component={PlayerDetailsScreen} options={{ headerShown: false }} />
      <Stack.Screen
        name="SearchPlaceholder"
        component={SearchPlaceholderScreen}
        options={{ title: t('screens.search.title') }}
      />
    </Stack.Navigator>
  );
}
