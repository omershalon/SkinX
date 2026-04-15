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
  onScanAgain?: () => void;
  onSnapshotPress?: (id: string) => void;
  onRecommendationPress?: (index: number) => void;
  onViewFullScan?: () => void;
}

// ─── Default data (matches the reference design exactly) ────────────────────

const DEFAULT_SNAPSHOTS: SnapshotCardData[] = [
  { id: 'dark_marks',  label: 'Dark marks',  severity: 'Mild', severityColor: '#53E6B0', iconType: 'circle',    iconColor: '#E88B53' },
  { id: 'active_acne', label: 'Active acne', severity: 'Low',  severityColor: '#53E6B0', iconType: 'lightning', iconColor: '#4D9A8D' },
  { id: 'tzone_oil',   label: 'T-zone oil',  severity: 'Mild', severityColor: '#53E6B0', iconType: 'droplet',   iconColor: '#7C5BFF' },
  { id: 'tzone_oil_2', label: 'T-zone oil',  severity: 'Mild', severityColor: '#53E6B0', iconType: 'droplet',   iconColor: '#7C5BFF' },
];

const DEFAULT_RECOMMENDATIONS: RecommendationData[] = [
  { icon: 'sun',      title: 'Daily SPF protection', subtitle: 'Use SPF 30+ to prevent dark marks',    accentColor: '#E88B53', glowColor: 'rgba(232,139,83,0.22)' },
  { icon: 'sparkles', title: 'Vitamin C serum',      subtitle: 'Fade dark spots and brighten skin',    accentColor: '#E5D2A0', glowColor: 'rgba(229,210,160,0.18)' },
  { icon: 'droplet',  title: 'Mild AHA exfoliant',   subtitle: 'Exfoliate weekly to renew skin',       accentColor: '#7C5BFF', glowColor: 'rgba(124,91,255,0.25)' },
];

// ─── SVG Icon Components ────────────────────────────────────────────────────

function ChevronRight({ size = 16, color = '#7A6F95' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M9 18l6-6-6-6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function CheckMark({ color }: { color: string }) {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <Path d="M20 6L9 17l-5-5" stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}


function SnapshotIcon({ type, color, size = 16 }: { type: SnapshotCardData['iconType']; color: string; size?: number }) {
  switch (type) {
    case 'circle':
      return <View style={{ width: size * 0.65, height: size * 0.65, borderRadius: size / 2, backgroundColor: color }} />;
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

function SunIcon({ size = 20, color = '#E88B53' }: { size?: number; color?: string }) {
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

function SparklesIcon({ size = 20, color = '#E5D2A0' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 3l1.8 5.4L19.2 12l-5.4 1.8L12 21l-1.8-7.2L4.8 12l5.4-1.8L12 3z" fill={color} />
      <Path d="M20 4l.5 1.5L22 6l-1.5.5L20 8l-.5-1.5L18 6l1.5-.5L20 4z" fill={color} opacity={0.6} />
    </Svg>
  );
}

function DropletIconLarge({ size = 20, color = '#7C5BFF' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0L12 2.69z" fill={color} />
    </Svg>
  );
}

function RecommendationIcon({ icon, color }: { icon: RecommendationData['icon']; color?: string }) {
  switch (icon) {
    case 'sun':      return <SunIcon color={color} />;
    case 'sparkles': return <SparklesIcon color={color} />;
    case 'droplet':  return <DropletIconLarge color={color} />;
  }
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function GlowAnalysisDashboard({
  avatarUri,
  headline = 'Mostly Clear Skin',
  description = 'A few post-acne dark marks are visible on your cheeks. No major active breakouts were detected today.',
  mainConcern = 'Dark marks',
  severity = 'Low',
  severityColor = '#4D9A8D',
  skinType = 'Combination',
  snapshotItems = DEFAULT_SNAPSHOTS,
  recommendations = DEFAULT_RECOMMENDATIONS,
  onStartPlan,
  onScanAgain,
  onSnapshotPress,
  onRecommendationPress,
  onViewFullScan,
}: GlowAnalysisDashboardProps) {
  const insets = useSafeAreaInsets();

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
        {/* ── Hero scan image ────────────────────────────────────────────── */}
        {avatarUri ? (
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

        {/* ── YOUR SKIN SNAPSHOT ─────────────────────────────────────────── */}
        <View style={styles.sectionWrap}>
          <Text style={styles.sectionLabel}>YOUR SKIN SNAPSHOT</Text>
          <View style={styles.grid}>
            {snapshotItems.map((item, i) => (
              <TouchableOpacity
                key={item.id + '-' + i}
                style={[
                  styles.snapshotCard,
                  i % 2 === 0 ? { marginRight: 6 } : { marginLeft: 6 },
                ]}
                activeOpacity={0.72}
                onPress={() => onSnapshotPress?.(item.id)}
              >
                <View style={styles.snapRow}>
                  {/* Icon */}
                  <View style={[styles.snapIconWrap, { }]}>
                    <SnapshotIcon type={item.iconType} color={item.iconColor} size={16} />
                  </View>
                  {/* Label */}
                  <Text style={styles.snapTitle}>{item.label}</Text>
                </View>
                <View style={styles.snapBottomRow}>
                  <Text style={[styles.snapSeverity, { color: item.severityColor }]}>{item.severity}</Text>
                  <ChevronRight size={16} color="#7A6F95" />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── DO THIS TODAY ──────────────────────────────────────────────── */}
        <View style={styles.sectionWrap}>
          <Text style={styles.sectionLabel}>DO THIS TODAY</Text>
          <View style={{ gap: 12 }}>
            {recommendations.map((rec, i) => (
              <TouchableOpacity
                key={i}
                activeOpacity={0.72}
                onPress={() => onRecommendationPress?.(i)}
              >
                {/* Gradient border wrapper */}
                <LinearGradient
                  colors={[rec.accentColor + '80', '#2B1754', 'transparent']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.recBorderGradient}
                >
                  {/* Inner card */}
                  <View style={styles.recCardInner}>
                      <View style={styles.recRow}>
                      <View style={styles.recIconWrap}>
                        <RecommendationIcon icon={rec.icon} color={rec.accentColor} />
                      </View>
                      <View style={styles.recTextWrap}>
                        <Text style={styles.recTitle}>{rec.title}</Text>
                        <Text style={styles.recSubtitle} numberOfLines={1}>
                          {rec.subtitle}
                        </Text>
                      </View>
                      <ChevronRight size={16} color="#7A6F95" />
                    </View>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>
        </View>
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

const SNAP_CARD_W = (SCREEN_WIDTH - 44 - 12) / 2;

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

  // ── Section ─────────────────────────────────────────────────────────────
  sectionWrap: {
    marginBottom: 28,
    paddingHorizontal: 0,
  },
  sectionLabel: {
    color: '#7A6F95',
    fontFamily: Fonts.bold,
    fontSize: 11,
    letterSpacing: 1.5,
    marginBottom: 16,
  },

  // ── Snapshot grid ────────────────────────────────────────────────────────
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  snapshotCard: {
    width: SNAP_CARD_W,
    overflow: 'hidden',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    backgroundColor: '#180E2F',
  },
  snapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  snapIconWrap: {
    width: 24,
    alignItems: 'center',
  },
  snapTitle: {
    color: '#FFFFFF',
    fontFamily: Fonts.regular,
    fontSize: 14,
    flex: 1,
  },
  snapBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  snapSeverity: {
    fontFamily: Fonts.regular,
    fontSize: 13,
  },

  // ── Recommendation cards (gradient-bordered) ────────────────────────────
  recBorderGradient: {
    borderRadius: 20,
    padding: 1,
  },
  recCardInner: {
    overflow: 'hidden',
    borderRadius: 19,
    padding: 16,
    backgroundColor: '#12082A',
  },
  recRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recIconWrap: {
    width: 24,
    alignItems: 'center',
    marginRight: 12,
  },
  recTextWrap: {
    flex: 1,
  },
  recTitle: {
    color: '#FFFFFF',
    fontFamily: Fonts.medium,
    fontSize: 15,
    marginBottom: 3,
  },
  recSubtitle: {
    color: '#8B80A5',
    fontFamily: Fonts.regular,
    fontSize: 13,
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
