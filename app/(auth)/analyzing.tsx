import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Path } from 'react-native-svg';
import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from '@/lib/supabase';
import { Colors, Fonts } from '@/lib/theme';
import { useTranslation } from 'react-i18next';

// Checkmark icon (SVG, not emoji)
function CheckIcon({ size = 16, color = Colors.success }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={10} fill={color} />
      <Path d="M8 12l2.5 2.5L16 9" stroke="#FFF" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export default function AnalyzingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ onboardingData?: string; photoFront?: string }>();
  const insets = useSafeAreaInsets();
  const [currentStep, setCurrentStep] = useState(0);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [percent, setPercent] = useState(0);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const { t } = useTranslation();

  const STEPS = [
    { label: t('analyzing.step1'), key: 'acne' },
    { label: t('analyzing.step2'), key: 'texture' },
    { label: t('analyzing.step3'), key: 'inflammation' },
    { label: t('analyzing.step4'), key: 'mapping' },
    { label: t('analyzing.step5'), key: 'plan' },
  ];

  const CHECKLIST_ITEMS = [
    t('analyzing.item1'),
    t('analyzing.item2'),
    t('analyzing.item3'),
    t('analyzing.item4'),
    t('analyzing.item5'),
  ];

  // Step through visual messages + percentage
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    STEPS.forEach((_, i) => {
      timers.push(setTimeout(() => {
        setCurrentStep(i);
        const pct = Math.round(((i + 1) / STEPS.length) * 100);
        setPercent(pct);
        Animated.timing(progressAnim, { toValue: (i + 1) / STEPS.length, duration: 600, useNativeDriver: false }).start();
      }, i * 1800));
    });
    return () => timers.forEach(clearTimeout);
  }, []);

  // Run actual analysis in background
  useEffect(() => {
    (async () => {
      try {
        if (params.photoFront) {
          const base64 = await FileSystem.readAsStringAsync(params.photoFront, { encoding: 'base64' as any });
          const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
          const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
          const res = await fetch(`${supabaseUrl}/functions/v1/analyze-skin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` },
            body: JSON.stringify({ image_base64: base64 }),
          });
          const data = await res.json();
          setAnalysisResult(data);
        }
      } catch (err) {
        console.error('Analysis error:', err);
        setAnalysisResult({ skin_type: 'combination', acne_type: 'hormonal', severity: 'moderate', findings_count: 3 });
      }
    })();
  }, []);

  // Navigate when done
  useEffect(() => {
    if (currentStep >= STEPS.length - 1 && analysisResult) {
      const timer = setTimeout(() => {
        router.push({
          pathname: '/(auth)/rating',
          params: {
            onboardingData: params.onboardingData || '{}',
            analysisResult: JSON.stringify(analysisResult),
            photoFront: params.photoFront || '',
          },
        });
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [currentStep, analysisResult]);

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <LinearGradient colors={['#08080F', '#100830', '#1A0845']} style={StyleSheet.absoluteFill} />

      <View style={s.center}>
        {/* Big percentage */}
        <Text style={s.percent}>{percent}%</Text>

        {/* Title */}
        <Text style={s.title}>{t('analyzing.title')}</Text>

        {/* Progress bar */}
        <View style={s.progressBar}>
          <Animated.View style={[s.progressFill, {
            width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
          }]}>
            <LinearGradient colors={['#7C5CFC', '#A78BFA']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
          </Animated.View>
        </View>

        {/* Current step label */}
        <Text style={s.currentLabel}>{STEPS[currentStep]?.label}...</Text>

        {/* Checklist */}
        <View style={s.checklist}>
          <Text style={s.checklistTitle}>{t('analyzing.checklistTitle')}</Text>
          {CHECKLIST_ITEMS.map((item, i) => (
            <View key={item} style={s.checkRow}>
              <Text style={s.checkBullet}>{'  \u2022  '}</Text>
              <Text style={[s.checkText, i <= currentStep && s.checkTextDone]}>{item}</Text>
              {i < currentStep && <View style={s.checkIcon}><CheckIcon size={18} /></View>}
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32, gap: 20 },

  percent: { fontFamily: Fonts.bold, fontSize: 56, color: '#FFF', letterSpacing: -2 },
  title: { fontFamily: Fonts.bold, fontSize: 24, color: '#FFF', textAlign: 'center', lineHeight: 32, letterSpacing: -0.3 },

  progressBar: { width: '100%', height: 6, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3, overflow: 'hidden' },

  currentLabel: { fontFamily: Fonts.regular, fontSize: 14, color: 'rgba(255,255,255,0.4)' },

  checklist: { width: '100%', marginTop: 12, gap: 10 },
  checklistTitle: { fontFamily: Fonts.semibold, fontSize: 16, color: '#FFF', marginBottom: 4 },
  checkRow: { flexDirection: 'row', alignItems: 'center' },
  checkBullet: { fontSize: 14, color: 'rgba(255,255,255,0.25)' },
  checkText: { fontFamily: Fonts.regular, fontSize: 15, color: 'rgba(255,255,255,0.35)', flex: 1 },
  checkTextDone: { color: 'rgba(255,255,255,0.8)' },
  checkIcon: { marginLeft: 8 },
});
