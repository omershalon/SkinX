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
import { Ionicons } from '@expo/vector-icons';
import {
  MaleIcon, FemaleIcon, OtherGenderIcon,
  OilyIcon, DryIcon, ComboIcon, SensitiveIcon, NormalIcon, QuestionIcon,
  ClockIcon, TargetIcon, TrendDownIcon, ShieldIcon, SparkleIcon,
  LeafIcon, BlockIcon, FlameIcon,
  PillIcon, BottleIcon, SaladIcon, DoctorIcon, FacialIcon, EmptyIcon,
  BreakoutIcon, ScarIcon, SunIcon,
  XBrandIcon, AppStoreBrandIcon, YouTubeBrandIcon, FriendsBrandIcon,
  TVBrandIcon, InstagramBrandIcon, TikTokBrandIcon, GoogleBrandIcon,
  FacebookBrandIcon, OtherBrandIcon, ThumbsUpIcon, ThumbsDownIcon,
} from '@/components/onboarding/Icons';

const { width: SW } = Dimensions.get('window');

type Ans = {
  gender: string; birthDate: BirthDate; skinType: string; duration: string;
  tried: string[]; concerns: string[]; goal: string; holistic: string;
  barriers: string[]; commitment: string; hearAbout: string; triedApps: string;
};
const DEFAULT_BIRTH: BirthDate = { month: 1, day: 1, year: 2000 };
const EMPTY: Ans = { gender: '', birthDate: DEFAULT_BIRTH, skinType: '', duration: '', tried: [], concerns: [], goal: '', holistic: '', barriers: [], commitment: '', hearAbout: '', triedApps: '' };

// 11 questions + 3 affirmations + 1 graph = 15 screens
const TOTAL = 15;

const HEAR_SOURCES = [
  { id: 'x',              label: 'X',               icon: (_s: boolean) => <XBrandIcon size={36} /> },
  { id: 'app_store',      label: 'App Store',        icon: (_s: boolean) => <AppStoreBrandIcon size={36} /> },
  { id: 'youtube',        label: 'YouTube',          icon: (_s: boolean) => <YouTubeBrandIcon size={36} /> },
  { id: 'friend_family',  label: 'Friend or family', icon: (_s: boolean) => <FriendsBrandIcon size={36} /> },
  { id: 'tv',             label: 'TV',               icon: (_s: boolean) => <TVBrandIcon size={36} /> },
  { id: 'instagram',      label: 'Instagram',        icon: (_s: boolean) => <InstagramBrandIcon size={36} /> },
  { id: 'tiktok',         label: 'TikTok',           icon: (_s: boolean) => <TikTokBrandIcon size={36} /> },
  { id: 'google',         label: 'Google',           icon: (_s: boolean) => <GoogleBrandIcon size={36} /> },
  { id: 'facebook',       label: 'Facebook',         icon: (_s: boolean) => <FacebookBrandIcon size={36} /> },
  { id: 'other',          label: 'Other',            icon: (_s: boolean) => <OtherBrandIcon size={36} /> },
];

// ═══════════════════════════════════════════════════
//  REUSABLE
// ═══════════════════════════════════════════════════

function Option({ label, selected, onPress, icon }: { label: string; selected: boolean; onPress: () => void; icon?: React.ReactNode }) {
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (selected) {
      fade.setValue(0);
      Animated.timing(fade, { toValue: 1, duration: 300, useNativeDriver: false }).start();
    } else {
      fade.setValue(0);
    }
  }, [selected]);

  const bgColor  = fade.interpolate({ inputRange: [0, 1], outputRange: ['#1A1A1E', '#FFFFFF'] });
  const txtColor = fade.interpolate({ inputRange: [0, 1], outputRange: ['#FFFFFF', '#000000'] });

  return (
    <TouchableOpacity onPress={() => { Haptics.selectionAsync(); onPress(); }} activeOpacity={0.9}>
      <Animated.View style={[st.option, { backgroundColor: bgColor }]}>
        {icon && <View style={st.optionIcon}>{icon}</View>}
        <Animated.Text style={[st.optionText, { color: txtColor }]}>{label}</Animated.Text>
      </Animated.View>
    </TouchableOpacity>
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

function CheckOption({ title, subtitle, selected, onPress }: { title: string; subtitle: string; selected: boolean; onPress: () => void }) {
  const fade = useRef(new Animated.Value(selected ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(fade, { toValue: selected ? 1 : 0, duration: 300, useNativeDriver: false }).start();
  }, [selected]);

  const bgColor = fade.interpolate({ inputRange: [0, 1], outputRange: ['#1A1A1E', '#FFFFFF'] });
  const titleColor = fade.interpolate({ inputRange: [0, 1], outputRange: ['#FFFFFF', '#000000'] });
  const subColor = fade.interpolate({ inputRange: [0, 1], outputRange: ['rgba(255,255,255,0.4)', '#888'] });
  const borderColor = fade.interpolate({ inputRange: [0, 1], outputRange: ['rgba(255,255,255,0.25)', '#000'] });
  const fillColor = fade.interpolate({ inputRange: [0, 1], outputRange: ['transparent', '#000'] });

  return (
    <TouchableOpacity onPress={() => { Haptics.selectionAsync(); onPress(); }} activeOpacity={0.9}>
      <Animated.View style={[st.checkOption, { backgroundColor: bgColor }]}>
        <Animated.View style={[st.checkbox, { borderColor }]}>
          {selected && <View style={st.checkboxFill} />}
        </Animated.View>
        <View style={st.checkOptionText}>
          <Animated.Text style={[st.checkOptionTitle, { color: titleColor }]}>{title}</Animated.Text>
          {subtitle ? <Animated.Text style={[st.checkOptionSub, { color: subColor }]}>{subtitle}</Animated.Text> : null}
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
}

function RowOption({ label, icon, selected, onPress }: { label: string; icon: (selected: boolean) => React.ReactNode; selected: boolean; onPress: () => void }) {
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (selected) {
      fade.setValue(0);
      Animated.timing(fade, { toValue: 1, duration: 300, useNativeDriver: false }).start();
    } else {
      fade.setValue(0);
    }
  }, [selected]);

  const bgColor  = fade.interpolate({ inputRange: [0, 1], outputRange: ['#1A1A1E', '#FFFFFF'] });
  const txtColor = fade.interpolate({ inputRange: [0, 1], outputRange: ['#FFFFFF', '#000000'] });

  return (
    <TouchableOpacity onPress={() => { Haptics.selectionAsync(); onPress(); }} activeOpacity={0.9}>
      <Animated.View style={[st.rowOption, { backgroundColor: bgColor }]}>
        {icon(selected)}
        <Animated.Text style={[st.rowOptionText, { color: txtColor }]}>{label}</Animated.Text>
      </Animated.View>
    </TouchableOpacity>
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
      case 9:  return true; // affirmation
      case 10: return !!a.goal;
      case 11: return true; // affirmation
      case 12: return !!a.holistic;
      case 13: return a.barriers.length > 0;
      case 14: return !!a.commitment;
      default: return false;
    }
  };

  const isLastStep = step === 14;

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
              <RowOption key={src.id} label={src.label} icon={src.icon} selected={a.hearAbout === src.id} onPress={() => setA(p => ({ ...p, hearAbout: src.id }))} />
            ))}
          </View>
        </Q>
      );

      // ── 3: Tried other skincare apps ──
      case 3: return (
        <Q title="Have you tried other skincare apps?">
          <View style={st.optionList}>
            <RowOption label="Yes" icon={(sel) => <View style={{ width: 22, height: 22, overflow: 'hidden' }}><ThumbsUpIcon size={22} color={sel ? '#000' : '#fff'} /></View>} selected={a.triedApps === 'yes'} onPress={() => setA(p => ({ ...p, triedApps: 'yes' }))} />
            <RowOption label="No"  icon={(sel) => <View style={{ width: 22, height: 22, overflow: 'hidden' }}><ThumbsDownIcon size={22} color={sel ? '#000' : '#fff'} /></View>} selected={a.triedApps === 'no'}  onPress={() => setA(p => ({ ...p, triedApps: 'no' }))} />
          </View>
        </Q>
      );

      // ── 4: Skin type ──
      case 4: return (
        <Q title="What's your skin type?">
          <View style={st.optionList}>
            {['Normal', 'Oily', 'Dry'].map(o => (
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
            {['Just recently', 'Less than a year', '1 - 3 years', '3 - 5 years', '5+ years'].map(o => (
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

      // ── 8: Skin concerns ──
      case 8: return (
        <Q title="What are your main skin concerns?" subtitle="Select all that apply.">
          <View style={st.optionList}>
            {[
              { id: 'acne', title: 'Acne and Breakouts', sub: 'Pimples, blackheads, and clogged pores.' },
              { id: 'redness', title: 'Redness or Irritation', sub: 'Rosacea, inflamed, or irritated skin.' },
              { id: 'oiliness', title: 'Oiliness and Shine', sub: 'Excess oil with shiny or greasy skin.' },
              { id: 'dryness', title: 'Dryness or Flakiness', sub: 'Tight, rough, or peeling skin.' },
              { id: 'tone', title: 'Uneven Tone or Pigmentation', sub: 'Dark spots or discoloration on skin.' },
              { id: 'aging', title: 'Aging Concerns', sub: 'Wrinkles, fine lines, crow\'s feet.' },
              { id: 'pores', title: 'Enlarged Pores and Texture', sub: 'Large pores or rough skin surface.' },
              { id: 'dark_circles', title: 'Dark Circles and Puffiness', sub: 'Darkness or swelling around eyes.' },
              { id: 'maintaining', title: 'Maintaining Skin Health', sub: 'Keeping skin balanced and healthy.' },
            ].map(o => (
              <CheckOption key={o.id} title={o.title} subtitle={o.sub} selected={a.tried.includes(o.id)} onPress={() => toggleMulti('tried', o.id)} />
            ))}
          </View>
        </Q>
      );

      // ── 9: Affirmation 2 ──
      case 9: return (
        <View style={st.affirmCenter}>
          <Text style={st.affirmHuge}>67%</Text>
          <Text style={st.affirmBody}>
            People with {a.skinType?.toLowerCase() || 'your'} skin dealing with {a.concerns[0]?.toLowerCase() || 'breakouts'} see an average 67% improvement within 6 weeks.
          </Text>
        </View>
      );

      // ── 10: Goal ──
      case 10: return (
        <Q title="What's your goal?" subtitle="We'll build your plan around this">
          <View style={st.optionList}>
            {['Completely clear skin', 'Fewer breakouts', 'Manage what I have', 'Prevent future issues', 'Fade scars and marks'].map(o => (
              <Option key={o} label={o} selected={a.goal === o} onPress={() => setA(p => ({ ...p, goal: o }))} />
            ))}
          </View>
        </Q>
      );

      // ── 11: Affirmation 3 ──
      case 11: return (
        <View style={st.affirmCenter}>
          <Text style={st.affirmBig}>Totally achievable.</Text>
          <Text style={st.affirmBody}>
            Most people with your profile start seeing real changes in 3 to 6 weeks. Consistency is everything.
          </Text>
        </View>
      );

      // ── 12: Holistic ──
      case 12: return (
        <Q title="Are you open to natural approaches?" subtitle="Things like herbal remedies, diet changes, and clean skincare">
          <View style={st.optionList}>
            {['Yes, I prefer natural', 'Open to trying', 'Not really', 'Tell me more'].map(o => (
              <Option key={o} label={o} selected={a.holistic === o} onPress={() => setA(p => ({ ...p, holistic: o }))} />
            ))}
          </View>
        </Q>
      );

      // ── 13: Barriers ──
      case 13: return (
        <Q title="What's been your biggest challenge?">
          <View style={st.optionList}>
            {["Don't know what to use", 'Too much conflicting info', "Can't afford a dermatologist", 'Nothing seems to work', 'No consistent routine', "Don't know what's causing it"].map(o => (
              <Option key={o} label={o} selected={a.barriers[0] === o} onPress={() => setA(p => ({ ...p, barriers: [o] }))} />
            ))}
          </View>
        </Q>
      );

      // ── 14: Commitment ──
      case 14: return (
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
      <View style={[StyleSheet.absoluteFill, { backgroundColor: '#000000' }]} />

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
        {step === 1 ? (
          <View style={[st.scroll, { flex: 1 }]}>{renderStep()}</View>
        ) : (
          <ScrollView contentContainerStyle={st.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" bounces={false}>
            {renderStep()}
          </ScrollView>
        )}
      </Animated.View>

      {/* Next button */}
      <View style={[st.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity
          style={[st.nextBtn, !canNext() && st.nextBtnDisabled]}
          onPress={() => { if (!canNext()) return; Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); isLastStep ? finish() : next(); }}
          activeOpacity={canNext() ? 0.85 : 1}>
          <Text style={[st.nextBtnText, !canNext() && st.nextBtnTextDisabled]}>{isLastStep ? "Let's go" : 'Continue'}</Text>
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
    paddingVertical: 22, paddingHorizontal: 20, borderRadius: 14,
    backgroundColor: '#1A1A1E',
  },
  optionIcon: { width: 24, alignItems: 'center' },
  optionSel: { backgroundColor: '#FFF' },
  optionText: { fontFamily: Fonts.semibold, fontSize: 16, color: '#FFF' },
  optionTextSel: { color: '#000', fontFamily: Fonts.semibold },

  // Row options — icon on left, label centered in row
  rowOption: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 20, paddingHorizontal: 20, borderRadius: 14,
    backgroundColor: '#1A1A1E', gap: 14,
  },
  rowOptionIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center', alignItems: 'center',
  },
  rowOptionText: { fontFamily: Fonts.semibold, fontSize: 16, color: '#FFF' },

  // Chips — lighter, more breathing room
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },

  // Check option cards (skin concerns)
  checkOption: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 18, paddingHorizontal: 18, borderRadius: 14,
    backgroundColor: '#1A1A1E', gap: 14,
  },
  checkbox: {
    width: 24, height: 24, borderRadius: 6,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center', alignItems: 'center',
  },
  checkboxFill: {
    width: 14, height: 14, borderRadius: 3,
    backgroundColor: '#000',
  },
  checkOptionText: { flex: 1 },
  checkOptionTitle: { fontFamily: Fonts.semibold, fontSize: 15, color: '#fff' },
  checkOptionSub: { fontFamily: Fonts.regular, fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 2 },
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
  nextBtnDisabled: { backgroundColor: '#888' },
  nextBtnTextDisabled: { color: '#000' },
});
