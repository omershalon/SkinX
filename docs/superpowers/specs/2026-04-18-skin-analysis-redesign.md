# Skin Analysis Dashboard Redesign

**Date:** 2026-04-18  
**Status:** Approved

## Overview

Replace the existing Skin Snapshot grid and Recommendations section in `GlowAnalysisDashboard` with two new sections: a **Strengths & Weaknesses** breakdown and a **Face Zone text summary**. The Acne Map hero stays unchanged.

## New Dashboard Order

1. Acne Map (existing — no changes)
2. Face Zone Summary (new — text only)
3. Strengths & Weaknesses (new)

The existing Skin Snapshot 2×2 grid and Recommendations cards are removed.

## Section 1: Face Zone Summary

A compact text-based breakdown of the 5 facial zones:

- Forehead
- Left cheek
- Right cheek
- Nose
- Chin / Jawline

Each zone shows: spot count + severity label (clear / mild / moderate / severe).  
Data comes from a new `zone_scores` field in the Gemini response.

## Section 2: Strengths & Weaknesses

Top 3 strengths and top 3 weaknesses drawn from 11 assessed skin categories. Each item shows a category name and a friendly one-line label (warm, plain English).

### The 11 categories

**Acne (from YOLO + Gemini):**
1. Active breakouts (papules, pustules, nodules)
2. Comedones (blackheads + whiteheads)
3. Dark spots (post-inflammatory hyperpigmentation)

**Skin quality (Gemini assesses from photo):**

4. Redness / inflammation
5. Skin texture & smoothness
6. Pore visibility
7. Skin tone evenness
8. Oiliness / shine
9. Hydration / dryness
10. Skin brightness / dullness
11. Under-eye area

Gemini scores each 0–10 (lower = better) and marks the top 3 as strengths and bottom 3 as weaknesses. Each gets a friendly `label` string it generates.

## Data Changes

### Gemini prompt additions

Add two new output fields to the Gemini response schema:

```typescript
skin_assessment: Array<{
  category: string        // one of the 11 slugs above
  label: string           // friendly one-liner, e.g. "Very few blackheads detected"
  score: number           // 0–10, lower = better condition
  is_strength: boolean    // true for top 3, false for bottom 3
}>

zone_scores: Array<{
  zone: string            // "forehead" | "left_cheek" | "right_cheek" | "nose" | "chin_jawline"
  lesion_count: number
  severity: string        // "clear" | "mild" | "moderate" | "severe"
  primary_types: string[] // e.g. ["papules", "dark spot"]
}>
```

Gemini receives: front image + YOLO detection data (counts per class, zone breakdown).  
Gemini assesses all 11 categories from both the photo and the detection data.

### TypeScript types

Extend `ScanSession` / review response types in `lib/scan-types.ts` with `skin_assessment` and `zone_scores`.

### Supabase edge function

Update `supabase/functions/gemini-review-scan/index.ts`:
- Add `skin_assessment` and `zone_scores` to the Gemini output schema and prompt instructions
- Pass existing YOLO zone counts as context so Gemini can assess acne categories accurately

## UI Components

### `FaceZoneSummary` (new component)

- Receives `zone_scores[]`
- Renders a simple list/row per zone with zone name, spot count, and a colored severity pill
- Severity pill colors: clear=green, mild=yellow, moderate=orange, severe=red

### `SkinStrengthsWeaknesses` (new component)

- Receives `skin_assessment[]` (already filtered to is_strength=true/false)
- Two stacked lists: Strengths (green tint cards) and Weaknesses (red tint cards)
- Each card: category name (bold) + label text below
- Friendly tone, no scores shown to user

### `GlowAnalysisDashboard` changes

- Remove `SnapshotGrid` and `RecommendationCards` rendering
- Add `FaceZoneSummary` and `SkinStrengthsWeaknesses` in their place
- Remove unused imports/props

## Error Handling

- If `skin_assessment` or `zone_scores` are missing from Gemini response (e.g. cached old session), render nothing for those sections rather than crashing.
- If fewer than 3 strengths/weaknesses returned, show however many exist.

## Out of Scope

- Face zone diagram / heat map visual (deferred)
- Recommendations section (removed)
- Skin plan (removed)
