import { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  Animated,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { supabase } from '@/lib/supabase';
import { Colors, BorderRadius, Spacing, Shadows, Fonts } from '@/lib/theme';
import ScreenBackground from '@/components/ScreenBackground';
import { HomeSkeleton } from '@/components/SkeletonLoader';
import { useTabTransition } from '@/hooks/useTabTransition';
import type { Database, Severity, RankedItem, SkinGoal } from '@/lib/database.types';
import { startOfDay, subDays } from 'date-fns';
import { useTranslation } from 'react-i18next';

type Profile          = Database['public']['Tables']['profiles']['Row'];
type SkinProfile      = Database['public']['Tables']['skin_profiles']['Row'];
type PersonalizedPlan = Database['public']['Tables']['personalized_plans']['Row'];

const { width: SW } = Dimensions.get('window');

// ─── Icons ───────────────────────────────────────────────────────────────────

function ScanLineIcon({ size = 16, color = '#fff' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"
        stroke={color} strokeWidth={1.8} strokeLinejoin="round" fill="none" />
      <Circle cx={12} cy={13} r={4} stroke={color} strokeWidth={1.8} fill="none" />
    </Svg>
  );
}

function ChatBubbleIcon({ size = 16, color = '#fff' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4 4h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H8l-4 4V6a2 2 0 0 1 2-2z"
        stroke={color} strokeWidth={1.8} fill="none" />
    </Svg>
  );
}

function CalendarIcon({ size = 18, color = '#8B5CF6' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={3} y={4} width={18} height={18} rx={3} stroke={color} strokeWidth={1.9} fill="none" />
      <Path d="M3 10h18M8 4V2M16 4V2" stroke={color} strokeWidth={1.9} strokeLinecap="round" />
      <Circle cx={9} cy={15} r={0.9} fill={color} />
      <Circle cx={12} cy={15} r={0.9} fill={color} />
      <Circle cx={15} cy={15} r={0.9} fill={color} />
    </Svg>
  );
}

function ShieldIcon({ size = 20, color = '#8B5CF6' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 2l9 4v6c0 5.25-3.75 10.15-9 11.25C6.75 22.15 3 17.25 3 12V6l9-4z"
        stroke={color} strokeWidth={1.9} fill="rgba(139,92,246,0.12)" strokeLinejoin="round" />
      <Path d="M12 8l1.2 2.8L16 12l-2.8 1.2L12 16l-1.2-2.8L8 12l2.8-1.2z"
        fill={color} stroke={color} strokeWidth={0.6} strokeLinejoin="round" />
    </Svg>
  );
}

function SunIconSm({ size = 13, color = '#FCD34D' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={4} stroke={color} strokeWidth={2} fill="none" />
      <Path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.93 4.93l2.12 2.12M16.95 16.95l2.12 2.12M4.93 19.07l2.12-2.12M16.95 7.05l2.12-2.12"
        stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

function MoonIconSm({ size = 13, color = '#A78BFA' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z"
        stroke={color} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function TrendIcon({ size = 13, color = '#4ADE80' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M3 17l6-6 4 4 8-8" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function DotsGridIcon({ size = 14, color = '#4ADE80' }: { size?: number; color?: string }) {
  const cx = [5, 12, 19];
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {cx.map(y =>
        cx.map(x => (
          <Circle key={`${x}-${y}`} cx={x} cy={y} r={1.6} fill={color} />
        ))
      )}
    </Svg>
  );
}

function SunBurstIcon({ size = 14, color = '#F87171' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={3.2} stroke={color} strokeWidth={1.8} fill="none" />
      <Path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.93 4.93l2.12 2.12M16.95 16.95l2.12 2.12M4.93 19.07l2.12-2.12M16.95 7.05l2.12-2.12"
        stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

function DropletIcon({ size = 13, color = 'rgba(255,255,255,0.55)' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 4C12 4 6 11 6 15a6 6 0 0 0 12 0c0-4-6-11-6-11z"
        stroke={color} strokeWidth={1.8} fill="none" strokeLinejoin="round" />
    </Svg>
  );
}

function RadianceIcon({ size = 13, color = 'rgba(255,255,255,0.55)' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={4} stroke={color} strokeWidth={1.8} fill="none" />
      <Path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.93 4.93l2.12 2.12M16.95 16.95l2.12 2.12M4.93 19.07l2.12-2.12M16.95 7.05l2.12-2.12"
        stroke={color} strokeWidth={1.6} strokeLinecap="round" />
    </Svg>
  );
}

function CheckCircleIcon({ size = 16, color = '#4ADE80' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={10} stroke={color} strokeWidth={1.8} fill="none" />
      <Path d="M8 12l3 3 5-5" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function BanIcon({ size = 16, color = '#F87171' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={10} stroke={color} strokeWidth={1.8} fill="none" />
      <Path d="M5.5 5.5l13 13" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

function ChevronRight({ size = 13, color = '#fff' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M9 18l6-6-6-6" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getSeverityColor(sev?: Severity | null): string {
  if (sev === 'mild')     return '#4ADE80';
  if (sev === 'moderate') return '#FCD34D';
  if (sev === 'severe')   return '#F87171';
  return 'rgba(255,255,255,0.6)';
}

function capitalize(s?: string | null) {
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function computeGlowScore(
  sessions: Array<{ severity_score?: number | null }>,
  severity?: Severity | null
): number {
  const last = sessions.length > 0 ? sessions[sessions.length - 1] : null;
  if (last?.severity_score != null) {
    return Math.max(30, Math.min(99, Math.round(100 - last.severity_score * 10)));
  }
  if (severity === 'mild')     return 86;
  if (severity === 'moderate') return 68;
  if (severity === 'severe')   return 45;
  return 92;
}

function getScoreLabel(_score: number): string {
  return 'Health score';
}

function getSkinHeadline(
  sessions: Array<{ severity_score?: number | null }>,
  severity?: Severity | null
): string {
  if (sessions.length >= 2) {
    const prev = sessions[sessions.length - 2].severity_score;
    const curr = sessions[sessions.length - 1].severity_score;
    if (prev != null && curr != null && curr < prev) return 'Your skin is improving';
    if (prev != null && curr != null && curr > prev) return 'Your skin needs attention';
  }
  if (!severity || severity === 'mild') return 'Your skin looks calm';
  if (severity === 'moderate') return 'Your skin needs care';
  return 'Your skin needs attention';
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router  = useRouter();
  const { animatedStyle } = useTabTransition();
  const { t } = useTranslation();

  const [profile,     setProfile]     = useState<Profile | null>(null);
  const [skinProfile, setSkinProfile] = useState<SkinProfile | null>(null);
  const [plan,        setPlan]        = useState<PersonalizedPlan | null>(null);
  const [weekSessions, setWeekSessions] = useState<Array<{ created_at: string; severity_score?: number | null }>>([]);
  const [refreshing,  setRefreshing]  = useState(false);
  const [loaded,      setLoaded]      = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  const fetchData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const sevenDaysAgo = subDays(startOfDay(new Date()), 6).toISOString();

    const [profileRes, skinRes, planRes, weekRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('skin_profiles').select('*').eq('user_id', user.id)
        .order('created_at', { ascending: false }).limit(1).single(),
      supabase.from('personalized_plans').select('*').eq('user_id', user.id)
        .eq('is_active', true).single(),
      supabase.from('scan_sessions').select('created_at, severity_score')
        .eq('user_id', user.id).eq('status', 'completed')
        .gte('created_at', sevenDaysAgo)
        .order('created_at', { ascending: true }),
    ]);

    if ((profileRes as any).data) setProfile((profileRes as any).data as Profile);
    if ((skinRes as any).data)    setSkinProfile((skinRes as any).data as SkinProfile);
    if ((planRes as any).data)    setPlan((planRes as any).data as PersonalizedPlan);
    setWeekSessions((weekRes.data ?? []) as Array<{ created_at: string; severity_score?: number | null }>);

    setLoaded(true);
  }, []);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  useEffect(() => {
    if (!loaded) return;
    Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }).start();
  }, [loaded]);

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : (profile as any)?.email?.[0]?.toUpperCase() ?? '?';

  const Header = (
    <View style={[s.header, { paddingTop: insets.top + 8 }]}>
      <Text style={s.headerBrand}>SkinX</Text>
      <TouchableOpacity onPress={() => router.push('/profile')} activeOpacity={0.8}>
        <LinearGradient colors={['#9B7DFF', '#7C5CFC']} style={s.avatarGrad}>
          <Text style={s.avatarText}>{initials}</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  if (!loaded) {
    return (
      <Animated.View style={[s.root, animatedStyle]}>
        <ScreenBackground preset="home" />
        <View style={{ paddingTop: insets.top + 12 }} />
        <HomeSkeleton />
      </Animated.View>
    );
  }

  /* ══════════════════════════════
     POST-SCAN DASHBOARD
  ══════════════════════════════ */
  if (skinProfile) {
    const rankedItems: RankedItem[] = Array.isArray((plan as any)?.ranked_items)
      ? ((plan as any).ranked_items as RankedItem[]).slice().sort((a, b) => a.impact_rank - b.impact_rank)
      : [];

    const morningItems = rankedItems.filter(i => !i.time_of_day || i.time_of_day === 'morning').slice(0, 3);
    const nightItems   = rankedItems.filter(i => i.time_of_day === 'night').slice(0, 3);

    const skinGoal  = (plan?.skin_goal as unknown as SkinGoal | null) ?? null;
    const coachNote = (plan?.coach_note as string | null) ?? null;

    const glowScore    = computeGlowScore(weekSessions, skinProfile.severity);
    const scoreLabel   = getScoreLabel(glowScore);
    const skinHeadline = getSkinHeadline(weekSessions, skinProfile.severity);

    const oilLabel = skinProfile.skin_type === 'oily' ? 'High'
      : skinProfile.skin_type === 'combination' ? 'Mixed'
      : skinProfile.skin_type === 'dry' ? 'Low' : 'Normal';
    const oilColor = (skinProfile.skin_type === 'oily' || skinProfile.skin_type === 'combination')
      ? '#FCD34D' : 'rgba(255,255,255,0.7)';

    const rednessLabel = (skinProfile.skin_type === 'sensitive' || skinProfile.severity === 'severe') ? 'High'
      : skinProfile.severity === 'moderate' ? 'Moderate' : 'Low';
    const rednessColor = (skinProfile.skin_type === 'sensitive' || skinProfile.severity === 'severe') ? '#F87171'
      : skinProfile.severity === 'moderate' ? '#FCD34D' : '#4ADE80';

    const focusChips = (skinProfile.severity === 'moderate' || skinProfile.severity === 'severe')
      ? [
          { icon: <CheckCircleIcon color="#4ADE80" />, label: 'Gentle\ncleansing' },
          { icon: <BanIcon color="#F87171" />,         label: 'Avoid\nactives' },
          { icon: <DropletIcon size={16} color="#60A5FA" />, label: 'Hydrate\n& protect' },
        ]
      : [
          { icon: <CheckCircleIcon color="#4ADE80" />, label: 'Keep routine\nsimple' },
          { icon: <BanIcon color="#F87171" />,         label: 'Avoid new\nproducts' },
          { icon: <DropletIcon size={16} color="#60A5FA" />, label: 'Moisturize\nwell' },
        ];

    const focusHeadline = skinGoal?.headline
      ?? (skinProfile.severity === 'mild' ? 'Protect your skin barrier'
        : skinProfile.severity === 'moderate' ? 'Reduce inflammation'
        : 'Repair and restore');

    const focusDesc = skinGoal?.description
      ?? (skinProfile.severity === 'mild'
        ? "Your scan looks calm, so today is not about adding more. It's about keeping your skin stable."
        : "Your scan shows activity. Focus on gentle, consistent care to reduce inflammation.");

    const whyText = (plan as any)?.description
      ?? skinGoal?.description
      ?? `Your skin looks ${skinProfile.severity === 'mild' ? 'calm' : 'active'}, so today is about ${skinProfile.severity === 'mild' ? 'staying consistent' : 'gentle care'}.`;

    const bestMove = coachNote?.split('.')[0] ?? 'Follow your routine and re-scan tomorrow';

    return (
      <Animated.View style={[s.root, animatedStyle]}>
        <ScreenBackground preset="home" />
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={s.scroll}
          showsVerticalScrollIndicator={false}
          overScrollMode="never"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7C5CFC" />}
        >
          {Header}

          {/* ── Today's Skin Check ── */}
          <View style={s.card}>
            <Text style={s.eyebrow}>TODAY'S SKIN CHECK</Text>

            <View style={s.checkBody}>
              <View style={s.checkLeft}>
                <Text style={s.checkHeadline}>
                  {skinHeadline}{' '}
                  <Text style={s.sparkle}>✦</Text>
                </Text>
                <Text style={s.checkSubtitle} numberOfLines={3}>
                  {skinProfile.analysis_notes ?? "Your skin looks calm today.\nStay consistent and keep your barrier healthy."}
                </Text>
                <View style={s.scoreBadge}>
                  <View style={s.scoreBox}>
                    <Text style={s.scoreNumber}>{glowScore}</Text>
                  </View>
                  <Text style={s.scoreLabel}>{scoreLabel}</Text>
                </View>
              </View>
              {skinProfile.photo_url ? (
                <Image source={{ uri: skinProfile.photo_url }} style={s.checkPhoto} resizeMode="cover" />
              ) : (
                <View style={[s.checkPhoto, s.checkPhotoPlaceholder]} />
              )}
            </View>

            <View style={s.metricsRow}>
              <View style={s.metricChip}>
                <View style={[s.metricIconBox, { backgroundColor: 'rgba(74,222,128,0.14)' }]}>
                  <DotsGridIcon color={getSeverityColor(skinProfile.severity)} />
                </View>
                <View style={s.metricTextCol}>
                  <Text style={s.metricLabel}>Breakouts</Text>
                  <Text style={[s.metricValue, { color: getSeverityColor(skinProfile.severity) }]}>
                    {capitalize(skinProfile.severity ?? 'Mild')}
                  </Text>
                </View>
              </View>
              <View style={s.metricChip}>
                <View style={[s.metricIconBox, { backgroundColor: 'rgba(96,165,250,0.14)' }]}>
                  <DropletIcon size={14} color="#60A5FA" />
                </View>
                <View style={s.metricTextCol}>
                  <Text style={s.metricLabel}>Oil</Text>
                  <Text style={[s.metricValue, { color: oilColor }]}>{oilLabel}</Text>
                </View>
              </View>
              <View style={s.metricChip}>
                <View style={[s.metricIconBox, { backgroundColor: 'rgba(248,113,113,0.14)' }]}>
                  <SunBurstIcon color={rednessColor} />
                </View>
                <View style={s.metricTextCol}>
                  <Text style={s.metricLabel}>Redness</Text>
                  <Text style={[s.metricValue, { color: rednessColor }]}>{rednessLabel}</Text>
                </View>
              </View>
            </View>

            <TouchableOpacity style={s.startBtn} activeOpacity={0.88} onPress={() => router.push('/(tabs)/plan')}>
              <LinearGradient colors={['#5848F0', '#4438DC']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.startBtnGrad}>
                <Text style={s.startBtnIcon}>✦</Text>
                <Text style={s.startBtnText}>Start Today's Routine</Text>
              </LinearGradient>
            </TouchableOpacity>

            <View style={s.secondaryRow}>
              <TouchableOpacity style={s.secondaryBtn} activeOpacity={0.8} onPress={() => router.push('/(tabs)/scan')}>
                <ScanLineIcon color="rgba(255,255,255,0.8)" />
                <Text style={s.secondaryBtnText}>Re-scan</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.secondaryBtn} activeOpacity={0.8} onPress={() => router.push('/coach' as any)}>
                <ChatBubbleIcon color="rgba(255,255,255,0.8)" />
                <Text style={s.secondaryBtnText}>Ask Coach</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Today's Game Plan ── */}
          <View style={s.card}>
            <View style={s.cardHeaderRow}>
              <CalendarIcon />
              <Text style={s.cardTitle}>Today's Game Plan</Text>
            </View>

            <View style={s.planColumns}>
              <View style={s.planCol}>
                <View style={s.planColHeader}>
                  <SunIconSm />
                  <Text style={[s.planColLabel, { color: '#FCD34D' }]}>Morning</Text>
                </View>
                {morningItems.length > 0 ? morningItems.map((item, i) => (
                  <View key={i} style={s.planItem}>
                    <View style={s.planNum}><Text style={s.planNumText}>{i + 1}</Text></View>
                    <Text style={s.planItemText} numberOfLines={2}>{item.title}</Text>
                  </View>
                )) : <Text style={s.planEmptyText}>No morning steps</Text>}
              </View>

              <View style={s.planDivider} />

              <View style={s.planCol}>
                <View style={s.planColHeader}>
                  <MoonIconSm />
                  <Text style={[s.planColLabel, { color: '#A78BFA' }]}>Night</Text>
                </View>
                {nightItems.length > 0 ? nightItems.map((item, i) => (
                  <View key={i} style={s.planItem}>
                    <View style={s.planNum}><Text style={s.planNumText}>{i + 1}</Text></View>
                    <Text style={s.planItemText} numberOfLines={2}>{item.title}</Text>
                  </View>
                )) : <Text style={s.planEmptyText}>No night steps</Text>}
              </View>
            </View>

            <View style={s.whyRow}>
              <Text style={s.whyIcon}>✦</Text>
              <Text style={s.whyBody}>
                <Text style={s.whyLabel}>Why: </Text>
                {whyText}
              </Text>
            </View>
          </View>

          {/* ── Today's Focus ── */}
          <View style={s.card}>
            <View style={s.focusTop}>
              <View style={s.focusIconWrap}><ShieldIcon /></View>
              <Text style={s.focusEyebrow}>TODAY'S FOCUS</Text>
            </View>
            <Text style={s.focusHeadline}>{focusHeadline}</Text>
            <Text style={s.focusDesc}>{focusDesc}</Text>

            <View style={s.chipsRow}>
              {focusChips.map((chip, i) => (
                <View key={i} style={s.actionChip}>
                  {chip.icon}
                  <Text style={s.actionChipText}>{chip.label}</Text>
                </View>
              ))}
            </View>

            <View style={s.bestMoveRow}>
              <Text style={s.sparkleSmall}>✦</Text>
              <Text style={s.bestMoveBody}>
                <Text style={s.bestMoveLabel}>Best move today: </Text>
                {bestMove}.
              </Text>
            </View>
          </View>

          {/* ── Skin Coach Insight ── */}
          <View style={s.card}>
            <View style={s.coachRow}>
              <View style={s.coachLeft}>
                <View style={s.coachHeader}>
                  <ChatBubbleIcon size={20} color="#8B5CF6" />
                  <Text style={s.coachTitle}>Skin Coach Insight</Text>
                </View>
                <Text style={s.coachText} numberOfLines={2}>
                  {coachNote ?? "Consistency matters more than intensity right now.\nKeep the same routine and avoid over-treating."}
                </Text>
              </View>
              <TouchableOpacity style={s.followUpBtn} activeOpacity={0.8} onPress={() => router.push('/coach' as any)}>
                <Text style={s.followUpText}>Ask a follow-up</Text>
                <ChevronRight size={13} color="#8B5CF6" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={{ height: 24 }} />
        </ScrollView>
      </Animated.View>
    );
  }

  /* ══════════════════════════════
     PRE-SCAN HERO
  ══════════════════════════════ */
  return (
    <Animated.View style={[s.root, { flex: 1 }, animatedStyle]}>
      <ScreenBackground preset="home" />
      {Header}
      <ScrollView
        contentContainerStyle={s.heroContent}
        showsVerticalScrollIndicator={false}
        style={{ flex: 1 }}
        overScrollMode="never"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7C5CFC" />}
      >
        <View style={s.heroGlow} pointerEvents="none" />
        <View style={s.heroTextBlock}>
          <Text style={s.heroPreSub}>Personalized scan results, routine, and progress in one place</Text>
          <Text style={s.heroPreTitle}>{t('home.hero.title')}</Text>
          <Text style={s.heroPreBody}>{t('home.hero.body')}</Text>
        </View>
        <TouchableOpacity style={s.heroCta} activeOpacity={0.88} onPress={() => router.push('/(tabs)/scan')}>
          <Text style={s.heroCtaText}>{t('home.hero.cta')}</Text>
        </TouchableOpacity>
        <View style={{ height: 80 }} />
      </ScrollView>
    </Animated.View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  scroll: { paddingHorizontal: 16, paddingBottom: 16 },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 8,
  },
  headerBrand: { fontFamily: Fonts.extrabold, fontSize: 23, color: '#fff', letterSpacing: -0.3 },
  avatarGrad:  { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center' },
  avatarText:  { fontFamily: Fonts.bold, fontSize: 13, color: '#fff' },

  // Card base
  card: {
    backgroundColor: '#171034',
    borderRadius: 18, padding: 13, marginBottom: 8,
    borderWidth: 1, borderColor: 'rgba(124,92,252,0.25)',
  },

  // Skin Check card
  eyebrow: {
    fontFamily: Fonts.bold, fontSize: 10, color: '#E879F9',
    letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 10,
  },
  checkBody:    { flexDirection: 'row', gap: 12, marginBottom: 11 },
  checkLeft:    { flex: 1, justifyContent: 'space-between' },
  checkHeadline: {
    fontFamily: Fonts.extrabold, fontSize: 20, color: '#fff',
    lineHeight: 25, letterSpacing: -0.5, marginBottom: 6,
  },
  sparkle: { color: '#4ADE80', fontSize: 18 },
  checkSubtitle: {
    fontFamily: Fonts.regular, fontSize: 12, color: 'rgba(255,255,255,0.55)',
    lineHeight: 16, marginBottom: 10,
  },
  scoreBadge:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  scoreBox: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(124,92,252,0.35)',
    backgroundColor: 'rgba(124,92,252,0.06)',
  },
  scoreNumber: { fontFamily: Fonts.extrabold, fontSize: 28, color: '#fff', lineHeight: 30, letterSpacing: -1.2 },
  scoreLabel:  { fontFamily: Fonts.semibold, fontSize: 13, color: 'rgba(255,255,255,0.6)' },
  checkPhoto:  { width: 110, height: 130, borderRadius: 14, flexShrink: 0 },
  checkPhotoPlaceholder: { backgroundColor: 'rgba(255,255,255,0.08)' },

  // Metrics row
  metricsRow:  { flexDirection: 'row', gap: 6, marginBottom: 10 },
  metricChip: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 9, paddingHorizontal: 9,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  metricIconBox: {
    width: 28, height: 28, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  metricTextCol: { flex: 1, minWidth: 0 },
  metricLabel:   { fontFamily: Fonts.regular, fontSize: 10, color: 'rgba(255,255,255,0.5)', marginBottom: 1 },
  metricValue:   { fontFamily: Fonts.bold, fontSize: 12, color: '#fff' },

  // Start Routine
  startBtn:    { borderRadius: 12, overflow: 'hidden', marginBottom: 7 },
  startBtnGrad: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 7, paddingVertical: 11,
  },
  startBtnIcon: { fontSize: 13, color: 'rgba(255,255,255,0.85)' },
  startBtnText: { fontFamily: Fonts.bold, fontSize: 14, color: '#fff', letterSpacing: 0.1 },

  // Re-scan + Ask Coach
  secondaryRow: { flexDirection: 'row', gap: 8 },
  secondaryBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 9, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  secondaryBtnText: { fontFamily: Fonts.semibold, fontSize: 13, color: 'rgba(255,255,255,0.85)' },

  // Card header
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  cardTitle:     { fontFamily: Fonts.bold, fontSize: 14, color: '#fff' },

  // Game Plan columns
  planColumns:   { flexDirection: 'row', marginBottom: 9 },
  planCol:       { flex: 1 },
  planColHeader: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 8 },
  planColLabel:  { fontFamily: Fonts.semibold, fontSize: 12 },
  planItem:      { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 6 },
  planNum: {
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: 'rgba(124,92,252,0.22)',
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  planNumText:   { fontFamily: Fonts.bold, fontSize: 10, color: '#A78BFA' },
  planItemText:  { fontFamily: Fonts.regular, fontSize: 12, color: 'rgba(255,255,255,0.82)', flex: 1, lineHeight: 16 },
  planEmptyText: { fontFamily: Fonts.regular, fontSize: 11, color: 'rgba(255,255,255,0.28)', marginTop: 2 },
  planDivider:   { width: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginHorizontal: 10, marginVertical: 2 },

  // Why row
  whyRow: {
    flexDirection: 'row', gap: 5, alignItems: 'flex-start',
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.07)', paddingTop: 8,
  },
  whyIcon:  { fontSize: 10, color: '#7C5CFC', marginTop: 1 },
  whyBody:  { fontFamily: Fonts.regular, fontSize: 11, color: 'rgba(255,255,255,0.5)', flex: 1, lineHeight: 16 },
  whyLabel: { fontFamily: Fonts.semibold, color: '#7C5CFC' },

  // Today's Focus
  focusTop: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 8 },
  focusIconWrap: {
    width: 30, height: 30, borderRadius: 9,
    backgroundColor: 'rgba(124,92,252,0.15)', justifyContent: 'center', alignItems: 'center',
  },
  focusEyebrow: {
    fontFamily: Fonts.bold, fontSize: 10, color: '#E879F9',
    letterSpacing: 1.4, textTransform: 'uppercase',
  },
  focusHeadline: {
    fontFamily: Fonts.extrabold, fontSize: 17, color: '#fff',
    letterSpacing: -0.3, marginBottom: 4, lineHeight: 22,
  },
  focusDesc: {
    fontFamily: Fonts.regular, fontSize: 12, color: 'rgba(255,255,255,0.58)',
    lineHeight: 17, marginBottom: 10,
  },
  chipsRow:   { flexDirection: 'row', gap: 6, marginBottom: 9 },
  actionChip: {
    flex: 1, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 6,
    backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center', gap: 4,
  },
  actionChipText: {
    fontFamily: Fonts.semibold, fontSize: 10, color: 'rgba(255,255,255,0.7)',
    textAlign: 'center', lineHeight: 13,
  },
  bestMoveRow: {
    flexDirection: 'row', gap: 5, alignItems: 'flex-start',
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.07)', paddingTop: 8,
  },
  sparkleSmall:  { fontSize: 10, color: '#7C5CFC', marginTop: 1 },
  bestMoveBody:  { fontFamily: Fonts.regular, fontSize: 11, color: 'rgba(255,255,255,0.55)', flex: 1, lineHeight: 16 },
  bestMoveLabel: { fontFamily: Fonts.semibold, color: '#7C5CFC' },

  // Coach card
  coachRow:    { flexDirection: 'row', alignItems: 'center', gap: 10 },
  coachLeft:   { flex: 1, minWidth: 0 },
  coachHeader: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 4 },
  coachTitle:  { fontFamily: Fonts.semibold, fontSize: 13, color: '#fff' },
  coachText: {
    fontFamily: Fonts.regular, fontSize: 11, color: 'rgba(255,255,255,0.55)',
    lineHeight: 15,
  },
  followUpBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 11, paddingVertical: 11, paddingHorizontal: 16,
    backgroundColor: 'transparent',
    borderWidth: 1.4, borderColor: '#8B5CF6',
    flexShrink: 0,
  },
  followUpText: { fontFamily: Fonts.semibold, fontSize: 13, color: '#8B5CF6' },

  // Pre-scan hero
  heroContent:   { paddingHorizontal: 20, flex: 1, justifyContent: 'center' },
  heroGlow: {
    position: 'absolute', top: -80, left: SW * 0.1,
    width: SW * 0.8, height: 400, borderRadius: 200,
    backgroundColor: 'rgba(91,33,182,0.18)',
  },
  heroTextBlock: { marginTop: Spacing.massive, marginBottom: Spacing.xxxl },
  heroPreSub: {
    fontFamily: Fonts.medium, fontSize: 13, color: Colors.textMuted,
    letterSpacing: 0.3, marginBottom: Spacing.lg, textTransform: 'uppercase',
  },
  heroPreTitle: {
    fontFamily: Fonts.extrabold, fontSize: 42, color: Colors.white,
    lineHeight: 48, letterSpacing: -1.2, marginBottom: Spacing.xl,
  },
  heroPreBody: { fontFamily: Fonts.regular, fontSize: 15, color: Colors.textSecondary, lineHeight: 23 },
  heroCta: {
    backgroundColor: Colors.white, borderRadius: BorderRadius.pill,
    paddingVertical: 18, paddingHorizontal: Spacing.xxxl, alignSelf: 'center', ...Shadows.xl,
  },
  heroCtaText: { fontFamily: Fonts.bold, fontSize: 16, color: Colors.background, letterSpacing: 0.2 },
});
