import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, FlatList, Linking, Dimensions, Image, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Line, Rect, Circle } from 'react-native-svg';
import { Colors, Spacing, BorderRadius, Typography } from '@/lib/theme';
import { buildAffiliateUrl, buildAmazonSearchUrl } from '@/lib/config';
import { supabase } from '@/lib/supabase';
import type { RankedItem } from '@/lib/database.types';
import type { Product } from '@/lib/products';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CAROUSEL_CARD_WIDTH = 150;

// ── Per-pillar colour palette ─────────────────────────────────────────────────
const PILLAR_COLORS: Record<string, { accent: string; bg: string; border: string }> = {
  product:   { accent: '#A78BFA', bg: 'rgba(167,139,250,0.10)', border: 'rgba(167,139,250,0.25)' },
  diet:      { accent: '#34D399', bg: 'rgba(52,211,153,0.10)',  border: 'rgba(52,211,153,0.25)'  },
  herbal:    { accent: '#2DD4BF', bg: 'rgba(45,212,191,0.10)',  border: 'rgba(45,212,191,0.25)'  },
  lifestyle: { accent: '#FCD34D', bg: 'rgba(252,211,77,0.10)',  border: 'rgba(252,211,77,0.25)'  },
};

const PILLAR_LABELS: Record<string, string> = {
  product:   'SKINCARE',
  diet:      'DIET',
  herbal:    'HERBAL',
  lifestyle: 'LIFESTYLE',
};

const PILLAR_EMOJIS: Record<string, string> = {
  product:   '✨',
  diet:      '🥗',
  herbal:    '🌿',
  lifestyle: '🌙',
};

// ── Small pillar icons ────────────────────────────────────────────────────────
function PillarIcon({ pillar, size = 18, color }: { pillar: string; size?: number; color: string }) {
  if (pillar === 'product') return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={9} y={2} width={6} height={3} rx={1} stroke={color} strokeWidth={2} fill="none" />
      <Path d="M8 7h8l1 4v9a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2v-9l1-4z" stroke={color} strokeWidth={2} fill="none" />
      <Line x1={8} y1={14} x2={16} y2={14} stroke={color} strokeWidth={1.5} />
    </Svg>
  );
  if (pillar === 'diet') return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={9} stroke={color} strokeWidth={2} fill="none" />
      <Path d="M12 7c-1 0-2.5 1.5-2.5 3.5S11 14 12 14s2.5-1.5 2.5-3.5S13 7 12 7z" stroke={color} strokeWidth={1.5} fill="none" />
    </Svg>
  );
  if (pillar === 'herbal') return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M6 21c0 0 1-8 6-13s11-5 11-5-1 8-6 13-11 5-11 5z" stroke={color} strokeWidth={2} fill="none" strokeLinejoin="round" />
      <Path d="M6 21c3-3 6-7 11-11" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  );
  // lifestyle
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z" stroke={color} strokeWidth={2} fill="none" strokeLinejoin="round" />
    </Svg>
  );
}

function openAmazonSearch(query: string) {
  Linking.openURL(buildAmazonSearchUrl(query));
}

const CATEGORY_EMOJI: Record<string, string> = {
  Skincare: '✨', Supplements: '💊', Foods: '🥗', Herbal: '🌿', Accessories: '🛏️',
};

function CarouselCard({ product }: { product: Product }) {
  const link = product.asin
    ? buildAffiliateUrl(product.asin)
    : buildAmazonSearchUrl(`${product.brand} ${product.name}`);

  return (
    <TouchableOpacity
      style={cStyles.carouselCard}
      activeOpacity={0.88}
      onPress={() => Linking.openURL(link)}
    >
      <View style={cStyles.carouselImageBox}>
        {product.image_url ? (
          <Image
            source={{ uri: product.image_url }}
            style={cStyles.carouselImage}
            resizeMode="contain"
          />
        ) : (
          <Text style={cStyles.carouselEmoji}>
            {CATEGORY_EMOJI[product.category] ?? '✨'}
          </Text>
        )}
      </View>
      {product.brand ? <Text style={cStyles.carouselBrand}>{product.brand}</Text> : null}
      <Text style={cStyles.carouselName} numberOfLines={2}>{product.name}</Text>
      {product.price ? <Text style={cStyles.carouselPrice}>{product.price}</Text> : null}
      <Text style={cStyles.carouselLink}>View on Amazon ↗</Text>
    </TouchableOpacity>
  );
}

interface PickDetailModalProps {
  visible: boolean;
  pick: RankedItem | null;
  onClose: () => void;
  onToggleRoutine: (item: RankedItem) => void;
  isInRoutine: boolean;
}

export default function PickDetailModal({ visible, pick, onClose, onToggleRoutine, isInRoutine }: PickDetailModalProps) {
  const insets = useSafeAreaInsets();
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  useEffect(() => {
    if (!visible || !pick || pick.pillar === 'lifestyle') {
      setRelatedProducts([]);
      return;
    }
    setLoadingProducts(true);
    supabase.functions.invoke('search-products', { body: { query: pick.title } })
      .then(({ data }) => setRelatedProducts(data?.products ?? []))
      .catch(() => setRelatedProducts([]))
      .finally(() => setLoadingProducts(false));
  }, [visible, pick?.title]);

  if (!pick) return null;

  const hasProducts = relatedProducts.length > 0 || loadingProducts;
  const palette = PILLAR_COLORS[pick.pillar] ?? PILLAR_COLORS.product;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Handle bar */}
        <View style={styles.handleBar}>
          <View style={styles.handle} />
        </View>

        {/* Close button */}
        <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 40 + insets.bottom }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Pillar badge */}
          <View style={[styles.pillarBadge, { backgroundColor: palette.bg, borderColor: palette.border }]}>
            <PillarIcon pillar={pick.pillar} size={14} color={palette.accent} />
            <Text style={[styles.pillarLabel, { color: palette.accent }]}>
              {PILLAR_LABELS[pick.pillar] ?? pick.pillar.toUpperCase()}
            </Text>
          </View>

          {/* Title */}
          <Text style={styles.title}>{pick.title}</Text>

          {/* Quick rationale chip */}
          <Text style={styles.rationaleChip}>{pick.rationale}</Text>

          {/* ── WHY THIS IS FOR YOU card ── */}
          <View style={[styles.notesCard, { backgroundColor: palette.bg, borderColor: palette.border }]}>
            <View style={styles.notesHeader}>
              <View style={[styles.notesDot, { backgroundColor: palette.accent }]} />
              <Text style={[styles.notesLabel, { color: palette.accent }]}>WHY THIS IS FOR YOU</Text>
            </View>
            {Array.isArray(pick.notes) && pick.notes.length > 0 ? (
              <View style={styles.bulletList}>
                {pick.notes.map((bullet, i) => (
                  <View key={i} style={styles.bulletRow}>
                    <View style={[styles.bulletDot, { backgroundColor: palette.accent }]} />
                    <Text style={styles.bulletText}>{bullet}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.notesText}>{pick.rationale}</Text>
            )}
          </View>

          {/* Related products carousel */}
          {(pick.pillar !== 'lifestyle') && (
            <View style={styles.carouselSection}>
              <Text style={styles.carouselTitle}>Shop on Amazon</Text>
              {loadingProducts ? (
                <ActivityIndicator color={palette.accent} style={{ marginVertical: 20 }} />
              ) : hasProducts ? (
                <FlatList
                  data={relatedProducts}
                  keyExtractor={(item) => item.id}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.carouselList}
                  renderItem={({ item }) => <CarouselCard product={item} />}
                />
              ) : null}
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  handleBar: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
  },
  closeBtn: {
    position: 'absolute',
    top: 52,
    right: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.cardGlass,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  closeText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.sm },

  pillarBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: Spacing.lg,
  },
  pillarLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
  },

  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -0.5,
    lineHeight: 34,
    marginBottom: 8,
  },

  rationaleChip: {
    fontSize: 14,
    color: Colors.textMuted,
    marginBottom: Spacing.xl,
    lineHeight: 20,
  },

  // ── Notes card ──────────────────────────────────────────────────────────────
  notesCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
    gap: Spacing.md,
  },
  notesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  notesDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  notesLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.4,
  },
  notesText: {
    fontSize: 15,
    color: Colors.text,
    lineHeight: 24,
  },

  bulletList: {
    gap: 12,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 8,
    flexShrink: 0,
  },
  bulletText: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
    lineHeight: 23,
  },

  divider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginBottom: Spacing.xl,
  },

  routineBtn: {
    borderRadius: BorderRadius.lg,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  routineBtnActive: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  routineBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.background,
  },

  amazonBtn: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.lg,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: Spacing.xxl,
  },
  amazonBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },

  carouselSection: { marginBottom: Spacing.lg },
  carouselTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -0.2,
    marginBottom: Spacing.md,
  },
  carouselList: {
    gap: Spacing.md,
    paddingRight: Spacing.xs,
  },
});

const cStyles = StyleSheet.create({
  carouselCard: {
    width: CAROUSEL_CARD_WIDTH,
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
    gap: 4,
  },
  carouselImageBox: {
    width: CAROUSEL_CARD_WIDTH - 24,
    height: 80,
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    overflow: 'hidden',
  },
  carouselImage: {
    width: '85%',
    height: '85%',
  },
  carouselEmoji: { fontSize: 28 },
  carouselBrand: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  carouselName: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text,
    lineHeight: 16,
  },
  carouselPrice: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
    marginTop: 2,
  },
  carouselLink: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.textMuted,
    marginTop: 4,
  },
});
