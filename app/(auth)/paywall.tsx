import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Svg, {
  Circle,
  Defs,
  RadialGradient,
  Stop,
  Path,
  Line,
  Rect,
  Ellipse,
  G,
} from 'react-native-svg';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Fonts } from '@/lib/theme';
import { supabase } from '@/lib/supabase';

const PURPLE = '#B69BFF';
const TEXT = '#FFFFFF';
const BG = '#050507';

export default function PaywallScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ profileId?: string; from?: string }>();
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);

  const onContinue = async () => {
    if (step === 1) {
      setStep(2);
      return;
    }
    if (busy) return;
    setBusy(true);
    try {
      if (params.from === 'scan' && params.profileId) {
        await supabase.auth.refreshSession();
        const { error } = await supabase.functions.invoke('generate-plan', {
          body: { skin_profile_id: params.profileId },
        });
        if (error) {
          Alert.alert('Plan Generation Failed', error.message ?? 'Please try again.');
          setBusy(false);
          return;
        }
        router.replace('/(tabs)/plan');
        return;
      }
      router.replace('/(tabs)');
    } catch (e: any) {
      Alert.alert('Something went wrong', e?.message ?? 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={[sh.screen, { paddingTop: insets.top, paddingBottom: insets.bottom + 16 }]}>
      {step === 1 ? (
        <Step1Content onContinue={onContinue} />
      ) : (
        <Step2Content onContinue={onContinue} busy={busy} />
      )}
    </View>
  );
}

// ─── Step 1: Your skin plan, made simple ────────────────────────────────────

function Step1Content({ onContinue }: { onContinue: () => void }) {
  return (
    <View style={s1.content}>
      <View style={s1.topGroup}>
        <View style={s1.sparkleWrap}>
          <SparkleGlow />
        </View>
        <Text style={s1.title}>Your skin plan,</Text>
        <Text style={s1.titleItalic}>made simple</Text>
        <Text style={s1.subtitle}>
          Know what to fix first, what to use,{'\n'}and how to stay consistent.
        </Text>
      </View>

      <View style={s1.bottomGroup}>
        <View style={s1.cards}>
          <FeatureCard
            icon={<TargetIcon />}
            title="Skin priorities"
            description={`We analyze your skin and\nidentify what to focus on first.`}
          />
          <FeatureCard
            icon={<SunMoonIcon />}
            title="AM / PM routine"
            description={`Personalized routines tailored\nfor your day and night.`}
          />
          <FeatureCard
            icon={<DropletIcon />}
            title="Ingredient guide"
            description={`Understand key ingredients\nand what works for your skin.`}
          />
        </View>

        <Pressable style={s1.button} onPress={onContinue}>
          <Text style={s1.buttonText}>Continue</Text>
        </Pressable>

        <View style={s1.footerRow}>
          <LockIcon color="rgba(255,255,255,0.55)" />
          <Text style={s1.footerText}>Takes 30 seconds</Text>
        </View>
      </View>
    </View>
  );
}

// ─── Step 2: We found what your skin needs next ──────────────────────────────

function Step2Content({ onContinue, busy }: { onContinue: () => void; busy: boolean }) {
  return (
    <View style={s2.container}>
      {/* Step indicator */}
      <StepIndicator current={2} total={3} />

      {/* Title block */}
      <View style={s2.titleBlock}>
        <Text style={s2.title}>
          {'We found what\n'}
          <Text style={s2.titlePurple}>your skin</Text>
          <Text style={s2.titleWhite}>{' needs next '}</Text>
          <Text style={s2.sparkle}>✦</Text>
        </Text>
        <Text style={s2.subtitle}>
          Based on your scan, SkinX identified{'\n'}the biggest patterns affecting your skin.
        </Text>
      </View>

      {/* Results card */}
      <View style={s2.card}>
        {/* Card header */}
        <View style={s2.cardHeader}>
          <ScanCompleteIcon />
          <View style={s2.cardHeaderText}>
            <Text style={s2.scanLabel}>SCAN COMPLETE</Text>
            <Text style={s2.scanSub}>Personalized from your scan</Text>
          </View>
        </View>

        {/* Result rows */}
        <ResultRow
          icon={<BreakoutIcon />}
          title="Breakout trigger detected"
          desc="We found a key trigger driving your breakouts."
          locked="High sensitivity to certain ingredients"
        />
        <ResultRow
          icon={<BarrierIcon />}
          title="Barrier stress risk"
          desc="Your skin barrier shows signs of strain."
          locked="Elevated risk due to environment + actives"
        />
        <ResultRow
          icon={<DarkMarkIcon />}
          title="Dark mark pattern"
          desc="We mapped your unique pigmentation pattern."
          locked="Post-acne marks + uneven tone"
        />
        <ResultRow
          icon={<ProductMismatchIcon />}
          title="Product mismatch"
          desc="Some products in your routine may not be ideal."
          locked="2 products may be working against you"
        />
        <ResultRow
          icon={<RoutineGapIcon />}
          title="Routine gap"
          desc="Key steps your skin is missing right now."
          locked="Hydration + repair gap detected"
          last
        />
      </View>

      {/* CTA */}
      <View style={s2.bottom}>
        <Pressable onPress={onContinue} disabled={busy} style={{ width: '100%' }}>
          <LinearGradient
            colors={['#A259FF', '#7C3AED']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={s2.button}
          >
            {busy ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Text style={s2.buttonText}>Reveal my plan</Text>
                <Text style={s2.buttonArrow}>→</Text>
              </>
            )}
          </LinearGradient>
        </Pressable>

        <View style={s2.footerRow}>
          <LockIcon color="rgba(255,255,255,0.45)" />
          <Text style={s2.footerText}>Built from your scan</Text>
        </View>
      </View>
    </View>
  );
}

// ─── Step indicator ──────────────────────────────────────────────────────────

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <View style={si.wrapper}>
      <View style={si.row}>
        {Array.from({ length: total }).map((_, i) => {
          const n = i + 1;
          const active = n === current;
          return (
            <React.Fragment key={n}>
              <View style={[si.circle, active && si.circleActive]}>
                <Text style={[si.num, active && si.numActive]}>{n}</Text>
              </View>
              {i < total - 1 && <View style={si.line} />}
            </React.Fragment>
          );
        })}
      </View>
      <Text style={si.label}>{current} of {total}</Text>
    </View>
  );
}

// ─── Result row ──────────────────────────────────────────────────────────────

function ResultRow({
  icon, title, desc, locked, last,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  locked: string;
  last?: boolean;
}) {
  return (
    <View style={[s2.row, !last && s2.rowBorder]}>
      <View style={s2.rowIcon}>{icon}</View>
      <View style={s2.rowText}>
        <Text style={s2.rowTitle}>{title}</Text>
        <Text style={s2.rowDesc}>{desc}</Text>
      </View>
      <View style={s2.lockedWrap}>
        <Text style={s2.lockedText}>{locked}</Text>
        <BlurView intensity={22} tint="dark" style={StyleSheet.absoluteFill} />
      </View>
      <LockIcon color="rgba(168,85,247,0.7)" />
    </View>
  );
}

// ─── Sparkle glow (step 1) ───────────────────────────────────────────────────

function SparkleGlow() {
  return (
    <Svg width={150} height={150} viewBox="0 0 150 150">
      <Defs>
        <RadialGradient id="sgo" cx="50%" cy="50%" rx="50%" ry="50%" fx="50%" fy="50%">
          <Stop offset="0%" stopColor="#5B21B6" stopOpacity="0.85" />
          <Stop offset="55%" stopColor="#4C1D95" stopOpacity="0.4" />
          <Stop offset="100%" stopColor="#2E1065" stopOpacity="0" />
        </RadialGradient>
        <RadialGradient id="sgi" cx="50%" cy="48%" rx="38%" ry="38%" fx="50%" fy="48%">
          <Stop offset="0%" stopColor="#7C3AED" stopOpacity="0.7" />
          <Stop offset="60%" stopColor="#6D28D9" stopOpacity="0.3" />
          <Stop offset="100%" stopColor="#5B21B6" stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Circle cx="75" cy="75" r="75" fill="url(#sgo)" />
      <Circle cx="75" cy="68" r="42" fill="url(#sgi)" />
      <Path
        d="M75 42 C76 60,83 67,101 68 C83 69,76 76,75 94 C74 76,67 69,49 68 C67 67,74 60,75 42 Z"
        fill={PURPLE}
      />
    </Svg>
  );
}

// ─── Feature card (step 1) ───────────────────────────────────────────────────

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <View style={s1.featureCard}>
      <View style={s1.iconCircle}>{icon}</View>
      <View style={s1.cardTextWrap}>
        <Text style={s1.cardTitle}>{title}</Text>
        <Text style={s1.cardDesc}>{description}</Text>
      </View>
      <ChevronIcon />
    </View>
  );
}

// ─── Icons ───────────────────────────────────────────────────────────────────

function TargetIcon() {
  return (
    <Svg width={32} height={32} viewBox="0 0 28 28" fill="none">
      <Circle cx={14} cy={14} r={7.5} stroke={PURPLE} strokeWidth={1.7} />
      <Circle cx={14} cy={14} r={3.2} stroke={PURPLE} strokeWidth={1.7} />
      <Circle cx={14} cy={14} r={1.2} fill={PURPLE} />
      <Line x1={14} y1={2} x2={14} y2={10.8} stroke={PURPLE} strokeWidth={1.7} strokeLinecap="round" />
      <Line x1={14} y1={17.2} x2={14} y2={26} stroke={PURPLE} strokeWidth={1.7} strokeLinecap="round" />
      <Line x1={2} y1={14} x2={10.8} y2={14} stroke={PURPLE} strokeWidth={1.7} strokeLinecap="round" />
      <Line x1={17.2} y1={14} x2={26} y2={14} stroke={PURPLE} strokeWidth={1.7} strokeLinecap="round" />
    </Svg>
  );
}

function SunMoonIcon() {
  return (
    <Svg width={36} height={32} viewBox="0 0 36 32" fill="none">
      <Circle cx={9} cy={11} r={3} stroke={PURPLE} strokeWidth={1.6} />
      <Line x1={9} y1={4} x2={9} y2={5.8} stroke={PURPLE} strokeWidth={1.6} strokeLinecap="round" />
      <Line x1={9} y1={16.2} x2={9} y2={18} stroke={PURPLE} strokeWidth={1.6} strokeLinecap="round" />
      <Line x1={2} y1={11} x2={3.8} y2={11} stroke={PURPLE} strokeWidth={1.6} strokeLinecap="round" />
      <Line x1={14.2} y1={11} x2={16} y2={11} stroke={PURPLE} strokeWidth={1.6} strokeLinecap="round" />
      <Line x1={4} y1={6} x2={5.3} y2={7.3} stroke={PURPLE} strokeWidth={1.6} strokeLinecap="round" />
      <Line x1={12.7} y1={14.7} x2={14} y2={16} stroke={PURPLE} strokeWidth={1.6} strokeLinecap="round" />
      <Line x1={4} y1={16} x2={5.3} y2={14.7} stroke={PURPLE} strokeWidth={1.6} strokeLinecap="round" />
      <Line x1={12.7} y1={7.3} x2={14} y2={6} stroke={PURPLE} strokeWidth={1.6} strokeLinecap="round" />
      <Line x1={25} y1={4} x2={13} y2={28} stroke={PURPLE} strokeWidth={1.4} strokeLinecap="round" opacity={0.9} />
      <Path
        d="M30 21a5.6 5.6 0 1 1-5.9-7.6 4.4 4.4 0 0 0 5.9 7.6z"
        stroke={PURPLE} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"
      />
    </Svg>
  );
}

function DropletIcon() {
  return (
    <Svg width={28} height={32} viewBox="0 0 24 28" fill="none">
      <Path
        d="M12 2 C12 2,3.5 11,3.5 18 C3.5 22.7,7.3 26.5,12 26.5 C16.7 26.5,20.5 22.7,20.5 18 C20.5 11,12 2,12 2 Z"
        stroke={PURPLE} strokeWidth={1.8} strokeLinejoin="round"
      />
      <Path d="M8.5 20.5 C9.5 22,11 22.7,12.5 22.5" stroke={PURPLE} strokeWidth={1.5} strokeLinecap="round" fill="none" />
    </Svg>
  );
}

function ChevronIcon() {
  return (
    <Svg width={12} height={18} viewBox="0 0 12 18" fill="none">
      <Path d="M3 2 L9 9 L3 16" stroke={PURPLE} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function LockIcon({ color = PURPLE }: { color?: string }) {
  return (
    <Svg width={14} height={16} viewBox="0 0 14 16" fill="none">
      <Rect x={2.5} y={7} width={9} height={7.5} rx={1.5} stroke={color} strokeWidth={1.5} />
      <Path d="M4.5 7V4.8a2.5 2.5 0 0 1 5 0V7" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  );
}

// Step 2 icons

function ScanCompleteIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={9} stroke={PURPLE} strokeWidth={1.6} />
      <Circle cx={12} cy={12} r={5} stroke={PURPLE} strokeWidth={1.6} />
      <Circle cx={12} cy={12} r={1.5} fill={PURPLE} />
      <Line x1={12} y1={3} x2={12} y2={1} stroke={PURPLE} strokeWidth={1.6} strokeLinecap="round" />
      <Line x1={12} y1={21} x2={12} y2={23} stroke={PURPLE} strokeWidth={1.6} strokeLinecap="round" />
      <Line x1={3} y1={12} x2={1} y2={12} stroke={PURPLE} strokeWidth={1.6} strokeLinecap="round" />
      <Line x1={21} y1={12} x2={23} y2={12} stroke={PURPLE} strokeWidth={1.6} strokeLinecap="round" />
    </Svg>
  );
}

function BreakoutIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={9} stroke={PURPLE} strokeWidth={1.6} />
      <Circle cx={12} cy={12} r={4.5} stroke={PURPLE} strokeWidth={1.6} />
      <Circle cx={12} cy={12} r={1.5} fill={PURPLE} />
    </Svg>
  );
}

function BarrierIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 3L4 6.5V12c0 4 3.5 7.5 8 9 4.5-1.5 8-5 8-9V6.5L12 3z"
        stroke={PURPLE} strokeWidth={1.6} strokeLinejoin="round"
      />
      <Line x1={12} y1={9} x2={12} y2={15} stroke={PURPLE} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

function DarkMarkIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      {/* 3×3 dot grid */}
      {[6,12,18].map(cx =>
        [6,12,18].map(cy => (
          <Circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={1.8} fill={PURPLE} />
        ))
      )}
    </Svg>
  );
}

function ProductMismatchIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      {/* Bottle outline */}
      <Path
        d="M9 3h6v3l2 2v11a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V8l2-2V3z"
        stroke={PURPLE} strokeWidth={1.5} strokeLinejoin="round"
      />
      {/* X mark */}
      <Line x1={10} y1={11} x2={14} y2={15} stroke={PURPLE} strokeWidth={1.6} strokeLinecap="round" />
      <Line x1={14} y1={11} x2={10} y2={15} stroke={PURPLE} strokeWidth={1.6} strokeLinecap="round" />
    </Svg>
  );
}

function RoutineGapIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Rect x={3} y={4} width={18} height={17} rx={2} stroke={PURPLE} strokeWidth={1.5} />
      <Line x1={3} y1={9} x2={21} y2={9} stroke={PURPLE} strokeWidth={1.5} />
      <Line x1={8} y1={2} x2={8} y2={6} stroke={PURPLE} strokeWidth={1.5} strokeLinecap="round" />
      <Line x1={16} y1={2} x2={16} y2={6} stroke={PURPLE} strokeWidth={1.5} strokeLinecap="round" />
      {/* Grid dots */}
      {[8,12,16].map(cx =>
        [13,17].map(cy => (
          <Circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={1.2} fill={PURPLE} />
        ))
      )}
    </Svg>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const sh = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: BG,
  },
});

// Step 1
const s1 = StyleSheet.create({
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 4,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topGroup: { alignItems: 'center', width: '100%' },
  bottomGroup: { width: '100%' },
  sparkleWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -18,
    marginBottom: -22,
  },
  title: {
    color: TEXT,
    fontSize: 38,
    lineHeight: 46,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : Fonts.bold,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  titleItalic: {
    color: PURPLE,
    fontSize: 38,
    lineHeight: 50,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Georgia-Italic' : Fonts.bold,
    fontStyle: 'italic',
    fontWeight: '700',
    letterSpacing: -0.5,
    marginBottom: 14,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 16,
    lineHeight: 23,
    textAlign: 'center',
    fontFamily: Fonts.regular,
    letterSpacing: -0.05,
  },
  cards: { width: '100%', gap: 12 },
  featureCard: {
    minHeight: 92,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 16,
    gap: 14,
  },
  iconCircle: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: 'rgba(139,92,246,0.14)',
    borderWidth: 1, borderColor: 'rgba(167,139,250,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },
  cardTextWrap: { flex: 1, gap: 3 },
  cardTitle: { color: TEXT, fontSize: 18, fontFamily: Fonts.bold, letterSpacing: -0.2 },
  cardDesc: {
    color: 'rgba(255,255,255,0.55)', fontSize: 13, lineHeight: 18,
    fontFamily: Fonts.regular, letterSpacing: -0.05,
  },
  button: {
    width: '100%', height: 60, borderRadius: 999,
    backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center',
    marginTop: 20, marginBottom: 14,
  },
  buttonText: { color: '#000000', fontSize: 18, fontFamily: Fonts.bold, letterSpacing: -0.1 },
  footerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  footerText: { color: 'rgba(255,255,255,0.55)', fontSize: 13, fontFamily: Fonts.regular },
});

// Step 2
const s2 = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 18,
    justifyContent: 'space-between',
    paddingTop: 8,
  },

  // Title
  titleBlock: { alignItems: 'center', marginTop: 4 },
  title: {
    color: TEXT,
    fontSize: 36,
    lineHeight: 44,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : Fonts.bold,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginBottom: 10,
  },
  titlePurple: { color: PURPLE },
  titleWhite: { color: TEXT },
  sparkle: { color: PURPLE, fontSize: 20 },
  subtitle: {
    color: 'rgba(255,255,255,0.58)',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    fontFamily: Fonts.regular,
    letterSpacing: -0.1,
  },

  // Card
  card: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.35)',
    backgroundColor: 'rgba(12,8,24,0.9)',
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(139,92,246,0.2)',
    backgroundColor: 'rgba(80,40,160,0.15)',
  },
  cardHeaderText: { gap: 1 },
  scanLabel: {
    color: PURPLE,
    fontSize: 11,
    fontFamily: Fonts.bold,
    letterSpacing: 1.2,
  },
  scanSub: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    fontFamily: Fonts.regular,
  },

  // Rows
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  rowIcon: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(100,60,200,0.2)',
    borderWidth: 1, borderColor: 'rgba(168,85,247,0.3)',
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  rowText: { flex: 1, gap: 2 },
  rowTitle: { color: TEXT, fontSize: 13, fontFamily: Fonts.bold, letterSpacing: -0.1 },
  rowDesc: { color: 'rgba(255,255,255,0.5)', fontSize: 11, lineHeight: 15, fontFamily: Fonts.regular },
  lockedWrap: {
    width: 88,
    height: 34,
    borderRadius: 6,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  lockedText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    lineHeight: 14,
    fontFamily: Fonts.regular,
    paddingHorizontal: 4,
  },

  // Bottom
  bottom: { gap: 14 },
  button: {
    width: '100%', height: 64, borderRadius: 32,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
  },
  buttonText: { color: '#FFFFFF', fontSize: 20, fontFamily: Fonts.bold, letterSpacing: -0.2 },
  buttonArrow: { color: '#FFFFFF', fontSize: 22, fontFamily: Fonts.bold },
  footerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  footerText: { color: 'rgba(255,255,255,0.45)', fontSize: 14, fontFamily: Fonts.regular },
});

// Step indicator
const si = StyleSheet.create({
  wrapper: { alignItems: 'center', paddingTop: 6, gap: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 0 },
  circle: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  circleActive: {
    backgroundColor: '#7C3AED',
    borderColor: '#9B5CF6',
  },
  num: { color: 'rgba(255,255,255,0.4)', fontSize: 13, fontFamily: Fonts.bold },
  numActive: { color: '#FFFFFF' },
  line: { width: 32, height: 1, backgroundColor: 'rgba(255,255,255,0.15)' },
  label: { color: 'rgba(255,255,255,0.45)', fontSize: 13, fontFamily: Fonts.regular },
});
