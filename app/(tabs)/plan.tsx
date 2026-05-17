import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Animated,
  Dimensions,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useRouter, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Circle, Path, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import { supabase } from '@/lib/supabase';
import { useTabTransition } from '@/hooks/useTabTransition';
import { Colors, BorderRadius } from '@/lib/theme';
import ScreenBackground from '@/components/ScreenBackground';
import { PlanSkeleton } from '@/components/SkeletonLoader';
import type { Database, RankedItem, AcneType, SkinGoal, SkinGoalTag } from '@/lib/database.types';
import PickDetailModal from '@/components/PickDetailModal';
import { useTranslation } from 'react-i18next';
import { PRODUCTS } from '@/lib/products';

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

/* ── Time-of-day grouping (Morning / Night only) ── */
type TimeOfDay = 'morning' | 'night';

const PILLAR_TIME: Record<string, TimeOfDay> = {
  product:   'morning',
  diet:      'morning',
  lifestyle: 'morning',
  herbal:    'night',
};

/** Defensive: fold legacy 'midday'/'evening' values into morning/night. */
function bucketTime(raw: RankedItem['time_of_day'], pillar: string): TimeOfDay {
  if (raw === 'morning' || raw === 'night') return raw;
  if (raw === 'evening') return 'night';
  if (raw === 'midday')  return 'morning';
  return PILLAR_TIME[pillar] ?? 'morning';
}

/* ── Product image lookup ── */
const PRODUCT_BY_ID: Record<string, (typeof PRODUCTS)[number]> =
  Object.fromEntries(PRODUCTS.map(p => [p.id, p]));

/** Pillar → preferred product category, used to bias fuzzy-matching. */
const PILLAR_CATEGORY: Record<string, (typeof PRODUCTS)[number]['category']> = {
  product:   'Skincare',
  herbal:    'Herbal',
  diet:      'Foods',
  lifestyle: 'Accessories',
};

/** Fuzzy-match a plan item title to the closest product in the catalogue. */
function findBestProduct(title: string, pillar?: string): (typeof PRODUCTS)[number] | undefined {
  const preferred = pillar ? PILLAR_CATEGORY[pillar] : undefined;
  const words = title.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  let best: (typeof PRODUCTS)[number] | undefined;
  let bestScore = 0;
  for (const p of PRODUCTS) {
    const hay = (p.name + ' ' + p.description).toLowerCase();
    let score = words.reduce((n, w) => n + (hay.includes(w) ? 1 : 0), 0);
    if (preferred && p.category === preferred) score += 0.5;
    if (score > bestScore) { bestScore = score; best = p; }
  }
  if (best) return best;
  if (preferred) {
    const fallback = PRODUCTS.find(p => p.category === preferred);
    if (fallback) return fallback;
  }
  return PRODUCTS.find(p => p.category === 'Skincare');
}

/* ── Objective fallback for plans without skin_goal ── */
const OBJECTIVE_HEADLINE: Partial<Record<AcneType, string>> = {
  hormonal:     'Balance hormones, reduce inflammation, and support clear skin.',
  cystic:       'Deep cleanse, reduce cystic inflammation, and protect your barrier.',
  comedonal:    'Clear pores, reduce buildup, and maintain a clean routine.',
  fungal:       'Restore balance, eliminate fungal triggers, and protect your barrier.',
  inflammatory: 'Calm inflammation, strengthen your barrier, and stay consistent.',
};
const DEFAULT_OBJECTIVE = 'Calm skin, maintain hydration, and protect your barrier.';

const DESCRIPTION_FALLBACK: Partial<Record<AcneType, string>> = {
  hormonal:     'Based on your latest scan: hormonal patterns detected — focus on consistency and anti-inflammatory steps.',
  cystic:       'Based on your latest scan: deep cystic activity detected, prioritize barrier protection.',
  comedonal:    'Based on your latest scan: pore congestion is the main concern — keep your routine gentle.',
  fungal:       'Based on your latest scan: fungal triggers present — stick to antifungal-friendly products.',
  inflammatory: 'Based on your latest scan: inflammation is the primary concern — focus on calming your skin.',
};
const DEFAULT_DESCRIPTION = 'Based on your latest scan: follow your personalized routine for best results.';

const TAG_FALLBACKS: Partial<Record<AcneType, SkinGoalTag[]>> = {
  hormonal:     [{ kind: 'trend', label: 'Fluctuating' }, { kind: 'focus', label: 'Hormonal care' }],
  cystic:       [{ kind: 'trend', label: 'Active' },      { kind: 'focus', label: 'Deep cleanse' }],
  comedonal:    [{ kind: 'trend', label: 'Stable' },      { kind: 'zone',  label: 'T-zone' },       { kind: 'focus', label: 'Pore care' }],
  fungal:       [{ kind: 'trend', label: 'Sensitive' },   { kind: 'focus', label: 'Barrier care' }],
  inflammatory: [{ kind: 'trend', label: 'Stable' }, { kind: 'zone', label: 'Redness' }, { kind: 'focus', label: 'Barrier care' }],
};
const DEFAULT_TAGS: SkinGoalTag[] = [{ kind: 'trend', label: 'Stable' }, { kind: 'zone', label: 'Redness' }, { kind: 'focus', label: 'Barrier care' }];

const AVOID_FALLBACKS: Partial<Record<AcneType, string[]>> = {
  hormonal:     ["Avoid high-glycemic foods", "Don't skip your routine", "Limit dairy intake"],
  cystic:       ["Avoid oil-based products", "Don't squeeze cysts", "Skip abrasive scrubs"],
  comedonal:    ["Avoid heavy moisturizers", "Don't skip cleansing", "Skip occlusive oils"],
  fungal:       ["Avoid sugary foods", "Skip oily hair products", "Don't use harsh antibiotics"],
  inflammatory: ["Don't over-exfoliate", "Don't pick at spots", "Skip harsh new actives"],
};
const DEFAULT_AVOID = ["Don't over-exfoliate", "Don't pick at spots", "Skip harsh new actives"];

const COACH_FALLBACKS: Partial<Record<AcneType, string>> = {
  hormonal:     'Hormonal cycles affect your skin — stay consistent and give your routine time to work.',
  cystic:       'Deep cleansing and anti-inflammatory steps are key right now. Be patient with your skin.',
  comedonal:    'Consistent cleansing and avoiding pore-cloggers will make the biggest difference.',
  fungal:       'Stick to antifungal-friendly products and keep your routine simple today.',
  inflammatory: 'Your skin looks calm today. Keep the routine simple and stay consistent.',
};
const DEFAULT_COACH = 'Stay consistent with your routine and be gentle with your skin today.';

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
function FlameIcon({ size = 18, color = '#fff' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2c0 4-4 5-4 9a4 4 0 0 0 8 0c0-2-1-3-2-4 1 4-2 5-2 5s-2-2 0-10z"
        fill={color}
      />
      <Path
        d="M8 13a4 4 0 0 0 8 0c0-2-1-3-2-4"
        stroke={color} strokeWidth={1.4} strokeLinecap="round" fill="none" opacity={0.0}
      />
    </Svg>
  );
}

function SunIcon({ size = 18, color = '#fff' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={4} stroke={color} strokeWidth={1.8} fill="none" />
      <Path
        d="M12 2v2.5M12 19.5V22M4.22 4.22l1.77 1.77M18.01 18.01l1.77 1.77M2 12h2.5M19.5 12H22M4.22 19.78l1.77-1.77M18.01 5.99l1.77-1.77"
        stroke={color} strokeWidth={1.8} strokeLinecap="round"
      />
    </Svg>
  );
}

function MoonIcon({ size = 18, color = '#fff' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z"
        fill="none" stroke={color} strokeWidth={1.8} strokeLinejoin="round"
      />
    </Svg>
  );
}

function ClockIcon({ size = 12, color = 'rgba(255,255,255,0.45)' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={9} stroke={color} strokeWidth={1.8} fill="none" />
      <Path d="M12 7v5l3 2" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

function TrendUpIcon({ size = 14, color = '#34D399' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M3 17l6-6 4 4 8-9" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Path d="M14 6h7v7" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  );
}

function TargetIcon({ size = 14, color = '#A78BFA' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={9} stroke={color} strokeWidth={1.7} fill="none" />
      <Circle cx={12} cy={12} r={5} stroke={color} strokeWidth={1.7} fill="none" />
      <Circle cx={12} cy={12} r={1.6} fill={color} />
    </Svg>
  );
}

function ShieldIcon({ size = 14, color = '#60A5FA' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z" stroke={color} strokeWidth={1.7} fill="none" strokeLinejoin="round" />
      <Path d="M9 12l2 2 4-4" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  );
}

function SparkleIcon({ size = 20, color = '#A78BFA' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 3l1.8 5.4L19 10l-5.2 1.6L12 17l-1.8-5.4L5 10l5.2-1.6L12 3z" fill={color} />
    </Svg>
  );
}

function ChevronRightIcon({ size = 18, color = 'rgba(255,255,255,0.6)' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M9 6l6 6-6 6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
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

/* ── Avoid-today bullet icons (cycle by index) ── */
function DotsIcon({ size = 18, color = '#A78BFA' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {[6, 12, 18].map(y => (
        [6, 12, 18].map(x => <Circle key={`${x}-${y}`} cx={x} cy={y} r={1.2} fill={color} />)
      ))}
    </Svg>
  );
}
function HandIcon({ size = 18, color = '#A78BFA' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={11} r={5.5} stroke={color} strokeWidth={1.6} fill="none" />
      <Path d="M9 10c.5-.6 1.5-1 3-1s2.5.4 3 1" stroke={color} strokeWidth={1.4} strokeLinecap="round" fill="none" />
      <Circle cx={10} cy={11.5} r={0.7} fill={color} />
      <Circle cx={14} cy={11.5} r={0.7} fill={color} />
      <Path d="M10 14c.5.5 1.2.8 2 .8s1.5-.3 2-.8" stroke={color} strokeWidth={1.3} strokeLinecap="round" fill="none" />
    </Svg>
  );
}
function FlaskIcon({ size = 18, color = '#A78BFA' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.7 3h10.6a2 2 0 0 0 1.7-3l-5-9V3" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  );
}
const AVOID_ICONS: Array<(p: { size?: number; color?: string }) => JSX.Element> = [
  DotsIcon, HandIcon, FlaskIcon,
];

/* ── Pillar fallback thumbnails for non-product steps ── */
const PILLAR_THUMB_GRADIENT: Record<string, readonly [string, string]> = {
  diet:      ['#0E7A4A', '#0A5C36'],
  herbal:    ['#0E7A4A', '#1B4332'],
  lifestyle: ['#6E45E8', '#4F22BE'],
  product:   ['#1F1147', '#0E0930'],
};
function PillarThumbIcon({ pillar, size = 28 }: { pillar: string; size?: number }) {
  const c = '#fff';
  if (pillar === 'diet') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M12 2C8 2 5 6 5 10c0 3.5 2.5 6.5 6 7.4V20h2v-2.6c3.5-.9 6-3.9 6-7.4 0-4-3-8-7-8z"
          stroke={c} strokeWidth={1.6} fill="none" strokeLinejoin="round" />
        <Path d="M12 6v6" stroke={c} strokeWidth={1.4} strokeLinecap="round" />
      </Svg>
    );
  }
  if (pillar === 'herbal') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M12 22V12" stroke={c} strokeWidth={1.6} strokeLinecap="round" />
        <Path d="M12 12C12 12 7 10 5 5c4 0 7 3 7 7z" stroke={c} strokeWidth={1.5} fill="none" strokeLinejoin="round" />
        <Path d="M12 12C12 12 17 10 19 5c-4 0-7 3-7 7z" stroke={c} strokeWidth={1.5} fill="none" strokeLinejoin="round" />
      </Svg>
    );
  }
  if (pillar === 'lifestyle') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Circle cx={12} cy={12} r={4} stroke={c} strokeWidth={1.6} fill="none" />
        <Path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.93 4.93l2.12 2.12M16.95 16.95l2.12 2.12M4.93 19.07l2.12-2.12M16.95 7.05l2.12-2.12"
          stroke={c} strokeWidth={1.4} strokeLinecap="round" />
      </Svg>
    );
  }
  // product
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M9 2h6l1 4H8L9 2z" stroke={c} strokeWidth={1.6} fill="none" strokeLinejoin="round" />
      <Path d="M7 6h10l1 14H6L7 6z" stroke={c} strokeWidth={1.6} fill="none" strokeLinejoin="round" />
    </Svg>
  );
}

/* ─────────────────────────────────────────────────────────
   SkinGoalCard
   ───────────────────────────────────────────────────────── */
function tagIconFor(kind: SkinGoalTag['kind']): { Icon: (p: { size?: number; color?: string }) => JSX.Element; color: string; bg: string; border: string } {
  switch (kind) {
    case 'trend': return { Icon: TrendUpIcon, color: '#34D399', bg: 'rgba(52,211,153,0.10)',  border: 'rgba(52,211,153,0.35)' };
    case 'zone':  return { Icon: TargetIcon,  color: '#A78BFA', bg: 'rgba(167,139,250,0.10)', border: 'rgba(167,139,250,0.35)' };
    case 'focus':
    default:      return { Icon: ShieldIcon,  color: '#60A5FA', bg: 'rgba(96,165,250,0.10)',  border: 'rgba(96,165,250,0.35)' };
  }
}

function SkinGoalCard({ goal, doneCount, totalCount, fallbackHeadline, fallbackDescription, fallbackTags }: {
  goal: SkinGoal | null | undefined;
  doneCount: number;
  totalCount: number;
  fallbackHeadline: string;
  fallbackDescription: string;
  fallbackTags: SkinGoalTag[];
}) {
  const pct = totalCount > 0 ? doneCount / totalCount : 0;
  const headline    = goal?.headline    ?? fallbackHeadline;
  const description = goal?.description || fallbackDescription;
  const tags        = goal?.tags?.length ? goal.tags : fallbackTags;

  return (
    <View style={sg.card}>
      <Text style={sg.eyebrow}>TODAY'S SKIN GOAL</Text>
      <Text
        style={sg.headline}
        numberOfLines={2}
        adjustsFontSizeToFit
        minimumFontScale={0.65}
      >{headline}</Text>

      {tags.length > 0 && (
        <View style={sg.tagRow}>
          {tags.map((t, i) => {
            const meta = tagIconFor(t.kind);
            const Icon = meta.Icon;
            return (
              <View key={i} style={[sg.tag, { backgroundColor: meta.bg, borderColor: meta.border }]}>
                <Icon size={13} color={meta.color} />
                <Text style={[sg.tagText, { color: meta.color }]}>{t.label}</Text>
              </View>
            );
          })}
        </View>
      )}

      <View style={sg.divider} />

      <View style={sg.footer}>
        <Text style={sg.footerText}>{doneCount} of {totalCount} steps completed</Text>
        <View style={sg.barTrack}>
          <View style={[sg.barFill, { width: `${Math.round(pct * 100)}%` as any }]} />
        </View>
      </View>
    </View>
  );
}

const sg = StyleSheet.create({
  card: {
    marginHorizontal: 16, marginBottom: 8,
    borderRadius: 16, borderWidth: 1,
    borderColor: 'rgba(124,92,252,0.28)',
    backgroundColor: 'rgba(14,11,31,0.97)',
    padding: 12,
  },
  eyebrow:     { fontSize: 10, fontWeight: '800', color: '#A78BFA', letterSpacing: 1.6, marginBottom: 5 },
  headline:    { fontSize: 16, fontWeight: '800', color: '#fff', lineHeight: 21, letterSpacing: -0.3 },
  description: { fontSize: 12, color: 'rgba(255,255,255,0.55)', lineHeight: 16, marginTop: 4 },
  tagRow:      { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  tag: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 9, paddingVertical: 4,
    borderRadius: 999, borderWidth: 1,
  },
  tagText:    { fontSize: 11, fontWeight: '600' },
  divider:    { height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255,255,255,0.08)', marginTop: 10 },
  footer:     { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  footerText: { fontSize: 11, color: 'rgba(255,255,255,0.55)' },
  barTrack:   { flex: 1, height: 4, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 2, overflow: 'hidden' },
  barFill:    { height: '100%', backgroundColor: '#7C5CFC', borderRadius: 2 },
});

/* ─────────────────────────────────────────────────────────
   TimeOfDayTabs (Morning / Night)
   ───────────────────────────────────────────────────────── */
function TimeOfDayTabs({ value, onChange }: { value: TimeOfDay; onChange: (v: TimeOfDay) => void }) {
  return (
    <View style={tt.row}>
      {(['morning', 'night'] as TimeOfDay[]).map(tab => {
        const active = tab === value;
        const Icon = tab === 'morning' ? SunIcon : MoonIcon;
        return (
          <TouchableOpacity
            key={tab}
            style={tt.tabWrap}
            activeOpacity={0.85}
            onPress={() => {
              if (tab !== value) {
                Haptics.selectionAsync();
                onChange(tab);
              }
            }}
          >
            {active ? (
              <LinearGradient
                colors={['#7C5CFC', '#5B36E0']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={tt.tabInner}
              >
                <Icon size={16} color="#fff" />
                <Text style={[tt.tabText, { color: '#fff' }]}>{tab === 'morning' ? 'Morning' : 'Night'}</Text>
              </LinearGradient>
            ) : (
              <View style={[tt.tabInner, tt.tabInactive]}>
                <Icon size={16} color="rgba(255,255,255,0.55)" />
                <Text style={[tt.tabText, { color: 'rgba(255,255,255,0.55)' }]}>
                  {tab === 'morning' ? 'Morning' : 'Night'}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const tt = StyleSheet.create({
  row: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 8, gap: 8 },
  tabWrap: { flex: 1 },
  tabInner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    paddingVertical: 9, borderRadius: 12,
  },
  tabInactive: { backgroundColor: 'rgba(14,11,31,0.97)', borderWidth: 1, borderColor: 'rgba(124,92,252,0.25)' },
  tabText: { fontSize: 13, fontWeight: '700', letterSpacing: 0.1 },
});

/* ─────────────────────────────────────────────────────────
   StepRow (redesigned: circle checkbox + product thumbnail)
   ───────────────────────────────────────────────────────── */
function StepRow({ item, done, onToggle, onOpen }: {
  item: RankedItem;
  done: boolean;
  onToggle: () => void;
  onOpen: () => void;
}) {
  const [imgError, setImgError] = useState(false);
  const exactProduct = item.product_id ? PRODUCT_BY_ID[item.product_id] : undefined;
  const product = exactProduct ?? findBestProduct(item.title, item.pillar);
  const showImage = !!product?.image_url && !imgError;
  const durationMin = item.duration_min ?? (item.pillar === 'product' ? 1 : 5);
  const gradient = PILLAR_THUMB_GRADIENT[item.pillar] ?? PILLAR_THUMB_GRADIENT.product;


  return (
    <TouchableOpacity style={sr.row} activeOpacity={0.85} onPress={onOpen}>
      {/* Checkbox */}
      <TouchableOpacity
        onPress={(e) => { e.stopPropagation(); onToggle(); }}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        style={[sr.checkbox, done && sr.checkboxDone]}
      >
        {done && (
          <Svg width={12} height={12} viewBox="0 0 12 12">
            <Path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </Svg>
        )}
      </TouchableOpacity>

      {/* Thumbnail */}
      <View style={sr.thumbWrap}>
        {showImage ? (
          <Image
            source={{ uri: product!.image_url }}
            style={sr.thumbImage}
            resizeMode="cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <LinearGradient
            colors={gradient}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={sr.thumbFallback}
          >
            <PillarThumbIcon pillar={item.pillar} size={22} />
          </LinearGradient>
        )}
      </View>

      {/* Text */}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[sr.title, done && sr.titleDone]} numberOfLines={1}>{item.title}</Text>
        <Text style={sr.desc} numberOfLines={2}>{item.rationale}</Text>
      </View>

      {/* Duration */}
      <View style={sr.metaCol}>
        <ClockIcon size={12} />
        <Text style={sr.metaText}>{durationMin} min</Text>
      </View>
    </TouchableOpacity>
  );
}

const sr = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: 16, marginBottom: 6,
    padding: 8,
    borderRadius: 14, borderWidth: 1,
    borderColor: 'rgba(124,92,252,0.25)',
    backgroundColor: 'rgba(14,11,31,0.97)',
  },
  checkbox: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 1.8, borderColor: '#7C5CFC',
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  checkboxDone: { backgroundColor: '#7C5CFC', borderColor: '#7C5CFC' },
  thumbWrap: {
    width: 48, height: 48, borderRadius: 10, overflow: 'hidden',
    backgroundColor: '#F5F5F5',
  },
  thumbImage:    { width: '100%', height: '100%' },
  thumbFallback: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title:    { fontSize: 14, fontWeight: '700', color: '#fff', letterSpacing: -0.15 },
  titleDone:{ textDecorationLine: 'line-through', color: 'rgba(255,255,255,0.45)' },
  desc:     { fontSize: 11, color: 'rgba(255,255,255,0.55)', lineHeight: 15, marginTop: 2 },
  metaCol:  { alignItems: 'center', gap: 3, minWidth: 38 },
  metaText: { fontSize: 10, color: 'rgba(255,255,255,0.55)', fontWeight: '500' },
});

/* ─────────────────────────────────────────────────────────
   AvoidTodayCard + CoachNoteCard (2-column footer)
   ───────────────────────────────────────────────────────── */
function AvoidTodayCard({ items }: { items: string[] }) {
  return (
    <View style={fc.card}>
      <Text style={fc.eyebrow}>AVOID TODAY</Text>
      <View style={{ gap: 7, marginTop: 8 }}>
        {items.slice(0, 3).map((text, i) => {
          const Icon = AVOID_ICONS[i % AVOID_ICONS.length];
          return (
            <View key={i} style={fc.bullet}>
              <View style={fc.bulletIcon}>
                <Icon size={16} color="#A78BFA" />
              </View>
              <Text style={fc.bulletText} numberOfLines={2}>{text}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function CoachNoteCard({ text }: { text: string }) {
  return (
    <View style={fc.card}>
      <Text style={fc.eyebrow}>COACH NOTE</Text>
      <View style={fc.coachIcon}>
        <SparkleIcon size={16} color="#A78BFA" />
      </View>
      <Text style={fc.coachText}>{text}</Text>
    </View>
  );
}

const fc = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 14, borderWidth: 1,
    borderColor: 'rgba(124,92,252,0.25)',
    backgroundColor: 'rgba(14,11,31,0.97)',
    padding: 10,
  },
  eyebrow: { fontSize: 10, fontWeight: '800', color: '#A78BFA', letterSpacing: 1.6 },
  bullet:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bulletIcon: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: 'rgba(124,92,252,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  bulletText: { flex: 1, fontSize: 11, color: '#fff', fontWeight: '500', lineHeight: 15 },
  coachIcon: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: 'rgba(124,92,252,0.14)',
    alignItems: 'center', justifyContent: 'center',
    marginTop: 8, marginBottom: 6,
  },
  coachText: { fontSize: 11, color: '#fff', fontWeight: '500', lineHeight: 16 },
});

/* ─────────────────────────────────────────────────────────
   Bottom progress bar (sticky, with N/M ring + chevron)
   ───────────────────────────────────────────────────────── */
function BottomProgressBar({ done, total, onPress }: { done: number; total: number; onPress: () => void }) {
  const pct = total > 0 ? done / total : 0;
  const size = 40, stroke = 3;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dash = pct * circ;

  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={bp.outer}>
      <LinearGradient
        colors={['rgba(124,92,252,0.25)', 'rgba(91,54,224,0.10)']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={bp.inner}>
        <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
          <Svg width={size} height={size} style={{ position: 'absolute' }}>
            <Circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.10)" strokeWidth={stroke} fill="none" />
            <Circle cx={size / 2} cy={size / 2} r={r} stroke="#7C5CFC" strokeWidth={stroke} fill="none"
              strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
              rotation="-90" origin={`${size / 2},${size / 2}`} />
          </Svg>
          <Text style={bp.ringText}>{done}/{total}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={bp.title}>{done}/{total} complete today</Text>
          <Text style={bp.sub}>Small steps every day lead to clear skin.</Text>
        </View>
        <ChevronRightIcon size={20} color="rgba(255,255,255,0.7)" />
      </View>
    </TouchableOpacity>
  );
}

const bp = StyleSheet.create({
  outer: {
    marginHorizontal: 16, marginTop: 4,
    borderRadius: 14, borderWidth: 1,
    borderColor: 'rgba(124,92,252,0.32)',
    overflow: 'hidden',
  },
  inner: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10 },
  ringText: { fontSize: 10, fontWeight: '800', color: '#fff' },
  title: { fontSize: 13, fontWeight: '700', color: '#fff' },
  sub:   { fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 1 },
});

/* ─────────────────────────────────────────────────────────
   Main screen
   ───────────────────────────────────────────────────────── */
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
  const [activeTab,    setActiveTab]    = useState<TimeOfDay>('morning');

  const allDoneRef    = useRef(false);
  const streakScaleAnim = useRef(new Animated.Value(1)).current;
  const xpBarAnim       = useRef(new Animated.Value(0)).current;
  const scrollRef       = useRef<ScrollView>(null);

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
    setDoneToday(new Set());
    try {
      const body: Record<string, unknown> = { skin_profile_id: skinProfile.id };
      const currentItems = (plan?.ranked_items as unknown as RankedItem[]) ?? [];
      if (currentItems.length > 0) {
        body.existing_plan = currentItems;
      }
      const { error } = await supabase.functions.invoke('generate-plan', { body });
      if (error) throw error;
      await fetchPlan();
    } catch (err) {
      console.error('generate-plan error:', err);
      Alert.alert('Error', 'Could not generate your plan. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  /* ── Derived data (memoized so toggleMission references stable values) ── */
  const rankedItems: RankedItem[] = useMemo(
    () => (plan?.ranked_items as unknown as RankedItem[]) ?? [],
    [plan]
  );
  const sortedItems = useMemo(
    () => [...rankedItems].sort((a, b) => a.impact_rank - b.impact_rank),
    [rankedItems]
  );
  const morningItems = sortedItems.filter(i => bucketTime(i.time_of_day, i.pillar) === 'morning').slice(0, 4);
  const nightItems   = sortedItems.filter(i => bucketTime(i.time_of_day, i.pillar) === 'night').slice(0, 4);
  const allVisible   = [...morningItems, ...nightItems];

  const totalItems = allVisible.length;
  const doneCount  = allVisible.filter(i => doneToday.has(i.impact_rank)).length;
  const progress   = totalItems > 0 ? doneCount / totalItems : 0;
  const fallbackObjective = acneType ? (OBJECTIVE_HEADLINE[acneType] ?? DEFAULT_OBJECTIVE) : DEFAULT_OBJECTIVE;

  const visibleItems = activeTab === 'morning' ? morningItems : nightItems;

  const skinGoal:   SkinGoal | null = (plan?.skin_goal as unknown as SkinGoal | null) ?? null;
  const avoidToday: string[]        = Array.isArray(plan?.avoid_today) && (plan!.avoid_today as string[]).length > 0
    ? (plan!.avoid_today as string[])
    : (acneType ? AVOID_FALLBACKS[acneType] : undefined) ?? DEFAULT_AVOID;
  const coachNote:  string          =
    ((plan?.coach_note as string | null) || null) ??
    (acneType ? COACH_FALLBACKS[acneType] : null) ??
    DEFAULT_COACH;
  const fallbackDescription = (acneType ? DESCRIPTION_FALLBACK[acneType] : undefined) ?? DEFAULT_DESCRIPTION;
  const fallbackTags        = (acneType ? TAG_FALLBACKS[acneType] : undefined) ?? DEFAULT_TAGS;

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

    const nowAllDone = allVisible.length > 0 && allVisible.every(i => nextDone.has(i.impact_rank));
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

      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View style={s.header}>
          <View style={s.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.eyebrow}>YOUR PLAN</Text>
              <Text style={s.title}>Today's Plan</Text>
              <Text style={s.subtitle}>Your personalized routine based on today's scan</Text>
            </View>
            <Animated.View style={{ transform: [{ scale: streakScaleAnim }] }}>
              <LinearGradient
                colors={['#6E46FF', '#8B5CFF']}
                style={s.streakPill}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              >
                <View style={s.streakTopRow}>
                  <FlameIcon size={18} color="#fff" />
                  <Text style={s.streakNumber}>{streak.count}</Text>
                </View>
                <Text style={s.streakLabel}>DAY STREAK</Text>
              </LinearGradient>
            </Animated.View>
          </View>
        </View>

        {/* ── Skin goal ── */}
        <SkinGoalCard
          goal={skinGoal}
          doneCount={doneCount}
          totalCount={totalItems}
          fallbackHeadline={fallbackObjective}
          fallbackDescription={fallbackDescription}
          fallbackTags={fallbackTags}
        />

        {/* ── Morning / Night tabs ── */}
        <TimeOfDayTabs value={activeTab} onChange={setActiveTab} />

        {/* ── Step rows ── */}
        {visibleItems.length === 0 ? (
          <View style={s.emptyTabWrap}>
            <Text style={s.emptyTabText}>
              No {activeTab === 'morning' ? 'morning' : 'night'} steps in this plan.
            </Text>
          </View>
        ) : (
          visibleItems.map(item => (
            <StepRow
              key={item.impact_rank}
              item={item}
              done={doneToday.has(item.impact_rank)}
              onToggle={() => toggleMission(item)}
              onOpen={() => setSelectedPick(item)}
            />
          ))
        )}

        {/* ── Avoid Today + Coach Note (2-column) ── */}
        <View style={s.footerRow}>
          <AvoidTodayCard items={avoidToday} />
          <CoachNoteCard  text={coachNote} />
        </View>

        {/* ── Bottom progress card ── */}
        <BottomProgressBar
          done={doneCount}
          total={totalItems}
          onPress={() => scrollRef.current?.scrollTo({ y: 0, animated: true })}
        />

        {/* Regenerate */}
        <TouchableOpacity style={s.regenRow} onPress={generatePlan} disabled={generating}>
          <Text style={s.regenText}>{generating ? t('plan.generating') : t('plan.regenerate')}</Text>
        </TouchableOpacity>

        <View style={{ height: 60 }} />
      </ScrollView>

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

  header:    { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  eyebrow:   { fontSize: 10, fontWeight: '800', color: '#A78BFA', letterSpacing: 1.6, textTransform: 'uppercase', marginBottom: 3 },
  title:     { fontSize: 26, fontWeight: '900', color: '#fff', letterSpacing: -0.8, lineHeight: 30 },
  subtitle:  { fontSize: 12, color: 'rgba(255,255,255,0.55)', marginTop: 2, lineHeight: 16 },

  streakPill:   {
    borderRadius: 14, paddingVertical: 8, paddingHorizontal: 12,
    alignItems: 'center', minWidth: 86,
    borderWidth: 1, borderColor: 'rgba(167,139,250,0.45)',
  },
  streakTopRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  streakNumber: { fontSize: 22, fontWeight: '900', color: '#fff', lineHeight: 26 },
  streakLabel:  { fontSize: 9, fontWeight: '800', color: 'rgba(255,255,255,0.85)', letterSpacing: 1.4, marginTop: 2 },

  scrollContent: { paddingTop: 2, paddingBottom: 16 },

  footerRow: { flexDirection: 'row', gap: 8, marginHorizontal: 16, marginTop: 6, marginBottom: 4 },

  emptyTabWrap: { alignItems: 'center', paddingVertical: 36, marginHorizontal: 16 },
  emptyTabText: { fontSize: 13, color: 'rgba(255,255,255,0.5)' },

  regenRow:  { alignItems: 'center', paddingVertical: 8 },
  regenText: { fontSize: 12, color: 'rgba(255,255,255,0.35)', fontWeight: '500' },

  emptyTitle:       { fontSize: 20, fontWeight: '800', color: Colors.text, textAlign: 'center' },
  emptySubtitle:    { fontSize: 14, color: Colors.textMuted, textAlign: 'center', lineHeight: 22 },
  generateBtn:      { width: '100%', borderRadius: BorderRadius.md, overflow: 'hidden', marginTop: 8 },
  generateGradient: { height: 54, justifyContent: 'center', alignItems: 'center' },
  generateBtnText:  { fontSize: 16, fontWeight: '700', color: Colors.white },
});
