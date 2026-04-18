import { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Animated,
  Alert,
  ActivityIndicator,
  Image,
  Dimensions,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Colors, Typography, BorderRadius, Spacing } from '@/lib/theme';
import { LoadingOverlay } from '@/components/LoadingOverlay';
import type { ViewAngle, CapturedImage, ScanSession } from '@/lib/scan-types';
import * as ImageManipulator from 'expo-image-manipulator';
import { runDetectionOnAll, countDetections } from '@/lib/yolo';
import { runScanPipeline, loadScanSession } from '@/lib/scan-api';
import {
  getSkinHeadline,
} from '@/lib/snapshot-utils';
import GlowAnalysisDashboard from '@/components/GlowAnalysisDashboard';
import { useTranslation } from 'react-i18next';


const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── SVG Icons ───

function CameraIcon({ size = 48, color = '#FFFFFF' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2v11z"
        stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
      />
      <Circle cx={12} cy={13} r={4} stroke={color} strokeWidth={1.5} />
    </Svg>
  );
}

function CheckIcon({ size = 20, color = '#34D399' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M20 6L9 17l-5-5" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function UploadIcon({ size = 28, color = '#FFFFFF' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M17 8l-5-5-5 5" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M12 3v12" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function ArrowIcon({ direction, size = 24, color = '#FFFFFF' }: { direction: 'left' | 'right'; size?: number; color?: string }) {
  const d = direction === 'left'
    ? 'M19 12H5M5 12l7-7M5 12l7 7'
    : 'M5 12h14M19 12l-7-7M19 12l-7 7';
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d={d} stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export default function ScanScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { loadSessionId, loadTs } = useLocalSearchParams<{ loadSessionId?: string; loadTs?: string }>();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const { t } = useTranslation();

  const STEPS: { angle: ViewAngle; label: string; instruction: string }[] = [
    { angle: 'front', label: t('scan.front'), instruction: t('scan.instructionFront') },
  ];

  // Capture state
  const [currentStep, setCurrentStep] = useState(0);
  const [captures, setCaptures] = useState<(CapturedImage | null)[]>([null]);
  const [previewing, setPreviewing] = useState(false);

  // Processing state
  const [processing, setProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState('');

  // Completed scan — when set, show results inline inside this tab
  const [completedSession, setCompletedSession] = useState<ScanSession | null>(null);
  const [skinProfileId, setSkinProfileId] = useState<string | null>(null);
  const [frontImageDims, setFrontImageDims] = useState<{ width: number; height: number } | null>(null);
  const [planGenerating, setPlanGenerating] = useState(false);

  // Only restore results when explicitly navigated from home (loadTs changes each tap)
  useEffect(() => {
    if (loadSessionId && loadTs) {
      setCompletedSession(null);
      loadScanSession(loadSessionId).then(session => {
        if (session) setCompletedSession(session);
      });
    }
  }, [loadTs]);

  // Shutter animation
  const shutterScale = useRef(new Animated.Value(1)).current;
  const shutterFill = useRef(new Animated.Value(0)).current;

  const onShutterPressIn = useCallback(() => {
    Animated.parallel([
      Animated.spring(shutterScale, { toValue: 0.82, useNativeDriver: true, speed: 50, bounciness: 4 }),
      Animated.timing(shutterFill, { toValue: 1, duration: 200, useNativeDriver: false }),
    ]).start();
  }, []);

  const onShutterPressOut = useCallback(() => {
    Animated.parallel([
      Animated.spring(shutterScale, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 10 }),
      Animated.timing(shutterFill, { toValue: 0, duration: 300, useNativeDriver: false }),
    ]).start();
  }, []);

  const shutterBg = shutterFill.interpolate({ inputRange: [0, 1], outputRange: ['#FFFFFF', '#7C5CFC'] });

  const capturePhoto = async () => {
    if (!cameraRef.current || processing) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.85,
        base64: true,
      });

      if (photo && photo.base64) {
        // Front camera captures a mirrored image — flip it to match what the user sees
        const flipped = await ImageManipulator.manipulateAsync(
          photo.uri,
          [{ flip: ImageManipulator.FlipType.Horizontal }],
          { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG, base64: true }
        );
        const captured: CapturedImage = {
          uri: flipped.uri,
          base64: flipped.base64!,
          width: flipped.width,
          height: flipped.height,
        };

        const newCaptures = [...captures];
        newCaptures[currentStep] = captured;
        setCaptures(newCaptures);
        setPreviewing(false);
      }
    } catch (err) {
      console.error('Capture error:', err);
      Alert.alert(t('scan.errorCaptureFailed'), t('scan.errorCaptureFailedMsg'));
    }
  };

  const pickPhoto = async () => {
    if (processing) return;

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('scan.errorLibraryPermission'), t('scan.errorLibraryPermissionMsg'));
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
      base64: true,
      allowsEditing: false,
    });

    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    if (!asset.base64) {
      Alert.alert(t('scan.errorUploadFailed'), t('scan.errorUploadFailedMsg'));
      return;
    }

    const captured: CapturedImage = {
      uri: asset.uri,
      base64: asset.base64,
      width: asset.width,
      height: asset.height,
    };

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newCaptures = [...captures];
    newCaptures[currentStep] = captured;
    setCaptures(newCaptures);
    setPreviewing(false);
  };

  const retakePhoto = () => {
    const newCaptures = [...captures];
    newCaptures[currentStep] = null;
    setCaptures(newCaptures);
    setPreviewing(false);
  };

  const confirmPhoto = () => {
    setPreviewing(false);
  };

  const allCaptured = captures.every((c) => c !== null);

  const startAnalysis = async () => {
    if (!allCaptured || processing) return;

    setProcessing(true);
    setProcessingStep('Running skin detection...');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not logged in');

      const images = {
        front: captures[0]!,
        left: captures[0]!,
        right: captures[0]!,
      };

      // Step 1: Run YOLO on-device
      setProcessingStep('Detecting acne spots...');
      const detections = await runDetectionOnAll(images);

      // Use imageWidth/imageHeight from DetectionResult — guaranteed same coordinate space as bbox coords
      if (detections.front) {
        setFrontImageDims({ width: detections.front.imageWidth, height: detections.front.imageHeight });
      }
      const totalDetected = countDetections(detections);
      console.log(`[Scan] YOLO detected ${totalDetected} spots`);

      // Step 2: Run full pipeline (upload + Gemini review)
      const { sessionId, skinProfileId: newSkinProfileId } = await runScanPipeline(
        user.id,
        images,
        detections,
        setProcessingStep
      );

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Show results inline inside this tab (no overlay navigation)
      const session = await loadScanSession(sessionId);
      setCompletedSession(session);
      setSkinProfileId(newSkinProfileId);
    } catch (err: any) {
      console.error('Analysis error:', err);
      const message = err?.message || String(err);
      Alert.alert(
        'Analysis Failed',
        message.length > 300 ? message.substring(0, 300) + '…' : message
      );
    } finally {
      setProcessing(false);
      setProcessingStep('');
    }
  };

  const resetScan = () => {
    setCaptures([null]);
    setCurrentStep(0);
    setPreviewing(false);
    setProcessing(false);
    setCompletedSession(null);
    setSkinProfileId(null);
    setFrontImageDims(null);
  };

  // Helper: extract a human-readable message from a Supabase FunctionsHttpError
  const extractEdgeFnError = async (err: any): Promise<string> => {
    // The context is the raw Response object (body not yet consumed)
    const ctx = err?.context;
    if (ctx) {
      try {
        // ctx is a Response — read its JSON body
        if (typeof ctx.json === 'function') {
          const body = await ctx.json();
          if (body?.raw !== undefined) console.warn('[scan] edge fn raw output:', body.raw);
          return body?.error ?? body?.message ?? body?.details ?? JSON.stringify(body);
        }
        // ctx is already a parsed object
        if (typeof ctx === 'object' && (ctx.error || ctx.message)) {
          if (ctx.raw) console.warn('[scan] edge fn raw output:', ctx.raw);
          return ctx.error ?? ctx.message;
        }
      } catch {}
    }
    return err?.message ?? 'Unknown error';
  };

  const handleStartPlan = async () => {
    // Resolve the skin profile id — prefer the one captured during the scan
    let profileId = skinProfileId;
    if (!profileId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('skin_profiles')
          .select('id')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        profileId = data?.id ?? null;
      }
    }

    if (!profileId) {
      Alert.alert('Profile Missing', 'Could not find your skin profile. Please try scanning again.');
      return;
    }

    console.log('[scan] invoking generate-plan with skin_profile_id:', profileId);
    setPlanGenerating(true);

    let invokeError: any = null;
    try {
      // Refresh session so the JWT isn't expired after the long scan process
      await supabase.auth.refreshSession();

      const { error } = await supabase.functions.invoke('generate-plan', {
        body: { skin_profile_id: profileId },
      });
      invokeError = error ?? null;
    } catch (e: any) {
      // Some SDK versions throw instead of returning { error }
      invokeError = e;
    }

    if (invokeError) {
      const detail = await extractEdgeFnError(invokeError);
      console.error('[scan] generate-plan failed:', detail);
      Alert.alert('Plan Generation Failed', detail);
      setPlanGenerating(false);
      return;
    }

    setPlanGenerating(false);
    router.push('/(tabs)/plan');
  };

  // ─── Inline results (stays inside the tab, tab bar remains visible) ─────────
  if (completedSession) {
    if (completedSession.status === 'failed') {
      return (
        <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
          <Text style={{ fontSize: 40, marginBottom: 12 }}>😔</Text>
          <Text style={{ color: '#FFF', fontSize: 18, marginBottom: 8 }}>Scan Failed</Text>
          <TouchableOpacity style={styles.analyzeButton} onPress={resetScan}>
            <Text style={styles.analyzeButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    const headline      = getSkinHeadline(completedSession);
    const description   = completedSession.description ?? '';
    const skinType      = (completedSession.skin_insights as any)?.skin_type ?? 'Normal';
    const primaryConcern = completedSession.primary_acne_type
      ? completedSession.primary_acne_type.charAt(0).toUpperCase() + completedSession.primary_acne_type.slice(1)
      : 'None detected';
    const severity      = completedSession.severity ?? 'mild';
    const severityLabel = severity === 'mild' ? 'Low' : severity === 'moderate' ? 'Moderate' : 'High';

    return (
      <View style={{ flex: 1 }}>
        <LoadingOverlay
          visible={planGenerating}
          title="Building Your Plan"
          subtitle="Personalising your skincare routine…"
          steps={['Reviewing your scan', 'Matching ingredients', 'Ranking priorities', 'Saving your plan']}
        />
        <GlowAnalysisDashboard
          avatarUri={completedSession.front_image_url}
          headline={headline}
          description={description}
          mainConcern={primaryConcern}
          severity={severityLabel}
          skinType={skinType}
          zoneScores={(completedSession as any).zone_scores ?? undefined}
          skinAssessment={(completedSession as any).skin_assessment ?? undefined}
          onStartPlan={handleStartPlan}
          onScanAgain={resetScan}
          onViewFullScan={resetScan}
          detections={completedSession.model_detections?.front}
          imageNativeWidth={frontImageDims?.width ?? 0}
          imageNativeHeight={frontImageDims?.height ?? 0}
        />
      </View>
    );
  }

  // ─── Permission screens ───
  if (!permission) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={Colors.white} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, justifyContent: 'center', alignItems: 'center', gap: Spacing.lg, paddingHorizontal: Spacing.xxl }]}>
        <CameraIcon size={48} color={Colors.white} />
        <Text style={{ ...Typography.headlineMedium, color: Colors.white, textAlign: 'center' }}>
          {t('scan.permissionTitle')}
        </Text>
        <Text style={{ ...Typography.bodyMedium, color: 'rgba(255,255,255,0.6)', textAlign: 'center' }}>
          {t('scan.permissionSubtitle')}
        </Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission} activeOpacity={0.85}>
          <Text style={styles.permissionButtonText}>{t('scan.enableCamera')}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={pickPhoto} activeOpacity={0.75}>
          <Text style={{ ...Typography.bodyMedium, color: Colors.primary }}>
            {t('scan.orUpload')}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ─── Preview of captured photo ───
  if (previewing && captures[currentStep]) {
    return (
      <View style={[styles.container]}>
        <Image source={{ uri: captures[currentStep]!.uri }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
        <View style={[styles.previewOverlay, { paddingBottom: insets.bottom + 30 }]}>
          <View style={styles.previewActions}>
            <TouchableOpacity style={styles.previewBtn} onPress={retakePhoto} activeOpacity={0.8}>
              <Text style={styles.previewBtnText}>{t('scan.retake')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.previewBtn, styles.previewBtnPrimary]} onPress={confirmPhoto} activeOpacity={0.8}>
              <Text style={[styles.previewBtnText, { color: '#FFFFFF' }]}>
                {t('scan.done')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // ─── All 3 captured — review & analyze ───
  if (allCaptured && !previewing) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <LoadingOverlay
          visible={processing}
          title={t('scan.loadingTitle')}
          subtitle={processingStep || t('scan.loadingSubtitle')}
          steps={[t('scan.step1'), t('scan.step2'), t('scan.step3'), t('scan.step4')]}
        />

        <Text style={styles.reviewTitle}>{t('scan.reviewTitle')}</Text>
        <Text style={styles.reviewSubtitle}>{t('scan.reviewSubtitle')}</Text>

        <TouchableOpacity
          style={styles.reviewSingleCard}
          onPress={() => { setCurrentStep(0); retakePhoto(); }}
          activeOpacity={0.8}
        >
          <Image source={{ uri: captures[0]!.uri }} style={styles.reviewImage} resizeMode="cover" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.analyzeButton, processing && { opacity: 0.6 }]}
          onPress={startAnalysis}
          disabled={processing}
          activeOpacity={0.85}
        >
          <Text style={styles.analyzeButtonText}>
            {processing ? t('scan.analyzing') : t('scan.analyze')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.resetButton} onPress={resetScan} disabled={processing}>
          <Text style={styles.resetButtonText}>{t('scan.startOver')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ─── Camera capture view ───
  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFillObject} facing="front" />

      {/* Top instruction — where the step bar used to be */}
      <View style={[styles.topInstructionRow, { top: insets.top + 12 }]}>
        <View style={styles.instructionBadge}>
          <Text style={styles.instructionText}>{STEPS[currentStep].instruction}</Text>
        </View>
      </View>

      {/* Corner brackets */}
      <View style={[StyleSheet.absoluteFillObject, { justifyContent: 'center', alignItems: 'center' }]}>
        <View style={[styles.cornerBracket, styles.cTL]} />
        <View style={[styles.cornerBracket, styles.cTR]} />
        <View style={[styles.cornerBracket, styles.cBL]} />
        <View style={[styles.cornerBracket, styles.cBR]} />
      </View>

      {/* Shutter button */}
      <View style={[styles.shutterArea, { paddingBottom: insets.bottom + 30 }]}>
        <View style={styles.shutterRow}>
          {/* Spacer to balance the upload button */}
          <View style={styles.shutterSideSlot} />

          <Pressable onPress={capturePhoto} onPressIn={onShutterPressIn} onPressOut={onShutterPressOut}>
            <Animated.View style={[styles.shutterOuter, { transform: [{ scale: shutterScale }] }]}>
              <Animated.View style={[styles.shutterInner, { backgroundColor: shutterBg }]} />
            </Animated.View>
          </Pressable>

          <TouchableOpacity style={styles.uploadButton} onPress={pickPhoto} activeOpacity={0.75}>
            <UploadIcon size={24} color="#FFFFFF" />
            <Text style={styles.uploadButtonText}>{t('scan.upload')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.xl,
  },

  // Permission
  permissionButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.pill,
  },
  permissionButtonText: {
    ...Typography.labelLarge,
    color: Colors.white,
  },

  // Step bar
  stepBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.sm,
    zIndex: 10,
  },
  stepPill: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.pill,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  stepPillActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  stepPillDone: {
    backgroundColor: 'rgba(52,211,153,0.3)',
    borderColor: Colors.success,
  },
  stepPillText: {
    ...Typography.labelSmall,
    color: 'rgba(255,255,255,0.6)',
  },
  stepPillTextActive: {
    color: '#FFFFFF',
  },

  // Instruction
  topInstructionRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  instructionOverlay: {
    position: 'absolute',
    top: '45%',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.lg,
    zIndex: 10,
  },
  instructionBadge: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.pill,
  },
  instructionText: {
    ...Typography.bodyMedium,
    color: '#FFFFFF',
  },

  // Corner brackets
  cornerBracket: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderColor: Colors.white,
  },
  cTL: { top: 155, left: 55, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 4 },
  cTR: { top: 155, right: 55, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 4 },
  cBL: { bottom: 200, left: 55, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 4 },
  cBR: { bottom: 200, right: 55, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 4 },

  // Shutter
  shutterArea: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: Spacing.xl,
    zIndex: 10,
  },
  thumbnailStrip: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  thumbnail: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.sm,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  thumbnailActive: {
    borderColor: Colors.primary,
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  thumbnailPlaceholder: {
    ...Typography.labelSmall,
    color: 'rgba(255,255,255,0.4)',
  },
  shutterOuter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shutterInner: {
    width: 62,
    height: 62,
    borderRadius: 31,
  },

  // Shutter row (shutter + upload side by side)
  shutterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xxl,
    width: '100%',
    paddingHorizontal: Spacing.xxl,
  },
  shutterSideSlot: {
    width: 64,
    alignItems: 'center',
  },
  uploadButton: {
    width: 64,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  uploadButtonText: {
    ...Typography.labelSmall,
    color: 'rgba(255,255,255,0.7)',
  },

  // Preview
  previewOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    paddingHorizontal: Spacing.xl,
    paddingBottom: 60,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  previewLabel: {
    ...Typography.headlineLarge,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  previewActions: {
    flexDirection: 'row',
    gap: Spacing.lg,
  },
  previewBtn: {
    flex: 1,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.pill,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
  },
  previewBtnPrimary: {
    backgroundColor: Colors.primary,
  },
  previewBtnText: {
    ...Typography.labelLarge,
    color: '#FFFFFF',
  },

  // Review screen
  reviewTitle: {
    ...Typography.headlineLarge,
    color: Colors.text,
    textAlign: 'center',
    marginTop: Spacing.xxl,
  },
  reviewSubtitle: {
    ...Typography.bodyMedium,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.xs,
    marginBottom: Spacing.xxl,
  },
  reviewGrid: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.xxl,
  },
  reviewSingleCard: {
    width: '100%',
    aspectRatio: 0.85,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.xxl,
  },
  reviewCard: {
    flex: 1,
    aspectRatio: 0.75,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  reviewImage: {
    width: '100%',
    height: '100%',
  },
  reviewCardLabel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  reviewCardText: {
    ...Typography.labelSmall,
    color: '#FFFFFF',
  },

  // Analyze button
  analyzeButton: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.pill,
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  analyzeButtonText: {
    ...Typography.headlineSmall,
    color: '#FFFFFF',
  },
  resetButton: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  resetButtonText: {
    ...Typography.bodyMedium,
    color: Colors.textSecondary,
  },
});
