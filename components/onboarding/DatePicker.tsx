import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

export type BirthDate = { month: number; day: number; year: number };

const MIN_DATE = new Date(1900, 0, 1);
const MAX_DATE = new Date();

function birthDateToDate(b: BirthDate): Date {
  return new Date(b.year, b.month - 1, b.day);
}

function dateToBirthDate(d: Date): BirthDate {
  return { month: d.getMonth() + 1, day: d.getDate(), year: d.getFullYear() };
}

export default function DatePicker({
  value,
  onChange,
}: {
  value: BirthDate;
  onChange: (v: BirthDate) => void;
}) {
  return (
    <View style={s.container}>
      <DateTimePicker
        value={birthDateToDate(value)}
        mode="date"
        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
        minimumDate={MIN_DATE}
        maximumDate={MAX_DATE}
        textColor="#FFFFFF"
        themeVariant="dark"
        onChange={(_event, d) => {
          if (d) onChange(dateToBirthDate(d));
        }}
        style={s.picker}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginTop: 16,
  },
  picker: {
    width: '100%',
  },
});
