import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Fonts } from '@/lib/theme';
import AcneMapHero from '@/components/AcneMapHero';
import type { Detection, ZoneScore, SkinAssessmentItem } from '@/lib/scan-types';
import FaceZoneSummary from './FaceZoneSummary';
import SkinStrengthsWeaknesses from './SkinStrengthsWeaknesses';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Types ──────────────────────────────────────────────────────────────────

export interface GlowAnalysisDashboardProps {
  avatarUri: string;
  headline: string;
  description: string;
  mainConcern: string;
  severity: string;
  skinType: string;
  detections: Detection[];
  imageNativeWidth: number;
  imageNativeHeight: number;
  zoneScores?: ZoneScore[];
  skinAssessment?: SkinAssessmentItem[];
  onScanAgain?: () => void;
  onStartPlan?: () => void;
  onViewFullScan?: () => void;
}

// ─── SVG Icon Components ────────────────────────────────────────────────────

function CheckMark({ color }: { color: string }) {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <Path d="M20 6L9 17l-5-5" stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}


// ─── Main Component ─────────────────────────────────────────────────────────

export default function GlowAnalysisDashboard({
  avatarUri,
  headline,
  description,
  mainConcern,
  severity,
  skinType,
  detections,
  imageNativeWidth,
  imageNativeHeight,
  zoneScores,
  skinAssessment,
  onStartPlan,
  onScanAgain,
  onViewFullScan,
}: GlowAnalysisDashboardProps) {
  const insets = useSafeAreaInsets();

  const severityColor =
    severity === 'severe' ? '#f87171' :
    severity === 'moderate' ? '#fb923c' :
    '#4ade80';

  return (
    <View style={styles.screen}>
      {/* ── Deep gradient base ────────────────────────────────────────────── */}
      <LinearGradient
        colors={['#050210', '#080310', '#0A0320']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 14, paddingBottom: 140 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero scan image / acne map ─────────────────────────────────── */}
        {avatarUri && detections && detections.length > 0 && imageNativeWidth && imageNativeHeight ? (
          <AcneMapHero
            imageUri={avatarUri}
            imageWidth={imageNativeWidth}
            imageHeight={imageNativeHeight}
            detections={detections}
          />
        ) : avatarUri ? (
          <Image
            source={{ uri: avatarUri }}
            style={styles.heroImage}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.heroImage, styles.heroImagePlaceholder]} />
        )}

        {/* ── Hero card (glassmorphism) ──────────────────────────────────── */}
        <View style={styles.heroCard}>
          {/* Purple gradient wash */}
          <LinearGradient
            colors={['#2D1B54', '#140A2B']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[StyleSheet.absoluteFill, { borderRadius: 24 }]}
          />

          <Text style={styles.heroTitle}>{headline}</Text>
          <Text style={styles.heroBody}>{description}</Text>

          {/* Pill row: main concern + severity */}
          <View style={styles.pillRow}>
            <View style={styles.infoPill}>
              <View style={[styles.dot, { backgroundColor: '#E88B53', marginRight: 10 }]} />
              <Text style={styles.pillLabel}>Main concern:</Text>
              <Text style={styles.pillValue}>{mainConcern}</Text>
            </View>
            <View style={styles.statusPill}>
              <CheckMark color={severityColor} />
              <Text style={[styles.statusText, { color: severityColor }]}>{severity}</Text>
            </View>
          </View>

          {/* Pill: skin type */}
          <View style={[styles.infoPill, { alignSelf: 'flex-start', marginRight: 0 }]}>
            <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" style={{ marginRight: 10 }}>
              <Path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0L12 2.69z" fill="#7C5BFF" />
            </Svg>
            <Text style={styles.pillLabel}>Skin type:</Text>
            <Text style={styles.pillValue}>{skinType}</Text>
          </View>
        </View>

        {/* ── Face Zone Summary ──────────────────────────────────────────── */}
        <FaceZoneSummary zones={zoneScores ?? []} />

        {/* ── Strengths & Weaknesses ─────────────────────────────────────── */}
        <SkinStrengthsWeaknesses assessment={skinAssessment ?? []} />
      </ScrollView>

      {/* ── Fixed Bottom Button Area ─────────────────────────────────────── */}
      <View style={styles.bottomCtaWrap}>
        <LinearGradient
          colors={['transparent', '#0A0413', '#0A0413']}
          locations={[0, 0.35, 1]}
          style={[styles.bottomCtaGradient, { paddingBottom: 10 }]}
        >
          <TouchableOpacity
            style={styles.ctaButton}
            activeOpacity={0.85}
            onPress={onStartPlan}
          >
            <LinearGradient
              colors={['#2B1A65', '#4828A2', '#2B1A65']}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.ctaGradient}
            >
              <Text style={styles.ctaText}>Start My Plan</Text>
            </LinearGradient>
          </TouchableOpacity>

          {onScanAgain && (
            <TouchableOpacity style={styles.scanAgainBtn} onPress={onScanAgain} activeOpacity={0.7}>
              <Text style={styles.scanAgainText}>Take Another Scan</Text>
            </TouchableOpacity>
          )}
        </LinearGradient>
      </View>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // ── Screen ────────────────────────────────────────────────────────────────
  screen: {
    flex: 1,
    backgroundColor: '#080310',
  },
  content: {
    paddingHorizontal: 20,
  },

  // ── Hero scan image ───────────────────────────────────────────────────────
  heroImage: {
    width: SCREEN_WIDTH * 0.65,
    height: 380,
    alignSelf: 'center',
    marginBottom: 24,
    borderRadius: 24,
  },
  heroImagePlaceholder: {
    backgroundColor: 'rgba(120,70,255,0.30)',
  },

  // ── Hero card ────────────────────────────────────────────────────────────
  heroCard: {
    overflow: 'hidden',
    borderRadius: 24,
    padding: 24,
    marginBottom: 28,
    shadowColor: '#7B4DFF',
    shadowOpacity: 0.35,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontFamily: Fonts.bold,
    fontSize: 22,
    marginBottom: 8,
  },
  heroBody: {
    color: '#8B80A5',
    fontFamily: Fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  pillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  infoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(0,0,0,0.20)',
    borderWidth: 1,
    borderColor: 'rgba(62,41,122,0.30)',
    marginRight: 8,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(0,0,0,0.30)',
    borderWidth: 1,
    borderColor: 'rgba(62,41,122,0.30)',
    gap: 6,
  },
  statusText: {
    fontFamily: Fonts.medium,
    fontSize: 13,
  },
  pillLabel: {
    color: '#8B80A5',
    fontFamily: Fonts.regular,
    fontSize: 13,
    marginRight: 4,
  },
  pillValue: {
    color: '#FFFFFF',
    fontFamily: Fonts.medium,
    fontSize: 13,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 999,
  },

  // ── Fixed Bottom CTA ────────────────────────────────────────────────────
  bottomCtaWrap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  bottomCtaGradient: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 8,
  },
  ctaButton: {
    borderRadius: 999,
    overflow: 'hidden',
  },
  ctaGradient: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
  },
  ctaText: {
    color: '#FFFFFF',
    fontFamily: Fonts.medium,
    fontSize: 16,
  },
  scanAgainBtn: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  scanAgainText: {
    color: 'rgba(228,220,255,0.55)',
    fontFamily: Fonts.medium,
    fontSize: 14,
  },
});
