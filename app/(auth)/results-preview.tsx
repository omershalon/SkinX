import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import Svg, { Path, Rect, Circle } from 'react-native-svg';
import { Fonts } from '@/lib/theme';
import { useTranslation } from 'react-i18next';

const { width: SCREEN_W } = Dimensions.get('window');
const CARD_SIZE = Math.min(SCREEN_W - 48, 360);

function LockIcon({ size = 28, color = '#FFF' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={5} y={11} width={14} height={10} rx={2} stroke={color} strokeWidth={1.8} />
      <Path d="M8 11V7.5a4 4 0 018 0V11" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Circle cx={12} cy={15.5} r={1.2} fill={color} />
      <Path d="M12 16.7v1.6" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

function ShieldCheck({ size = 14, color = 'rgba(255,255,255,0.55)' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 3l8 3v6c0 4.5-3.4 8.4-8 9-4.6-.6-8-4.5-8-9V6l8-3z" stroke={color} strokeWidth={1.6} strokeLinejoin="round" />
      <Path d="M9 12.5l2 2 4-4" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export default function ResultsPreviewScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ onboardingData?: string; analysisResult?: string; photoFront?: string }>();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const analysis = params.analysisResult ? JSON.parse(params.analysisResult) : {};
  const findingsCount = analysis.findings?.length || analysis.findings_count || 3;

  return (
    <View style={[s.container, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16 }]}>
      {/* Wordmark */}
      <View style={s.wordmarkRow}>
        <Text style={s.wordmarkSkin}>Skin</Text>
        <Text style={s.wordmarkX}>X</Text>
      </View>

      {/* Card with violet glow */}
      <View style={s.cardWrap}>
        <View style={s.cardGlow} pointerEvents="none" />
        <View style={s.card}>
          {/* Fake content behind blur — photo + badges + text rows */}
          <View style={s.fakeContent}>
            {params.photoFront ? (
              <Image source={{ uri: params.photoFront }} style={s.fakePhoto} />
            ) : (
              <View style={[s.fakePhoto, { backgroundColor: '#2A1A4A' }]} />
            )}

            <View style={s.fakeBody}>
              <View style={s.fakeBadgeRow}>
                <View style={s.fakeYellowPill} />
                <View style={s.fakePinkPill} />
              </View>
              <View style={s.fakeTitleBar} />
              <View style={s.fakeTextRow} />
              <View style={[s.fakeTextRow, { width: '70%' }]} />
            </View>
          </View>

          {/* Blur overlay */}
          <BlurView intensity={28} tint="dark" style={StyleSheet.absoluteFillObject} />
          <View style={s.cardDim} pointerEvents="none" />

          {/* Centered lock */}
          <View style={s.lockCenter} pointerEvents="none">
            <View style={s.lockCircle}>
              <LockIcon size={28} color="#FFFFFF" />
            </View>
          </View>
        </View>
      </View>

      {/* Issues found badge */}
      <View style={s.issueBadgeWrap}>
        <View style={s.issueBadge}>
          <Text style={s.issueText}>{t('resultsPreview.findings', { count: findingsCount })}</Text>
        </View>
      </View>

      {/* Headline + subtitle */}
      <Text style={s.headline}>Your personalized plan is ready</Text>
      <Text style={s.subtitle}>Unlock your results to see what to fix first.</Text>

      <View style={{ height: 32 }} />

      {/* CTA */}
      <TouchableOpacity
        style={s.cta}
        activeOpacity={0.9}
        onPress={() =>
          router.push({
            pathname: '/(auth)/create-account',
            params: {
              onboardingData: params.onboardingData,
              analysisResult: params.analysisResult,
              photoFront: params.photoFront,
            },
          })
        }
      >
        <Text style={s.ctaText}>See My Results</Text>
      </TouchableOpacity>

      {/* Trust signal */}
      <View style={s.trustRow}>
        <ShieldCheck size={14} color="rgba(255,255,255,0.5)" />
        <Text style={s.trustText}>Takes 30 seconds  ·  No commitment</Text>
      </View>
    </View>
  );
}

const CARD_RADIUS = 28;

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0420',
    paddingHorizontal: 24,
    alignItems: 'center',
  },

  // Wordmark
  wordmarkRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 28,
  },
  wordmarkSkin: {
    fontFamily: Fonts.bold,
    color: '#FFFFFF',
    fontSize: 26,
    letterSpacing: -0.6,
  },
  wordmarkX: {
    fontFamily: Fonts.bold,
    color: '#F87171',
    fontSize: 26,
    letterSpacing: -0.6,
  },

  // Card
  cardWrap: {
    width: CARD_SIZE,
    height: CARD_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardGlow: {
    position: 'absolute',
    top: -8,
    bottom: -8,
    left: -8,
    right: -8,
    borderRadius: CARD_RADIUS + 8,
    backgroundColor: 'transparent',
    shadowColor: '#7C5CFC',
    shadowOpacity: 0.85,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 0 },
    elevation: 18,
    borderWidth: 1,
    borderColor: 'rgba(124,92,252,0.35)',
  },
  card: {
    width: CARD_SIZE,
    height: CARD_SIZE,
    borderRadius: CARD_RADIUS,
    overflow: 'hidden',
    backgroundColor: '#15082E',
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.25)',
  },
  fakeContent: {
    flex: 1,
  },
  fakePhoto: {
    width: '100%',
    height: '62%',
  },
  fakeBody: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 14,
    gap: 10,
  },
  fakeBadgeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  fakeYellowPill: {
    width: 56,
    height: 18,
    borderRadius: 6,
    backgroundColor: '#D4A017',
    opacity: 0.85,
  },
  fakePinkPill: {
    width: 140,
    height: 18,
    borderRadius: 6,
    backgroundColor: '#D14B5A',
    opacity: 0.85,
  },
  fakeTitleBar: {
    width: '80%',
    height: 14,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.35)',
    marginTop: 4,
  },
  fakeTextRow: {
    width: '90%',
    height: 8,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  cardDim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10,4,32,0.35)',
  },
  lockCenter: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Issue badge
  issueBadgeWrap: {
    alignItems: 'center',
    marginTop: 28,
  },
  issueBadge: {
    backgroundColor: '#F26F7A',
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 999,
  },
  issueText: {
    fontFamily: Fonts.bold,
    fontSize: 16,
    color: '#FFFFFF',
    letterSpacing: -0.1,
  },

  // Headline
  headline: {
    fontFamily: Fonts.bold,
    fontSize: 28,
    lineHeight: 34,
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: -0.6,
    marginTop: 18,
    paddingHorizontal: 8,
  },
  subtitle: {
    fontFamily: Fonts.regular,
    fontSize: 15,
    lineHeight: 22,
    color: 'rgba(255,255,255,0.55)',
    textAlign: 'center',
    marginTop: 10,
    paddingHorizontal: 8,
  },

  // CTA
  cta: {
    width: '100%',
    height: 60,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    fontFamily: Fonts.bold,
    fontSize: 18,
    color: '#0A0420',
    letterSpacing: -0.2,
  },

  // Trust
  trustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
  },
  trustText: {
    fontFamily: Fonts.medium,
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: -0.05,
  },
});
