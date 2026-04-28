import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Animated,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useRouter, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Circle, Path } from 'react-native-svg';
import { supabase } from '@/lib/supabase';
import { useTabTransition } from '@/hooks/useTabTransition';
import { Colors, Typography, BorderRadius, Spacing, Shadows } from '@/lib/theme';
import ScreenBackground from '@/components/ScreenBackground';
import { PlanSkeleton } from '@/components/SkeletonLoader';
import type { Database, RankedItem, AcneType } from '@/lib/database.types';
import PickDetailModal from '@/components/PickDetailModal';
import { useTranslation } from 'react-i18next';

type PersonalizedPlan = Database['public']['Tables']['personalized_plans']['Row'];

/* ── Storage keys ── */
const MISSIONS_KEY = 'missions_v1';
const XP_KEY       = 'xp_v1';
const STREAK_KEY   = 'streak_v1';

/* ── XP per pillar ── */
const PILLAR_XP: Record<string, number> = {
  lifestyle: 20,
  herbal:    20,
  product:   20,
  diet:      10,
};
const XP_PER_LEVEL = 500;

/* ── Time-of-day grouping ── */
type TimeOfDay = 'morning' | 'midday' | 'evening';

const PILLAR_TIME: Record<string, TimeOfDay> = {
  product:   'morning',
  diet:      'midday',
  lifestyle: 'midday',
  herbal:    'evening',
};

const PILLAR_DURATION: Record<string, string> = {
  product:   '2 min',
  diet:      '5 min',
  lifestyle: '10–15 min',
  herbal:    '5 min',
};

const TIME_SECTIONS: { key: TimeOfDay; label: string }[] = [
  { key: 'morning', label: 'MORNING' },
  { key: 'midday',  label: 'MIDDAY'  },
  { key: 'evening', label: 'EVENING' },
];

/* ── Objective headlines ── */
const OBJECTIVE_HEADLINE: Partial<Record<AcneType, string>> = {
  hormonal:     'Balance hormones, reduce inflammation, and support clear skin.',
  cystic:       'Deep cleanse, reduce cystic inflammation, and protect your barrier.',
  comedonal:    'Clear pores, reduce buildup, and maintain a clean routine.',
  fungal:       'Restore balance, eliminate fungal triggers, and protect your barrier.',
  inflammatory: 'Calm inflammation, strengthen your barrier, and stay consistent.',
};
const DEFAULT_OBJECTIVE = 'Calm skin, maintain hydration, and protect your barrier.';

/* ── Missions helpers ── */
async function loadMissionsState(): Promise<{ doneRanks: Set<number> }> {
  try {
    const raw = await AsyncStorage.getItem(MISSIONS_KEY);
    if (raw) {
      const { date, doneRanks } = JSON.parse(raw);
      if (date === new Date().toDateString()) return { doneRanks: new Set(doneRanks as number[]) };
    }
  } catch {}
  return { doneRanks: new Set() };
}
async function saveMissionsState(doneRanks: Set<number>): Promise<void> {
  try {
    await AsyncStorage.setItem(MISSIONS_KEY, JSON.stringify({
      date: new Date().toDateString(), doneRanks: Array.from(doneRanks),
    }));
  } catch {}
}

/* ── XP helpers ── */
interface XpState { level: number; totalXp: number }
async function loadXpState(): Promise<XpState> {
  try { const raw = await AsyncStorage.getItem(XP_KEY); if (raw) return JSON.parse(raw); } catch {}
  return { level: 1, totalXp: 0 };
}
async function saveXpState(state: XpState): Promise<void> {
  try { await AsyncStorage.setItem(XP_KEY, JSON.stringify(state)); } catch {}
}

/* ── Streak helpers ── */
interface StreakState { count: number; lastDate: string }
async function loadStreakState(): Promise<StreakState> {
  try {
    const raw = await AsyncStorage.getItem(STREAK_KEY);
    if (raw) {
      const parsed: StreakState = JSON.parse(raw);
      const today = new Date().toDateString();
      const yd = new Date(); yd.setDate(yd.getDate() - 1);
      if (parsed.lastDate !== today && parsed.lastDate !== yd.toDateString()) return { count: 0, lastDate: '' };
      return parsed;
    }
  } catch {}
  return { count: 0, lastDate: '' };
}
async function saveStreakState(state: StreakState): Promise<void> {
  try { await AsyncStorage.setItem(STREAK_KEY, JSON.stringify(state)); } catch {}
}
async function incrementStreakOnce(): Promise<StreakState> {
  const current = await loadStreakState();
  const today = new Date().toDateString();
  if (current.lastDate === today) return current;
  const updated: StreakState = { count: current.count + 1, lastDate: today };
  await saveStreakState(updated);
  return updated;
}

/* ── SVG Icons ── */
function SunIcon({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={4} fill="#FCD34D" />
      <Path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"
        stroke="#FCD34D" strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}
function SunMidIcon({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={5} fill="#FB923C" fillOpacity={0.25} stroke="#FB923C" strokeWidth={1.5} />
      <Path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.64 5.64l2.12 2.12M16.24 16.24l2.12 2.12M5.64 18.36l2.12-2.12M16.24 7.76l2.12-2.12"
        stroke="#FB923C" strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}
function MoonStarIcon({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z"
        fill="#A78BFA" fillOpacity={0.2} stroke="#A78BFA" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
const PILLAR_ICON: Record<string, (done: boolean) => JSX.Element> = {
  product: (done) => (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <Path d="M9 2h6l1 4H8L9 2z" stroke={done ? '#fff' : '#A78BFA'} strokeWidth={1.8} strokeLinejoin="round" fill="none" />
      <Path d="M7 6h10l1 14H6L7 6z" stroke={done ? '#fff' : '#A78BFA'} strokeWidth={1.8} strokeLinejoin="round" fill="none" />
      <Path d="M10 11c0 1.1.9 2 2 2s2-.9 2-2" stroke={done ? '#fff' : '#A78BFA'} strokeWidth={1.6} strokeLinecap="round" fill="none" />
    </Svg>
  ),
  diet: (done) => (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <Path d="M12 2C8 2 5 6 5 10c0 3.5 2.5 6.5 6 7.4V20h2v-2.6c3.5-.9 6-3.9 6-7.4 0-4-3-8-7-8z" stroke={done ? '#fff' : '#4ADE80'} strokeWidth={1.8} strokeLinejoin="round" fill="none" />
      <Path d="M12 6v6" stroke={done ? '#fff' : '#4ADE80'} strokeWidth={1.6} strokeLinecap="round" />
    </Svg>
  ),
  herbal: (done) => (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <Path d="M12 22V12" stroke={done ? '#fff' : '#34D399'} strokeWidth={1.8} strokeLinecap="round" />
      <Path d="M12 12C12 12 7 10 5 5c4 0 7 3 7 7z" stroke={done ? '#fff' : '#34D399'} strokeWidth={1.6} strokeLinejoin="round" fill="none" />
      <Path d="M12 12C12 12 17 10 19 5c-4 0-7 3-7 7z" stroke={done ? '#fff' : '#34D399'} strokeWidth={1.6} strokeLinejoin="round" fill="none" />
    </Svg>
  ),
  lifestyle: (done) => (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={4} stroke={done ? '#fff' : '#FB923C'} strokeWidth={1.8} fill="none" />
      <Path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.93 4.93l2.12 2.12M16.95 16.95l2.12 2.12M4.93 19.07l2.12-2.12M16.95 7.05l2.12-2.12"
        stroke={done ? '#fff' : '#FB923C'} strokeWidth={1.6} strokeLinecap="round" />
    </Svg>
  ),
};

function SparkleIcon({ size = 20, color = '#A78BFA' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 3l1.8 5.4L19 10l-5.2 1.6L12 17l-1.8-5.4L5 10l5.2-1.6L12 3z" fill={color} />
    </Svg>
  );
}
function ClipboardIcon({ size = 48, color = 'rgba(255,255,255,0.3)' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M9 2h6a1 1 0 0 1 1 1v2H8V3a1 1 0 0 1 1-1z" stroke={color} strokeWidth={1.8} fill="none" />
      <Path d="M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" stroke={color} strokeWidth={1.8} fill="none" />
      <Path d="M9 12h6M9 16h4" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

const TIME_ICONS: Record<TimeOfDay, (p: { size?: number }) => JSX.Element> = {
  morning: (p) => <SunIcon     size={p.size} />,
  midday:  (p) => <SunMidIcon  size={p.size} />,
  evening: (p) => <MoonStarIcon size={p.size} />,
};

/* ── Step Row ── */
function StepRow({ item, done, onToggle, onInfo, last }: {
  item: RankedItem; done: boolean; onToggle: () => void; onInfo: () => void; last?: boolean;
}) {
  const xp       = PILLAR_XP[item.pillar] ?? 20;
  const duration = PILLAR_DURATION[item.pillar] ?? '5 min';

  return (
    <TouchableOpacity
      style={[sr.row, last && { borderBottomWidth: 0 }]}
      onPress={onToggle}
      activeOpacity={0.72}
    >
      {/* Checkbox */}
      <View style={[sr.checkbox, done && sr.checkboxDone]}>
        {done && (
          <Svg width={11} height={11} viewBox="0 0 12 12">
            <Path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </Svg>
        )}
      </View>

      {/* Pillar icon badge */}
      <View style={[sr.numBadge, done && sr.numBadgeDone]}>
        {PILLAR_ICON[item.pillar]?.(done)}
      </View>

      {/* Text */}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[sr.title, done && sr.titleDone]} numberOfLines={1}>{item.title}</Text>
        <Text style={sr.desc} numberOfLines={1}>{item.rationale}</Text>
      </View>

      {/* Meta */}
      <View style={sr.meta}>
        <Text style={sr.time}>⏱ {duration}</Text>
        <Text style={sr.xp}>+{xp} XP</Text>
      </View>

      {/* Info button */}
      <TouchableOpacity onPress={onInfo} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={sr.infoBtn}>
        <Text style={sr.infoText}>i</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const sr = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 13, paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  checkbox: {
    width: 24, height: 24, borderRadius: 12,
    borderWidth: 1.8, borderColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxDone: { backgroundColor: '#7C5CFC', borderColor: '#7C5CFC' },
  numBadge: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: 'rgba(124,92,252,0.22)',
    alignItems: 'center', justifyContent: 'center',
  },
  numBadgeDone: { backgroundColor: 'rgba(124,92,252,0.45)' },
  numText: { fontSize: 11, fontWeight: '800', color: '#fff' },
  title: { fontSize: 14, fontWeight: '700', color: '#fff', letterSpacing: -0.1 },
  titleDone: { textDecorationLine: 'line-through', color: 'rgba(255,255,255,0.4)' },
  desc: { fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 1 },
  meta: { alignItems: 'flex-end', gap: 2, minWidth: 58 },
  time: { fontSize: 10, color: 'rgba(255,255,255,0.35)' },
  xp:   { fontSize: 11, fontWeight: '700', color: '#34D399' },
  infoBtn: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 1.2, borderColor: 'rgba(167,139,250,0.45)',
    alignItems: 'center', justifyContent: 'center', marginLeft: 2,
  },
  infoText: { fontSize: 11, fontWeight: '700', color: 'rgba(167,139,250,0.8)', lineHeight: 14 },
});

/* ── Section Card ── */
function SectionCard({ tod, items, doneToday, onToggle, onInfo }: {
  tod: { key: TimeOfDay; label: string };
  items: RankedItem[];
  doneToday: Set<number>;
  onToggle: (item: RankedItem) => void;
  onInfo: (item: RankedItem) => void;
}) {
  if (items.length === 0) return null;
  const Icon = TIME_ICONS[tod.key];
  return (
    <View style={sc.card}>
      <View style={sc.header}>
        <View style={sc.headerLeft}>
          <Icon size={16} />
          <Text style={sc.label}>{tod.label}</Text>
        </View>
        <View style={sc.badge}>
          <Text style={sc.badgeText}>{items.length} step{items.length !== 1 ? 's' : ''}</Text>
        </View>
      </View>
      {items.map((item, idx) => (
        <StepRow
          key={item.impact_rank}
          item={item}
          done={doneToday.has(item.impact_rank)}
          onToggle={() => onToggle(item)}
          onInfo={() => onInfo(item)}
          last={idx === items.length - 1}
        />
      ))}
    </View>
  );
}

const sc = StyleSheet.create({
  card: {
    marginHorizontal: 16, marginBottom: 10,
    borderRadius: 16, borderWidth: 1,
    borderColor: 'rgba(124,92,252,0.2)',
    backgroundColor: 'rgba(14,6,32,0.9)',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.07)',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { fontSize: 11, fontWeight: '800', color: 'rgba(255,255,255,0.82)', letterSpacing: 1.5 },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20, backgroundColor: 'rgba(124,92,252,0.22)' },
  badgeText: { fontSize: 10, fontWeight: '700', color: '#A78BFA' },
});

/* ── Objective Card ── */
function ObjectiveCard({ objective, doneCount, totalCount }: {
  objective: string; doneCount: number; totalCount: number;
}) {
  const pct = totalCount > 0 ? doneCount / totalCount : 0;
  return (
    <View style={oc.card}>
      <LinearGradient
        colors={['rgba(124,92,252,0.15)', 'rgba(50,15,100,0.08)']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={oc.top}>
        <View style={oc.iconWrap}>
          <SparkleIcon size={22} color="#34D399" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={oc.eyebrow}>TODAY'S OBJECTIVE</Text>
          <Text style={oc.headline}>{objective}</Text>
        </View>
      </View>
      <View style={oc.barTrack}>
        <View style={[oc.barFill, { width: `${Math.round(pct * 100)}%` as any }]} />
      </View>
      <View style={oc.footer}>
        <Text style={oc.footerLeft}>{doneCount} of {totalCount} completed</Text>
        <Text style={oc.footerRight}>✦ Follow in this order</Text>
      </View>
    </View>
  );
}

const oc = StyleSheet.create({
  card: {
    marginHorizontal: 16, marginBottom: 10,
    borderRadius: 16, borderWidth: 1,
    borderColor: 'rgba(124,92,252,0.28)',
    padding: 16, overflow: 'hidden',
  },
  top: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, marginBottom: 14 },
  iconWrap: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(52,211,153,0.1)',
    borderWidth: 1, borderColor: 'rgba(52,211,153,0.28)',
    alignItems: 'center', justifyContent: 'center',
  },
  eyebrow: { fontSize: 10, fontWeight: '700', color: '#A78BFA', letterSpacing: 1.2, marginBottom: 4 },
  headline: { fontSize: 15, fontWeight: '700', color: '#fff', lineHeight: 21, letterSpacing: -0.2 },
  barTrack: { height: 4, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 2, marginBottom: 10, overflow: 'hidden' },
  barFill:  { height: '100%', backgroundColor: '#7C5CFC', borderRadius: 2 },
  footer: { flexDirection: 'row', justifyContent: 'space-between' },
  footerLeft:  { fontSize: 11, color: 'rgba(255,255,255,0.5)' },
  footerRight: { fontSize: 11, fontWeight: '600', color: '#A78BFA' },
});

/* ── Circular Progress ── */
function CircleProgress({ pct, size = 44 }: { pct: number; size?: number }) {
  const stroke = 3.5;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dash = pct * circ;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.1)" strokeWidth={stroke} fill="none" />
        <Circle cx={size / 2} cy={size / 2} r={r} stroke="#7C5CFC" strokeWidth={stroke} fill="none"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          rotation="-90" origin={`${size / 2},${size / 2}`} />
      </Svg>
      <Text style={{ fontSize: 9, fontWeight: '800', color: '#fff' }}>{Math.round(pct * 100)}%</Text>
    </View>
  );
}

/* ── Main Screen ── */
export default function PlanScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { animatedStyle } = useTabTransition();
  const { t } = useTranslation();

  const [plan,       setPlan]       = useState<PersonalizedPlan | null>(null);
  const [acneType,   setAcneType]   = useState<AcneType | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [generating, setGenerating] = useState(false);

  const [doneToday,    setDoneToday]    = useState<Set<number>>(new Set());
  const [xpState,      setXpState]      = useState<XpState>({ level: 1, totalXp: 0 });
  const [streak,       setStreak]       = useState<StreakState>({ count: 0, lastDate: '' });
  const [allDone,      setAllDone]      = useState(false);
  const [selectedPick, setSelectedPick] = useState<RankedItem | null>(null);
  const allDoneRef = useRef(false);

  const streakScaleAnim = useRef(new Animated.Value(1)).current;
  const xpBarAnim       = useRef(new Animated.Value(0)).current;

  /* ── Confetti ── */
  const CONFETTI_COUNT  = 30;
  const CONFETTI_COLORS = ['#C8573E', '#2D4A3E', '#C8A050', '#4CAF87', '#7CB9E8', '#E8547A'];
  const confettiAnims = useRef(
    Array.from({ length: CONFETTI_COUNT }, () => ({
      anim:     new Animated.Value(0),
      x:        Math.random() * Dimensions.get('window').width,
      drift:    (Math.random() - 0.5) * 200,
      size:     6 + Math.random() * 6,
      color:    CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      rotation: Math.random() * 360,
    }))
  ).current;
  const [showConfetti, setShowConfetti] = useState(false);

  const triggerConfetti = () => {
    confettiAnims.forEach(c => {
      c.x     = Math.random() * Dimensions.get('window').width;
      c.drift = (Math.random() - 0.5) * 200;
      c.color = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
      c.anim.setValue(0);
    });
    setShowConfetti(true);
    Animated.stagger(20,
      confettiAnims.map(c =>
        Animated.timing(c.anim, { toValue: 1, duration: 1200 + Math.random() * 600, useNativeDriver: true })
      )
    ).start(() => setShowConfetti(false));
  };

  useEffect(() => {
    Animated.timing(xpBarAnim, {
      toValue: (xpState.totalXp % XP_PER_LEVEL) / XP_PER_LEVEL,
      duration: 600, useNativeDriver: false,
    }).start();
  }, [xpState.totalXp]);

  /* ── Data loading ── */
  const fetchPlan = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const [planRes, skinRes] = await Promise.all([
      supabase.from('personalized_plans').select('*').eq('user_id', user.id)
        .eq('is_active', true).order('created_at', { ascending: false }).limit(1).single(),
      supabase.from('skin_profiles').select('acne_type').eq('user_id', user.id)
        .order('created_at', { ascending: false }).limit(1).single(),
    ]);
    setPlan(planRes.data ?? null);
    if (skinRes.data) setAcneType(skinRes.data.acne_type as AcneType);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchPlan();
      Promise.all([loadMissionsState(), loadXpState(), loadStreakState()])
        .then(([missions, xp, str]) => {
          setDoneToday(missions.doneRanks);
          setXpState(xp);
          setStreak(str);
        });
    }, [fetchPlan])
  );

  /* ── Generate ── */
  const generatePlan = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: skinProfile } = await supabase.from('skin_profiles').select('id')
      .eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).single();
    if (!skinProfile) {
      Alert.alert(t('plan.scanRequired'), t('plan.completeScanFirst'), [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Scan Now', onPress: () => router.push('/(tabs)/scan') },
      ]);
      return;
    }
    setGenerating(true);
    setPlan(null);
    setDoneToday(new Set());
    try {
      const { error } = await supabase.functions.invoke('generate-plan', { body: { skin_profile_id: skinProfile.id } });
      if (error) throw error;
      await fetchPlan();
    } catch (err) {
      console.error('generate-plan error:', err);
      Alert.alert('Error', 'Could not generate your plan. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  /* ── Toggle step ── */
  const toggleMission = async (item: RankedItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const wasDone = doneToday.has(item.impact_rank);
    const xpDelta = PILLAR_XP[item.pillar] ?? 20;

    const nextDone = new Set(doneToday);
    if (wasDone) nextDone.delete(item.impact_rank); else nextDone.add(item.impact_rank);
    setDoneToday(nextDone);
    saveMissionsState(nextDone);

    const newTotalXp = Math.max(0, xpState.totalXp + (wasDone ? -xpDelta : xpDelta));
    const oldLevel   = Math.floor(xpState.totalXp / XP_PER_LEVEL) + 1;
    const newLevel   = Math.floor(newTotalXp / XP_PER_LEVEL) + 1;
    const nextXp: XpState = { level: newLevel, totalXp: newTotalXp };
    setXpState(nextXp);
    saveXpState(nextXp);

    if (newLevel > oldLevel && !wasDone) {
      Animated.sequence([
        Animated.timing(xpBarAnim, { toValue: 1, duration: 400, useNativeDriver: false }),
        Animated.delay(300),
        Animated.timing(xpBarAnim, { toValue: 0, duration: 200, useNativeDriver: false }),
      ]).start();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    const nowAllDone = rankedItems.length > 0 && rankedItems.every(i => nextDone.has(i.impact_rank));
    if (nowAllDone && !wasDone && !allDoneRef.current) {
      incrementStreakOnce().then(s => setStreak(s));
      Animated.sequence([
        Animated.spring(streakScaleAnim, { toValue: 1.2, useNativeDriver: true, speed: 50, bounciness: 6 }),
        Animated.spring(streakScaleAnim, { toValue: 1,   useNativeDriver: true, speed: 30, bounciness: 4 }),
      ]).start();
      allDoneRef.current = true;
      setAllDone(true);
      triggerConfetti();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else if (!nowAllDone) {
      allDoneRef.current = false;
      setAllDone(false);
    }
  };

  /* ── Derived ── */
  const rankedItems: RankedItem[] = (plan?.ranked_items as unknown as RankedItem[]) ?? [];
  const sortedItems = [...rankedItems].sort((a, b) => a.impact_rank - b.impact_rank);
  const totalItems  = rankedItems.length;
  const doneCount   = rankedItems.filter(i => doneToday.has(i.impact_rank)).length;
  const xpToday     = rankedItems.filter(i => doneToday.has(i.impact_rank)).reduce((s, i) => s + (PILLAR_XP[i.pillar] ?? 20), 0);
  const xpInLevel   = xpState.totalXp % XP_PER_LEVEL;
  const progress    = totalItems > 0 ? doneCount / totalItems : 0;
  const objective   = acneType ? (OBJECTIVE_HEADLINE[acneType] ?? DEFAULT_OBJECTIVE) : DEFAULT_OBJECTIVE;

  const sectionItems = (tod: TimeOfDay) =>
    sortedItems.filter(i => (i.time_of_day ?? PILLAR_TIME[i.pillar]) === tod);

  /* ── Loading ── */
  if (loading) {
    return (
      <Animated.View style={[s.container, { paddingTop: insets.top }, animatedStyle]}>
        <ScreenBackground preset="plan" />
        <PlanSkeleton />
      </Animated.View>
    );
  }

  /* ── Empty ── */
  if (!plan || rankedItems.length === 0) {
    return (
      <Animated.View style={[s.container, s.centered, { paddingTop: insets.top }, animatedStyle]}>
        <ScreenBackground preset="plan" />
        <ClipboardIcon size={52} />
        <Text style={s.emptyTitle}>{plan ? 'Plan needs refresh' : t('plan.emptyTitle')}</Text>
        <Text style={s.emptySubtitle}>
          {plan ? t('plan.emptySubtitle') : 'Complete a skin scan, then generate your plan'}
        </Text>
        <TouchableOpacity
          style={[s.generateBtn, generating && { opacity: 0.65 }]}
          onPress={generatePlan}
          disabled={generating}
        >
          <LinearGradient colors={[Colors.secondary, Colors.primary]} style={s.generateGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            <Text style={s.generateBtnText}>
              {generating ? t('plan.generating') : plan ? t('plan.refreshPlan') : t('plan.generatePlan')}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  /* ── Main UI ── */
  return (
    <Animated.View style={[s.container, { paddingTop: insets.top }, animatedStyle]}>
      <ScreenBackground preset="plan" />

      {/* ── Header ── */}
      <View style={s.header}>
        <View style={s.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.eyebrow}>YOUR PLAN</Text>
            <Text style={s.title}>Today's Plan</Text>
            <Text style={s.subtitle}>A simple routine to keep your skin clear and balanced.</Text>
          </View>
          <Animated.View style={{ transform: [{ scale: streakScaleAnim }] }}>
            <LinearGradient
              colors={['#6E46FF', '#8B5CFF']}
              style={s.streakPill}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            >
              <Text style={s.streakNumber}>{streak.count}</Text>
              <Text style={s.streakLabel}>DAY STREAK</Text>
            </LinearGradient>
          </Animated.View>
        </View>
      </View>

      {/* ── Scroll body ── */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <ObjectiveCard objective={objective} doneCount={doneCount} totalCount={totalItems} />

        {TIME_SECTIONS.map(tod => (
          <SectionCard
            key={tod.key}
            tod={tod}
            items={sectionItems(tod.key)}
            doneToday={doneToday}
            onToggle={toggleMission}
            onInfo={setSelectedPick}
          />
        ))}

        {/* Regenerate */}
        <TouchableOpacity style={s.regenRow} onPress={generatePlan} disabled={generating}>
          <Text style={s.regenText}>{generating ? t('plan.generating') : t('plan.regenerate')}</Text>
        </TouchableOpacity>

        <View style={{ height: 110 }} />
      </ScrollView>

      {/* ── Sticky bottom bar ── */}
      <View style={[s.bottomBar, { paddingBottom: 18 }]}>
        <LinearGradient
          colors={['rgba(4,1,12,0)', 'rgba(4,1,12,0.96)']}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        <View style={s.bottomInner}>
          <CircleProgress pct={progress} size={44} />
          <View style={{ flex: 1 }}>
            <Text style={s.bottomCount}>{doneCount} of {totalItems} complete today</Text>
            <Text style={s.bottomSub}>Keep going—consistency is your glow.</Text>
          </View>
        </View>
      </View>

      {/* ── Pick detail modal ── */}
      <PickDetailModal
        visible={!!selectedPick}
        pick={selectedPick}
        onClose={() => setSelectedPick(null)}
        onToggleRoutine={() => {}}
        isInRoutine={false}
      />

      {/* ── Confetti ── */}
      {showConfetti && (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          {confettiAnims.map((c, i) => (
            <Animated.View key={i} style={{
              position: 'absolute', left: c.x, top: -20,
              width: c.size, height: c.size * 0.6,
              backgroundColor: c.color, borderRadius: 2,
              transform: [
                { translateY: c.anim.interpolate({ inputRange: [0, 1], outputRange: [0, Dimensions.get('window').height + 50] }) },
                { translateX: c.anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, c.drift, c.drift * 1.2] }) },
                { rotate: c.anim.interpolate({ inputRange: [0, 1], outputRange: [`${c.rotation}deg`, `${c.rotation + 720}deg`] }) },
              ],
              opacity: c.anim.interpolate({ inputRange: [0, 0.8, 1], outputRange: [1, 1, 0] }),
            }} />
          ))}
        </View>
      )}
    </Animated.View>
  );
}

/* ── Styles ── */
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered:  { justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32, gap: 12, paddingBottom: 80 },

  header:    { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 14 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  eyebrow:   { fontSize: 10, fontWeight: '700', color: 'rgba(167,139,250,0.8)', letterSpacing: 1.6, textTransform: 'uppercase', marginBottom: 2 },
  title:     { fontSize: 28, fontWeight: '900', color: '#fff', letterSpacing: -0.6, lineHeight: 32 },
  subtitle:  { fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 4, lineHeight: 17 },

  streakPill:   { borderRadius: 14, paddingVertical: 10, paddingHorizontal: 14, alignItems: 'center', minWidth: 68 },
  streakNumber: { fontSize: 24, fontWeight: '900', color: '#fff', lineHeight: 26 },
  streakLabel:  { fontSize: 8, fontWeight: '700', color: 'rgba(255,255,255,0.8)', letterSpacing: 1.2, marginTop: 1 },

  scrollContent: { paddingTop: 4 },

  regenRow: { alignItems: 'center', paddingVertical: 20 },
  regenText: { fontSize: 12, color: 'rgba(255,255,255,0.3)', fontWeight: '500' },

  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingTop: 120,
  },
  bottomInner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: 16,
    marginTop: 32,
  },
  bottomCount: { fontSize: 13, fontWeight: '700', color: '#fff' },
  bottomSub:   { fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 1 },
  ctaBtn:      { borderRadius: 14, overflow: 'hidden' },
  ctaGradient: { paddingVertical: 14, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center' },
  ctaText:     { fontSize: 14, fontWeight: '800', color: '#fff', letterSpacing: 0.1 },

  emptyTitle:       { fontSize: 20, fontWeight: '800', color: Colors.text, textAlign: 'center' },
  emptySubtitle:    { fontSize: 14, color: Colors.textMuted, textAlign: 'center', lineHeight: 22 },
  generateBtn:      { width: '100%', borderRadius: BorderRadius.md, overflow: 'hidden', marginTop: 8 },
  generateGradient: { height: 54, justifyContent: 'center', alignItems: 'center' },
  generateBtnText:  { fontSize: 16, fontWeight: '700', color: Colors.white },
});
