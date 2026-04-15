import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
  TextInput,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import Reanimated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  interpolate,
  runOnJS,
} from 'react-native-reanimated';
import Svg, { Path, Circle, Line, Polyline } from 'react-native-svg';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useTabTransition } from '@/hooks/useTabTransition';
import { Colors, Typography, BorderRadius, Spacing, Shadows } from '@/lib/theme';
import ScreenBackground from '@/components/ScreenBackground';
import ParticleBurst, { ParticleBurstHandle } from '@/components/ParticleBurst';
import { useTranslation } from 'react-i18next';

// ─── SVG Icon Components ────────────────────────────────────────────────────

/** Camera icon for empty state */
const CameraIcon = ({ size = 64, color = Colors.primary }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2v11z"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
    <Circle cx={12} cy={13} r={4} stroke={color} strokeWidth={1.5} fill="none" />
    {/* Flash burst */}
    <Line x1={19} y1={2} x2={19} y2={4} stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    <Line x1={17.5} y1={2.5} x2={18.5} y2={3.5} stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    <Line x1={20.5} y1={2.5} x2={19.5} y2={3.5} stroke={color} strokeWidth={1.5} strokeLinecap="round" />
  </Svg>
);

/** Close (X) icon for modal */
const CloseIcon = ({ size = 14, color = Colors.textSecondary }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Line x1={18} y1={6} x2={6} y2={18} stroke={color} strokeWidth={2.5} strokeLinecap="round" />
    <Line x1={6} y1={6} x2={18} y2={18} stroke={color} strokeWidth={2.5} strokeLinecap="round" />
  </Svg>
);

/** Chevron left icon */
const ChevronLeftIcon = ({ size = 28, color = Colors.primary }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Polyline points="15,18 9,12 15,6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
  </Svg>
);

/** Chevron right icon */
const ChevronRightIcon = ({ size = 28, color = Colors.primary }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Polyline points="9,6 15,12 9,18" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
  </Svg>
);

import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, addMonths, differenceInWeeks } from 'date-fns';

type ProgressPhoto = {
  id: string;
  user_id: string;
  photo_url: string;
  week_number: number;
  severity_score: number;
  improvement_percentage: number | null;
  analysis_notes: string;
  notes: string;
  annotations?: Record<string, string>;
  created_at: string;
};

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const DAY_CELL_W = Math.floor(SCREEN_WIDTH / 7);
const DAY_CELL_H = Math.floor(DAY_CELL_W * 1.4); // taller rectangles like BeReal

const ZONE_KEYS: Record<string, string> = {
  forehead: 'forehead',
  nose: 'nose',
  left_cheek: 'leftCheek',
  right_cheek: 'rightCheek',
  chin: 'chin',
};

const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

export default function ProgressScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { animatedStyle } = useTabTransition();
  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  // Calendar state
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const hasScrolledRef = useRef(false);
  const monthYPositions = useRef<Record<number, number>>({});

  // Detail modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [modalIndex, setModalIndex] = useState(0);
  const [editingNote, setEditingNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const flatListRef = useRef<FlatList>(null);


  // Bottom sheet animation (Reanimated — runs on UI thread)
  const sheetProgress = useSharedValue(0);
  const [expandPhoto, setExpandPhoto] = useState<ProgressPhoto | null>(null);
  const burstRef = useRef<ParticleBurstHandle>(null);


  const fetchPhotos = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data } = await supabase
      .from('progress_photos')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    const fetched = (data as ProgressPhoto[]) || [];
    setPhotos(fetched);

    setLoading(false);
  }, []);

  useEffect(() => { fetchPhotos(); }, [fetchPhotos]);

  // ─── Upload + Claude analysis ─────────────────────────────────────────────
  const logProgressPhoto = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
      base64: true,
    });

    if (result.canceled || !result.assets[0]) return;

    setUploading(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const uri = result.assets[0].uri;
      const base64 = result.assets[0].base64 ?? await FileSystem.readAsStringAsync(uri, {
        encoding: 'base64' as any,
      });

      const weekNumber = photos.length > 0
        ? differenceInWeeks(new Date(), new Date(photos[photos.length - 1].created_at)) + photos[photos.length - 1].week_number
        : 1;

      // Upload to storage (best-effort)
      let photoUrl = uri;
      try {
        const fileName = `${user.id}/progress-${Date.now()}.jpg`;
        const { data: uploadData } = await supabase.storage
          .from('progress-photos')
          .upload(fileName, decode(base64), { contentType: 'image/jpeg' });
        if (uploadData) {
          const { data: { publicUrl } } = supabase.storage.from('progress-photos').getPublicUrl(fileName);
          photoUrl = publicUrl;
        }
      } catch { /* keep local URI */ }

      const { data: trackData, error: fnError } = await supabase.functions.invoke('track-progress', {
        body: { user_id: user.id, image_base64: base64, week_number: weekNumber },
      });

      if (fnError) throw fnError;

      const { error: insertError } = await supabase.from('progress_photos').insert({
        user_id: user.id,
        photo_url: photoUrl,
        week_number: weekNumber,
        severity_score: Math.round(trackData.severity_score ?? 5),
        improvement_percentage: trackData.improvement_percentage ?? null,
        analysis_notes: trackData.analysis_notes ?? '',
        notes: '',
        annotations: trackData.zones ?? {},
      } as any);

      if (insertError) throw insertError;

      await fetchPhotos();
      burstRef.current?.trigger();
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      console.error('Progress tracking error:', err);
      Alert.alert('Error', t('progress.errorSavePhoto'));
    } finally {
      setUploading(false);
    }
  };

  // ─── Note saving ─────────────────────────────────────────────────────────
  const saveNote = async () => {
    const photo = photos[modalIndex];
    if (!photo) return;
    setSavingNote(true);
    await supabase.from('progress_photos').update({ notes: editingNote }).eq('id', photo.id);
    setSavingNote(false);
    setPhotos(prev => prev.map((p, i) => i === modalIndex ? { ...p, notes: editingNote } : p));
  };

  // ─── Open modal (from comparison cards etc) ────────────────────────────────
  const openModal = (index: number) => {
    setModalIndex(index);
    setEditingNote(photos[index]?.notes ?? '');
    setModalVisible(true);
    setTimeout(() => {
      flatListRef.current?.scrollToIndex({ index, animated: false });
    }, 50);
  };

  // Reanimated animated styles for the bottom sheet
  const sheetAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(sheetProgress.value, [0, 1], [SCREEN_HEIGHT * 0.9, 0]) }],
  }));
  const backdropAnimStyle = useAnimatedStyle(() => ({
    opacity: sheetProgress.value,
  }));

  // ─── Expand from calendar cell ────────────────────────────────────────────
  const expandFromCell = (_dateKey: string, photo: ProgressPhoto) => {
    setExpandPhoto(photo);
    sheetProgress.value = 0;
    sheetProgress.value = withTiming(1, {
      duration: 350,
      easing: Easing.out(Easing.cubic),
    });
  };

  const closeExpand = () => {
    sheetProgress.value = withTiming(0, {
      duration: 250,
      easing: Easing.in(Easing.cubic),
    }, (finished) => {
      if (finished) runOnJS(setExpandPhoto)(null);
    });
  };

  // ─── Calendar helpers ─────────────────────────────────────────────────────
  // Generate months: 12 past + current + 3 future = 16 months
  const MONTHS_PAST = 12;
  const MONTHS_FUTURE = 3;
  const CURRENT_MONTH_INDEX = MONTHS_PAST; // index of the current month in the array
  const allMonths = Array.from({ length: MONTHS_PAST + 1 + MONTHS_FUTURE }, (_, i) =>
    addMonths(new Date(), i - MONTHS_PAST)
  );

  // Group photos by date
  const photosByDate = photos.reduce<Record<string, ProgressPhoto[]>>((acc, p) => {
    const key = format(new Date(p.created_at), 'yyyy-MM-dd');
    if (!acc[key]) acc[key] = [];
    acc[key].push(p);
    return acc;
  }, {});



  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <Animated.View style={[styles.root, { paddingTop: insets.top }, animatedStyle]}>
      <ScreenBackground preset="progress" />
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>{t('progress.title')}</Text>
          </View>
          <TouchableOpacity
            style={[styles.logButton, uploading && styles.buttonDisabled]}
            onPress={logProgressPhoto}
            disabled={uploading}
            activeOpacity={0.85}
          >
            {uploading
              ? <ActivityIndicator size="small" color={Colors.white} />
              : <Text style={styles.logButtonText}>+ Log</Text>}
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <ScrollView
          ref={scrollRef}
          style={styles.calendarFull}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={(_w, h) => {
            if (!hasScrolledRef.current && h > 0) {
              const y = monthYPositions.current[CURRENT_MONTH_INDEX];
              if (y != null && y > 0) {
                hasScrolledRef.current = true;
                scrollRef.current?.scrollTo({ y, animated: false });
              }
            }
          }}
        >
          {allMonths.map((month, monthIdx) => {
            const days = eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) });
            const pad = Array(getDay(startOfMonth(month))).fill(null);
            const allCells = [...pad.map(() => null), ...days];
            const isCurrentMonth = monthIdx === CURRENT_MONTH_INDEX;

            return (
              <View
                key={format(month, 'yyyy-MM')}
                style={styles.monthBlock}
                onLayout={(e) => {
                  monthYPositions.current[monthIdx] = e.nativeEvent.layout.y;
                  if (isCurrentMonth && !hasScrolledRef.current) {
                    const y = e.nativeEvent.layout.y;
                    // Try immediately and with delays to ensure ScrollView is ready
                    hasScrolledRef.current = true;
                    scrollRef.current?.scrollTo({ y, animated: false });
                    setTimeout(() => scrollRef.current?.scrollTo({ y, animated: false }), 50);
                  }
                }}
              >
                <Text style={styles.monthTitle}>{format(month, 'MMMM yyyy')}</Text>

                {/* Weekday headers */}
                <View style={{ flexDirection: 'row' }}>
                  {WEEKDAYS.map((d, i) => (
                    <View key={i} style={styles.dayHeader}>
                      <Text style={styles.dayHeaderText}>{d}</Text>
                    </View>
                  ))}
                </View>

                {/* Day grid */}
                {Array.from({ length: Math.ceil(allCells.length / 7) }, (_, rowIdx) => {
                  const startCell = rowIdx * 7;
                  const rowCells  = allCells.slice(startCell, startCell + 7);
                  return (
                    <View key={rowIdx} style={styles.calendarRow}>
                      {rowCells.map((day, cellIdx) => {
                        if (!day) return <View key={`pad-${cellIdx}`} style={styles.dayCell} />;
                        const key        = format(day, 'yyyy-MM-dd');
                        const dayPhotos  = photosByDate[key] ?? [];
                        const latestDayPhoto = dayPhotos[0] ?? null;
                        const hasPhotos  = dayPhotos.length > 0;
                        const isToday    = isSameDay(day, new Date());
                        return (
                          <TouchableOpacity
                            key={key}
                            style={styles.dayCell}
                            onPress={() => { if (!latestDayPhoto) return; setSelectedDay(day); expandFromCell(key, latestDayPhoto); }}
                            activeOpacity={hasPhotos ? 0.7 : 1}
                          >
                            <View
                              style={[
                                styles.dayCellRect,
                                hasPhotos && styles.dayCellLogged,
                                isToday && styles.dayCellTodayLogged,
                              ]}
                            >
                              {hasPhotos && (
                                <View style={styles.dayCellInner}>
                                  {latestDayPhoto?.photo_url ? (
                                    <Image source={{ uri: latestDayPhoto.photo_url }} style={styles.dayCellThumb} />
                                  ) : null}
                                </View>
                              )}
                              <Text style={[
                                styles.dayCellNumber,
                                hasPhotos && styles.dayCellNumberLogged,
                              ]}>
                                {format(day, 'd')}
                              </Text>
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  );
                })}
              </View>
            );
          })}
          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      {/* ── DETAIL MODAL ──────────────────────────────────────────────────── */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView style={styles.modalRoot} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          {/* Modal header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalClose}>
              <CloseIcon size={14} color={Colors.textSecondary} />
            </TouchableOpacity>
            <Text style={styles.modalHeaderTitle}>
              {photos[modalIndex] ? format(new Date(photos[modalIndex].created_at), 'MMMM d, yyyy') : ''}
            </Text>
            <View style={styles.modalNav}>
              <TouchableOpacity
                onPress={() => {
                  const next = Math.min(modalIndex + 1, photos.length - 1);
                  setModalIndex(next);
                  setEditingNote(photos[next]?.notes ?? '');
                  flatListRef.current?.scrollToIndex({ index: next, animated: true });
                }}
                disabled={modalIndex >= photos.length - 1}
                style={[styles.modalNavBtn, modalIndex >= photos.length - 1 && styles.modalNavBtnDisabled]}
              >
                <ChevronLeftIcon size={24} color={Colors.primary} />
              </TouchableOpacity>
              <Text style={styles.modalNavCount}>{modalIndex + 1}/{photos.length}</Text>
              <TouchableOpacity
                onPress={() => {
                  const prev = Math.max(modalIndex - 1, 0);
                  setModalIndex(prev);
                  setEditingNote(photos[prev]?.notes ?? '');
                  flatListRef.current?.scrollToIndex({ index: prev, animated: true });
                }}
                disabled={modalIndex <= 0}
                style={[styles.modalNavBtn, modalIndex <= 0 && styles.modalNavBtnDisabled]}
              >
                <ChevronRightIcon size={24} color={Colors.primary} />
              </TouchableOpacity>
            </View>
          </View>

          <FlatList
            ref={flatListRef}
            data={photos}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={p => p.id}
            initialScrollIndex={modalIndex}
            getItemLayout={(_, index) => ({ length: SCREEN_WIDTH, offset: SCREEN_WIDTH * index, index })}
            onMomentumScrollEnd={e => {
              const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
              setModalIndex(index);
              setEditingNote(photos[index]?.notes ?? '');
            }}
            renderItem={({ item: photo }) => (
              <ScrollView style={{ width: SCREEN_WIDTH }} contentContainerStyle={styles.modalItemContent}>
                <Image source={{ uri: photo.photo_url }} style={styles.modalImage} resizeMode="cover" />

                <View style={styles.modalBadgeRow}>
                  <View style={styles.modalBadge}>
                    <Text style={styles.modalBadgeLabel}>{t('progress.week', { number: photo.week_number })}</Text>
                    <Text style={styles.modalBadgeValue}>{photo.week_number}</Text>
                  </View>
                  <View style={[styles.modalBadge, { backgroundColor: Colors.primary + '15', borderColor: Colors.primary }]}>
                    <Text style={[styles.modalBadgeLabel, { color: Colors.primary }]}>{t('progress.severity')}</Text>
                    <Text style={[styles.modalBadgeValue, { color: Colors.primary }]}>{photo.severity_score.toFixed(1)}</Text>
                  </View>
                  {photo.improvement_percentage != null && (
                    <View style={[styles.modalBadge, {
                      backgroundColor: photo.improvement_percentage >= 0 ? Colors.successLight : Colors.errorLight,
                      borderColor: photo.improvement_percentage >= 0 ? Colors.success : Colors.error,
                    }]}>
                      <Text style={[styles.modalBadgeLabel, { color: photo.improvement_percentage >= 0 ? Colors.success : Colors.error }]}>{t('progress.change')}</Text>
                      <Text style={[styles.modalBadgeValue, { color: photo.improvement_percentage >= 0 ? Colors.success : Colors.error }]}>
                        {photo.improvement_percentage > 0 ? '+' : ''}{photo.improvement_percentage.toFixed(0)}%
                      </Text>
                    </View>
                  )}
                </View>

                {/* AI notes */}
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>{t('progress.aiAnalysis')}</Text>
                  <View style={styles.modalInsightBox}>
                    <Text style={styles.modalInsightText}>{photo.analysis_notes}</Text>
                  </View>
                </View>

                {/* Zone breakdown */}
                {photo.annotations && Object.values(photo.annotations).some(Boolean) && (
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>{t('progress.zoneBreakdown')}</Text>
                    {Object.entries(ZONE_KEYS).map(([key, tKey]) => {
                      const val = photo.annotations[key];
                      if (!val) return null;
                      return (
                        <View key={key} style={styles.zoneRow}>
                          <Text style={styles.zoneLabel}>{t(`progress.${tKey}`)}</Text>
                          <Text style={styles.zoneValue}>{val}</Text>
                        </View>
                      );
                    })}
                  </View>
                )}

                {/* User notes */}
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>{t('progress.myNotes')}</Text>
                  <TextInput
                    style={styles.notesInput}
                    multiline
                    placeholder={t('progress.notesPlaceholder')}
                    placeholderTextColor={Colors.textMuted}
                    value={editingNote}
                    onChangeText={setEditingNote}
                  />
                  <TouchableOpacity
                    style={[styles.saveNoteBtn, savingNote && styles.buttonDisabled]}
                    onPress={saveNote}
                    disabled={savingNote}
                  >
                    <Text style={styles.saveNoteBtnText}>{savingNote ? t('progress.saving') : t('progress.saveNote')}</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          />
        </KeyboardAvoidingView>
      </Modal>

      {/* ── BOTTOM SHEET PHOTO DETAIL ──────────────────────────────────── */}
      {expandPhoto && (
        <View style={styles.expandOverlay}>
          <Reanimated.View style={[styles.expandBackdrop, backdropAnimStyle]}>
            <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={closeExpand} />
          </Reanimated.View>
          <Reanimated.View style={[styles.expandSheet, sheetAnimStyle]}>

            {/* Drag handle */}
            <TouchableOpacity onPress={closeExpand} activeOpacity={0.7} style={styles.sheetHandleArea}>
              <View style={styles.sheetHandle} />
            </TouchableOpacity>

            {/* Swipeable photos */}
            <FlatList
              data={[...photos].reverse()}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              keyExtractor={p => p.id}
              initialScrollIndex={Math.max(0, photos.length - 1 - photos.findIndex(p => p.id === expandPhoto.id))}
              getItemLayout={(_, index) => ({ length: SCREEN_WIDTH, offset: SCREEN_WIDTH * index, index })}
              onMomentumScrollEnd={e => {
                const reversed = [...photos].reverse();
                const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
                if (reversed[idx]) setExpandPhoto(reversed[idx]);
              }}
              renderItem={({ item: photo }) => (
                <ScrollView
                  style={{ width: SCREEN_WIDTH }}
                  contentContainerStyle={{ paddingBottom: 40 }}
                  showsVerticalScrollIndicator={false}
                  bounces={false}
                >
                  {/* Photo with padding and rounded corners */}
                  <View style={styles.expandImageWrap}>
                    <Image
                      source={{ uri: photo.photo_url }}
                      style={styles.expandImage}
                      resizeMode="cover"
                    />
                  </View>

                  <View style={styles.expandInfo}>
                    {/* Date + Week pill row */}
                    <View style={styles.expandDateRow}>
                      <Text style={styles.expandDate}>
                        {format(new Date(photo.created_at), 'MMMM d, yyyy')}
                      </Text>
                      <View style={styles.expandWeekPill}>
                        <Text style={styles.expandWeekPillText}>{t('progress.week', { number: photo.week_number })}</Text>
                      </View>
                    </View>

                    {/* Score badges */}
                    <View style={styles.expandBadgeRow}>
                      <View style={styles.expandBadge}>
                        <Text style={styles.expandBadgeLabel}>{t('progress.severity')}</Text>
                        <Text style={styles.expandBadgeValue}>{photo.severity_score.toFixed(1)}</Text>
                      </View>
                      {photo.improvement_percentage != null && (
                        <View style={[styles.expandBadge, {
                          borderColor: photo.improvement_percentage >= 0 ? Colors.success + '40' : Colors.error + '40',
                          backgroundColor: (photo.improvement_percentage >= 0 ? Colors.success : Colors.error) + '10',
                        }]}>
                          <Text style={[styles.expandBadgeLabel, {
                            color: photo.improvement_percentage >= 0 ? Colors.success : Colors.error,
                          }]}>{t('progress.change')}</Text>
                          <Text style={[styles.expandBadgeValue, {
                            color: photo.improvement_percentage >= 0 ? Colors.success : Colors.error,
                          }]}>
                            {photo.improvement_percentage > 0 ? '+' : ''}{photo.improvement_percentage.toFixed(0)}%
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* AI Analysis card */}
                    {photo.analysis_notes ? (
                      <View style={styles.expandAnalysisCard}>
                        <View style={styles.expandAnalysisAccent} />
                        <View style={styles.expandAnalysisContent}>
                          <Text style={styles.expandSectionTitle}>{t('progress.aiAnalysis')}</Text>
                          <Text style={styles.expandAnalysisText}>{photo.analysis_notes}</Text>
                        </View>
                      </View>
                    ) : null}

                    {/* Zone Breakdown */}
                    {photo.annotations && Object.values(photo.annotations).some(Boolean) && (
                      <View style={styles.expandSection}>
                        <Text style={styles.expandSectionTitle}>{t('progress.zoneBreakdown')}</Text>
                        <View style={styles.zoneCard}>
                          {Object.entries(ZONE_KEYS).map(([zoneKey, tKey]) => {
                            const val = photo.annotations?.[zoneKey];
                            if (!val) return null;
                            return (
                              <View key={zoneKey} style={styles.zoneRow}>
                                <Text style={styles.zoneLabel}>{t(`progress.${tKey}`)}</Text>
                                <Text style={styles.zoneValue}>{val}</Text>
                              </View>
                            );
                          })}
                        </View>
                      </View>
                    )}
                  </View>
                </ScrollView>
              )}
            />
          </Reanimated.View>
        </View>
      )}
      <ParticleBurst ref={burstRef} />
    </Animated.View>
  );
}

function decode(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },

  // Header
  header: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    backgroundColor: Colors.background,
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { ...Typography.displayMedium, color: Colors.text },
  headerSubtitle: { ...Typography.bodySmall, color: Colors.textMuted, marginTop: Spacing.xxs },
  logButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 80,
    minHeight: 36,
    ...Shadows.sm,
  },
  logButtonText: { ...Typography.labelLarge, color: Colors.white },
  buttonDisabled: { opacity: 0.6 },

  // Empty / Loading
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.xxl, gap: Spacing.lg },
  emptyIcon: { marginBottom: Spacing.xs },
  emptyTitle: { ...Typography.displaySmall, color: Colors.text, textAlign: 'center' },
  emptySubtitle: { ...Typography.bodyMedium, color: Colors.textMuted, textAlign: 'center', lineHeight: 22 },
  startButton: {
    width: '80%',
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    height: 54,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.md,
  },
  startButtonText: { ...Typography.headlineSmall, color: Colors.white },

  // Calendar full screen layout
  calendarFull: {
    flex: 1,
  },

  // Calendar
  monthBlock: {
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.sm,
  },
  monthTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.text,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  calendarRow: { flexDirection: 'row', marginBottom: 2 },
  dayHeader: { width: DAY_CELL_W, alignItems: 'center', paddingBottom: Spacing.sm },
  dayHeaderText: { fontSize: 11, color: Colors.textMuted, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },
  dayCell: {
    width: DAY_CELL_W,
    height: DAY_CELL_H,
    padding: 1,
  },
  dayCellRect: {
    flex: 1,
    borderRadius: 8,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 4,
    backgroundColor: Colors.card,
    overflow: 'hidden',
  },
  dayCellLogged: {
    borderWidth: 0,
  },
  dayCellTodayLogged: {
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  dayCellInner: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 8,
    overflow: 'hidden',
  },
  dayCellThumb: {
    width: '100%',
    height: '100%',
    opacity: 0.85,
  },
  dayCellNumber: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textMuted,
    zIndex: 1,
  },
  dayCellNumberLogged: {
    color: Colors.white,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  // Modal
  modalRoot: { flex: 1, backgroundColor: Colors.background },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalHeaderTitle: {
    ...Typography.headlineSmall,
    color: Colors.text,
  },
  modalNav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  modalNavBtn: { padding: Spacing.xs },
  modalNavBtnDisabled: { opacity: 0.3 },
  modalNavCount: { ...Typography.caption, color: Colors.textMuted, minWidth: 32, textAlign: 'center' },
  modalItemContent: { paddingBottom: 60 },
  modalImage: { width: SCREEN_WIDTH, height: SCREEN_WIDTH * 1.1 },
  modalBadgeRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    flexWrap: 'wrap',
  },
  modalBadge: {
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    minWidth: 70,
  },
  modalBadgeLabel: { ...Typography.caption, color: Colors.textMuted, marginBottom: 2 },
  modalBadgeValue: { ...Typography.headlineSmall, color: Colors.text },
  modalSection: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.xl, gap: Spacing.sm },
  modalSectionTitle: { ...Typography.labelLarge, color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.8 },
  modalInsightBox: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalInsightText: { ...Typography.bodyMedium, color: Colors.text, lineHeight: 22 },
  zoneRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  zoneLabel: { ...Typography.bodySmall, color: Colors.textMuted },
  zoneValue: { ...Typography.bodySmall, color: Colors.text, fontWeight: '600' },
  notesInput: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    ...Typography.bodyMedium,
    color: Colors.text,
    minHeight: 80,
    borderWidth: 1,
    borderColor: Colors.border,
    textAlignVertical: 'top',
  },
  saveNoteBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveNoteBtnText: { ...Typography.labelLarge, color: Colors.white },

  // Bottom sheet expand
  expandOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 100 },
  expandBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },
  expandSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.9,
    backgroundColor: Colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  sheetHandleArea: { alignItems: 'center', paddingTop: Spacing.md, paddingBottom: Spacing.sm },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.border },
  expandImageWrap: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    borderRadius: 16,
    overflow: 'hidden',
  },
  expandImage: { width: SCREEN_WIDTH - Spacing.lg * 2, height: (SCREEN_WIDTH - Spacing.lg * 2) * 1.1 },
  expandInfo: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, gap: Spacing.lg },
  expandDateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  expandDate: { ...Typography.headlineSmall, color: Colors.text },
  expandWeekPill: {
    backgroundColor: Colors.primary + '20',
    borderRadius: BorderRadius.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xxs,
  },
  expandWeekPillText: { ...Typography.caption, color: Colors.primary, fontWeight: '700' },
  expandBadgeRow: { flexDirection: 'row', gap: Spacing.sm },
  expandBadge: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  expandBadgeLabel: { ...Typography.caption, color: Colors.textMuted, marginBottom: 2 },
  expandBadgeValue: { ...Typography.headlineSmall, color: Colors.text },
  expandAnalysisCard: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  expandAnalysisAccent: { width: 4, backgroundColor: Colors.primary },
  expandAnalysisContent: { flex: 1, padding: Spacing.lg, gap: Spacing.sm },
  expandSectionTitle: { ...Typography.labelLarge, color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.8 },
  expandAnalysisText: { ...Typography.bodyMedium, color: Colors.text, lineHeight: 22 },
  expandSection: { gap: Spacing.sm },
  zoneCard: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
});
