import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ZoneScore } from '@/lib/scan-types';
import { Fonts } from '@/lib/theme';

interface FaceZoneSummaryProps {
  zones: ZoneScore[];
  showHeading?: boolean;
}

const ZONE_LABELS: Record<string, string> = {
  forehead:     'Forehead',
  left_cheek:   'Left Cheek',
  right_cheek:  'Right Cheek',
  nose:         'Nose',
  chin_jawline: 'Chin & Jawline',
};

const SEVERITY_COLORS: Record<string, string> = {
  clear:    '#4ade80',
  mild:     '#facc15',
  moderate: '#fb923c',
  severe:   '#f87171',
};

const SEVERITY_BG: Record<string, string> = {
  clear:    'rgba(74,222,128,0.12)',
  mild:     'rgba(250,204,21,0.12)',
  moderate: 'rgba(251,146,60,0.12)',
  severe:   'rgba(248,113,113,0.12)',
};

export default function FaceZoneSummary({ zones, showHeading = true }: FaceZoneSummaryProps) {
  if (!zones || zones.length === 0) return null;

  // Canonical order
  const order = ['forehead', 'left_cheek', 'right_cheek', 'nose', 'chin_jawline'];
  const sorted = order
    .map(z => zones.find(z2 => z2.zone === z))
    .filter((z): z is ZoneScore => z != null);

  return (
    <View style={styles.container}>
      {showHeading && <Text style={styles.heading}>FACE ZONES</Text>}
      {sorted.map(zone => {
        const color = SEVERITY_COLORS[zone.severity] ?? '#ffffff';
        const bg    = SEVERITY_BG[zone.severity]    ?? 'rgba(255,255,255,0.05)';
        return (
          <View key={zone.zone} style={[styles.row, { backgroundColor: bg }]}>
            <Text style={styles.zoneName}>{ZONE_LABELS[zone.zone] ?? zone.zone}</Text>
            <View style={styles.right}>
              {zone.lesion_count > 0 && (
                <Text style={styles.count}>{zone.lesion_count} spot{zone.lesion_count !== 1 ? 's' : ''}</Text>
              )}
              <View style={[styles.pill, { borderColor: color }]}>
                <Text style={[styles.pillText, { color }]}>
                  {zone.severity.charAt(0).toUpperCase() + zone.severity.slice(1)}
                </Text>
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    marginBottom: 28,
  },
  heading: {
    color: 'rgba(255,255,255,0.4)',
    fontFamily: Fonts.medium,
    fontSize: 11,
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 14,
    marginBottom: 6,
  },
  zoneName: {
    color: '#ffffff',
    fontFamily: Fonts.medium,
    fontSize: 14,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  count: {
    color: 'rgba(255,255,255,0.45)',
    fontFamily: Fonts.regular,
    fontSize: 12,
  },
  pill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 3,
    paddingHorizontal: 10,
  },
  pillText: {
    fontFamily: Fonts.medium,
    fontSize: 11,
  },
});
