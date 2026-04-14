import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { Fonts } from '@/lib/theme';

const BAR_MAX_H = 180;
const CARD_BG = '#1C1C1E';

export default function BarComparison() {
  const withoutAnim = useRef(new Animated.Value(0)).current;
  const withAnim    = useRef(new Animated.Value(0)).current;
  const labelOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const DELAY = 300;
    const DURATION = 700;
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(withoutAnim, { toValue: 1, duration: DURATION, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
        Animated.timing(withAnim,    { toValue: 1, duration: DURATION + 120, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
      ]).start(() => {
        Animated.timing(labelOpacity, { toValue: 1, duration: 260, useNativeDriver: true }).start();
      });
    }, DELAY);
  }, []);

  const withoutH = withoutAnim.interpolate({ inputRange: [0, 1], outputRange: [0, BAR_MAX_H * 0.44] });
  const withH    = withAnim.interpolate({    inputRange: [0, 1], outputRange: [0, BAR_MAX_H * 0.88] });

  return (
    <View style={s.outer}>
      <Text style={s.title}>
        Improve your skin 2x as{'\n'}<Text style={s.titleBold}>fast</Text> with <Text style={s.skinText}>Skin</Text><Text style={s.xText}>X</Text> vs without
      </Text>

      <View style={s.cardWrap}>
        <View style={s.card}>
          {/* Column headers */}
          <View style={s.headerRow}>
            <Text style={s.headerLabel}>Without{'\n'}<Text style={s.skinText}>Skin</Text><Text style={s.xText}>X</Text></Text>
            <Text style={[s.headerLabel, s.headerLabelWith]}>With{'\n'}<Text style={s.skinText}>Skin</Text><Text style={s.xText}>X</Text></Text>
          </View>

          {/* Bars */}
          <View style={s.barsRow}>
            {/* Without bar */}
            <View style={s.barCol}>
              <View style={[s.barTrack, { height: BAR_MAX_H }]}>
                <Animated.View style={[s.bar, s.barWithout, { height: withoutH }]}>
                  <Animated.Text style={[s.barStat, { opacity: labelOpacity }]}>1x</Animated.Text>
                </Animated.View>
              </View>
            </View>

            {/* With bar */}
            <View style={s.barCol}>
              <View style={[s.barTrack, { height: BAR_MAX_H }]}>
                <Animated.View style={[s.bar, s.barWith, { height: withH }]}>
                  <Animated.Text style={[s.barStat, s.barStatWith, { opacity: labelOpacity }]}>2x</Animated.Text>
                </Animated.View>
              </View>
            </View>
          </View>

          <Text style={s.caption}>
            <Text style={s.skinText}>Skin</Text><Text style={s.xText}>X</Text> builds a plan that helps users{'\n'}see results in half the time.
          </Text>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  outer: { flex: 1, paddingTop: 28, gap: 20 },
  cardWrap: { flex: 1, justifyContent: 'center' },

  title: { fontFamily: Fonts.bold, fontSize: 28, color: '#FFF', lineHeight: 36, letterSpacing: -0.5 },
  titleBold: { fontFamily: Fonts.bold, color: '#FFF' },
  skinText: { color: '#FFFFFF' },
  xText: { color: '#7C5CFC' },

  card: {
    backgroundColor: CARD_BG,
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingTop: 22,
    paddingBottom: 24,
    gap: 16,
  },

  headerRow: { flexDirection: 'row', justifyContent: 'space-around' },
  headerLabel: { fontFamily: Fonts.medium, fontSize: 14, color: '#FFFFFF', textAlign: 'center', lineHeight: 20 },
  headerLabelWith: { color: '#FFFFFF' },

  barsRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end' },
  barCol: { flex: 1, alignItems: 'center' },

  barTrack: { width: '70%', justifyContent: 'flex-end' },
  bar: { width: '100%', borderRadius: 10, justifyContent: 'flex-start', paddingTop: 12, alignItems: 'center' },
  barWithout: { backgroundColor: 'rgba(255,255,255,0.12)' },
  barWith: { backgroundColor: '#7C5CFC' },

  barStat: { fontFamily: Fonts.bold, fontSize: 20, color: 'rgba(255,255,255,0.5)', letterSpacing: -0.5 },
  barStatWith: { color: '#FFFFFF' },

  caption: { fontFamily: Fonts.regular, fontSize: 14, color: 'rgba(255,255,255,0.35)', textAlign: 'center', lineHeight: 21 },
});
