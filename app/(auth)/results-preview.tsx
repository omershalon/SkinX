import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Rect, Circle, Line } from 'react-native-svg';
import { Colors, Fonts } from '@/lib/theme';
import { useTranslation } from 'react-i18next';

// SVG lock icon
function LockIcon({ size = 32, color = '#FFF' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={3} y={11} width={18} height={11} rx={2} stroke={color} strokeWidth={1.8} />
      <Path d="M7 11V7a5 5 0 0110 0v4" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Circle cx={12} cy={16} r={1.5} fill={color} />
    </Svg>
  );
}

export default function ResultsPreviewScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ onboardingData?: string; analysisResult?: string; photoFront?: string }>();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const analysis = params.analysisResult ? JSON.parse(params.analysisResult) : {};
  const severity = analysis.severity || 'moderate';
  const sevLabel = t(`resultsPreview.${severity}` as any, { defaultValue: t('resultsPreview.moderate') });
  const findingsCount = analysis.findings?.length || analysis.findings_count || 3;

  return (
    <View style={[s.container, { paddingTop: insets.top, paddingBottom: insets.bottom + 20 }]}>
      <LinearGradient colors={['#08080F', '#100830', '#1A0845']} style={StyleSheet.absoluteFill} />

      {/* Blurred results card */}
      <View style={s.resultsArea}>
        {/* Fake analysis content behind blur — looks like real text/data */}
        <View style={s.fakeCard}>
          {/* Photo area */}
          {params.photoFront ? (
            <Image source={{ uri: params.photoFront }} style={s.fakePhoto} />
          ) : (
            <View style={[s.fakePhoto, { backgroundColor: '#1A1A2E' }]} />
          )}

          {/* Fake severity badge */}
          <View style={s.fakeBadgeRow}>
            <View style={s.fakeSevBadge}><Text style={s.fakeSevText}>{sevLabel}</Text></View>
            <View style={s.fakeIssueBadge}><Text style={s.fakeIssueText}>{t('resultsPreview.findings', { count: findingsCount })}</Text></View>
          </View>

          {/* Fake "Your Skin Analysis" header */}
          <Text style={s.fakeHeader}>{t('resultsPreview.skinAnalysis')}</Text>

          {/* Fake finding rows — actual blurred text */}
          <View style={s.fakeFinding}>
            <Text style={s.fakeFindingTitle}>Hormonal acne detected</Text>
            <Text style={s.fakeFindingDesc}>Concentrated around the chin and jawline area. Consistent with hormonal fluctuations affecting sebum production.</Text>
          </View>

          <View style={s.fakeFinding}>
            <Text style={s.fakeFindingTitle}>Oily T-zone identified</Text>
            <Text style={s.fakeFindingDesc}>Excess oil production observed in the forehead and nose region. Pores appear enlarged in these areas.</Text>
          </View>

          <View style={s.fakeFinding}>
            <Text style={s.fakeFindingTitle}>Post-inflammatory marks</Text>
            <Text style={s.fakeFindingDesc}>Dark spots from previous breakouts are visible on both cheeks. These are treatable with consistent care.</Text>
          </View>

          {/* Fake plan section */}
          <Text style={s.fakePlanHeader}>{t('resultsPreview.personalizedPlan')}</Text>
          <View style={s.fakePlanRow}><Text style={s.fakePlanItem}>Morning routine: Gentle cleanser with willow bark...</Text></View>
          <View style={s.fakePlanRow}><Text style={s.fakePlanItem}>Evening routine: Rosehip oil + niacinamide serum...</Text></View>
          <View style={s.fakePlanRow}><Text style={s.fakePlanItem}>Diet: Reduce dairy, increase omega-3 intake...</Text></View>
          <View style={s.fakePlanRow}><Text style={s.fakePlanItem}>Herbal: Spearmint tea 2x daily for hormonal...</Text></View>
        </View>

        {/* Blur overlay */}
        <BlurView intensity={45} tint="dark" style={StyleSheet.absoluteFill} />

        {/* Visible elements on top */}
        <View style={s.overlay}>
          <View style={s.lockCircle}>
            <LockIcon size={28} color="rgba(255,255,255,0.8)" />
          </View>

          <View style={s.issueBadge}>
            <Text style={s.issueText}>{t('resultsPreview.findings', { count: findingsCount })}</Text>
          </View>

          <Text style={s.planReady}>{t('resultsPreview.locked')}</Text>
        </View>
      </View>

      {/* CTA */}
      <View style={s.bottom}>
        <TouchableOpacity
          style={s.cta}
          onPress={() => router.push({
            pathname: '/(auth)/create-account',
            params: { onboardingData: params.onboardingData, analysisResult: params.analysisResult, photoFront: params.photoFront },
          })}
          activeOpacity={0.85}
        >
          <Text style={s.ctaText}>{t('resultsPreview.cta')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, justifyContent: 'space-between' },

  resultsArea: { flex: 1, margin: 20, borderRadius: 22, overflow: 'hidden', position: 'relative' },

  // Fake card — real-looking text that gets blurred
  fakeCard: { flex: 1, backgroundColor: Colors.card, padding: 18, gap: 12 },
  fakePhoto: { width: '100%', height: 160, borderRadius: 14 },

  fakeBadgeRow: { flexDirection: 'row', gap: 8 },
  fakeSevBadge: { backgroundColor: 'rgba(252,211,77,0.15)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10 },
  fakeSevText: { fontFamily: Fonts.semibold, fontSize: 13, color: '#FCD34D' },
  fakeIssueBadge: { backgroundColor: 'rgba(248,113,113,0.15)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10 },
  fakeIssueText: { fontFamily: Fonts.semibold, fontSize: 13, color: '#F87171' },

  fakeHeader: { fontFamily: Fonts.bold, fontSize: 22, color: '#FFF', marginTop: 4 },

  fakeFinding: { gap: 4, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' },
  fakeFindingTitle: { fontFamily: Fonts.semibold, fontSize: 15, color: 'rgba(255,255,255,0.8)' },
  fakeFindingDesc: { fontFamily: Fonts.regular, fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 19 },

  fakePlanHeader: { fontFamily: Fonts.bold, fontSize: 18, color: '#FFF', marginTop: 8 },
  fakePlanRow: { paddingVertical: 4 },
  fakePlanItem: { fontFamily: Fonts.regular, fontSize: 13, color: 'rgba(255,255,255,0.4)', lineHeight: 19 },

  // Overlay — visible on top of blur
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', gap: 14 },

  lockCircle: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center', alignItems: 'center',
  },

  issueBadge: { backgroundColor: 'rgba(248,113,113,0.85)', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 14 },
  issueText: { fontFamily: Fonts.bold, fontSize: 14, color: '#FFF' },

  sevText: { fontFamily: Fonts.bold, fontSize: 30, color: '#FFF', letterSpacing: -0.5 },

  planReady: { fontFamily: Fonts.regular, fontSize: 15, color: 'rgba(255,255,255,0.5)', textAlign: 'center' },

  // Bottom
  bottom: { paddingHorizontal: 24 },
  cta: { width: '100%', height: 54, borderRadius: 14, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center' },
  ctaText: { fontFamily: Fonts.bold, fontSize: 16, color: '#000' },
});
