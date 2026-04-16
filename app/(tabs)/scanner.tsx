import { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  Image,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import Svg, { Rect as SvgRect, Circle as SvgCircle, Path as SvgPath } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Animated } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useTabTransition } from '@/hooks/useTabTransition';
import { supabase } from '@/lib/supabase';
import { Colors, Shadows } from '@/lib/theme';
import ScreenBackground from '@/components/ScreenBackground';
import type { Product } from '@/lib/products';
import { matchProductsToPick } from '@/lib/match-products-to-pick';
import ProductCard from '@/components/ProductCard';
import { useFavorites } from '@/hooks/useFavorites';
import { cleanProductName } from '@/lib/clean-product-name';
import type { RankedItem } from '@/lib/database.types';
import { useTranslation } from 'react-i18next';

const CARD_GAP = 14;
const SEARCH_DEBOUNCE = 600;

export default function ScannerScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { animatedStyle } = useTabTransition();
  const [permission, requestPermission] = useCameraPermissions();

  // Barcode scanner state
  const [scanning, setScanning] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [scansUsed, setScansUsed] = useState(0);

  // Plan-based products
  const [planProducts, setPlanProducts] = useState<Product[]>([]);
  const [hasPlan, setHasPlan] = useState<boolean | null>(null); // null = loading
  const [loadingPlan, setLoadingPlan] = useState(true);

  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Favorites
  const [showFavorites, setShowFavorites] = useState(false);
  const { favorites, toggle: toggleFavorite, isFavorite } = useFavorites();

  // ── Load plan-matched products on focus ──────────────────────────────────
  const loadPlanProducts = useCallback(async () => {
    setLoadingPlan(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setHasPlan(false); setLoadingPlan(false); return; }

      // Load scan count
      const profileRes = await supabase
        .from('profiles')
        .select('product_scans_used')
        .eq('id', user.id)
        .single();
      if (profileRes.data) setScansUsed(profileRes.data.product_scans_used || 0);

      // Load active plan
      const { data: plan } = await supabase
        .from('personalized_plans')
        .select('ranked_items')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!plan || !plan.ranked_items) {
        setHasPlan(false);
        setLoadingPlan(false);
        return;
      }

      setHasPlan(true);
      const items = plan.ranked_items as unknown as RankedItem[];

      // Match curated products to each plan item, dedupe
      const seen = new Set<string>();
      const matched: Product[] = [];
      for (const item of items) {
        const picks = matchProductsToPick(item, 4);
        for (const p of picks) {
          if (!seen.has(p.id)) {
            seen.add(p.id);
            matched.push(p);
          }
        }
      }

      setPlanProducts(matched);
    } catch (err) {
      console.error('loadPlanProducts error:', err);
      setHasPlan(false);
    } finally {
      setLoadingPlan(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    loadPlanProducts();
  }, [loadPlanProducts]));

  // ── Search via Rainforest (official Amazon images) ───────────────────────
  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    if (searchTimer.current) clearTimeout(searchTimer.current);

    if (!text.trim()) {
      setSearchResults([]);
      setHasSearched(false);
      setIsSearching(false);
      return;
    }

    if (text.trim().length >= 3) {
      setIsSearching(true);
      searchTimer.current = setTimeout(async () => {
        try {
          const { data, error } = await supabase.functions.invoke('search-products', {
            body: { query: text.trim() },
          });
          if (error) throw error;
          if (data?.error) console.warn('[shop] Rainforest API error:', data.error);
          setSearchResults(data?.products ?? []);
          setHasSearched(true);
        } catch (err) {
          console.error('Search error:', err);
          setSearchResults([]);
        } finally {
          setIsSearching(false);
        }
      }, SEARCH_DEBOUNCE);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setHasSearched(false);
    setIsSearching(false);
    if (searchTimer.current) clearTimeout(searchTimer.current);
  };

  // ── Barcode scanner ──────────────────────────────────────────────────────
  const handleBarcodeScan = async (barcode: string) => {
    if (!barcode.trim()) return;
    setScanning(false);
    setAnalyzing(true);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const scanResult = await supabase.functions.invoke('scan-product', {
        body: { barcode: barcode.trim(), user_id: user.id },
      });
      if (scanResult.error) throw scanResult.error;
      await supabase.from('profiles').update({ product_scans_used: scansUsed + 1 }).eq('id', user.id);
      setScansUsed(prev => prev + 1);
    } catch (err) {
      console.error('Scan error:', err);
      Alert.alert(t('scanner.scanError'), t('scanner.scanErrorMsg'));
    } finally {
      setAnalyzing(false);
    }
  };

  const startCamera = async () => {
    if (!permission?.granted) await requestPermission();
    setScanning(true);
  };

  const handleProductPress = (product: Product) => {
    router.push({
      pathname: '/product/[id]',
      params: { id: product.id, data: JSON.stringify(product) },
    });
  };

  // ── Camera overlay ───────────────────────────────────────────────────────
  if (scanning && permission?.granted) {
    return (
      <View style={styles.container}>
        <View style={styles.cameraContainer}>
          <CameraView
            style={styles.camera}
            facing="back"
            zoom={0}
            enableTorch={torchOn}
            barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39', 'qr'] }}
            onBarcodeScanned={({ data }) => handleBarcodeScan(data)}
          />
          <View style={styles.scannerOverlay}>
            <TouchableOpacity style={[styles.backBtn, { top: insets.top + 16 }]} onPress={() => setScanning(false)} activeOpacity={0.8}>
              <Text style={styles.backBtnText}>‹</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.torchBtn, { top: insets.top + 16 }]} onPress={() => setTorchOn(prev => !prev)} activeOpacity={0.8}>
              <View style={styles.torchCircle}>
                <Svg width={26} height={26} viewBox="0 0 24 24" fill="none">
                  <SvgPath d="M8.5 4.5 C8.5 3 15.5 3 15.5 4.5 L16 7 H8 L8.5 4.5z" fill={torchOn ? '#FFD700' : '#8A8A8A'} />
                  <SvgRect x={7.5} y={7} width={9} height={2.5} rx={0.8} fill={torchOn ? '#FFD700' : '#8A8A8A'} />
                  <SvgPath d="M8.5 9.5 H15.5 L14.5 20 C14.5 21 9.5 21 9.5 20 L8.5 9.5z" fill={torchOn ? '#FFD700' : '#7A7A7A'} />
                  <SvgCircle cx={12} cy={15} r={1.5} fill={torchOn ? 'rgba(0,0,0,0.3)' : '#999999'} />
                  <SvgCircle cx={12} cy={15} r={0.8} fill={torchOn ? 'rgba(255,255,255,0.5)' : '#AAAAAA'} />
                </Svg>
              </View>
            </TouchableOpacity>
            <View style={styles.scannerFrame}>
              <View style={[styles.corner, { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3 }]} />
              <View style={[styles.corner, { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3 }]} />
              <View style={[styles.corner, { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3 }]} />
              <View style={[styles.corner, { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3 }]} />
            </View>
          </View>
        </View>
      </View>
    );
  }

  const isLiveSearch = searchQuery.trim().length >= 3;
  const displayProducts = isLiveSearch ? searchResults : planProducts;

  // ── No plan yet ──────────────────────────────────────────────────────────
  if (!loadingPlan && hasPlan === false && !isLiveSearch) {
    return (
      <Animated.View style={[styles.container, { paddingTop: insets.top }, animatedStyle]}>
        <ScreenBackground preset="shop" />
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>{t('scanner.title')}</Text>
            <Text style={styles.subtitle}>{t('scanner.subtitle')}</Text>
          </View>
        </View>

        {/* Search still works even without a plan */}
        <View style={styles.searchWrap}>
          <View style={styles.searchBar}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search any product..."
              placeholderTextColor="#B5AFA5"
              value={searchQuery}
              onChangeText={handleSearchChange}
              returnKeyType="search"
            />
            {isSearching && <ActivityIndicator size="small" color="#7C5CFC" style={{ marginRight: 4 }} />}
            {searchQuery.length > 0 && !isSearching && (
              <TouchableOpacity onPress={clearSearch} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={styles.clearIcon}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.emptyState}>
          <Text style={styles.emptyStateEmoji}>🌿</Text>
          <Text style={styles.emptyStateTitle}>Your shop is waiting</Text>
          <Text style={styles.emptyStateBody}>
            Complete your first skin scan to get products personally matched to your skin type and condition.
          </Text>
          <TouchableOpacity
            style={styles.scanNowBtn}
            onPress={() => router.push('/(tabs)/scan')}
            activeOpacity={0.85}
          >
            <Text style={styles.scanNowText}>Do Your First Scan →</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  }

  // ── Main shop ────────────────────────────────────────────────────────────
  return (
    <Animated.View style={[styles.container, { paddingTop: insets.top }, animatedStyle]}>
      <ScreenBackground preset="shop" />

      <View style={styles.header}>
        <View>
          <Text style={styles.title}>{t('scanner.title')}</Text>
          <Text style={styles.subtitle}>
            {isLiveSearch ? `Results for "${searchQuery}"` : 'Matched to your routine'}
          </Text>
        </View>
        <TouchableOpacity style={styles.favBtn} onPress={() => setShowFavorites(true)} activeOpacity={0.8}>
          <Text style={styles.favBtnIcon}>♥</Text>
          {favorites.length > 0 && (
            <View style={styles.favCount}>
              <Text style={styles.favCountText}>{favorites.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollInner} showsVerticalScrollIndicator={false}>
        {/* Search */}
        <View style={styles.searchWrap}>
          <View style={styles.searchBar}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search any product on Amazon..."
              placeholderTextColor="#B5AFA5"
              value={searchQuery}
              onChangeText={handleSearchChange}
              returnKeyType="search"
            />
            {isSearching && <ActivityIndicator size="small" color="#7C5CFC" style={{ marginRight: 4 }} />}
            {searchQuery.length > 0 && !isSearching && (
              <TouchableOpacity onPress={clearSearch} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={styles.clearIcon}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Loading plan */}
        {loadingPlan && !isLiveSearch && (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color="#7C5CFC" />
            <Text style={styles.loadingText}>Loading your picks...</Text>
          </View>
        )}

        {/* Product grid */}
        {!loadingPlan && (
          <View style={styles.grid}>
            {displayProducts.map((product, i) => (
              <View key={product.id} style={[styles.gridCell, i % 2 === 0 ? { marginRight: CARD_GAP / 2 } : { marginLeft: CARD_GAP / 2 }]}>
                <ProductCard
                  product={product}
                  onPress={handleProductPress}
                  isFavorite={isFavorite(product.id)}
                  onToggleFavorite={toggleFavorite}
                />
              </View>
            ))}
          </View>
        )}

        {/* Empty states */}
        {!loadingPlan && displayProducts.length === 0 && !isSearching && isLiveSearch && (
          <View style={styles.emptySearch}>
            <Text style={styles.emptySearchIcon}>🔍</Text>
            <Text style={styles.emptySearchTitle}>No results found</Text>
            <Text style={styles.emptySearchBody}>Try a different search term</Text>
          </View>
        )}

        {analyzing && (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color="#7C5CFC" />
            <Text style={styles.loadingText}>Analyzing product...</Text>
          </View>
        )}
      </ScrollView>

      {/* Favorites drawer */}
      <Modal visible={showFavorites} animationType="slide" transparent onRequestClose={() => setShowFavorites(false)}>
        <View style={styles.favOverlay}>
          <TouchableOpacity style={styles.favBackdrop} activeOpacity={1} onPress={() => setShowFavorites(false)} />
          <View style={[styles.favDrawer, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.favHeader}>
              <Text style={styles.favTitle}>{t('scanner.savedFavorites')}</Text>
              <TouchableOpacity onPress={() => setShowFavorites(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={styles.favClose}>✕</Text>
              </TouchableOpacity>
            </View>
            {favorites.length === 0 ? (
              <View style={styles.favEmpty}>
                <Text style={styles.favEmptyIcon}>♡</Text>
                <Text style={styles.favEmptyText}>{t('scanner.noFavorites')}</Text>
                <Text style={styles.favEmptySubtext}>{t('scanner.noFavoritesHint')}</Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {favorites.map((product) => (
                  <View key={product.id} style={styles.favItem}>
                    {product.image_url ? (
                      <Image source={{ uri: product.image_url }} style={styles.favImage} resizeMode="contain" />
                    ) : (
                      <View style={styles.favImagePlaceholder} />
                    )}
                    <View style={styles.favItemInfo}>
                      <Text style={styles.favItemBrand}>{product.brand}</Text>
                      <Text style={styles.favItemName} numberOfLines={2}>{cleanProductName(product.name, product.brand)}</Text>
                      {product.price ? <Text style={styles.favItemPrice}>{product.price}</Text> : null}
                    </View>
                    <TouchableOpacity onPress={() => toggleFavorite(product)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Text style={styles.favItemHeart}>♥</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#08080F' },

  header: {
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 4,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  title: { fontSize: 30, fontWeight: '700', color: '#FFFFFF', letterSpacing: -0.4 },
  subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.4)', marginTop: 2 },

  scroll: { flex: 1 },
  scrollInner: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 130 },

  searchWrap: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 4 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F2EDE6', borderRadius: 14,
    paddingHorizontal: 14, height: 48,
  },
  searchInput: { flex: 1, fontSize: 14, color: '#1C1C1A', height: 48 },
  clearIcon: { fontSize: 13, color: '#9B9488', padding: 4 },

  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 20 },
  loadingText: { fontSize: 13, color: '#7C5CFC', fontWeight: '500' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingTop: 16 },
  gridCell: { marginBottom: CARD_GAP },

  // ── No plan empty state ──
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
    paddingTop: 60,
    gap: 16,
  },
  emptyStateEmoji: { fontSize: 52, marginBottom: 8 },
  emptyStateTitle: { fontSize: 22, fontWeight: '700', color: '#FFFFFF', textAlign: 'center', letterSpacing: -0.3 },
  emptyStateBody: { fontSize: 15, color: 'rgba(255,255,255,0.45)', textAlign: 'center', lineHeight: 22 },
  scanNowBtn: {
    marginTop: 8,
    backgroundColor: Colors.primary,
    paddingHorizontal: 28, paddingVertical: 16,
    borderRadius: 16,
  },
  scanNowText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },

  // ── Search empty ──
  emptySearch: { alignItems: 'center', paddingVertical: 48, gap: 6 },
  emptySearchIcon: { fontSize: 36, opacity: 0.35, marginBottom: 4 },
  emptySearchTitle: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
  emptySearchBody: { fontSize: 13, color: '#9B9488' },

  // ── Camera ──
  cameraContainer: { flex: 1, position: 'relative' },
  camera: { flex: 1 },
  scannerOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.45)',
  },
  scannerFrame: { width: 240, height: 140, position: 'relative' },
  corner: { position: 'absolute', width: 26, height: 26, borderColor: '#FFFFFF' },
  backBtn: {
    position: 'absolute', left: 16, zIndex: 20,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center', justifyContent: 'center',
  },
  backBtnText: { fontSize: 30, color: '#FFFFFF', fontWeight: '300', marginTop: -2 },
  torchBtn: {
    position: 'absolute', right: 16, zIndex: 20,
    width: 56, height: 56, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center',
  },
  torchCircle: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: 'rgba(40,40,40,0.75)',
    borderWidth: 1, borderColor: 'rgba(180,180,180,0.3)',
    alignItems: 'center', justifyContent: 'center',
  },

  // ── Favorites ──
  favBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.card,
    alignItems: 'center', justifyContent: 'center',
  },
  favBtnIcon: { fontSize: 24, color: '#E8507A' },
  favCount: {
    position: 'absolute', top: 4, right: 4,
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  favCountText: { fontSize: 9, fontWeight: '700', color: '#FFFFFF' },
  favOverlay: { flex: 1, justifyContent: 'flex-end' },
  favBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'transparent' },
  favDrawer: {
    backgroundColor: Colors.backgroundAlt,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingTop: 20, paddingHorizontal: 20,
    maxHeight: '80%',
  },
  favHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 20,
  },
  favTitle: { fontSize: 20, fontWeight: '700', color: '#FFFFFF' },
  favClose: { fontSize: 18, color: '#FFFFFF' },
  favEmpty: { alignItems: 'center', paddingVertical: 48 },
  favEmptyIcon: { fontSize: 40, marginBottom: 12, color: '#FFFFFF' },
  favEmptyText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF', marginBottom: 6 },
  favEmptySubtext: { fontSize: 13, color: '#9B9488', textAlign: 'center' },
  favItem: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: Colors.card, borderRadius: 14,
    padding: 12, marginBottom: 10,
  },
  favImage: { width: 56, height: 56, borderRadius: 10, backgroundColor: '#FFFFFF' },
  favImagePlaceholder: { width: 56, height: 56, borderRadius: 10, backgroundColor: Colors.card },
  favItemInfo: { flex: 1 },
  favItemBrand: { fontSize: 10, fontWeight: '700', color: '#9B9488', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 2 },
  favItemName: { fontSize: 14, fontWeight: '600', color: '#FFFFFF', lineHeight: 18 },
  favItemPrice: { fontSize: 13, fontWeight: '700', color: Colors.primary, marginTop: 4 },
  favItemHeart: { fontSize: 20, color: '#E8507A' },
});
