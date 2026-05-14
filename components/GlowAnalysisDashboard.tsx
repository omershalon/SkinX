import React, { useState, useEffect, useRef } from 'react';
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
  Animated,
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
  hasPlan?: boolean;
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

const MapPin = ({ size = 18, color = C.coral }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 2C8.686 2 6 4.686 6 8c0 4.5 6 12 6 12s6-7.5 6-12c0-3.314-2.686-6-6-6z"
      fill={color}
      fillOpacity={0.2}
      stroke={color}
      strokeWidth={1.8}
      strokeLinejoin="round"
    />
    <Circle cx={12} cy={8} r={2} fill={color} />
  </Svg>
);

const StarOutline = ({ size = 20, color = C.violetSoft }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 3l2.6 5.4 5.9.9-4.3 4.1 1 5.8L12 16.5 6.8 19.2l1-5.8L3.5 9.3l5.9-.9z"
      stroke={color}
      strokeWidth={1.7}
      strokeLinejoin="round"
      fill="none"
    />
  </Svg>
);

const DotsIcon = ({ size = 20, color = C.violetSoft }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx={12} cy={12} r={1.7} fill={color} />
    <Circle cx={12} cy={6.8} r={1.7} fill={color} />
    <Circle cx={16.5} cy={9.4} r={1.7} fill={color} />
    <Circle cx={16.5} cy={14.6} r={1.7} fill={color} />
    <Circle cx={12} cy={17.2} r={1.7} fill={color} />
    <Circle cx={7.5} cy={14.6} r={1.7} fill={color} />
    <Circle cx={7.5} cy={9.4} r={1.7} fill={color} />
  </Svg>
);

const ShieldOutline = ({ size = 20, color = C.green }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 3l8 3v6c0 4.5-3.4 8.4-8 9-4.6-.6-8-4.5-8-9V6l8-3z"
      fill={color}
      fillOpacity={0.18}
      stroke={color}
      strokeWidth={1.8}
      strokeLinejoin="round"
    />
  </Svg>
);

const TripleSparkle = ({ size = 18, color = C.violetSoft }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M10 4.5l1.5 4.4 4.4 1.5-4.4 1.5-1.5 4.4-1.5-4.4-4.4-1.5 4.4-1.5z" fill={color} />
    <Path d="M17.5 13l.7 1.9 1.9.7-1.9.7-.7 1.9-.7-1.9-1.9-.7 1.9-.7z" fill={color} />
    <Path d="M16.5 4l.4 1.2 1.2.4-1.2.4-.4 1.2-.4-1.2-1.2-.4 1.2-.4z" fill={color} />
  </Svg>
);

const SlashCircle = ({ size = 22, color = C.greenSoft }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx={12} cy={12} r={9} stroke={color} strokeWidth={1.7} fill="none" />
    <Line x1={6} y1={18} x2={18} y2={6} stroke={color} strokeWidth={1.7} strokeLinecap="round" />
  </Svg>
);

const MoonStars = ({ size = 20, color = C.violetSoft }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M20 14.5A8 8 0 1 1 9.5 4a6 6 0 0 0 10.5 10.5z"
      fill={color}
      fillOpacity={0.22}
      stroke={color}
      strokeWidth={1.6}
      strokeLinejoin="round"
    />
    <Path d="M18 4.2l.5-1.4L20 2.4l-1.5-.5L18 .5l-.5 1.4-1.5.5L17.5 3z" fill={color} />
    <Path d="M14.5 9l.3-.8.8-.3-.8-.3-.3-.8-.3.8-.8.3.8.3z" fill={color} />
  </Svg>
);

const LeafIcon = ({ size = 13, color = C.violetSoft }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M20 4c-9 0-15 5-15 13 0 .8.1 1.5.3 2.2 1.1-6.5 6.4-11 14.7-11-1 5-5 8.4-10 9"
      stroke={color}
      fill={color}
      fillOpacity={0.18}
      strokeWidth={1.6}
      strokeLinejoin="round"
      strokeLinecap="round"
    />
  </Svg>
);

const BottleIcon = ({ size = 22, color = C.greenSoft }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M10.5 3.5h3v2.5h-3z" stroke={color} strokeWidth={1.4} strokeLinejoin="round" fill="none" />
    <Path
      d="M8 8.5c0-.5.4-1 1-1h6c.6 0 1 .5 1 1v11c0 .6-.4 1-1 1H9c-.6 0-1-.4-1-1z"
      stroke={color}
      strokeWidth={1.5}
      strokeLinejoin="round"
      fill="none"
    />
    <Path d="M8 12.5h8" stroke={color} strokeWidth={1.3} strokeLinecap="round" />
  </Svg>
);

const DropletFilled = ({ size = 22, color = C.violetSoft }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 3C12 3 5.5 11 5.5 15.5a6.5 6.5 0 0 0 13 0C18.5 11 12 3 12 3z"
      fill={color}
      fillOpacity={0.92}
    />
  </Svg>
);

const SparkleSmall = ({ size = 12, color = C.green }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M12 3l1.6 5.4L19 10l-5.4 1.6L12 17l-1.6-5.4L5 10l5.4-1.6L12 3z" fill={color} />
  </Svg>
);

// ─── Animated Ring Sparkles ─────────────────────────────────────────────────

const RING_SPARKLES = [
  { top: -14, right:  6, size: 11, delay:   0, duration: 1100 },
  { top:  12, right: -16, size:  7, delay: 450, duration:  900 },
  { bottom:  4, right: -12, size:  9, delay: 220, duration: 1050 },
  { top:  -8, left:  -2, size:  6, delay: 680, duration:  850 },
  { bottom: -6, left:  8, size:  8, delay: 340, duration:  980 },
];

function AnimatedRingSparkles({ accent }: { accent: { ring: string; ringSoft: string } }) {
  const anims = useRef(RING_SPARKLES.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    const loops = RING_SPARKLES.map((s, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(s.delay),
          Animated.timing(anims[i], { toValue: 1, duration: s.duration / 2, useNativeDriver: true }),
          Animated.timing(anims[i], { toValue: 0, duration: s.duration / 2, useNativeDriver: true }),
          Animated.delay(700),
        ])
      )
    );
    loops.forEach(l => l.start());
    return () => loops.forEach(l => l.stop());
  }, []);

  return (
    <>
      {RING_SPARKLES.map((s, i) => {
        const pos: Record<string, number> = {};
        if ('top'    in s) pos.top    = s.top as number;
        if ('bottom' in s) pos.bottom = s.bottom as number;
        if ('left'   in s) pos.left   = s.left as number;
        if ('right'  in s) pos.right  = s.right as number;
        return (
          <Animated.View
            key={i}
            style={[
              { position: 'absolute', zIndex: 10 },
              pos,
              {
                opacity: anims[i],
                transform: [{ scale: anims[i].interpolate({ inputRange: [0, 1], outputRange: [0.4, 1.3] }) }],
              },
            ]}
          >
            <Sparkle size={s.size} color={i % 2 === 0 ? accent.ring : accent.ringSoft} />
          </Animated.View>
        );
      })}
    </>
  );
}

// ─── Glow Score Ring ────────────────────────────────────────────────────────

function GlowScoreRing({ score, accent, size = 88 }: { score: number; accent: { ring: string; ringSoft: string; halo: string }; size?: number }) {
  const stroke = size > 90 ? 5 : 4;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = (Math.max(0, Math.min(100, score)) / 100) * c;
  const scoreFontSize = Math.round(size * 0.35);
  const haloOffset = Math.round(size * 0.09);

  return (
    <View style={{ width: size, height: size, position: 'relative' }}>
      <View
        style={{
          position: 'absolute',
          top: -haloOffset,
          left: -haloOffset,
          right: -haloOffset,
          bottom: -haloOffset,
          borderRadius: 999,
          elevation: 6,
          shadowColor: accent.ring,
          shadowOpacity: 0.55,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 0 },
          backgroundColor: accent.halo,
        }}
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
        <Text style={[ringStyles.scoreText, { fontSize: scoreFontSize, lineHeight: scoreFontSize + 6, letterSpacing: scoreFontSize > 30 ? -1.4 : -0.8 }]}>{Math.round(score)}</Text>
      </View>
      {size >= 90 && (
        <>
          <View style={[ringStyles.spark, { top: -2, right: -8 }]}>
            <Sparkle size={12} color="#fff" />
          </View>
          <View style={[ringStyles.spark, { top: 18, right: -12 }]}>
            <Sparkle size={8} color={accent.ringSoft} />
          </View>
        </>
      )}
    </View>
  );
}

const ringStyles = StyleSheet.create({
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
  subline,
  score,
  scoreLabel,
  accent,
  imageNativeWidth,
  imageNativeHeight,
}: {
  avatarUri: string;
  eyebrow: string;
  headline: string;
  subline?: string;
  score: number;
  scoreLabel: string;
  accent: { ring: string; ringSoft: string; halo: string };
  imageNativeWidth: number;
  imageNativeHeight: number;
}) {
  const [avatarExpanded, setAvatarExpanded] = useState(false);

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
        {/* avatar — tappable to expand */}
        <TouchableOpacity
          style={heroStyles.avatarWrap}
          onPress={() => avatarUri && setAvatarExpanded(true)}
          activeOpacity={0.85}
        >
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={heroStyles.avatar} resizeMode="cover" />
          ) : (
            <View style={[heroStyles.avatar, { backgroundColor: 'rgba(167,139,250,0.25)' }]} />
          )}
        </TouchableOpacity>

        {/* text col */}
        <View style={heroStyles.textCol}>
          <View style={[heroStyles.eyebrowPill, { borderColor: accent.ring + '55', backgroundColor: accent.ring + '18' }]}>
            <Sparkle size={9} color={accent.ring} />
            <Text style={[heroStyles.eyebrow, { color: accent.ring }]}>{eyebrow}</Text>
          </View>
          <Text style={heroStyles.headline} numberOfLines={2}>{headline}</Text>
          {!!subline && (
            <Text style={heroStyles.subline}>{subline}</Text>
          )}
        </View>

        {/* score col */}
        <View style={heroStyles.scoreCol}>
          <Text style={[heroStyles.scoreLabel, { color: accent.ring }]}>Glow Score</Text>
          <View style={{ position: 'relative' }}>
            <GlowScoreRing score={score} accent={accent} />
            <AnimatedRingSparkles accent={accent} />
          </View>
          <Text style={[heroStyles.scoreSub, { color: accent.ringSoft }]}>{scoreLabel}</Text>
        </View>

        {/* full-screen avatar modal */}
        <Modal visible={avatarExpanded} transparent animationType="fade" onRequestClose={() => setAvatarExpanded(false)}>
          <Pressable
            style={heroStyles.avatarModalBg}
            onPress={() => setAvatarExpanded(false)}
          >
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
    paddingTop: 16,
    paddingBottom: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(167,139,250,0.55)',
    overflow: 'hidden',
    shadowColor: C.violet,
    shadowOpacity: 0.45,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  avatarWrap: {
    width: 100,
    height: 128,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  textCol: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  eyebrowPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 9,
    marginBottom: 8,
  },
  eyebrow: {
    fontFamily: Fonts.semibold,
    fontSize: 11,
    letterSpacing: 0.1,
  },
  headline: {
    fontFamily: Fonts.bold,
    fontSize: 19,
    lineHeight: 23,
    color: C.text,
    letterSpacing: -0.4,
  },
  subline: {
    fontFamily: Fonts.regular,
    fontSize: 11,
    lineHeight: 15,
    color: C.textMuted,
    marginTop: 5,
  },
  scoreCol: {
    alignItems: 'center',
    width: 88,
    flexShrink: 0,
  },
  scoreLabel: {
    fontFamily: Fonts.bold,
    fontSize: 12,
    lineHeight: 14,
    letterSpacing: 0.2,
    marginBottom: 14,
  },
  scoreSub: {
    fontFamily: Fonts.semibold,
    fontSize: 12,
    lineHeight: 14,
    marginTop: 14,
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
  sub,
  valueColor = C.green,
  iconBg = 'rgba(52,211,153,0.12)',
  iconBorder = 'rgba(52,211,153,0.25)',
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
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
      <Text style={[statStyles.value, { color: valueColor }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.65}>{value}</Text>
      {!!sub && <Text style={statStyles.sub}>{sub}</Text>}
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
  sub: {
    fontFamily: Fonts.regular,
    fontSize: 9.5,
    lineHeight: 11,
    color: C.textMuted,
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
        <View style={sectionStyles.headDot} />
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
    gap: 8,
  },
  headDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: C.violetSoft,
  },
  headTitle: {
    fontFamily: Fonts.bold,
    fontSize: 13,
    lineHeight: 16,
    letterSpacing: -0.1,
    color: 'rgba(255,255,255,0.90)',
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
  totalSpots,
  zoneScores,
  skinAssessment,
  primaryAcneType,
}: {
  totalSpots?: number | null;
  zoneScores?: ZoneScore[];
  skinAssessment?: SkinAssessmentItem[];
  primaryAcneType?: string | null;
}): number {
  const spots = totalSpots ?? 0;

  // Component 1 — spot count, exponential decay (40%)
  // 0→100, 5→76, 10→58, 20→33, 30→19
  const spotScore = 100 * Math.exp(-0.055 * spots);

  // Component 2 — Gemini visual zone scores (35%)
  // Uses Gemini's per-zone visual_score when available; falls back to severity tier.
  const ZONE_SEVERITY_FALLBACK: Record<string, number> = { clear: 100, mild: 76, moderate: 46, severe: 18 };
  let zoneScore: number;
  if (zoneScores && zoneScores.length > 0) {
    const perZone = zoneScores.map(z =>
      typeof z.visual_score === 'number' ? z.visual_score : (ZONE_SEVERITY_FALLBACK[z.severity] ?? 50)
    );
    zoneScore = perZone.reduce((a, b) => a + b, 0) / perZone.length;
  } else {
    zoneScore = spotScore;
  }

  // Component 3 — skin assessment categories (25%, omitted if empty)
  // Gemini scores each 0–10 (lower = better); inverted to 0–100.
  let assessScore: number | null = null;
  if (skinAssessment && skinAssessment.length > 0) {
    const perItem = skinAssessment.map(a => (1 - a.score / 10) * 100);
    assessScore = perItem.reduce((a, b) => a + b, 0) / perItem.length;
  }

  const base = assessScore !== null
    ? 0.40 * spotScore + 0.35 * zoneScore + 0.25 * assessScore
    : 0.53 * spotScore + 0.47 * zoneScore;

  // Acne type multiplier — inflammatory types penalise more than non-inflammatory
  const TYPE_MULT: Record<string, number> = {
    nodular: 0.87, nodule: 0.87, cystic: 0.87, cyst: 0.87,
    pustular: 0.92, pustule: 0.92, inflammatory: 0.92,
    papular: 0.94, papule: 0.94,
    comedonal: 0.97, whitehead: 0.98, blackhead: 0.98,
  };
  const typeKey = (primaryAcneType ?? '').toLowerCase();
  const multiplier = Object.entries(TYPE_MULT).find(([k]) => typeKey.includes(k))?.[1] ?? 1.0;

  return Math.round(Math.max(5, Math.min(99, base * multiplier)));
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

const ZONE_SHORT_LABELS: Record<string, string> = {
  forehead:     'Forehead',
  left_cheek:   'Left Cheek',
  right_cheek:  'Right Cheek',
  nose:         'Nose',
  chin_jawline: 'Chin & Jaw',
};
const SEVERITY_ORDER: Record<string, number> = { severe: 4, moderate: 3, mild: 2, clear: 1 };

function deriveWorstZone(zoneScores: ZoneScore[] | undefined) {
  if (!zoneScores || zoneScores.length === 0) return null;
  return zoneScores.reduce((worst, zone) => {
    const ws = SEVERITY_ORDER[worst.severity] ?? 0;
    const zs = SEVERITY_ORDER[zone.severity] ?? 0;
    return zs > ws || (zs === ws && zone.lesion_count > worst.lesion_count) ? zone : worst;
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

// ─── New Components: Scan-Findings / Routine-Tonight UI ─────────────────────

function FancySectionHead({
  icon,
  iconBg,
  title,
  subtitle,
  badge,
  compact,
}: {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <View style={[fancyHeadStyles.row, compact && fancyHeadStyles.rowCompact]}>
      <View style={[fancyHeadStyles.iconCircle, { backgroundColor: iconBg }]}>{icon}</View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={fancyHeadStyles.title}>{title}</Text>
        {!!subtitle && <Text style={fancyHeadStyles.subtitle}>{subtitle}</Text>}
      </View>
      {badge}
    </View>
  );
}

const fancyHeadStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  rowCompact: {
    marginBottom: 4,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: Fonts.bold,
    fontSize: 16,
    lineHeight: 19,
    color: C.text,
    letterSpacing: -0.2,
  },
  subtitle: {
    fontFamily: Fonts.regular,
    fontSize: 11,
    lineHeight: 14,
    color: C.textDim,
    marginTop: 2,
  },
});

function OverallPill({ score }: { score: number }) {
  const label = score >= 80 ? 'Great' : score >= 65 ? 'Good' : score >= 50 ? 'Fair' : 'Needs care';
  const tone = score >= 65 ? C.green : score >= 50 ? C.amber : C.coral;
  const bg = score >= 65 ? C.greenBg : score >= 50 ? C.amberBg : C.coralBg;
  const border = score >= 65 ? C.greenBorder : score >= 50 ? C.amberBorder : C.coralBorder;
  return (
    <View style={[overallStyles.pill, { backgroundColor: bg, borderColor: border }]}>
      <SparkleSmall size={11} color={tone} />
      <Text style={[overallStyles.text, { color: tone }]}>Overall: {label}</Text>
      <View style={[overallStyles.dot, { borderColor: tone }]} />
    </View>
  );
}

const overallStyles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderRadius: 999,
    borderWidth: 1,
  },
  text: {
    fontFamily: Fonts.semibold,
    fontSize: 10.5,
    lineHeight: 12,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
  },
});

function MaintenancePill() {
  return (
    <View style={maintenancePillStyles.pill}>
      <LeafIcon size={11} color={C.violetSoft} />
      <Text style={maintenancePillStyles.text}>Maintenance mode</Text>
    </View>
  );
}

const maintenancePillStyles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(124,92,252,0.45)',
    backgroundColor: 'rgba(124,92,252,0.14)',
  },
  text: {
    fontFamily: Fonts.semibold,
    fontSize: 10.5,
    lineHeight: 12,
    color: C.violetSoft,
  },
});

function MainTakeawayCard({
  label,
  title,
  body,
  showMaintenancePill,
}: {
  label: string;
  title: string;
  body: string;
  showMaintenancePill: boolean;
}) {
  return (
    <View style={takeawayStyles.card}>
      <LinearGradient
        colors={['rgba(20,8,42,0.55)', 'rgba(10,4,26,0.55)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[StyleSheet.absoluteFill, { borderRadius: 18 }]}
      />
      <View style={[takeawayStyles.iconCircle]}>
        <StarOutline size={20} color={C.violetSoft} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={takeawayStyles.headerRow}>
          <Text style={takeawayStyles.label}>{label}</Text>
          {showMaintenancePill && <MaintenancePill />}
        </View>
        <Text style={takeawayStyles.title}>{title}</Text>
        {!!body && <Text style={takeawayStyles.body}>{body}</Text>}
      </View>
    </View>
  );
}

const takeawayStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderRadius: 18,
    paddingVertical: 14,
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
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(124,92,252,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
    gap: 8,
  },
  label: {
    fontFamily: Fonts.semibold,
    fontSize: 11.5,
    lineHeight: 14,
    color: C.textDim,
    letterSpacing: 0.1,
  },
  title: {
    fontFamily: Fonts.bold,
    fontSize: 15,
    lineHeight: 19,
    color: C.text,
    letterSpacing: -0.2,
    marginBottom: 4,
  },
  body: {
    fontFamily: Fonts.regular,
    fontSize: 11.5,
    lineHeight: 16,
    color: C.textDim,
  },
});

function FindingCard({
  icon,
  iconBg,
  iconBorder,
  title,
  desc,
  pillText,
  pillTone,
  onPress,
}: {
  icon: React.ReactNode;
  iconBg: string;
  iconBorder: string;
  title: string;
  desc: string;
  pillText: string;
  pillTone: 'green' | 'violet';
  onPress?: () => void;
}) {
  const palette =
    pillTone === 'violet'
      ? { bg: 'rgba(124,92,252,0.16)', border: 'rgba(124,92,252,0.45)', text: C.violetSoft }
      : { bg: C.greenBg, border: C.greenBorder, text: C.greenSoft };

  return (
    <TouchableOpacity style={findingStyles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={[findingStyles.iconCircle, { backgroundColor: iconBg, borderColor: iconBorder }]}>
        {icon}
      </View>
      <Text style={findingStyles.title} numberOfLines={2}>{title}</Text>
      <Text style={findingStyles.desc} numberOfLines={3}>{desc}</Text>
      <View style={[findingStyles.pill, { backgroundColor: palette.bg, borderColor: palette.border }]}>
        {pillTone === 'violet' ? (
          <Text style={[findingStyles.pillTilde, { color: palette.text }]}>~</Text>
        ) : (
          <CheckSm size={10} color={palette.text} />
        )}
        <Text style={[findingStyles.pillText, { color: palette.text }]}>{pillText}</Text>
      </View>
    </TouchableOpacity>
  );
}

const findingStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 7,
  },
  card: {
    flex: 1,
    minWidth: 0,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(124,92,252,0.22)',
    backgroundColor: 'rgba(10,4,26,0.45)',
    paddingVertical: 14,
    paddingHorizontal: 11,
    alignItems: 'flex-start',
    gap: 9,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: Fonts.bold,
    fontSize: 13.5,
    lineHeight: 16,
    color: C.text,
    letterSpacing: -0.2,
  },
  desc: {
    fontFamily: Fonts.regular,
    fontSize: 11,
    lineHeight: 14.5,
    color: C.textDim,
    minHeight: 44,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    marginTop: 2,
  },
  pillTilde: {
    fontFamily: Fonts.bold,
    fontSize: 12,
    lineHeight: 13,
  },
  pillText: {
    fontFamily: Fonts.semibold,
    fontSize: 11,
    lineHeight: 13,
  },
});

function RoutineStep({
  number,
  icon,
  title,
  desc,
  onPress,
}: {
  number: number;
  icon: React.ReactNode;
  title: string;
  desc: string;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity style={routineStyles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={routineStyles.topRow}>
        <View style={routineStyles.numberBadge}>
          <Text style={routineStyles.numberText}>{number}</Text>
        </View>
        <Text style={routineStyles.title} numberOfLines={2}>{title}</Text>
        <View style={routineStyles.iconWrap}>{icon}</View>
      </View>
      <Text style={routineStyles.desc} numberOfLines={3}>{desc}</Text>
    </TouchableOpacity>
  );
}

function DottedConnector() {
  return (
    <View style={routineStyles.connector}>
      <View style={routineStyles.connectorDot} />
      <View style={routineStyles.connectorDot} />
      <View style={routineStyles.connectorDot} />
      <View style={routineStyles.connectorDot} />
    </View>
  );
}

const routineStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  card: {
    flex: 1,
    minWidth: 0,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(124,92,252,0.22)',
    backgroundColor: 'rgba(10,4,26,0.45)',
    paddingVertical: 13,
    paddingHorizontal: 11,
    gap: 8,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  numberBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: C.violet,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberText: {
    fontFamily: Fonts.bold,
    fontSize: 12,
    lineHeight: 14,
    color: '#FFFFFF',
  },
  title: {
    flex: 1,
    fontFamily: Fonts.bold,
    fontSize: 13.5,
    lineHeight: 16,
    color: C.text,
    letterSpacing: -0.2,
  },
  iconWrap: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  desc: {
    fontFamily: Fonts.regular,
    fontSize: 11,
    lineHeight: 14.5,
    color: C.textDim,
  },
  connector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingHorizontal: 4,
  },
  connectorDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(124,92,252,0.6)',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(52,211,153,0.28)',
    backgroundColor: 'rgba(52,211,153,0.06)',
  },
  footerText: {
    flex: 1,
    fontFamily: Fonts.regular,
    fontSize: 11.5,
    lineHeight: 15,
    color: C.textDim,
  },
  footerHighlight: {
    fontFamily: Fonts.bold,
    color: C.greenSoft,
  },
});

// ─── Findings / Routine / Takeaway derivation ───────────────────────────────

type FindingTone = 'green' | 'violet';
interface Finding {
  key: string;
  icon: React.ReactNode;
  iconBg: string;
  iconBorder: string;
  title: string;
  desc: string;
  pillText: string;
  pillTone: FindingTone;
}

function deriveFindings(
  assessment: SkinAssessmentItem[] | undefined,
  totalSpots: number | null | undefined,
): Finding[] {
  const greenBgI = 'rgba(52,211,153,0.10)';
  const greenBd = 'rgba(52,211,153,0.40)';
  const violetBg = 'rgba(124,92,252,0.14)';
  const violetBd = 'rgba(124,92,252,0.45)';

  const spots = totalSpots ?? 0;
  const breakoutsClear = spots === 0;

  const findIn = (cats: string[]) =>
    assessment?.find((a) => cats.includes(a.category));

  const poresItem = findIn(['comedones', 'pore_visibility']);
  const toneItem = findIn(['skin_tone_evenness', 'dark_spots']);

  // Slot 1 — Breakouts
  const breakouts: Finding = breakoutsClear
    ? {
        key: 'breakouts',
        icon: <ShieldOutline size={22} color={C.green} />,
        iconBg: greenBgI,
        iconBorder: greenBd,
        title: 'No active breakouts',
        desc: "No inflamed acne detected in today's scan.",
        pillText: 'Clear',
        pillTone: 'green',
      }
    : {
        key: 'breakouts',
        icon: <ShieldOutline size={22} color={C.violetSoft} />,
        iconBg: violetBg,
        iconBorder: violetBd,
        title: `${spots} active spot${spots === 1 ? '' : 's'}`,
        desc: 'A few inflamed spots showed up in this scan.',
        pillText: spots > 8 ? 'Watch' : 'Mild',
        pillTone: 'violet',
      };

  // Slot 2 — Pores
  const poresMild = poresItem ? !poresItem.is_strength || (poresItem.score ?? 0) >= 3 : false;
  const pores: Finding = poresMild
    ? {
        key: 'pores',
        icon: <DotsIcon size={22} color={C.violetSoft} />,
        iconBg: violetBg,
        iconBorder: violetBd,
        title: 'Pores look calm',
        desc: 'Minor congestion only, mostly on the forehead.',
        pillText: 'Mild',
        pillTone: 'violet',
      }
    : {
        key: 'pores',
        icon: <DotsIcon size={22} color={C.green} />,
        iconBg: greenBgI,
        iconBorder: greenBd,
        title: 'Pores look clear',
        desc: 'Few clogged pores detected across your zones.',
        pillText: 'Clear',
        pillTone: 'green',
      };

  // Slot 3 — Tone
  const toneStable = !toneItem || toneItem.is_strength;
  const tone: Finding = toneStable
    ? {
        key: 'tone',
        icon: <Sun size={22} color={C.green} />,
        iconBg: greenBgI,
        iconBorder: greenBd,
        title: 'Tone looks even',
        desc: 'No visible dark spots or redness spikes.',
        pillText: 'Stable',
        pillTone: 'green',
      }
    : {
        key: 'tone',
        icon: <Sun size={22} color={C.violetSoft} />,
        iconBg: violetBg,
        iconBorder: violetBd,
        title: 'Tone variation',
        desc: 'Slight unevenness picked up across your face.',
        pillText: 'Mild',
        pillTone: 'violet',
      };

  return [breakouts, pores, tone];
}

interface RoutineStepData {
  key: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
  body: string;
}

function deriveRoutineSteps(
  score: number,
  assessment: SkinAssessmentItem[] | undefined,
  totalSpots: number | null | undefined,
): RoutineStepData[] {
  const spots = totalSpots ?? 0;
  const maintenance = score >= 80 && spots === 0;

  if (maintenance) {
    return [
      {
        key: 'cleanse',
        icon: <BottleIcon size={22} color={C.greenSoft} />,
        title: 'Cleanse',
        desc: 'Wash off sunscreen, sweat, and oil gently.',
        body: 'A gentle low-pH cleanser removes the day without stripping your barrier. Lukewarm water only — hot water breaks down your skin barrier.',
      },
      {
        key: 'moisturize',
        icon: <DropletFilled size={22} color={C.violetSoft} />,
        title: 'Moisturize',
        desc: 'Use a light moisturizer to keep your barrier calm.',
        body: 'A lightweight moisturizer with ceramides or niacinamide locks in hydration overnight without feeling heavy.',
      },
      {
        key: 'skip',
        icon: <SlashCircle size={22} color={C.greenSoft} />,
        title: 'Skip strong actives',
        desc: 'No need to over-treat tonight. Keep it simple.',
        body: 'When your skin looks balanced, layering retinoids or acids can disrupt your barrier. Take the night off — your skin will thank you tomorrow.',
      },
    ];
  }

  return [
    {
      key: 'cleanse',
      icon: <BottleIcon size={22} color={C.greenSoft} />,
      title: 'Cleanse',
      desc: 'Wash off sunscreen, sweat, and oil gently.',
      body: 'A gentle low-pH cleanser removes the day without stripping your barrier. Lukewarm water only.',
    },
    {
      key: 'treat',
      icon: <DropletFilled size={22} color={C.violetSoft} />,
      title: 'Treat',
      desc: 'Spot-treat with a targeted active where needed.',
      body: 'Apply a BHA or benzoyl peroxide only to active spots. Avoid layering multiple actives on the same night.',
    },
    {
      key: 'moisturize',
      icon: <DropletFilled size={22} color={C.violetSoft} />,
      title: 'Moisturize',
      desc: 'Seal in hydration to support your barrier.',
      body: 'A moisturizer with ceramides or hyaluronic acid restores moisture and helps actives work without irritation.',
    },
  ];
}

function deriveTakeaway(score: number, description: string | undefined) {
  if (score >= 80) {
    return {
      title: "You're in maintenance mode today.",
      body: description?.trim() || "Keep your routine simple tonight—cleanse, moisturize, and avoid over-treating.",
      maintenance: true,
    };
  }
  if (score >= 65) {
    return {
      title: 'Your skin is looking solid today.',
      body: description?.trim() || 'Stay consistent with your routine—you\'re trending in the right direction.',
      maintenance: false,
    };
  }
  if (score >= 50) {
    return {
      title: 'A few areas to focus on tonight.',
      body: description?.trim() || 'Spot-treat actives, hydrate, and avoid layering too much.',
      maintenance: false,
    };
  }
  return {
    title: "Let's give your skin some care tonight.",
    body: description?.trim() || 'Stick to gentle cleansing, targeted treatment, and a calming moisturizer.',
    maintenance: false,
  };
}

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
  hasPlan,
  onStartPlan,
  onScanAgain,
  onBack,
  onViewFullScan,
  scanHistory,
  currentSessionId,
}: GlowAnalysisDashboardProps) {
  const insets = useSafeAreaInsets();
  const [modal, setModal] = useState<InfoSheet | null>(null);

  const score = deriveGlowScore({ totalSpots, zoneScores, skinAssessment, primaryAcneType });
  const accent = deriveScoreAccent(score);
  const findings = deriveFindings(skinAssessment, totalSpots);
  const routineSteps = deriveRoutineSteps(score, skinAssessment, totalSpots);
  const takeaway = deriveTakeaway(score, description);
  const eyebrow = "Today's Scan";

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
          subline={
            totalSpots && totalSpots > 0
              ? `${totalSpots} spot${totalSpots !== 1 ? 's' : ''} detected today.`
              : 'No active breakouts detected today.'
          }
          score={score}
          scoreLabel={accent.label}
          accent={accent}
          imageNativeWidth={imageNativeWidth}
          imageNativeHeight={imageNativeHeight}
        />

        <MainTakeawayCard
          label="Main Takeaway"
          title={takeaway.title}
          body={takeaway.body}
          showMaintenancePill={takeaway.maintenance}
        />

        <SectionCard>
          <FancySectionHead
            icon={<TripleSparkle size={20} color={C.violetSoft} />}
            iconBg="rgba(124,92,252,0.18)"
            title="Scan Findings"
            subtitle="AI analysis from today's skin scan"
            badge={<OverallPill score={score} />}
          />
          <View style={findingStyles.row}>
            {findings.map((f) => (
              <FindingCard
                key={f.key}
                icon={f.icon}
                iconBg={f.iconBg}
                iconBorder={f.iconBorder}
                title={f.title}
                desc={f.desc}
                pillText={f.pillText}
                pillTone={f.pillTone}
                onPress={() => setModal(HIGHLIGHT_INFO[f.title] ?? { title: f.title, body: f.desc })}
              />
            ))}
          </View>
        </SectionCard>

        <SectionCard>
          <FancySectionHead
            icon={<MoonStars size={22} color={C.violetSoft} />}
            iconBg="rgba(124,92,252,0.18)"
            title="Your Routine Tonight"
            subtitle="Personalized plan based on your scan"
            badge={<MaintenancePill />}
          />
          <View style={routineStyles.row}>
            {routineSteps.map((step, i) => (
              <React.Fragment key={step.key}>
                <RoutineStep
                  number={i + 1}
                  icon={step.icon}
                  title={step.title}
                  desc={step.desc}
                  onPress={() => setModal({ title: step.title, body: step.body })}
                />
                {i < routineSteps.length - 1 && <DottedConnector />}
              </React.Fragment>
            ))}
          </View>
          <View style={routineStyles.footer}>
            <SparkleSmall size={11} color={C.green} />
            <Text style={routineStyles.footerText}>
              <Text style={routineStyles.footerHighlight}>Less is more.</Text>
              {'  '}Your skin looks balanced—support and protect tonight.
            </Text>
          </View>
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
            <FancySectionHead
              icon={<TripleSparkle size={20} color={C.violetSoft} />}
              iconBg="rgba(124,92,252,0.18)"
              title="Recommended For Your Routine"
              subtitle="Recommended because your scan is clear and your goal is maintenance."
              badge={<Pill text="Top Picks" tone="green" />}
              compact
            />
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
              <Text style={styles.ctaText}>{hasPlan ? 'Update My Plan' : 'Start My Plan'}</Text>
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
