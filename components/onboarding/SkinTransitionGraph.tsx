import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions, Easing } from 'react-native';
import Svg, { Path, Circle, Defs, LinearGradient, Stop, ClipPath, Rect } from 'react-native-svg';
import { Fonts, Colors } from '@/lib/theme';

const { width: SW } = Dimensions.get('window');
const CARD_PAD = 20;
const GW = SW - 48 - CARD_PAD * 2;
const GH = 180;
const CARD_BG = '#1C1C1E';
const PURPLE = Colors.primary;

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedRect = Animated.createAnimatedComponent(Rect);

function TrophyIcon({ size = 16 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        fill="#fff"
        d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94.63 1.5 1.98 2.63 3.61 2.96V19H7v2h10v-2h-4v-3.1c1.63-.33 2.98-1.46 3.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z"
      />
    </Svg>
  );
}

export default function SkinTransitionGraph() {
  const progress    = useRef(new Animated.Value(0)).current;
  const c1Opacity   = useRef(new Animated.Value(0)).current;
  const c2Opacity   = useRef(new Animated.Value(0)).current;
  const cBOpacity   = useRef(new Animated.Value(0)).current;
  const trophyScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const START_DELAY = 300;
    const LINE_DUR = 1200;
    Animated.sequence([
      Animated.delay(START_DELAY),
      Animated.timing(progress, { toValue: 1, duration: LINE_DUR, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
    ]).start();

    Animated.sequence([
      Animated.delay(START_DELAY),
      Animated.timing(c1Opacity, { toValue: 1, duration: 240, useNativeDriver: true }),
    ]).start();
    Animated.sequence([
      Animated.delay(START_DELAY + 520),
      Animated.timing(c2Opacity, { toValue: 1, duration: 240, useNativeDriver: true }),
    ]).start();
    Animated.sequence([
      Animated.delay(START_DELAY + 800),
      Animated.timing(cBOpacity, { toValue: 1, duration: 240, useNativeDriver: true }),
    ]).start();
    Animated.sequence([
      Animated.delay(START_DELAY + LINE_DUR - 100),
      Animated.spring(trophyScale, { toValue: 1, friction: 5, tension: 140, useNativeDriver: true }),
    ]).start();
  }, []);

  const p0 = { x: 12,         y: GH * 0.78 };
  const p1 = { x: GW * 0.32,  y: GH * 0.58 };
  const p2 = { x: GW - 16,    y: GH * 0.14 };

  // Point on the curve between p1 and p2, sitting on the line at ~t=0.4.
  const pB = { x: GW * 0.60,  y: GH * 0.39 };

  const linePath =
    `M ${p0.x} ${p0.y} ` +
    `C ${GW * 0.18} ${p0.y}, ${GW * 0.28} ${p1.y + 16}, ${p1.x} ${p1.y} ` +
    `C ${GW * 0.58} ${p1.y - 22}, ${GW * 0.78} ${p2.y + 12}, ${p2.x} ${p2.y}`;

  const fillPath = `${linePath} L ${p2.x} ${GH} L ${p0.x} ${GH} Z`;

  const pathLen = 520;

  return (
    <View style={s.card}>
      <Text style={s.cardTitle}>Your Skin Journey</Text>

      <View style={s.svgWrap}>
        <Svg width={GW + 24} height={GH + 8} viewBox={`-12 -4 ${GW + 24} ${GH + 8}`}>
          <Defs>
            <LinearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={PURPLE} stopOpacity={0.28} />
              <Stop offset="1" stopColor={PURPLE} stopOpacity={0} />
            </LinearGradient>
            <ClipPath id="reveal">
              <AnimatedRect
                x={-12}
                y={-4}
                width={progress.interpolate({ inputRange: [0, 1], outputRange: [0, GW + 24] })}
                height={GH + 8}
              />
            </ClipPath>
          </Defs>

          {[0.33, 0.66].map(pct => (
            <Path key={pct}
              d={`M 12 ${GH * pct} L ${GW - 16} ${GH * pct}`}
              stroke="rgba(255,255,255,0.08)" strokeWidth={1} strokeDasharray="4,4" />
          ))}

          <Path d={fillPath} fill="url(#fade)" stroke="none" clipPath="url(#reveal)" />

          <AnimatedPath
            d={linePath}
            stroke={PURPLE}
            strokeWidth={3}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={pathLen}
            strokeDashoffset={progress.interpolate({ inputRange: [0, 1], outputRange: [pathLen, 0] })}
          />

          <AnimatedCircle cx={p0.x} cy={p0.y} r={5.5} fill={CARD_BG} stroke={PURPLE} strokeWidth={2.5} opacity={c1Opacity} />
          <AnimatedCircle cx={p1.x} cy={p1.y} r={5.5} fill={CARD_BG} stroke={PURPLE} strokeWidth={2.5} opacity={c2Opacity} />
          <AnimatedCircle cx={pB.x} cy={pB.y} r={5.5} fill={CARD_BG} stroke={PURPLE} strokeWidth={2.5} opacity={cBOpacity} />
        </Svg>

        <Animated.View style={[s.trophy, { left: p2.x - 6, top: p2.y - 14, transform: [{ scale: trophyScale }] }]}>
          <TrophyIcon size={18} />
        </Animated.View>
      </View>

      <View style={s.xAxis}>
        <Text style={s.xLabel}>3 Days</Text>
        <Text style={[s.xLabel, { textAlign: 'center' }]}>7 Days</Text>
        <Text style={[s.xLabel, { textAlign: 'right' }]}>30 Days</Text>
      </View>

      <Text style={s.caption}>
        Based on <Text style={s.captionSkin}>Skin</Text><Text style={s.captionX}>X</Text>'s historical data, skin clarity is usually delayed in the beginning, but improves significantly by day 30.
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: CARD_BG,
    borderRadius: 20,
    paddingHorizontal: CARD_PAD,
    paddingTop: 22,
    paddingBottom: 22,
  },
  cardTitle: { fontFamily: Fonts.semibold, fontSize: 17, color: '#FFFFFF' },
  svgWrap: { marginTop: 16, position: 'relative' },
  trophy: {
    position: 'absolute',
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: PURPLE,
    alignItems: 'center', justifyContent: 'center',
  },
  xAxis: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  xLabel: { flex: 1, fontFamily: Fonts.regular, fontSize: 12, color: 'rgba(255,255,255,0.45)' },
  caption: { fontFamily: Fonts.regular, fontSize: 13, color: '#FFFFFF', marginTop: 18, lineHeight: 19, textAlign: 'center' },
  captionSkin: { color: '#FFFFFF' },
  captionX: { color: PURPLE },
});
