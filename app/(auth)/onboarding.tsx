import { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Animated, Modal, TextInput, Platform, KeyboardAvoidingView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import * as StoreReview from 'expo-store-review';
import { Colors, Fonts } from '@/lib/theme';
import DatePicker, { BirthDate } from '@/components/onboarding/DatePicker';
import AnimatedGraph from '@/components/onboarding/AnimatedGraph';
import BarComparison from '@/components/onboarding/BarComparison';
import LottieView from 'lottie-react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  LockIcon,
  XBrandIcon, AppStoreBrandIcon, YouTubeBrandIcon, FriendsBrandIcon,
  TVBrandIcon, InstagramBrandIcon, TikTokBrandIcon, GoogleBrandIcon,
  FacebookBrandIcon, OtherBrandIcon, ThumbsUpIcon, ThumbsDownIcon,
} from '@/components/onboarding/Icons';


type Ans = {
  gender: string; birthDate: BirthDate; skinType: string; sensitivity: string; duration: string;
  tried: string[]; concerns: string[]; breakoutZones: string[]; goal: string[]; holistic: string;
  barriers: string[]; skincareRoutine: string; hormonalTreatment: string[]; hearAbout: string; triedApps: string;
  referralCode: string;
};
const DEFAULT_BIRTH: BirthDate = { month: 1, day: 1, year: 2026 };
const EMPTY: Ans = { gender: '', birthDate: DEFAULT_BIRTH, skinType: '', sensitivity: '', duration: '', tried: [], concerns: [], breakoutZones: [], goal: [], holistic: '', barriers: [], skincareRoutine: '', hormonalTreatment: [], hearAbout: '', triedApps: '', referralCode: '' };

// Step 14 (hormonal treatment) only renders for female users, so total screens is gender-dependent.
const TOTAL_FEMALE = 21;
const TOTAL_OTHER = 20;
const HORMONAL_STEP = 14;

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


function CheckOption({ title, subtitle, selected, onPress }: { title: string; subtitle: string; selected: boolean; onPress: () => void }) {
  const fade = useRef(new Animated.Value(selected ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(fade, { toValue: selected ? 1 : 0, duration: 300, useNativeDriver: false }).start();
  }, [selected]);

  const bgColor = fade.interpolate({ inputRange: [0, 1], outputRange: ['#1A1A1E', '#FFFFFF'] });
  const titleColor = fade.interpolate({ inputRange: [0, 1], outputRange: ['#FFFFFF', '#000000'] });
  const subColor = fade.interpolate({ inputRange: [0, 1], outputRange: ['rgba(255,255,255,0.4)', '#888'] });
  const borderColor = fade.interpolate({ inputRange: [0, 1], outputRange: ['rgba(255,255,255,0.25)', '#000'] });

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
  const { t } = useTranslation();
  const [step, setStep] = useState(0);
  const [a, setA] = useState<Ans>(EMPTY);
  const [ageGateVisible, setAgeGateVisible] = useState(false);
  const [referralFocused, setReferralFocused] = useState(false);
  const [selectedStar, setSelectedStar] = useState(0);
  const prog = useRef(new Animated.Value(1 / TOTAL_FEMALE)).current;
  const enterAnim = useRef(new Animated.Value(0)).current;
  const navigating = useRef(false);
  const fingerBounce = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (step === 18) setSelectedStar(0);
    if (step !== 19) return;
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(fingerBounce, { toValue: -8, duration: 600, useNativeDriver: true }),
        Animated.timing(fingerBounce, { toValue: 0,  duration: 600, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => { anim.stop(); fingerBounce.setValue(0); };
  }, [step]);

  const trustLottieRef = useRef<any>(null);


  const isFemale = a.gender === 'Female';
  const total = isFemale ? TOTAL_FEMALE : TOTAL_OTHER;
  // Effective step for progress bar — collapses skipped hormonal step for non-female users.
  const effectiveStep = (s: number) => (isFemale || s < HORMONAL_STEP ? s : s - 1);

  const animateIn = () => {
    enterAnim.setValue(0);
    Animated.timing(enterAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  };

  const goTo = (s: number) => {
    if (navigating.current) return;
    navigating.current = true;
    Animated.timing(enterAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
      setStep(s);
      Animated.spring(prog, { toValue: (effectiveStep(s) + 1) / total, friction: 10, tension: 40, useNativeDriver: false }).start();
      animateIn();
      navigating.current = false;
    });
  };

  const next = () => {
    const target = step + 1;
    goTo(!isFemale && target === HORMONAL_STEP ? target + 1 : target);
  };
  const back = () => {
    if (step === 0) { router.back(); return; }
    const target = step - 1;
    goTo(!isFemale && target === HORMONAL_STEP ? target - 1 : target);
  };
  useEffect(() => { animateIn(); }, []);

  const finish = () => {
    if (navigating.current) return;
    navigating.current = true;
    const age = new Date().getFullYear() - a.birthDate.year;
    router.push({ pathname: '/(auth)/photo-capture', params: { onboardingData: JSON.stringify({ ...a, age: String(age) }) } });
  };

  const toggleMulti = (key: 'tried' | 'concerns' | 'barriers' | 'breakoutZones' | 'goal' | 'hormonalTreatment', val: string) => {
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
      case 14: return a.hormonalTreatment.length > 0; // female-only
      case 15: return !!a.holistic;
      case 16: return true; // affirmation
      case 17: return true; // trust screen
      case 18: return true; // rate the app
      case 19: return true; // notifications
      case 20: return true; // referral code (optional — skip always allowed)
      default: return false;
    }
  };

  const isLastStep = step === 20;

  const Q = ({ title, subtitle, children, sticky }: { title: string; subtitle?: string; children: React.ReactNode; sticky?: boolean }) => {
    if (sticky) {
      return (
        <View style={{ flex: 1 }}>
          <View style={[st.qTop, { paddingTop: 28, paddingBottom: 20 }]}>
            <Text style={st.title}>{title}</Text>
            {subtitle ? <Text style={st.subtitle}>{subtitle}</Text> : null}
          </View>
          <ScrollView contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false} bounces>
            {children}
          </ScrollView>
        </View>
      );
    }
    return (
      <View style={st.qWrap}>
        <View style={st.qTop}>
          <Text style={st.title}>{title}</Text>
          {subtitle ? <Text style={st.subtitle}>{subtitle}</Text> : null}
        </View>
        <View style={st.qMid}>{children}</View>
      </View>
    );
  };

  const renderStep = () => {
    switch (step) {
      // ── 0: Gender ──
      case 0: return (
        <Q title={t('onboarding.gender')} subtitle={t('onboarding.helpPersonalize')}>
          <View style={st.optionList}>
            {([
              { value: 'Male', label: t('onboarding.genderMale') },
              { value: 'Female', label: t('onboarding.genderFemale') },
              { value: 'Other', label: t('onboarding.genderOther') },
            ] as const).map(o => (
              <Option key={o.value} label={o.label} selected={a.gender === o.value} onPress={() => setA(p => ({ ...p, gender: o.value }))} />
            ))}
          </View>
        </Q>
      );

      // ── 1: Birth date ──
      case 1: return (
        <Q title={t('onboarding.birthDate')} subtitle={t('onboarding.helpPersonalize')}>
          <DatePicker value={a.birthDate} onChange={v => setA(p => ({ ...p, birthDate: v }))} />
        </Q>
      );

      // ── 2: Where did you hear about us ──
      case 2: return (
        <Q title={t('onboarding.hearAbout')} sticky>
          <View style={st.optionList}>
            {HEAR_SOURCES.map(src => (
              <RowOption key={src.id} label={src.label} icon={src.icon} selected={a.hearAbout === src.id} onPress={() => setA(p => ({ ...p, hearAbout: src.id }))} />
            ))}
          </View>
        </Q>
      );

      // ── 3: Tried other skincare apps ──
      case 3: return (
        <Q title={t('onboarding.triedApps')}>
          <View style={st.optionList}>
            <RowOption label={t('onboarding.yes')} icon={(sel) => <View style={{ width: 22, height: 22, overflow: 'hidden' }}><ThumbsUpIcon size={22} color={sel ? '#000' : '#fff'} /></View>} selected={a.triedApps === 'yes'} onPress={() => setA(p => ({ ...p, triedApps: 'yes' }))} />
            <RowOption label={t('onboarding.no')}  icon={(sel) => <View style={{ width: 22, height: 22, overflow: 'hidden' }}><ThumbsDownIcon size={22} color={sel ? '#000' : '#fff'} /></View>} selected={a.triedApps === 'no'}  onPress={() => setA(p => ({ ...p, triedApps: 'no' }))} />
          </View>
        </Q>
      );

      // ── 4: Animated graph proof screen ──
      case 4: return <AnimatedGraph />;

      // ── 5: Skin type ──
      case 5: return (
        <Q title={t('onboarding.skinType')}>
          <View style={st.optionList}>
            {([
              { value: 'Normal', label: t('onboarding.skinTypeNormal') },
              { value: 'Oily', label: t('onboarding.skinTypeOily') },
              { value: 'Dry', label: t('onboarding.skinTypeDry') },
            ] as const).map(o => (
              <Option key={o.value} label={o.label} selected={a.skinType === o.value} onPress={() => setA(p => ({ ...p, skinType: o.value }))} />
            ))}
          </View>
        </Q>
      );

      // ── 6: Skin sensitivity ──
      case 6: return (
        <Q title={t('onboarding.sensitivity')}>
          <View style={st.optionList}>
            {([
              { value: 'Not sensitive', label: t('onboarding.sensitivityNone') },
              { value: 'Slightly sensitive', label: t('onboarding.sensitivitySlightly') },
              { value: 'Moderately sensitive', label: t('onboarding.sensitivityModerately') },
              { value: 'Very sensitive', label: t('onboarding.sensitivityVery') },
            ] as const).map(o => (
              <Option key={o.value} label={o.label} selected={a.sensitivity === o.value} onPress={() => setA(p => ({ ...p, sensitivity: o.value }))} />
            ))}
          </View>
        </Q>
      );

      // ── 7: Skin concerns ──
      case 7: return (
        <Q title={t('onboarding.concerns')} subtitle={t('onboarding.selectAll')} sticky>
          <View style={st.optionList}>
            {[
              { id: 'acne',         title: t('onboarding.concernAcneTitle'),        sub: t('onboarding.concernAcneSub') },
              { id: 'redness',      title: t('onboarding.concernRednessTitle'),     sub: t('onboarding.concernRednessSub') },
              { id: 'oiliness',     title: t('onboarding.concernOilinessTitle'),    sub: t('onboarding.concernOilinessSub') },
              { id: 'dryness',      title: t('onboarding.concernDrynessTitle'),     sub: t('onboarding.concernDrynessSub') },
              { id: 'tone',         title: t('onboarding.concernToneTitle'),        sub: t('onboarding.concernToneSub') },
              { id: 'aging',        title: t('onboarding.concernAgingTitle'),       sub: t('onboarding.concernAgingSub') },
              { id: 'pores',        title: t('onboarding.concernPoresTitle'),       sub: t('onboarding.concernPoresSub') },
              { id: 'dark_circles', title: t('onboarding.concernDarkCirclesTitle'), sub: t('onboarding.concernDarkCirclesSub') },
              { id: 'no_concerns',  title: t('onboarding.concernNoneTitle'),        sub: t('onboarding.concernNoneSub') },
            ].map(o => (
              <CheckOption key={o.id} title={o.title} subtitle={o.sub} selected={a.tried.includes(o.id)} onPress={() => toggleMulti('tried', o.id)} />
            ))}
          </View>
        </Q>
      );

      // ── 8: Breakout zones ──
      case 8: return (
        <Q title={t('onboarding.breakoutZones')} subtitle={t('onboarding.selectAll')} sticky>
          <View style={st.optionList}>
            {[
              { id: 'forehead',     title: t('onboarding.zoneForehead'), sub: t('onboarding.zoneForeheadSub') },
              { id: 'cheeks',       title: t('onboarding.zoneCheeks'),   sub: t('onboarding.zoneCheeksSub') },
              { id: 'nose',         title: t('onboarding.zoneNose'),     sub: t('onboarding.zoneNoseSub') },
              { id: 'chin_jawline', title: t('onboarding.zoneChin'),     sub: t('onboarding.zoneChinSub') },
              { id: 'back',         title: t('onboarding.zoneBack'),     sub: t('onboarding.zoneBackSub') },
              { id: 'temples',      title: t('onboarding.zoneTemples'),  sub: t('onboarding.zoneTemplesSub') },
              { id: 'no_area',      title: t('onboarding.zoneNone'),     sub: t('onboarding.zoneNoneSub') },
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
        <Q title={t('onboarding.duration')}>
          <View style={st.optionList}>
            {([
              { value: 'Just recently',    label: t('onboarding.durationRecent') },
              { value: 'Less than a year', label: t('onboarding.durationUnderYear') },
              { value: '1 - 3 years',      label: t('onboarding.duration1to3') },
              { value: '3 - 5 years',      label: t('onboarding.duration3to5') },
              { value: '5+ years',          label: t('onboarding.duration5plus') },
            ] as const).map(o => (
              <Option key={o.value} label={o.label} selected={a.duration === o.value} onPress={() => setA(p => ({ ...p, duration: o.value }))} />
            ))}
          </View>
        </Q>
      );

      // ── 10: Goal ──
      case 10: return (
        <Q title={t('onboarding.goals')} subtitle={t('onboarding.selectAll')} sticky>
          <View style={st.optionList}>
            {[
              { id: 'clear_acne',  title: t('onboarding.goalClearAcneTitle'),  sub: t('onboarding.goalClearAcneSub') },
              { id: 'fade_spots',  title: t('onboarding.goalFadeSpotsTitle'),  sub: t('onboarding.goalFadeSpotsSub') },
              { id: 'even_tone',   title: t('onboarding.goalEvenToneTitle'),   sub: t('onboarding.goalEvenToneSub') },
              { id: 'hydrate',     title: t('onboarding.goalHydrateTitle'),    sub: t('onboarding.goalHydrateSub') },
              { id: 'irritation',  title: t('onboarding.goalIrritationTitle'), sub: t('onboarding.goalIrritationSub') },
              { id: 'texture',     title: t('onboarding.goalTextureTitle'),    sub: t('onboarding.goalTextureSub') },
              { id: 'control_oil', title: t('onboarding.goalControlOilTitle'), sub: t('onboarding.goalControlOilSub') },
              { id: 'anti_aging',  title: t('onboarding.goalAntiAgingTitle'),  sub: t('onboarding.goalAntiAgingSub') },
              { id: 'brighten',    title: t('onboarding.goalBrightenTitle'),   sub: t('onboarding.goalBrightenSub') },
              { id: 'maintain',    title: t('onboarding.goalMaintainTitle'),   sub: t('onboarding.goalMaintainSub') },
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
        <Q title={t('onboarding.barriers')} subtitle={t('onboarding.selectAll')} sticky>
          <View style={st.optionList}>
            {[
              { id: 'dont_know_products', title: t('onboarding.barrierProductsTitle'), sub: t('onboarding.barrierProductsSub') },
              { id: 'conflicting_info',   title: t('onboarding.barrierInfoTitle'),      sub: t('onboarding.barrierInfoSub') },
              { id: 'cant_afford_derm',   title: t('onboarding.barrierDermTitle'),      sub: t('onboarding.barrierDermSub') },
              { id: 'nothing_works',      title: t('onboarding.barrierNothingTitle'),   sub: t('onboarding.barrierNothingSub') },
              { id: 'no_routine',         title: t('onboarding.barrierRoutineTitle'),   sub: t('onboarding.barrierRoutineSub') },
              { id: 'dont_know_cause',    title: t('onboarding.barrierCauseTitle'),     sub: t('onboarding.barrierCauseSub') },
            ].map(o => (
              <CheckOption key={o.id} title={o.title} subtitle={o.sub} selected={a.barriers.includes(o.id)} onPress={() => toggleMulti('barriers', o.id)} />
            ))}
          </View>
        </Q>
      );

      // ── 13: Skincare routine ──
      case 13: return (
        <Q title={t('onboarding.routine')}>
          <View style={st.optionList}>
            <TouchableOpacity
              style={[st.yesNoOption, a.skincareRoutine === 'yes' && st.yesNoOptionSel]}
              onPress={() => { Haptics.selectionAsync(); setA(p => ({ ...p, skincareRoutine: 'yes' })); }}
              activeOpacity={0.9}>
              <View style={[st.yesNoIconCircle, a.skincareRoutine === 'yes' && st.yesNoIconCircleSel]}>
                <Ionicons name="checkmark" size={14} color={a.skincareRoutine === 'yes' ? '#fff' : '#fff'} />
              </View>
              <Text style={[st.yesNoText, a.skincareRoutine === 'yes' && st.yesNoTextSel]}>{t('onboarding.yes')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[st.yesNoOption, a.skincareRoutine === 'no' && st.yesNoOptionSel]}
              onPress={() => { Haptics.selectionAsync(); setA(p => ({ ...p, skincareRoutine: 'no' })); }}
              activeOpacity={0.9}>
              <View style={[st.yesNoIconCircle, a.skincareRoutine === 'no' && st.yesNoIconCircleSel]}>
                <Ionicons name="close" size={14} color="#fff" />
              </View>
              <Text style={[st.yesNoText, a.skincareRoutine === 'no' && st.yesNoTextSel]}>{t('onboarding.no')}</Text>
            </TouchableOpacity>
          </View>
        </Q>
      );

      // ── 14: Hormonal treatment (female-only) ──
      case 14: return (
        <Q title={t('onboarding.hormonalTitle')} subtitle={t('onboarding.selectAll')} sticky>
          <View style={st.optionList}>
            {[
              { id: 'combined_pill',      title: t('onboarding.hormonalCombinedPillTitle'),  sub: t('onboarding.hormonalCombinedPillSub') },
              { id: 'progestin_only_pill',title: t('onboarding.hormonalProgestinPillTitle'), sub: t('onboarding.hormonalProgestinPillSub') },
              { id: 'hormonal_iud',       title: t('onboarding.hormonalIudTitle'),           sub: t('onboarding.hormonalIudSub') },
              { id: 'implant_injection',  title: t('onboarding.hormonalImplantTitle'),       sub: t('onboarding.hormonalImplantSub') },
              { id: 'hrt',                title: t('onboarding.hormonalHrtTitle'),           sub: t('onboarding.hormonalHrtSub') },
              { id: 'other_hormonal',     title: t('onboarding.hormonalOtherTitle'),         sub: t('onboarding.hormonalOtherSub') },
              { id: 'none',               title: t('onboarding.hormonalNoneTitle'),          sub: t('onboarding.hormonalNoneSub') },
            ].map(o => (
              <CheckOption key={o.id} title={o.title} subtitle={o.sub} selected={a.hormonalTreatment.includes(o.id)} onPress={() => toggleMulti('hormonalTreatment', o.id)} />
            ))}
          </View>
        </Q>
      );

      // ── 15: Holistic ──
      case 15: return (
        <Q title={t('onboarding.holistic')} subtitle={t('onboarding.holisticSub')}>
          <View style={st.optionList}>
            {([
              { value: 'Yes, I prefer natural', label: t('onboarding.holisticYes') },
              { value: 'Open to trying',         label: t('onboarding.holisticOpen') },
              { value: 'No',                     label: t('onboarding.holisticNo') },
            ] as const).map(o => (
              <Option key={o.value} label={o.label} selected={a.holistic === o.value} onPress={() => setA(p => ({ ...p, holistic: o.value }))} />
            ))}
          </View>
        </Q>
      );

      // ── 16: Affirmation ──
      case 16: return (
        <View style={st.affirmCenter}>
          <Text style={st.affirmBig}>{t('onboarding.affirmTitle')}</Text>
          <Text style={st.affirmBody}>{t('onboarding.affirmBody')}</Text>
        </View>
      );

      // ── 17: Trust / Privacy ──
      case 17: return (
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
          <Text style={st.trustTitle}>{t('onboarding.trustTitle')}</Text>
          <Text style={st.trustSubtitle}>{t('onboarding.trustSubtitle')}</Text>
          <View style={st.trustCard}>
            <LockIcon size={32} color="#A855F7" />
            <Text style={st.trustCardTitle}>{t('onboarding.trustCardTitle')}</Text>
            <Text style={st.trustCardBody}>{t('onboarding.trustCardBody')}</Text>
          </View>
        </View>
      );

      // ── 18: Rate the app ──
      case 18: return (
        <View style={st.rateWrap}>
<Text style={st.rateTitle}>Enjoying Glow so far?</Text>
          <Text style={st.rateSub}>Tap a star to rate us on the App Store.</Text>
          <View style={st.rateStars}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity
                key={star}
                activeOpacity={0.7}
                onPress={async () => {
                  if (selectedStar > 0) return;
                  setSelectedStar(star);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  const isAvailable = await StoreReview.isAvailableAsync();
                  if (isAvailable) await StoreReview.requestReview();
                  setTimeout(() => next(), 800);
                }}
              >
                <Text style={[st.rateStar, star <= selectedStar ? st.rateStarDone : st.rateStarEmpty]}>
                  {star <= selectedStar ? '★' : '☆'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {selectedStar > 0 && (
            <Text style={st.rateThanks}>Thank you!</Text>
          )}
        </View>
      );

      // ── 19: Push notifications ──
      case 19: return (
        <View style={st.notifWrap}>
          <Text style={st.notifTitle}>Get reminded to{'\n'}log scans.</Text>
          <View style={st.notifCard}>
            <Text style={st.notifCardHeading}>
              <Text style={st.notifSkin}>Skin</Text><Text style={st.notifX}>X</Text>
              {' '}would like to send{'\n'}you Notifications
            </Text>
            <View style={st.notifDividerH} />
            <View style={st.notifBtns}>
              <TouchableOpacity style={st.notifBtnLeft} activeOpacity={0.7} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); next(); }}>
                <Text style={st.notifBtnLeftText}>Don't Allow</Text>
              </TouchableOpacity>
              <View style={st.notifDividerV} />
              <TouchableOpacity style={st.notifBtnRight} activeOpacity={0.7} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); next(); }}>
                <Text style={st.notifBtnRightText}>Allow</Text>
              </TouchableOpacity>
            </View>
          </View>
          {/* Pointing finger — aligned under the Allow button (right half) */}
          <View style={st.notifFingerRow}>
            <View style={{ flex: 1 }} />
            <Animated.View style={[st.notifFingerRight, { transform: [{ translateY: fingerBounce }] }]}>
              <Text style={st.notifFingerEmoji}>👆</Text>
            </Animated.View>
          </View>
        </View>
      );

      // ── 20: Referral code (optional) ──
      case 20: return (
        <Q title={t('onboarding.referralTitle')} subtitle={t('onboarding.referralSub')}>
          {/* Input lifts by half the Skip button's lift so it remains centered between the
              title (fixed) and the Skip button (lifted) when the keyboard is open. */}
          <View>
          <View style={[st.referralCard, referralFocused && st.referralCardFocused]}>
            <TextInput
              style={st.referralInput}
              placeholder={t('onboarding.referralPlaceholder')}
              placeholderTextColor="rgba(255,255,255,0.4)"
              value={a.referralCode ?? ''}
              onChangeText={(v) => setA(p => ({ ...p, referralCode: v }))}
              autoCapitalize="characters"
              autoCorrect={false}
              returnKeyType="done"
              onFocus={() => setReferralFocused(true)}
              onBlur={() => setReferralFocused(false)}
            />
            {(() => {
              const hasCode = !!(a.referralCode ?? '').trim();
              return (
                <TouchableOpacity
                  style={[st.referralSubmit, !hasCode && st.referralSubmitDisabled]}
                  onPress={() => {
                    if (!hasCode) return;
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    finish();
                  }}
                  activeOpacity={hasCode ? 0.85 : 1}>
                  <Text style={[st.referralSubmitText, !hasCode && st.referralSubmitTextDisabled]}>
                    {t('onboarding.referralSubmit')}
                  </Text>
                </TouchableOpacity>
              );
            })()}
          </View>
          </View>
        </Q>
      );

      default: return null;
    }
  };

  return (
    <KeyboardAvoidingView
      style={[st.root, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={insets.top}
    >
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
        {step === 1 || step === 11 || step === 17 || step === 18 || step === 19 ? (
          <View style={[st.scroll, { flex: 1 }]}>{renderStep()}</View>
        ) : step === 2 || step === 7 || step === 8 || step === 10 || step === 12 || step === 14 || step === 20 ? (
          <View style={{ flex: 1, paddingHorizontal: 24 }}>{renderStep()}</View>
        ) : (
          <ScrollView contentContainerStyle={st.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" bounces={false}>
            {renderStep()}
          </ScrollView>
        )}
      </Animated.View>

      {/* Bottom bar — translated by keyboardLift so only the Skip button rises with the keyboard.
          The title above stays pinned in place. */}
      {step !== 19 && <Animated.View style={[st.bottomBar, {
        paddingBottom: insets.bottom + 12,
      }]}>
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
          <Text style={[st.nextBtnText, !canNext() && st.nextBtnTextDisabled]}>{isLastStep ? t('onboarding.skip') : t('onboarding.next')}</Text>
        </TouchableOpacity>
      </Animated.View>}

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
    </KeyboardAvoidingView>
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

  // Referral code screen (dark-theme inversion of the screenshot)
  referralCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#1A1A1E',
    borderRadius: 18,
    paddingLeft: 18, paddingRight: 6, paddingVertical: 6,
    gap: 8,
    borderWidth: 1.5, borderColor: 'transparent',
  },
  referralCardFocused: { borderColor: 'rgba(255,255,255,0.3)' },
  referralInput: {
    flex: 1,
    fontFamily: Fonts.medium, fontSize: 16, color: '#FFFFFF',
    paddingVertical: 14,
  },
  referralSubmit: {
    paddingHorizontal: 22, paddingVertical: 12,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  referralSubmitDisabled: { backgroundColor: 'rgba(255,255,255,0.08)' },
  referralSubmitText: { fontFamily: Fonts.semibold, fontSize: 15, color: '#FFFFFF' },
  referralSubmitTextDisabled: { color: 'rgba(255,255,255,0.4)' },

  // Push notifications screen
  notifWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24, gap: 24, paddingBottom: 100 },
  notifTitle: { fontFamily: Fonts.bold, fontSize: 30, color: '#FFF', textAlign: 'center', lineHeight: 38, letterSpacing: -0.6 },
  notifCard: {
    width: '100%', backgroundColor: '#D1D1D6', borderRadius: 16,
    overflow: 'hidden',
  },
  notifCardHeading: { fontFamily: Fonts.semibold, fontSize: 17, color: '#000', textAlign: 'center', paddingHorizontal: 24, paddingVertical: 20, lineHeight: 24 },
  notifSkin: { color: '#000' },
  notifX: { color: '#7C5CFC' },
  notifDividerH: { height: 1, backgroundColor: 'rgba(0,0,0,0.15)' },
  notifBtns: { flexDirection: 'row' },
  notifBtnLeft: { flex: 1, paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  notifBtnLeftText: { fontFamily: Fonts.regular, fontSize: 17, color: '#000' },
  notifDividerV: { width: 1, backgroundColor: 'rgba(0,0,0,0.15)' },
  notifBtnRight: { flex: 1, paddingVertical: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  notifBtnRightText: { fontFamily: Fonts.semibold, fontSize: 17, color: '#000' },
  notifFingerRow: { flexDirection: 'row', width: '100%', marginTop: 2 },
  notifFingerRight: { flex: 1, alignItems: 'center', paddingTop: 4 },
  notifFingerEmoji: { fontSize: 34 },

  // Rate the app screen
  rateWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32, gap: 16 },
  rateEmoji: { fontSize: 52, marginBottom: 4 },
  rateTitle: { fontFamily: Fonts.bold, fontSize: 28, color: '#FFFFFF', textAlign: 'center', letterSpacing: -0.5 },
  rateSub: { fontFamily: Fonts.regular, fontSize: 15, color: 'rgba(255,255,255,0.5)', textAlign: 'center', lineHeight: 22 },
  rateStars: { flexDirection: 'row', gap: 12, marginTop: 8 },
  rateStar: { fontSize: 44 },
  rateStarEmpty: { color: '#7C5CFC' },
  rateStarDone: { color: '#7C5CFC' },
  rateThanks: { fontFamily: Fonts.medium, fontSize: 15, color: 'rgba(255,255,255,0.6)', marginTop: 4 },
});
