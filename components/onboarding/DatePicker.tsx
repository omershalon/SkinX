import React, { useState, useRef, useCallback, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Picker } from '@react-native-picker/picker';

export type BirthDate = { month: number; day: number; year: number };

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 2030 - 1899 }, (_, i) => 1900 + i).reverse();

const MONTH_ITEMS = MONTHS.map((m, i) => ({ label: m, value: i + 1 }));
const DAY_ITEMS = DAYS.map((d) => ({ label: String(d), value: d }));
const YEAR_ITEMS = YEARS.map((y) => ({ label: String(y), value: y }));

const itemStyle = { fontSize: 15, color: '#fff' };

// Local state keeps selectedValue in sync (prevents snap-back)
// valueRef is read by parent on unmount
function WheelColumn({ items, initial, valueRef, style, onChangeNotify }: {
  items: { label: string; value: number }[];
  initial: number;
  valueRef: React.MutableRefObject<number>;
  style: any;
  onChangeNotify: () => void;
}) {
  const [val, setVal] = useState(initial);

  const handleChange = useCallback((v: number) => {
    setVal(v);
    valueRef.current = v;
    onChangeNotify();
  }, [onChangeNotify]);

  return (
    <Picker selectedValue={val} onValueChange={handleChange} style={style} itemStyle={itemStyle}>
      {items.map((item) => (
        <Picker.Item key={item.value} label={item.label} value={item.value} />
      ))}
    </Picker>
  );
}

export default React.memo(function DatePicker({
  value,
  onChange,
}: {
  value: BirthDate;
  onChange: (v: BirthDate) => void;
}) {
  const monthRef = useRef(value.month);
  const dayRef = useRef(value.day);
  const yearRef = useRef(value.year);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const notify = useCallback(() => {
    onChangeRef.current({
      month: monthRef.current,
      day: dayRef.current,
      year: yearRef.current,
    });
  }, []);

  return (
    <View style={s.container}>
      <WheelColumn items={MONTH_ITEMS} initial={value.month} valueRef={monthRef} style={s.monthPicker} onChangeNotify={notify} />
      <WheelColumn items={DAY_ITEMS} initial={value.day} valueRef={dayRef} style={s.dayPicker} onChangeNotify={notify} />
      <WheelColumn items={YEAR_ITEMS} initial={value.year} valueRef={yearRef} style={s.yearPicker} onChangeNotify={notify} />
    </View>
  );
}, () => true);

const s = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  monthPicker: {
    flex: 2.5,
  },
  dayPicker: {
    flex: 1.2,
  },
  yearPicker: {
    flex: 2,
  },
});
