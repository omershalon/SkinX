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

export default function PlanScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { animatedStyle } = useTabTransition();
  const { t } = useTranslation();

  const [plan,       setPlan]       = useState<PersonalizedPlan | null>(null);
  const [acneType,   setAcneType]   = useState<AcneType | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [generating, setGenerating] = useState(false);
  const [doneToday,  setDoneToday]  = useState<Set<number>>(new Set());
  const [selectedPick, setSelectedPick] = useState<RankedItem | null>(null);

  const cardScaleAnims = useRef<Record<number, Animated.Value>>({}).current;
  const shimmerAnim    = useRef(new Animated.Value(0)).current;
  const shimmerRanRef  = useRef(false);

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

  /* ── checklist persistence ── */
  const CHECKLIST_KEY = 'plan_checklist_v1';

  const loadChecklist = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(CHECKLIST_KEY);
      if (stored) {
        const { date, ranks } = JSON.parse(stored);
        const today = new Date().toDateString();
        if (date === today) {
          setDoneToday(new Set(ranks as number[]));
        } else {
          // New day — reset
          setDoneToday(new Set());
          await AsyncStorage.removeItem(CHECKLIST_KEY);
        }
      } else {
        setDoneToday(new Set());
      }
    } catch {}
  }, []);

  const saveChecklist = useCallback(async (ranks: Set<number>) => {
    try {
      await AsyncStorage.setItem(CHECKLIST_KEY, JSON.stringify({
        date: new Date().toDateString(),
        ranks: Array.from(ranks),
      }));
    } catch {}
  }, []);

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

  // Refresh plan + checklist every time this tab comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchPlan();
      loadChecklist();
    }, [fetchPlan, loadChecklist])
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
      saveChecklist(s);
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

  /* ── derived data ── */
  const rankedItems: RankedItem[] = (plan?.ranked_items as unknown as RankedItem[]) ?? [];

  const groupByPillar = (items: RankedItem[]) => {
    const grouped: Record<string, RankedItem[]> = {};
    items.forEach(item => {
      if (!grouped[item.pillar]) grouped[item.pillar] = [];
      grouped[item.pillar].push(item);
    });
    const sorted: [string, RankedItem[]][] = [];
    PILLAR_ORDER.forEach(p => { if (grouped[p]) sorted.push([p, grouped[p]]); });
    return sorted;
  };

  const grouped   = groupByPillar(rankedItems);
  const doneCount = rankedItems.filter(i => doneToday.has(i.impact_rank)).length;
  const total     = rankedItems.length;
  const progress  = total > 0 ? doneCount / total : 0;

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

      {/* header */}
      <View style={styles.header}>
        {acneType && (
          <Text style={styles.acneLabel}>{ACNE_LABELS[acneType]} {'\u00B7'} COMBINATION</Text>
        )}
        <Text style={styles.headerTitle}>{t('plan.title')}</Text>
      </View>

      <ScrollView style={styles.list} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>

        {/* progress row */}
        <View style={styles.routineHeader}>
          <View style={styles.routineHeaderLeft}>
            <Text style={styles.routineTitle}>{t('plan.routineHeader')}</Text>
            <Text style={styles.routineSubtitle}>{doneCount} of {total} completed</Text>
          </View>
          <ProgressRing progress={progress} size={56} strokeWidth={4} />
        </View>

        {/* all done banner */}
        {doneCount === total && total > 0 && (
          <View style={styles.allDoneCard}>
            <View style={styles.allDoneIconWrap}>
              <StarIcon size={32} color={Colors.primary} />
            </View>
            <View>
              <Text style={styles.allDoneTitle}>{t('plan.allDone')}</Text>
              <Text style={styles.allDoneSubtext}>{t('plan.consistency')}</Text>
            </View>
          </View>
        )}

        {/* items grouped by pillar */}
        {grouped.map(([pillar, items]) => (
          <View key={pillar} style={styles.pillarSection}>
            <View style={styles.pillarHeader}>
              <View style={styles.pillarIcon}>
                {PILLAR_ICONS[pillar]
                  ? PILLAR_ICONS[pillar]({ size: 16, color: Colors.textMuted })
                  : <Text style={{ fontSize: 16, color: Colors.textMuted }}>{'•'}</Text>}
              </View>
              <Text style={styles.pillarLabel}>{PILLAR_LABELS[pillar] ?? pillar.toUpperCase()}</Text>
            </View>

            {items.map(item => {
              const done = doneToday.has(item.impact_rank);
              if (!cardScaleAnims[item.impact_rank]) cardScaleAnims[item.impact_rank] = new Animated.Value(1);
              const cardScale = cardScaleAnims[item.impact_rank];
              return (
                <Animated.View
                  key={item.impact_rank}
                  style={{
                    opacity: shimmerAnim,
                    transform: [
                      { translateX: shimmerAnim.interpolate({ inputRange: [0, 1], outputRange: [-12, 0] }) },
                      { scale: cardScale },
                    ],
                  }}
                >
                  <TouchableOpacity
                    style={[styles.routineCard, done && styles.routineCardDone]}
                    onPress={() => setSelectedPick(item)}
                    onPressIn={() => Animated.spring(cardScale, { toValue: 0.96, useNativeDriver: true, speed: 50, bounciness: 0 }).start()}
                    onPressOut={() => Animated.spring(cardScale, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 4 }).start()}
                    activeOpacity={1}
                  >
                    <TouchableOpacity
                      style={[styles.checkbox, done && styles.checkboxDone]}
                      onPress={() => toggleDone(item.impact_rank)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      {done && <Text style={styles.checkmark}>✓</Text>}
                    </TouchableOpacity>
                    <View style={styles.routineCardBody}>
                      <Text style={[styles.routineItemTitle, done && styles.routineItemTitleDone]} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <Text style={styles.routineItemSub} numberOfLines={1}>{item.rationale}</Text>
                    </View>
                    <Text style={styles.chevron}>›</Text>
                  </TouchableOpacity>
                </Animated.View>
              );
            })}
          </View>
        ))}

        {/* regenerate */}
        <TouchableOpacity style={styles.regenRow} onPress={generatePlan} disabled={generating}>
          <Text style={styles.regenText}>
            {generating ? t('plan.generating') : t('plan.regenerate')}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* confetti */}
      {showConfetti && (
        <View style={styles.confettiContainer} pointerEvents="none">
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

      {/* pick detail modal */}
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
  container: { flex: 1, backgroundColor: Colors.background },
  centered:  { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: Spacing.xxl, gap: Spacing.lg, paddingBottom: 80 },

  header: { paddingHorizontal: Spacing.xxl, paddingTop: Spacing.lg, paddingBottom: Spacing.sm },
  acneLabel: {
    fontSize: 11, fontWeight: '600', color: Colors.textMuted,
    letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: Spacing.xs,
  },
  headerTitle: {
    fontSize: 28, fontWeight: '700', color: Colors.text,
    letterSpacing: -0.3, marginBottom: Spacing.sm,
  },

  list:        { flex: 1 },
  listContent: { paddingBottom: 100 },

  pillarSection: { marginHorizontal: Spacing.xl, marginTop: Spacing.xxl, gap: Spacing.md },
  pillarHeader:  { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.xs, paddingHorizontal: Spacing.xs },
  pillarIcon:    { width: 16, height: 16, alignItems: 'center' as const, justifyContent: 'center' as const },
  pillarLabel:   { fontSize: 12, fontWeight: '700', color: Colors.textMuted, letterSpacing: 1.5, textTransform: 'uppercase' },

  routineHeader:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.xxl, paddingTop: Spacing.xl, paddingBottom: Spacing.lg },
  routineHeaderLeft: { gap: 4 },
  routineTitle:      { fontSize: 22, fontWeight: '700', color: Colors.text },
  routineSubtitle:   { fontSize: 13, color: Colors.textMuted },
  progressPercent:   { fontSize: 13, fontWeight: '700', color: Colors.primary },

  routineCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.card, borderRadius: BorderRadius.xl,
    paddingVertical: Spacing.lg, paddingHorizontal: Spacing.lg,
    borderWidth: 1, borderColor: Colors.border, gap: Spacing.md,
  },
  routineCardDone: {
    borderColor: Colors.primary + '40',
    backgroundColor: 'rgba(124, 92, 252, 0.06)',
  },
  routineCardBody: { flex: 1, gap: 3 },
  routineItemTitle: { fontSize: 15, fontWeight: '600', color: Colors.text },
  routineItemTitleDone: { textDecorationLine: 'line-through', color: Colors.textMuted },
  routineItemSub: { fontSize: 13, color: Colors.textMuted, lineHeight: 18 },
  chevron: { fontSize: 22, color: Colors.textMuted, fontWeight: '300' },

  checkbox: {
    width: 28, height: 28, borderRadius: 14,
    borderWidth: 2, borderColor: Colors.border,
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  checkboxDone:  { borderColor: Colors.primary, backgroundColor: Colors.primary },
  checkmark:     { fontSize: 14, color: Colors.white, fontWeight: '700' },

  allDoneCard:    { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginHorizontal: Spacing.xxl, marginBottom: Spacing.sm, backgroundColor: Colors.card, borderRadius: BorderRadius.lg, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.primary + '40' },
  allDoneIconWrap:{ width: 32, height: 32, alignItems: 'center' as const, justifyContent: 'center' as const },
  allDoneTitle:   { ...Typography.labelLarge, color: Colors.primary },
  allDoneSubtext: { ...Typography.bodySmall, color: Colors.textMuted },

  regenRow: { alignItems: 'center', paddingVertical: Spacing.xl },
  regenText: { ...Typography.bodySmall, color: Colors.textMuted },

  emptyIconWrap:   { width: 52, height: 52, alignItems: 'center' as const, justifyContent: 'center' as const, marginBottom: Spacing.sm },
  emptyTitle:      { ...Typography.headlineLarge, color: Colors.text, textAlign: 'center' },
  emptySubtitle:   { ...Typography.bodyMedium, color: Colors.textMuted, textAlign: 'center', lineHeight: 22 },

  generateBtn:     { width: '100%', borderRadius: BorderRadius.md, overflow: 'hidden', ...Shadows.md, marginTop: Spacing.sm },
  generateGradient:{ height: 54, justifyContent: 'center', alignItems: 'center' },
  generateBtnText: { ...Typography.headlineSmall, color: Colors.white },

  confettiContainer: { ...StyleSheet.absoluteFillObject, zIndex: 999 },
});
