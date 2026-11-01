import {
  Cairo_400Regular,
  Cairo_600SemiBold,
  Cairo_700Bold,
  Cairo_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/cairo';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LoadingState } from '@/components/ui/LoadingState';
import { type SessionStatus, SessionProvider, useSession } from '@/hooks/useSession';
import '@/i18n';
import { LanguageProvider } from '@/i18n/LanguageProvider';
import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ Cairo_400Regular, Cairo_600SemiBold, Cairo_700Bold, Cairo_800ExtraBold });
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <LanguageProvider>
            <SessionProvider>{fontsLoaded ? <RootStack /> : null}</SessionProvider>
          </LanguageProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function RootStack() {
  const { status } = useSession();
  const { c } = useTheme();
  // Keep showing the current screen while the session briefly re-checks (e.g. right after joining).
  const [shown, setShown] = useState<Exclude<SessionStatus, 'loading'> | null>(null);

  useEffect(() => {
    SplashScreen.hideAsync().catch(() => undefined);
  }, []);
  useEffect(() => {
    if (status !== 'loading') setShown(status);
  }, [status]);

  if (!shown) return <LoadingState />;

  return (
    <>
      {/* Every screen starts with the dark teal band, so the status bar text is always light. */}
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg } }}>
        <Stack.Protected guard={shown === 'signedOut'}>
          <Stack.Screen name="sign-in" />
        </Stack.Protected>
        <Stack.Protected guard={shown === 'needsFamily'}>
          <Stack.Screen name="family-setup" />
        </Stack.Protected>
        <Stack.Protected guard={shown === 'ready'}>
          <Stack.Screen name="index" />
          <Stack.Screen name="family" options={{ presentation: 'modal' }} />
        </Stack.Protected>
      </Stack>
    </>
  );
}
