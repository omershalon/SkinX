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
import { loadScanSession } from '@/lib/scan-api';
import type { ScanSession, Recommendation } from '@/lib/scan-types';
import {
  deriveSnapshotItems,
  getSkinHeadline,
  getRecommendationIcon,
  type SnapshotItem,
} from '@/lib/snapshot-utils';
import GlowAnalysisDashboard, { type RecommendationData } from '@/components/GlowAnalysisDashboard';

// ─── Emoji → component icon mapping ────────────────────────────────────────

const ICON_MAP: Record<string, RecommendationData['icon']> = {
  '☀️': 'sun',
  '✨': 'sparkles',
  '💧': 'droplet',
  '🫧': 'droplet',
  '💦': 'droplet',
  '🧴': 'sparkles',
  '🎭': 'droplet',
};

const REC_ACCENT: Record<string, string> = {
  '☀️': '#F6BE63',
  '✨': '#FF9AD8',
  '💧': '#8F7CFF',
  '🫧': '#53E6B0',
  '💦': '#6FA8FF',
  '🧴': '#A78BFA',
  '🎭': '#F472B6',
};

const REC_GLOW: Record<string, string> = {
  '☀️': 'rgba(255,190,99,0.14)',
  '✨': 'rgba(255,144,209,0.12)',
  '💧': 'rgba(110,123,255,0.12)',
  '🫧': 'rgba(83,230,176,0.10)',
  '💦': 'rgba(111,168,255,0.10)',
  '🧴': 'rgba(167,139,250,0.12)',
  '🎭': 'rgba(244,114,182,0.10)',
};

function mapRecommendation(rec: Recommendation): RecommendationData {
  const emoji = getRecommendationIcon(rec.title);
  return {
    icon: ICON_MAP[emoji] ?? 'sparkles',
    title: rec.title,
    subtitle: rec.description,
    accentColor: REC_ACCENT[emoji] ?? '#8B5CFF',
    glowColor: REC_GLOW[emoji] ?? 'rgba(139,92,255,0.10)',
  };
}

function findMatchingSnapshot(recTitle: string, items: SnapshotItem[]): string | null {
  const t = recTitle.toLowerCase();
  if (t.includes('spf') || t.includes('sun'))            return items.find((i) => i.id === 'dark_marks')?.id  ?? null;
  if (t.includes('vitamin c') || t.includes('brighten')) return items.find((i) => i.id === 'dark_marks')?.id  ?? null;
  if (t.includes('aha') || t.includes('exfoli'))         return items.find((i) => i.id === 'skin_texture')?.id ?? items[0]?.id ?? null;
  if (t.includes('niacinamide'))                         return items.find((i) => i.id === 'oiliness')?.id     ?? items[0]?.id ?? null;
  if (t.includes('cleanser'))                            return items.find((i) => i.id === 'active_acne')?.id  ?? items[0]?.id ?? null;
  return items[0]?.id ?? null;
}

// ─── Screen ─────────────────────────────────────────────────────────────────

export default function ScanResultsScreen() {
  const router = useRouter();
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();

  const [session, setSession] = useState<ScanSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (sessionId) {
      loadScanSession(sessionId).then((d) => { setSession(d); setLoading(false); });
    }
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
  const severityColor  = severity === 'mild' ? '#53E6B0' : severity === 'moderate' ? '#F6BE63' : '#F87171';

  const snapshotItems   = deriveSnapshotItems(session);
  const recommendations = (session.recommendations as Recommendation[]) ?? [];
  const topRecs         = recommendations.slice(0, 3).map(mapRecommendation);

  const goToDetail = (id: string) =>
    router.push({ pathname: '/snapshot-detail', params: { sessionId: session.id, snapshotId: id } });

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <GlowAnalysisDashboard
      avatarUri={session.front_image_url}
      headline={headline}
      description={description}
      mainConcern={primaryConcern}
      severity={severityLabel}
      severityColor={severityColor}
      skinType={skinType}
      snapshotItems={snapshotItems}
      recommendations={topRecs}
      onStartPlan={() => router.push('/(tabs)/plan')}
      onSnapshotPress={(id) => goToDetail(id)}
      onRecommendationPress={(index) => {
        const rec = recommendations[index];
        if (rec) {
          const matchId = findMatchingSnapshot(rec.title, snapshotItems);
          if (matchId) goToDetail(matchId);
        }
      }}
      onViewFullScan={() => router.back()}
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
    marginTop: 24,
    width: 200,
    shadowColor: '#8A5CFF',
    shadowOpacity: 0.38,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  retryGradient: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryText: {
    color: '#FFFFFF',
    fontFamily: Fonts.bold,
    fontSize: 18,
    letterSpacing: 0.2,
  },
});
