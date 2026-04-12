import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal,
  KeyboardAvoidingView, Platform, TextInput, Alert,
  ActivityIndicator, Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
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
  { code: 'en', label: 'English',      flag: '🇺🇸' },
  { code: 'zh', label: '中国人',         flag: '🇨🇳' },
  { code: 'hi', label: 'हिन्दी',          flag: '🇮🇳' },
  { code: 'es', label: 'Español',       flag: '🇪🇸' },
  { code: 'fr', label: 'Français',      flag: '🇫🇷' },
  { code: 'de', label: 'Deutsch',       flag: '🇩🇪' },
  { code: 'ru', label: 'Русский',       flag: '🇷🇺' },
  { code: 'pt', label: 'Português',     flag: '🇧🇷' },
  { code: 'it', label: 'Italiano',      flag: '🇮🇹' },
  { code: 'ro', label: 'Română',        flag: '🇷🇴' },
  { code: 'az', label: 'Azərbaycanca', flag: '🇦🇿' },
  { code: 'nl', label: 'Nederlands',   flag: '🇳🇱' },
];

function CheckmarkIcon({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Polyline points="20 6 9 17 4 12" stroke="#fff" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  );
}

// ── Screen ──

export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const [showSignIn, setShowSignIn] = useState(false);
  const [mode, setMode] = useState<'choose' | 'email'>('choose');
  const [showLang, setShowLang] = useState(false);
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
    setMode('choose');
    setEmail(''); setPassword('');
    clearErrors();
    setShowPassword(false);
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
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: 'https://wvejvinngszpsaqqzjqw.supabase.co/auth/v1/callback',
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
  const handleSignIn = async () => {
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
  };

  const handleForgotPassword = async () => {
    clearErrors();
    if (!email) { setEmailError('Enter your email, then tap Forgot password'); return; }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://wvejvinngszpsaqqzjqw.supabase.co/functions/v1/auth-redirect',
    });
    if (error) setFormError(error.message);
    else Alert.alert('Email sent', `We've sent a password reset link to ${email}. Check your inbox.`);
  };

  return (
    <View style={[s.container, { paddingBottom: insets.bottom + 20 }]}>
      <LinearGradient colors={['#08080F', '#100830', '#1A0845']} style={StyleSheet.absoluteFill} />

      {/* Language button */}
      <TouchableOpacity style={[s.langBtn, { top: insets.top + 12 }]} onPress={() => setShowLang(true)} activeOpacity={0.8}>
        <Text style={s.langFlag}>{selectedLang.flag}</Text>
        <Text style={s.langCode}>{selectedLang.code.toUpperCase()}</Text>
      </TouchableOpacity>

      {/* Bottom */}
      <View style={s.bottom}>
        <Text style={s.tagline}>{t('welcome.tagline')}</Text>
        <TouchableOpacity style={s.ctaButton} onPress={() => router.push('/(auth)/onboarding')} activeOpacity={0.85}>
          <Text style={s.ctaText}>{t('welcome.getStarted')}</Text>
        </TouchableOpacity>

        <View style={s.signInRow}>
          <Text style={s.signInPrompt}>{t('welcome.alreadyAccount')} </Text>
          <TouchableOpacity onPress={() => setShowSignIn(true)} activeOpacity={0.7}>
            <Text style={s.signInLink}>{t('welcome.signIn')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Language Modal */}
      <Modal visible={showLang} animationType="slide" transparent onRequestClose={() => setShowLang(false)}>
        <View style={s.modalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setShowLang(false)} />
          <View style={[s.langSheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={s.langSheetHandle} />
            <View style={s.langSheetHeader}>
              <Text style={s.langSheetTitle}>{t('lang.selectLanguage')}</Text>
              <TouchableOpacity style={s.closeBtn} onPress={() => setShowLang(false)}>
                <XIcon size={14} />
              </TouchableOpacity>
            </View>
            <View>
              {LANGUAGES.map((lang, i) => (
                <TouchableOpacity
                  key={lang.code}
                  style={[s.langRow, i < LANGUAGES.length - 1 && s.langRowBorder]}
                  onPress={() => { setSelectedLang(lang); setShowLang(false); changeLanguage(lang.code); }}
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
        </View>
      </Modal>

      {/* Sign In Modal */}
      <Modal visible={showSignIn} animationType="slide" transparent onRequestClose={closeModal}>
        <View style={s.modalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={closeModal} />
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={s.sheetWrapper}
          >
            <View style={[s.sheet, { paddingBottom: insets.bottom + 28 }]}>

              {/* Header */}
              <View style={s.sheetHeader}>
                {mode === 'email' ? (
                  <TouchableOpacity style={s.backBtn} onPress={() => { setMode('choose'); clearErrors(); }}>
                    <Text style={s.backArrow}>{'‹'}</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={s.headerSpacer} />
                )}
                <Text style={s.sheetTitle}>{t('signIn.title')}</Text>
                <TouchableOpacity style={s.closeBtn} onPress={closeModal}>
                  <XIcon size={14} />
                </TouchableOpacity>
              </View>

              <View style={s.divider} />

              {mode === 'choose' ? (
                <View style={s.authBtns}>
                  {/* Apple */}
                  <TouchableOpacity style={s.appleBtn} onPress={Platform.OS === 'ios' ? signInWithApple : signInWithGoogle} activeOpacity={0.85} disabled={loading}>
                    <AppleIcon size={20} />
                    <Text style={s.appleTxt}>{t('signIn.signInWithApple')}</Text>
                  </TouchableOpacity>

                  {/* Google */}
                  <TouchableOpacity style={s.googleBtn} onPress={signInWithGoogle} activeOpacity={0.85} disabled={loading}>
                    <GoogleIcon size={20} />
                    <Text style={s.googleTxt}>{t('signIn.signInWithGoogle')}</Text>
                  </TouchableOpacity>

                  {/* Email */}
                  <TouchableOpacity style={s.emailBtn} onPress={() => setMode('email')} activeOpacity={0.85}>
                    <MailIcon size={20} />
                    <Text style={s.emailTxt}>{t('signIn.continueWithEmail')}</Text>
                  </TouchableOpacity>

                  {loading && (
                    <ActivityIndicator color={Colors.primary} style={{ marginTop: 8 }} />
                  )}

                  <Text style={s.termsText}>
                    {t('signIn.terms')}{' '}
                    <Text style={s.termsLink} onPress={() => Linking.openURL('https://www.skinxapp.com/terms')}>{t('signIn.termsLink')}</Text>
                    {' '}{t('signIn.and')}{' '}
                    <Text style={s.termsLink} onPress={() => Linking.openURL('https://www.skinxapp.com/privacy')}>{t('signIn.privacyLink')}</Text>
                  </Text>
                </View>
              ) : (
                <View style={s.emailForm}>
                  {formError ? <Text style={s.formError}>{formError}</Text> : null}

                  <View style={s.fieldGroup}>
                    <Text style={s.label}>{t('signIn.email')}</Text>
                    <TextInput
                      style={[s.input, focusedField === 'email' && s.inputFocused, emailError ? s.inputError : null]}
                      placeholder="your@email.com"
                      placeholderTextColor="#aaa"
                      value={email}
                      onChangeText={(t) => { setEmail(t); setEmailError(''); }}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoComplete="email"
                      onFocus={() => setFocusedField('email')}
                      onBlur={() => setFocusedField(null)}
                    />
                    {emailError ? <Text style={s.fieldError}>{emailError}</Text> : null}
                  </View>

                  <View style={s.fieldGroup}>
                    <Text style={s.label}>{t('signIn.password')}</Text>
                    <View style={s.passwordRow}>
                      <TextInput
                        style={[s.input, s.passwordInput, focusedField === 'password' && s.inputFocused, passwordError ? s.inputError : null]}
                        placeholder="••••••••"
                        placeholderTextColor="#aaa"
                        value={password}
                        onChangeText={(t) => { setPassword(t); setPasswordError(''); }}
                        secureTextEntry={!showPassword}
                        autoComplete="password"
                        onFocus={() => setFocusedField('password')}
                        onBlur={() => setFocusedField(null)}
                      />
                      <TouchableOpacity style={s.eyeBtn} onPress={() => setShowPassword(v => !v)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Text style={s.eyeText}>{showPassword ? t('signIn.hide') : t('signIn.show')}</Text>
                      </TouchableOpacity>
                    </View>
                    {passwordError ? <Text style={s.fieldError}>{passwordError}</Text> : null}
                  </View>

                  <TouchableOpacity style={s.forgotRow} onPress={handleForgotPassword}>
                    <Text style={s.forgotText}>{t('signIn.forgotPassword')}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[s.submitBtn, loading && s.submitBtnDisabled]}
                    onPress={handleSignIn}
                    disabled={loading}
                    activeOpacity={0.85}
                  >
                    {loading
                      ? <ActivityIndicator color="#fff" />
                      : <Text style={s.submitTxt}>{t('signIn.title')}</Text>
                    }
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, justifyContent: 'flex-end' },
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
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
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
  forgotRow: { alignSelf: 'flex-end' },
  forgotText: { fontFamily: Fonts.semibold, fontSize: 13, color: Colors.primary },
  submitBtn: {
    height: 54, borderRadius: 50,
    backgroundColor: Colors.primary,
    justifyContent: 'center', alignItems: 'center', marginTop: 4,
  },
  submitBtnDisabled: { opacity: 0.65 },
  submitTxt: { fontFamily: Fonts.bold, fontSize: 16, color: '#fff' },

  // Language button (top-right of welcome screen)
  langBtn: {
    position: 'absolute', right: 20,
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20,
  },
  langFlag: { fontSize: 16 },
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
  langRowFlag: { fontSize: 22 },
  langRowLabel: { fontFamily: Fonts.medium, fontSize: 15, color: '#111', flex: 1 },
  langCheck: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#111',
    justifyContent: 'center', alignItems: 'center',
  },
});
