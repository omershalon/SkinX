import { Colors } from '@/lib/theme';
import type {
  ScanSession,
  ReviewedDetection,
  Recommendation,
  SkinPlan,
} from '@/lib/scan-types';

// ── Snapshot item shown in the 2×2 grid ──

export interface SnapshotItem {
  id: string;
  label: string;
  severity: string;
  severityColor: string;
  iconType: 'circle' | 'lightning' | 'droplet' | 'sparkle';
  iconColor: string;
}

// ── Detail-screen content for a single snapshot item ──

export interface SnapshotDetail {
  item: SnapshotItem;
  whatItIs: string;
  whyItHappens: string;
  whatHelps: { title: string; desc: string }[];
  personalizedPlan: string[];
  timeline: string;
}

// ── Static educational content per concern ──

const EDUCATION: Record<
  string,
  {
    whatItIs: string;
    whyItHappens: string;
    whatHelps: { title: string; desc: string }[];
    timeline: string;
  }
> = {
  dark_marks: {
    whatItIs:
      'Dark marks (post-inflammatory hyperpigmentation) are flat, discolored patches left behind after a pimple or skin injury heals. They are not scars — they are excess melanin deposited in the skin during the healing process.',
    whyItHappens:
      'When skin is inflamed from acne, irritation, or injury, melanocytes produce extra melanin. This excess pigment gets trapped in the healing skin, creating visible dark spots. Sun exposure without SPF protection darkens them further and slows fading.',
    whatHelps: [
      { title: 'Daily SPF 30+', desc: 'Prevents spots from darkening and protects healing skin from UV damage' },
      { title: 'Vitamin C serum (L-ascorbic acid)', desc: 'Inhibits melanin production and brightens existing spots over time' },
      { title: 'Niacinamide (5-10%)', desc: 'Reduces melanin transfer to skin cells and evens overall tone' },
      { title: 'AHA exfoliation (1-2× per week)', desc: 'Accelerates cell turnover so pigmented cells shed faster' },
    ],
    timeline:
      'Most dark marks fade on their own in 3-6 months. With a consistent brightening routine you can see visible improvement in 4-8 weeks. Deeper or older marks may take 6-12 months to fully resolve.',
  },
  active_acne: {
    whatItIs:
      'Active acne includes inflamed bumps (papules), pus-filled spots (pustules), and deeper painful nodules. These form when clogged pores become infected with bacteria, triggering your immune system to respond with redness and swelling.',
    whyItHappens:
      'Excess sebum clogs pores, trapping dead skin cells. The bacterium C. acnes multiplies inside the trapped oil, triggering inflammation. Hormonal fluctuations, stress, and certain dietary factors can increase oil production and worsen breakouts.',
    whatHelps: [
      { title: 'Gentle low-pH cleanser', desc: 'Removes excess oil without stripping the skin barrier' },
      { title: 'Salicylic acid (BHA 2%)', desc: 'Oil-soluble acid that penetrates and dissolves clogs inside pores' },
      { title: 'Benzoyl peroxide (2.5-5%)', desc: 'Kills acne-causing bacteria on contact with less irritation at lower concentrations' },
      { title: 'Non-comedogenic moisturizer', desc: 'Maintains hydration and barrier function without clogging pores' },
    ],
    timeline:
      'Individual spots typically heal within 5-14 days. With a consistent routine, expect noticeable improvement in 4-6 weeks. Full clearing usually takes 8-12 weeks of steady use.',
  },
  oiliness: {
    whatItIs:
      'Excess oil production (seborrhea) happens when sebaceous glands produce more sebum than needed. The T-zone — forehead, nose, and chin — is most affected because it has the highest density of oil glands on the face.',
    whyItHappens:
      'Sebum production is primarily driven by androgens (hormones). Genetics, humidity, over-washing with harsh cleansers, and skipping moisturizer can all trigger compensatory oil overproduction as the skin tries to protect itself.',
    whatHelps: [
      { title: 'Niacinamide serum (5-10%)', desc: 'Regulates sebum production at the gland level without causing dryness' },
      { title: 'Lightweight gel moisturizer', desc: 'Hydrates without adding oil — skipping moisturizer actually worsens oiliness' },
      { title: 'Clay mask (1× per week)', desc: 'Absorbs excess oil and temporarily minimizes pore appearance' },
      { title: 'Oil-free SPF', desc: 'Protects skin without adding shine or clogging pores' },
    ],
    timeline:
      'Oil-control products show initial results in 2-4 weeks. Niacinamide typically regulates sebum production within 4-8 weeks of consistent daily use.',
  },
  blackheads: {
    whatItIs:
      'Blackheads (open comedones) are clogged pores where trapped sebum and dead cells are exposed to air. The dark color is caused by oxidation of the oil, not dirt. They are most common on the nose, chin, and forehead.',
    whyItHappens:
      'Excess oil and dead skin cells accumulate in pore openings. Unlike whiteheads, the pore stays open, allowing air to oxidize the surface plug and turn it dark. Oily or combination skin types are most prone.',
    whatHelps: [
      { title: 'Salicylic acid cleanser', desc: 'Oil-soluble BHA penetrates pores to dissolve existing clogs' },
      { title: 'BHA toner (daily)', desc: 'Ongoing low-concentration use prevents new blackheads from forming' },
      { title: 'Clay mask (weekly)', desc: 'Draws out impurities and helps tighten pore appearance' },
      { title: 'Oil-free sunscreen', desc: 'Protects without adding pore-clogging ingredients' },
    ],
    timeline:
      'Existing blackheads start clearing within 2-4 weeks of regular BHA use. Prevention requires ongoing use. Full improvement is typically seen in 6-8 weeks.',
  },
  dryness: {
    whatItIs:
      'Skin dryness occurs when the skin barrier loses moisture faster than it can be replenished. This leads to tightness, flaking, rough texture, and sometimes increased sensitivity or irritation.',
    whyItHappens:
      'A compromised skin barrier allows transepidermal water loss. Common causes include harsh cleansers, over-exfoliation, cold or dry weather, hot showers, and certain medications. Some people are genetically predisposed to lower ceramide production.',
    whatHelps: [
      { title: 'Hyaluronic acid serum', desc: 'Attracts and holds up to 1000× its weight in water within the skin' },
      { title: 'Ceramide moisturizer', desc: 'Repairs and reinforces the skin barrier to prevent water loss' },
      { title: 'Gentle cleanser (pH 5.5)', desc: 'Cleans effectively without stripping protective natural oils' },
      { title: 'Sleeping mask (1× per week)', desc: 'Intensive overnight moisture boost for deep hydration' },
    ],
    timeline:
      'Surface hydration improves within a few days of consistent moisturizing. Full barrier repair takes 2-4 weeks. Recovery from severe dryness or over-exfoliation may take 6-8 weeks.',
  },
  skin_texture: {
    whatItIs:
      'Skin texture refers to the smoothness and evenness of your skin surface. Issues like rough patches, small bumps, enlarged pores, or mild unevenness can make skin look less radiant even when breakouts are minimal.',
    whyItHappens:
      'Dead skin cells accumulate on the surface when natural cell turnover slows. Dehydration, sun damage, insufficient exfoliation, and post-acne scarring all contribute to uneven texture. Environmental pollution can also dull the skin surface.',
    whatHelps: [
      { title: 'AHA exfoliant (glycolic or lactic acid)', desc: 'Dissolves surface dead skin cells for visibly smoother texture' },
      { title: 'Retinoid (start low, 0.025%)', desc: 'Accelerates cell turnover and stimulates collagen for long-term smoothing' },
      { title: 'Hydrating toner or essence', desc: 'Plumps skin cells from within for a smoother, dewier appearance' },
      { title: 'Daily moisturizer', desc: 'Keeps skin supple and supports healthy barrier function' },
    ],
    timeline:
      'Surface smoothing is visible in 2-3 weeks with regular exfoliation. Deeper texture improvement with retinoids takes 8-12 weeks. Post-acne scarring may take 3-6 months or longer.',
  },
  whiteheads: {
    whatItIs:
      'Whiteheads (closed comedones) are small, flesh-colored or white bumps caused by pores that are completely blocked by oil and dead skin cells. Unlike blackheads, the pore opening is sealed, so the contents don\'t oxidize.',
    whyItHappens:
      'When excess sebum and dead skin cells fully block a pore and seal the opening, a whitehead forms. They are common in oily areas and can be triggered by comedogenic products, hormonal changes, or insufficient cleansing.',
    whatHelps: [
      { title: 'Salicylic acid (BHA)', desc: 'Penetrates the sealed pore to dissolve the clog from within' },
      { title: 'Retinoid', desc: 'Prevents dead cells from accumulating and blocking pores' },
      { title: 'Non-comedogenic products', desc: 'Switching to oil-free formulas prevents new whiteheads' },
      { title: 'Gentle exfoliation', desc: 'Keeps pore openings clear to prevent future blockages' },
    ],
    timeline:
      'Whiteheads respond to BHA in 3-6 weeks. Retinoids may cause initial purging (weeks 2-4) before clearing. Consistent improvement is usually seen by week 8-10.',
  },
};

// ── Helpers ──

function countByClass(session: ScanSession, className: string): number {
  const all = Object.values(session.reviewed_detections ?? {}).flat() as ReviewedDetection[];
  return all.filter((d) => d.status !== 'removed' && d.className === className).length;
}

function countByClasses(session: ScanSession, classes: string[]): number {
  const all = Object.values(session.reviewed_detections ?? {}).flat() as ReviewedDetection[];
  return all.filter((d) => d.status !== 'removed' && classes.includes(d.className)).length;
}

function severityFromCount(count: number, thresholds: [number, number] = [3, 7]): { label: string; color: string } {
  if (count === 0) return { label: 'None', color: Colors.success };
  if (count <= thresholds[0]) return { label: 'Mild', color: Colors.success };
  if (count <= thresholds[1]) return { label: 'Moderate', color: Colors.warning };
  return { label: 'Severe', color: Colors.error };
}

// ── Derive snapshot items from a scan session ──

export function deriveSnapshotItems(session: ScanSession): SnapshotItem[] {
  const items: SnapshotItem[] = [];

  // 1. Dark marks
  const darkSpotCount = countByClass(session, 'dark spot');
  const darkSev = severityFromCount(darkSpotCount, [3, 6]);
  items.push({
    id: 'dark_marks',
    label: 'Dark marks',
    severity: darkSpotCount === 0 ? 'None' : darkSev.label,
    severityColor: darkSev.color,
    iconType: 'circle',
    iconColor: '#F59E0B',
  });

  // 2. Active acne (papules + pustules + nodules)
  const acneCount = countByClasses(session, ['papules', 'pustules', 'nodules']);
  const acneSev = severityFromCount(acneCount, [3, 8]);
  items.push({
    id: 'active_acne',
    label: 'Active acne',
    severity: acneCount === 0 ? 'Clear' : acneCount <= 3 ? 'Low' : acneSev.label,
    severityColor: acneSev.color,
    iconType: 'lightning',
    iconColor: Colors.success,
  });

  // 3. Oiliness / T-zone oil
  const skinType = ((session.skin_insights as any)?.skin_type ?? '').toLowerCase();
  const observations: string[] = (session.skin_insights as any)?.key_observations ?? [];
  const oilyMentions = observations.filter((o) => /oil|sebum|shine|greasy/i.test(o)).length;
  const isOily = skinType.includes('oily') || skinType.includes('combination') || oilyMentions > 0;
  if (isOily) {
    items.push({
      id: 'oiliness',
      label: 'T-zone oil',
      severity: skinType.includes('oily') ? 'Moderate' : 'Mild',
      severityColor: skinType.includes('oily') ? Colors.warning : Colors.success,
      iconType: 'droplet',
      iconColor: '#60A5FA',
    });
  }

  // 4. Blackheads
  const blackheadCount = countByClass(session, 'blackheads');
  if (blackheadCount > 0) {
    const bhSev = severityFromCount(blackheadCount, [3, 6]);
    items.push({
      id: 'blackheads',
      label: 'Blackheads',
      severity: bhSev.label,
      severityColor: bhSev.color,
      iconType: 'circle',
      iconColor: '#9CA3AF',
    });
  }

  // 5. Whiteheads
  const whiteheadCount = countByClass(session, 'whiteheads');
  if (whiteheadCount > 0 && items.length < 4) {
    const whSev = severityFromCount(whiteheadCount, [3, 6]);
    items.push({
      id: 'whiteheads',
      label: 'Whiteheads',
      severity: whSev.label,
      severityColor: whSev.color,
      iconType: 'circle',
      iconColor: '#C4B5FD',
    });
  }

  // 6. Dryness (if dry or normal-dry)
  const isDry = skinType.includes('dry') || observations.some((o) => /dry|flak|tight|dehydrat/i.test(o));
  if (isDry && items.length < 4) {
    items.push({
      id: 'dryness',
      label: 'Dryness',
      severity: skinType.includes('dry') ? 'Moderate' : 'Mild',
      severityColor: skinType.includes('dry') ? Colors.warning : Colors.success,
      iconType: 'droplet',
      iconColor: '#FCD34D',
    });
  }

  // Fill remaining slots with skin texture
  if (items.length < 4) {
    items.push({
      id: 'skin_texture',
      label: 'Skin texture',
      severity: 'Good',
      severityColor: Colors.success,
      iconType: 'sparkle',
      iconColor: Colors.primaryLight,
    });
  }

  return items.slice(0, 4);
}

// ── Build detail data for a snapshot item ──

export function buildSnapshotDetail(session: ScanSession, snapshotId: string): SnapshotDetail | null {
  const items = deriveSnapshotItems(session);
  const item = items.find((i) => i.id === snapshotId);
  if (!item) return null;

  const edu = EDUCATION[snapshotId];
  if (!edu) return null;

  // Pull personalized plan steps from session that are relevant
  const plan = session.skin_plan as SkinPlan | null;
  const personalizedPlan: string[] = [];

  if (plan) {
    const allSteps = [
      ...(plan.morning_routine ?? []).map((s) => s.step + ' — ' + s.reason),
      ...(plan.evening_routine ?? []).map((s) => s.step + ' — ' + s.reason),
      ...(plan.weekly_treatments ?? []).map((t) => t.treatment + ' (' + t.frequency + ') — ' + t.reason),
    ];

    // Keyword matching to find relevant plan steps
    const keywords = getKeywordsForConcern(snapshotId);
    for (const step of allSteps) {
      if (keywords.some((kw) => step.toLowerCase().includes(kw))) {
        personalizedPlan.push(step);
      }
    }

    // If no specific matches, include top 3 steps
    if (personalizedPlan.length === 0) {
      personalizedPlan.push(...allSteps.slice(0, 3));
    }
  }

  return {
    item,
    whatItIs: edu.whatItIs,
    whyItHappens: edu.whyItHappens,
    whatHelps: edu.whatHelps,
    personalizedPlan,
    timeline: edu.timeline,
  };
}

function getKeywordsForConcern(id: string): string[] {
  switch (id) {
    case 'dark_marks': return ['dark', 'spot', 'pigment', 'brighten', 'vitamin c', 'spf', 'sun', 'niacinamide'];
    case 'active_acne': return ['acne', 'breakout', 'salicylic', 'benzoyl', 'bha', 'cleanser', 'pimple'];
    case 'oiliness': return ['oil', 'sebum', 'mattif', 'niacinamide', 'clay', 'shine', 'blot'];
    case 'blackheads': return ['blackhead', 'bha', 'salicylic', 'pore', 'clay', 'comedone'];
    case 'whiteheads': return ['whitehead', 'comedone', 'retinoid', 'bha', 'salicylic', 'pore'];
    case 'dryness': return ['hydrat', 'moisture', 'ceramide', 'hyaluronic', 'barrier', 'dry', 'gentle'];
    case 'skin_texture': return ['texture', 'smooth', 'exfoli', 'aha', 'retinoid', 'retinol', 'cell turnover'];
    default: return [];
  }
}

// ── Headline from severity ──

export function getSkinHeadline(session: ScanSession): string {
  const severity = session.severity ?? 'mild';
  const totalSpots = session.total_spots ?? 0;
  if (severity === 'mild' && totalSpots <= 3) return 'Mostly Clear Skin';
  if (severity === 'mild' && totalSpots <= 8) return 'A Few Spots';
  if (severity === 'mild') return 'Light Breakout';
  if (severity === 'moderate') return 'Some Breakouts';
  return 'Needs Attention';
}

// ── Map a recommendation to an icon ──

export function getRecommendationIcon(title: string): string {
  const t = (title ?? '').toLowerCase();
  if (t.includes('spf') || t.includes('sun')) return '☀️';
  if (t.includes('vitamin c') || t.includes('serum') || t.includes('brighten')) return '✨';
  if (t.includes('aha') || t.includes('exfoli') || t.includes('retino')) return '💧';
  if (t.includes('cleanser') || t.includes('clean')) return '🫧';
  if (t.includes('moistur') || t.includes('hydrat')) return '💦';
  if (t.includes('niacinamide')) return '🧴';
  if (t.includes('mask')) return '🎭';
  return '✨';
}
