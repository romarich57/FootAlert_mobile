import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { isOnboardingCompleted } from '@data/storage/onboardingStorage';
import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import type { ThemeColors } from '@ui/shared/theme/theme';

import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@ui/app/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Splash'>;

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      alignItems: 'center',
      justifyContent: 'center',
    },
    logoContainer: {
      alignItems: 'center',
    },
    logoCircle: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    logoText: {
      fontSize: 36,
    },
    appName: {
      fontSize: 28,
      fontWeight: '800',
      color: colors.text,
      letterSpacing: -0.5,
    },
    tagline: {
      fontSize: 14,
      color: colors.textMuted,
      marginTop: 8,
    },
  });
}

export function SplashScreen({ navigation }: Props) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);

  const logoScale = useSharedValue(0.4);
  const logoOpacity = useSharedValue(0);
  const nameTranslateY = useSharedValue(20);
  const nameOpacity = useSharedValue(0);
  const taglineOpacity = useSharedValue(0);
  const screenOpacity = useSharedValue(1);

  const logoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
    opacity: logoOpacity.value,
  }));

  const nameStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: nameTranslateY.value }],
    opacity: nameOpacity.value,
  }));

  const taglineStyle = useAnimatedStyle(() => ({
    opacity: taglineOpacity.value,
  }));

  const screenStyle = useAnimatedStyle(() => ({
    opacity: screenOpacity.value,
    flex: 1,
  }));

  useEffect(() => {
    // t=0: logo scale + fade (spring)
    logoScale.value = withSpring(1, { damping: 12, stiffness: 120 });
    logoOpacity.value = withTiming(1, { duration: 500 });

    // t=600ms: nom slide-up + fade
    nameTranslateY.value = withDelay(600, withTiming(0, { duration: 400 }));
    nameOpacity.value = withDelay(600, withTiming(1, { duration: 400 }));

    // t=1200ms: tagline fade-in
    taglineOpacity.value = withDelay(1200, withTiming(1, { duration: 300 }));

    // t=2000ms: fade screen + navigate
    screenOpacity.value = withSequence(
      withDelay(
        2000,
        withTiming(0, { duration: 300 }, finished => {
          if (finished) {
            runOnJS(navigateNext)();
          }
        }),
      ),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function navigateNext() {
    isOnboardingCompleted().then(completed => {
      if (completed) {
        navigation.replace('MainTabs', { screen: 'Matches' });
      } else {
        navigation.replace('Onboarding');
      }
    });
  }

  return (
    <Animated.View style={[styles.container, screenStyle]}>
      <View style={styles.logoContainer}>
        <Animated.View style={[styles.logoCircle, logoStyle]}>
          <Text style={styles.logoText}>⚽</Text>
        </Animated.View>
        <Animated.Text style={[styles.appName, nameStyle]}>FootAlert</Animated.Text>
        <Animated.Text style={[styles.tagline, taglineStyle]}>
          Football en temps réel
        </Animated.Text>
      </View>
    </Animated.View>
  );
}
