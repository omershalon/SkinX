import { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useFonts, DMSans_400Regular, DMSans_500Medium, DMSans_600SemiBold, DMSans_700Bold, DMSans_800ExtraBold } from '@expo-google-fonts/dm-sans';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabase';
import { initI18n } from '@/lib/i18n';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/lib/i18n';
import type { Session } from '@supabase/supabase-js';
import { consumePaywallRequest } from '@/lib/pendingPaywall';

export default function RootLayout() {
  const router   = useRouter();
  const segments = useSegments();
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const splashOpacity = useRef(new Animated.Value(1)).current;
  const didRedirect = useRef(false);
  const [fontsLoaded] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
    DMSans_800ExtraBold,
  });

  useEffect(() => {
    // Apply saved language preference (init is already done synchronously)
    initI18n();
    setTimeout(() => setMinTimeElapsed(true), 800);
  }, []);

  const ready = fontsLoaded && minTimeElapsed;

  useEffect(() => {
    if (ready && showSplash && session !== undefined) {
      if (session) {
        // Logged in — skip splash immediately
        splashOpacity.setValue(0);
        setShowSplash(false);
      } else {
        // Logged out — fade out splash
        Animated.timing(splashOpacity, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }).start(() => setShowSplash(false));
      }
    }
  }, [ready, session]);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        supabase.auth.signOut();
        setSession(null);
      } else {
        setSession(session);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'TOKEN_REFRESHED' && !session) {
        supabase.auth.signOut();
        setSession(null);
      } else {
        setSession(session);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session === undefined) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!session) {
      didRedirect.current = false;
      if (!inAuthGroup) router.replace('/(auth)/welcome');
    } else if (inAuthGroup && segments[1] !== 'paywall' && !didRedirect.current) {
      didRedirect.current = true;
      if (consumePaywallRequest()) {
        router.replace('/(auth)/paywall');
      } else {
        router.replace('/(tabs)');
      }
    }
  }, [session, segments]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {ready && (
        <I18nextProvider i18n={i18n}>
          <Stack screenOptions={{ headerShown: false }} />
        </I18nextProvider>
      )}
      {showSplash && (
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: splashOpacity, zIndex: 10 }]}>
          <View style={[splash.container, { backgroundColor: '#000' }]}>
            {fontsLoaded && (
              <View style={splash.titleWrap}>
                <Text style={splash.title}>Skin<Text style={splash.titleX}>X</Text></Text>
              </View>
            )}
          </View>
        </Animated.View>
      )}
    </GestureHandlerRootView>
  );
}

const splash = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleWrap: {
    overflow: 'visible',
    paddingHorizontal: 20,
  },
  title: {
    fontFamily: 'DMSans_800ExtraBold',
    fontSize: 52,
    color: '#FFFFFF',
    letterSpacing: -1.5,
    textAlign: 'center',
  },
  titleX: {
    color: '#7C5CFC',
  },
});
