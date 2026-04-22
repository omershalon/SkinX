import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Polyline, Circle, Defs, LinearGradient as SvgGradient, Stop, Line } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { format } from 'date-fns';
import { Fonts } from '@/lib/theme';
import type { ScanHistoryEntry } from '@/lib/scan-api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const CARD_H_PAD = 20;
const CARD_INNER_PAD = 20;
const Y_AXIS_W = 28; // width reserved for Y axis tick labels
const Y_AXIS_GAP = 6;
const CHART_W = SCREEN_WIDTH - CARD_H_PAD * 2 - CARD_INNER_PAD * 2 - Y_AXIS_W - Y_AXIS_GAP;
const CHART_H = 72;
const PAD_V = 10;
const PAD_H = 6; // horizontal inset so edge dots aren't clipped


interface Props {
  history: ScanHistoryEntry[];
  currentSessionId: string;
}

export default function ScanProgressCard({ history, currentSessionId }: Props) {
  if (history.length < 3) return null;

  const currentIdx = history.findIndex(s => s.id === currentSessionId);
  const current = history[currentIdx];
  const prev = currentIdx > 0 ? history[currentIdx - 1] : null;

  const currentSpots = current?.spot_count ?? 0;
  const prevSpots = prev?.spot_count ?? null;
  const delta = prevSpots !== null ? currentSpots - prevSpots : null;

  const spots = history.map(s => s.spot_count);
  const minVal = Math.min(...spots);
  const maxVal = Math.max(...spots);
  const midVal = Math.round((minVal + maxVal) / 2);
  const range = maxVal - minVal || 1;

  const yFor = (val: number) =>
    PAD_V + ((maxVal - val) / range) * (CHART_H - PAD_V * 2);

  const timestamps = history.map(s => new Date(s.created_at).getTime());
  const minTs = Math.min(...timestamps);
  const maxTs = Math.max(...timestamps);
  const tsRange = maxTs - minTs || 1;

  const pts = history.map((s) => ({
    x: PAD_H + ((new Date(s.created_at).getTime() - minTs) / tsRange) * (CHART_W - PAD_H * 2),
    y: yFor(s.spot_count),
  }));

  const polylinePoints = pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  const deltaColor = delta === null ? '#aaa' : delta <= 0 ? '#4ade80' : '#f87171';
  const deltaLabel =
    delta === null ? null :
    delta === 0 ? 'Same as last scan' :
    `${delta > 0 ? '+' : ''}${delta} blemish${Math.abs(delta) !== 1 ? 'es' : ''} since last scan`;

  const yMax = yFor(maxVal);
  const yMid = yFor(midVal);
  const yMin = yFor(minVal);

  return (
    <View style={styles.card}>
      <LinearGradient
        colors={['#1C1035', '#0D0820']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[StyleSheet.absoluteFill, { borderRadius: 20 }]}
      />

      {/* Header row */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>Your Progress</Text>
          <Text style={styles.subtitle}>Detected blemishes per scan</Text>
        </View>
        {deltaLabel && (
          <View style={[styles.deltaPill, { borderColor: deltaColor + '40', backgroundColor: deltaColor + '18' }]}>
            <Text style={[styles.deltaText, { color: deltaColor }]}>{deltaLabel}</Text>
          </View>
        )}
      </View>

      {/* Chart: Y axis labels + sparkline */}
      <View style={styles.chartRow}>
        {/* Y axis tick labels */}
        <View style={[styles.yAxis, { height: CHART_H }]}>
          <Text style={[styles.yTick, { position: 'absolute', top: yMax - 7 }]}>{maxVal}</Text>
          {midVal !== maxVal && midVal !== minVal && (
            <Text style={[styles.yTick, { position: 'absolute', top: yMid - 7 }]}>{midVal}</Text>
          )}
          <Text style={[styles.yTick, { position: 'absolute', top: yMin - 7 }]}>{minVal}</Text>
        </View>

        {/* Sparkline SVG */}
        <Svg width={CHART_W} height={CHART_H}>
          <Defs>
            <SvgGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor="#5B3FBF" stopOpacity="0.6" />
              <Stop offset="1" stopColor="#8B5CFF" stopOpacity="0.9" />
            </SvgGradient>
          </Defs>

          {/* Horizontal grid lines */}
          <Line x1={0} y1={yMax} x2={CHART_W} y2={yMax} stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
          {midVal !== maxVal && midVal !== minVal && (
            <Line x1={0} y1={yMid} x2={CHART_W} y2={yMid} stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
          )}
          <Line x1={0} y1={yMin} x2={CHART_W} y2={yMin} stroke="rgba(255,255,255,0.06)" strokeWidth={1} />

          {/* Sparkline */}
          <Polyline
            points={polylinePoints}
            fill="none"
            stroke="url(#lineGrad)"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Dots */}
          {pts.map((p, i) => {
            const isCurrent = history[i].id === currentSessionId;
            return (
              <Circle
                key={i}
                cx={p.x}
                cy={p.y}
                r={isCurrent ? 5 : 3}
                fill={isCurrent ? '#8B5CFF' : 'rgba(139,92,255,0.35)'}
                stroke={isCurrent ? '#C4A6FF' : 'none'}
                strokeWidth={isCurrent ? 1.5 : 0}
              />
            );
          })}
        </Svg>
      </View>

      {/* Date labels: actual first and last scan dates */}
      <View style={[styles.dateRow, { marginLeft: Y_AXIS_W + Y_AXIS_GAP }]}>
        <Text style={styles.dateLabel}>{format(new Date(history[0].created_at), 'MMM d')}</Text>
        <Text style={styles.dateLabel}>{format(new Date(history[history.length - 1].created_at), 'MMM d')}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 16,
    borderRadius: 20,
    padding: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(139,92,255,0.18)',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 8,
    flexWrap: 'wrap',
  },
  title: {
    fontFamily: Fonts.semiBold,
    fontSize: 15,
    color: '#E8DEFF',
    letterSpacing: 0.2,
  },
  subtitle: {
    fontFamily: Fonts.regular,
    fontSize: 11,
    color: 'rgba(228,220,255,0.4)',
    marginTop: 2,
  },
  deltaPill: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  deltaText: {
    fontFamily: Fonts.medium,
    fontSize: 12,
  },
  chartRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
    gap: Y_AXIS_GAP,
  },
  yAxis: {
    width: Y_AXIS_W,
    position: 'relative',
  },
  yTick: {
    fontFamily: Fonts.regular,
    fontSize: 10,
    color: 'rgba(228,220,255,0.35)',
    textAlign: 'right',
    width: Y_AXIS_W,
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dateLabel: {
    fontFamily: Fonts.regular,
    fontSize: 11,
    color: 'rgba(228,220,255,0.35)',
  },
});
