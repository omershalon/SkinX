import React, { useState } from 'react';
import { View, Image, ScrollView, TouchableOpacity, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Rect, Circle } from 'react-native-svg';
import { Detection, CLASS_COLORS } from '@/lib/scan-types';
import { Fonts } from '@/lib/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const DISPLAY_W = SCREEN_WIDTH * 0.65;
const DISPLAY_H = 380;
const MIN_RADIUS = 6;

interface AcneMapHeroProps {
  imageUri: string;
  imageWidth: number;
  imageHeight: number;
  detections: Detection[];
}

function scaleCoords(imageWidth: number, imageHeight: number) {
  const scale = Math.max(DISPLAY_W / imageWidth, DISPLAY_H / imageHeight);
  const offsetX = (DISPLAY_W - imageWidth * scale) / 2;
  const offsetY = (DISPLAY_H - imageHeight * scale) / 2;
  return { scale, offsetX, offsetY };
}

export default function AcneMapHero({ imageUri, imageWidth, imageHeight, detections }: AcneMapHeroProps) {
  const [selectedClass, setSelectedClass] = useState<string | null>(null);

  const { scale, offsetX, offsetY } = scaleCoords(imageWidth, imageHeight);


  // Only show classes that actually appear in detections
  const presentClasses = Array.from(new Set(detections.map(d => d.className)));
  const classCounts: Record<string, number> = {};
  for (const d of detections) {
    classCounts[d.className] = (classCounts[d.className] ?? 0) + 1;
  }

  const handleRingPress = (className: string) => {
    setSelectedClass(prev => (prev === className ? null : className));
  };

  const handleBackgroundPress = () => {
    setSelectedClass(null);
  };

  return (
    <View style={styles.wrapper}>
      {/* ── Image + SVG overlay ── */}
      <View style={styles.mapContainer}>
        <Image
          source={{ uri: imageUri }}
          style={styles.image}
          resizeMode="cover"
        />
        <Svg
          width={DISPLAY_W}
          height={DISPLAY_H}
          style={StyleSheet.absoluteFill}
        >
          {/* Invisible background rect to catch taps outside rings */}
          <Rect
            x={0}
            y={0}
            width={DISPLAY_W}
            height={DISPLAY_H}
            fill="transparent"
            onPress={handleBackgroundPress}
          />
          {detections.map((d, i) => {
            // bbox format: [x1, y1, x2, y2] corners in original image pixel space
            const [x1, y1, x2, y2] = d.bbox;
            const cx = ((x1 + x2) / 2) * scale + offsetX;
            const cy = ((y1 + y2) / 2) * scale + offsetY;
            const r = Math.max(
              ((x2 - x1) * scale) / 2,
              ((y2 - y1) * scale) / 2,
              MIN_RADIUS
            );
            const color = CLASS_COLORS[d.className] ?? '#FFFFFF';
            const isSelected = selectedClass === null || selectedClass === d.className;
            const opacity = isSelected ? 1 : 0.2;
            const strokeWidth = selectedClass === d.className ? 2.5 : 2;

            return (
              <Circle
                key={i}
                cx={cx}
                cy={cy}
                r={r}
                stroke={color}
                strokeWidth={strokeWidth}
                fill={color}
                fillOpacity={0.15}
                opacity={opacity}
                onPress={() => handleRingPress(d.className)}
              />
            );
          })}
        </Svg>
      </View>

      {/* ── Legend ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.legendScroll}
        contentContainerStyle={styles.legendContent}
      >
        {presentClasses.map(cls => {
          const color = CLASS_COLORS[cls] ?? '#FFFFFF';
          const isActive = selectedClass === cls;
          const isOther = selectedClass !== null && selectedClass !== cls;
          return (
            <TouchableOpacity
              key={cls}
              activeOpacity={0.7}
              onPress={() => handleRingPress(cls)}
              style={[
                styles.legendPill,
                isActive && { borderColor: color, backgroundColor: color + '22' },
                isOther && styles.legendPillDimmed,
              ]}
            >
              <View style={[styles.legendDot, { backgroundColor: color, opacity: isOther ? 0.3 : 1 }]} />
              <Text style={[styles.legendText, isOther && styles.legendTextDimmed]}>
                {cls.charAt(0).toUpperCase() + cls.slice(1)}
              </Text>
              <Text style={[styles.legendCount, { color }, isOther && styles.legendTextDimmed]}>
                {classCounts[cls]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    marginBottom: 24,
  },
  mapContainer: {
    width: DISPLAY_W,
    height: DISPLAY_H,
    borderRadius: 24,
    overflow: 'hidden',
  },
  image: {
    width: DISPLAY_W,
    height: DISPLAY_H,
  },
  legendScroll: {
    marginTop: 12,
    alignSelf: 'stretch',
  },
  legendContent: {
    paddingHorizontal: 20,
    gap: 8,
    flexDirection: 'row',
  },
  legendPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  legendPillDimmed: {
    borderColor: 'rgba(255,255,255,0.05)',
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    color: '#FFFFFF',
    fontFamily: Fonts.regular,
    fontSize: 12,
  },
  legendTextDimmed: {
    color: 'rgba(255,255,255,0.3)',
  },
  legendCount: {
    fontFamily: Fonts.medium,
    fontSize: 12,
  },
});
