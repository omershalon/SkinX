import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SkinAssessmentItem } from '@/lib/scan-types';
import { Fonts } from '@/lib/theme';

interface SkinStrengthsWeaknessesProps {
  assessment: SkinAssessmentItem[];
}

const CATEGORY_LABELS: Record<string, string> = {
  active_breakouts:   'Active Breakouts',
  comedones:          'Comedones',
  dark_spots:         'Dark Spots',
  redness:            'Redness',
  skin_texture:       'Skin Texture',
  pore_visibility:    'Pore Visibility',
  skin_tone_evenness: 'Skin Tone Evenness',
  oiliness:           'Oiliness',
  hydration:          'Hydration',
  brightness:         'Brightness',
  under_eye:          'Under-Eye',
};

function AssessmentCard({ item, isStrength }: { item: SkinAssessmentItem; isStrength: boolean }) {
  const borderColor = isStrength ? 'rgba(74,222,128,0.25)'  : 'rgba(248,113,113,0.25)';
  const bg          = isStrength ? 'rgba(74,222,128,0.07)'  : 'rgba(248,113,113,0.07)';

  return (
    <View style={[styles.card, { borderColor, backgroundColor: bg }]}>
      <Text style={styles.cardTitle}>
        {CATEGORY_LABELS[item.category] ?? item.category}
      </Text>
      <Text style={styles.cardLabel}>{item.label}</Text>
    </View>
  );
}

export default function SkinStrengthsWeaknesses({ assessment }: SkinStrengthsWeaknessesProps) {
  if (!assessment || assessment.length === 0) return null;

  const strengths  = assessment.filter(a => a.is_strength);
  const weaknesses = assessment.filter(a => !a.is_strength);

  return (
    <View style={styles.container}>
      {strengths.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionHeading}>✦ STRENGTHS</Text>
          {strengths.map((item) => (
            <AssessmentCard key={item.category} item={item} isStrength />
          ))}
        </View>
      )}
      {weaknesses.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionHeading, styles.weaknessHeading]}>✦ WEAKNESSES</Text>
          {weaknesses.map((item) => (
            <AssessmentCard key={item.category} item={item} isStrength={false} />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    marginBottom: 28,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeading: {
    color: '#4ade80',
    fontFamily: Fonts.medium,
    fontSize: 11,
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  weaknessHeading: {
    color: '#f87171',
  },
  card: {
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 11,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  cardTitle: {
    color: '#ffffff',
    fontFamily: Fonts.semibold,
    fontSize: 14,
    marginBottom: 3,
  },
  cardLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontFamily: Fonts.regular,
    fontSize: 12,
    lineHeight: 17,
  },
});
