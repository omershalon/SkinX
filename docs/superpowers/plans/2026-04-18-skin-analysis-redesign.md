# Skin Analysis Dashboard Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Skin Snapshot grid and Recommendations section in GlowAnalysisDashboard with a Face Zone text summary and a Strengths & Weaknesses section, backed by new Gemini-assessed skin categories.

**Architecture:** Extend the Gemini prompt to return two new structured fields (`skin_assessment` and `zone_scores`), add those fields to the TypeScript types, build two new UI components, and wire them into `GlowAnalysisDashboard` in place of the removed sections.

**Tech Stack:** React Native, TypeScript, Expo, Supabase Edge Functions (Deno), Gemini 2.5 Flash

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `lib/scan-types.ts` | Modify | Add `SkinAssessmentItem`, `ZoneScore` types; extend `GeminiResponse` |
| `supabase/functions/gemini-review-scan/index.ts` | Modify | Add new fields to Gemini prompt schema + output parsing |
| `components/FaceZoneSummary.tsx` | Create | Text-based zone breakdown component |
| `components/SkinStrengthsWeaknesses.tsx` | Create | Strengths & weaknesses cards component |
| `components/GlowAnalysisDashboard.tsx` | Modify | Remove snapshot/recs sections, add two new components |

---

## Task 1: Add TypeScript Types

**Files:**
- Modify: `lib/scan-types.ts`

- [ ] **Step 1: Add new types to scan-types.ts**

Open `lib/scan-types.ts` and add the following after the existing `ZoneBreakdown` type:

```typescript
export interface SkinAssessmentItem {
  category: string;   // e.g. "active_breakouts", "redness", "pore_visibility"
  label: string;      // friendly one-liner from Gemini, e.g. "Very few blackheads detected"
  score: number;      // 0–10, lower = better condition
  is_strength: boolean;
}

export interface ZoneScore {
  zone: 'forehead' | 'left_cheek' | 'right_cheek' | 'nose' | 'chin_jawline';
  lesion_count: number;
  severity: 'clear' | 'mild' | 'moderate' | 'severe';
  primary_types: string[];
}
```

- [ ] **Step 2: Extend GeminiResponse**

Find the `GeminiResponse` interface in `lib/scan-types.ts` and add the two new optional fields:

```typescript
export interface GeminiResponse {
  reviewed_detections: { front: ReviewedDetection[]; left: ReviewedDetection[]; right: ReviewedDetection[] };
  summary: ScanSummary;
  zone_breakdown: ZoneBreakdown[];
  skin_insights: SkinInsights;
  recommendations: Recommendation[];
  skin_plan: SkinPlan;
  skin_assessment?: SkinAssessmentItem[];   // ← add
  zone_scores?: ZoneScore[];                // ← add
}
```

- [ ] **Step 3: Commit**

```bash
git add lib/scan-types.ts
git commit -m "feat: add SkinAssessmentItem and ZoneScore types"
```

---

## Task 2: Update Gemini Prompt and Response Parsing

**Files:**
- Modify: `supabase/functions/gemini-review-scan/index.ts`

- [ ] **Step 1: Extend the required JSON output schema in the prompt**

Find the `userPrompt` string (around line 600). Replace the existing `"recommendations": []` and `"skin_plan": {...}` lines in the JSON schema with the extended version. The full updated JSON schema block (replace from `## Required JSON output` down to the closing `}` before `CRITICAL:`) should be:

```
## Required JSON output

Return ONLY valid JSON:

{
  "reviewed_detections": {
    "front": [{"bbox": [x1,y1,x2,y2], "classIndex": 0, "className": "blackheads", "confidence": 0.95, "source": "model", "status": "confirmed"}],
    "left": [],
    "right": []
  },
  "summary": {
    "severity": "mild",
    "severity_score": 35,
    "total_spots": 12,
    "confirmed_spots": 10,
    "ai_added_spots": 2,
    "ai_corrected_spots": 0,
    "primary_acne_type": "comedonal",
    "description": "One sentence overview."
  },
  "zone_breakdown": [
    {"zone": "forehead", "spot_count": 7, "primary_types": ["papules"], "severity": "moderate", "note": "brief"}
  ],
  "skin_insights": {
    "skin_type": "combination",
    "moisture": "low-normal",
    "key_observations": ["obs 1", "obs 2"]
  },
  "zone_scores": [
    {"zone": "forehead", "lesion_count": 7, "severity": "moderate", "primary_types": ["papules"]},
    {"zone": "left_cheek", "lesion_count": 3, "severity": "mild", "primary_types": ["dark spot"]},
    {"zone": "right_cheek", "lesion_count": 1, "severity": "clear", "primary_types": []},
    {"zone": "nose", "lesion_count": 0, "severity": "clear", "primary_types": []},
    {"zone": "chin_jawline", "lesion_count": 4, "severity": "moderate", "primary_types": ["papules", "pustules"]}
  ],
  "skin_assessment": [
    {"category": "active_breakouts", "label": "Several inflamed spots on forehead and chin", "score": 7, "is_strength": false},
    {"category": "comedones", "label": "Very few blackheads or whiteheads detected", "score": 2, "is_strength": true},
    {"category": "dark_spots", "label": "Some post-inflammatory marks still fading", "score": 5, "is_strength": false},
    {"category": "redness", "label": "Mild redness around the cheeks", "score": 4, "is_strength": false},
    {"category": "skin_texture", "label": "Texture looks relatively smooth overall", "score": 3, "is_strength": true},
    {"category": "pore_visibility", "label": "Pores are fairly minimal", "score": 2, "is_strength": true},
    {"category": "skin_tone_evenness", "label": "Complexion looks fairly even", "score": 3, "is_strength": true},
    {"category": "oiliness", "label": "Some shine visible in the T-zone", "score": 5, "is_strength": false},
    {"category": "hydration", "label": "Skin looks well moisturised", "score": 2, "is_strength": true},
    {"category": "brightness", "label": "Skin appears a little dull", "score": 6, "is_strength": false},
    {"category": "under_eye", "label": "Mild darkness under the eyes", "score": 4, "is_strength": false}
  ],
  "recommendations": [],
  "skin_plan": {"morning_routine": [], "evening_routine": [], "weekly_treatments": []}
}
```

- [ ] **Step 2: Add skin assessment instructions to Task 2 in the prompt**

Find the `### Task 2 — Skin analysis` section in the `userPrompt` and replace it with:

```
### Task 2 — Skin analysis
- Overall severity and zone breakdown
- Skin type, moisture, 2 key observations
- zone_scores: assess all 5 facial zones (forehead, left_cheek, right_cheek, nose, chin_jawline) using YOLO data + photo. Every zone must be present even if lesion_count is 0.
- skin_assessment: assess all 11 categories below from the photo and YOLO data. Score each 0–10 (lower = better condition). Mark exactly the 3 lowest scores as is_strength=true, exactly the 3 highest scores as is_strength=false. Label must be a friendly one-sentence plain-English description.

Categories: active_breakouts, comedones, dark_spots, redness, skin_texture, pore_visibility, skin_tone_evenness, oiliness, hydration, brightness, under_eye
```

- [ ] **Step 3: Pass zone counts to Gemini as context**

Find where `ultralyticsContext` is built (the string that summarises YOLO detections per angle). After that block, add zone-count context. Find the line that builds the user prompt and prepend this to `ultralyticsContext`:

```typescript
// Build per-zone counts from front detections for Gemini context
const frontZoneCounts: Record<string, number> = {};
for (const det of current.front) {
  const normY = ((det.bbox[1] + det.bbox[3]) / 2) / (req.image_dimensions?.front?.height ?? 1280);
  const zone = yToZone(normY);
  frontZoneCounts[zone] = (frontZoneCounts[zone] ?? 0) + 1;
}
const zoneCountContext = Object.entries(frontZoneCounts).length > 0
  ? '\n\nFront image zone counts (from YOLO): ' +
    Object.entries(frontZoneCounts).map(([z, c]) => `${z}: ${c}`).join(', ')
  : '';
```

Then append `zoneCountContext` to `ultralyticsContext`:

```typescript
const ultralyticsContext = buildUltralyticsContext(current, req) + zoneCountContext;
```

(Find the variable name used for the context string — it may be named differently. Add the zone count lines right before the userPrompt string is constructed.)

- [ ] **Step 4: Deploy edge function**

```bash
npx supabase functions deploy gemini-review-scan
```

Expected output: `Deployed Functions gemini-review-scan`

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/gemini-review-scan/index.ts
git commit -m "feat: add skin_assessment and zone_scores to Gemini prompt and schema"
```

---

## Task 3: Build FaceZoneSummary Component

**Files:**
- Create: `components/FaceZoneSummary.tsx`

- [ ] **Step 1: Create the component**

```typescript
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ZoneScore } from '@/lib/scan-types';
import { Fonts } from '@/lib/theme';

interface FaceZoneSummaryProps {
  zones: ZoneScore[];
}

const ZONE_LABELS: Record<string, string> = {
  forehead:     'Forehead',
  left_cheek:   'Left Cheek',
  right_cheek:  'Right Cheek',
  nose:         'Nose',
  chin_jawline: 'Chin & Jawline',
};

const SEVERITY_COLORS: Record<string, string> = {
  clear:    '#4ade80',
  mild:     '#facc15',
  moderate: '#fb923c',
  severe:   '#f87171',
};

const SEVERITY_BG: Record<string, string> = {
  clear:    'rgba(74,222,128,0.12)',
  mild:     'rgba(250,204,21,0.12)',
  moderate: 'rgba(251,146,60,0.12)',
  severe:   'rgba(248,113,113,0.12)',
};

export default function FaceZoneSummary({ zones }: FaceZoneSummaryProps) {
  if (!zones || zones.length === 0) return null;

  // Canonical order
  const order = ['forehead', 'left_cheek', 'right_cheek', 'nose', 'chin_jawline'];
  const sorted = order
    .map(z => zones.find(z2 => z2.zone === z))
    .filter((z): z is ZoneScore => z != null);

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>FACE ZONES</Text>
      {sorted.map(zone => {
        const color = SEVERITY_COLORS[zone.severity] ?? '#ffffff';
        const bg    = SEVERITY_BG[zone.severity]    ?? 'rgba(255,255,255,0.05)';
        return (
          <View key={zone.zone} style={[styles.row, { backgroundColor: bg }]}>
            <Text style={styles.zoneName}>{ZONE_LABELS[zone.zone] ?? zone.zone}</Text>
            <View style={styles.right}>
              {zone.lesion_count > 0 && (
                <Text style={styles.count}>{zone.lesion_count} spot{zone.lesion_count !== 1 ? 's' : ''}</Text>
              )}
              <View style={[styles.pill, { borderColor: color }]}>
                <Text style={[styles.pillText, { color }]}>
                  {zone.severity.charAt(0).toUpperCase() + zone.severity.slice(1)}
                </Text>
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    marginBottom: 28,
  },
  heading: {
    color: 'rgba(255,255,255,0.4)',
    fontFamily: Fonts.medium,
    fontSize: 11,
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 14,
    marginBottom: 6,
  },
  zoneName: {
    color: '#ffffff',
    fontFamily: Fonts.medium,
    fontSize: 14,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  count: {
    color: 'rgba(255,255,255,0.45)',
    fontFamily: Fonts.regular,
    fontSize: 12,
  },
  pill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 3,
    paddingHorizontal: 10,
  },
  pillText: {
    fontFamily: Fonts.medium,
    fontSize: 11,
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add components/FaceZoneSummary.tsx
git commit -m "feat: add FaceZoneSummary component"
```

---

## Task 4: Build SkinStrengthsWeaknesses Component

**Files:**
- Create: `components/SkinStrengthsWeaknesses.tsx`

- [ ] **Step 1: Create the component**

```typescript
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SkinAssessmentItem } from '@/lib/scan-types';
import { Fonts } from '@/lib/theme';

interface SkinStrengthsWeaknessesProps {
  assessment: SkinAssessmentItem[];
}

const CATEGORY_LABELS: Record<string, string> = {
  active_breakouts:  'Active Breakouts',
  comedones:         'Comedones',
  dark_spots:        'Dark Spots',
  redness:           'Redness',
  skin_texture:      'Skin Texture',
  pore_visibility:   'Pore Visibility',
  skin_tone_evenness:'Skin Tone Evenness',
  oiliness:          'Oiliness',
  hydration:         'Hydration',
  brightness:        'Brightness',
  under_eye:         'Under-Eye',
};

function AssessmentCard({ item, isStrength }: { item: SkinAssessmentItem; isStrength: boolean }) {
  const borderColor = isStrength ? 'rgba(74,222,128,0.25)'  : 'rgba(248,113,113,0.25)';
  const bg          = isStrength ? 'rgba(74,222,128,0.07)'  : 'rgba(248,113,113,0.07)';
  const titleColor  = '#ffffff';

  return (
    <View style={[styles.card, { borderColor, backgroundColor: bg }]}>
      <Text style={[styles.cardTitle, { color: titleColor }]}>
        {CATEGORY_LABELS[item.category] ?? item.category}
      </Text>
      <Text style={styles.cardLabel}>{item.label}</Text>
    </View>
  );
}

export default function SkinStrengthsWeaknesses({ assessment }: SkinStrengthsWeaknessesProps) {
  if (!assessment || assessment.length === 0) return null;

  const strengths  = assessment.filter(a => a.is_strength);
  const weaknesses = assessment.filter(a => !a.is_strength);

  return (
    <View style={styles.container}>
      {strengths.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionHeading}>✦ STRENGTHS</Text>
          {strengths.map((item, i) => (
            <AssessmentCard key={i} item={item} isStrength />
          ))}
        </View>
      )}
      {weaknesses.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionHeading, styles.weaknessHeading]}>✦ WEAKNESSES</Text>
          {weaknesses.map((item, i) => (
            <AssessmentCard key={i} item={item} isStrength={false} />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    marginBottom: 28,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeading: {
    color: '#4ade80',
    fontFamily: Fonts.medium,
    fontSize: 11,
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  weaknessHeading: {
    color: '#f87171',
  },
  card: {
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 11,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  cardTitle: {
    fontFamily: Fonts.semiBold,
    fontSize: 14,
    marginBottom: 3,
  },
  cardLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontFamily: Fonts.regular,
    fontSize: 12,
    lineHeight: 17,
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add components/SkinStrengthsWeaknesses.tsx
git commit -m "feat: add SkinStrengthsWeaknesses component"
```

---

## Task 5: Update GlowAnalysisDashboard

**Files:**
- Modify: `components/GlowAnalysisDashboard.tsx`

- [ ] **Step 1: Update props interface**

Replace the existing props interface in `GlowAnalysisDashboard.tsx`. Remove `snapshotItems`, `recommendations`, `onSnapshotPress`, `onRecommendationPress` and add the two new data props:

```typescript
interface GlowAnalysisDashboardProps {
  avatarUri: string;
  headline: string;
  description: string;
  mainConcern: string;
  severity: string;
  skinType: string;
  detections: Detection[];
  imageNativeWidth: number;
  imageNativeHeight: number;
  zoneScores?: ZoneScore[];
  skinAssessment?: SkinAssessmentItem[];
  onScanAgain: () => void;
  onStartPlan?: () => void;
  onViewFullScan?: () => void;
}
```

- [ ] **Step 2: Update imports**

At the top of `GlowAnalysisDashboard.tsx`, update the imports:

```typescript
import { Detection, ZoneScore, SkinAssessmentItem } from '@/lib/scan-types';
import FaceZoneSummary from './FaceZoneSummary';
import SkinStrengthsWeaknesses from './SkinStrengthsWeaknesses';
```

Remove any imports for snapshot/recommendation utilities that are no longer used.

- [ ] **Step 3: Replace the snapshot and recommendations sections in the render**

Find the `{/* YOUR SKIN SNAPSHOT */}` section and everything through the `{/* DO THIS TODAY */}` section (including both). Replace the entire block with:

```tsx
{/* Face Zone Summary */}
<FaceZoneSummary zones={zoneScores ?? []} />

{/* Strengths & Weaknesses */}
<SkinStrengthsWeaknesses assessment={skinAssessment ?? []} />
```

- [ ] **Step 4: Commit**

```bash
git add components/GlowAnalysisDashboard.tsx
git commit -m "feat: replace snapshot/recs with FaceZoneSummary and SkinStrengthsWeaknesses in dashboard"
```

---

## Task 6: Wire New Data into scan.tsx

**Files:**
- Modify: `app/(tabs)/scan.tsx`

- [ ] **Step 1: Pass new props to GlowAnalysisDashboard**

Find where `<GlowAnalysisDashboard` is rendered in `scan.tsx` (inside the `completedSession` block). Add the two new props:

```tsx
<GlowAnalysisDashboard
  {/* ...existing props... */}
  zoneScores={completedSession.zone_scores}
  skinAssessment={completedSession.skin_assessment}
  {/* ...existing callbacks... */}
/>
```

Remove the props that were removed from the interface: `snapshotItems`, `recommendations`, `onSnapshotPress`, `onRecommendationPress`.

- [ ] **Step 2: Remove deriveSnapshotItems call**

Find any call to `deriveSnapshotItems` in `scan.tsx` and remove it (along with the import if it's no longer used anywhere else in the file).

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors. If there are errors about removed props, fix them.

- [ ] **Step 4: Commit**

```bash
git add app/(tabs)/scan.tsx
git commit -m "feat: wire zone_scores and skin_assessment into GlowAnalysisDashboard"
```

---

## Task 7: Extend ScanSession Database Type

**Files:**
- Modify: `lib/scan-types.ts`

- [ ] **Step 1: Add new fields to ScanSession**

Find the `ScanSession` interface and add the two new optional columns:

```typescript
export interface ScanSession {
  // ...existing fields...
  skin_assessment?: SkinAssessmentItem[] | null;
  zone_scores?: ZoneScore[] | null;
}
```

- [ ] **Step 2: Check if Supabase stores these fields**

The edge function already stores the full Gemini response into the database. Check `supabase/functions/gemini-review-scan/index.ts` for the Supabase insert/update call (search for `.upsert(` or `.update(`). Confirm `skin_assessment` and `zone_scores` will be included in the stored JSON. If the response is stored as a flat row, you may need to add these as JSONB columns in a migration. If they are stored inside an existing JSONB column (e.g. `analysis_data`), no migration is needed.

- [ ] **Step 3: Commit**

```bash
git add lib/scan-types.ts
git commit -m "feat: add skin_assessment and zone_scores to ScanSession type"
```

---

## Task 8: Manual End-to-End Test

- [ ] **Step 1: Build and run on device**

```bash
npx expo run:ios --device
```

- [ ] **Step 2: Take a new scan**

Trigger a full scan. Verify in the Metro logs that:
- The Gemini response includes `skin_assessment` (array of 11 items)
- The Gemini response includes `zone_scores` (array of 5 zones)

- [ ] **Step 3: Verify UI**

On the analysis dashboard, confirm:
- The old Skin Snapshot grid is gone
- The old Recommendations section is gone
- Face Zone Summary renders with 5 zones, correct severity pills
- Strengths & Weaknesses shows up to 3 green cards and 3 red cards with friendly labels

- [ ] **Step 4: Verify graceful degradation**

If you have a cached session from before this change (no `skin_assessment`/`zone_scores`), load it and confirm neither component crashes — they should just render nothing (`return null`).
