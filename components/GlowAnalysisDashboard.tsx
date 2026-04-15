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
import Svg, { Path, Circle as SvgCircle } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Fonts } from '@/lib/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Types ──────────────────────────────────────────────────────────────────

export interface SnapshotCardData {
  id: string;
  label: string;
  severity: string;
  severityColor: string;
  iconType: 'circle' | 'lightning' | 'droplet' | 'sparkle';
  iconColor: string;
}

export interface RecommendationData {
  icon: 'sun' | 'sparkles' | 'droplet';
  title: string;
  subtitle: string;
  accentColor: string;
  glowColor: string;
}

export interface GlowAnalysisDashboardProps {
  avatarUri?: string;
  headline?: string;
  description?: string;
  mainConcern?: string;
  severity?: string;
  severityColor?: string;
  skinType?: string;
  snapshotItems?: SnapshotCardData[];
  recommendations?: RecommendationData[];
  onStartPlan?: () => void;
  onSnapshotPress?: (id: string) => void;
  onRecommendationPress?: (index: number) => void;
  onViewFullScan?: () => void;
}

// ─── Default data (matches the reference design exactly) ────────────────────

const DEFAULT_SNAPSHOTS: SnapshotCardData[] = [
  { id: 'dark_marks',  label: 'Dark marks',  severity: 'Mild', severityColor: '#53E6B0', iconType: 'circle',    iconColor: '#F6BE63' },
  { id: 'active_acne', label: 'Active acne', severity: 'Low',  severityColor: '#53E6B0', iconType: 'lightning', iconColor: '#53E6B0' },
  { id: 'tzone_oil',   label: 'T-zone oil',  severity: 'Mild', severityColor: '#53E6B0', iconType: 'droplet',   iconColor: '#60A5FA' },
  { id: 'tzone_oil_2', label: 'T-zone oil',  severity: 'Mild', severityColor: '#53E6B0', iconType: 'droplet',   iconColor: '#60A5FA' },
];

const DEFAULT_RECOMMENDATIONS: RecommendationData[] = [
  { icon: 'sun',      title: 'Daily SPF protection', subtitle: 'Use SPF 30+ to prevent dark marks',    accentColor: '#F6BE63', glowColor: 'rgba(255,190,99,0.14)' },
  { icon: 'sparkles', title: 'Vitamin C serum',      subtitle: 'Fade dark spots and brighten skin',    accentColor: '#FF9AD8', glowColor: 'rgba(255,144,209,0.12)' },
  { icon: 'droplet',  title: 'Mild AHA exfoliant',   subtitle: 'Exfoliate weekly to renew skin',       accentColor: '#8F7CFF', glowColor: 'rgba(110,123,255,0.12)' },
];

// ─── SVG Icon Components ────────────────────────────────────────────────────

function ChevronRight({ size = 18, color = 'rgba(228,221,255,0.38)' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M9 18l6-6-6-6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function CheckMark({ color }: { color: string }) {
  return (
    <Svg width={17} height={17} viewBox="0 0 24 24" fill="none">
      <Path d="M20 6L9 17l-5-5" stroke={color} strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function SnapshotIcon({ type, color, size = 16 }: { type: SnapshotCardData['iconType']; color: string; size?: number }) {
  switch (type) {
    case 'circle':
      return <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }} />;
    case 'lightning':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill={color} />
        </Svg>
      );
    case 'droplet':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0L12 2.69z" fill={color} />
        </Svg>
      );
    case 'sparkle':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8L12 2z" fill={color} />
        </Svg>
      );
  }
}

function SunIcon({ size = 22, color = '#F6BE63' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <SvgCircle cx={12} cy={12} r={4} fill={color} />
      <Path
        d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function SparklesIcon({ size = 22, color = '#FF9AD8' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 3l1.8 5.4L19.2 12l-5.4 1.8L12 21l-1.8-7.2L4.8 12l5.4-1.8L12 3z" fill={color} />
      <Path d="M20 4l.5 1.5L22 6l-1.5.5L20 8l-.5-1.5L18 6l1.5-.5L20 4z" fill={color} opacity={0.6} />
    </Svg>
  );
}

function DropletIconLarge({ size = 22, color = '#8F7CFF' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0L12 2.69z" fill={color} />
    </Svg>
  );
}

function RecommendationIcon({ icon }: { icon: RecommendationData['icon'] }) {
  switch (icon) {
    case 'sun':      return <SunIcon />;
    case 'sparkles': return <SparklesIcon />;
    case 'droplet':  return <DropletIconLarge />;
  }
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function GlowAnalysisDashboard({
  avatarUri,
  headline = 'Mostly Clear Skin',
  description = 'A few post-acne dark marks are visible on your cheeks. No major active breakouts were detected today.',
  mainConcern = 'Dark marks',
  severity = 'Low',
  severityColor = '#53E6B0',
  skinType = 'Combination',
  snapshotItems = DEFAULT_SNAPSHOTS,
  recommendations = DEFAULT_RECOMMENDATIONS,
  onStartPlan,
  onSnapshotPress,
  onRecommendationPress,
  onViewFullScan,
}: GlowAnalysisDashboardProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.screen}>
      {/* ── Deep gradient base ────────────────────────────────────────────── */}
      <LinearGradient
        colors={['#050210', '#0A0320', '#14052C']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* ── Fixed ambient glow orbs (behind content) ─────────────────────── */}
      <View
        style={[
          styles.bgGlow,
          { top: 70, left: -60, width: 260, height: 260, backgroundColor: 'rgba(120,70,255,0.16)', shadowColor: '#7C4DFF', shadowRadius: 90 },
        ]}
        pointerEvents="none"
      />
      <View
        style={[
          styles.bgGlow,
          { top: 330, right: -70, width: 280, height: 280, backgroundColor: 'rgba(255,90,200,0.10)', shadowColor: '#FF5AC8', shadowRadius: 100 },
        ]}
        pointerEvents="none"
      />
      <View
        style={[
          styles.bgGlow,
          { bottom: 100, left: 10, width: 300, height: 300, backgroundColor: 'rgba(82,120,255,0.08)', shadowColor: '#6C7DFF', shadowRadius: 110 },
        ]}
        pointerEvents="none"
      />
      <View
        style={[
          styles.bgGlow,
          { top: 520, right: -30, width: 220, height: 220, backgroundColor: 'rgba(140,92,255,0.14)', shadowColor: '#8C5CFF', shadowRadius: 90 },
        ]}
        pointerEvents="none"
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 14 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Top row: avatar + summary ──────────────────────────────────── */}
        <View style={styles.topRow}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]} />
          )}
          <View style={styles.topTextWrap}>
            <Text style={styles.topTitle}>{headline}</Text>
            <Text style={styles.topSubtitle} numberOfLines={4}>
              {description}
            </Text>
          </View>
        </View>

        {/* ── Hero card (glassmorphism) ──────────────────────────────────── */}
        <View style={styles.heroCard}>
          {/* Purple gradient wash */}
          <LinearGradient
            colors={['rgba(120,72,255,0.22)', 'rgba(66,25,130,0.14)', 'rgba(20,10,40,0.10)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          {/* Top-left inner bloom */}
          <View style={styles.heroInnerGlow} pointerEvents="none" />
          {/* Bottom-right corner bloom */}
          <View style={styles.heroCornerGlow} pointerEvents="none" />
          {/* Bottom-right highlight streak */}
          <View style={styles.heroHighlightStreak} pointerEvents="none" />

          <Text style={styles.heroTitle}>{headline}</Text>
          <Text style={styles.heroBody}>{description}</Text>

          {/* Pill row: main concern + severity */}
          <View style={styles.pillRow}>
            <View style={styles.infoPill}>
              <View style={[styles.dot, { backgroundColor: '#F6BE63', marginRight: 10 }]} />
              <Text style={styles.pillLabel}>Main concern:</Text>
              <Text style={styles.pillValue}>{mainConcern}</Text>
            </View>
            <View style={styles.statusPill}>
              <CheckMark color={severityColor} />
              <Text style={[styles.statusText, { color: severityColor }]}>{severity}</Text>
            </View>
          </View>

          {/* Pill: skin type */}
          <View style={[styles.infoPill, { alignSelf: 'flex-start' }]}>
            <Svg width={15} height={15} viewBox="0 0 24 24" fill="none" style={{ marginRight: 10 }}>
              <Path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0L12 2.69z" fill="#9C6BFF" />
            </Svg>
            <Text style={styles.pillLabel}>Skin type:</Text>
            <Text style={styles.pillValue}>{skinType}</Text>
          </View>
        </View>

        {/* ── YOUR SKIN SNAPSHOT ─────────────────────────────────────────── */}
        <Text style={styles.sectionLabel}>Your Skin Snapshot</Text>
        <View style={styles.grid}>
          {snapshotItems.map((item, i) => (
            <TouchableOpacity
              key={item.id + '-' + i}
              style={[
                styles.snapshotCard,
                i % 2 === 0 ? { marginRight: 10 } : { marginLeft: 10 },
              ]}
              activeOpacity={0.72}
              onPress={() => onSnapshotPress?.(item.id)}
            >
              {/* Corner glows */}
              <View style={[styles.snapGlowA, { backgroundColor: item.iconColor + '1C' }]} pointerEvents="none" />
              <View style={styles.snapGlowB} pointerEvents="none" />

              {/* Horizontal layout */}
              <View style={styles.snapRow}>
                {/* Icon with halo */}
                <View style={[styles.snapIconHalo, { backgroundColor: item.iconColor + '22' }]}>
                  <SnapshotIcon type={item.iconType} color={item.iconColor} size={16} />
                </View>

                {/* Label + sublabel */}
                <View style={styles.snapTextWrap}>
                  <Text style={styles.snapTitle}>{item.label}</Text>
                  <Text style={[styles.snapSub, { color: item.severityColor }]}>{item.severity}</Text>
                </View>

                {/* Severity text + chevron */}
                <Text style={[styles.snapSeverity, { color: item.severityColor }]}>{item.severity}</Text>
                <ChevronRight size={16} color="rgba(228,221,255,0.38)" />
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── DO THIS TODAY ──────────────────────────────────────────────── */}
        <Text style={styles.sectionLabel}>Do This Today</Text>
        {recommendations.map((rec, i) => (
          <TouchableOpacity
            key={i}
            style={styles.recCard}
            activeOpacity={0.72}
            onPress={() => onRecommendationPress?.(i)}
          >
            {/* Per-card glow orb on the left */}
            <View style={[styles.recGlowOrb, { backgroundColor: rec.glowColor }]} pointerEvents="none" />
            {/* Left accent bar */}
            <View style={[styles.recLeftEdge, { backgroundColor: rec.accentColor }]} />

            <View style={styles.recRow}>
              <View style={styles.recIconWrap}>
                <RecommendationIcon icon={rec.icon} />
              </View>
              <View style={styles.recTextWrap}>
                <Text style={styles.recTitle}>{rec.title}</Text>
                <Text style={styles.recSubtitle} numberOfLines={1}>
                  {rec.subtitle}
                </Text>
              </View>
              <ChevronRight size={18} color="rgba(228,221,255,0.42)" />
            </View>
          </TouchableOpacity>
        ))}

        {/* ── CTA Button ────────────────────────────────────────────────── */}
        <TouchableOpacity style={styles.ctaButton} activeOpacity={0.85} onPress={onStartPlan}>
          <LinearGradient
            colors={['#6E46FF', '#8B5CFF', '#9A73FF']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.ctaGradient}
          >
            {/* Right-side inner gloss */}
            <View style={styles.ctaInnerGlow} pointerEvents="none" />
            <Text style={styles.ctaText}>Start My Plan</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* ── Secondary link ─────────────────────────────────────────────── */}
        <TouchableOpacity style={styles.secondaryBtn} onPress={onViewFullScan}>
          <Text style={styles.secondaryText}>View Full Scan</Text>
        </TouchableOpacity>

        <View style={{ height: insets.bottom + 24 }} />
      </ScrollView>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const SNAP_CARD_W = (SCREEN_WIDTH - 44 - 10) / 2;

const styles = StyleSheet.create({
  // ── Screen ────────────────────────────────────────────────────────────────
  screen: {
    flex: 1,
    backgroundColor: '#050210',
  },
  content: {
    paddingHorizontal: 22,
    paddingBottom: 40,
  },

  // ── Background glow orbs ─────────────────────────────────────────────────
  bgGlow: {
    position: 'absolute',
    borderRadius: 999,
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 0 },
  },

  // ── Top row ──────────────────────────────────────────────────────────────
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 18,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 20,
    marginRight: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  avatarPlaceholder: {
    backgroundColor: 'rgba(120,70,255,0.30)',
  },
  topTextWrap: {
    flex: 1,
    paddingTop: 2,
  },
  topTitle: {
    color: '#F7F3FF',
    fontFamily: Fonts.bold,
    fontSize: 22,
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  topSubtitle: {
    color: 'rgba(236,228,255,0.76)',
    fontFamily: Fonts.regular,
    fontSize: 14,
    lineHeight: 22,
  },

  // ── Hero card ────────────────────────────────────────────────────────────
  heroCard: {
    overflow: 'hidden',
    borderRadius: 28,
    padding: 22,
    marginBottom: 28,
    backgroundColor: 'rgba(32,16,70,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(167,130,255,0.20)',
    shadowColor: '#7B4DFF',
    shadowOpacity: 0.35,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  heroInnerGlow: {
    position: 'absolute',
    top: -20,
    left: -20,
    width: 220,
    height: 160,
    borderRadius: 999,
    backgroundColor: 'rgba(164,112,255,0.16)',
  },
  heroCornerGlow: {
    position: 'absolute',
    right: -20,
    bottom: -10,
    width: 140,
    height: 140,
    borderRadius: 999,
    backgroundColor: 'rgba(120,92,255,0.12)',
  },
  heroHighlightStreak: {
    position: 'absolute',
    bottom: 18,
    right: 18,
    width: 180,
    height: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(187,147,255,0.55)',
    shadowColor: '#C49BFF',
    shadowOpacity: 0.8,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
  },
  heroTitle: {
    color: '#F7F3FF',
    fontFamily: Fonts.bold,
    fontSize: 28,
    letterSpacing: -0.7,
    marginBottom: 12,
  },
  heroBody: {
    color: 'rgba(236,228,255,0.78)',
    fontFamily: Fonts.regular,
    fontSize: 15,
    lineHeight: 25,
    marginBottom: 18,
    maxWidth: '93%',
  },
  pillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 12,
  },
  infoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(78,49,146,0.34)',
    borderWidth: 1,
    borderColor: 'rgba(196,176,255,0.08)',
    marginRight: 10,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 18,
    backgroundColor: 'rgba(78,49,146,0.30)',
    borderWidth: 1,
    borderColor: 'rgba(196,176,255,0.08)',
    gap: 6,
  },
  statusText: {
    fontFamily: Fonts.bold,
    fontSize: 15,
  },
  pillLabel: {
    color: 'rgba(228,220,255,0.76)',
    fontFamily: Fonts.regular,
    fontSize: 14,
    marginRight: 6,
  },
  pillValue: {
    color: '#F8F4FF',
    fontFamily: Fonts.bold,
    fontSize: 14,
  },
  dot: {
    width: 13,
    height: 13,
    borderRadius: 999,
  },

  // ── Section label ────────────────────────────────────────────────────────
  sectionLabel: {
    color: 'rgba(193,177,227,0.65)',
    fontFamily: Fonts.semibold,
    fontSize: 13,
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginBottom: 16,
  },

  // ── Snapshot grid ────────────────────────────────────────────────────────
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 28,
  },
  snapshotCard: {
    width: SNAP_CARD_W,
    overflow: 'hidden',
    borderRadius: 20,
    padding: 14,
    paddingVertical: 16,
    marginBottom: 12,
    backgroundColor: 'rgba(25,12,58,0.80)',
    borderWidth: 1,
    borderColor: 'rgba(130,94,230,0.16)',
    shadowColor: '#6F42FF',
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  snapGlowA: {
    position: 'absolute',
    top: -10,
    left: -10,
    width: 110,
    height: 110,
    borderRadius: 999,
  },
  snapGlowB: {
    position: 'absolute',
    bottom: -18,
    right: -8,
    width: 90,
    height: 90,
    borderRadius: 999,
    backgroundColor: 'rgba(103,130,255,0.07)',
  },
  snapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  snapIconHalo: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  snapTextWrap: {
    flex: 1,
  },
  snapTitle: {
    color: '#F7F3FF',
    fontFamily: Fonts.semibold,
    fontSize: 13,
    marginBottom: 2,
  },
  snapSub: {
    fontFamily: Fonts.regular,
    fontSize: 11,
    opacity: 0.8,
  },
  snapSeverity: {
    fontFamily: Fonts.bold,
    fontSize: 13,
    marginRight: 2,
  },

  // ── Recommendation cards ─────────────────────────────────────────────────
  recCard: {
    overflow: 'hidden',
    borderRadius: 22,
    paddingVertical: 18,
    paddingHorizontal: 18,
    marginBottom: 14,
    backgroundColor: 'rgba(27,13,61,0.82)',
    borderWidth: 1,
    borderColor: 'rgba(145,112,255,0.16)',
    shadowColor: '#6E41FF',
    shadowOpacity: 0.20,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 7,
  },
  recGlowOrb: {
    position: 'absolute',
    left: -18,
    top: 12,
    width: 90,
    height: 90,
    borderRadius: 999,
  },
  recLeftEdge: {
    position: 'absolute',
    left: 0,
    top: 14,
    bottom: 14,
    width: 3.5,
    borderRadius: 999,
  },
  recRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recIconWrap: {
    width: 30,
    alignItems: 'center',
    marginRight: 12,
  },
  recTextWrap: {
    flex: 1,
  },
  recTitle: {
    color: '#F7F3FF',
    fontFamily: Fonts.semibold,
    fontSize: 16,
    marginBottom: 5,
  },
  recSubtitle: {
    color: 'rgba(236,228,255,0.70)',
    fontFamily: Fonts.regular,
    fontSize: 14,
  },

  // ── CTA ──────────────────────────────────────────────────────────────────
  ctaButton: {
    borderRadius: 999,
    overflow: 'hidden',
    marginTop: 10,
    shadowColor: '#8A5CFF',
    shadowOpacity: 0.38,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  ctaGradient: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(210,190,255,0.18)',
    overflow: 'hidden',
  },
  ctaInnerGlow: {
    position: 'absolute',
    right: 30,
    top: 6,
    width: 120,
    height: 50,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  ctaText: {
    color: '#FFFFFF',
    fontFamily: Fonts.bold,
    fontSize: 18,
    letterSpacing: 0.2,
  },

  // ── Secondary ────────────────────────────────────────────────────────────
  secondaryBtn: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  secondaryText: {
    color: 'rgba(228,220,255,0.42)',
    fontFamily: Fonts.semibold,
    fontSize: 15,
  },
});
