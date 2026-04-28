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
import Svg, { Circle, Path, Rect, Polyline, Text as SvgText } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { Colors, BorderRadius, Spacing, Shadows, Fonts } from '@/lib/theme';
import ScreenBackground from '@/components/ScreenBackground';
import { HomeSkeleton } from '@/components/SkeletonLoader';
import { useTabTransition } from '@/hooks/useTabTransition';
import StreakCounter from '@/components/StreakCounter';
import type { Database, SkinType, Severity, RankedItem } from '@/lib/database.types';
import { differenceInDays, startOfDay, subDays, format } from 'date-fns';
import { useTranslation } from 'react-i18next';

type Profile          = Database['public']['Tables']['profiles']['Row'];
type SkinProfile      = Database['public']['Tables']['skin_profiles']['Row'];
type PersonalizedPlan = Database['public']['Tables']['personalized_plans']['Row'];

const { width: SW } = Dimensions.get('window');

const MISSIONS_KEY = 'missions_v1';

const SKIN_TYPE_LABELS: Record<SkinType, string> = {
  oily: 'Oily', dry: 'Dry', combination: 'Combination', sensitive: 'Sensitive', normal: 'Normal',
};
const SKIN_TYPE_DESC: Record<SkinType, string> = {
  oily:        'excess sebum production, prone to breakouts',
  dry:         'tight feeling, flakiness, needs hydration',
  combination: 'oily T-zone with dry cheeks',
  sensitive:   'reactive skin, prone to redness',
  normal:      'balanced, minimal concerns',
};

// ─── Icons ──────────────────────────────────────────────────────────────────

function ChevronRight({ size = 14, color = '#fff' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M9 18l6-6-6-6" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function ScanLineIcon({ size = 22, color = '#fff' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"
        stroke={color} strokeWidth={1.7} strokeLinejoin="round" fill="none" />
      <Circle cx={12} cy={13} r={4} stroke={color} strokeWidth={1.7} fill="none" />
    </Svg>
  );
}

function CameraIconLarge({ size = 44, color = 'rgba(255,255,255,0.5)' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"
        stroke={color} strokeWidth={1.6} fill="none" strokeLinejoin="round" />
      <Circle cx={12} cy={13} r={4} stroke={color} strokeWidth={1.6} fill="none" />
    </Svg>
  );
}

function ChatBubbleIcon({ size = 22, color = '#fff' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4 4h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H8l-4 4V6a2 2 0 0 1 2-2z"
        stroke={color} strokeWidth={1.8} fill="none" />
    </Svg>
  );
}

function PlanGridIcon({ size = 22, color = '#fff' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={3} y={3} width={7} height={8} rx={2} stroke={color} strokeWidth={1.7} fill="none" />
      <Rect x={14} y={3} width={7} height={8} rx={2} stroke={color} strokeWidth={1.7} fill="none" />
      <Rect x={3} y={15} width={7} height={6} rx={2} stroke={color} strokeWidth={1.7} fill="none" />
      <Rect x={14} y={15} width={7} height={6} rx={2} stroke={color} strokeWidth={1.7} fill="none" />
    </Svg>
  );
}

function TrendIcon({ size = 14, color = '#4ADE80' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M3 17l6-6 4 4 8-8" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function DropletIcon({ size = 14, color = 'rgba(255,255,255,0.55)' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 4C12 4 6 11 6 15a6 6 0 0 0 12 0c0-4-6-11-6-11z"
        stroke={color} strokeWidth={1.8} fill="none" strokeLinejoin="round" />
    </Svg>
  );
}

function RadianceIcon({ size = 14, color = 'rgba(255,255,255,0.55)' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={4} stroke={color} strokeWidth={1.8} fill="none" />
      <Path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.93 4.93l2.12 2.12M16.95 16.95l2.12 2.12M4.93 19.07l2.12-2.12M16.95 7.05l2.12-2.12"
        stroke={color} strokeWidth={1.6} strokeLinecap="round" />
    </Svg>
  );
}

function HeartIcon({ size = 28, color = '#7C5CFC' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
        fill={color} fillOpacity={0.25} stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
    </Svg>
  );
}

function CheckDoneIcon({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={10} fill="#4ADE80" fillOpacity={0.18} stroke="#4ADE80" strokeWidth={1.5} />
      <Path d="M8 12l3 3 5-5" stroke="#4ADE80" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// ─── Week Chart ──────────────────────────────────────────────────────────────

function WeekChart({ sessions }: { sessions: Array<{ created_at: string; severity_score?: number | null }> }) {
  const W = SW * 0.38;
  const H = 44;
  const padX = 8, padY = 5;
  const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  const today = new Date();
  const points = Array.from({ length: 7 }, (_, i) => {
    const day = subDays(today, 6 - i);
    const dayStr = format(day, 'yyyy-MM-dd');
    const session = sessions.find(s => s.created_at?.startsWith(dayStr));
    return {
      y: session?.severity_score != null ? session.severity_score / 10 : null,
      isToday: i === 6,
    };
  });

  const xStep = (W - padX * 2) / 6;
  const coords = points.map((p, i) => ({
    x: padX + i * xStep,
    y: p.y != null ? padY + (H - padY * 2) * (1 - p.y) : H / 2,
    hasData: p.y != null,
    isToday: p.isToday,
  }));

  const polylinePoints = coords.map(c => `${c.x},${c.y}`).join(' ');

  return (
    <Svg width={W} height={H + 18}>
      <Polyline
        points={polylinePoints}
        fill="none"
        stroke="rgba(124,92,252,0.5)"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {coords.map((c, i) => (
        c.hasData ? (
          <Circle key={i} cx={c.x} cy={c.y} r={c.isToday ? 5 : 3}
            fill={c.isToday ? '#4ADE80' : '#7C5CFC'}
            stroke={c.isToday ? '#fff' : 'none'} strokeWidth={1.5}
          />
        ) : (
          <Circle key={i} cx={c.x} cy={c.y} r={2.5}
            fill="rgba(255,255,255,0.15)"
          />
        )
      ))}
      {days.map((d, i) => (
        <SvgText key={i} x={padX + i * xStep} y={H + 15}
          fontSize={9} fill="rgba(255,255,255,0.38)" textAnchor="middle"
          fontFamily={Fonts.medium}
        >
          {d}
        </SvgText>
      ))}
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

// ─── Main Component ──────────────────────────────────────────────────────────

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router  = useRouter();
  const { animatedStyle } = useTabTransition();
  const { t } = useTranslation();

  const [profile,        setProfile]        = useState<Profile | null>(null);
  const [skinProfile,    setSkinProfile]    = useState<SkinProfile | null>(null);
  const [plan,           setPlan]           = useState<PersonalizedPlan | null>(null);
  const [todaySessionId, setTodaySessionId] = useState<string | null>(null);
  const [weekSessions,   setWeekSessions]   = useState<Array<{ created_at: string; severity_score?: number | null }>>([]);
  const [doneToday,      setDoneToday]      = useState<Set<number>>(new Set());
  const [refreshing,     setRefreshing]     = useState(false);
  const [loaded,         setLoaded]         = useState(false);

  const cardAnims = useRef(
    Array.from({ length: 5 }, () => ({
      opacity:    new Animated.Value(0),
      translateY: new Animated.Value(18),
    }))
  ).current;

  const heroGlowOpacity = useRef(new Animated.Value(0.4)).current;
  const heroGlowLoop    = useRef<Animated.CompositeAnimation | null>(null);

  const quickScales = useRef([
    new Animated.Value(1),
    new Animated.Value(1),
    new Animated.Value(1),
  ]).current;

  const springPress   = (a: Animated.Value) => Animated.spring(a, { toValue: 0.94, tension: 120, friction: 8, useNativeDriver: true }).start();
  const springRelease = (a: Animated.Value) => Animated.spring(a, { toValue: 1,    tension: 120, friction: 8, useNativeDriver: true }).start();

  const fetchData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const todayStart   = startOfDay(new Date()).toISOString();
    const sevenDaysAgo = subDays(startOfDay(new Date()), 6).toISOString();

    const [profileRes, skinRes, planRes, sessionRes, weekRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('skin_profiles').select('*').eq('user_id', user.id)
        .order('created_at', { ascending: false }).limit(1).single(),
      supabase.from('personalized_plans').select('*').eq('user_id', user.id)
        .eq('is_active', true).single(),
      supabase.from('scan_sessions').select('id').eq('user_id', user.id)
        .eq('status', 'completed').gte('created_at', todayStart)
        .order('created_at', { ascending: false }).limit(1).single(),
      supabase.from('scan_sessions').select('created_at, severity_score')
        .eq('user_id', user.id).eq('status', 'completed')
        .gte('created_at', sevenDaysAgo)
        .order('created_at', { ascending: true }),
    ]);

    if ((profileRes as any).data) setProfile((profileRes as any).data as Profile);
    if ((skinRes as any).data)    setSkinProfile((skinRes as any).data as SkinProfile);
    if ((planRes as any).data)    setPlan((planRes as any).data as PersonalizedPlan);
    setTodaySessionId((sessionRes as any).data?.id ?? null);
    setWeekSessions((weekRes.data ?? []) as Array<{ created_at: string; severity_score?: number | null }>);

    // Load mission completions from AsyncStorage
    try {
      const raw = await AsyncStorage.getItem(MISSIONS_KEY);
      if (raw) {
        const { doneRanks, date } = JSON.parse(raw);
        if (date === new Date().toDateString() && Array.isArray(doneRanks)) {
          setDoneToday(new Set<number>(doneRanks));
        } else {
          setDoneToday(new Set());
        }
      }
    } catch {}

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
    Animated.stagger(55,
      cardAnims.map(a =>
        Animated.parallel([
          Animated.timing(a.opacity,    { toValue: 1, duration: 380, useNativeDriver: true }),
          Animated.spring(a.translateY, { toValue: 0, tension: 60, friction: 8, useNativeDriver: true }),
        ])
      )
    ).start();

    heroGlowLoop.current = Animated.loop(
      Animated.sequence([
        Animated.timing(heroGlowOpacity, { toValue: 0.8, duration: 1500, useNativeDriver: true }),
        Animated.timing(heroGlowOpacity, { toValue: 0.4, duration: 1500, useNativeDriver: true }),
      ])
    );
    heroGlowLoop.current.start();
    return () => { heroGlowLoop.current?.stop(); };
  }, [loaded]);

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : (profile as any)?.email?.[0]?.toUpperCase() ?? '?';

  const Header = (
    <View style={[s.header, { paddingTop: insets.top + 12 }]}>
      <Text style={s.headerBrandText}>{t('home.title')}</Text>
      <TouchableOpacity style={s.avatarBtn} onPress={() => router.push('/profile')} activeOpacity={0.8}>
        <LinearGradient colors={[Colors.primaryLight, Colors.primary]} style={s.avatarGradient}>
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
  if (loaded && skinProfile) {
    const skinLabel = SKIN_TYPE_LABELS[skinProfile.skin_type] ?? skinProfile.skin_type;
    const skinDesc  = SKIN_TYPE_DESC[skinProfile.skin_type] ?? '';

    // Derive headline
    const headline = skinProfile.severity === 'mild'
      ? 'Mostly Clear Skin'
      : skinProfile.severity === 'moderate'
        ? `${skinLabel} Skin`
        : `Active ${skinLabel} Skin`;

    // Derive oil label
    const oilLabel = skinProfile.skin_type === 'oily' ? 'High'
      : skinProfile.skin_type === 'combination' ? 'Mixed'
      : skinProfile.skin_type === 'dry' ? 'Low' : 'Normal';
    const oilColor = skinProfile.skin_type === 'oily' ? '#FCD34D'
      : skinProfile.skin_type === 'combination' ? '#FCD34D' : 'rgba(255,255,255,0.7)';

    // Redness
    const rednessLabel = skinProfile.skin_type === 'sensitive' || skinProfile.severity === 'severe' ? 'High'
      : skinProfile.severity === 'moderate' ? 'Moderate' : 'Low';
    const rednessColor = skinProfile.skin_type === 'sensitive' || skinProfile.severity === 'severe' ? '#F87171'
      : skinProfile.severity === 'moderate' ? '#FCD34D' : '#4ADE80';

    // Plan items for "What to do today"
    const rankedItems: RankedItem[] = Array.isArray((plan as any)?.ranked_items)
      ? ((plan as any).ranked_items as RankedItem[]).slice().sort((a, b) => a.impact_rank - b.impact_rank)
      : [];
    const todoItems = rankedItems.slice(0, 3);

    return (
      <Animated.View style={[s.root, animatedStyle]}>
        <ScreenBackground preset="home" />
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator={false}
          overScrollMode="never"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primaryLight} />}
        >
          {Header}

          {/* ── Hero scan card ── */}
          <Animated.View style={{ opacity: cardAnims[0].opacity, transform: [{ translateY: cardAnims[0].translateY }], marginBottom: 12 }}>
            <TouchableOpacity
              activeOpacity={0.93}
              onPress={() => {
                if (todaySessionId) {
                  router.push({ pathname: '/(tabs)/scan', params: { loadSessionId: todaySessionId, loadTs: Date.now() } });
                } else {
                  router.push('/(tabs)/scan');
                }
              }}
            >
              <View style={s.heroCard}>
                {/* Top row */}
                <View style={s.heroTopRow}>
                  <Text style={s.heroEyebrow}>TODAY'S SKIN SNAPSHOT</Text>
                  <StreakCounter compact />
                </View>

                {/* Content row: text left, photo right */}
                <View style={s.heroBody}>
                  <View style={s.heroTextCol}>
                    <Text style={s.heroTitle}>
                      {headline}{' '}
                      <Text style={s.heroSparkle}>✦</Text>
                    </Text>
                    <Text style={s.heroDesc} numberOfLines={3}>
                      {skinProfile.analysis_notes ?? skinDesc}
                    </Text>
                  </View>
                  {skinProfile.photo_url ? (
                    <Image source={{ uri: skinProfile.photo_url }} style={s.heroPhoto} resizeMode="cover" />
                  ) : (
                    <View style={[s.heroPhoto, s.heroPhotoPlaceholder]} />
                  )}
                </View>

                {/* Metric chips */}
                <View style={s.metricChipsRow}>
                  <View style={s.metricChip}>
                    <TrendIcon size={13} color={getSeverityColor(skinProfile.severity)} />
                    <Text style={s.metricChipLabel}>Breakouts</Text>
                    <Text style={[s.metricChipValue, { color: getSeverityColor(skinProfile.severity) }]}>
                      {capitalize(skinProfile.severity ?? 'Mild')}
                    </Text>
                  </View>
                  <View style={s.metricChipDivider} />
                  <View style={s.metricChip}>
                    <DropletIcon size={13} color={oilColor} />
                    <Text style={s.metricChipLabel}>Oil</Text>
                    <Text style={[s.metricChipValue, { color: oilColor }]}>{oilLabel}</Text>
                  </View>
                  <View style={s.metricChipDivider} />
                  <View style={s.metricChip}>
                    <RadianceIcon size={13} color={rednessColor} />
                    <Text style={s.metricChipLabel}>Redness</Text>
                    <Text style={[s.metricChipValue, { color: rednessColor }]}>{rednessLabel}</Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          </Animated.View>

          {/* ── Quick actions ── */}
          <Animated.View style={{ opacity: cardAnims[1].opacity, transform: [{ translateY: cardAnims[1].translateY }], marginBottom: 12 }}>
            <View style={s.quickRow}>
              {([
                { icon: <PlanGridIcon size={20} color={Colors.primaryLight} />, title: t('home.quickAction.plan'), sub: t('home.quickAction.planSub'), route: '/(tabs)/plan' as const },
                { icon: <ScanLineIcon size={20} color={Colors.primaryLight} />, title: t('home.quickAction.rescan'), sub: t('home.quickAction.rescanSub'), route: '/(tabs)/scan' as const },
                { icon: <ChatBubbleIcon size={20} color={Colors.primaryLight} />, title: t('home.quickAction.coach'), sub: t('home.quickAction.coachSub'), route: '/coach' as const },
              ] as const).map((item, i) => (
                <Animated.View key={i} style={{ flex: 1, transform: [{ scale: quickScales[i] }] }}>
                  <TouchableOpacity
                    style={s.quickCard}
                    activeOpacity={1}
                    onPressIn={() => springPress(quickScales[i])}
                    onPressOut={() => springRelease(quickScales[i])}
                    onPress={() => router.push(item.route as any)}
                  >
                    <View style={s.quickIconBox}>{item.icon}</View>
                    <Text style={s.quickCardTitle}>{item.title}</Text>
                    <Text style={s.quickCardSub} numberOfLines={2}>{item.sub}</Text>
                    <View style={s.quickArrowCircle}>
                      <ChevronRight size={11} color="#fff" />
                    </View>
                  </TouchableOpacity>
                </Animated.View>
              ))}
            </View>
          </Animated.View>

          {/* ── Bottom two-column section ── */}
          <Animated.View style={{ opacity: cardAnims[2].opacity, transform: [{ translateY: cardAnims[2].translateY }] }}>
            <View style={s.bottomRow}>
              {/* What to do today */}
              <View style={s.todayCard}>
                <View style={s.todayCardHeader}>
                  <Text style={s.todayCardTitle}>What to do today{'  ✦'}</Text>
                  <TouchableOpacity onPress={() => router.push('/(tabs)/plan')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Text style={s.seeAllText}>See all</Text>
                  </TouchableOpacity>
                </View>
                {todoItems.length > 0 ? todoItems.map((item, i) => (
                  <View key={i} style={[s.todoItem, i < todoItems.length - 1 && s.todoItemBorder]}>
                    <View style={s.todoNumCircle}>
                      <Text style={s.todoNumText}>{i + 1}</Text>
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={s.todoTitle} numberOfLines={1}>{item.title}</Text>
                      <Text style={s.todoSub} numberOfLines={1}>{item.rationale}</Text>
                    </View>
                    {doneToday.has(item.impact_rank) && <CheckDoneIcon size={18} />}
                  </View>
                )) : (
                  <View style={s.todoEmpty}>
                    <Text style={s.todoEmptyText}>Generate your plan{'\n'}to see today's steps</Text>
                    <TouchableOpacity style={s.todoEmptyCta} onPress={() => router.push('/(tabs)/plan')}>
                      <Text style={s.todoEmptyCtaText}>Go to Plan</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* Right column: track + keep up */}
              <View style={s.rightCol}>
                <TouchableOpacity style={s.trackCard} activeOpacity={0.88} onPress={() => router.push('/(tabs)/progress' as any)}>
                  <Text style={s.trackTitle}>Track your progress</Text>
                  <Text style={s.trackSub}>This week</Text>
                  <View style={{ marginTop: 8 }}>
                    <WeekChart sessions={weekSessions} />
                  </View>
                </TouchableOpacity>

                <View style={s.keepUpCard}>
                  <View style={s.keepUpIconWrap}>
                    <HeartIcon size={22} color="#7C5CFC" />
                  </View>
                  <Text style={s.keepUpTitle}>Keep it up! ⭐</Text>
                  <Text style={s.keepUpSub}>Consistency is the key to healthy skin.</Text>
                </View>
              </View>
            </View>
          </Animated.View>

          <View style={{ height: 100 }} />
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primaryLight} />}
      >
        <View style={s.heroGlow} pointerEvents="none" />
        <View style={s.heroTextBlock}>
          <Text style={s.heroPreSubtitle}>Personalized scan results, routine, and progress in one place</Text>
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
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  headerBrandText: {
    fontFamily: Fonts.extrabold,
    fontSize: 28,
    color: Colors.white,
    letterSpacing: -0.3,
  },
  avatarBtn: {
    borderRadius: 20,
    overflow: 'hidden',
    ...Shadows.sm,
  },
  avatarGradient: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontFamily: Fonts.bold,
    fontSize: 14,
    color: Colors.white,
  },

  // Hero scan card
  heroCard: {
    backgroundColor: '#12092E',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(124,92,252,0.35)',
    ...Shadows.xl,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  heroEyebrow: {
    fontFamily: Fonts.semibold,
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  heroBody: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  heroTextCol: {
    flex: 1,
  },
  heroTitle: {
    fontFamily: Fonts.extrabold,
    fontSize: 24,
    color: '#fff',
    lineHeight: 30,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  heroSparkle: {
    color: '#4ADE80',
    fontSize: 20,
  },
  heroDesc: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    color: 'rgba(255,255,255,0.68)',
    lineHeight: 19,
  },
  heroPhoto: {
    width: 110,
    height: 148,
    borderRadius: 14,
  },
  heroPhotoPlaceholder: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },

  // Metric chips
  metricChipsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14,
    overflow: 'hidden',
  },
  metricChip: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  metricChipDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginVertical: 8,
  },
  metricChipLabel: {
    fontFamily: Fonts.regular,
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 1,
  },
  metricChipValue: {
    fontFamily: Fonts.bold,
    fontSize: 13,
    color: '#fff',
  },

  // Quick actions
  quickRow: {
    flexDirection: 'row',
    gap: 8,
  },
  quickCard: {
    backgroundColor: Colors.card,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 5,
    minHeight: 148,
  },
  quickIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(124,92,252,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  quickCardTitle: {
    fontFamily: Fonts.bold,
    fontSize: 14,
    color: '#fff',
  },
  quickCardSub: {
    fontFamily: Fonts.regular,
    fontSize: 11,
    color: Colors.textMuted,
    lineHeight: 15,
    flex: 1,
  },
  quickArrowCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'flex-end',
    marginTop: 2,
  },

  // Bottom two-column
  bottomRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'stretch',
  },

  // Today card
  todayCard: {
    flex: 1.15,
    backgroundColor: Colors.card,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  todayCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  todayCardTitle: {
    fontFamily: Fonts.bold,
    fontSize: 13,
    color: '#fff',
    flex: 1,
    marginRight: 4,
  },
  seeAllText: {
    fontFamily: Fonts.medium,
    fontSize: 12,
    color: Colors.primaryLight,
  },
  todoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 9,
  },
  todoItemBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.07)',
  },
  todoNumCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(124,92,252,0.22)',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  todoNumText: {
    fontFamily: Fonts.bold,
    fontSize: 12,
    color: Colors.primaryLight,
  },
  todoTitle: {
    fontFamily: Fonts.semibold,
    fontSize: 13,
    color: '#fff',
  },
  todoSub: {
    fontFamily: Fonts.regular,
    fontSize: 11,
    color: 'rgba(255,255,255,0.42)',
    marginTop: 1,
  },
  todoEmpty: {
    alignItems: 'center',
    paddingVertical: 16,
    gap: 12,
  },
  todoEmptyText: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  todoEmptyCta: {
    backgroundColor: 'rgba(124,92,252,0.2)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 7,
  },
  todoEmptyCtaText: {
    fontFamily: Fonts.semibold,
    fontSize: 12,
    color: Colors.primaryLight,
  },

  // Right column
  rightCol: {
    flex: 0.85,
    gap: 8,
  },
  trackCard: {
    backgroundColor: Colors.card,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  trackTitle: {
    fontFamily: Fonts.bold,
    fontSize: 13,
    color: '#fff',
    marginBottom: 2,
  },
  trackSub: {
    fontFamily: Fonts.regular,
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
  },
  keepUpCard: {
    backgroundColor: 'rgba(124,92,252,0.1)',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(124,92,252,0.22)',
    gap: 5,
  },
  keepUpIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(124,92,252,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  keepUpTitle: {
    fontFamily: Fonts.bold,
    fontSize: 13,
    color: '#fff',
  },
  keepUpSub: {
    fontFamily: Fonts.regular,
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    lineHeight: 16,
  },

  // Pre-scan hero
  heroContent: {
    paddingHorizontal: 20,
    flex: 1,
    justifyContent: 'center',
  },
  heroGlow: {
    position: 'absolute',
    top: -80,
    left: SW * 0.1,
    width: SW * 0.8,
    height: 400,
    borderRadius: 200,
    backgroundColor: 'rgba(91,33,182,0.18)',
  },
  heroTextBlock: {
    marginTop: Spacing.massive,
    marginBottom: Spacing.xxxl,
  },
  heroPreSubtitle: {
    fontFamily: Fonts.medium,
    fontSize: 13,
    color: Colors.textMuted,
    letterSpacing: 0.3,
    marginBottom: Spacing.lg,
    textTransform: 'uppercase',
  },
  heroPreTitle: {
    fontFamily: Fonts.extrabold,
    fontSize: 42,
    color: Colors.white,
    lineHeight: 48,
    letterSpacing: -1.2,
    marginBottom: Spacing.xl,
  },
  heroPreBody: {
    fontFamily: Fonts.regular,
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 23,
  },
  heroCta: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.pill,
    paddingVertical: 18,
    paddingHorizontal: Spacing.xxxl,
    alignSelf: 'center',
    ...Shadows.xl,
  },
  heroCtaText: {
    fontFamily: Fonts.bold,
    fontSize: 16,
    color: Colors.background,
    letterSpacing: 0.2,
  },
});
