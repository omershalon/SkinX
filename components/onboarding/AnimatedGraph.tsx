import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions, Easing } from 'react-native';
import Svg, { Path, Line, Circle } from 'react-native-svg';
import type { PathProps } from 'react-native-svg';
import { Fonts } from '@/lib/theme';

const { width: SW } = Dimensions.get('window');
// Scroll has paddingHorizontal: 24 (48 total). Card has paddingHorizontal: 20 (40 total).
const CARD_PAD = 20;
const GW = SW - 48 - CARD_PAD * 2; // available SVG width
const GH = 180;

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export default function AnimatedGraph() {
  const progress = useRef(new Animated.Value(0)).current;
  const stat1Opacity = useRef(new Animated.Value(0)).current;
  const stat1Y = useRef(new Animated.Value(8)).current;
  const stat2Opacity = useRef(new Animated.Value(0)).current;
  const stat2Y = useRef(new Animated.Value(8)).current;
  const fillPathRef = useRef<React.ComponentRef<typeof Path> & { setNativeProps: (p: Partial<PathProps>) => void } | null>(null);

  useEffect(() => {
    const LINE_DELAY = 300;
    const LINE_DURATION = 824;

    // Start line after initial delay — fill reveal rides on same progress value.
    setTimeout(() => {
      Animated.timing(progress, { toValue: 1, duration: LINE_DURATION, easing: Easing.linear, useNativeDriver: false }).start();
    }, LINE_DELAY);

    // Stat pops in right when line finishes — top line first, bottom line second
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(stat1Opacity, { toValue: 1, duration: 260, useNativeDriver: true }),
        Animated.spring(stat1Y, { toValue: 0, friction: 7, tension: 80, useNativeDriver: true }),
      ]).start();
    }, LINE_DELAY + LINE_DURATION + 180);

    setTimeout(() => {
      Animated.parallel([
        Animated.timing(stat2Opacity, { toValue: 1, duration: 260, useNativeDriver: true }),
        Animated.spring(stat2Y, { toValue: 0, friction: 7, tension: 80, useNativeDriver: true }),
      ]).start();
    }, LINE_DELAY + LINE_DURATION + 180 + 140);
  }, []);

  const R = 6; // circle radius + breathing room
  const midY = GH * 0.5; // both lines start in the middle

  // SkinX (white): starts middle, curves smoothly upward
  const skinXPath = `M ${R} ${midY} C ${GW * 0.25} ${midY - 5}, ${GW * 0.45} ${GH * 0.28}, ${GW * 0.65} ${GH * 0.18} C ${GW * 0.8} ${GH * 0.1}, ${GW * 0.9} ${GH * 0.04}, ${GW - R} ${GH * 0.04}`;

  // Without SkinX (white): single cubic bezier — flat then drops off smoothly
  const withoutPath = `M ${R} ${midY} C ${GW * 0.62} ${midY}, ${GW * 0.72} ${GH * 0.91}, ${GW - R} ${GH * 0.91}`;
  const wP0: [number, number] = [R, midY];
  const wP1: [number, number] = [GW * 0.62, midY];
  const wP2: [number, number] = [GW * 0.72, GH * 0.91];
  const wP3: [number, number] = [GW - R, GH * 0.91];

  // Dense-sample the white bezier so we can (a) get total arc length and (b) later map any X
  // back to an arc length on this curve — we need (b) so the white line's reveal can track the
  // purple dot's X instead of its own arc length.
  const whiteDensePts: [number, number][] = [];
  const whiteCum: number[] = [0];
  for (let i = 0; i <= 400; i++) {
    const t = i / 400; const u = 1 - t;
    const x = u*u*u*wP0[0] + 3*u*u*t*wP1[0] + 3*u*t*t*wP2[0] + t*t*t*wP3[0];
    const y = u*u*u*wP0[1] + 3*u*u*t*wP1[1] + 3*u*t*t*wP2[1] + t*t*t*wP3[1];
    whiteDensePts.push([x, y]);
    if (i > 0) {
      const dx = x - whiteDensePts[i - 1][0];
      const dy = y - whiteDensePts[i - 1][1];
      whiteCum.push(whiteCum[i - 1] + Math.sqrt(dx * dx + dy * dy));
    }
  }
  const withoutPathLen = whiteCum[whiteCum.length - 1];

  // Arc-length-parameterize the chained cubic beziers so the end dot rides the stroke tip exactly.
  const bezier = (t: number, p0: [number, number], p1: [number, number], p2: [number, number], p3: [number, number]) => {
    const u = 1 - t;
    const x = u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0];
    const y = u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1];
    return [x, y] as [number, number];
  };
  const seg1 = { p0: [R, midY] as [number, number], p1: [GW * 0.25, midY - 5] as [number, number], p2: [GW * 0.45, GH * 0.28] as [number, number], p3: [GW * 0.65, GH * 0.18] as [number, number] };
  const seg2 = { p0: seg1.p3, p1: [GW * 0.8, GH * 0.1] as [number, number], p2: [GW * 0.9, GH * 0.04] as [number, number], p3: [GW - R, GH * 0.04] as [number, number] };

  const DENSE = 400;
  const densePts: [number, number][] = [];
  const cum: number[] = [0];
  for (let i = 0; i <= DENSE; i++) {
    const f = i / DENSE;
    const pt = f < 0.5
      ? bezier(f / 0.5, seg1.p0, seg1.p1, seg1.p2, seg1.p3)
      : bezier((f - 0.5) / 0.5, seg2.p0, seg2.p1, seg2.p2, seg2.p3);
    densePts.push(pt);
    if (i > 0) {
      const dx = pt[0] - densePts[i - 1][0];
      const dy = pt[1] - densePts[i - 1][1];
      cum.push(cum[i - 1] + Math.sqrt(dx * dx + dy * dy));
    }
  }
  const pathLen = cum[cum.length - 1];

  const SAMPLES = 60;
  const sampleInputs: number[] = [];
  const sampleXs: number[] = [];
  const sampleYs: number[] = [];
  let j = 0;
  for (let i = 0; i <= SAMPLES; i++) {
    const target = (i / SAMPLES) * pathLen;
    while (j < cum.length - 1 && cum[j + 1] < target) j++;
    const segLen = cum[j + 1] - cum[j] || 1;
    const a = (target - cum[j]) / segLen;
    const x = densePts[j][0] + (densePts[j + 1][0] - densePts[j][0]) * a;
    const y = densePts[j][1] + (densePts[j + 1][1] - densePts[j][1]) * a;
    sampleInputs.push(i / SAMPLES);
    sampleXs.push(x);
    sampleYs.push(y);
  }
  const endCx = progress.interpolate({ inputRange: sampleInputs, outputRange: sampleXs });
  const endCy = progress.interpolate({ inputRange: sampleInputs, outputRange: sampleYs });

  // For each purple-sample X, find the matching arc length on the white curve, then convert
  // to a strokeDashoffset. This makes the white line's visible tip share the purple dot's X —
  // so both tips (and the shading's right edge) advance across the graph together.
  const whiteOffsetSamples: number[] = [];
  let wk = 0;
  for (let i = 0; i <= SAMPLES; i++) {
    const targetX = sampleXs[i];
    while (wk < whiteDensePts.length - 1 && whiteDensePts[wk + 1][0] < targetX) wk++;
    const x0 = whiteDensePts[wk][0];
    const x1 = whiteDensePts[wk + 1] ? whiteDensePts[wk + 1][0] : x0;
    const denom = x1 - x0 || 1;
    const a = Math.min(1, Math.max(0, (targetX - x0) / denom));
    const whiteArcLen = whiteCum[wk] + ((whiteCum[wk + 1] ?? whiteCum[wk]) - whiteCum[wk]) * a;
    whiteOffsetSamples.push(withoutPathLen - whiteArcLen);
  }
  const whiteDashOffset = progress.interpolate({ inputRange: sampleInputs, outputRange: whiteOffsetSamples });

  // Rebuild the fill polygon each frame and push it directly to the Path's native view via
  // setNativeProps — this bypasses the React render pipeline so the fill updates on the same
  // frame as the natively-animated strokes. Using setState here caused a 1–2 frame lag that
  // made the shading drift behind the line tips.
  useEffect(() => {
    const compute = (t: number) => {
      let d = '';
      if (t > 0) {
        const targetLen = t * pathLen;
        let idx = 0;
        while (idx < cum.length - 1 && cum[idx + 1] < targetLen) idx++;
        const segLen = cum[idx + 1] - cum[idx] || 1;
        const a = Math.min(1, Math.max(0, (targetLen - cum[idx]) / segLen));
        const ex = densePts[idx][0] + (densePts[idx + 1][0] - densePts[idx][0]) * a;
        const ey = densePts[idx][1] + (densePts[idx + 1][1] - densePts[idx][1]) * a;
        d = `M ${R} ${midY}`;
        for (let i = 1; i <= idx; i++) d += ` L ${densePts[i][0]} ${densePts[i][1]}`;
        d += ` L ${ex} ${ey} L ${ex} ${GH} L ${R} ${GH} Z`;
      }
      fillPathRef.current?.setNativeProps({ d });
    };
    compute(0);
    const id = progress.addListener(({ value }) => compute(value));
    return () => progress.removeListener(id);
  }, []);

  return (
    <View style={s.outer}>
      <Text style={s.title}><Text style={s.titleSkin}>Skin</Text><Text style={s.titleX}>X</Text> creates visible results</Text>

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

            {/* Fill polygon — d is updated each frame via setNativeProps so it stays on the
                same animation pipeline as the strokes (no React state lag). */}
            <Path ref={fillPathRef as any} d="" fill="#fff" opacity={0.18} stroke="none" />

            {/* Without SkinX line (white) — offset tracks purple X so its tip stays aligned. */}
            <AnimatedPath
              d={withoutPath}
              stroke="#FFFFFF"
              strokeWidth={2.5}
              fill="none"
              strokeLinecap="butt"
              strokeDasharray={withoutPathLen}
              strokeDashoffset={whiteDashOffset}
            />

            {/* SkinX line (purple) */}
            <AnimatedPath
              d={skinXPath}
              stroke="#7C5CFC"
              strokeWidth={3}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={pathLen}
              strokeDashoffset={progress.interpolate({ inputRange: [0, 1], outputRange: [pathLen, 0] })}
            />

            {/* Start dot */}
            <Circle cx={R} cy={midY} r={5.5} fill={CARD_BG} stroke="#7C5CFC" strokeWidth={2.5} />

            {/* End dot */}
            <AnimatedCircle cx={endCx} cy={endCy} r={5.5} fill={CARD_BG} stroke="#7C5CFC" strokeWidth={2.5} />
          </Svg>
        </View>

        {/* Line labels row */}
        <View style={s.lineLabels}>
          <View style={s.brandRow}>
            <Text style={s.brandName}><Text style={s.labelSkin}>Skin</Text><Text style={s.labelX}>X</Text></Text>
          </View>
          <Text style={s.withoutText}>Without <Text style={s.labelWithoutSkin}>Skin</Text><Text style={s.labelWithoutX}>X</Text></Text>
        </View>

        {/* X-axis */}
        <View style={s.xAxis}>
          <Text style={s.xLabel}>Week 1</Text>
          <Text style={s.xLabel}>Week 4</Text>
        </View>

        {/* Stat */}
        <View style={s.statRow}>
          <Animated.Text style={[s.statText, { opacity: stat1Opacity, transform: [{ translateY: stat1Y }] }]}>
            92% of users see visible improvement
          </Animated.Text>
          <Animated.Text style={[s.statText, { opacity: stat2Opacity, transform: [{ translateY: stat2Y }] }]}>
            by week 4
          </Animated.Text>
        </View>
      </View>
      </View>
    </View>
  );
}

const CARD_BG = '#1C1C1E';

const s = StyleSheet.create({
  outer: { flex: 1, paddingTop: 28, gap: 20 },
  cardWrap: { flex: 1, justifyContent: 'center' },
  title: { fontFamily: Fonts.bold, fontSize: 30, color: '#FFF', lineHeight: 38, letterSpacing: -0.6 },
  titleSkin: { color: '#FFFFFF' },
  titleX: { color: '#7C5CFC' },

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
  labelSkin: { color: '#FFFFFF' },
  labelX: { color: '#7C5CFC' },
  withoutText: { fontFamily: Fonts.medium, fontSize: 13, color: '#FFFFFF' },
  labelWithoutSkin: { color: '#FFFFFF' },
  labelWithoutX: { color: '#7C5CFC' },

  xAxis:  { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  xLabel: { fontFamily: Fonts.regular, fontSize: 12, color: 'rgba(255,255,255,0.35)' },

  statRow: { alignItems: 'center', marginTop: 18, paddingTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)' },
  statText: { fontFamily: Fonts.medium, fontSize: 14, color: '#FFFFFF', textAlign: 'center', lineHeight: 20 },
});
