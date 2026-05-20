import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Dimensions,
  Image,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Svg, { Path, Circle } from 'react-native-svg';

const { width } = Dimensions.get('window');

// ─── Icons ────────────────────────────────────────────────────────────────────

function CheckCircle({ size = 18, color = '#C4B5FD' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={9.5} stroke={color} strokeWidth={1.6} />
      <Path d="M8 12.2l2.6 2.6L16 9.4" stroke={color} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function LockIcon({ size = 22, color = '#C4B5FD', strokeWidth = 2 }: { size?: number; color?: string; strokeWidth?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4.5 12.9c0-1.33 1.07-2.4 2.4-2.4h10.2a2.4 2.4 0 0 1 2.4 2.4v5.7a2.4 2.4 0 0 1-2.4 2.4H6.9a2.4 2.4 0 0 1-2.4-2.4v-5.7Z" stroke={color} strokeWidth={strokeWidth} fill="none" />
      <Path d="M7.5 10.5V7.2a4.5 4.5 0 0 1 9 0v3.3" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" fill="none" />
      <Circle cx={12} cy={15.4} r={1.35} fill={color} />
    </Svg>
  );
}

function ChevronR({ size = 22, color = '#FFFFFF' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M9 6l6 6-6 6" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// ─── Locked row ───────────────────────────────────────────────────────────────

function LockedRow({
  imgSrc,
  title,
  preview,
}: {
  imgSrc: any;
  title: string;
  preview: string[][];
}) {
  return (
    <LinearGradient
      colors={['rgba(255,255,255,0.045)', 'rgba(255,255,255,0.02)']}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.row}
    >
      <View style={styles.iconTile}>
        <Image source={imgSrc} style={styles.iconImg} resizeMode="contain" />
      </View>

      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>{title}</Text>

        {/* Blurred preview lines */}
        <View style={styles.previewWrap}>
          {preview.map((cells, i) => (
            <View key={i} style={styles.previewRow}>
              {cells.map((t, j) => (
                <React.Fragment key={j}>
                  {j > 0 && <Text style={styles.previewDot}>·</Text>}
                  <Text style={styles.previewText} numberOfLines={1}>
                    {t}
                  </Text>
                </React.Fragment>
              ))}
            </View>
          ))}
          {/* Frost overlay to fake blur(5px) */}
          <BlurView intensity={18} tint="dark" style={StyleSheet.absoluteFillObject} pointerEvents="none" />
        </View>
      </View>

      <View style={styles.lockChip}>
        <LockIcon size={22} color="#C4B5FD" strokeWidth={2} />
      </View>
    </LinearGradient>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ResultsPreviewScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    onboardingData?: string;
    analysisResult?: string;
    photoFront?: string;
  }>();

  const goCreate = () =>
    router.push({
      pathname: '/(auth)/create-account',
      params: {
        onboardingData: params.onboardingData,
        analysisResult: params.analysisResult,
        photoFront: params.photoFront,
      },
    });

  const goSkip = () => router.replace('/(tabs)');

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" />

      {/* Faint violet wash at top */}
      <LinearGradient
        colors={['rgba(60,28,140,0.22)', 'rgba(60,28,140,0.08)', 'transparent']}
        style={styles.topWash}
        pointerEvents="none"
      />

      <View style={styles.content}>
        {/* Wordmark */}
        <View style={styles.wordmarkRow}>
          <Text style={styles.wordmarkSkin}>Skin</Text>
          <Text style={styles.wordmarkX}>X</Text>
        </View>

        {/* Scan complete pill */}
        <View style={styles.pillRow}>
          <View style={styles.pill}>
            <CheckCircle size={18} color="#C4B5FD" />
            <Text style={styles.pillText}>Scan complete</Text>
          </View>
        </View>

        {/* Headline */}
        <Text style={styles.headline}>Your results{'\n'}are ready</Text>

        {/* Subtitle */}
        <Text style={styles.subtitle}>
          We created a personalized skin plan based on your scan.
        </Text>

        {/* Lock orb */}
        <View style={styles.orbWrap}>
          <View style={styles.orbBloom} pointerEvents="none" />
          <Image
            source={require('@/assets/images/paywall-lock-orb.png')}
            style={styles.orbImage}
            resizeMode="cover"
          />
          {/* Fade-to-black masks to dissolve image edges into bg */}
          <LinearGradient
            colors={['#000000', 'rgba(0,0,0,0)']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.orbFadeLeft}
            pointerEvents="none"
          />
          <LinearGradient
            colors={['rgba(0,0,0,0)', '#000000']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.orbFadeRight}
            pointerEvents="none"
          />
          <LinearGradient
            colors={['#000000', 'rgba(0,0,0,0)']}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={styles.orbFadeTop}
            pointerEvents="none"
          />
          <LinearGradient
            colors={['rgba(0,0,0,0)', '#000000']}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={styles.orbFadeBottom}
            pointerEvents="none"
          />
        </View>

        {/* Locked rows */}
        <View style={styles.rows}>
          <LockedRow
            imgSrc={require('@/assets/images/paywall-icon-skin-insights.png')}
            title="Skin insights"
            preview={[
              ['Hydration: 62', 'Pore visibility: moderate', 'Texture: smooth'],
              ['Pigment: even', 'Redness: low', 'Sebum: balanced'],
            ]}
          />
          <LockedRow
            imgSrc={require('@/assets/images/paywall-icon-am-pm.png')}
            title="AM + PM routine"
            preview={[
              ['Cleanser', 'Vitamin C serum', 'SPF 50'],
              ['Retinol night', 'Moisturizer', 'Sleep mask'],
            ]}
          />
          <LockedRow
            imgSrc={require('@/assets/images/paywall-icon-product-picks.png')}
            title="Product picks"
            preview={[
              ['CeraVe Foaming', "Paula's Choice 2%", 'Beauty of Joseon'],
              ['La Roche-Posay', 'The Ordinary Niacin', 'Krave Beet Aloe'],
            ]}
          />
        </View>

        {/* CTA */}
        <View style={styles.ctaWrap}>
          <View style={styles.ctaGlow} pointerEvents="none" />
          <TouchableOpacity activeOpacity={0.9} onPress={goCreate} style={styles.ctaTouch}>
            <LinearGradient
              colors={['#C9B0FF', '#9978FF', '#7C5CFC', '#5B21B6']}
              locations={[0, 0.22, 0.6, 1]}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={styles.cta}
            >
              <Text style={styles.ctaText}>Create account to continue</Text>
              <View style={styles.ctaChev}>
                <ChevronR size={22} color="#FFFFFF" />
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Not now */}
        <TouchableOpacity onPress={goSkip} activeOpacity={0.7} style={styles.notNowTouch}>
          <Text style={styles.notNow}>Not now</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const ORB_W = Math.min(340, width - 40);
const ORB_H = (ORB_W * 320) / 340;

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#000000',
  },
  topWash: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 380,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },

  // Wordmark
  wordmarkRow: {
    flexDirection: 'row',
    alignSelf: 'center',
    alignItems: 'baseline',
    marginBottom: 18,
  },
  wordmarkSkin: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -0.8,
  },
  wordmarkX: {
    color: '#7C5CFC',
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -0.8,
  },

  // Pill
  pillRow: { alignItems: 'center', marginBottom: 20 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingLeft: 16,
    paddingRight: 22,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: 'rgba(124,92,252,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.38)',
  },
  pillText: {
    color: '#C4B5FD',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.1,
  },

  // Headline
  headline: {
    color: '#FFFFFF',
    fontSize: 46,
    lineHeight: 48,
    fontWeight: '700',
    letterSpacing: -1.6,
    textAlign: 'center',
  },

  // Subtitle
  subtitle: {
    color: '#C4B5FD',
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '400',
    letterSpacing: -0.1,
    textAlign: 'center',
    maxWidth: 310,
    alignSelf: 'center',
    marginTop: 14,
  },

  // Orb
  orbWrap: {
    width: ORB_W,
    height: ORB_H,
    alignSelf: 'center',
    marginTop: 2,
    marginBottom: -8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbBloom: {
    position: 'absolute',
    top: 40,
    bottom: 40,
    left: 40,
    right: 40,
    borderRadius: 9999,
    backgroundColor: 'rgba(124,92,252,0.14)',
    shadowColor: '#7C5CFC',
    shadowOpacity: 0.55,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 0 },
  },
  orbImage: {
    width: '100%',
    height: '100%',
  },
  orbFadeLeft: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '38%',
  },
  orbFadeRight: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: '38%',
  },
  orbFadeTop: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: '18%',
  },
  orbFadeBottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '18%',
  },

  // Rows
  rows: {
    gap: 10,
    marginTop: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingLeft: 16,
    paddingRight: 18,
    paddingVertical: 18,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    minHeight: 108,
  },
  iconTile: {
    width: 64,
    height: 64,
    borderRadius: 16,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconImg: {
    width: 64,
    height: 64,
  },
  rowText: { flex: 1, minWidth: 0 },
  rowTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    lineHeight: 26,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  previewWrap: {
    marginTop: 10,
    gap: 7,
    overflow: 'hidden',
    borderRadius: 4,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  previewText: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 12,
    fontWeight: '500',
    opacity: 0.55,
  },
  previewDot: {
    color: 'rgba(167,139,250,0.85)',
    fontSize: 12,
    fontWeight: '700',
  },
  lockChip: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(124,92,252,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // CTA
  ctaWrap: {
    marginTop: 20,
    position: 'relative',
  },
  ctaGlow: {
    position: 'absolute',
    top: -14,
    bottom: -14,
    left: -14,
    right: -14,
    borderRadius: 999,
    backgroundColor: 'rgba(124,92,252,0.45)',
    shadowColor: '#7C5CFC',
    shadowOpacity: 0.9,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 12 },
  },
  ctaTouch: {
    borderRadius: 999,
    overflow: 'hidden',
  },
  cta: {
    height: 68,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.4)',
  },
  ctaText: {
    flex: 1,
    textAlign: 'center',
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '600',
    letterSpacing: -0.2,
    marginLeft: 22,
  },
  ctaChev: {
    width: 22,
    alignItems: 'flex-end',
  },

  // Not now
  notNowTouch: { alignSelf: 'center', marginTop: 18, padding: 4 },
  notNow: {
    color: '#A78BFA',
    fontSize: 17,
    fontWeight: '500',
    letterSpacing: -0.1,
    opacity: 0.7,
  },
});
