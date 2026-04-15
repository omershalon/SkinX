import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Colors, Fonts, BorderRadius, Spacing } from '@/lib/theme';
import ScreenBackground from '@/components/ScreenBackground';
import { loadScanSession } from '@/lib/scan-api';
import type { ScanSession } from '@/lib/scan-types';
import { buildSnapshotDetail, type SnapshotDetail, type SnapshotItem } from '@/lib/snapshot-utils';

// ── Icon components ──

function BackArrow() {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path d="M19 12H5M12 19l-7-7 7-7" stroke="#FFF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function SnapshotIconLarge({ type, color }: { type: SnapshotItem['iconType']; color: string }) {
  const size = 28;
  switch (type) {
    case 'circle':
      return <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }} />;
    case 'lightning':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill={color} />
        </Svg>
      );
    case 'droplet':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0L12 2.69z" fill={color} />
        </Svg>
      );
    case 'sparkle':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8L12 2z" fill={color} />
        </Svg>
      );
  }
}

function CheckCircle({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M22 11.08V12a10 10 0 1 1-5.93-9.14"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M22 4L12 14.01l-3-3" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function ClockIcon({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"
        stroke={color}
        strokeWidth={2}
      />
      <Path d="M12 6v6l4 2" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

// ── Section card border colors based on type ──

const SECTION_COLORS: Record<string, string> = {
  whatItIs: '#60A5FA',
  whyItHappens: '#F59E0B',
  whatHelps: '#34D399',
  plan: '#A78BFA',
  timeline: '#F472B6',
};

export default function SnapshotDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { sessionId, snapshotId } = useLocalSearchParams<{ sessionId: string; snapshotId: string }>();

  const [detail, setDetail] = useState<SnapshotDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (sessionId && snapshotId) {
      loadScanSession(sessionId).then((session: ScanSession | null) => {
        if (session) {
          const d = buildSnapshotDetail(session, snapshotId);
          setDetail(d);
        }
        setLoading(false);
      });
    }
  }, [sessionId, snapshotId]);

  if (loading) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <ScreenBackground preset="scan" />
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!detail) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <ScreenBackground preset="scan" />
        <Text style={styles.errorText}>Could not load details.</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { item } = detail;

  return (
    <View style={{ flex: 1 }}>
      <ScreenBackground preset="scan" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 8 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
            <BackArrow />
          </TouchableOpacity>
        </View>

        {/* ── Title card ── */}
        <View style={styles.titleCard}>
          <LinearGradient
            colors={['#2D1B69', '#1A0F3D']}
            style={[StyleSheet.absoluteFill, { borderRadius: BorderRadius.xl }]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
          <View style={styles.titleRow}>
            <SnapshotIconLarge type={item.iconType} color={item.iconColor} />
            <View style={styles.titleTextWrap}>
              <Text style={styles.titleText}>{item.label}</Text>
              <View style={[styles.severityChip, { backgroundColor: item.severityColor + '20' }]}>
                <Text style={[styles.severityChipText, { color: item.severityColor }]}>{item.severity}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── What it is ── */}
        <SectionCard
          title="What it is"
          accentColor={SECTION_COLORS.whatItIs}
          icon={<InfoIcon color={SECTION_COLORS.whatItIs} />}
        >
          <Text style={styles.bodyText}>{detail.whatItIs}</Text>
        </SectionCard>

        {/* ── Why it happens ── */}
        <SectionCard
          title="Why it happens"
          accentColor={SECTION_COLORS.whyItHappens}
          icon={<QuestionIcon color={SECTION_COLORS.whyItHappens} />}
        >
          <Text style={styles.bodyText}>{detail.whyItHappens}</Text>
        </SectionCard>

        {/* ── What helps most ── */}
        <SectionCard
          title="What helps most"
          accentColor={SECTION_COLORS.whatHelps}
          icon={<CheckCircle color={SECTION_COLORS.whatHelps} />}
        >
          {detail.whatHelps.map((h, i) => (
            <View key={i} style={styles.helpItem}>
              <View style={styles.helpNumber}>
                <Text style={styles.helpNumberText}>{i + 1}</Text>
              </View>
              <View style={styles.helpTextWrap}>
                <Text style={styles.helpTitle}>{h.title}</Text>
                <Text style={styles.helpDesc}>{h.desc}</Text>
              </View>
            </View>
          ))}
        </SectionCard>

        {/* ── My personalized plan ── */}
        {detail.personalizedPlan.length > 0 && (
          <SectionCard
            title="My personalized plan"
            accentColor={SECTION_COLORS.plan}
            icon={<PlanIcon color={SECTION_COLORS.plan} />}
          >
            {detail.personalizedPlan.map((step, i) => (
              <View key={i} style={styles.planStep}>
                <View style={[styles.planDot, { backgroundColor: SECTION_COLORS.plan }]} />
                <Text style={styles.planStepText}>{step}</Text>
              </View>
            ))}
          </SectionCard>
        )}

        {/* ── Expected timeline ── */}
        <SectionCard
          title="Expected timeline"
          accentColor={SECTION_COLORS.timeline}
          icon={<ClockIcon color={SECTION_COLORS.timeline} />}
        >
          <Text style={styles.bodyText}>{detail.timeline}</Text>
          <View style={styles.timelineBar}>
            <LinearGradient
              colors={[SECTION_COLORS.timeline, Colors.primary]}
              style={styles.timelineGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            />
            <View style={styles.timelineMarkers}>
              <TimelineMarker label="Week 2" position={0.15} />
              <TimelineMarker label="Week 6" position={0.45} />
              <TimelineMarker label="Week 12" position={0.85} />
            </View>
          </View>
        </SectionCard>

        <View style={{ height: insets.bottom + 40 }} />
      </ScrollView>
    </View>
  );
}

// ── Reusable section card ──

function SectionCard({
  title,
  accentColor,
  icon,
  children,
}: {
  title: string;
  accentColor: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <View style={[styles.sectionCard, { borderLeftColor: accentColor }]}>
      <LinearGradient
        colors={['rgba(17,17,32,0.9)', 'rgba(17,17,32,0.6)']}
        style={[StyleSheet.absoluteFill, { borderRadius: BorderRadius.lg }]}
      />
      <View style={styles.sectionHeader}>
        {icon}
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

// ── Timeline marker ──

function TimelineMarker({ label, position }: { label: string; position: number }) {
  return (
    <View style={[styles.marker, { left: `${position * 100}%` }]}>
      <View style={styles.markerDot} />
      <Text style={styles.markerLabel}>{label}</Text>
    </View>
  );
}

// ── Extra small icons ──

function InfoIcon({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"
        stroke={color}
        strokeWidth={2}
      />
      <Path d="M12 16v-4M12 8h.01" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

function QuestionIcon({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"
        stroke={color}
        strokeWidth={2}
      />
      <Path d="M9 9a3 3 0 1 1 4 2.83V14" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M12 17h.01" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

function PlanIcon({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M9 11l3 3L22 4" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path
        d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// ── Styles ──

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  errorText: {
    fontFamily: Fonts.medium,
    fontSize: 16,
    color: Colors.textSecondary,
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: BorderRadius.pill,
  },
  backButtonText: {
    fontFamily: Fonts.semibold,
    fontSize: 15,
    color: '#FFF',
  },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20 },

  // ── Header ──
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingTop: 4,
  },
  backBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },

  // ── Title card ──
  titleCard: {
    borderRadius: BorderRadius.xl,
    padding: 22,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(124,92,252,0.25)',
    overflow: 'hidden',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  titleTextWrap: {
    flex: 1,
    gap: 6,
  },
  titleText: {
    fontFamily: Fonts.bold,
    fontSize: 26,
    lineHeight: 32,
    color: Colors.text,
    letterSpacing: -0.5,
  },
  severityChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  severityChipText: {
    fontFamily: Fonts.semibold,
    fontSize: 13,
  },

  // ── Section card ──
  sectionCard: {
    borderRadius: BorderRadius.lg,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    borderLeftWidth: 3,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  sectionTitle: {
    fontFamily: Fonts.semibold,
    fontSize: 16,
    color: Colors.text,
  },

  // ── Body text ──
  bodyText: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    lineHeight: 22,
    color: Colors.textSecondary,
  },

  // ── What helps list ──
  helpItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 14,
  },
  helpNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(52,211,153,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  helpNumberText: {
    fontFamily: Fonts.semibold,
    fontSize: 12,
    color: Colors.success,
  },
  helpTextWrap: {
    flex: 1,
  },
  helpTitle: {
    fontFamily: Fonts.semibold,
    fontSize: 14,
    color: Colors.text,
    marginBottom: 2,
  },
  helpDesc: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    lineHeight: 19,
    color: Colors.textSecondary,
  },

  // ── Plan steps ──
  planStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  planDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
  },
  planStepText: {
    flex: 1,
    fontFamily: Fonts.regular,
    fontSize: 14,
    lineHeight: 21,
    color: Colors.textSecondary,
  },

  // ── Timeline ──
  timelineBar: {
    marginTop: 18,
    height: 40,
  },
  timelineGradient: {
    height: 4,
    borderRadius: 2,
  },
  timelineMarkers: {
    position: 'relative',
    height: 30,
  },
  marker: {
    position: 'absolute',
    top: 4,
    alignItems: 'center',
    transform: [{ translateX: -20 }],
  },
  markerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFF',
    marginBottom: 4,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  markerLabel: {
    fontFamily: Fonts.medium,
    fontSize: 10,
    color: Colors.textMuted,
  },
});
