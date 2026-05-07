import { useState, useEffect, useLayoutEffect, useRef, useMemo, useCallback, memo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal, Pressable,
  KeyboardAvoidingView, Platform, TextInput, Alert,
  ActivityIndicator, Linking, Animated, Easing, PanResponder, Dimensions,
  Image, ScrollView, Keyboard, InputAccessoryView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Polyline, Rect } from 'react-native-svg';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as WebBrowser from 'expo-web-browser';
import * as ExpoLinking from 'expo-linking';
import { Colors, Fonts } from '@/lib/theme';
import { supabase } from '@/lib/supabase';
import { changeLanguage, LANG_STORAGE_KEY } from '@/lib/i18n';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import PrivacyPolicyModal from '@/components/PrivacyPolicyModal';
import {
  TERMS_DATE, TERMS_INTRO, TERMS_TOC,
  TERMS_S1, TERMS_S2, TERMS_S3, TERMS_S4, TERMS_S5, TERMS_S6, TERMS_S7,
  TERMS_S8_9, TERMS_S10, TERMS_S11_12, TERMS_S13_14, TERMS_S15_16,
  TERMS_S17, TERMS_S18, TERMS_S19_20, TERMS_S21_22, TERMS_S23_27,
} from '@/lib/termsText';

WebBrowser.maybeCompleteAuthSession();


function AppleIcon({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="#fff">
      <Path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
    </Svg>
  );
}

function GoogleIcon({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
      <Path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <Path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 001 12c0 1.77.42 3.44 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
      <Path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </Svg>
  );
}

function MailIcon({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={2} y={4} width={20} height={16} rx={3} stroke="#333" strokeWidth={1.8} />
      <Path d="M2 7l10 6 10-6" stroke="#333" strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

function XIcon({ size = 14 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M18 6L6 18M6 6l12 12" stroke="#666" strokeWidth={2.2} strokeLinecap="round" />
    </Svg>
  );
}

// ── Language data ──

const LANGUAGES = [
  { code: 'en', label: 'English',      flag: '\u{1F1FA}\u{1F1F8}' },
  { code: 'zh', label: '中国人',         flag: '\u{1F1E8}\u{1F1F3}' },
  { code: 'hi', label: 'हिन्दी',          flag: '\u{1F1EE}\u{1F1F3}' },
  { code: 'es', label: 'Español',       flag: '\u{1F1EA}\u{1F1F8}' },
  { code: 'fr', label: 'Français',      flag: '\u{1F1EB}\u{1F1F7}' },
  { code: 'de', label: 'Deutsch',       flag: '\u{1F1E9}\u{1F1EA}' },
  { code: 'ru', label: 'Русский',       flag: '\u{1F1F7}\u{1F1FA}' },
  { code: 'pt', label: 'Português',     flag: '\u{1F1E7}\u{1F1F7}' },
  { code: 'it', label: 'Italiano',      flag: '\u{1F1EE}\u{1F1F9}' },
  { code: 'ro', label: 'Română',        flag: '\u{1F1F7}\u{1F1F4}' },
  { code: 'az', label: 'Azərbaycanca', flag: '\u{1F1E6}\u{1F1FF}' },
  { code: 'nl', label: 'Nederlands',   flag: '\u{1F1F3}\u{1F1F1}' },
];

function CheckmarkIcon({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Polyline points="20 6 9 17 4 12" stroke="#fff" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  );
}

// ── Screen ──

const SCREEN_H = Dimensions.get('window').height;

function DraggableSheet({ children, onDismiss, dismissRef }: { children: React.ReactNode; onDismiss: () => void; dismissRef?: React.RefObject<((onComplete?: () => void) => void) | null> }) {
  const translateY = useRef(new Animated.Value(SCREEN_H)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const dismissed = useRef(false);
  const dragging = useRef(false);
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  if (dismissRef) {
    dismissRef.current = (onComplete?: () => void) => {
      Animated.parallel([
        Animated.timing(translateY, { toValue: SCREEN_H, duration: 380, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(overlayOpacity, { toValue: 0, duration: 320, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      ]).start(() => { onDismissRef.current(); onComplete?.(); });
    };
  }

  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateY, { toValue: 0, duration: 480, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(overlayOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
  }, []);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, g) => {
        if (g.dy > 10 && Math.abs(g.dy) > Math.abs(g.dx)) {
          dragging.current = true;
          return true;
        }
        return false;
      },
      onMoveShouldSetPanResponderCapture: (_, g) => {
        if (g.dy > 10 && Math.abs(g.dy) > Math.abs(g.dx) * 1.5) {
          dragging.current = true;
          return true;
        }
        return false;
      },
      onPanResponderTerminationRequest: () => !dragging.current,
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) {
          translateY.setValue(g.dy);
          overlayOpacity.setValue(Math.max(0, 1 - g.dy / 300));
        }
      },
      onPanResponderRelease: (_, g) => {
        dragging.current = false;
        if (g.dy > 100 || g.vy > 0.4) {
          dismissed.current = true;
          Animated.parallel([
            Animated.timing(translateY, { toValue: SCREEN_H, duration: 380, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
            Animated.timing(overlayOpacity, { toValue: 0, duration: 320, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          ]).start(() => {
            onDismiss();
            translateY.setValue(SCREEN_H);
            dismissed.current = false;
          });
        } else {
          Animated.parallel([
            Animated.spring(translateY, { toValue: 0, useNativeDriver: true, friction: 8 }),
            Animated.timing(overlayOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
          ]).start();
        }
      },
      onPanResponderTerminate: () => {
        dragging.current = false;
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, friction: 8 }).start();
      },
    })
  ).current;

  return (
    <>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#000', opacity: Animated.multiply(overlayOpacity, 0.45) }]} pointerEvents="none" />
      <Animated.View style={{ transform: [{ translateY }], flex: 1, justifyContent: 'flex-end' }} {...panResponder.panHandlers}>
        {children}
      </Animated.View>
    </>
  );
}

const SignInBar = memo(function SignInBar({
  kbTranslate,
  insetsBottom,
  email,
  password,
  loading,
  onPress,
}: {
  kbTranslate: Animated.Value;
  insetsBottom: number;
  email: string;
  password: string;
  loading: boolean;
  onPress: () => void;
}) {
  const enabled = !!email && !!password && !loading;
  return (
    <Animated.View style={[s.esBottom, { bottom: 0, paddingBottom: insetsBottom + 8, transform: [{ translateY: kbTranslate }] }]}>
      <Pressable
        style={({ pressed }) => [s.esSubmitBtn, !enabled && s.esSubmitBtnDisabled, pressed && enabled && { opacity: 0.85 }]}
        onPress={onPress}
        disabled={!enabled}
      >
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.esSubmitTxt}>Sign in</Text>}
      </Pressable>
    </Animated.View>
  );
});

export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { instant } = useLocalSearchParams<{ instant?: string }>();
  const navigation = useNavigation();
  useLayoutEffect(() => {
    if (instant === '1') navigation.setOptions({ animation: 'none' });
  }, [instant]);
  const { t } = useTranslation();

  const [showSignIn, setShowSignIn] = useState(false);
  const [showLang, setShowLang] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showEmailScreen, setShowEmailScreen] = useState(false);
  const signInDismissRef = useRef<((onComplete?: () => void) => void) | null>(null);
  const langDismissRef   = useRef<((onComplete?: () => void) => void) | null>(null);
  const emailScreenSlide = useRef(new Animated.Value(SCREEN_H)).current;

  useEffect(() => {
    // Reset position when email screen closes so it's ready for next open
    if (!showEmailScreen) emailScreenSlide.setValue(SCREEN_H);
  }, [showEmailScreen]);

  // Native-driver translateY: runs entirely on the UI thread, zero JS involvement.
  // kbIsVisible prevents setValue being called mid-field-switch — the root cause
  // of the button flicker (iOS fires keyboardWillShow again when switching from
  // email keyboard → password keyboard, even though keyboard stays visible).
  const kbTranslate = useRef(new Animated.Value(0)).current;
  const kbHideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const kbIsVisible = useRef(false);
  const insetsBottomRef = useRef(insets.bottom);
  insetsBottomRef.current = insets.bottom;
  useEffect(() => {
    const show = Keyboard.addListener('keyboardWillShow', (e) => {
      if (kbHideTimer.current) { clearTimeout(kbHideTimer.current); kbHideTimer.current = null; }
      if (!kbIsVisible.current) {
        // Only move the bar when keyboard first appears, not on every field switch.
        kbIsVisible.current = true;
        kbTranslate.setValue(-e.endCoordinates.height);
      }
    });
    const hide = Keyboard.addListener('keyboardWillHide', () => {
      kbHideTimer.current = setTimeout(() => {
        kbIsVisible.current = false;
        kbTranslate.setValue(0);
      }, 200);
    });
    return () => { show.remove(); hide.remove(); if (kbHideTimer.current) clearTimeout(kbHideTimer.current); };
  }, []);

  const [selectedLang, setSelectedLang] = useState(LANGUAGES[0]);

  useEffect(() => {
    AsyncStorage.getItem(LANG_STORAGE_KEY).then((code) => {
      const found = LANGUAGES.find((l) => l.code === code);
      if (found) setSelectedLang(found);
    });
  }, []);
  // email form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);

  const clearErrors = () => { setEmailError(''); setPasswordError(''); setFormError(''); };

  const closeModal = () => {
    setShowSignIn(false);
    setShowEmailScreen(false);
    setEmail(''); setPassword('');
    clearErrors();
    setShowPassword(false);
  };

  const openEmailScreen = () => {
    emailScreenSlide.setValue(SCREEN_H);
    signInDismissRef.current?.(() => {
      // Fire the slide-up animation immediately in the dismiss callback —
      // before setState/re-render — so the email screen is already moving
      // the moment the sign-in sheet disappears, with no visible gap.
      Animated.timing(emailScreenSlide, { toValue: 0, duration: 380, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
      setShowEmailScreen(true);
    });
  };

  // ── Apple Sign In ──
  const signInWithApple = async () => {
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (!credential.identityToken) { Alert.alert('Error', 'Could not sign in with Apple.'); return; }
      setLoading(true);
      const { error } = await supabase.auth.signInWithIdToken({ provider: 'apple', token: credential.identityToken });
      if (error) throw error;
      closeModal();
    } catch (err: any) {
      if (err.code !== 'ERR_REQUEST_CANCELED') Alert.alert('Apple Sign In failed', err?.message || 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Google Sign In ──
  const signInWithGoogle = async () => {
    try {
      setLoading(true);
      const redirectUrl = ExpoLinking.createURL('/');
      console.log('[Google OAuth] redirectUrl:', redirectUrl);
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: { prompt: 'select_account' },
        },
      });
      if (error) throw error;
      if (data.url) {
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
        if (result.type === 'success' && result.url) {
          const accessToken = result.url.match(/access_token=([^&]+)/)?.[1];
          const refreshToken = result.url.match(/refresh_token=([^&]+)/)?.[1];
          if (accessToken && refreshToken) {
            await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
          }
          closeModal();
        }
      }
    } catch (err: any) {
      Alert.alert('Google Sign In failed', err?.message || 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Email Sign In ──
  const handleSignIn = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    clearErrors();
    let hasError = false;
    if (!email) { setEmailError('Email is required'); hasError = true; }
    if (!password) { setPasswordError('Password is required'); hasError = true; }
    if (hasError) return;
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) setFormError(error.message);
    else closeModal();
  }, [email, password]);

  const handleForgotPassword = async () => {
    clearErrors();
    if (!email) { setEmailError('Enter your email, then tap Forgot password'); return; }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/auth-redirect`,
    });
    if (error) setFormError(error.message);
    else Alert.alert('Email sent', `We've sent a password reset link to ${email}. Check your inbox.`);
  };

  return (
    <View style={[s.container, { paddingTop: insets.top, paddingBottom: insets.bottom + 20 }]}>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: '#000000' }]} />

      {/* Hero face image */}
      <View style={s.heroWrap}>
        <Image
          source={require('@/assets/images/welcome-face.jpg')}
          style={s.heroImage}
          resizeMode="contain"
        />
      </View>

      {/* Language button */}
      <TouchableOpacity style={[s.langBtn, { top: insets.top + 12 }]} onPress={() => setShowLang(true)} activeOpacity={0.8}>
        <Text style={s.langFlag}>{selectedLang.flag}</Text>
        <Text style={s.langCode}>{selectedLang.code.toUpperCase()}</Text>
      </TouchableOpacity>

      {/* Bottom */}
      <View style={s.bottom}>
        <Text style={s.tagline}>{t('welcome.tagline')}</Text>
        <TouchableOpacity style={s.ctaButton} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/(auth)/onboarding'); }} activeOpacity={0.85}>
          <Text style={s.ctaText}>{t('welcome.getStarted')}</Text>
        </TouchableOpacity>

        <View style={s.signInRow}>
          <Text style={s.signInPrompt}>{t('welcome.alreadyAccount')} </Text>
          <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowSignIn(true); }} activeOpacity={0.7}>
            <Text style={s.signInLink}>{t('welcome.signIn')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Language Modal */}
      <Modal visible={showLang} animationType="none" transparent onRequestClose={() => langDismissRef.current?.()}>
          <DraggableSheet onDismiss={() => setShowLang(false)} dismissRef={langDismissRef}>
          <View style={[s.langSheet, { paddingBottom: insets.bottom + 16 }]} onStartShouldSetResponder={() => true}>
            <View style={s.langSheetHandle} />
            <View style={s.langSheetHeader}>
              <Text style={s.langSheetTitle}>{t('lang.selectLanguage')}</Text>
              <TouchableOpacity style={s.closeBtn} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); langDismissRef.current?.(); }}>
                <XIcon size={14} />
              </TouchableOpacity>
            </View>
            <View>
              {LANGUAGES.map((lang, i) => (
                <TouchableOpacity
                  key={lang.code}
                  style={[s.langRow, i < LANGUAGES.length - 1 && s.langRowBorder]}
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSelectedLang(lang); setShowLang(false); changeLanguage(lang.code); }}
                  activeOpacity={0.7}
                >
                  <Text style={s.langRowFlag}>{lang.flag}</Text>
                  <Text style={s.langRowLabel}>{lang.label}</Text>
                  {selectedLang.code === lang.code && (
                    <View style={s.langCheck}>
                      <CheckmarkIcon size={16} />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
          </DraggableSheet>
      </Modal>

      {/* Sign In Modal */}
      <Modal visible={showSignIn} animationType="none" transparent onRequestClose={closeModal}>
        <DraggableSheet onDismiss={closeModal} dismissRef={signInDismissRef}>
          <View style={[s.sheet, { paddingBottom: insets.bottom + 28 }]} onStartShouldSetResponder={() => true}>
            <View style={s.sheetHeader}>
              <View style={s.headerSpacer} />
              <Text style={s.sheetTitle}>{t('signIn.title')}</Text>
              <TouchableOpacity style={s.closeBtn} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); signInDismissRef.current?.(); }}>
                <XIcon size={14} />
              </TouchableOpacity>
            </View>
            <View style={s.divider} />
            <View style={s.authBtns}>
              <TouchableOpacity style={s.appleBtn} onPress={Platform.OS === 'ios' ? signInWithApple : signInWithGoogle} activeOpacity={0.85} disabled={loading}>
                <AppleIcon size={20} />
                <Text style={s.appleTxt}>{t('signIn.signInWithApple')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.googleBtn} onPress={signInWithGoogle} activeOpacity={0.85} disabled={loading}>
                <GoogleIcon size={20} />
                <Text style={s.googleTxt}>{t('signIn.signInWithGoogle')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.emailBtn} onPress={openEmailScreen} activeOpacity={0.85}>
                <MailIcon size={20} />
                <Text style={s.emailTxt}>{t('signIn.continueWithEmail')}</Text>
              </TouchableOpacity>
              {loading && <ActivityIndicator color={Colors.primary} style={{ marginTop: 8 }} />}
              <Text style={s.termsText}>
                {t('signIn.terms')}{'\n'}
                <Text style={s.termsLink} onPress={() => setShowTerms(true)}>{t('signIn.termsLink')}</Text>
                {' '}{t('signIn.and')}{' '}
                <Text style={s.termsLink} onPress={() => setShowPrivacy(true)}>{t('signIn.privacyLink')}</Text>
              </Text>
            </View>
          </View>
        </DraggableSheet>
        {showPrivacy && (
          <View style={s.privacyOverlay}>
            <View style={[s.privacyHeader, { paddingTop: insets.top + 14 }]}>
              <Text style={s.privacyTitle}>Privacy Policy</Text>
              <TouchableOpacity onPress={() => setShowPrivacy(false)} style={s.privacyCloseBtn}>
                <Text style={s.privacyCloseTxt}>Done</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={s.privacyScroll} contentContainerStyle={s.privacyContent}>
              <Text style={s.privacyDate}>Last updated May 03, 2026</Text>

              <Text style={s.privacyBody}>This Privacy Notice for SkinX Technologies LLC (doing business as SkinX) ("we," "us," or "our"), describes how and why we might access, collect, store, use, and/or share ("process") your personal information when you use our services ("Services"), including when you:{'\n\n'}• Download and use our mobile application (SkinX), or any other application of ours that links to this Privacy Notice{'\n'}• Use SkinX. A software that can scan your face and give you curated products and daily tips to improve your skin health based on acne type and severity using artificial intelligence.{'\n'}• Engage with us in other related ways, including any marketing or events{'\n\n'}Questions or concerns? If you do not agree with our policies and practices, please do not use our Services. Contact us at skinxtechnologies@gmail.com.</Text>

              <Text style={s.privacyHeading}>TABLE OF CONTENTS</Text>
              <Text style={s.privacyBody}>1. WHAT INFORMATION DO WE COLLECT?{'\n'}2. HOW DO WE PROCESS YOUR INFORMATION?{'\n'}3. WHAT LEGAL BASES DO WE RELY ON TO PROCESS YOUR PERSONAL INFORMATION?{'\n'}4. WHEN AND WITH WHOM DO WE SHARE YOUR PERSONAL INFORMATION?{'\n'}5. WHAT IS OUR STANCE ON THIRD-PARTY WEBSITES?{'\n'}6. DO WE USE COOKIES AND OTHER TRACKING TECHNOLOGIES?{'\n'}7. DO WE OFFER ARTIFICIAL INTELLIGENCE-BASED PRODUCTS?{'\n'}8. HOW DO WE HANDLE YOUR SOCIAL LOGINS?{'\n'}9. HOW LONG DO WE KEEP YOUR INFORMATION?{'\n'}10. HOW DO WE KEEP YOUR INFORMATION SAFE?{'\n'}11. WHAT ARE YOUR PRIVACY RIGHTS?{'\n'}12. CONTROLS FOR DO-NOT-TRACK FEATURES{'\n'}13. DO UNITED STATES RESIDENTS HAVE SPECIFIC PRIVACY RIGHTS?{'\n'}14. DO OTHER REGIONS HAVE SPECIFIC PRIVACY RIGHTS?{'\n'}15. DO WE MAKE UPDATES TO THIS NOTICE?{'\n'}16. HOW CAN YOU CONTACT US ABOUT THIS NOTICE?{'\n'}17. HOW CAN YOU REVIEW, UPDATE, OR DELETE THE DATA WE COLLECT FROM YOU?</Text>

              <Text style={s.privacyHeading}>1. WHAT INFORMATION DO WE COLLECT?</Text>
              <Text style={s.privacySubheading}>Personal information you disclose to us</Text>
              <Text style={s.privacyBody}>In Short: We collect personal information that you provide to us.{'\n\n'}We collect personal information that you voluntarily provide to us when you register on the Services, express an interest in obtaining information about us or our products and Services, when you participate in activities on the Services, or otherwise when you contact us.{'\n\n'}Personal Information Provided by You. The personal information we collect may include the following:{'\n'}• names{'\n'}• email addresses{'\n'}• phone numbers{'\n'}• passwords{'\n'}• debit/credit card numbers{'\n\n'}Sensitive Information. When necessary, with your consent or as otherwise permitted by applicable law, we process sensitive categories of information.{'\n\n'}Payment Data. We may collect data necessary to process your payment if you choose to make purchases, such as your payment instrument number and the security code associated with your payment instrument. All payment data is handled and stored by Link.{'\n\n'}Social Media Login Data. We may provide you with the option to register with us using your existing social media account details, like your Facebook, X, or other social media account. If you choose to register in this way, we will collect certain profile information about you from the social media provider, as described in section 8 below.{'\n\n'}Application Data. If you use our application(s), we also may collect the following information if you choose to provide us with access or permission:{'\n'}• Mobile Device Access. We may request access or permission to certain features from your mobile device, including your mobile device's camera, and other features. If you wish to change our access or permissions, you may do so in your device's settings.{'\n'}• Push Notifications. We may request to send you push notifications regarding your account or certain features of the application(s). If you wish to opt out from receiving these types of communications, you may turn them off in your device's settings.{'\n\n'}This information is primarily needed to maintain the security and operation of our application(s), for troubleshooting, and for our internal analytics and reporting purposes.{'\n\n'}All personal information that you provide to us must be true, complete, and accurate, and you must notify us of any changes to such personal information.</Text>
              <Text style={s.privacySubheading}>Google API</Text>
              <Text style={s.privacyBody}>Our use of information received from Google APIs will adhere to Google API Services User Data Policy, including the Limited Use requirements.</Text>

              <Text style={s.privacyHeading}>2. HOW DO WE PROCESS YOUR INFORMATION?</Text>
              <Text style={s.privacyBody}>In Short: We process your information to provide, improve, and administer our Services, communicate with you, for security and fraud prevention, and to comply with law. We may also process your information for other purposes only with your prior explicit consent.{'\n\n'}We process your personal information for a variety of reasons, depending on how you interact with our Services, including:{'\n\n'}• To facilitate account creation and authentication and otherwise manage user accounts. We may process your information so you can create and log in to your account, as well as keep your account in working order.{'\n\n'}• To save or protect an individual's vital interest. We may process your information when necessary to save or protect an individual's vital interest, such as to prevent harm.</Text>

              <Text style={s.privacyHeading}>3. WHAT LEGAL BASES DO WE RELY ON TO PROCESS YOUR INFORMATION?</Text>
              <Text style={s.privacyBody}>In Short: We only process your personal information when we believe it is necessary and we have a valid legal reason (i.e., legal basis) to do so under applicable law, like with your consent, to comply with laws, to provide you with services to enter into or fulfill our contractual obligations, to protect your rights, or to fulfill our legitimate business interests.{'\n\n'}If you are located in the EU or UK, this section applies to you.{'\n\n'}The General Data Protection Regulation (GDPR) and UK GDPR require us to explain the valid legal bases we rely on in order to process your personal information. As such, we may rely on the following legal bases:{'\n\n'}• Consent. We may process your information if you have given us permission to use your personal information for a specific purpose. You can withdraw your consent at any time.{'\n'}• Legal Obligations. We may process your information where we believe it is necessary for compliance with our legal obligations, such as to cooperate with a law enforcement body or regulatory agency, exercise or defend our legal rights, or disclose your information as evidence in litigation in which we are involved.{'\n'}• Vital Interests. We may process your information where we believe it is necessary to protect your vital interests or the vital interests of a third party, such as situations involving potential threats to the safety of any person.{'\n\n'}If you are located in Canada, this section applies to you.{'\n\n'}We may process your information if you have given us specific permission (i.e., express consent) to use your personal information for a specific purpose, or in situations where your permission can be inferred (i.e., implied consent). You can withdraw your consent at any time.{'\n\n'}In some exceptional cases, we may be legally permitted under applicable law to process your information without your consent, including:{'\n'}• If collection is clearly in the interests of an individual and consent cannot be obtained in a timely way{'\n'}• For investigations and fraud detection and prevention{'\n'}• For business transactions provided certain conditions are met{'\n'}• If it is contained in a witness statement and the collection is necessary to assess, process, or settle an insurance claim{'\n'}• For identifying injured, ill, or deceased persons and communicating with next of kin{'\n'}• If we have reasonable grounds to believe an individual has been, is, or may be victim of financial abuse{'\n'}• If it is reasonable to expect collection and use with consent would compromise the availability or the accuracy of the information and the collection is reasonable for purposes related to investigating a breach of an agreement or a contravention of the laws of Canada or a province{'\n'}• If disclosure is required to comply with a subpoena, warrant, court order, or rules of the court relating to the production of records{'\n'}• If it was produced by an individual in the course of their employment, business, or profession and the collection is consistent with the purposes for which the information was produced{'\n'}• If the collection is solely for journalistic, artistic, or literary purposes{'\n'}• If the information is publicly available and is specified by the regulations{'\n'}• We may disclose de-identified information for approved research or statistics projects, subject to ethics oversight and confidentiality commitments</Text>

              <Text style={s.privacyHeading}>4. WHEN AND WITH WHOM DO WE SHARE YOUR PERSONAL INFORMATION?</Text>
              <Text style={s.privacyBody}>In Short: We may share information in specific situations described in this section and/or with the following third parties.{'\n\n'}We may need to share your personal information in the following situations:{'\n\n'}• Business Transfers. We may share or transfer your information in connection with, or during negotiations of, any merger, sale of company assets, financing, or acquisition of all or a portion of our business to another company.{'\n\n'}• When we use Google Maps Platform APIs. We may share your information with certain Google Maps Platform APIs (e.g., Google Maps API, Places API). Google Maps uses GPS, Wi-Fi, and cell towers to estimate your location. GPS is accurate to about 20 meters, while Wi-Fi and cell towers help improve accuracy when GPS signals are weak, like indoors. This data helps Google Maps provide directions, but it is not always perfectly precise.{'\n\n'}• Business Partners. We may share your information with our business partners to offer you certain products, services, or promotions.{'\n\n'}• Offer Wall. Our application(s) may display a third-party hosted "offer wall." Such an offer wall allows third-party advertisers to offer virtual currency, gifts, or other items to users in return for the acceptance and completion of an advertisement offer. When you click on an offer wall, you will be brought to an external website belonging to other persons and will leave our application(s). A unique identifier, such as your user ID, will be shared with the offer wall provider in order to prevent fraud and properly credit your account with the relevant reward.</Text>

              <Text style={s.privacyHeading}>5. WHAT IS OUR STANCE ON THIRD-PARTY WEBSITES?</Text>
              <Text style={s.privacyBody}>In Short: We are not responsible for the safety of any information that you share with third parties that we may link to or who advertise on our Services, but are not affiliated with, our Services.{'\n\n'}The Services, including our offer wall, may link to third-party websites, online services, or mobile applications and/or contain advertisements from third parties that are not affiliated with us and which may link to other websites, services, or applications. Accordingly, we do not make any guarantee regarding any such third parties, and we will not be liable for any loss or damage caused by the use of such third-party websites, services, or applications. The inclusion of a link towards a third-party website, service, or application does not imply an endorsement by us. We cannot guarantee the safety and privacy of data you provide to any third-party websites. Any data collected by third parties is not covered by this Privacy Notice. We are not responsible for the content or privacy and security practices and policies of any third parties, including other websites, services, or applications that may be linked to or from the Services. You should review the policies of such third parties and contact them directly to respond to your questions.</Text>

              <Text style={s.privacyHeading}>6. DO WE USE COOKIES AND OTHER TRACKING TECHNOLOGIES?</Text>
              <Text style={s.privacyBody}>In Short: We may use cookies and other tracking technologies to collect and store your information.{'\n\n'}We may use cookies and similar tracking technologies (like web beacons and pixels) to gather information when you interact with our Services. Some online tracking technologies help us maintain the security of our Services and your account, prevent crashes, fix bugs, save your preferences, and assist with basic site functions.{'\n\n'}We also permit third parties and service providers to use online tracking technologies on our Services for analytics and advertising, including to help manage and display advertisements, to tailor advertisements to your interests, or to send abandoned shopping cart reminders (depending on your communication preferences). The third parties and service providers use their technology to provide advertising about products and services tailored to your interests which may appear either on our Services or on other websites.{'\n\n'}To the extent these online tracking technologies are deemed to be a "sale"/"sharing" (which includes targeted advertising, as defined under the applicable laws) under applicable US state laws, you can opt out of these online tracking technologies by submitting a request as described below under section "DO UNITED STATES RESIDENTS HAVE SPECIFIC PRIVACY RIGHTS?"{'\n\n'}Specific information about how we use such technologies and how you can refuse certain cookies is set out in our Cookie Notice.</Text>

              <Text style={s.privacyHeading}>7. DO WE OFFER ARTIFICIAL INTELLIGENCE-BASED PRODUCTS?</Text>
              <Text style={s.privacyBody}>In Short: We offer products, features, or tools powered by artificial intelligence, machine learning, or similar technologies.{'\n\n'}As part of our Services, we offer products, features, or tools powered by artificial intelligence, machine learning, or similar technologies (collectively, "AI Products"). These tools are designed to enhance your experience and provide you with innovative solutions. The terms in this Privacy Notice govern your use of the AI Products within our Services.{'\n\n'}Use of AI Technologies{'\n\n'}We provide the AI Products through third-party service providers ("AI Service Providers"), including Google Cloud AI. As outlined in this Privacy Notice, your input, output, and personal information will be shared with and processed by these AI Service Providers to enable your use of our AI Products. You must not use the AI Products in any way that violates the terms or policies of any AI Service Provider.{'\n\n'}Our AI Products are designed for the following functions:{'\n'}• AI insights{'\n\n'}How We Process Your Data Using AI{'\n\n'}All personal information processed using our AI Products is handled in line with our Privacy Notice and our agreement with third parties. This ensures high security and safeguards your personal information throughout the process, giving you peace of mind about your data's safety.</Text>

              <Text style={s.privacyHeading}>8. HOW DO WE HANDLE YOUR SOCIAL LOGINS?</Text>
              <Text style={s.privacyBody}>In Short: If you choose to register or log in to our Services using a social media account, we may have access to certain information about you.{'\n\n'}Our Services offer you the ability to register and log in using your third-party social media account details (like your Facebook or X logins). Where you choose to do this, we will receive certain profile information about you from your social media provider. The profile information we receive may vary depending on the social media provider concerned, but will often include your name, email address, friends list, and profile picture, as well as other information you choose to make public on such a social media platform.{'\n\n'}We will use the information we receive only for the purposes that are described in this Privacy Notice or that are otherwise made clear to you on the relevant Services. Please note that we do not control, and are not responsible for, other uses of your personal information by your third-party social media provider. We recommend that you review their privacy notice to understand how they collect, use, and share your personal information, and how you can set your privacy preferences on their sites and apps.</Text>

              <Text style={s.privacyHeading}>9. HOW LONG DO WE KEEP YOUR INFORMATION?</Text>
              <Text style={s.privacyBody}>In Short: We keep your information for as long as necessary to fulfill the purposes outlined in this Privacy Notice unless otherwise required by law.{'\n\n'}We will only keep your personal information for as long as it is necessary for the purposes set out in this Privacy Notice, unless a longer retention period is required or permitted by law (such as tax, accounting, or other legal requirements). No purpose in this notice will require us keeping your personal information for longer than three (3) months past the termination of the user's account.{'\n\n'}When we have no ongoing legitimate business need to process your personal information, we will either delete or anonymize such information, or, if this is not possible (for example, because your personal information has been stored in backup archives), then we will securely store your personal information and isolate it from any further processing until deletion is possible.</Text>

              <Text style={s.privacyHeading}>10. HOW DO WE KEEP YOUR INFORMATION SAFE?</Text>
              <Text style={s.privacyBody}>In Short: We aim to protect your personal information through a system of organizational and technical security measures.{'\n\n'}We have implemented appropriate and reasonable technical and organizational security measures designed to protect the security of any personal information we process. However, despite our safeguards and efforts to secure your information, no electronic transmission over the Internet or information storage technology can be guaranteed to be 100% secure, so we cannot promise or guarantee that hackers, cybercriminals, or other unauthorized third parties will not be able to defeat our security and improperly collect, access, steal, or modify your information. Although we will do our best to protect your personal information, transmission of personal information to and from our Services is at your own risk. You should only access the Services within a secure environment.</Text>

              <Text style={s.privacyHeading}>11. WHAT ARE YOUR PRIVACY RIGHTS?</Text>
              <Text style={s.privacyBody}>In Short: Depending on your state of residence in the US or in some regions, such as the European Economic Area (EEA), United Kingdom (UK), Switzerland, and Canada, you have rights that allow you greater access to and control over your personal information. You may review, change, or terminate your account at any time, depending on your country, province, or state of residence.{'\n\n'}In some regions (like the EEA, UK, Switzerland, and Canada), you have certain rights under applicable data protection laws. These may include the right (i) to request access and obtain a copy of your personal information, (ii) to request rectification or erasure; (iii) to restrict the processing of your personal information; (iv) if applicable, to data portability; and (v) not to be subject to automated decision-making. If a decision that produces legal or similarly significant effects is made solely by automated means, we will inform you, explain the main factors, and offer a simple way to request human review. In certain circumstances, you may also have the right to object to the processing of your personal information. You can make such a request by contacting us using the contact details provided in section 16 below.{'\n\n'}We will consider and act upon any request in accordance with applicable data protection laws.{'\n\n'}If you are located in the EEA or UK and you believe we are unlawfully processing your personal information, you also have the right to complain to your Member State data protection authority or UK data protection authority.{'\n\n'}If you are located in Switzerland, you may contact the Federal Data Protection and Information Commissioner.{'\n\n'}Withdrawing your consent: If we are relying on your consent to process your personal information, which may be express and/or implied consent depending on the applicable law, you have the right to withdraw your consent at any time. You can withdraw your consent at any time by contacting us using the contact details provided in section 16 below or updating your preferences.{'\n\n'}However, please note that this will not affect the lawfulness of the processing before its withdrawal nor, when applicable law allows, will it affect the processing of your personal information conducted in reliance on lawful processing grounds other than consent.{'\n\n'}Account Information{'\n\n'}If you would at any time like to review or change the information in your account or terminate your account, you can log in to your account settings and update your user account.{'\n\n'}Upon your request to terminate your account, we will deactivate or delete your account and information from our active databases. However, we may retain some information in our files to prevent fraud, troubleshoot problems, assist with any investigations, enforce our legal terms and/or comply with applicable legal requirements.{'\n\n'}If you have questions or comments about your privacy rights, you may email us at skinxtechnologies@gmail.com.</Text>

              <Text style={s.privacyHeading}>12. CONTROLS FOR DO-NOT-TRACK FEATURES</Text>
              <Text style={s.privacyBody}>Most web browsers and some mobile operating systems and mobile applications include a Do-Not-Track ("DNT") feature or setting you can activate to signal your privacy preference not to have data about your online browsing activities monitored and collected. At this stage, no uniform technology standard for recognizing and implementing DNT signals has been finalized. As such, we do not currently respond to DNT browser signals or any other mechanism that automatically communicates your choice not to be tracked online. If a standard for online tracking is adopted that we must follow in the future, we will inform you about that practice in a revised version of this Privacy Notice.{'\n\n'}California law requires us to let you know how we respond to web browser DNT signals. Because there currently is not an industry or legal standard for recognizing or honoring DNT signals, we do not respond to them at this time.</Text>

              <Text style={s.privacyHeading}>13. DO UNITED STATES RESIDENTS HAVE SPECIFIC PRIVACY RIGHTS?</Text>
              <Text style={s.privacyBody}>In Short: If you are a resident of California, Colorado, Connecticut, Delaware, Florida, Indiana, Iowa, Kentucky, Maryland, Minnesota, Montana, Nebraska, New Hampshire, New Jersey, Oregon, Rhode Island, Tennessee, Texas, Utah, or Virginia, you may have the right to request access to and receive details about the personal information we maintain about you and how we have processed it, correct inaccuracies, get a copy of, or delete your personal information. You may also have the right to withdraw your consent to our processing of your personal information. These rights may be limited in some circumstances by applicable law.{'\n\n'}Categories of Personal Information We Collect{'\n\n'}We have collected the following categories of personal information in the past twelve (12) months:{'\n\n'}A. Identifiers (e.g. name, alias, email address, account name) — NO{'\n'}B. Personal information as defined in the California Customer Records statute — NO{'\n'}C. Protected classification characteristics under state or federal law (e.g. gender, age, race) — YES{'\n'}D. Commercial information — NO{'\n'}E. Biometric information — NO{'\n'}F. Internet or other similar network activity — NO{'\n'}G. Geolocation data — NO{'\n'}H. Audio, electronic, sensory, or similar information — NO{'\n'}I. Professional or employment-related information — NO{'\n'}J. Education Information — NO{'\n'}K. Inferences drawn from collected personal information — NO{'\n'}L. Sensitive personal Information — NO{'\n\n'}We may also collect other personal information outside of these categories through instances where you interact with us in person, online, or by phone or mail in the context of: receiving help through our customer support channels; participation in customer surveys or contests; and facilitation in the delivery of our Services and to respond to your inquiries.{'\n\n'}We will use and retain the collected personal information as needed to provide the Services or for:{'\n'}• Category C — As long as the user has an account with us{'\n\n'}Sources of Personal Information{'\n\n'}Learn more about the sources of personal information we collect in section 1 above.{'\n\n'}How We Use and Share Personal Information{'\n\n'}Learn more about how we use your personal information in section 2 above.{'\n\n'}Will your information be shared with anyone else?{'\n\n'}We may disclose your personal information with our service providers pursuant to a written contract between us and each service provider. We may use your personal information for our own business purposes, such as for undertaking internal research for technological development and demonstration. This is not considered to be "selling" of your personal information.{'\n\n'}We have not disclosed, sold, or shared any personal information to third parties for a business or commercial purpose in the preceding twelve (12) months. We will not sell or share personal information in the future belonging to website visitors, users, and other consumers.{'\n\n'}Your Rights{'\n\n'}You have rights under certain US state data protection laws. However, these rights are not absolute, and in certain cases, we may decline your request as permitted by law. These rights include:{'\n'}• Right to know whether or not we are processing your personal data{'\n'}• Right to access your personal data{'\n'}• Right to correct inaccuracies in your personal data{'\n'}• Right to request the deletion of your personal data{'\n'}• Right to obtain a copy of the personal data you previously shared with us{'\n'}• Right to non-discrimination for exercising your rights{'\n'}• Right to opt out of the processing of your personal data if it is used for targeted advertising (or sharing as defined under California's privacy law), the sale of personal data, or profiling in furtherance of decisions that produce legal or similarly significant effects ("profiling"){'\n\n'}Depending upon the state where you live, you may also have the following rights:{'\n'}• Right to access the categories of personal data being processed (as permitted by applicable law, including the privacy law in Minnesota){'\n'}• Right to obtain a list of the categories of third parties to which we have disclosed personal data (as permitted by applicable law, including the privacy law in California, Delaware, and Maryland){'\n'}• Right to obtain a list of specific third parties to which we have disclosed personal data (as permitted by applicable law, including the privacy law in Minnesota and Oregon){'\n'}• Right to obtain a list of third parties to which we have sold personal data (as permitted by applicable law, including the privacy law in Connecticut){'\n'}• Right to review, understand, question, and depending on where you live, correct how personal data has been profiled (as permitted by applicable law, including the privacy law in Connecticut and Minnesota){'\n'}• Right to limit use and disclosure of sensitive personal data (as permitted by applicable law, including the privacy law in California){'\n'}• Right to opt out of the collection of sensitive data and personal data collected through the operation of a voice or facial recognition feature (as permitted by applicable law, including the privacy law in Florida){'\n\n'}How to Exercise Your Rights{'\n\n'}To exercise these rights, you can contact us by submitting a data subject access request at https://app.termly.io/dsar/6b9a84e6-9221-4caf-a07f-24602f5f9f30, by emailing us at skinxtechnologies@gmail.com, or by referring to the contact details at the bottom of this document.{'\n\n'}Under certain US state data protection laws, you can designate an authorized agent to make a request on your behalf. We may deny a request from an authorized agent that does not submit proof that they have been validly authorized to act on your behalf in accordance with applicable laws.{'\n\n'}Request Verification{'\n\n'}Upon receiving your request, we will need to verify your identity to determine you are the same person about whom we have the information in our system. We will only use personal information provided in your request to verify your identity or authority to make the request. However, if we cannot verify your identity from the information already maintained by us, we may request that you provide additional information for the purposes of verifying your identity and for security or fraud-prevention purposes.{'\n\n'}If you submit the request through an authorized agent, we may need to collect additional information to verify your identity before processing your request and the agent will need to provide a written and signed permission from you to submit such request on your behalf.{'\n\n'}Appeals{'\n\n'}Under certain US state data protection laws, if we decline to take action regarding your request, you may appeal our decision by emailing us at skinxtechnologies@gmail.com. We will inform you in writing of any action taken or not taken in response to the appeal, including a written explanation of the reasons for the decisions. If your appeal is denied, you may submit a complaint to your state attorney general.</Text>

              <Text style={s.privacyHeading}>14. DO OTHER REGIONS HAVE SPECIFIC PRIVACY RIGHTS?</Text>
              <Text style={s.privacyBody}>In Short: You may have additional rights based on the country you reside in.{'\n\n'}Australia and New Zealand{'\n\n'}We collect and process your personal information under the obligations and conditions set by Australia's Privacy Act 1988 and New Zealand's Privacy Act 2020 (Privacy Act).{'\n\n'}This Privacy Notice satisfies the notice requirements defined in both Privacy Acts, in particular: what personal information we collect from you, from which sources, for which purposes, and other recipients of your personal information.{'\n\n'}If you do not wish to provide the personal information necessary to fulfill their applicable purpose, it may affect our ability to provide our services, in particular:{'\n'}• offer you the products or services that you want{'\n'}• respond to or help with your requests{'\n'}• manage your account with us{'\n'}• confirm your identity and protect your account{'\n\n'}At any time, you have the right to request access to or correction of your personal information. You can make such a request by contacting us using the contact details provided in section 17 below.{'\n\n'}If you believe we are unlawfully processing your personal information, you have the right to submit a complaint about a breach of the Australian Privacy Principles to the Office of the Australian Information Commissioner and a breach of New Zealand's Privacy Principles to the Office of New Zealand Privacy Commissioner.{'\n\n'}Republic of South Africa{'\n\n'}At any time, you have the right to request access to or correction of your personal information. You can make such a request by contacting us using the contact details provided in section 17 below.{'\n\n'}If you are unsatisfied with the manner in which we address any complaint with regard to our processing of personal information, you can contact the office of the regulator, the details of which are:{'\n\n'}The Information Regulator (South Africa){'\n'}General enquiries: enquiries@inforegulator.org.za{'\n'}Complaints (complete POPIA/PAIA form 5): PAIAComplaints@inforegulator.org.za & POPIAComplaints@inforegulator.org.za</Text>

              <Text style={s.privacyHeading}>15. DO WE MAKE UPDATES TO THIS NOTICE?</Text>
              <Text style={s.privacyBody}>In Short: Yes, we will update this notice as necessary to stay compliant with relevant laws.{'\n\n'}We may update this Privacy Notice from time to time. The updated version will be indicated by an updated "Revised" date at the top of this Privacy Notice. If we make material changes to this Privacy Notice, we may notify you either by prominently posting a notice of such changes or by directly sending you a notification. We encourage you to review this Privacy Notice frequently to be informed of how we are protecting your information.</Text>

              <Text style={s.privacyHeading}>16. HOW CAN YOU CONTACT US ABOUT THIS NOTICE?</Text>
              <Text style={s.privacyBody}>If you have questions or comments about this notice, you may email us at skinxtechnologies@gmail.com or contact us by post at:{'\n\n'}SkinX Technologies LLC{'\n'}499 W Portola Ave{'\n'}Los Altos, CA 94022{'\n'}United States</Text>

              <Text style={s.privacyHeading}>17. HOW CAN YOU REVIEW, UPDATE, OR DELETE THE DATA WE COLLECT FROM YOU?</Text>
              <Text style={s.privacyBody}>Based on the applicable laws of your country or state of residence in the US, you may have the right to request access to the personal information we collect from you, details about how we have processed it, correct inaccuracies, or delete your personal information. You may also have the right to withdraw your consent to our processing of your personal information. These rights may be limited in some circumstances by applicable law. To request to review, update, or delete your personal information, please fill out and submit a data subject access request at https://app.termly.io/dsar/6b9a84e6-9221-4caf-a07f-24602f5f9f30.{'\n\n'}This Privacy Policy was created using Termly's Privacy Policy Generator.</Text>
            </ScrollView>
          </View>
        )}
        {showTerms && (
          <View style={s.privacyOverlay}>
            <View style={[s.privacyHeader, { paddingTop: insets.top + 14 }]}>
              <Text style={s.privacyTitle}>Terms of Use</Text>
              <TouchableOpacity onPress={() => setShowTerms(false)} style={s.privacyCloseBtn}>
                <Text style={s.privacyCloseTxt}>Done</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={s.privacyScroll} contentContainerStyle={s.privacyContent}>
              <Text style={s.privacyDate}>{TERMS_DATE}</Text>
              <Text style={s.privacyBody}>{TERMS_INTRO}</Text>

              <Text style={s.privacyHeading}>TABLE OF CONTENTS</Text>
              <Text style={s.privacyBody}>{TERMS_TOC}</Text>

              <Text style={s.privacyHeading}>1. OUR SERVICES</Text>
              <Text style={s.privacyBody}>{TERMS_S1}</Text>

              <Text style={s.privacyHeading}>2. INTELLECTUAL PROPERTY RIGHTS</Text>
              <Text style={s.privacyBody}>{TERMS_S2}</Text>

              <Text style={s.privacyHeading}>3. USER REPRESENTATIONS</Text>
              <Text style={s.privacyBody}>{TERMS_S3}</Text>

              <Text style={s.privacyHeading}>4. USER REGISTRATION</Text>
              <Text style={s.privacyBody}>{TERMS_S4}</Text>

              <Text style={s.privacyHeading}>5. PURCHASES AND PAYMENT</Text>
              <Text style={s.privacyBody}>{TERMS_S5}</Text>

              <Text style={s.privacyHeading}>6. SUBSCRIPTIONS</Text>
              <Text style={s.privacyBody}>{TERMS_S6}</Text>

              <Text style={s.privacyHeading}>7. PROHIBITED ACTIVITIES</Text>
              <Text style={s.privacyBody}>{TERMS_S7}</Text>

              <Text style={s.privacyHeading}>8. USER GENERATED CONTRIBUTIONS &amp; 9. CONTRIBUTION LICENSE</Text>
              <Text style={s.privacyBody}>{TERMS_S8_9}</Text>

              <Text style={s.privacyHeading}>10. MOBILE APPLICATION LICENSE</Text>
              <Text style={s.privacyBody}>{TERMS_S10}</Text>

              <Text style={s.privacyHeading}>11. SOCIAL MEDIA &amp; 12. THIRD-PARTY WEBSITES AND CONTENT</Text>
              <Text style={s.privacyBody}>{TERMS_S11_12}</Text>

              <Text style={s.privacyHeading}>13. SERVICES MANAGEMENT &amp; 14. PRIVACY POLICY</Text>
              <Text style={s.privacyBody}>{TERMS_S13_14}</Text>

              <Text style={s.privacyHeading}>15. TERM AND TERMINATION &amp; 16. MODIFICATIONS AND INTERRUPTIONS</Text>
              <Text style={s.privacyBody}>{TERMS_S15_16}</Text>

              <Text style={s.privacyHeading}>17. GOVERNING LAW</Text>
              <Text style={s.privacyBody}>{TERMS_S17}</Text>

              <Text style={s.privacyHeading}>18. DISPUTE RESOLUTION</Text>
              <Text style={s.privacyBody}>{TERMS_S18}</Text>

              <Text style={s.privacyHeading}>19. CORRECTIONS &amp; 20. DISCLAIMER</Text>
              <Text style={s.privacyBody}>{TERMS_S19_20}</Text>

              <Text style={s.privacyHeading}>21. LIMITATIONS OF LIABILITY &amp; 22. INDEMNIFICATION</Text>
              <Text style={s.privacyBody}>{TERMS_S21_22}</Text>

              <Text style={s.privacyHeading}>23. USER DATA — 27. CONTACT US</Text>
              <Text style={s.privacyBody}>{TERMS_S23_27}</Text>
            </ScrollView>
          </View>
        )}
      </Modal>

      {/* Full-screen email sign-in */}
      {showEmailScreen && (
        <Animated.View style={[StyleSheet.absoluteFill, s.esScreen, { transform: [{ translateY: emailScreenSlide }] }]}>
          <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 20, flex: 1 }}>
            <TouchableOpacity style={s.esBackBtn} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowEmailScreen(false); setShowSignIn(true); clearErrors(); }} activeOpacity={0.8}>
              <Text style={s.esBackArrow}>←</Text>
            </TouchableOpacity>
            <Text style={s.esTitle}>What's your email?</Text>
            <Text style={s.esSubtitle}>Enter your email and password to sign in.</Text>
            {formError ? <Text style={[s.formError, { marginTop: 16 }]}>{formError}</Text> : null}
            <View style={[s.esInputBox, focusedField === 'email' && s.esInputBoxFocused, emailError ? s.esInputBoxError : null, { marginTop: 24 }]}>
              <Text style={s.esInputLabel}>Email</Text>
              <TextInput
                style={s.esInput}
                placeholder=""
                placeholderTextColor="#bbb"
                value={email}
                onChangeText={(v) => { setEmail(v); setEmailError(''); }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                autoFocus
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
              />
            </View>
            {emailError ? <Text style={s.fieldError}>{emailError}</Text> : null}
            <View style={[s.esInputBox, focusedField === 'password' && s.esInputBoxFocused, passwordError ? s.esInputBoxError : null, { marginTop: 12, flexDirection: 'row', alignItems: 'center' }]}>
              <View style={{ flex: 1 }}>
                <Text style={s.esInputLabel}>Password</Text>
                <TextInput
                  style={s.esInput}
                  placeholder=""
                  placeholderTextColor="#bbb"
                  value={password}
                  onChangeText={(v) => { setPassword(v); setPasswordError(''); }}
                  secureTextEntry={!showPassword}
                  autoComplete="off"
                  textContentType="none"
                  inputAccessoryViewID="loginPwAccessory"
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                />
              </View>
              <TouchableOpacity onPress={() => setShowPassword(v => !v)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={{ fontFamily: Fonts.semibold, fontSize: 13, color: Colors.primary }}>{showPassword ? 'Hide' : 'Show'}</Text>
              </TouchableOpacity>
            </View>
            {passwordError ? <Text style={s.fieldError}>{passwordError}</Text> : null}
            <TouchableOpacity style={[s.forgotRow, { marginTop: 12 }]} onPress={handleForgotPassword}>
              <Text style={s.forgotText}>{t('signIn.forgotPassword')}</Text>
            </TouchableOpacity>
          </View>
          <SignInBar
            kbTranslate={kbTranslate}
            insetsBottom={insets.bottom}
            email={email}
            password={password}
            loading={loading}
            onPress={handleSignIn}
          />
          {Platform.OS === 'ios' && (
            <InputAccessoryView nativeID="loginPwAccessory" style={s.hiddenAccessory} />
          )}
        </Animated.View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  heroWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  heroImage: { width: '100%', height: '100%', transform: [{ translateY: -30 }, { scale: 1.09 }] },
  hero: { alignItems: 'center', gap: 16, paddingHorizontal: 32 },
  appName: { fontFamily: Fonts.bold, fontSize: 38, color: '#FFFFFF', letterSpacing: -1 },
  tagline: { fontFamily: Fonts.bold, fontSize: 28, color: '#FFFFFF', textAlign: 'center', lineHeight: 36, letterSpacing: -0.5 },

  features: { gap: 20, paddingHorizontal: 40 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  featureIconWrap: { width: 28, alignItems: 'center' },
  featureText: { fontFamily: Fonts.medium, fontSize: 16, color: 'rgba(255,255,255,0.65)' },

  bottom: { alignItems: 'center', gap: 14, paddingHorizontal: 24, paddingBottom: 8 },
  ctaButton: { width: '100%', height: 56, borderRadius: 16, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center' },
  ctaText: { fontFamily: Fonts.bold, fontSize: 17, color: '#000' },
  signInRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  signInPrompt: { fontFamily: Fonts.medium, fontSize: 16, color: 'rgba(255,255,255,0.35)' },
  signInLink: { fontFamily: Fonts.semibold, fontSize: 16, color: Colors.primaryLight },

  // Modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'transparent' },
  sheetWrapper: { width: '100%' },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 0,
    overflow: 'hidden',
  },

  // Sheet header
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
  },
  sheetTitle: { fontFamily: Fonts.bold, fontSize: 18, color: '#111', textAlign: 'center', flex: 1 },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center', alignItems: 'center',
  },
  backBtn: { width: 32, height: 32, justifyContent: 'center', alignItems: 'center' },
  backArrow: { fontSize: 26, color: '#555', fontWeight: '300', lineHeight: 30 },
  headerSpacer: { width: 32 },
  divider: { height: 1, backgroundColor: '#eee', marginBottom: 4 },

  // Auth buttons
  authBtns: { paddingHorizontal: 20, paddingTop: 20, gap: 12 },

  appleBtn: {
    height: 56, borderRadius: 50,
    backgroundColor: '#000',
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10,
  },
  appleTxt: { fontFamily: Fonts.semibold, fontSize: 16, color: '#fff' },

  googleBtn: {
    height: 56, borderRadius: 50,
    backgroundColor: '#f5f5f5',
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10,
  },
  googleTxt: { fontFamily: Fonts.semibold, fontSize: 16, color: '#111' },

  emailBtn: {
    height: 56, borderRadius: 50,
    backgroundColor: '#f5f5f5',
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10,
  },
  emailTxt: { fontFamily: Fonts.medium, fontSize: 16, color: '#111' },

  termsText: { fontFamily: Fonts.regular, fontSize: 12, color: '#999', textAlign: 'center', lineHeight: 18, marginTop: 6 },
  termsLink: { fontFamily: Fonts.regular, fontSize: 12, color: '#555', textDecorationLine: 'underline' },

  // Email form
  emailForm: { paddingHorizontal: 20, paddingTop: 20, gap: 14 },
  formError: {
    fontFamily: Fonts.semibold, fontSize: 13, color: '#c0392b',
    textAlign: 'center', backgroundColor: '#fdecea',
    borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14, overflow: 'hidden',
  },
  fieldGroup: { gap: 6 },
  label: { fontFamily: Fonts.semibold, fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: 1 },
  input: {
    height: 52, borderWidth: 1.5, borderColor: '#e0e0e0',
    borderRadius: 12, paddingHorizontal: 16,
    fontFamily: Fonts.regular, fontSize: 16, color: '#111',
    backgroundColor: '#fafafa',
  },
  inputFocused: { borderColor: Colors.primary, backgroundColor: 'rgba(124,92,252,0.04)' },
  inputError: { borderColor: '#e53e3e' },
  fieldError: { fontFamily: Fonts.regular, fontSize: 12, color: '#e53e3e', marginTop: 2 },
  passwordRow: { position: 'relative' },
  passwordInput: { paddingRight: 60 },
  eyeBtn: { position: 'absolute', right: 16, top: 0, bottom: 0, justifyContent: 'center' },
  eyeText: { fontFamily: Fonts.semibold, fontSize: 13, color: Colors.primary },
  forgotRow: { alignSelf: 'flex-start' },
  forgotText: { fontFamily: Fonts.semibold, fontSize: 13, color: Colors.primary },
  submitBtn: {
    height: 54, borderRadius: 50,
    backgroundColor: Colors.primary,
    justifyContent: 'center', alignItems: 'center', marginTop: 4,
  },
  submitBtnDisabled: { opacity: 0.65 },
  submitTxt: { fontFamily: Fonts.bold, fontSize: 16, color: '#fff' },

  // Full-screen email sign-in
  esScreen: { backgroundColor: '#f2f2f7', zIndex: 100 },
  esBackBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#e5e5ea', justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  esBackArrow: { fontSize: 20, color: '#333', lineHeight: 24 },
  esTitle: { fontFamily: Fonts.bold, fontSize: 30, color: '#000', letterSpacing: -0.5, marginBottom: 8 },
  esSubtitle: { fontFamily: Fonts.regular, fontSize: 15, color: '#888', lineHeight: 22 },
  esInputBox: {
    backgroundColor: '#fff', borderRadius: 12,
    borderWidth: 1.5, borderColor: '#e0e0e0',
    paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10,
  },
  esInputBoxFocused: { borderColor: '#007AFF' },
  esInputBoxError: { borderColor: '#e53e3e' },
  esInputLabel: { fontFamily: Fonts.regular, fontSize: 13, color: '#888', marginBottom: 2 },
  esInput: { fontFamily: Fonts.regular, fontSize: 17, color: '#000', padding: 0, height: 26 },
  esBottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 16,
    backgroundColor: '#fff',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e0e0e0',
  },
  esSubmitBtn: { height: 56, borderRadius: 50, backgroundColor: '#1c1c1e', justifyContent: 'center', alignItems: 'center' },
  esSubmitBtnDisabled: { backgroundColor: '#aeaeb2' },
  esSubmitTxt: { fontFamily: Fonts.semibold, fontSize: 17, color: '#fff' },
  hiddenAccessory: { height: 0 },

  // Language button (top-right of welcome screen)
  langBtn: {
    position: 'absolute', right: 20,
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20,
  },
  langFlag: { fontSize: 18 },
  langCode: { fontFamily: Fonts.semibold, fontSize: 13, color: '#fff' },

  // Language sheet
  langSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
  },
  langSheetHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: '#ccc', alignSelf: 'center', marginTop: 10, marginBottom: 0,
  },
  langSheetHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22, paddingTop: 18, paddingBottom: 14,
  },
  langSheetTitle: { fontFamily: Fonts.bold, fontSize: 20, color: '#111' },
  langRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 22, paddingVertical: 10, gap: 14,
  },
  langRowBorder: { borderBottomWidth: 1, borderBottomColor: '#e5e5e5' },
  langRowFlag: { fontSize: 24 },
  langRowLabel: { fontFamily: Fonts.medium, fontSize: 15, color: '#111', flex: 1 },
  langCheck: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#111',
    justifyContent: 'center', alignItems: 'center',
  },
  privacyOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: '#fff',
  },
  privacyHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E0E0E0',
  },
  privacyTitle: { fontSize: 17, fontWeight: '600', color: '#000', fontFamily: Fonts.semibold },
  privacyCloseBtn: { paddingVertical: 4, paddingHorizontal: 8 },
  privacyCloseTxt: { fontSize: 17, color: Colors.primary, fontFamily: Fonts.medium },
  privacyScroll: { flex: 1 },
  privacyContent: { padding: 20, paddingBottom: 40 },
  privacyDate: { fontSize: 13, color: '#888', marginBottom: 20 },
  privacyHeading: { fontSize: 13, fontWeight: '700', color: '#000', marginTop: 16, marginBottom: 4, fontFamily: Fonts.bold, textTransform: 'uppercase', letterSpacing: 0.3 },
  privacySubheading: { fontSize: 13, fontWeight: '600', color: '#333', marginTop: 10, marginBottom: 4, fontFamily: Fonts.semibold },
  privacyBody: { fontSize: 13, color: '#595959', lineHeight: 20 },
});
