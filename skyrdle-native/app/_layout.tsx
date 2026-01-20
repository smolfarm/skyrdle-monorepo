import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider } from '@/contexts/auth-context';
import { SettingsProvider } from '@/contexts/settings-context';
import { GameProvider } from '@/contexts/game-context';
import { CustomGameProvider } from '@/contexts/custom-game-context';

export const unstable_settings = {
  anchor: '(tabs)',
};

// Custom dark theme matching Skyrdle colors
const SkyrdleDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: '#121213',
    card: '#121213',
  },
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <AuthProvider>
      <SettingsProvider>
        <GameProvider>
          <CustomGameProvider>
            <ThemeProvider value={colorScheme === 'dark' ? SkyrdleDarkTheme : DefaultTheme}>
              <Stack>
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="login" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
                <Stack.Screen name="share-modal" options={{ presentation: 'modal', title: 'Share Results' }} />
                <Stack.Screen name="custom-game/[id]" options={{ headerShown: false }} />
                <Stack.Screen name="c/[id]" options={{ headerShown: false }} />
                <Stack.Screen name="create-custom-game-modal" options={{ presentation: 'modal', title: 'Create Custom Game' }} />
                <Stack.Screen name="custom-game-share-modal" options={{ presentation: 'modal', title: 'Share Results' }} />
              </Stack>
              <StatusBar style="light" />
            </ThemeProvider>
          </CustomGameProvider>
        </GameProvider>
      </SettingsProvider>
    </AuthProvider>
  );
}
