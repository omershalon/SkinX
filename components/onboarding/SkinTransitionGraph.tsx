import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions, Easing } from 'react-native';
import Svg, { Path, Circle, Defs, LinearGradient, Stop, ClipPath } from 'react-native-svg';
import { Fonts, Colors } from '@/lib/theme';

const { width: SW } = Dimensions.get('window');
const CARD_PAD = 20;
const GW = SW - 48 - CARD_PAD * 2;
const GH = 180;
const CARD_BG = '#1C1C1E';
const PURPLE = Colors.primary;

const START_DELAY = 300;
const LINE_DUR    = 1200;

const p0  = { x: 12,         y: GH * 0.66 };
const p2  = { x: GW - 16,    y: GH * 0.14 };
const cp1 = { x: GW * 0.55,  y: p0.y };
const cp2 = { x: GW * 0.65,  y: p2.y };

function bezierAt(t: number) {
  const mt = 1 - t;
  return {
    x: mt*mt*mt*p0.x + 3*mt*mt*t*cp1.x + 3*mt*t*t*cp2.x + t*t*t*p2.x,
    y: mt*mt*mt*p0.y + 3*mt*mt*t*cp1.y + 3*mt*t*t*cp2.y + t*t*t*p2.y,
  };
}

const p1 = bezierAt(0.22);
const pB = bezierAt(0.535);


// Invert Easing.in(Easing.cubic) (f(t)=t^3) to find when the clip rect
// right edge reaches a given SVG x coordinate.
function dotDelay(svgX: number) {
  const ratio = (svgX + 12) / (GW + 24);
  return START_DELAY + LINE_DUR * Math.pow(ratio, 1 / 3);
}

const AnimatedCircle = Animated.createAnimatedComponent(
  require('react-native-svg').Circle,
);
const AnimatedRect = Animated.createAnimatedComponent(
  require('react-native-svg').Rect,
);

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
  const c2Opacity   = useRef(new Animated.Value(0)).current;
  const cBOpacity   = useRef(new Animated.Value(0)).current;
  const trophyScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(START_DELAY),
      Animated.timing(progress, { toValue: 1, duration: LINE_DUR, easing: Easing.in(Easing.cubic), useNativeDriver: false }),
    ]).start();

    Animated.sequence([
      Animated.delay(dotDelay(p1.x)),
      Animated.timing(c2Opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
    Animated.sequence([
      Animated.delay(dotDelay(pB.x)),
      Animated.timing(cBOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
    Animated.sequence([
      Animated.delay(dotDelay(p2.x)),
      Animated.spring(trophyScale, { toValue: 1, friction: 5, tension: 140, useNativeDriver: true }),
    ]).start();
  }, []);

  const linePath = `M ${p0.x} ${p0.y} C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${p2.x} ${p2.y}`;
  const fillPath = `${linePath} L ${p2.x} ${GH} L ${p0.x} ${GH} Z`;

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
            <ClipPath id="reveal-line">
              <AnimatedRect
                x={-12}
                y={-4}
                width={progress.interpolate({ inputRange: [0, 1], outputRange: [p0.x + 12, GW + 24] })}
                height={GH + 8}
              />
            </ClipPath>
          </Defs>

          {[0.33, 0.66].map(pct => (
            <Path key={pct}
              d={`M 12 ${GH * pct} L ${GW - 16} ${GH * pct}`}
              stroke="rgba(255,255,255,0.08)" strokeWidth={1} strokeDasharray="4,4" />
          ))}

          <Path d={fillPath} fill="url(#fade)" stroke="none" clipPath="url(#reveal-line)" />

          <Path
            d={linePath}
            stroke={PURPLE}
            strokeWidth={3}
            fill="none"
            strokeLinecap="round"
            clipPath="url(#reveal-line)"
          />

          <Circle cx={p0.x} cy={p0.y} r={5.5} fill={CARD_BG} stroke={PURPLE} strokeWidth={2.5} />
          <AnimatedCircle cx={p1.x} cy={p1.y} r={5.5} fill={CARD_BG} stroke={PURPLE} strokeWidth={2.5} opacity={c2Opacity} />
          <AnimatedCircle cx={pB.x} cy={pB.y} r={5.5} fill={CARD_BG} stroke={PURPLE} strokeWidth={2.5} opacity={cBOpacity} />
        </Svg>

        <Animated.View style={[s.trophy, { left: p2.x - 4, top: p2.y - 12, transform: [{ scale: trophyScale }] }]}>
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
