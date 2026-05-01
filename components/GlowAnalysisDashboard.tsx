import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Modal,
  Pressable,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, {
  Path,
  Polyline,
  Circle,
  Line,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
  Rect,
  Text as SvgText,
} from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { format } from 'date-fns';
import { Fonts } from '@/lib/theme';
import type { Detection, ZoneScore, SkinAssessmentItem } from '@/lib/scan-types';
import type { ScanHistoryEntry } from '@/lib/scan-api';
import { PRODUCTS, type Product } from '@/lib/products';
import { cleanProductName } from '@/lib/clean-product-name';
import FaceZoneSummary from '@/components/FaceZoneSummary';

// Top products sorted by match — shown in the carousel
const RECOMMENDED_PRODUCTS = [...PRODUCTS]
  .sort((a, b) => b.match_percent - a.match_percent)
  .slice(0, 10);

// ─── Tokens ─────────────────────────────────────────────────────────────────

const C = {
  violet: '#7C5CFC',
  violetSoft: '#A78BFA',
  green: '#34D399',
  greenSoft: '#6EE7B7',
  greenBg: 'rgba(52,211,153,0.10)',
  greenBorder: 'rgba(52,211,153,0.40)',
  amber: '#FCD34D',
  amberBg: 'rgba(252,211,77,0.10)',
  amberBorder: 'rgba(252,211,77,0.40)',
  coral: '#F87171',
  coralBg: 'rgba(248,113,113,0.10)',
  coralBorder: 'rgba(248,113,113,0.40)',
  text: '#FFFFFF',
  textDim: 'rgba(255,255,255,0.60)',
  textMuted: 'rgba(255,255,255,0.45)',
};

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
  severityScore?: number | null;
  totalSpots?: number | null;
  primaryAcneType?: string | null;
  onScanAgain?: () => void;
  onStartPlan?: () => void;
  onViewFullScan?: () => void;
  onBack?: () => void;
  scanHistory?: ScanHistoryEntry[];
  currentSessionId?: string;
}

// ─── SVG Icons ──────────────────────────────────────────────────────────────

const Sparkle = ({ size = 14, color = C.violetSoft }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M12 3l1.6 5.4L19 10l-5.4 1.6L12 17l-1.6-5.4L5 10l5.4-1.6L12 3z" fill={color} />
    <Circle cx={19} cy={5} r={1} fill={color} />
    <Circle cx={5} cy={19} r={1} fill={color} />
  </Svg>
);

const CheckSm = ({ size = 18, color = C.green }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M5 12l4 4 10-10" stroke={color} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const Drop = ({ size = 18, color = C.violetSoft }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M12 3.5C12 3.5 6 10 6 14.5a6 6 0 0 0 12 0C18 10 12 3.5 12 3.5z" fill={color} />
  </Svg>
);

const TrendUp = ({ size = 18, color = C.green }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M3 17l6-6 4 4 8-8" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M14 7h7v7" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const TrendFlat = ({ size = 18, color = C.greenSoft }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M4 12h16" stroke={color} strokeWidth={2.4} strokeLinecap="round" />
  </Svg>
);

const TrendDown = ({ size = 18, color = C.coral }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M3 7l6 6 4-4 8 8" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M14 17h7v-7" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const Shield = ({ size = 20, color = C.green }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M12 3l8 3v6c0 4.5-3.4 8.4-8 9-4.6-.6-8-4.5-8-9V6l8-3z" fill={color} fillOpacity={0.18} stroke={color} strokeWidth={1.8} />
    <Path d="M9 12l2 2 4-4" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const Sun = ({ size = 20, color = C.green }: { size?: number; color?: string }) => {
  const rays = [];
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    const r1 = 6.5;
    const r2 = 9.2;
    rays.push(
      <Line
        key={i}
        x1={12 + Math.cos(a) * r1}
        y1={12 + Math.sin(a) * r1}
        x2={12 + Math.cos(a) * r2}
        y2={12 + Math.sin(a) * r2}
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
    );
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={3.6} fill={color} />
      {rays}
    </Svg>
  );
};

const Droplet = ({ size = 20, color = C.green }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 3C12 3 6 10 6 14.5a6 6 0 0 0 12 0C18 10 12 3 12 3z"
      fill={color}
      fillOpacity={0.22}
      stroke={color}
      strokeWidth={1.8}
      strokeLinejoin="round"
    />
  </Svg>
);

const Cleanse = ({ size = 22, color = C.green }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x={6} y={9} width={12} height={12} rx={2.5} stroke={color} strokeWidth={1.8} />
    <Path d="M9 9V6.5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1V9" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    <Path d="M11 4.5h2" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    <Path d="M9 14h2M9 17h6" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
  </Svg>
);

const Moisturize = ({ size = 20, color = C.violetSoft }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M12 3C12 3 5 11 5 15.5a7 7 0 0 0 14 0C19 11 12 3 12 3z" fill={color} />
  </Svg>
);

const Chevron = ({ size = 16, color = 'rgba(255,255,255,0.4)' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M9 6l6 6-6 6" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// ─── Glow Score Ring ────────────────────────────────────────────────────────

function GlowScoreRing({ score, accent }: { score: number; accent: { ring: string; ringSoft: string; halo: string } }) {
  const size = 108;
  const stroke = 5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = (Math.max(0, Math.min(100, score)) / 100) * c;

  return (
    <View style={ringStyles.wrap}>
      {/* outer halo (faked via tinted shadow on a bg circle) */}
      <View
        style={[
          ringStyles.halo,
          {
            shadowColor: accent.ring,
            shadowOpacity: 0.55,
            shadowRadius: 16,
            shadowOffset: { width: 0, height: 0 },
            backgroundColor: accent.halo,
          },
        ]}
      />
      <Svg width={size} height={size} style={{ position: 'relative', zIndex: 1 }}>
        <Defs>
          <SvgLinearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={accent.ringSoft} />
            <Stop offset="1" stopColor={accent.ring} />
          </SvgLinearGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="url(#ringGrad)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={ringStyles.center} pointerEvents="none">
        <Text style={ringStyles.scoreText}>{Math.round(score)}</Text>
      </View>
      <View style={[ringStyles.spark, { top: -2, right: -8 }]}>
        <Sparkle size={12} color="#fff" />
      </View>
      <View style={[ringStyles.spark, { top: 18, right: -12 }]}>
        <Sparkle size={8} color={accent.ringSoft} />
      </View>
    </View>
  );
}

const ringStyles = StyleSheet.create({
  wrap: {
    width: 108,
    height: 108,
    position: 'relative',
  },
  halo: {
    position: 'absolute',
    top: -10,
    left: -10,
    right: -10,
    bottom: -10,
    borderRadius: 999,
    elevation: 6,
  },
  center: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  scoreText: {
    color: C.text,
    fontFamily: Fonts.bold,
    fontSize: 38,
    lineHeight: 44,
    letterSpacing: -1.4,
  },
  spark: {
    position: 'absolute',
    zIndex: 3,
  },
});

// ─── Hero card ──────────────────────────────────────────────────────────────

function HeroCard({
  avatarUri,
  eyebrow,
  headline,
  description,
  score,
  scoreLabel,
  accent,
  imageNativeWidth,
  imageNativeHeight,
}: {
  avatarUri: string;
  eyebrow: string;
  headline: string;
  description?: string;
  score: number;
  scoreLabel: string;
  accent: { ring: string; ringSoft: string; halo: string };
  imageNativeWidth: number;
  imageNativeHeight: number;
}) {
  const [avatarExpanded, setAvatarExpanded] = useState(false);

  // Wrap headline to two lines at the natural mid-word boundary
  const headlineNode = useMemo(() => {
    const trimmed = (headline ?? '').trim();
    const words = trimmed.split(/\s+/);
    if (words.length <= 1) return trimmed;
    // Split as evenly as possible by char count
    let bestIdx = 1;
    let bestDiff = Infinity;
    for (let i = 1; i < words.length; i++) {
      const left = words.slice(0, i).join(' ').length;
      const right = words.slice(i).join(' ').length;
      const diff = Math.abs(left - right);
      if (diff < bestDiff) {
        bestDiff = diff;
        bestIdx = i;
      }
    }
    return `${words.slice(0, bestIdx).join(' ')}\n${words.slice(bestIdx).join(' ')}`;
  }, [headline]);

  return (
    <View style={heroStyles.outer}>
      <View style={heroStyles.glow} />
      <View style={heroStyles.card}>
        <LinearGradient
          colors={['#2E0B6B', '#1C0655', '#160448']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFill, { borderRadius: 22 }]}
        />

        {/* Single row: thumbnail | text | score ring */}
        <View style={heroStyles.row}>
          {/* Thumbnail — contained so full image is always visible */}
          <TouchableOpacity
            style={heroStyles.thumbWrap}
            onPress={() => avatarUri && setAvatarExpanded(true)}
            activeOpacity={0.85}
          >
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={heroStyles.thumb} resizeMode="contain" />
            ) : (
              <View style={[heroStyles.thumb, { backgroundColor: 'rgba(167,139,250,0.25)' }]} />
            )}
            <View style={heroStyles.expandHint}>
              <Text style={heroStyles.expandHintText}>⤢</Text>
            </View>
          </TouchableOpacity>

          {/* Headline + eyebrow */}
          <View style={heroStyles.textCol}>
            <View style={heroStyles.eyebrowRow}>
              <Sparkle size={11} color={C.violetSoft} />
              <Text style={heroStyles.eyebrow}>{eyebrow}</Text>
            </View>
            <Text style={heroStyles.headline}>{headlineNode}</Text>
          </View>

          {/* Score ring */}
          <View style={heroStyles.scoreCol}>
            <GlowScoreRing score={score} accent={accent} />
            <Text style={[heroStyles.scoreLabel, { color: accent.ring }]}>Glow Score</Text>
            <Text style={[heroStyles.scoreSub, { color: accent.ringSoft }]}>{scoreLabel}</Text>
          </View>
        </View>

        {/* Full-screen modal */}
        <Modal visible={avatarExpanded} transparent animationType="fade" onRequestClose={() => setAvatarExpanded(false)}>
          <Pressable style={heroStyles.avatarModalBg} onPress={() => setAvatarExpanded(false)}>
            <Image
              source={{ uri: avatarUri }}
              style={[
                heroStyles.avatarModalImg,
                { aspectRatio: imageNativeWidth / Math.max(imageNativeHeight, 1) },
              ]}
              resizeMode="contain"
            />
          </Pressable>
        </Modal>
      </View>
    </View>
  );
}

const heroStyles = StyleSheet.create({
  outer: {
    position: 'relative',
    marginBottom: 12,
  },
  glow: {
    position: 'absolute',
    top: -8,
    left: -8,
    right: -8,
    bottom: -8,
    borderRadius: 28,
    backgroundColor: 'rgba(124,92,252,0.12)',
    shadowColor: C.violet,
    shadowOpacity: 0.45,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 22,
    padding: 14,
    paddingVertical: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(167,139,250,0.55)',
    overflow: 'hidden',
    shadowColor: C.violet,
    shadowOpacity: 0.45,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  thumbWrap: {
    width: 90,
    height: 120,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.35)',
    position: 'relative',
  },
  thumb: {
    width: '100%',
    height: '100%',
  },
  expandHint: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 999,
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expandHintText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.80)',
  },
  textCol: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  eyebrow: {
    fontFamily: Fonts.medium,
    fontSize: 11,
    color: C.violetSoft,
    letterSpacing: 0.2,
    marginLeft: 4,
  },
  headline: {
    fontFamily: Fonts.bold,
    fontSize: 22,
    lineHeight: 25,
    color: C.text,
    letterSpacing: -0.6,
    marginBottom: 6,
  },
  body: {
    fontFamily: Fonts.regular,
    fontSize: 11,
    lineHeight: 16,
    color: 'rgba(255,255,255,0.72)',
  },
  scoreCol: {
    alignItems: 'center',
  },
  scoreLabel: {
    fontFamily: Fonts.semibold,
    fontSize: 11,
    lineHeight: 13,
    letterSpacing: 0.2,
    marginTop: 4,
  },
  scoreSub: {
    fontFamily: Fonts.semibold,
    fontSize: 11,
    lineHeight: 13,
  },
  avatarModalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarModalImg: {
    width: '90%',
    borderRadius: 18,
  },
});

// ─── Info modal ─────────────────────────────────────────────────────────────

interface ProductRec {
  name: string;
  brand: string;
  buyUrl: string;
  iconType: 'cleanse' | 'hydrate' | 'spf';
}
interface InfoSheet { title: string; body: string; product?: ProductRec }

const PRODUCT_GRADIENTS: Record<ProductRec['iconType'], readonly [string, string]> = {
  cleanse: ['#0A2E20', '#103D2B'],
  hydrate: ['#1A0845', '#2D1069'],
  spf:     ['#0D2440', '#1A3D60'],
};

function ProductCard({ product }: { product: ProductRec }) {
  const grad = PRODUCT_GRADIENTS[product.iconType];
  const icon =
    product.iconType === 'cleanse' ? <Cleanse size={40} color="#6EE7B7" /> :
    product.iconType === 'hydrate' ? <Droplet size={40} color={C.violetSoft} /> :
    <Sun size={40} color="#FCD34D" />;
  const shopGrad: readonly [string, string] =
    product.iconType === 'cleanse' ? ['#0E7A4A', '#0A5C36'] :
    product.iconType === 'hydrate' ? ['#6E45E8', '#4F22BE'] :
    ['#1A6EA8', '#0D4A72'];

  return (
    <View style={modalStyles.productWrap}>
      <LinearGradient
        colors={grad as [string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={modalStyles.productImgArea}
      >
        {icon}
      </LinearGradient>
      <Text style={modalStyles.productBrand}>{product.brand}</Text>
      <Text style={modalStyles.productName}>{product.name}</Text>
      <TouchableOpacity
        style={modalStyles.shopBtn}
        activeOpacity={0.85}
        onPress={() => Linking.openURL(product.buyUrl)}
      >
        <LinearGradient
          colors={shopGrad as [string, string]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={modalStyles.shopBtnGrad}
        >
          <Text style={modalStyles.shopBtnText}>View on Amazon →</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

function InfoModal({ info, onClose }: { info: InfoSheet | null; onClose: () => void }) {
  return (
    <Modal visible={!!info} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={modalStyles.backdrop} onPress={onClose} />
      <View style={modalStyles.sheet}>
        <View style={modalStyles.handle} />
        <LinearGradient
          colors={['#1A0845', '#0E0226']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={[StyleSheet.absoluteFill, { borderRadius: 24 }]}
        />
        <View style={modalStyles.border} />
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 4 }}>
          {info?.product && <ProductCard product={info.product} />}
          <Text style={modalStyles.title}>{info?.title}</Text>
          <Text style={modalStyles.body}>{info?.body}</Text>
          <TouchableOpacity style={modalStyles.closeBtn} onPress={onClose} activeOpacity={0.85}>
            <LinearGradient
              colors={['#6E45E8', '#4F22BE']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={modalStyles.closeBtnGradient}
            >
              <Text style={modalStyles.closeBtnText}>Got it</Text>
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
}

const modalStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
  },
  sheet: {
    position: 'relative',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 22,
    paddingTop: 16,
    paddingBottom: 36,
    overflow: 'hidden',
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: 'rgba(167,139,250,0.3)',
  },
  border: {
    ...StyleSheet.absoluteFillObject,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: 'rgba(167,139,250,0.25)',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignSelf: 'center',
    marginBottom: 20,
  },
  title: {
    fontFamily: Fonts.bold,
    fontSize: 20,
    lineHeight: 24,
    color: '#FFFFFF',
    letterSpacing: -0.4,
    marginBottom: 12,
  },
  body: {
    fontFamily: Fonts.regular,
    fontSize: 15,
    lineHeight: 23,
    color: 'rgba(255,255,255,0.75)',
    marginBottom: 28,
  },
  closeBtn: {
    borderRadius: 999,
    overflow: 'hidden',
  },
  closeBtnGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: 999,
  },
  closeBtnText: {
    fontFamily: Fonts.bold,
    fontSize: 16,
    color: '#FFFFFF',
  },
  productWrap: {
    marginBottom: 18,
    alignItems: 'center',
  },
  productImgArea: {
    width: '100%',
    height: 140,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  productBrand: {
    fontFamily: Fonts.semibold,
    fontSize: 11,
    letterSpacing: 1.4,
    color: C.textDim,
    textTransform: 'uppercase',
    marginBottom: 4,
    textAlign: 'center',
  },
  productName: {
    fontFamily: Fonts.bold,
    fontSize: 15,
    lineHeight: 19,
    color: C.text,
    textAlign: 'center',
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  shopBtn: {
    borderRadius: 999,
    overflow: 'hidden',
    width: '100%',
    marginBottom: 8,
  },
  shopBtnGrad: {
    paddingVertical: 13,
    alignItems: 'center',
    borderRadius: 999,
  },
  shopBtnText: {
    fontFamily: Fonts.bold,
    fontSize: 14,
    color: '#FFFFFF',
  },
});

// ─── Stat card ──────────────────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  valueColor = C.green,
  iconBg = 'rgba(52,211,153,0.12)',
  iconBorder = 'rgba(52,211,153,0.25)',
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  valueColor?: string;
  iconBg?: string;
  iconBorder?: string;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity style={statStyles.card} onPress={onPress} activeOpacity={0.8}>
      <LinearGradient
        colors={['rgba(20,8,42,0.7)', 'rgba(10,4,26,0.6)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[StyleSheet.absoluteFill, { borderRadius: 16 }]}
      />
      <View style={[statStyles.iconCircle, { backgroundColor: iconBg, borderColor: iconBorder }]}>
        {icon}
      </View>
      <Text style={statStyles.label}>{label}</Text>
      <Text style={[statStyles.value, { color: valueColor }]}>{value}</Text>
    </TouchableOpacity>
  );
}

const statStyles = StyleSheet.create({
  card: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(124,92,252,0.22)',
    overflow: 'hidden',
    shadowColor: C.violet,
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  label: {
    fontFamily: Fonts.regular,
    fontSize: 10.5,
    lineHeight: 13,
    color: C.textDim,
    textAlign: 'center',
  },
  value: {
    fontFamily: Fonts.bold,
    fontSize: 15,
    lineHeight: 17,
    letterSpacing: -0.2,
    textAlign: 'center',
  },
});

// ─── Section card / row ─────────────────────────────────────────────────────

function SectionCard({ children, style }: { children: React.ReactNode; style?: any }) {
  return (
    <View style={[sectionStyles.card, style]}>
      <LinearGradient
        colors={['rgba(20,8,42,0.55)', 'rgba(10,4,26,0.55)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[StyleSheet.absoluteFill, { borderRadius: 18 }]}
      />
      {children}
    </View>
  );
}

function SectionHead({ title, badge }: { title: string; badge?: React.ReactNode }) {
  return (
    <View style={sectionStyles.head}>
      <View style={sectionStyles.headLeft}>
        <Sparkle size={11} color={C.violetSoft} />
        <Text style={sectionStyles.headTitle}>{title}</Text>
      </View>
      {badge}
    </View>
  );
}

function HighlightRow({
  icon,
  iconBg,
  iconBorder = 'rgba(52,211,153,0.25)',
  title,
  desc,
  last,
  onPress,
}: {
  icon: React.ReactNode;
  iconBg: string;
  iconBorder?: string;
  title: string;
  desc: string;
  last?: boolean;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      style={[sectionStyles.row, last && { borderBottomWidth: 0 }]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={[sectionStyles.rowIcon, { backgroundColor: iconBg, borderColor: iconBorder }]}>{icon}</View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={sectionStyles.rowTitle}>{title}</Text>
        <Text style={sectionStyles.rowDesc}>{desc}</Text>
      </View>
      <Chevron />
    </TouchableOpacity>
  );
}

const sectionStyles = StyleSheet.create({
  card: {
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(124,92,252,0.2)',
    overflow: 'hidden',
    marginBottom: 10,
    shadowColor: C.violet,
    shadowOpacity: 0.14,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
    minHeight: 22,
  },
  headLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headTitle: {
    fontFamily: Fonts.bold,
    fontSize: 12,
    lineHeight: 14,
    letterSpacing: 1.2,
    color: 'rgba(255,255,255,0.85)',
    textTransform: 'uppercase',
    marginLeft: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingVertical: 9,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  rowIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: {
    fontFamily: Fonts.bold,
    fontSize: 14,
    lineHeight: 17,
    color: C.text,
    letterSpacing: -0.1,
    marginBottom: 2,
  },
  rowDesc: {
    fontFamily: Fonts.regular,
    fontSize: 11.5,
    lineHeight: 15,
    color: C.textDim,
  },
});

// ─── Pill badges ────────────────────────────────────────────────────────────

function Pill({ text, tone = 'green' }: { text: string; tone?: 'green' | 'amber' | 'coral' }) {
  const palette =
    tone === 'amber'
      ? { bg: C.amberBg, border: C.amberBorder, text: C.amber }
      : tone === 'coral'
      ? { bg: C.coralBg, border: C.coralBorder, text: C.coral }
      : { bg: C.greenBg, border: C.greenBorder, text: C.greenSoft };
  return (
    <View
      style={{
        paddingVertical: 5,
        paddingHorizontal: 11,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: palette.border,
        backgroundColor: palette.bg,
      }}
    >
      <Text style={{ fontFamily: Fonts.semibold, fontSize: 10.5, lineHeight: 12, color: palette.text }}>{text}</Text>
    </View>
  );
}

// ─── Progress mini-chart ────────────────────────────────────────────────────

function ProgressMiniChart({ history, currentSessionId }: { history: ScanHistoryEntry[]; currentSessionId?: string }) {
  const W = 340;
  const H = 70;
  const pad = { l: 24, r: 8, t: 8, b: 18 };
  const innerW = W - pad.l - pad.r;
  const innerH = H - pad.t - pad.b;

  const series = history.length > 0 ? history : [];
  const counts = series.map((s) => s.spot_count);
  const maxRaw = counts.length ? Math.max(...counts) : 4;
  const maxY = Math.max(4, maxRaw);
  const xStep = series.length > 1 ? innerW / (series.length - 1) : 0;

  const points = series.map((s, i) => {
    const x = pad.l + i * xStep;
    const y = pad.t + (1 - s.spot_count / maxY) * innerH;
    return { x, y, id: s.id, count: s.spot_count };
  });

  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');

  const firstDate = series.length ? format(new Date(series[0].created_at), 'MMM d') : '';
  const lastDate = series.length ? format(new Date(series[series.length - 1].created_at), 'MMM d') : '';
  const midY = Math.round(maxY / 2);

  return (
    <View>
      <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
        <SvgText x={6} y={12} fill="rgba(255,255,255,0.45)" fontSize="9" fontFamily={Fonts.regular}>
          {String(maxY)}
        </SvgText>
        <SvgText x={6} y={pad.t + innerH * 0.5 + 3} fill="rgba(255,255,255,0.45)" fontSize="9" fontFamily={Fonts.regular}>
          {String(midY)}
        </SvgText>
        <SvgText x={6} y={pad.t + innerH + 3} fill="rgba(255,255,255,0.45)" fontSize="9" fontFamily={Fonts.regular}>
          0
        </SvgText>

        <Line
          x1={pad.l}
          y1={pad.t + innerH}
          x2={W - pad.r}
          y2={pad.t + innerH}
          stroke="rgba(255,255,255,0.07)"
          strokeWidth={1}
        />

        {points.length > 1 && (
          <Path d={path} fill="none" stroke={C.violetSoft} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
        )}

        {points.map((p, i) => {
          const isLast = currentSessionId ? p.id === currentSessionId : i === points.length - 1;
          return (
            <React.Fragment key={p.id ?? i}>
              {isLast && <Circle cx={p.x} cy={p.y} r={6} fill="rgba(167,139,250,0.18)" />}
              <Circle
                cx={p.x}
                cy={p.y}
                r={isLast ? 4 : 2.5}
                fill={isLast ? '#FFFFFF' : C.violetSoft}
                stroke={isLast ? C.violetSoft : 'transparent'}
                strokeWidth={isLast ? 2 : 0}
              />
            </React.Fragment>
          );
        })}

        {firstDate ? (
          <SvgText x={pad.l} y={H - 2} fill="rgba(255,255,255,0.5)" fontSize="9.5" fontFamily={Fonts.regular}>
            {firstDate}
          </SvgText>
        ) : null}
        {lastDate && lastDate !== firstDate ? (
          <SvgText
            x={W - pad.r}
            y={H - 2}
            fill="rgba(255,255,255,0.5)"
            fontSize="9.5"
            fontFamily={Fonts.regular}
            textAnchor="end"
          >
            {lastDate}
          </SvgText>
        ) : null}
      </Svg>
    </View>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function deriveScoreAccent(score: number) {
  if (score >= 80) return { ring: C.green, ringSoft: '#A7F3D0', halo: 'rgba(52,211,153,0.18)', label: 'Excellent' };
  if (score >= 65) return { ring: C.greenSoft, ringSoft: '#D1FAE5', halo: 'rgba(110,231,183,0.18)', label: 'Good' };
  if (score >= 50) return { ring: C.amber, ringSoft: '#FDE68A', halo: 'rgba(252,211,77,0.18)', label: 'Fair' };
  return { ring: C.coral, ringSoft: '#FCA5A5', halo: 'rgba(248,113,113,0.18)', label: 'Needs care' };
}

function deriveGlowScore({
  severity,
  severityScore,
  totalSpots,
}: {
  severity: string;
  severityScore?: number | null;
  totalSpots?: number | null;
}): number {
  if (typeof severityScore === 'number' && severityScore >= 0 && severityScore <= 100) {
    return Math.max(0, Math.min(100, 100 - severityScore));
  }
  const sev = (severity ?? '').toLowerCase();
  let base = sev === 'high' || sev === 'severe' ? 55 : sev === 'moderate' ? 72 : 92;
  const spots = totalSpots ?? 0;
  base -= Math.min(spots, 20);
  return Math.max(20, Math.min(100, base));
}

function deriveBreakouts(totalSpots: number | null | undefined, primaryAcneType?: string | null) {
  const n = totalSpots ?? 0;
  if (n === 0) return { label: 'Breakouts', value: 'None', color: C.green };
  if (primaryAcneType) {
    const cap = primaryAcneType.charAt(0).toUpperCase() + primaryAcneType.slice(1);
    return { label: 'Breakouts', value: `${n} ${cap}`, color: n > 8 ? C.coral : C.amber };
  }
  return { label: 'Breakouts', value: `${n} spot${n === 1 ? '' : 's'}`, color: n > 8 ? C.coral : C.amber };
}

function deriveTrend(history: ScanHistoryEntry[] | undefined, currentSessionId?: string) {
  if (!history || history.length < 2) {
    return { label: 'Trend', value: 'Baseline', color: C.violetSoft, icon: 'flat' as const };
  }
  const idx = currentSessionId ? history.findIndex((h) => h.id === currentSessionId) : history.length - 1;
  if (idx <= 0) return { label: 'Trend', value: 'Baseline', color: C.violetSoft, icon: 'flat' as const };
  const cur = history[idx].spot_count;
  const prev = history[idx - 1].spot_count;
  const delta = cur - prev;
  if (delta < -1) return { label: 'Trend', value: 'Improving', color: C.green, icon: 'up' as const };
  if (delta > 1) return { label: 'Trend', value: 'Worsening', color: C.coral, icon: 'down' as const };
  return { label: 'Trend', value: 'Stable', color: C.green, icon: 'up' as const };
}

function deriveTrendBadge(history: ScanHistoryEntry[] | undefined, currentSessionId?: string) {
  if (!history || history.length < 2) return { text: 'First scan', tone: 'green' as const };
  const idx = currentSessionId ? history.findIndex((h) => h.id === currentSessionId) : history.length - 1;
  if (idx <= 0) return { text: 'First scan', tone: 'green' as const };
  const cur = history[idx].spot_count;
  const prev = history[idx - 1].spot_count;
  const delta = cur - prev;
  if (delta === 0) return { text: 'Same as last scan', tone: 'green' as const };
  if (delta < 0) {
    const n = Math.abs(delta);
    return { text: `−${n} blemish${n === 1 ? '' : 'es'} since last scan`, tone: 'green' as const };
  }
  return { text: `+${delta} blemish${delta === 1 ? '' : 'es'} since last scan`, tone: 'coral' as const };
}

function deriveHighlights(assessment: SkinAssessmentItem[] | undefined) {
  const fallback = [
    { key: 'breakouts', icon: <Shield size={20} color={C.green} />, iconBg: 'rgba(52,211,153,0.10)', title: 'No active breakouts', desc: 'Your skin is clear and calm.' },
    { key: 'spots', icon: <Sun size={20} color={C.green} />, iconBg: 'rgba(52,211,153,0.10)', title: 'No visible dark spots', desc: 'Even tone looks great.' },
    { key: 'redness', icon: <Droplet size={20} color={C.green} />, iconBg: 'rgba(52,211,153,0.10)', title: 'Low redness', desc: 'Your skin looks balanced.' },
  ];

  if (!assessment || assessment.length === 0) return fallback;

  const strengths = assessment.filter((a) => a.is_strength).slice(0, 3);
  if (strengths.length === 0) return fallback;

  const map: Partial<Record<SkinAssessmentItem['category'], { icon: React.ReactNode; bg: string; title: string; desc: string }>> = {
    active_breakouts: { icon: <Shield size={20} color={C.green} />, bg: 'rgba(52,211,153,0.10)', title: 'No active breakouts', desc: 'Your skin is clear and calm.' },
    comedones:        { icon: <Shield size={20} color={C.green} />, bg: 'rgba(52,211,153,0.10)', title: 'Pores look clear', desc: 'Few clogged pores detected.' },
    dark_spots:       { icon: <Sun size={20} color={C.green} />,    bg: 'rgba(52,211,153,0.10)', title: 'No visible dark spots', desc: 'Even tone looks great.' },
    redness:          { icon: <Droplet size={20} color={C.green} />, bg: 'rgba(52,211,153,0.10)', title: 'Low redness', desc: 'Your skin looks balanced.' },
    skin_texture:     { icon: <Droplet size={20} color={C.green} />, bg: 'rgba(52,211,153,0.10)', title: 'Smooth texture', desc: 'Surface looks even and refined.' },
    pore_visibility:  { icon: <Shield size={20} color={C.green} />,  bg: 'rgba(52,211,153,0.10)', title: 'Refined pores', desc: 'Pores appear barely visible.' },
    skin_tone_evenness:{ icon: <Sun size={20} color={C.green} />,    bg: 'rgba(52,211,153,0.10)', title: 'Even skin tone', desc: 'Color looks uniform across zones.' },
    oiliness:         { icon: <Droplet size={20} color={C.green} />, bg: 'rgba(52,211,153,0.10)', title: 'Balanced oil', desc: 'Sebum levels look healthy.' },
    hydration:        { icon: <Droplet size={20} color={C.green} />, bg: 'rgba(52,211,153,0.10)', title: 'Well hydrated', desc: 'Moisture looks well maintained.' },
    brightness:       { icon: <Sun size={20} color={C.green} />,     bg: 'rgba(52,211,153,0.10)', title: 'Healthy radiance', desc: 'Skin looks bright and rested.' },
    under_eye:        { icon: <Sun size={20} color={C.green} />,     bg: 'rgba(52,211,153,0.10)', title: 'Refreshed under-eye', desc: 'Minimal puffiness or shadows.' },
  };

  return strengths.map((s, i) => {
    const m = map[s.category];
    return {
      key: `${s.category}-${i}`,
      icon: m?.icon ?? <Shield size={20} color={C.green} />,
      iconBg: m?.bg ?? 'rgba(52,211,153,0.10)',
      title: m?.title ?? s.label,
      desc: m?.desc ?? 'Looking good in this area.',
    };
  });
}

function deriveConcerns(assessment: SkinAssessmentItem[] | undefined) {
  if (!assessment || assessment.length === 0) return [];

  const weaknesses = assessment.filter((a) => !a.is_strength).slice(0, 3);
  if (weaknesses.length === 0) return [];

  const map: Partial<Record<SkinAssessmentItem['category'], { icon: React.ReactNode; bg: string; border: string; title: string; desc: string }>> = {
    active_breakouts:  { icon: <Shield size={20} color={C.coral} />,   bg: C.coralBg, border: C.coralBorder, title: 'Active breakouts',  desc: 'Inflamed spots detected in this scan.' },
    comedones:         { icon: <Shield size={20} color={C.amber} />,   bg: C.amberBg, border: C.amberBorder, title: 'Clogged pores',      desc: 'Blackheads or whiteheads present.' },
    dark_spots:        { icon: <Sun size={20} color={C.amber} />,      bg: C.amberBg, border: C.amberBorder, title: 'Dark spots',         desc: 'Post-inflammatory pigmentation detected.' },
    redness:           { icon: <Droplet size={20} color={C.coral} />,  bg: C.coralBg, border: C.coralBorder, title: 'Redness',            desc: 'Visible inflammation or irritation.' },
    skin_texture:      { icon: <Droplet size={20} color={C.amber} />,  bg: C.amberBg, border: C.amberBorder, title: 'Uneven texture',     desc: 'Surface roughness or bumpiness detected.' },
    pore_visibility:   { icon: <Shield size={20} color={C.amber} />,   bg: C.amberBg, border: C.amberBorder, title: 'Visible pores',      desc: 'Enlarged pores in one or more zones.' },
    skin_tone_evenness:{ icon: <Sun size={20} color={C.amber} />,      bg: C.amberBg, border: C.amberBorder, title: 'Uneven tone',        desc: 'Color variation detected across zones.' },
    oiliness:          { icon: <Droplet size={20} color={C.amber} />,  bg: C.amberBg, border: C.amberBorder, title: 'Excess oiliness',    desc: 'Elevated sebum levels detected.' },
    hydration:         { icon: <Droplet size={20} color={C.coral} />,  bg: C.coralBg, border: C.coralBorder, title: 'Low hydration',      desc: 'Moisture barrier may need support.' },
    brightness:        { icon: <Sun size={20} color={C.amber} />,      bg: C.amberBg, border: C.amberBorder, title: 'Dull brightness',    desc: 'Radiance appears lower than ideal.' },
    under_eye:         { icon: <Sun size={20} color={C.amber} />,      bg: C.amberBg, border: C.amberBorder, title: 'Under-eye fatigue',  desc: 'Puffiness or shadows detected.' },
  };

  return weaknesses.map((s, i) => {
    const m = map[s.category];
    return {
      key: `concern-${s.category}-${i}`,
      icon: m?.icon ?? <Shield size={20} color={C.coral} />,
      iconBg: m?.bg ?? C.coralBg,
      iconBorder: m?.border ?? C.coralBorder,
      title: m?.title ?? s.label,
      desc: m?.desc ?? 'This area needs attention.',
    };
  });
}

// ─── Product Carousel ────────────────────────────────────────────────────────

function ProductCarouselItem({ product }: { product: Product }) {
  const [imgError, setImgError] = useState(false);
  const cleanName = cleanProductName(product.name, product.brand);

  return (
    <TouchableOpacity
      style={prodStyles.card}
      activeOpacity={0.82}
      onPress={() => Linking.openURL(`https://www.amazon.com/dp/${product.asin}`)}
    >
      <View style={prodStyles.imgWrap}>
        {!imgError && product.image_url ? (
          <Image
            source={{ uri: product.image_url }}
            style={prodStyles.img}
            resizeMode="cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <LinearGradient colors={['#1A0845', '#2D1069']} style={prodStyles.img}>
            <Droplet size={32} color={C.violetSoft} />
          </LinearGradient>
        )}
        <View style={prodStyles.matchBadge}>
          <Text style={prodStyles.matchText}>{product.match_percent}% match</Text>
        </View>
      </View>
      <View style={prodStyles.info}>
        <Text style={prodStyles.brand} numberOfLines={1}>{product.brand}</Text>
        <Text style={prodStyles.name} numberOfLines={2}>{cleanName}</Text>
        <Text style={prodStyles.desc} numberOfLines={2}>{product.description}</Text>
        <Text style={prodStyles.price}>{product.price}</Text>
      </View>
    </TouchableOpacity>
  );
}

const prodStyles = StyleSheet.create({
  card: {
    width: 152,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(124,92,252,0.28)',
    overflow: 'hidden',
    backgroundColor: 'rgba(14,6,30,0.95)',
    shadowColor: C.violet,
    shadowOpacity: 0.22,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  imgWrap: {
    width: '100%',
    height: 150,
    position: 'relative',
  },
  img: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(20,8,42,0.8)',
  },
  matchBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(52,211,153,0.18)',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(52,211,153,0.50)',
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  matchText: {
    fontFamily: Fonts.bold,
    fontSize: 10,
    color: C.green,
    letterSpacing: 0.3,
  },
  info: {
    padding: 10,
    paddingTop: 9,
  },
  brand: {
    fontFamily: Fonts.regular,
    fontSize: 10,
    letterSpacing: 0.8,
    color: C.textMuted,
    textTransform: 'uppercase',
    marginBottom: 3,
  },
  name: {
    fontFamily: Fonts.bold,
    fontSize: 13,
    lineHeight: 16,
    color: C.text,
    letterSpacing: -0.2,
    marginBottom: 4,
  },
  desc: {
    fontFamily: Fonts.regular,
    fontSize: 11,
    lineHeight: 14,
    color: C.textDim,
    marginBottom: 7,
  },
  price: {
    fontFamily: Fonts.semibold,
    fontSize: 13,
    color: C.violetSoft,
  },
});

// ─── Main Component ─────────────────────────────────────────────────────────

export default function GlowAnalysisDashboard({
  avatarUri,
  headline,
  description,
  skinType,
  severity,
  severityScore,
  totalSpots,
  primaryAcneType,
  zoneScores,
  skinAssessment,
  imageNativeWidth,
  imageNativeHeight,
  onStartPlan,
  onScanAgain,
  onBack,
  onViewFullScan,
  scanHistory,
  currentSessionId,
}: GlowAnalysisDashboardProps) {
  const insets = useSafeAreaInsets();
  const [modal, setModal] = useState<InfoSheet | null>(null);

  const score = deriveGlowScore({ severity, severityScore, totalSpots });
  const accent = deriveScoreAccent(score);
  const breakouts = deriveBreakouts(totalSpots, primaryAcneType);
  const trend = deriveTrend(scanHistory, currentSessionId);
  const trendBadge = deriveTrendBadge(scanHistory, currentSessionId);
  const highlights = deriveHighlights(skinAssessment);
  const concerns = deriveConcerns(skinAssessment);
  const eyebrow = score >= 80 ? 'Great news!' : score >= 65 ? 'Looking good' : score >= 50 ? 'Worth a look' : 'Needs care';

  const SKIN_TYPE_INFO: Record<string, string> = {
    Normal:      'Normal skin has a healthy balance of oil and moisture. Pores are small, tone is even, and breakouts are rare. Keep it up with gentle cleansing and daily SPF.',
    Oily:        'Oily skin produces excess sebum, especially in the T-zone. This can lead to enlarged pores and breakouts, but oily skin tends to age more slowly. Niacinamide and lightweight gel moisturizers help regulate oil without stripping your barrier.',
    Dry:         'Dry skin lacks moisture and can feel tight, flaky, or rough. Focus on hydrating serums (hyaluronic acid), rich moisturizers, and gentle low-pH cleansers. Avoid harsh actives on dry days.',
    Combination: 'Combination skin is oily in the T-zone (forehead, nose, chin) and normal or dry on the cheeks. Tailor your routine — lighter products on the T-zone, more moisture on the drier areas.',
    Sensitive:   'Sensitive skin reacts easily to products, temperature, and stress. Stick to fragrance-free, minimal-ingredient formulas. Niacinamide and centella asiatica help calm and strengthen the barrier.',
  };

  const TREND_INFO: Record<string, string> = {
    Improving:  'Your blemish count is going down compared to your last scan. Your routine is working — keep the consistency going. Most people see their best results at 8–12 weeks.',
    Stable:     'Your skin is holding steady with no significant change since your last scan. Stability is a win — it means your barrier is balanced and your routine is maintaining results.',
    Worsening:  'More blemishes were detected compared to your last scan. This can happen from stress, hormones, diet, or product changes. Stay consistent with your routine and avoid introducing new actives.',
    Baseline:   'This is your first scan, so there is no comparison yet. Your next scan will show how your skin is trending. We recommend scanning every 1–2 weeks for the best data.',
  };

  const BREAKOUT_INFO = (value: string, spots: number | null | undefined) => {
    if (!spots || spots === 0) return 'No active breakouts were detected — your skin is clear right now. Keep up your cleansing and moisturizing routine to prevent future breakouts.';
    const t = (primaryAcneType ?? '').toLowerCase();
    const typeDesc =
      t.includes('blackhead')  ? 'Blackheads are open clogged pores filled with oxidised sebum. Salicylic acid (BHA) dissolves the buildup from inside the pore.' :
      t.includes('whitehead')  ? 'Whiteheads are closed clogged pores. A gentle BHA exfoliant and non-comedogenic moisturiser help prevent new ones from forming.' :
      t.includes('papule')     ? 'Papules are small inflamed bumps. Avoid squeezing — it spreads bacteria and causes scarring. Benzoyl peroxide or salicylic acid can help clear them.' :
      t.includes('pustule')    ? 'Pustules are inflamed bumps with pus. Benzoyl peroxide (2.5–5%) kills the bacteria directly. Resist popping them.' :
      t.includes('nodule')     ? 'Nodules are deep, painful lumps. They need consistent care — a dermatologist can prescribe stronger treatments if they persist.' :
      'Active spots are visible on your scan. Gentle cleansing, a BHA exfoliant, and non-comedogenic moisturiser are the key steps right now.';
    return `${spots} spot${spots === 1 ? '' : 's'} detected in this scan. ${typeDesc}`;
  };

  const HIGHLIGHT_INFO: Record<string, { title: string; body: string }> = {
    'No active breakouts':   { title: 'No Active Breakouts', body: 'No inflamed spots were detected in this scan. Your skin barrier is healthy and your routine is working. Daily cleansing, SPF, and a lightweight moisturiser keep it that way.' },
    'Pores look clear':      { title: 'Clear Pores', body: 'Fewer clogged pores than baseline. Regular low-pH cleansing and a BHA exfoliant once or twice a week keeps pores clear by dissolving built-up sebum and dead skin cells.' },
    'No visible dark spots': { title: 'No Visible Dark Spots', body: 'No post-inflammatory hyperpigmentation detected. Dark spots form when skin produces excess melanin after inflammation. Daily SPF 30+ is the single best way to prevent them from forming or darkening.' },
    'Low redness':           { title: 'Low Redness', body: 'Your skin looks calm with minimal visible redness. Redness can be triggered by harsh products, hot water, or environmental stress. Niacinamide and centella asiatica are great anti-redness actives.' },
    'Smooth texture':        { title: 'Smooth Texture', body: 'Surface texture looks refined and even. Regular gentle exfoliation (AHA 1–2× per week) combined with consistent moisturising keeps skin smooth by removing dead cell buildup.' },
    'Refined pores':         { title: 'Refined Pores', body: 'Pores appear minimal. Pore size is mostly genetic, but keeping them clean and using niacinamide (5–10%) helps tighten their appearance over time.' },
    'Even skin tone':        { title: 'Even Skin Tone', body: 'Colour looks uniform across your face. Uneven tone is usually caused by sun damage, post-acne marks, or inflammation. Vitamin C serum + daily SPF are your best tools to maintain and improve evenness.' },
    'Balanced oil':          { title: 'Balanced Oil Production', body: 'Sebum levels look healthy. Over-washing and skipping moisturiser can actually increase oil production as your skin tries to compensate. A lightweight gel moisturiser helps keep oil balanced.' },
    'Well hydrated':         { title: 'Well Hydrated', body: 'Your moisture barrier appears intact. Hydrated skin looks plumper, heals faster, and is more resilient to breakouts. Hyaluronic acid serum applied to damp skin locks moisture in.' },
    'Healthy radiance':      { title: 'Healthy Radiance', body: 'Your skin looks bright and rested. Radiance comes from healthy cell turnover and good hydration. Vitamin C serum and gentle AHA exfoliation both boost glow over time.' },
    'Refreshed under-eye':   { title: 'Refreshed Under-Eye', body: 'Minimal puffiness or dark circles detected. The under-eye area has very thin skin that shows fatigue and dehydration first. Caffeine eye cream and good sleep both help maintain this area.' },
    // Concern entries
    'Active breakouts':   { title: 'Active Breakouts', body: 'Inflamed spots are present. Avoid picking — bacteria spread and cause scarring. Benzoyl peroxide (2.5–5%) or salicylic acid applied directly to spots helps clear them without over-drying surrounding skin.' },
    'Clogged pores':      { title: 'Clogged Pores', body: "Blackheads and whiteheads form when sebum and dead cells block pores. A BHA (salicylic acid 1–2%) used 2–3× per week dissolves the buildup from inside. Avoid pore strips — they remove the plug but don't prevent new ones forming." },
    'Dark spots':         { title: 'Dark Spots', body: 'Post-inflammatory hyperpigmentation forms after inflammation triggers melanin overproduction. SPF 30+ daily is essential — UV darkens existing spots. Vitamin C, niacinamide, and azelaic acid all help fade them over 8–12 weeks.' },
    'Redness':            { title: 'Redness', body: "Visible inflammation can come from active breakouts, a compromised skin barrier, or external triggers (fragrance, heat, harsh products). Centella asiatica and niacinamide are proven calming actives. Avoid scrubs and alcohol-based toners." },
    'Uneven texture':     { title: 'Uneven Texture', body: "Rough or bumpy surface texture is usually dead cell buildup or congestion. A gentle AHA (glycolic or lactic acid) 1–2× per week speeds cell turnover. Don't layer multiple actives — pick one exfoliant and use it consistently." },
    'Visible pores':      { title: 'Visible Pores', body: 'Pore size is largely genetic, but keeping them clear shrinks their appearance. Niacinamide (5–10%) tightens pore appearance over time. BHA keeps them clear. Clay masks once a week absorb excess oil that enlarges them.' },
    'Uneven tone':        { title: 'Uneven Tone', body: 'Colour variation across zones can be from sun damage, acne marks, or inflammation. Daily SPF prevents further darkening. Vitamin C serum (L-ascorbic acid 10–20%) + niacinamide together address both brightness and tone over 8–12 weeks.' },
    'Excess oiliness':    { title: 'Excess Oiliness', body: 'Over-production of sebum is often genetic but worsened by over-cleansing (strips the barrier → compensatory oil) or skipping moisturiser. A lightweight gel moisturiser + niacinamide regulates output without stripping.' },
    'Low hydration':      { title: 'Low Hydration', body: 'A weakened moisture barrier lets water escape. Apply hyaluronic acid serum to damp skin (it needs water to work) then immediately seal with a moisturiser containing ceramides. Avoid long hot showers and alcohol-based products.' },
    'Dull brightness':    { title: 'Dull Brightness', body: 'Dullness is usually dead cell buildup and poor circulation. Gentle AHA exfoliation (1–2×/week), vitamin C serum, and adequate sleep all contribute to radiance. Niacinamide also inhibits melanin transfer for a brightening effect.' },
    'Under-eye fatigue':  { title: 'Under-Eye Fatigue', body: 'The under-eye skin is the thinnest on the face — it shows dehydration and fatigue fast. Caffeine eye cream reduces puffiness. Hyaluronic acid eye products plump fine lines. Sleep quality matters more than any product.' },
  };

  return (
    <View style={styles.screen}>
      <LinearGradient
        colors={['#0A0220', '#070118', '#050108']}
        locations={[0, 0.55, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {onBack && (
        <TouchableOpacity
          onPress={onBack}
          style={[styles.backButton, { top: insets.top + 8 }]}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
            <Polyline
              points="15,18 9,12 15,6"
              stroke="rgba(255,255,255,0.7)"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </TouchableOpacity>
      )}

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 44, paddingBottom: 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <HeroCard
          avatarUri={avatarUri}
          eyebrow={eyebrow}
          headline={headline}
          description={description}
          score={score}
          scoreLabel={accent.label}
          accent={accent}
          imageNativeWidth={imageNativeWidth}
          imageNativeHeight={imageNativeHeight}
        />

        <View style={styles.statRow}>
          <StatCard
            icon={<CheckSm size={18} color={breakouts.color} />}
            label={breakouts.label}
            value={breakouts.value}
            valueColor={breakouts.color}
            iconBg={breakouts.color === C.green ? 'rgba(52,211,153,0.12)' : breakouts.color === C.amber ? C.amberBg : C.coralBg}
            iconBorder={breakouts.color === C.green ? 'rgba(52,211,153,0.25)' : breakouts.color === C.amber ? C.amberBorder : C.coralBorder}
            onPress={() => setModal({ title: 'Breakouts', body: BREAKOUT_INFO(breakouts.value, totalSpots) })}
          />
          <StatCard
            icon={<Drop size={18} color={C.violetSoft} />}
            label="Skin type"
            value={skinType || 'Normal'}
            valueColor={C.text}
            iconBg="rgba(124,92,252,0.14)"
            iconBorder="rgba(124,92,252,0.30)"
            onPress={() => setModal({ title: `Skin Type · ${skinType || 'Normal'}`, body: SKIN_TYPE_INFO[skinType] ?? SKIN_TYPE_INFO['Normal'] })}
          />
          <StatCard
            icon={
              trend.icon === 'down' ? <TrendDown size={18} color={trend.color} /> :
              trend.icon === 'flat' ? <TrendFlat size={18} color={trend.color} /> :
              <TrendUp size={18} color={trend.color} />
            }
            label={trend.label}
            value={trend.value}
            valueColor={trend.color}
            iconBg={trend.color === C.green ? 'rgba(52,211,153,0.12)' : trend.color === C.coral ? C.coralBg : 'rgba(124,92,252,0.14)'}
            iconBorder={trend.color === C.green ? 'rgba(52,211,153,0.25)' : trend.color === C.coral ? C.coralBorder : 'rgba(124,92,252,0.30)'}
            onPress={() => setModal({ title: `Trend · ${trend.value}`, body: TREND_INFO[trend.value] ?? TREND_INFO['Stable'] })}
          />
        </View>

        {zoneScores && zoneScores.length > 0 && (
          <SectionCard style={{ paddingHorizontal: 0 }}>
            <View style={{ paddingHorizontal: 14 }}>
              <SectionHead title="Zone Breakdown" />
            </View>
            <FaceZoneSummary zones={zoneScores} />
          </SectionCard>
        )}

        <SectionCard>
          <SectionHead title="Today's Highlights" />
          {highlights.map((h, i) => (
            <HighlightRow
              key={h.key}
              icon={h.icon}
              iconBg={h.iconBg}
              title={h.title}
              desc={h.desc}
              last={i === highlights.length - 1}
              onPress={() => setModal(HIGHLIGHT_INFO[h.title] ?? { title: h.title, body: h.desc })}
            />
          ))}
        </SectionCard>

        {concerns.length > 0 && (
          <SectionCard>
            <SectionHead title="Areas to Work On" />
            {concerns.map((c, i) => (
              <HighlightRow
                key={c.key}
                icon={c.icon}
                iconBg={c.iconBg}
                iconBorder={c.iconBorder}
                title={c.title}
                desc={c.desc}
                last={i === concerns.length - 1}
                onPress={() => setModal(HIGHLIGHT_INFO[c.title] ?? { title: c.title, body: c.desc })}
              />
            ))}
          </SectionCard>
        )}

        <SectionCard>
          <SectionHead title="Maintain Your Glow" badge={<Pill text="Maintenance mode" tone="green" />} />
          <HighlightRow
            icon={<Cleanse size={22} color={C.green} />}
            iconBg="rgba(52,211,153,0.10)"
            title="Gentle cleanse"
            desc="Wash away sweat, oil, and buildup."
            onPress={() => setModal({ title: 'Gentle Cleanse', body: 'Cleansing twice a day removes excess oil, sweat, and environmental debris that clog pores and cause breakouts. Use a gentle low-pH cleanser (pH 4.5–5.5) — harsh soaps strip your acid mantle and trigger more oil production as compensation. Lukewarm water only; hot water breaks down your skin barrier.', product: { name: 'Hydrating Facial Cleanser', brand: 'CeraVe', buyUrl: 'https://www.amazon.com/dp/B01MSSDEPK', iconType: 'cleanse' } })}
          />
          <HighlightRow
            icon={<Moisturize size={20} color={C.violetSoft} />}
            iconBg="rgba(124,92,252,0.12)"
            iconBorder="rgba(124,92,252,0.28)"
            title="Hydrate + moisturize"
            desc="Keep your barrier strong and balanced."
            onPress={() => setModal({ title: 'Hydrate + Moisturize', body: 'A healthy skin barrier keeps moisture in and irritants out. Apply a hydrating serum (hyaluronic acid) to damp skin, then seal with a moisturiser. Even oily skin needs moisturiser — skipping it signals your glands to produce more oil. Look for ceramides, niacinamide, or glycerin in your formula.', product: { name: 'Hyaluronic Acid 2% + B5', brand: 'The Ordinary', buyUrl: 'https://www.amazon.com/dp/B01N9SPQHM', iconType: 'hydrate' } })}
          />
          <HighlightRow
            icon={<Sun size={20} color={C.green} />}
            iconBg="rgba(52,211,153,0.10)"
            title="SPF every morning"
            desc="Protect clear skin from dark spots."
            last
            onPress={() => setModal({ title: 'SPF Every Morning', body: 'UV exposure is the #1 cause of dark spots, accelerated ageing, and post-acne marks getting darker. SPF 30+ applied every morning — even on cloudy days and indoors near windows — is non-negotiable. Reapply every 2 hours if you\'re outside. Mineral (zinc oxide) or chemical SPF both work; pick the texture you\'ll actually wear daily.', product: { name: 'UV Clear Broad-Spectrum SPF 46', brand: 'EltaMD', buyUrl: 'https://www.amazon.com/dp/B002MSN3QQ', iconType: 'spf' } })}
          />
        </SectionCard>

        {/* Recommended products carousel */}
        <View style={styles.carouselWrap}>
          <LinearGradient
            colors={['rgba(20,8,42,0.55)', 'rgba(10,4,26,0.55)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={[StyleSheet.absoluteFill, { borderRadius: 18 }]}
          />
          <View style={styles.carouselHead}>
            <View style={sectionStyles.headLeft}>
              <Sparkle size={11} color={C.violetSoft} />
              <Text style={sectionStyles.headTitle}>RECOMMENDED FOR YOU</Text>
            </View>
            <Pill text="Top Picks" tone="green" />
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.carouselScroll}
          >
            {RECOMMENDED_PRODUCTS.map(p => (
              <ProductCarouselItem key={p.id} product={p} />
            ))}
          </ScrollView>
        </View>

        {/* Progress chart */}
        {scanHistory && scanHistory.length > 0 && (
          <SectionCard>
            <SectionHead
              title="Your Progress"
              badge={<Pill text={`${scanHistory.length} scan${scanHistory.length === 1 ? '' : 's'}`} tone="green" />}
            />
            <View style={{ marginTop: 4 }}>
              <ProgressMiniChart history={scanHistory} currentSessionId={currentSessionId} />
            </View>
            <Text style={progressStyles.caption}>Spot count over time — lower is better</Text>
          </SectionCard>
        )}

        {/* CTA */}
        <View style={styles.ctaWrap}>
          <TouchableOpacity activeOpacity={0.88} onPress={onStartPlan} style={styles.ctaButton}>
            <LinearGradient
              colors={['#6E45E8', '#4F22BE', '#3A0E90']}
              locations={[0, 0.5, 1]}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={styles.ctaGradient}
            >
              <Text style={styles.ctaText}>Start My Plan</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={onScanAgain} activeOpacity={0.7} style={styles.scanAgainBtn}>
          <Text style={styles.scanAgainText}>Take Another Scan</Text>
        </TouchableOpacity>

        {onViewFullScan && (
          <TouchableOpacity onPress={onViewFullScan} activeOpacity={0.7} style={styles.scanAgainBtn}>
            <Text style={styles.viewFullScanText}>View Full Scan Map</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      <InfoModal info={modal} onClose={() => setModal(null)} />
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#050108',
  },
  backButton: {
    position: 'absolute',
    left: 14,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  content: {
    paddingHorizontal: 14,
  },
  statRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  carouselWrap: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(124,92,252,0.2)',
    overflow: 'hidden',
    marginBottom: 10,
    paddingTop: 12,
    shadowColor: C.violet,
    shadowOpacity: 0.14,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  carouselHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  carouselScroll: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    gap: 10,
  },
  ctaWrap: {
    position: 'relative',
    marginTop: 8,
  },
  ctaButton: {
    height: 52,
    borderRadius: 999,
    overflow: 'hidden',
    shadowColor: C.violet,
    shadowOpacity: 0.5,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  ctaGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    fontFamily: Fonts.bold,
    fontSize: 17,
    lineHeight: 20,
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  scanAgainBtn: {
    alignItems: 'center',
    marginTop: 8,
    paddingVertical: 10,
  },
  scanAgainText: {
    fontFamily: Fonts.semibold,
    fontSize: 13,
    color: C.violetSoft,
  },
  viewFullScanText: {
    fontFamily: Fonts.semibold,
    fontSize: 13,
    color: 'rgba(255,255,255,0.45)',
  },
});

const progressStyles = StyleSheet.create({
  caption: {
    fontFamily: Fonts.regular,
    fontSize: 10.5,
    color: 'rgba(255,255,255,0.40)',
    textAlign: 'center',
    paddingBottom: 4,
  },
});
