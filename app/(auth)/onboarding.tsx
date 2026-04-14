import { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Animated, Dimensions, Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Colors, Fonts } from '@/lib/theme';
import DatePicker, { BirthDate } from '@/components/onboarding/DatePicker';
import AnimatedGraph from '@/components/onboarding/AnimatedGraph';
import BarComparison from '@/components/onboarding/BarComparison';
import LottieView from 'lottie-react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  MaleIcon, FemaleIcon, OtherGenderIcon,
  OilyIcon, DryIcon, ComboIcon, SensitiveIcon, NormalIcon, QuestionIcon,
  ClockIcon, TargetIcon, TrendDownIcon, ShieldIcon, SparkleIcon, LockIcon,
  LeafIcon, BlockIcon, FlameIcon,
  PillIcon, BottleIcon, SaladIcon, DoctorIcon, FacialIcon, EmptyIcon,
  BreakoutIcon, ScarIcon, SunIcon,
  XBrandIcon, AppStoreBrandIcon, YouTubeBrandIcon, FriendsBrandIcon,
  TVBrandIcon, InstagramBrandIcon, TikTokBrandIcon, GoogleBrandIcon,
  FacebookBrandIcon, OtherBrandIcon, ThumbsUpIcon, ThumbsDownIcon,
} from '@/components/onboarding/Icons';

const { width: SW } = Dimensions.get('window');

type Ans = {
  gender: string; birthDate: BirthDate; skinType: string; sensitivity: string; duration: string;
  tried: string[]; concerns: string[]; breakoutZones: string[]; goal: string[]; holistic: string;
  barriers: string[]; skincareRoutine: string; hearAbout: string; triedApps: string;
};
const DEFAULT_BIRTH: BirthDate = { month: 1, day: 1, year: 2026 };
const EMPTY: Ans = { gender: '', birthDate: DEFAULT_BIRTH, skinType: '', sensitivity: '', duration: '', tried: [], concerns: [], breakoutZones: [], goal: [], holistic: '', barriers: [], skincareRoutine: '', hearAbout: '', triedApps: '' };

// 13 questions + 1 graph + 1 bar comparison + 1 affirmation + 1 trust = 17 screens
const TOTAL = 17;

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
  const [ageGateVisible, setAgeGateVisible] = useState(false);
  const prog = useRef(new Animated.Value(1 / TOTAL)).current;
  const enterAnim = useRef(new Animated.Value(0)).current;
  const trustLottieRef = useRef<any>(null);

  const animateIn = () => {
    enterAnim.setValue(0);
    Animated.timing(enterAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  };

  const goTo = (s: number) => {
    Animated.timing(enterAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
      setStep(s);
      Animated.spring(prog, { toValue: (s + 1) / TOTAL, friction: 10, tension: 40, useNativeDriver: false }).start();
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

  const toggleMulti = (key: 'tried' | 'concerns' | 'barriers' | 'breakoutZones' | 'goal', val: string) => {
    setA(p => ({ ...p, [key]: p[key].includes(val) ? p[key].filter((v: string) => v !== val) : [...p[key], val] }));
  };


  const canNext = (): boolean => {
    switch (step) {
      case 0:  return !!a.gender;
      case 1:  return new Date(a.birthDate.year, a.birthDate.month - 1, a.birthDate.day) <= new Date();
      case 2:  return !!a.hearAbout;
      case 3:  return !!a.triedApps;
      case 4:  return true; // graph (always can proceed)
      case 5:  return !!a.skinType;
      case 6:  return !!a.sensitivity;
      case 7:  return a.tried.length > 0;
      case 8:  return a.breakoutZones.length > 0;
      case 9:  return !!a.duration;
      case 10: return a.goal.length > 0;
      case 11: return true; // bar comparison
      case 12: return a.barriers.length > 0;
      case 13: return !!a.skincareRoutine;
      case 14: return !!a.holistic;
      case 15: return true; // affirmation
      case 16: return true; // trust screen
      default: return false;
    }
  };

  const isLastStep = step === 16;

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
        <Q title="Choose your gender" subtitle="This helps us personalize your plan">
          <View style={st.optionList}>
            {['Male', 'Female', 'Other'].map(o => (
              <Option key={o} label={o} selected={a.gender === o} onPress={() => setA(p => ({ ...p, gender: o }))} />
            ))}
          </View>
        </Q>
      );

      // ── 1: Birth date ──
      case 1: return (
        <Q title="When were you born?" subtitle="This helps us personalize your plan">
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

      // ── 4: Animated graph proof screen ──
      case 4: return <AnimatedGraph />;

      // ── 5: Skin type ──
      case 5: return (
        <Q title="What's your skin type?">
          <View style={st.optionList}>
            {['Normal', 'Oily', 'Dry'].map(o => (
              <Option key={o} label={o} selected={a.skinType === o} onPress={() => setA(p => ({ ...p, skinType: o }))} />
            ))}
          </View>
        </Q>
      );

      // ── 6: Skin sensitivity ──
      case 6: return (
        <Q title="How sensitive is your skin?">
          <View style={st.optionList}>
            {['Not sensitive', 'Slightly sensitive', 'Moderately sensitive', 'Very sensitive'].map(o => (
              <Option key={o} label={o} selected={a.sensitivity === o} onPress={() => setA(p => ({ ...p, sensitivity: o }))} />
            ))}
          </View>
        </Q>
      );

      // ── 7: Skin concerns ──
      case 7: return (
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

      // ── 8: Breakout zones ──
      case 8: return (
        <Q title="Where do you have breakouts mostly?" subtitle="Select all that apply.">
          <View style={st.optionList}>
            {[
              { id: 'forehead',     title: 'Forehead',      sub: 'Common with oily skin or hair products.' },
              { id: 'cheeks',       title: 'Cheeks',        sub: 'Can be linked to pillowcases or phones.' },
              { id: 'nose',         title: 'Nose',          sub: 'Blackheads and clogged pores common.' },
              { id: 'chin_jawline', title: 'Chin and Jawline', sub: 'Often related to hormonal breakouts.' },
              { id: 'back',         title: 'Back or Chest', sub: 'Body acne from sweat or friction.' },
              { id: 'temples',      title: 'Temples',       sub: 'Linked to hair products or stress.' },
            ].map(o => (
              <CheckOption
                key={o.id}
                title={o.title}
                subtitle={o.sub}
                selected={a.breakoutZones.includes(o.id)}
                onPress={() => toggleMulti('breakoutZones', o.id)}
              />
            ))}
          </View>
        </Q>
      );

      // ── 9: Duration ──
      case 9: return (
        <Q title="How long have you dealt with skin issues?">
          <View style={st.optionList}>
            {['Just recently', 'Less than a year', '1 - 3 years', '3 - 5 years', '5+ years'].map(o => (
              <Option key={o} label={o} selected={a.duration === o} onPress={() => setA(p => ({ ...p, duration: o }))} />
            ))}
          </View>
        </Q>
      );

      // ── 10: Goal ──
      case 10: return (
        <Q title="What are your main skincare goals?" subtitle="Select all that apply.">
          <View style={st.optionList}>
            {[
              { id: 'clear_acne',    title: 'Clear Acne',        sub: 'Reduce breakouts and clogged pores.' },
              { id: 'fade_spots',    title: 'Fade Dark Spots',   sub: 'Lighten hyperpigmentation and marks.' },
              { id: 'even_tone',     title: 'Even Skin Tone',    sub: 'Improve tone and reduce discoloration.' },
              { id: 'hydrate',       title: 'Hydrate Skin',      sub: 'Boost moisture and barrier health.' },
              { id: 'irritation',    title: 'Reduce Irritation', sub: 'Soothe redness and calm skin.' },
              { id: 'texture',       title: 'Smooth Texture',    sub: 'Minimize pores and tighten texture.' },
              { id: 'control_oil',   title: 'Control Oil',       sub: 'Balance sebum and reduce shine.' },
              { id: 'anti_aging',    title: 'Anti-Aging',        sub: 'Reduce fine lines and wrinkles.' },
              { id: 'brighten',      title: 'Brighten Skin',     sub: 'Boost glow and skin radiance.' },
            ].map(o => (
              <CheckOption key={o.id} title={o.title} subtitle={o.sub} selected={a.goal.includes(o.id)} onPress={() => toggleMulti('goal', o.id)} />
            ))}
          </View>
        </Q>
      );

      // ── 11: Bar comparison ──
      case 11: return <BarComparison />;

      // ── 12: Barriers ──
      case 12: return (
        <Q title="What have been your biggest challenges?" subtitle="Select all that apply.">
          <View style={st.optionList}>
            {[
              { id: 'dont_know_products',  title: "Don't know what to use",        sub: 'Finding the right products is overwhelming.' },
              { id: 'conflicting_info',    title: 'Too much conflicting info',      sub: 'Advice online can be hard to navigate.' },
              { id: 'cant_afford_derm',    title: "Can't afford a dermatologist",   sub: 'Professional help isn\'t always accessible.' },
              { id: 'nothing_works',       title: 'Nothing seems to work',          sub: 'Products tried haven\'t made a difference.' },
              { id: 'no_routine',          title: 'No consistent routine',          sub: 'Sticking to a daily routine is difficult.' },
              { id: 'dont_know_cause',     title: "Don't know what's causing it",   sub: 'Hard to treat without knowing the trigger.' },
            ].map(o => (
              <CheckOption key={o.id} title={o.title} subtitle={o.sub} selected={a.barriers.includes(o.id)} onPress={() => toggleMulti('barriers', o.id)} />
            ))}
          </View>
        </Q>
      );

      // ── 13: Skincare routine ──
      case 13: return (
        <Q title="Do you follow a skincare routine?">
          <View style={st.optionList}>
            <TouchableOpacity
              style={[st.yesNoOption, a.skincareRoutine === 'yes' && st.yesNoOptionSel]}
              onPress={() => { Haptics.selectionAsync(); setA(p => ({ ...p, skincareRoutine: 'yes' })); }}
              activeOpacity={0.9}>
              <View style={[st.yesNoIconCircle, a.skincareRoutine === 'yes' && st.yesNoIconCircleSel]}>
                <Ionicons name="checkmark" size={14} color={a.skincareRoutine === 'yes' ? '#fff' : '#fff'} />
              </View>
              <Text style={[st.yesNoText, a.skincareRoutine === 'yes' && st.yesNoTextSel]}>Yes</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[st.yesNoOption, a.skincareRoutine === 'no' && st.yesNoOptionSel]}
              onPress={() => { Haptics.selectionAsync(); setA(p => ({ ...p, skincareRoutine: 'no' })); }}
              activeOpacity={0.9}>
              <View style={[st.yesNoIconCircle, a.skincareRoutine === 'no' && st.yesNoIconCircleSel]}>
                <Ionicons name="close" size={14} color="#fff" />
              </View>
              <Text style={[st.yesNoText, a.skincareRoutine === 'no' && st.yesNoTextSel]}>No</Text>
            </TouchableOpacity>
          </View>
        </Q>
      );

      // ── 14: Holistic ──
      case 14: return (
        <Q title="Are you open to natural approaches?" subtitle="Things like herbal remedies, diet changes, and natural products">
          <View style={st.optionList}>
            {['Yes, I prefer natural', 'Open to trying', 'No'].map(o => (
              <Option key={o} label={o} selected={a.holistic === o} onPress={() => setA(p => ({ ...p, holistic: o }))} />
            ))}
          </View>
        </Q>
      );

      // ── 15: Affirmation ──
      case 15: return (
        <View style={st.affirmCenter}>
          <Text style={st.affirmBig}>You're already ahead.</Text>
          <Text style={st.affirmBody}>
            Most people never take the first step. The fact that you're here means you're serious about real change and that's exactly what gets results.
          </Text>
        </View>
      );

      // ── 16: Trust / Privacy ──
      case 16: return (
        <View style={st.trustWrap}>
          <LottieView
            ref={trustLottieRef}
            source={require('@/assets/trust-animation.json')}
            autoPlay
            loop={false}
            speed={0.5}
            style={{ width: 180, height: 180 }}
            onAnimationFinish={() => trustLottieRef.current?.pause()}
          />
          <Text style={st.trustTitle}>Thank you for{'\n'}trusting us</Text>
          <Text style={st.trustSubtitle}>Now let's personalize SkinX for you...</Text>
          <View style={st.trustCard}>
            <LockIcon size={32} color="#A855F7" />
            <Text style={st.trustCardTitle}>Your privacy and security matter to us.</Text>
            <Text style={st.trustCardBody}>
              We promise to always keep your personal information private and secure.
            </Text>
          </View>
        </View>
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
        {step === 1 || step === 11 || step === 16 ? (
          <View style={[st.scroll, { flex: 1 }]}>{renderStep()}</View>
        ) : (
          <ScrollView contentContainerStyle={st.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" bounces={step === 7 || step === 8 || step === 10 || step === 12}>
            {renderStep()}
          </ScrollView>
        )}
      </Animated.View>

      {/* Next button */}
      <View style={[st.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity
          style={[st.nextBtn, !canNext() && st.nextBtnDisabled]}
          onPress={() => {
            if (!canNext()) return;
            if (step === 1) {
              const { month, day, year } = a.birthDate;
              const today = new Date();
              const dob = new Date(year, month - 1, day);
              let age = today.getFullYear() - dob.getFullYear();
              const m = today.getMonth() - dob.getMonth();
              if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
              if (age < 9) { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setAgeGateVisible(true); return; }
            }
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            isLastStep ? finish() : next();
          }}
          activeOpacity={canNext() ? 0.85 : 1}>
          <Text style={[st.nextBtnText, !canNext() && st.nextBtnTextDisabled]}>{isLastStep ? "Let's go" : 'Continue'}</Text>
        </TouchableOpacity>
      </View>

      {/* Age gate modal */}
      <Modal visible={ageGateVisible} transparent animationType="none" statusBarTranslucent>
        <View style={st.modalOverlay}>
          <View style={st.modalCard}>
            <View style={st.modalHeader}>
              <Text style={st.modalTitle}>We're sorry!</Text>
              <TouchableOpacity style={st.modalClose} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setAgeGateVisible(false); router.replace({ pathname: '/(auth)/welcome', params: { instant: '1' } }); }} activeOpacity={0.7}>
                <Text style={st.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={st.modalBody}>You must be over 9 to use SkinX.</Text>
            <TouchableOpacity style={st.modalBtn} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setAgeGateVisible(false); router.replace({ pathname: '/(auth)/welcome', params: { instant: '1' } }); }} activeOpacity={0.85}>
              <Text style={st.modalBtnText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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

  // Trust / Privacy screen
  trustWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 40, gap: 24 },
  trustIconWrap: { alignItems: 'center', marginBottom: 8 },
  trustCircleOuter: {
    width: 180, height: 180, borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.06)',
    justifyContent: 'center', alignItems: 'center',
  },
  trustCircleInner: {
    width: 130, height: 130, borderRadius: 65,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center', alignItems: 'center',
  },
  trustHandEmoji: { fontSize: 64 },
  trustTitle: { fontFamily: Fonts.bold, fontSize: 34, color: '#FFF', textAlign: 'center', lineHeight: 42, letterSpacing: -0.7 },
  trustSubtitle: { fontFamily: Fonts.regular, fontSize: 15, color: 'rgba(255,255,255,0.35)', textAlign: 'center' },
  trustCard: {
    width: '100%', backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 18, padding: 22, alignItems: 'center', gap: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  trustLockEmoji: { fontSize: 32, marginBottom: 4 },
  trustCardTitle: { fontFamily: Fonts.bold, fontSize: 16, color: '#FFF', textAlign: 'center', lineHeight: 22 },
  trustCardBody: { fontFamily: Fonts.regular, fontSize: 14, color: 'rgba(255,255,255,0.4)', textAlign: 'center', lineHeight: 21 },

  // Affirmations — lots of space, calm
  affirmCenter: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 60, minHeight: 420 },
  affirmBig: { fontFamily: Fonts.bold, fontSize: 32, color: '#FFF', textAlign: 'center', letterSpacing: -0.5, lineHeight: 40 },
  affirmHuge: { fontFamily: Fonts.bold, fontSize: 72, color: Colors.primary, letterSpacing: -3 },
  affirmBody: { fontFamily: Fonts.regular, fontSize: 16, color: 'rgba(255,255,255,0.38)', textAlign: 'center', lineHeight: 25, marginTop: 20 },

  // Or divider (breakout zones screen)
  orDivider: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  orLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.1)' },
  orText: { fontFamily: Fonts.regular, fontSize: 13, color: 'rgba(255,255,255,0.3)' },

  // Yes / No option (skincare routine screen)
  yesNoOption: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 22, paddingHorizontal: 20, borderRadius: 14,
    backgroundColor: '#1A1A1E', gap: 14,
  },
  yesNoOptionSel: { backgroundColor: '#FFFFFF' },
  yesNoIconCircle: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  yesNoIconCircleSel: { backgroundColor: '#000000' },
  yesNoText: { fontFamily: Fonts.semibold, fontSize: 16, color: '#FFFFFF' },
  yesNoTextSel: { color: '#000000' },

  // Bottom — clean black button
  bottomBar: { paddingHorizontal: 28, paddingTop: 10 },
  nextBtn: { height: 54, borderRadius: 14, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center' },
  nextBtnOff: { opacity: 0.2 },
  nextBtnText: { fontFamily: Fonts.semibold, fontSize: 16, color: '#000' },
  nextBtnDisabled: { backgroundColor: '#888' },
  nextBtnTextDisabled: { color: '#000' },

  // Age gate modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  modalCard: { backgroundColor: '#FFF', borderRadius: 20, padding: 24, width: '100%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { fontFamily: Fonts.bold, fontSize: 22, color: '#000' },
  modalClose: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#EFEFEF', justifyContent: 'center', alignItems: 'center' },
  modalCloseText: { fontSize: 14, color: '#555' },
  modalBody: { fontFamily: Fonts.regular, fontSize: 16, color: '#555', lineHeight: 23, marginBottom: 20 },
  modalBtn: { backgroundColor: '#111', borderRadius: 14, height: 54, justifyContent: 'center', alignItems: 'center' },
  modalBtnText: { fontFamily: Fonts.semibold, fontSize: 16, color: '#FFF' },
});
