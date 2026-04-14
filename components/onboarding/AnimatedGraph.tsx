import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions, Easing } from 'react-native';
import Svg, { Path, Line, Circle } from 'react-native-svg';
import { Colors, Fonts } from '@/lib/theme';

const { width: SW } = Dimensions.get('window');
// Scroll has paddingHorizontal: 24 (48 total). Card has paddingHorizontal: 20 (40 total).
const CARD_PAD = 20;
const GW = SW - 48 - CARD_PAD * 2; // available SVG width
const GH = 180;

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export default function AnimatedGraph({ skinType }: { skinType: string }) {
  const progress = useRef(new Animated.Value(0)).current;
  const fillOpacity = useRef(new Animated.Value(0)).current;
  const statOpacity = useRef(new Animated.Value(0)).current;
  const statScale = useRef(new Animated.Value(0.85)).current;
  const dotEndOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(300),
      Animated.parallel([
        Animated.timing(progress, { toValue: 1, duration: 2800, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
        Animated.timing(fillOpacity, { toValue: 0.18, duration: 3200, easing: Easing.out(Easing.quad), useNativeDriver: false }),
      ]),
      // Dot + stat appear together immediately after line finishes
      Animated.parallel([
        Animated.timing(dotEndOpacity, { toValue: 1, duration: 200, useNativeDriver: false }),
        Animated.timing(statOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.spring(statScale, { toValue: 1, friction: 7, tension: 80, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  const R = 6; // circle radius + breathing room
  const midY = GH * 0.5; // both lines start in the middle

  // SkinX (white): starts middle, curves smoothly upward
  const skinXPath = `M ${R} ${midY} C ${GW * 0.25} ${midY - 5}, ${GW * 0.45} ${GH * 0.28}, ${GW * 0.65} ${GH * 0.18} C ${GW * 0.8} ${GH * 0.1}, ${GW * 0.9} ${GH * 0.08}, ${GW - R} ${GH * 0.08}`;
  const fillPath  = `${skinXPath} L ${GW - R} ${GH} L ${R} ${GH} Z`;

  // Without SkinX (coral): single cubic bezier — flat then drops off smoothly
  const withoutPath = `M ${R} ${midY} C ${GW * 0.62} ${midY}, ${GW * 0.72} ${GH * 0.91}, ${GW - R} ${GH * 0.91}`;

  const pathLen = GW * 1.7;

  return (
    <View style={s.outer}>
      <Text style={s.title}>Your skin can improve{'\n'}by using SkinX</Text>

      <View style={s.cardWrap}>
      <View style={s.card}>
        <Text style={s.cardTitle}>Skin Clarity</Text>

        <View style={s.svgWrap}>
          <Svg width={GW + 12} height={GH} viewBox={`-6 0 ${GW + 12} ${GH}`}>
            {/* Dashed grid lines — span only where the curves/fill span */}
            {[0.33, 0.66].map(pct => (
              <Line key={pct} x1={R} y1={GH * pct} x2={GW - R} y2={GH * pct}
                stroke="rgba(255,255,255,0.1)" strokeWidth={0.8} strokeDasharray="4,4" />
            ))}

            {/* Fill under SkinX curve */}
            <AnimatedPath d={fillPath} fill="#fff" opacity={fillOpacity} stroke="none" />

            {/* Without SkinX line (coral) */}
            <AnimatedPath
              d={withoutPath}
              stroke="#E8766A"
              strokeWidth={2.5}
              fill="none"
              strokeLinecap="butt"
              strokeDasharray={pathLen}
              strokeDashoffset={progress.interpolate({ inputRange: [0, 1], outputRange: [pathLen, 0] })}
            />

            {/* SkinX line (white) */}
            <AnimatedPath
              d={skinXPath}
              stroke="#FFFFFF"
              strokeWidth={3}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={pathLen}
              strokeDashoffset={progress.interpolate({ inputRange: [0, 1], outputRange: [pathLen, 0] })}
            />

            {/* Start dot */}
            <Circle cx={R} cy={midY} r={5.5} fill={CARD_BG} stroke="#FFFFFF" strokeWidth={2.5} />

            {/* End dot */}
            <AnimatedCircle cx={GW - R} cy={GH * 0.08} r={5.5} fill={CARD_BG} stroke="#FFFFFF" strokeWidth={2.5} opacity={dotEndOpacity} />
          </Svg>
        </View>

        {/* Line labels row */}
        <View style={s.lineLabels}>
          <View style={s.brandRow}>
            <Text style={s.brandName}>SkinX</Text>
          </View>
          <Text style={s.withoutText}>Without SkinX</Text>
        </View>

        {/* X-axis */}
        <View style={s.xAxis}>
          <Text style={s.xLabel}>Week 1</Text>
          <Text style={s.xLabel}>Week 4</Text>
        </View>

        {/* Stat */}
        <Animated.View style={[s.statRow, { opacity: statOpacity, transform: [{ scale: statScale }] }]}>
          <Text style={s.statText}>92% of users see visible improvement{'\n'}by week 4</Text>
        </Animated.View>
      </View>
      </View>
    </View>
  );
}

const CARD_BG = '#1C1C1E';

const s = StyleSheet.create({
  outer: { flex: 1, paddingTop: 28, gap: 20 },
  cardWrap: { flex: 1, justifyContent: 'center' },
  title: { fontFamily: Fonts.bold, fontSize: 28, color: '#FFF', lineHeight: 36, letterSpacing: -0.5 },

  card: {
    backgroundColor: CARD_BG,
    borderRadius: 20,
    paddingHorizontal: CARD_PAD,
    paddingTop: 20,
    paddingBottom: 22,
  },
  cardTitle: { fontFamily: Fonts.semibold, fontSize: 17, color: '#FFFFFF' },

  svgWrap: { marginTop: 14, marginHorizontal: -6 },

  lineLabels: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 },
  brandRow:   { flexDirection: 'row', alignItems: 'center', gap: 6 },
  brandName:  { fontFamily: Fonts.semibold, fontSize: 13, color: '#FFFFFF' },
  withoutText: { fontFamily: Fonts.medium, fontSize: 13, color: '#E8766A' },

  xAxis:  { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  xLabel: { fontFamily: Fonts.regular, fontSize: 12, color: 'rgba(255,255,255,0.35)' },

  statRow: { alignItems: 'center', marginTop: 18, paddingTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)' },
  statText: { fontFamily: Fonts.medium, fontSize: 14, color: 'rgba(255,255,255,0.45)', textAlign: 'center', lineHeight: 20 },
});
