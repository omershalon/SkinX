import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useRouter, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Circle, Path, Rect, Line } from 'react-native-svg';
import { supabase } from '@/lib/supabase';
import { useTabTransition } from '@/hooks/useTabTransition';
import { Colors, Typography, BorderRadius, Spacing, Shadows } from '@/lib/theme';
import ScreenBackground from '@/components/ScreenBackground';
import { PlanSkeleton } from '@/components/SkeletonLoader';
import type { Database, RankedItem, AcneType } from '@/lib/database.types';
import PickDetailModal from '@/components/PickDetailModal';
import { useTranslation } from 'react-i18next';

type PersonalizedPlan = Database['public']['Tables']['personalized_plans']['Row'];

type IconComponent = (props: { size?: number; color?: string }) => JSX.Element;

/* ── SVG Icon Components ── */
function BottleIcon({ size = 16, color = Colors.text }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={9} y={2} width={6} height={3} rx={1} stroke={color} strokeWidth={2} fill="none" />
      <Path d="M8 7h8l1 4v9a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2v-9l1-4z" stroke={color} strokeWidth={2} fill="none" />
      <Line x1={8} y1={14} x2={16} y2={14} stroke={color} strokeWidth={1.5} />
    </Svg>
  );
}

function SaladIcon({ size = 16, color = Colors.text }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={9} stroke={color} strokeWidth={2} fill="none" />
      <Path d="M12 7c-1 0-2.5 1.5-2.5 3.5S11 14 12 14s2.5-1.5 2.5-3.5S13 7 12 7z" stroke={color} strokeWidth={1.5} fill="none" />
      <Line x1={12} y1={7} x2={12} y2={14} stroke={color} strokeWidth={1.5} />
    </Svg>
  );
}

function LeafIcon({ size = 16, color = Colors.text }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M6 21c0 0 1-8 6-13s11-5 11-5-1 8-6 13-11 5-11 5z" stroke={color} strokeWidth={2} fill="none" strokeLinejoin="round" />
      <Path d="M6 21c3-3 6-7 11-11" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  );
}

function MoonIcon({ size = 16, color = Colors.text }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z" stroke={color} strokeWidth={2} fill="none" strokeLinejoin="round" />
    </Svg>
  );
}

function ClipboardIcon({ size = 16, color = Colors.text }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={5} y={4} width={14} height={17} rx={2} stroke={color} strokeWidth={2} fill="none" />
      <Rect x={9} y={2} width={6} height={4} rx={1} stroke={color} strokeWidth={1.5} fill="none" />
      <Line x1={9} y1={10} x2={15} y2={10} stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      <Line x1={9} y1={14} x2={15} y2={14} stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  );
}

function StarIcon({ size = 16, color = Colors.text }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14l-5-4.87 6.91-1.01L12 2z" stroke={color} strokeWidth={2} fill="none" strokeLinejoin="round" />
    </Svg>
  );
}


const PILLAR_ICONS: Record<string, IconComponent> = {
  product:   BottleIcon,
  diet:      SaladIcon,
  herbal:    LeafIcon,
  lifestyle: MoonIcon,
};

const PILLAR_LABELS: Record<string, string> = {
  product:   'SKINCARE',
  diet:      'DIET',
  herbal:    'HERBAL',
  lifestyle: 'LIFESTYLE',
};

const PILLAR_ORDER = ['product', 'diet', 'herbal', 'lifestyle'];

const ACNE_LABELS: Record<AcneType, string> = {
  hormonal:     'HORMONAL',
  cystic:       'CYSTIC',
  comedonal:    'COMEDONAL',
  fungal:       'FUNGAL',
  inflammatory: 'INFLAMMATORY',
};

/* ── Storage keys ── */
const MISSIONS_KEY   = 'missions_v1';      // { date, doneRanks: number[] }
const XP_KEY         = 'xp_v1';           // { level: number, totalXp: number }
const STREAK_KEY     = 'streak_v1';       // { count: number, lastDate: string }

/* ── XP per pillar ── */
const PILLAR_XP: Record<string, number> = {
  lifestyle: 60,
  herbal:    50,
  product:   40,  // 'product' pillar = Skincare
  diet:      30,
};
const XP_PER_LEVEL = 500;

/* ── Pillar filter tabs ── */
const FILTER_TABS = [
  { key: 'all',       label: 'ALL' },
  { key: 'product',   label: 'SKIN' },
  { key: 'diet',      label: 'DIET' },
  { key: 'herbal',    label: 'HERBAL' },
  { key: 'lifestyle', label: 'LIFE' },
] as const;
type FilterKey = typeof FILTER_TABS[number]['key'];

/* ── Missions helpers ── */
async function loadMissionsState(): Promise<{ doneRanks: Set<number> }> {
  try {
    const raw = await AsyncStorage.getItem(MISSIONS_KEY);
    if (raw) {
      const { date, doneRanks } = JSON.parse(raw);
      if (date === new Date().toDateString()) {
        return { doneRanks: new Set(doneRanks as number[]) };
      }
    }
  } catch {}
  return { doneRanks: new Set() };
}

async function saveMissionsState(doneRanks: Set<number>): Promise<void> {
  try {
    await AsyncStorage.setItem(MISSIONS_KEY, JSON.stringify({
      date:      new Date().toDateString(),
      doneRanks: Array.from(doneRanks),
    }));
  } catch {}
}

/* ── XP helpers ── */
interface XpState { level: number; totalXp: number; }

async function loadXpState(): Promise<XpState> {
  try {
    const raw = await AsyncStorage.getItem(XP_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { level: 1, totalXp: 0 };
}

async function saveXpState(state: XpState): Promise<void> {
  try {
    await AsyncStorage.setItem(XP_KEY, JSON.stringify(state));
  } catch {}
}

/* ── Streak helpers ── */
interface StreakState { count: number; lastDate: string }

async function loadStreakState(): Promise<StreakState> {
  try {
    const raw = await AsyncStorage.getItem(STREAK_KEY);
    if (raw) {
      const parsed: StreakState = JSON.parse(raw);
      const today     = new Date().toDateString();
      const yd = new Date();
      yd.setDate(yd.getDate() - 1);
      const yesterday = yd.toDateString();
      // Break streak if last completed date is older than yesterday
      if (parsed.lastDate !== today && parsed.lastDate !== yesterday) {
        return { count: 0, lastDate: '' };
      }
      return parsed;
    }
  } catch {}
  return { count: 0, lastDate: '' };
}

async function saveStreakState(state: StreakState): Promise<void> {
  try {
    await AsyncStorage.setItem(STREAK_KEY, JSON.stringify(state));
  } catch {}
}

/* ── Progress Ring ── */
function ProgressRing({ progress, size = 56, strokeWidth = 4 }: { progress: number; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke={Colors.borderLight} strokeWidth={strokeWidth} fill="none" />
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke={Colors.primary} strokeWidth={strokeWidth} fill="none"
          strokeDasharray={`${circumference}`} strokeDashoffset={strokeDashoffset}
          strokeLinecap="round" rotation="-90" origin={`${size / 2}, ${size / 2}`} />
      </Svg>
      <Text style={styles.progressPercent}>{Math.round(progress * 100)}%</Text>
    </View>
  );
}

/* ── MissionCard Component ── */
interface MissionCardProps {
  item:      RankedItem;
  done:      boolean;
  onToggle:  () => void;
  onPress:   () => void;
}

function MissionCard({ item, done, onToggle, onPress }: MissionCardProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const xp        = PILLAR_XP[item.pillar] ?? 40;
  const Icon      = PILLAR_ICONS[item.pillar];

  const handlePressIn  = () => Animated.spring(scaleAnim, { toValue: 0.95, useNativeDriver: true, speed: 50, bounciness: 0 }).start();
  const handlePressOut = () => Animated.spring(scaleAnim, { toValue: 1,    useNativeDriver: true, speed: 30, bounciness: 5 }).start();

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        onPress={onToggle}
        onLongPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
        style={[cardStyles.card, done && cardStyles.cardDone]}
      >
        {/* Icon block */}
        <View style={[cardStyles.iconWrap, done && cardStyles.iconWrapDone]}>
          {Icon
            ? <Icon size={18} color={done ? Colors.primaryLight : Colors.textMuted} />
            : <View style={{ width: 18, height: 18, backgroundColor: Colors.border, borderRadius: 4 }} />
          }
        </View>

        {/* Pillar label */}
        <Text style={cardStyles.pillarLabel}>
          {PILLAR_LABELS[item.pillar] ?? item.pillar.toUpperCase()}
        </Text>

        {/* Title */}
        <Text
          style={[cardStyles.title, done && cardStyles.titleDone]}
          numberOfLines={2}
        >
          {item.title}
        </Text>

        {/* XP */}
        <Text style={[cardStyles.xp, done && cardStyles.xpDone]}>
          +{xp} XP
        </Text>

        {/* Checkmark badge */}
        {done && (
          <View style={cardStyles.checkBadge}>
            <Svg width={12} height={12} viewBox="0 0 12 12">
              <Path
                d="M2 6l3 3 5-5"
                stroke="#FFFFFF"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </Svg>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderWidth:     1,
    borderColor:     Colors.border,
    borderRadius:    16,
    padding:         12,
    gap:             4,
  },
  cardDone: {
    backgroundColor: 'rgba(124,92,252,0.12)',
    borderColor:     'rgba(124,92,252,0.45)',
  },
  iconWrap: {
    width:           32,
    height:          32,
    borderRadius:    10,
    backgroundColor: 'rgba(255,255,255,0.07)',
    alignItems:      'center',
    justifyContent:  'center',
    marginBottom:    4,
  },
  iconWrapDone: {
    backgroundColor: 'rgba(124,92,252,0.25)',
  },
  pillarLabel: {
    fontSize:        8,
    fontWeight:      '700',
    color:           Colors.textMuted,
    letterSpacing:   0.8,
    textTransform:   'uppercase',
  },
  title: {
    fontSize:   11,
    fontWeight: '600',
    color:      Colors.text,
    lineHeight: 15,
  },
  titleDone: {
    textDecorationLine: 'line-through',
    color:              Colors.textMuted,
  },
  xp: {
    fontSize:   9,
    fontWeight: '600',
    color:      Colors.textMuted,
    marginTop:  2,
  },
  xpDone: {
    color: Colors.primaryLight,
  },
  checkBadge: {
    position:        'absolute',
    top:             10,
    right:           10,
    width:           20,
    height:          20,
    borderRadius:    10,
    backgroundColor: Colors.primary,
    alignItems:      'center',
    justifyContent:  'center',
  },
});

export default function PlanScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { animatedStyle } = useTabTransition();
  const { t } = useTranslation();

  const [plan,         setPlan]         = useState<PersonalizedPlan | null>(null);
  const [acneType,     setAcneType]     = useState<AcneType | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [generating,   setGenerating]   = useState(false);
  const [selectedPick, setSelectedPick] = useState<RankedItem | null>(null);

  const [doneToday,    setDoneToday]    = useState<Set<number>>(new Set());
  const [xpState,      setXpState]      = useState<XpState>({ level: 1, totalXp: 0 });
  const [streak,       setStreak]       = useState<StreakState>({ count: 0, lastDate: '' });
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');
  const [allDone,      setAllDone]      = useState(false);

  const cardScaleAnims = useRef<Record<number, Animated.Value>>({}).current;
  const shimmerAnim    = useRef(new Animated.Value(0)).current;
  const shimmerRanRef  = useRef(false);
  const xpBarAnim       = useRef(new Animated.Value(0)).current;
  const streakScaleAnim = useRef(new Animated.Value(1)).current;

  /* ── confetti ── */
  const CONFETTI_COUNT  = 30;
  const CONFETTI_COLORS = ['#C8573E', '#2D4A3E', '#C8A050', '#4CAF87', '#7CB9E8', '#E8547A'];
  const confettiAnims   = useRef(
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

  // Sync xpBarAnim when xpState changes
  useEffect(() => {
    Animated.timing(xpBarAnim, {
      toValue:         (xpState.totalXp % XP_PER_LEVEL) / XP_PER_LEVEL,
      duration:        600,
      useNativeDriver: false, // width animation requires false
    }).start();
  }, [xpState.totalXp]);

  /* ── data loading ── */
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

  // Refresh plan + gamification state every time this tab comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchPlan();
      Promise.all([
        loadMissionsState(),
        loadXpState(),
        loadStreakState(),
      ]).then(([missions, xp, str]) => {
        setDoneToday(missions.doneRanks);
        setXpState(xp);
        setStreak(str);
      });
    }, [fetchPlan])
  );

  /* ── shimmer on load ── */
  useEffect(() => {
    if (loading || shimmerRanRef.current) return;
    shimmerRanRef.current = true;
    Animated.timing(shimmerAnim, { toValue: 1, duration: 900, useNativeDriver: true }).start();
  }, [loading]);

  /* ── toggle done today ── */
  const toggleDone = (rank: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const wasDone = doneToday.has(rank);
    setDoneToday(prev => {
      const s = new Set(prev);
      if (s.has(rank)) s.delete(rank); else s.add(rank);
      saveMissionsState(s);
      return s;
    });
    if (!wasDone) triggerConfetti();
  };

  /* ── generate ── */
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
      const { error } = await supabase.functions.invoke('generate-plan', {
        body: { skin_profile_id: skinProfile.id },
      });
      if (error) throw error;
      await fetchPlan();
    } catch (err) {
      console.error('generate-plan error:', err);
      Alert.alert('Error', 'Could not generate your plan. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  /* ── toggle mission done ── */
  const toggleMission = async (item: RankedItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const wasDone  = doneToday.has(item.impact_rank);
    const xpDelta  = PILLAR_XP[item.pillar] ?? 40;

    // Update done set
    const nextDone = new Set(doneToday);
    if (wasDone) nextDone.delete(item.impact_rank); else nextDone.add(item.impact_rank);
    setDoneToday(nextDone);
    saveMissionsState(nextDone);

    // Update XP
    const newTotalXp = Math.max(0, xpState.totalXp + (wasDone ? -xpDelta : xpDelta));
    const oldLevel   = Math.floor(xpState.totalXp / XP_PER_LEVEL) + 1;
    const newLevel   = Math.floor(newTotalXp      / XP_PER_LEVEL) + 1;
    const didLevelUp = newLevel > oldLevel && !wasDone;
    const nextXp: XpState = { level: newLevel, totalXp: newTotalXp };
    setXpState(nextXp);
    saveXpState(nextXp);

    if (didLevelUp) {
      // Fill bar to 100%, pause, then reset to 0
      Animated.sequence([
        Animated.timing(xpBarAnim, { toValue: 1, duration: 400, useNativeDriver: false }),
        Animated.delay(300),
        Animated.timing(xpBarAnim, { toValue: 0, duration: 200, useNativeDriver: false }),
      ]).start();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    // Check all-done
    const nowAllDone = rankedItems.length > 0 &&
      rankedItems.every(i => nextDone.has(i.impact_rank));

    if (nowAllDone && !wasDone && !allDone) {
      // Update streak
      const today = new Date().toDateString();
      const newStreak: StreakState = { count: streak.count + 1, lastDate: today };
      setStreak(newStreak);
      saveStreakState(newStreak);

      // Pulse streak pill
      Animated.sequence([
        Animated.spring(streakScaleAnim, { toValue: 1.2, useNativeDriver: true, speed: 50, bounciness: 6 }),
        Animated.spring(streakScaleAnim, { toValue: 1,   useNativeDriver: true, speed: 30, bounciness: 4 }),
      ]).start();

      setAllDone(true);
      triggerConfetti();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else if (!nowAllDone) {
      setAllDone(false);
    }
  };

  /* ── derived data ── */
  const rankedItems: RankedItem[] = (plan?.ranked_items as unknown as RankedItem[]) ?? [];

  // Sort by impact_rank ascending (rank 1 = highest impact, shown first)
  const sortedItems = [...rankedItems].sort((a, b) => a.impact_rank - b.impact_rank);

  const filteredItems = activeFilter === 'all'
    ? sortedItems
    : sortedItems.filter(item => item.pillar === activeFilter);

  const totalItems   = rankedItems.length;
  const doneCount    = rankedItems.filter(i => doneToday.has(i.impact_rank)).length;
  const xpToday      = rankedItems
    .filter(i => doneToday.has(i.impact_rank))
    .reduce((sum, i) => sum + (PILLAR_XP[i.pillar] ?? 40), 0);
  const xpInLevel    = xpState.totalXp % XP_PER_LEVEL;
  const xpProgress   = xpInLevel / XP_PER_LEVEL; // 0–1

  /* ── loading ── */
  if (loading) {
    return (
      <Animated.View style={[styles.container, { paddingTop: insets.top }, animatedStyle]}>
        <ScreenBackground preset="plan" />
        <PlanSkeleton />
      </Animated.View>
    );
  }

  /* ── empty / no plan ── */
  if (!plan || rankedItems.length === 0) {
    return (
      <Animated.View style={[styles.container, styles.centered, { paddingTop: insets.top }, animatedStyle]}>
        <ScreenBackground preset="plan" />
        <View style={styles.emptyIconWrap}>
          <ClipboardIcon size={52} color={Colors.textMuted} />
        </View>
        <Text style={styles.emptyTitle}>
          {plan ? 'Plan needs refresh' : t('plan.emptyTitle')}
        </Text>
        <Text style={styles.emptySubtitle}>
          {plan ? t('plan.emptySubtitle') : 'Complete a skin scan, then generate your plan'}
        </Text>
        <TouchableOpacity
          style={[styles.generateBtn, generating && { opacity: 0.65 }]}
          onPress={generatePlan}
          disabled={generating}
        >
          <LinearGradient colors={[Colors.secondary, Colors.primary]} style={styles.generateGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            <Text style={styles.generateBtnText}>
              {generating ? t('plan.generating') : plan ? t('plan.refreshPlan') : t('plan.generatePlan')}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  /* ── main UI ── */
  return (
    <Animated.View style={[styles.container, { paddingTop: insets.top }, animatedStyle]}>
      <ScreenBackground preset="plan" />

      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.eyebrow}>YOUR PLAN</Text>
            <Text style={styles.title}>Daily Missions</Text>
          </View>

          {/* Streak pill */}
          <Animated.View style={{ transform: [{ scale: streakScaleAnim }] }}>
            <LinearGradient
              colors={[Colors.primary, Colors.primaryLight]}
              style={styles.streakPill}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.streakNumber}>{streak.count}</Text>
              <Text style={styles.streakLabel}>DAY STREAK</Text>
            </LinearGradient>
          </Animated.View>
        </View>

        {/* XP bar */}
        <View style={styles.xpRow}>
          <Text style={styles.levelLabel}>LV {xpState.level}</Text>
          <View style={styles.xpBarTrack}>
            <Animated.View
              style={[
                styles.xpBarFill,
                {
                  width: xpBarAnim.interpolate({
                    inputRange:  [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]}
            />
          </View>
          <Text style={styles.xpText}>
            {xpToday} / {XP_PER_LEVEL} XP
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Pillar filter tabs ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsContent}
          style={styles.tabs}
        >
          {FILTER_TABS.map(tab => (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setActiveFilter(tab.key)}
              style={[styles.tab, activeFilter === tab.key && styles.tabActive]}
              activeOpacity={0.75}
            >
              <Text style={[styles.tabLabel, activeFilter === tab.key && styles.tabLabelActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ── All-done banner ── */}
        {allDone && (
          <View style={styles.allDoneBanner}>
            <Text style={styles.allDoneTitle}>All missions complete</Text>
            <Text style={styles.allDoneSub}>
              You earned {xpToday} XP today. Come back tomorrow to keep your streak.
            </Text>
          </View>
        )}

        {/* ── Mission grid ── */}
        <View style={styles.grid}>
          {filteredItems.map(item => (
            <View key={item.impact_rank} style={styles.gridCell}>
              <MissionCard
                item={item}
                done={doneToday.has(item.impact_rank)}
                onToggle={() => toggleMission(item)}
                onPress={() => setSelectedPick(item)}
              />
            </View>
          ))}
        </View>

        {/* ── Footer summary ── */}
        <Text style={styles.footerText}>
          {doneCount} of {totalItems} complete · {xpToday} XP earned today
        </Text>

        {/* ── Regenerate ── */}
        <TouchableOpacity style={styles.regenRow} onPress={generatePlan} disabled={generating}>
          <Text style={styles.regenText}>
            {generating ? t('plan.generating') : t('plan.regenerate')}
          </Text>
        </TouchableOpacity>
      </ScrollView>

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

      {/* ── Pick detail modal ── */}
      <PickDetailModal
        visible={!!selectedPick}
        pick={selectedPick}
        onClose={() => setSelectedPick(null)}
        onToggleRoutine={() => {}}
        isInRoutine={false}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: Colors.background },
  centered:     { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: Spacing.xxl, gap: Spacing.lg, paddingBottom: 80 },

  // Header
  header:       { paddingHorizontal: Spacing.xl, paddingTop: Spacing.lg, paddingBottom: Spacing.md, gap: 12 },
  headerRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  eyebrow:      { fontSize: 10, fontWeight: '600', color: Colors.textMuted, letterSpacing: 1.5, textTransform: 'uppercase' },
  title:        { fontSize: 26, fontWeight: '800', color: Colors.text, letterSpacing: -0.5, marginTop: 2 },

  // Streak pill
  streakPill:   { borderRadius: 14, paddingVertical: 8, paddingHorizontal: 14, alignItems: 'center', minWidth: 64 },
  streakNumber: { fontSize: 22, fontWeight: '900', color: Colors.white, lineHeight: 24 },
  streakLabel:  { fontSize: 8, fontWeight: '700', color: 'rgba(255,255,255,0.85)', letterSpacing: 1.2, marginTop: 1 },

  // XP bar
  xpRow:        { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: Colors.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  levelLabel:   { fontSize: 10, fontWeight: '900', color: Colors.primaryLight, letterSpacing: 0.8, minWidth: 28 },
  xpBarTrack:   { flex: 1, height: 5, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 4, overflow: 'hidden' },
  xpBarFill:    { height: '100%', backgroundColor: Colors.primary, borderRadius: 4 },
  xpText:       { fontSize: 10, color: Colors.textMuted, minWidth: 70, textAlign: 'right' },

  // Tabs
  tabs:         { marginBottom: 12 },
  tabsContent:  { paddingHorizontal: Spacing.xl, gap: 6, flexDirection: 'row' },
  tab:          { borderRadius: 20, paddingVertical: 5, paddingHorizontal: 12, backgroundColor: 'rgba(255,255,255,0.06)' },
  tabActive:    { backgroundColor: Colors.primary },
  tabLabel:     { fontSize: 9, fontWeight: '700', color: Colors.textMuted, letterSpacing: 0.8 },
  tabLabelActive: { color: Colors.white },

  // All-done banner
  allDoneBanner: { marginHorizontal: Spacing.xl, marginBottom: 12, backgroundColor: 'rgba(124,92,252,0.14)', borderWidth: 1.5, borderColor: 'rgba(124,92,252,0.4)', borderRadius: 16, padding: 16, gap: 4 },
  allDoneTitle:  { fontSize: 15, fontWeight: '800', color: Colors.white },
  allDoneSub:    { fontSize: 11, color: Colors.textSecondary, lineHeight: 16 },

  // Grid
  scroll:        { flex: 1 },
  scrollContent: { paddingBottom: 100 },
  grid:          { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: Spacing.xl, gap: 8, marginBottom: 12 },
  gridCell:      { width: '48.5%' },

  // Footer
  footerText:   { textAlign: 'center', fontSize: 10, color: Colors.textMuted, marginBottom: 8 },

  // Regen
  regenRow:     { alignItems: 'center', paddingVertical: Spacing.xl },
  regenText:    { ...Typography.bodySmall, color: Colors.textMuted },

  // Empty state (unchanged)
  emptyIconWrap:    { width: 52, height: 52, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.sm },
  emptyTitle:       { ...Typography.headlineLarge, color: Colors.text, textAlign: 'center' },
  emptySubtitle:    { ...Typography.bodyMedium, color: Colors.textMuted, textAlign: 'center', lineHeight: 22 },
  generateBtn:      { width: '100%', borderRadius: BorderRadius.md, overflow: 'hidden', ...Shadows.md, marginTop: Spacing.sm },
  generateGradient: { height: 54, justifyContent: 'center', alignItems: 'center' },
  generateBtnText:  { ...Typography.headlineSmall, color: Colors.white },

  // Keep progressPercent for ProgressRing component still in file
  progressPercent: { fontSize: 13, fontWeight: '700', color: Colors.primary },
});
