import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Circle } from 'react-native-svg';
import { Colors, Fonts } from '@/lib/theme';
import { supabase } from '@/lib/supabase';

// ─── Icons ───────────────────────────────────────────────────────────────────

function CheckIcon({ size = 18, color = '#A78BFA' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M20 6L9 17l-5-5" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function SparkleIcon({ size = 20, color = '#A78BFA' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 3l1.8 5.4L19 10l-5.2 1.6L12 17l-1.8-5.4L5 10l5.2-1.6L12 3z" fill={color} />
    </Svg>
  );
}

// ─── Feature rows ─────────────────────────────────────────────────────────────

const FEATURES = [
  'AI-powered skin scan & analysis',
  'Personalized AM + PM routine',
  'Product & ingredient recommendations',
  'Progress tracking with scan history',
  'Weekly skin improvement plan',
  'Avoid items that worsen your skin',
];

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function PaywallScreen() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const params  = useLocalSearchParams<{ profileId?: string; from?: string }>();
  const [busy, setBusy] = useState(false);

  const handleTryNow = async () => {
    if (busy) return;
    setBusy(true);
    try {
      // TODO: RevenueCat free trial
      const profileId = params.profileId;
      if (params.from === 'scan' && profileId) {
        await supabase.auth.refreshSession();
        const { error } = await supabase.functions.invoke('generate-plan', {
          body: { skin_profile_id: profileId },
        });
        if (error) {
          Alert.alert('Plan Generation Failed', error.message ?? 'Please try again.');
          setBusy(false);
          return;
        }
        router.replace('/(tabs)/plan');
        return;
      }
      router.replace('/(tabs)');
    } catch (e: any) {
      Alert.alert('Something went wrong', e?.message ?? 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const handleRestore = () => {
    Alert.alert('Restore Purchases', 'No active subscription found.');
  };

  return (
    <View style={[s.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <LinearGradient colors={['#08020F', '#0E0524', '#0A0218']} style={StyleSheet.absoluteFill} />


      {/* Main content */}
      <View style={s.content}>

        {/* Headline */}
        <View style={s.headlineWrap}>
          <Text style={s.headline}>We want you to{'\n'}try SkinX for free</Text>
        </View>


        {/* Spacer */}
        <View style={{ flex: 1 }} />

        {/* No payment badge */}
        <View style={s.noBadge}>
          <CheckIcon size={16} color="#FFFFFF" />
          <Text style={s.noBadgeText}>No Payment Due Now</Text>
        </View>

        {/* CTA button */}
        <TouchableOpacity
          style={s.ctaWrap}
          activeOpacity={0.88}
          onPress={handleTryNow}
          disabled={busy}
        >
          <LinearGradient
            colors={['#8B5CF6', '#7C3AED', '#5B21B6']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={s.cta}
          >
            {busy
              ? <ActivityIndicator color="#FFFFFF" />
              : <Text style={s.ctaText}>Try Now</Text>
            }
          </LinearGradient>
        </TouchableOpacity>

        {/* Already purchased + price */}
        <View style={s.purchasedRow}>
          <TouchableOpacity onPress={handleRestore}>
            <Text style={s.purchasedText}>Already purchased?</Text>
          </TouchableOpacity>
        </View>
        <Text style={s.priceHint}>Just $29.99 per year ($2.49/mo)</Text>

        {/* Legal links */}
        <View style={s.legalRow}>
          <TouchableOpacity onPress={() => Linking.openURL('https://skinx.app/terms')}>
            <Text style={s.legalLink}>Terms</Text>
          </TouchableOpacity>
          <Text style={s.legalDot}>·</Text>
          <TouchableOpacity onPress={() => Linking.openURL('https://skinx.app/privacy')}>
            <Text style={s.legalLink}>Privacy</Text>
          </TouchableOpacity>
          <Text style={s.legalDot}>·</Text>
          <TouchableOpacity onPress={handleRestore}>
            <Text style={s.legalLink}>Restore</Text>
          </TouchableOpacity>
        </View>

      </View>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#08020F',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 4,
  },
  restoreLink: {
    fontFamily: Fonts.medium,
    fontSize: 13,
    color: 'rgba(255,255,255,0.38)',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingBottom: 8,
  },

  // Headline block
  headlineWrap: {
    alignItems: 'center',
    gap: 10,
    paddingTop: 80,
    paddingBottom: 28,
  },
  headline: {
    fontFamily: Fonts.bold,
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: -1,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  subhead: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    color: 'rgba(255,255,255,0.45)',
    textAlign: 'center',
  },

  // Feature card
  featureCard: {
    backgroundColor: 'rgba(124,58,237,0.12)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.18)',
    paddingVertical: 14,
    paddingHorizontal: 18,
    gap: 12,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureText: {
    fontFamily: Fonts.medium,
    fontSize: 14,
    color: '#FFFFFF',
    flex: 1,
  },

  // No payment badge
  noBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    marginBottom: 12,
  },
  noBadgeText: {
    fontFamily: Fonts.semibold,
    fontSize: 15,
    color: '#FFFFFF',
  },

  // CTA
  ctaWrap: {
    borderRadius: 999,
    overflow: 'hidden',
    marginBottom: 14,
    shadowColor: '#7C3AED',
    shadowOpacity: 0.45,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  cta: {
    height: 58,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ctaText: {
    fontFamily: Fonts.bold,
    fontSize: 18,
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },

  // Already purchased
  purchasedRow: {
    alignItems: 'center',
    marginBottom: 4,
  },
  purchasedText: {
    fontFamily: Fonts.medium,
    fontSize: 13,
    color: 'rgba(255,255,255,0.55)',
  },
  priceHint: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: 'rgba(255,255,255,0.35)',
    textAlign: 'center',
    marginBottom: 16,
  },

  // Legal
  legalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  legalLink: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: 'rgba(255,255,255,0.35)',
  },
  legalDot: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.25)',
  },
});
