import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions, Easing } from 'react-native';
import Svg, { Path, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { Fonts, Colors } from '@/lib/theme';

const { width: SW } = Dimensions.get('window');
const CARD_PAD = 20;
const GW = SW - 48 - CARD_PAD * 2;
const GH = 180;
const CARD_BG = '#1C1C1E';
const PURPLE = Colors.primary;

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export default function SkinTransitionGraph() {
  const progress    = useRef(new Animated.Value(0)).current;
  const c1Opacity   = useRef(new Animated.Value(0)).current;
  const c2Opacity   = useRef(new Animated.Value(0)).current;
  const trophyScale = useRef(new Animated.Value(0)).current;
  const fillOpacity = useRef(new Animated.Value(0)).current;

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
      Animated.delay(START_DELAY + LINE_DUR - 100),
      Animated.spring(trophyScale, { toValue: 1, friction: 5, tension: 140, useNativeDriver: true }),
    ]).start();
    Animated.sequence([
      Animated.delay(START_DELAY + 80),
      Animated.timing(fillOpacity, { toValue: 1, duration: LINE_DUR - 80, useNativeDriver: true }),
    ]).start();
  }, []);

  const p0 = { x: 12,         y: GH * 0.78 };
  const p1 = { x: GW * 0.40,  y: GH * 0.58 };
  const p2 = { x: GW - 16,    y: GH * 0.14 };

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
          </Defs>

          {[0.33, 0.66].map(pct => (
            <Path key={pct}
              d={`M 12 ${GH * pct} L ${GW - 16} ${GH * pct}`}
              stroke="rgba(255,255,255,0.08)" strokeWidth={1} strokeDasharray="4,4" />
          ))}

          <AnimatedPath d={fillPath} fill="url(#fade)" stroke="none" opacity={fillOpacity} />

          <AnimatedPath
            d={linePath}
            stroke={PURPLE}
            strokeWidth={3}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={pathLen}
            strokeDashoffset={progress.interpolate({ inputRange: [0, 1], outputRange: [pathLen, 0] })}
          />

          <AnimatedCircle cx={p0.x} cy={p0.y} r={5.5} fill={CARD_BG} stroke="#FFFFFF" strokeWidth={2.5} opacity={c1Opacity} />
          <AnimatedCircle cx={p1.x} cy={p1.y} r={5.5} fill={CARD_BG} stroke="#FFFFFF" strokeWidth={2.5} opacity={c2Opacity} />
        </Svg>

        <Animated.View style={[s.trophy, { left: p2.x - 6, top: p2.y - 14, transform: [{ scale: trophyScale }] }]}>
          <Text style={s.trophyEmoji}>🏆</Text>
        </Animated.View>
      </View>

      <View style={s.xAxis}>
        <Text style={s.xLabel}>Day 3</Text>
        <Text style={[s.xLabel, { textAlign: 'center' }]}>Day 7</Text>
        <Text style={[s.xLabel, { textAlign: 'right' }]}>Day 30</Text>
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
  trophyEmoji: { fontSize: 16 },
  xAxis: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  xLabel: { flex: 1, fontFamily: Fonts.regular, fontSize: 12, color: 'rgba(255,255,255,0.45)' },
  caption: { fontFamily: Fonts.regular, fontSize: 13, color: '#FFFFFF', marginTop: 18, lineHeight: 19 },
  captionSkin: { color: '#FFFFFF' },
  captionX: { color: PURPLE },
});
