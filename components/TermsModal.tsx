import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Fonts } from '@/lib/theme';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function TermsModal({ visible, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const [html, setHtml] = useState<string | null>(null);

  useEffect(() => {
    if (!visible || html) return;
    (async () => {
      const asset = Asset.fromModule(require('@/assets/legal/terms.html'));
      await asset.downloadAsync();
      const uri = asset.localUri ?? asset.uri;
      const content = await FileSystem.readAsStringAsync(uri);
      setHtml(transformTermlyHtml(content));
    })();
  }, [visible, html]);

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
        <Text style={styles.title}>Terms & Conditions</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
          <Text style={styles.closeText}>Done</Text>
        </TouchableOpacity>
      </View>
      {html ? (
        <WebView
          originWhitelist={['*']}
          source={{ html }}
          style={styles.webview}
          showsVerticalScrollIndicator
        />
      ) : (
        <View style={styles.loading}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      )}
    </View>
  );
}

function transformTermlyHtml(raw: string): string {
  // Strip the Termly watermark logo (the <span> with the inline base64 SVG background)
  let stripped = raw.replace(
    /<span style="display: block;margin: 0 auto[^"]*background: url\(data:image\/svg\+xml;base64,[^)]+\)[^"]*"><\/span>/,
    ''
  );

  // Strip empty <div ...><br></div> separators that Termly inserts between blocks
  stripped = stripped.replace(/<div[^>]*>\s*<br\s*\/?>\s*<\/div>/gi, '');

  // Inject mobile-friendly CSS overrides matching the in-app privacy policy sizing
  const overrides = `
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
      html { margin: 0; padding: 0; background: #fff; -webkit-text-size-adjust: 100%; }
      body { margin: 0; padding: 20px 20px 40px; background: #fff; color: #595959 !important; }
      body, body * { font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif !important; color: #595959 !important; }
      div, p, h1, h2, h3, h4, h5, h6, ul, ol { margin: 0 !important; padding: 0 !important; }
      [data-custom-class='title'], [data-custom-class='title'] *, h1 { display: none !important; }
      [data-custom-class='subtitle'], [data-custom-class='subtitle'] * { font-size: 13px !important; color: #888 !important; font-weight: 400 !important; }
      [data-custom-class='subtitle'] { display: block !important; margin-bottom: 4px !important; }
      [data-custom-class='heading_1'], [data-custom-class='heading_1'] *, h2 { font-size: 13px !important; font-weight: 700 !important; color: #000 !important; text-transform: uppercase !important; letter-spacing: 0.3px !important; }
      [data-custom-class='heading_1'], h2 { display: block !important; padding-top: 16px !important; margin-top: 0 !important; margin-bottom: 4px !important; }
      br:only-child { display: none !important; }
      div:has(> br:only-child) { display: none !important; }
      [data-custom-class='heading_2'], [data-custom-class='heading_2'] *, h3 { font-size: 13px !important; font-weight: 600 !important; color: #333 !important; text-transform: none !important; letter-spacing: 0 !important; }
      [data-custom-class='heading_2'], h3 { display: block !important; margin-top: 10px !important; margin-bottom: 4px !important; }
      [data-custom-class='body_text'], [data-custom-class='body_text'] * { font-size: 13px !important; line-height: 20px !important; color: #595959 !important; font-weight: 400 !important; }
      [data-custom-class='body_text'] { display: block !important; }
      strong, b, [data-custom-class='body_text'] strong, [data-custom-class='body_text'] b { font-weight: 400 !important; color: #595959 !important; }
      [data-custom-class='link'], [data-custom-class='link'] *, a { font-size: 13px !important; color: #595959 !important; text-decoration: none !important; pointer-events: none !important; word-break: break-word; }
      ul { padding-left: 20px !important; margin-top: 4px !important; margin-bottom: 4px !important; }
      li, li * { font-size: 13px !important; line-height: 20px !important; color: #595959 !important; }
      br { line-height: 20px; }
    </style>
  `;
  return stripped.replace(/<\/style>/, '</style>' + overrides);
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E0E0E0',
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
    fontFamily: Fonts.semibold,
  },
  closeBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  closeText: {
    fontSize: 17,
    color: Colors.primary,
    fontFamily: Fonts.medium,
  },
  webview: {
    flex: 1,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
