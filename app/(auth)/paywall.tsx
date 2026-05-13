import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  Linking,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { Colors, Fonts } from '@/lib/theme';
import { supabase } from '@/lib/supabase';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Icons ──────────────────────────────────────────────────────────────────

function LockIcon({ size = 14, color = '#FFFFFF' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6 10V7a6 6 0 0112 0v3M5 10h14a1 1 0 011 1v9a1 1 0 01-1 1H5a1 1 0 01-1-1v-9a1 1 0 011-1z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function ShieldIcon({ size = 14, color = 'rgba(255,255,255,0.55)' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2L4 6v6c0 5 3.5 9.5 8 10 4.5-.5 8-5 8-10V6l-8-4z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function CheckCircle({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"
        fill="#A78BFA"
      />
      <Path
        d="M8 12.5l2.5 2.5 5.5-5.5"
        stroke="#FFFFFF"
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function TargetIcon({ size = 22 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" stroke="#FFFFFF" strokeWidth={1.8} />
      <Path d="M12 18a6 6 0 100-12 6 6 0 000 12z" stroke="#FFFFFF" strokeWidth={1.8} />
      <Path d="M12 14a2 2 0 100-4 2 2 0 000 4z" fill="#FFFFFF" />
    </Svg>
  );
}

function SunIcon({ size = 22 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 17a5 5 0 100-10 5 5 0 000 10z" stroke="#FFFFFF" strokeWidth={1.8} />
      <Path
        d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"
        stroke="#FFFFFF"
        strokeWidth={1.8}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function FlaskIcon({ size = 22 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9 2v6L4 18a2 2 0 002 3h12a2 2 0 002-3L15 8V2M9 2h6M8 14h8"
        stroke="#FFFFFF"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function ArrowRight({ size = 18, color = '#FFFFFF' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M5 12h14M13 5l7 7-7 7" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function LaurelLeft({ size = 22 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <Path
        d="M28 4c-8 0-14 4-18 10-3 5-4 12-3 16 4-1 11-2 16-7 6-6 8-13 5-19z"
        stroke="#A78BFA"
        strokeWidth={1.4}
        fill="rgba(167,139,250,0.15)"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M14 18c2-2 4-3 6-4M10 23c2-1 4-3 6-4" stroke="#A78BFA" strokeWidth={1.2} strokeLinecap="round" />
    </Svg>
  );
}

function LaurelRight({ size = 22 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <Path
        d="M4 4c8 0 14 4 18 10 3 5 4 12 3 16-4-1-11-2-16-7-6-6-8-13-5-19z"
        stroke="#A78BFA"
        strokeWidth={1.4}
        fill="rgba(167,139,250,0.15)"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M18 18c-2-2-4-3-6-4M22 23c-2-1-4-3-6-4" stroke="#A78BFA" strokeWidth={1.2} strokeLinecap="round" />
    </Svg>
  );
}

function ScanCorners() {
  // Four purple L-brackets on the hero scan image
  const C = '#A78BFA';
  const S = 22;
  const T = 3;
  return (
    <>
      <View style={[corner.base, { top: 10, left: 10 }]}>
        <View style={[corner.h, { backgroundColor: C, width: S, height: T, top: 0, left: 0 }]} />
        <View style={[corner.v, { backgroundColor: C, width: T, height: S, top: 0, left: 0 }]} />
      </View>
      <View style={[corner.base, { top: 10, right: 10 }]}>
        <View style={[corner.h, { backgroundColor: C, width: S, height: T, top: 0, right: 0 }]} />
        <View style={[corner.v, { backgroundColor: C, width: T, height: S, top: 0, right: 0 }]} />
      </View>
      <View style={[corner.base, { bottom: 10, left: 10 }]}>
        <View style={[corner.h, { backgroundColor: C, width: S, height: T, bottom: 0, left: 0 }]} />
        <View style={[corner.v, { backgroundColor: C, width: T, height: S, bottom: 0, left: 0 }]} />
      </View>
      <View style={[corner.base, { bottom: 10, right: 10 }]}>
        <View style={[corner.h, { backgroundColor: C, width: S, height: T, bottom: 0, right: 0 }]} />
        <View style={[corner.v, { backgroundColor: C, width: T, height: S, bottom: 0, right: 0 }]} />
      </View>
    </>
  );
}

// ─── Component data ─────────────────────────────────────────────────────────

const FEATURES = [
  'Full AI skin breakdown',
  'Personalized AM/PM routine',
  'Product ingredient recommendations',
  'Progress tracking with scan history',
  'Weekly skin improvement plan',
  'Avoid products that may worsen your skin',
];

const LOCKED_ITEMS = [
  { icon: <TargetIcon />, title: 'Skin priorities', body: 'Know what to fix first based on your scan' },
  { icon: <SunIcon />, title: 'AM + PM routine', body: 'Step-by-step routine made for your skin' },
  { icon: <FlaskIcon />, title: 'Product ingredient guide', body: 'What to use, what to avoid, and why' },
];

// ─── Screen ─────────────────────────────────────────────────────────────────

export default function PaywallScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ profileId?: string; from?: string }>();
  const [selected, setSelected] = useState<'yearly' | 'weekly'>('yearly');
  const [busy, setBusy] = useState(false);

  const handleUnlock = async () => {
    if (busy) return;
    setBusy(true);
    try {
      // TODO: RevenueCat – Purchases.purchasePackage()
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
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <LinearGradient colors={['#08020F', '#0E0524', '#0A0218']} style={StyleSheet.absoluteFill} />

      {/* Top bar */}
      <View style={styles.topBar}>
        <View style={{ width: 60 }} />
        <TouchableOpacity onPress={handleRestore}>
          <Text style={styles.restore}>Restore</Text>
        </TouchableOpacity>
      </View>

      {/* Main content — no scroll, flex layout */}
      <View style={styles.content}>

        {/* Logo + headline */}
        <View style={styles.brandRow}>
          <View style={styles.logoMark}><Text style={styles.logoMarkX}>X</Text></View>
          <Text style={styles.brandName}>SkinX</Text>
        </View>
        <Text style={styles.headline}>
          Your skin scan is <Text style={styles.headlineAccent}>ready</Text>
        </Text>
        <Text style={styles.subhead}>Unlock your personalized skin plan based on your scan.</Text>

        {/* Hero card — flex:1 so face fills available space */}
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <LockIcon size={13} color="#A78BFA" />
            <Text style={styles.heroTopText}>Unlock Your Full Plan</Text>
          </View>
          <View style={styles.heroBody}>
            <View style={styles.faceWrap}>
              <Image
                source={require('@/assets/images/welcome-face.jpg')}
                style={styles.faceImg}
                resizeMode="contain"
              />
              <View style={styles.scanLine} />
              <LinearGradient
                colors={['rgba(10,2,24,0)', 'rgba(10,2,24,0.35)']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
              <ScanCorners />
            </View>
            <View style={styles.lockedCol}>
              {LOCKED_ITEMS.map((item) => (
                <View key={item.title} style={styles.lockedCard}>
                  <View style={styles.lockedIcon}>{item.icon}</View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.lockedTitle}>{item.title}</Text>
                    <Text style={styles.lockedBody}>{item.body}</Text>
                  </View>
                  <LockIcon size={10} color="rgba(255,255,255,0.5)" />
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* SkinX Pro */}
        <View style={styles.proDivider}>
          <LaurelLeft size={22} />
          <Text style={styles.proLabel}>SkinX Pro</Text>
          <LaurelRight size={22} />
        </View>
        {/* Features grid */}
        <View style={styles.featuresCard}>
          {FEATURES.map((f) => (
            <View key={f} style={styles.featureItem}>
              <CheckCircle size={15} />
              <Text style={styles.featureText}>{f}</Text>
            </View>
          ))}
        </View>

        {/* Plan cards */}
        <TouchableOpacity activeOpacity={0.9} onPress={() => setSelected('yearly')}
          style={[styles.planCard, selected === 'yearly' && styles.planCardSelected]}>
          <View style={[styles.radio, selected === 'yearly' && styles.radioSelected]}>
            {selected === 'yearly' && <View style={styles.radioDot} />}
          </View>
          <View style={styles.planMid}>
            <Text style={styles.planLabel}>YEARLY ACCESS</Text>
            <View style={styles.bestValueRow}>
              <Text style={styles.bestValueStar}>★</Text>
              <Text style={styles.bestValue}>BEST VALUE</Text>
            </View>
            <Text style={styles.planSubtle}>Just $2.50 per month</Text>
          </View>
          <View style={styles.planPriceCol}>
            <Text style={styles.planPrice}>$29.99</Text>
            <Text style={styles.planUnit}>per year</Text>
          </View>
          <View style={[styles.saveBadge, selected !== 'yearly' && { opacity: 0 }]}>
            <Text style={styles.saveBadgeLabel}>SAVE</Text>
            <Text style={styles.saveBadgePct}>58%</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity activeOpacity={0.9} onPress={() => setSelected('weekly')}
          style={[styles.planCard, selected === 'weekly' && styles.planCardSelected]}>
          <View style={[styles.radio, selected === 'weekly' && styles.radioSelected]}>
            {selected === 'weekly' && <View style={styles.radioDot} />}
          </View>
          <View style={styles.planMid}>
            <Text style={styles.planLabel}>WEEKLY ACCESS</Text>
            <Text style={styles.planSubtle}>Billed weekly</Text>
          </View>
          <View style={styles.planPriceCol}>
            <Text style={styles.planPrice}>$4.99</Text>
            <Text style={styles.planUnit}>per week</Text>
          </View>
        </TouchableOpacity>

        {/* CTA */}
        <TouchableOpacity activeOpacity={0.9} onPress={handleUnlock} style={styles.ctaWrap} disabled={busy}>
          <LinearGradient
            colors={['#C4B5FD', '#A78BFA', '#8B5CF6']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={styles.cta}
          >
            {busy ? <ActivityIndicator color="#FFFFFF" /> : (
              <>
                <View style={styles.ctaInner}>
                  <LockIcon size={17} color="#FFFFFF" />
                  <Text style={styles.ctaText}>Continue</Text>
                </View>
                <ArrowRight size={17} color="#FFFFFF" />
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        {/* Footer */}
        <View style={styles.footer}>
          <ShieldIcon size={12} />
          <Text style={styles.cancelText}>Cancel anytime</Text>
          <Text style={styles.footerDot}>•</Text>
          <TouchableOpacity onPress={() => Linking.openURL('https://skinx.app/terms')}>
            <Text style={styles.legalLink}>Terms</Text>
          </TouchableOpacity>
          <Text style={styles.footerDot}>•</Text>
          <TouchableOpacity onPress={() => Linking.openURL('https://skinx.app/privacy')}>
            <Text style={styles.legalLink}>Privacy Policy</Text>
          </TouchableOpacity>
        </View>

      </View>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#08020F' },

  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 4,
  },
  restore: {
    fontFamily: Fonts.medium,
    fontSize: 13,
    color: 'rgba(255,255,255,0.4)',
  },

  // No-scroll flex content
  content: {
    flex: 1,
    paddingHorizontal: 16,
    gap: 4,
  },

  // Brand
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  logoMark: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: '#7C3AED',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoMarkX: {
    color: '#FFFFFF',
    fontFamily: Fonts.bold,
    fontSize: 14,
    lineHeight: 16,
  },
  brandName: {
    color: '#FFFFFF',
    fontFamily: Fonts.bold,
    fontSize: 18,
    letterSpacing: -0.3,
  },

  // Headline
  headline: {
    color: '#FFFFFF',
    fontFamily: Fonts.bold,
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.8,
    textAlign: 'center',
  },
  headlineAccent: { color: '#A78BFA' },
  subhead: {
    color: 'rgba(255,255,255,0.55)',
    fontFamily: Fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: -4,
  },

  // Hero card — flex:1 so it grows to fill available space
  heroCard: {
    flex: 1,
    backgroundColor: '#0A0420',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.18)',
    padding: 10,
    overflow: 'hidden',
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 5,
    paddingBottom: 7,
  },
  heroTopText: {
    color: '#FFFFFF',
    fontFamily: Fonts.semibold,
    fontSize: 11.5,
  },
  heroBody: {
    flex: 1,
    flexDirection: 'row',
    gap: 9,
  },
  faceWrap: {
    flex: 1,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#150830',
  },
  faceImg: {
    width: '100%',
    height: '100%',
  },
  scanLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '50%',
    width: 1.2,
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  lockedCol: {
    flex: 1,
    gap: 6,
    justifyContent: 'space-between',
  },
  lockedCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: 'rgba(124,58,237,0.18)',
    borderRadius: 9,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.12)',
  },
  lockedIcon: {
    width: 24,
    height: 24,
    borderRadius: 7,
    backgroundColor: 'rgba(167,139,250,0.22)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockedTitle: {
    color: '#FFFFFF',
    fontFamily: Fonts.semibold,
    fontSize: 11,
    lineHeight: 13,
  },
  lockedBody: {
    color: 'rgba(255,255,255,0.5)',
    fontFamily: Fonts.regular,
    fontSize: 9,
    lineHeight: 11,
    marginTop: 1,
  },

  // Pro divider
  proDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  proLabel: {
    color: '#FFFFFF',
    fontFamily: Fonts.bold,
    fontSize: 19,
    letterSpacing: -0.3,
  },
  proSub: {
    color: 'rgba(255,255,255,0.5)',
    fontFamily: Fonts.regular,
    fontSize: 12,
    textAlign: 'center',
    marginTop: -4,
  },

  // Features — 2-column grid inside a card
  featuresCard: {
    backgroundColor: 'rgba(124,58,237,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.16)',
    borderRadius: 14,
    paddingVertical: 5,
    paddingHorizontal: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  featureItem: {
    width: '50%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    paddingVertical: 3,
    paddingRight: 6,
  },
  featureText: {
    flex: 1,
    color: '#FFFFFF',
    fontFamily: Fonts.regular,
    fontSize: 11.5,
    lineHeight: 15,
  },

  // Plan cards
  planCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(124,58,237,0.08)',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  planCardSelected: {
    borderColor: '#A78BFA',
    backgroundColor: 'rgba(167,139,250,0.12)',
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: { borderColor: '#A78BFA' },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#A78BFA',
  },
  planMid: { flex: 1, gap: 2 },
  planLabel: {
    color: '#FFFFFF',
    fontFamily: Fonts.bold,
    fontSize: 12.5,
    letterSpacing: 0.3,
  },
  bestValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(167,139,250,0.18)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
    alignSelf: 'flex-start',
  },
  bestValueStar: { color: '#A78BFA', fontSize: 9 },
  bestValue: {
    color: '#A78BFA',
    fontFamily: Fonts.bold,
    fontSize: 9,
    letterSpacing: 0.5,
  },
  planSubtle: {
    color: 'rgba(255,255,255,0.45)',
    fontFamily: Fonts.regular,
    fontSize: 11,
  },
  planPriceCol: { alignItems: 'flex-end' },
  planPrice: {
    color: '#FFFFFF',
    fontFamily: Fonts.bold,
    fontSize: 18,
    letterSpacing: -0.3,
  },
  planUnit: {
    color: 'rgba(255,255,255,0.4)',
    fontFamily: Fonts.regular,
    fontSize: 10.5,
  },
  saveBadge: {
    width: 48,
    alignSelf: 'stretch',
    backgroundColor: 'rgba(167,139,250,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    marginRight: -2,
  },
  saveBadgeLabel: {
    color: '#FFFFFF',
    fontFamily: Fonts.semibold,
    fontSize: 9,
    letterSpacing: 0.4,
  },
  saveBadgePct: {
    color: '#FFFFFF',
    fontFamily: Fonts.bold,
    fontSize: 14,
  },

  // CTA
  ctaWrap: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#7C3AED',
    shadowOpacity: 0.4,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    paddingHorizontal: 20,
  },
  ctaInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  ctaText: {
    color: '#FFFFFF',
    fontFamily: Fonts.bold,
    fontSize: 17,
    letterSpacing: -0.2,
  },

  // Footer row — cancel + legal on one line
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingBottom: 4,
  },
  cancelText: {
    color: 'rgba(255,255,255,0.5)',
    fontFamily: Fonts.medium,
    fontSize: 11.5,
  },
  footerDot: {
    color: 'rgba(255,255,255,0.25)',
    fontSize: 9,
  },
  legalLink: {
    color: 'rgba(255,255,255,0.45)',
    fontFamily: Fonts.medium,
    fontSize: 11.5,
  },
});

const corner = StyleSheet.create({
  base: {
    position: 'absolute',
    width: 22,
    height: 22,
  },
  h: { position: 'absolute', borderRadius: 1.5 },
  v: { position: 'absolute', borderRadius: 1.5 },
});
