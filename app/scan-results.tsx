import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Fonts } from '@/lib/theme';
import { loadScanSession, loadScanHistory } from '@/lib/scan-api';
import type { ScanHistoryEntry } from '@/lib/scan-api';
import type { ScanSession, ReviewedDetection } from '@/lib/scan-types';
import { getSkinHeadline } from '@/lib/snapshot-utils';
import GlowAnalysisDashboard from '@/components/GlowAnalysisDashboard';

// ─── Screen ─────────────────────────────────────────────────────────────────

export default function ScanResultsScreen() {
  const router = useRouter();
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();

  const [session, setSession] = useState<ScanSession | null>(null);
  const [scanHistory, setScanHistory] = useState<ScanHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionId) return;
    loadScanSession(sessionId).then(async (d) => {
      setSession(d);
      if (d?.user_id) {
        const history = await loadScanHistory(d.user_id);
        setScanHistory(history);
      }
      setLoading(false);
    });
  }, [sessionId]);

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading || !session) {
    return (
      <View style={styles.screen}>
        <LinearGradient colors={['#050210', '#0A0320', '#14052C']} style={StyleSheet.absoluteFill} />
        <ActivityIndicator size="large" color="#8B5CFF" />
        <Text style={styles.loadingText}>Loading results…</Text>
      </View>
    );
  }

  // ── Failed ─────────────────────────────────────────────────────────────────
  if (session.status === 'failed') {
    return (
      <View style={styles.screen}>
        <LinearGradient colors={['#050210', '#0A0320', '#14052C']} style={StyleSheet.absoluteFill} />
        <Text style={{ fontSize: 40, marginBottom: 12 }}>😔</Text>
        <Text style={styles.failTitle}>Scan Failed</Text>
        <Text style={styles.failBody}>Something went wrong. Please try again.</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => router.back()}>
          <LinearGradient
            colors={['#6E46FF', '#8B5CFF', '#9A73FF']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.retryGradient}
          >
            <Text style={styles.retryText}>Try Again</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Derive data ────────────────────────────────────────────────────────────
  const headline       = getSkinHeadline(session);
  const description    = session.description ?? '';
  const skinType       = (session.skin_insights as any)?.skin_type ?? 'Normal';
  const primaryConcern = session.primary_acne_type
    ? session.primary_acne_type.charAt(0).toUpperCase() + session.primary_acne_type.slice(1)
    : 'None detected';
  const severity       = session.severity ?? 'mild';
  const severityLabel  = severity === 'mild' ? 'Low' : severity === 'moderate' ? 'Moderate' : 'High';

  const frontDetections: ReviewedDetection[] =
    session.reviewed_detections?.front ?? [];
  const imgW = session.model_detections?.image_dimensions?.front?.width  ?? 1080;
  const imgH = session.model_detections?.image_dimensions?.front?.height ?? 1440;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <GlowAnalysisDashboard
      avatarUri={session.front_image_url ?? ''}
      headline={headline}
      description={description}
      mainConcern={primaryConcern}
      severity={severityLabel}
      skinType={skinType}
      detections={frontDetections}
      imageNativeWidth={imgW}
      imageNativeHeight={imgH}
      zoneScores={session.zone_scores ?? undefined}
      skinAssessment={session.skin_assessment ?? undefined}
      severityScore={session.severity_score}
      totalSpots={session.total_spots}
      primaryAcneType={session.primary_acne_type}
      onBack={() => router.back()}
      onStartPlan={() => router.push('/(tabs)/plan')}
      onScanAgain={() => router.replace('/(tabs)/scan')}
      onViewFullScan={() => router.back()}
      scanHistory={scanHistory}
      currentSessionId={sessionId}
    />
  );
}

// ─── Styles (loading & error states only) ───────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#050210',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: 'rgba(228,220,255,0.65)',
    fontFamily: Fonts.regular,
    fontSize: 14,
    marginTop: 16,
  },
  failTitle: {
    color: '#F7F3FF',
    fontFamily: Fonts.bold,
    fontSize: 22,
    letterSpacing: -0.5,
    marginBottom: 8,
    textAlign: 'center',
  },
  failBody: {
    color: 'rgba(228,220,255,0.65)',
    fontFamily: Fonts.regular,
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  retryBtn: {
    borderRadius: 999,
    overflow: 'hidden',
    marginTop: 28,
  },
  retryGradient: {
    paddingVertical: 16,
    paddingHorizontal: 40,
    alignItems: 'center',
  },
  retryText: {
    color: '#FFFFFF',
    fontFamily: Fonts.medium,
    fontSize: 16,
  },
});
