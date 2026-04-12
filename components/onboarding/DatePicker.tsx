import { useRef, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Fonts } from '@/lib/theme';

const ITEM_H = 48;
const VISIBLE = 5; // must be odd
const PICKER_H = ITEM_H * VISIBLE;
const PAD = ITEM_H * Math.floor(VISIBLE / 2);

export type BirthDate = { month: number; day: number; year: number };

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];
const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: CURRENT_YEAR - 1939 }, (_, i) => 1940 + i).reverse();

function Column({
  items,
  selectedIndex,
  onSelect,
  width,
}: {
  items: (string | number)[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  width: number;
}) {
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ y: selectedIndex * ITEM_H, animated: false });
  }, []);

  const onScrollEnd = useCallback((e: any) => {
    const y = e.nativeEvent.contentOffset.y;
    const index = Math.round(y / ITEM_H);
    const clamped = Math.max(0, Math.min(items.length - 1, index));
    onSelect(clamped);
    scrollRef.current?.scrollTo({ y: clamped * ITEM_H, animated: true });
  }, [items.length, onSelect]);

  return (
    <View style={[col.wrap, { width }]}>
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_H}
        decelerationRate="fast"
        onMomentumScrollEnd={onScrollEnd}
        onScrollEndDrag={onScrollEnd}
        contentContainerStyle={{ paddingVertical: PAD }}
        scrollEventThrottle={16}
      >
        {items.map((item, i) => {
          const dist = Math.abs(i - selectedIndex);
          const opacity = dist === 0 ? 1 : dist === 1 ? 0.45 : 0.2;
          const fontFamily = dist === 0 ? Fonts.semibold : Fonts.regular;
          const fontSize = dist === 0 ? 20 : 17;
          return (
            <View key={i} style={col.item}>
              <Text style={[col.text, { opacity, fontFamily, fontSize }]}>
                {item}
              </Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

export default function DatePicker({
  value,
  onChange,
}: {
  value: BirthDate;
  onChange: (v: BirthDate) => void;
}) {
  const monthIdx = value.month - 1;
  const dayIdx = value.day - 1;
  const yearIdx = YEARS.indexOf(value.year) === -1 ? 0 : YEARS.indexOf(value.year);

  return (
    <View style={s.container}>
      {/* Selection highlight */}
      <View pointerEvents="none" style={s.highlight} />

      <Column
        items={MONTHS}
        selectedIndex={monthIdx}
        onSelect={(i) => onChange({ ...value, month: i + 1 })}
        width={150}
      />
      <Column
        items={DAYS}
        selectedIndex={dayIdx}
        onSelect={(i) => onChange({ ...value, day: i + 1 })}
        width={70}
      />
      <Column
        items={YEARS}
        selectedIndex={yearIdx}
        onSelect={(i) => onChange({ ...value, year: YEARS[i] })}
        width={90}
      />
    </View>
  );
}

const col = StyleSheet.create({
  wrap: { height: PICKER_H, overflow: 'hidden' },
  item: { height: ITEM_H, justifyContent: 'center', alignItems: 'center' },
  text: { color: '#fff' },
});

const s = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 32,
    position: 'relative',
  },
  highlight: {
    position: 'absolute',
    left: 12,
    right: 12,
    top: '50%',
    marginTop: -ITEM_H / 2,
    height: ITEM_H,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 12,
  },
});
