import { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Animated, Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Colors, Fonts } from '@/lib/theme';
import DatePicker, { BirthDate } from '@/components/onboarding/DatePicker';
import AnimatedGraph from '@/components/onboarding/AnimatedGraph';
import {
  MaleIcon, FemaleIcon, OtherGenderIcon,
  OilyIcon, DryIcon, ComboIcon, SensitiveIcon, NormalIcon, QuestionIcon,
  ClockIcon, TargetIcon, TrendDownIcon, ShieldIcon, SparkleIcon,
  LeafIcon, BlockIcon, FlameIcon,
  PillIcon, BottleIcon, SaladIcon, DoctorIcon, FacialIcon, EmptyIcon,
  BreakoutIcon, ScarIcon, SunIcon,
} from '@/components/onboarding/Icons';

const { width: SW } = Dimensions.get('window');

type Ans = {
  gender: string; birthDate: BirthDate; skinType: string; duration: string;
  tried: string[]; concerns: string[]; goal: string; holistic: string;
  barriers: string[]; commitment: string; hearAbout: string; triedApps: string;
};
const DEFAULT_BIRTH: BirthDate = { month: 1, day: 1, year: 2000 };
const EMPTY: Ans = { gender: '', birthDate: DEFAULT_BIRTH, skinType: '', duration: '', tried: [], concerns: [], goal: '', holistic: '', barriers: [], commitment: '', hearAbout: '', triedApps: '' };

// 12 questions + 3 affirmations + 1 graph = 16 screens
const TOTAL = 16;

const HEAR_SOURCES = [
  { id: 'x',              label: 'X',               emoji: '🐦' },
  { id: 'app_store',      label: 'App Store',        emoji: '📱' },
  { id: 'youtube',        label: 'YouTube',          emoji: '▶️' },
  { id: 'friend_family',  label: 'Friend or family', emoji: '👥' },
  { id: 'tv',             label: 'TV',               emoji: '📺' },
  { id: 'instagram',      label: 'Instagram',        emoji: '📸' },
  { id: 'tiktok',         label: 'TikTok',           emoji: '🎵' },
  { id: 'google',         label: 'Google',           emoji: '🔍' },
  { id: 'facebook',       label: 'Facebook',         emoji: '👍' },
  { id: 'other',          label: 'Other',            emoji: '•••' },
];

// ═══════════════════════════════════════════════════
//  REUSABLE
// ═══════════════════════════════════════════════════

function Option({ label, selected, onPress, icon }: { label: string; selected: boolean; onPress: () => void; icon?: React.ReactNode }) {
  const scale = useRef(new Animated.Value(1)).current;
  const fade  = useRef(new Animated.Value(selected ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(fade, { toValue: selected ? 1 : 0, duration: 220, useNativeDriver: false }).start();
  }, [selected]);

  const bgColor  = fade.interpolate({ inputRange: [0, 1], outputRange: ['#1C1C1E', '#FFFFFF'] });
  const txtColor = fade.interpolate({ inputRange: [0, 1], outputRange: ['#FFFFFF', '#000000'] });

  const handlePress = () => {
    Haptics.selectionAsync();
    Animated.sequence([
      Animated.spring(scale, { toValue: 0.96, friction: 5, tension: 300, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1,    friction: 4, tension: 100, useNativeDriver: true }),
    ]).start();
    onPress();
  };

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity onPress={handlePress} activeOpacity={1}>
        <Animated.View style={[st.option, { backgroundColor: bgColor }]}>
          {icon && <View style={st.optionIcon}>{icon}</View>}
          <Animated.Text style={[st.optionText, { color: txtColor }]}>{label}</Animated.Text>
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
}

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={[st.chip, selected && st.chipSel]}
      onPress={() => { Haptics.selectionAsync(); onPress(); }} activeOpacity={0.8}>
      <Text style={[st.chipText, selected && st.chipTextSel]}>{label}</Text>
    </TouchableOpacity>
  );
}

function RowOption({ label, emoji, selected, onPress }: { label: string; emoji: string; selected: boolean; onPress: () => void }) {
  const scale = useRef(new Animated.Value(1)).current;
  const fade  = useRef(new Animated.Value(selected ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(fade, { toValue: selected ? 1 : 0, duration: 220, useNativeDriver: false }).start();
  }, [selected]);

  const bgColor  = fade.interpolate({ inputRange: [0, 1], outputRange: ['#1C1C1E', '#FFFFFF'] });
  const txtColor = fade.interpolate({ inputRange: [0, 1], outputRange: ['#FFFFFF', '#000000'] });

  const handlePress = () => {
    Haptics.selectionAsync();
    Animated.sequence([
      Animated.spring(scale, { toValue: 0.97, friction: 5, tension: 300, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1,    friction: 4, tension: 100, useNativeDriver: true }),
    ]).start();
    onPress();
  };

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity onPress={handlePress} activeOpacity={1}>
        <Animated.View style={[st.rowOption, { backgroundColor: bgColor }]}>
          <View style={st.rowOptionIcon}>
            <Text style={st.rowOptionEmoji}>{emoji}</Text>
          </View>
          <Animated.Text style={[st.rowOptionText, { color: txtColor }]}>{label}</Animated.Text>
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ═══════════════════════════════════════════════════
//  MAIN
// ═══════════════════════════════════════════════════

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);
  const [a, setA] = useState<Ans>(EMPTY);
  const prog = useRef(new Animated.Value(0)).current;
  const enterAnim = useRef(new Animated.Value(0)).current;

  const animateIn = () => {
    enterAnim.setValue(0);
    Animated.timing(enterAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  };

  const goTo = (s: number) => {
    Animated.timing(enterAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
      setStep(s);
      Animated.spring(prog, { toValue: s / (TOTAL - 1), friction: 10, tension: 40, useNativeDriver: false }).start();
      animateIn();
    });
  };

  const next = () => goTo(step + 1);
  const back = () => {
    if (step > 0) goTo(step - 1);
    else router.back();
  };
  useEffect(() => { animateIn(); }, []);

  const finish = () => {
    const age = new Date().getFullYear() - a.birthDate.year;
    router.push({ pathname: '/(auth)/photo-capture', params: { onboardingData: JSON.stringify({ ...a, age: String(age) }) } });
  };

  const toggleMulti = (key: 'tried' | 'concerns' | 'barriers', val: string) => {
    setA(p => ({ ...p, [key]: p[key].includes(val) ? p[key].filter((v: string) => v !== val) : [...p[key], val] }));
  };

  const canNext = (): boolean => {
    switch (step) {
      case 0:  return !!a.gender;
      case 1:  return true; // birthDate always has a value
      case 2:  return !!a.hearAbout;
      case 3:  return !!a.triedApps;
      case 4:  return !!a.skinType;
      case 5:  return true; // graph (always can proceed)
      case 6:  return !!a.duration;
      case 7:  return true; // affirmation
      case 8:  return a.tried.length > 0;
      case 9:  return a.concerns.length > 0;
      case 10: return true; // affirmation
      case 11: return !!a.goal;
      case 12: return true; // affirmation
      case 13: return !!a.holistic;
      case 14: return a.barriers.length > 0;
      case 15: return !!a.commitment;
      default: return false;
    }
  };

  const isLastStep = step === 15;

  const Q = ({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) => (
    <View style={st.qWrap}>
      <View style={st.qTop}>
        <Text style={st.title}>{title}</Text>
        {subtitle ? <Text style={st.subtitle}>{subtitle}</Text> : null}
      </View>
      <View style={st.qMid}>{children}</View>
    </View>
  );

  const renderStep = () => {
    switch (step) {
      // ── 0: Gender ──
      case 0: return (
        <Q title="Choose your gender" subtitle="This helps us personalize your skin analysis">
          <View style={st.optionList}>
            {['Male', 'Female', 'Other'].map(o => (
              <Option key={o} label={o} selected={a.gender === o} onPress={() => setA(p => ({ ...p, gender: o }))} />
            ))}
          </View>
        </Q>
      );

      // ── 1: Birth date ──
      case 1: return (
        <Q title="When were you born?" subtitle="This will be used to calibrate your custom plan">
          <DatePicker value={a.birthDate} onChange={v => setA(p => ({ ...p, birthDate: v }))} />
        </Q>
      );

      // ── 2: Where did you hear about us ──
      case 2: return (
        <Q title="Where did you hear about us?">
          <View style={st.optionList}>
            {HEAR_SOURCES.map(src => (
              <RowOption key={src.id} label={src.label} emoji={src.emoji} selected={a.hearAbout === src.id} onPress={() => setA(p => ({ ...p, hearAbout: src.id }))} />
            ))}
          </View>
        </Q>
      );

      // ── 3: Tried other skincare apps ──
      case 3: return (
        <Q title="Have you tried other skincare apps?">
          <View style={st.optionList}>
            <RowOption label="Yes" emoji="👍" selected={a.triedApps === 'yes'} onPress={() => setA(p => ({ ...p, triedApps: 'yes' }))} />
            <RowOption label="No"  emoji="👎" selected={a.triedApps === 'no'}  onPress={() => setA(p => ({ ...p, triedApps: 'no' }))} />
          </View>
        </Q>
      );

      // ── 4: Skin type ──
      case 4: return (
        <Q title="What's your skin type?">
          <View style={st.optionList}>
            {['Oily', 'Dry', 'Normal'].map(o => (
              <Option key={o} label={o} selected={a.skinType === o} onPress={() => setA(p => ({ ...p, skinType: o }))} />
            ))}
          </View>
        </Q>
      );

      // ── 5: Animated graph proof screen ──
      case 5: return <AnimatedGraph skinType={a.skinType} />;

      // ── 6: Duration ──
      case 6: return (
        <Q title="How long have you dealt with skin issues?">
          <View style={st.optionList}>
            {['Just started', 'Less than a year', '1 - 3 years', '3 - 5 years', '5+ years'].map(o => (
              <Option key={o} label={o} selected={a.duration === o} onPress={() => setA(p => ({ ...p, duration: o }))} />
            ))}
          </View>
        </Q>
      );

      // ── 7: Affirmation 1 ──
      case 7: return (
        <View style={st.affirmCenter}>
          <Text style={st.affirmBig}>You're not alone.</Text>
          <Text style={st.affirmBody}>
            85% of people your age deal with the same skin struggles. You're already taking the first step.
          </Text>
        </View>
      );

      // ── 8: What tried ──
      case 8: return (
        <Q title="What have you tried so far?" subtitle="Select everything that applies">
          <View style={st.chipGrid}>
            {['Prescription medications', 'Products from the store', 'Home remedies', 'Changed my diet', 'Saw a dermatologist', 'Facials or peels', 'Nothing yet'].map(o => (
              <Chip key={o} label={o} selected={a.tried.includes(o)} onPress={() => toggleMulti('tried', o)} />
            ))}
          </View>
        </Q>
      );

      // ── 9: Concerns ──
      case 9: return (
        <Q title="What bothers you the most?" subtitle="Pick up to 3">
          <View style={st.chipGrid}>
            {['Breakouts', 'Acne scars', 'Dark spots', 'Large pores', 'Oily skin', 'Dry patches', 'Redness', 'Blackheads', 'Cystic acne', 'Uneven skin tone'].map(o => (
              <Chip key={o} label={o} selected={a.concerns.includes(o)}
                onPress={() => { if (a.concerns.includes(o) || a.concerns.length < 3) toggleMulti('concerns', o); }} />
            ))}
          </View>
          {a.concerns.length > 0 && <Text style={st.countLabel}>{a.concerns.length}/3 selected</Text>}
        </Q>
      );

      // ── 10: Affirmation 2 ──
      case 10: return (
        <View style={st.affirmCenter}>
          <Text style={st.affirmHuge}>67%</Text>
          <Text style={st.affirmBody}>
            People with {a.skinType?.toLowerCase() || 'your'} skin dealing with {a.concerns[0]?.toLowerCase() || 'breakouts'} see an average 67% improvement within 6 weeks.
          </Text>
        </View>
      );

      // ── 11: Goal ──
      case 11: return (
        <Q title="What's your goal?" subtitle="We'll build your plan around this">
          <View style={st.optionList}>
            {['Completely clear skin', 'Fewer breakouts', 'Manage what I have', 'Prevent future issues', 'Fade scars and marks'].map(o => (
              <Option key={o} label={o} selected={a.goal === o} onPress={() => setA(p => ({ ...p, goal: o }))} />
            ))}
          </View>
        </Q>
      );

      // ── 12: Affirmation 3 ──
      case 12: return (
        <View style={st.affirmCenter}>
          <Text style={st.affirmBig}>Totally achievable.</Text>
          <Text style={st.affirmBody}>
            Most people with your profile start seeing real changes in 3 to 6 weeks. Consistency is everything.
          </Text>
        </View>
      );

      // ── 13: Holistic ──
      case 13: return (
        <Q title="Are you open to natural approaches?" subtitle="Things like herbal remedies, diet changes, and clean skincare">
          <View style={st.optionList}>
            {['Yes, I prefer natural', 'Open to trying', 'Not really', 'Tell me more'].map(o => (
              <Option key={o} label={o} selected={a.holistic === o} onPress={() => setA(p => ({ ...p, holistic: o }))} />
            ))}
          </View>
        </Q>
      );

      // ── 14: Barriers ──
      case 14: return (
        <Q title="What's been your biggest challenge?">
          <View style={st.chipGrid}>
            {["Don't know what to use", 'Too much conflicting info', "Can't afford a dermatologist", 'Nothing seems to work', 'No consistent routine', "Don't know what's causing it"].map(o => (
              <Chip key={o} label={o} selected={a.barriers.includes(o)} onPress={() => toggleMulti('barriers', o)} />
            ))}
          </View>
        </Q>
      );

      // ── 15: Commitment ──
      case 15: return (
        <Q title="How committed are you?">
          <View style={st.optionList}>
            {['Just browsing', 'Willing to try', 'Ready to commit', 'All in'].map(o => (
              <Option key={o} label={o} selected={a.commitment === o} onPress={() => setA(p => ({ ...p, commitment: o }))} />
            ))}
          </View>
        </Q>
      );

      default: return null;
    }
  };

  return (
    <View style={[st.root, { paddingTop: insets.top }]}>
      <LinearGradient colors={['#08080F', '#100830', '#1A0845']} style={StyleSheet.absoluteFill} />

      {/* Header */}
      <View style={st.header}>
        <TouchableOpacity onPress={back} style={st.backCircle} activeOpacity={0.7}>
          <Text style={st.backArrow}>{'←'}</Text>
        </TouchableOpacity>
        <View style={st.progWrap}>
          <View style={st.progBar}>
            <Animated.View style={[st.progFill, { width: prog.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />
          </View>
        </View>
      </View>

      {/* Content */}
      <Animated.View style={[st.body, {
        opacity: enterAnim,
        transform: [{ translateY: enterAnim.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }],
      }]}>
        <ScrollView contentContainerStyle={st.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" bounces={false}>
          {renderStep()}
        </ScrollView>
      </Animated.View>

      {/* Next button */}
      <View style={[st.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity
          style={st.nextBtn}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); isLastStep ? finish() : next(); }}
          activeOpacity={0.85}>
          <Text style={st.nextBtnText}>{isLastStep ? "Let's go" : 'Next'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════
const st = StyleSheet.create({
  root: { flex: 1 },

  // Header — minimal, just back arrow + thin progress
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, gap: 14 },
  backCircle: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center', alignItems: 'center',
  },
  backArrow: { fontSize: 18, color: 'rgba(255,255,255,0.8)', lineHeight: 22 },
  progWrap: { flex: 1 },
  progBar: { height: 3, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' },
  progFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 2 },

  body: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 24 },

  // Q layout — title at top, options centered
  qWrap: { flex: 1, paddingTop: 28 },
  qTop: { gap: 10, marginBottom: 0 },
  qMid: { flex: 1, justifyContent: 'center', paddingVertical: 24 },

  content: { gap: 24 },
  title: { fontFamily: Fonts.bold, fontSize: 30, color: '#FFF', lineHeight: 38, letterSpacing: -0.6 },
  subtitle: { fontFamily: Fonts.regular, fontSize: 15, color: 'rgba(255,255,255,0.35)', lineHeight: 22 },

  // Options — black bg / white text; white bg / black text when selected
  optionList: { gap: 12 },
  option: {
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: 18, paddingHorizontal: 20, borderRadius: 14,
    backgroundColor: '#1C1C1E',
  },
  optionIcon: { width: 24, alignItems: 'center' },
  optionSel: { backgroundColor: '#FFF' },
  optionText: { fontFamily: Fonts.semibold, fontSize: 16, color: '#FFF' },
  optionTextSel: { color: '#000', fontFamily: Fonts.semibold },

  // Row options — icon on left, label centered in row
  rowOption: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 16, paddingHorizontal: 20, borderRadius: 14,
    backgroundColor: '#1C1C1E', gap: 14,
  },
  rowOptionIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center', alignItems: 'center',
  },
  rowOptionEmoji: { fontSize: 18 },
  rowOptionText: { fontFamily: Fonts.semibold, fontSize: 16, color: '#FFF' },

  // Chips — lighter, more breathing room
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: {
    paddingVertical: 11, paddingHorizontal: 18, borderRadius: 22,
    backgroundColor: 'transparent',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  chipSel: { borderColor: Colors.primary, backgroundColor: 'rgba(124,92,252,0.08)' },
  chipText: { fontFamily: Fonts.regular, fontSize: 14, color: 'rgba(255,255,255,0.45)' },
  chipTextSel: { color: '#FFF', fontFamily: Fonts.medium },
  countLabel: { fontFamily: Fonts.regular, fontSize: 13, color: 'rgba(255,255,255,0.2)', textAlign: 'center', marginTop: 8 },

  // Affirmations — lots of space, calm
  affirmCenter: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 60, minHeight: 420 },
  affirmBig: { fontFamily: Fonts.bold, fontSize: 32, color: '#FFF', textAlign: 'center', letterSpacing: -0.5, lineHeight: 40 },
  affirmHuge: { fontFamily: Fonts.bold, fontSize: 72, color: Colors.primary, letterSpacing: -3 },
  affirmBody: { fontFamily: Fonts.regular, fontSize: 16, color: 'rgba(255,255,255,0.38)', textAlign: 'center', lineHeight: 25, marginTop: 20 },

  // Bottom — clean black button
  bottomBar: { paddingHorizontal: 28, paddingTop: 10 },
  nextBtn: { height: 54, borderRadius: 14, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center' },
  nextBtnOff: { opacity: 0.2 },
  nextBtnText: { fontFamily: Fonts.semibold, fontSize: 16, color: '#000' },
});
