import { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import Svg, { G, Path } from 'react-native-svg';

const AnimatedPath = Animated.createAnimatedComponent(Path);

// ─────────────────────────────────────────────────────────
// Hand path data (left hand; right hand = scaleX mirror)
// viewBox: "-8 0 76 114"  → effective width 68, height 114
// ─────────────────────────────────────────────────────────
const HP = {
  // Palm: rounded rect, top edge at y=68
  palm: {
    d: 'M 16,68 L 44,68 Q 56,68 56,80 L 56,94 Q 56,106 44,106 L 16,106 Q 4,106 4,94 L 4,80 Q 4,68 16,68 Z',
    len: 175,
  },
  // Index finger (capsule, open bottom, bottom at y=68)
  index: {
    d: 'M 5,68 L 5,24 Q 5,18 11,18 Q 17,18 17,24 L 17,68',
    len: 107,
  },
  // Middle (tallest)
  middle: {
    d: 'M 19,68 L 19,15 Q 19,8 26,8 Q 33,8 33,15 L 33,68',
    len: 128,
  },
  // Ring
  ring: {
    d: 'M 35,68 L 35,20 Q 35,14 41,14 Q 47,14 47,20 L 47,68',
    len: 115,
  },
  // Pinky (shortest)
  pinky: {
    d: 'M 48,68 L 48,35.5 Q 48,30 53.5,30 Q 59,30 59,35.5 L 59,68',
    len: 82,
  },
  // Thumb (drawn inside a rotated <G>)
  thumb: {
    d: 'M -4,78 L -4,58 Q -4,52 2,52 Q 8,52 8,58 L 8,78',
    len: 59,
  },
  // Subtle knuckle crease across the upper palm
  knuckle: {
    d: 'M 7,60 Q 30,56 57,60',
    len: 52,
  },
} as const;

function drawAnim(val: Animated.Value, delay: number, dur: number) {
  return Animated.timing(val, {
    toValue: 0,
    duration: dur,
    delay,
    easing: Easing.inOut(Easing.cubic),
    useNativeDriver: false, // required for SVG prop animation
  });
}

export default function HighFiveAnimation() {
  // ── Left-hand dash offsets (start = full length = invisible) ──
  const lPalm    = useRef(new Animated.Value(HP.palm.len)).current;
  const lIndex   = useRef(new Animated.Value(HP.index.len)).current;
  const lMiddle  = useRef(new Animated.Value(HP.middle.len)).current;
  const lRing    = useRef(new Animated.Value(HP.ring.len)).current;
  const lPinky   = useRef(new Animated.Value(HP.pinky.len)).current;
  const lThumb   = useRef(new Animated.Value(HP.thumb.len)).current;
  const lKnuckle = useRef(new Animated.Value(HP.knuckle.len)).current;

  // ── Right-hand dash offsets ──
  const rPalm    = useRef(new Animated.Value(HP.palm.len)).current;
  const rIndex   = useRef(new Animated.Value(HP.index.len)).current;
  const rMiddle  = useRef(new Animated.Value(HP.middle.len)).current;
  const rRing    = useRef(new Animated.Value(HP.ring.len)).current;
  const rPinky   = useRef(new Animated.Value(HP.pinky.len)).current;
  const rThumb   = useRef(new Animated.Value(HP.thumb.len)).current;
  const rKnuckle = useRef(new Animated.Value(HP.knuckle.len)).current;

  // ── Slide & flash ──
  const lSlide = useRef(new Animated.Value(0)).current;
  const rSlide = useRef(new Animated.Value(0)).current;
  const flash  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Phase 1 — draw both hands simultaneously, finger by finger
    Animated.parallel([
      drawAnim(lThumb,    0,   380),
      drawAnim(lPalm,     50,  560),
      drawAnim(lIndex,    80,  480),
      drawAnim(lMiddle,   170, 520),
      drawAnim(lRing,     250, 490),
      drawAnim(lPinky,    340, 420),
      drawAnim(lKnuckle,  820, 260),

      drawAnim(rThumb,    0,   380),
      drawAnim(rPalm,     50,  560),
      drawAnim(rIndex,    80,  480),
      drawAnim(rMiddle,   170, 520),
      drawAnim(rRing,     250, 490),
      drawAnim(rPinky,    340, 420),
      drawAnim(rKnuckle,  820, 260),
    ]).start(() => {
      // Phase 2 — spring toward each other
      Animated.parallel([
        Animated.spring(lSlide, { toValue: 22, friction: 8, tension: 120, useNativeDriver: true }),
        Animated.spring(rSlide, { toValue: -22, friction: 8, tension: 120, useNativeDriver: true }),
      ]).start(() => {
        // Phase 3 — flash on contact
        Animated.sequence([
          Animated.timing(flash, { toValue: 0.55, duration: 70,  useNativeDriver: true }),
          Animated.timing(flash, { toValue: 0,    duration: 300, useNativeDriver: true }),
        ]).start();
      });
    });
  }, []);

  // Helper: renders an AnimatedPath with the dashoffset animated value
  const hp = (
    val: Animated.Value,
    path: { d: string; len: number },
    thin = false,
  ) => (
    <AnimatedPath
      d={path.d}
      stroke="#FFFFFF"
      strokeWidth={thin ? 1.6 : 2.3}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
      strokeDasharray={path.len}
      strokeDashoffset={val}
    />
  );

  const leftHand = (
    <Animated.View style={{ transform: [{ translateX: lSlide }] }}>
      <Svg viewBox="-8 0 76 114" width={62} height={104} style={{ overflow: 'visible' } as any}>
        <G transform="rotate(-25, 0, 78)">
          {hp(lThumb, HP.thumb)}
        </G>
        {hp(lPalm,    HP.palm)}
        {hp(lIndex,   HP.index)}
        {hp(lMiddle,  HP.middle)}
        {hp(lRing,    HP.ring)}
        {hp(lPinky,   HP.pinky)}
        {hp(lKnuckle, HP.knuckle, true)}
      </Svg>
    </Animated.View>
  );

  const rightHand = (
    <Animated.View style={{ transform: [{ translateX: rSlide }] }}>
      {/* scaleX(-1) mirrors the SVG to produce the right hand */}
      <Svg
        viewBox="-8 0 76 114"
        width={62}
        height={104}
        style={{ overflow: 'visible', transform: [{ scaleX: -1 }] } as any}
      >
        <G transform="rotate(-25, 0, 78)">
          {hp(rThumb, HP.thumb)}
        </G>
        {hp(rPalm,    HP.palm)}
        {hp(rIndex,   HP.index)}
        {hp(rMiddle,  HP.middle)}
        {hp(rRing,    HP.ring)}
        {hp(rPinky,   HP.pinky)}
        {hp(rKnuckle, HP.knuckle, true)}
      </Svg>
    </Animated.View>
  );

  return (
    <View style={st.outer}>
      <View style={st.circleOuter}>
        <View style={st.circleInner}>
          {/* White flash on high-five impact */}
          <Animated.View style={[StyleSheet.absoluteFill, st.flashRing, { opacity: flash }]} />

          {leftHand}
          {rightHand}
        </View>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  outer: {
    alignItems: 'center',
    marginBottom: 8,
  },
  circleOuter: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  circleInner: {
    width: 134,
    height: 134,
    borderRadius: 67,
    backgroundColor: 'rgba(255,255,255,0.09)',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  flashRing: {
    borderRadius: 67,
    backgroundColor: '#FFFFFF',
  },
});
