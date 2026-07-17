import '@/lib/polyfills'; // EventSource pour PocketBase realtime/OAuth2 (doit être en premier)

import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import { QueryClientProvider } from '@tanstack/react-query';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useDbMigrations } from '@/db/migrations';
import { AuthProvider, useAuth } from '@/features/auth/AuthContext';
import { useAutoSync } from '@/features/sync/useSync';
import { queryClient } from '@/lib/queryClient';
import { ThemeProvider } from '@/theme/ThemeProvider';

void SplashScreen.preventAutoHideAsync();

/** Redirige selon la session : hors auth → /login, connecté sur /login → app. */
function useAuthGate() {
  const { ready, isAuthenticated } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;
    const onLogin = segments[0] === 'login';
    if (!isAuthenticated && !onLogin) {
      router.replace('/login');
    } else if (isAuthenticated && onLogin) {
      router.replace('/');
    }
  }, [ready, isAuthenticated, segments, router]);
}

function RootNavigator() {
  const { ready } = useAuth();
  useAuthGate();
  useAutoSync();

  // Masque le splash seulement quand la session est chargée : évite le flash
  // de contenu protégé avant la redirection vers /login.
  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="login" />
      <Stack.Screen name="scan" options={{ presentation: 'modal' }} />
      <Stack.Screen name="add-food" options={{ presentation: 'modal' }} />
      <Stack.Screen name="meals" />
      <Stack.Screen name="meal-new" options={{ presentation: 'modal' }} />
      <Stack.Screen name="weight" />
      <Stack.Screen name="workout-new" options={{ presentation: 'modal' }} />
      <Stack.Screen name="exercise/[slug]" />
      <Stack.Screen name="ai-log" options={{ presentation: 'modal' }} />
      <Stack.Screen name="about" />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  // Crée/migre la base SQLite locale AVANT tout accès (sync, écrans).
  // Sans ça : « no such table: sync_queue » → crash au premier rendu connecté.
  const { success: dbReady, error: dbError } = useDbMigrations();

  if (dbError) return <FatalError message={`Erreur base locale : ${dbError.message}`} />;
  if (!fontsLoaded || !dbReady) return null;

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AuthProvider>
            <StatusBar style="auto" />
            <RootNavigator />
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

/** Écran d'erreur minimal (hors ThemeProvider) : n'assume aucun contexte. */
function FatalError({ message }: { message: string }) {
  useEffect(() => {
    void SplashScreen.hideAsync();
  }, []);
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        backgroundColor: '#000',
      }}
    >
      <Text style={{ color: '#fff', fontSize: 16, textAlign: 'center' }}>{message}</Text>
    </View>
  );
}
