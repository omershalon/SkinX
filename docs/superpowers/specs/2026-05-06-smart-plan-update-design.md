# Smart Plan Update Design

**Date:** 2026-05-06  
**Status:** Approved

## Overview

When a user scans again and already has an active plan, the plan should be intelligently updated — keeping items that are still relevant, adding items for newly detected conditions, and conservatively removing items for conditions that are clearly resolved. The post-scan button text changes to reflect whether a plan already exists.

## Edge Function — `generate-plan`

### Request body change

Add an optional field:

```ts
{
  skin_profile_id: string;       // required (existing)
  existing_plan?: RankedItem[];  // optional — the ranked_items from the active plan
}
```

### Prompt change

When `existing_plan` is provided, inject a `CURRENT PLAN` section into the Gemini prompt listing each item's `title`, `pillar`, and `rationale`. Replace the current generation instruction block with:

```
═══ CURRENT PLAN (smart-merge mode) ═══
<list of existing items>

═══ YOUR TASK ═══
You are updating this patient's existing plan based on their latest scan. Rules:
- KEEP items whose pillar/rationale still matches the current skin profile.
- ADD 1–2 new items if the latest scan reveals a condition not addressed in the current plan (e.g. a new acne type detected).
- REMOVE an item ONLY when you are certain its target condition is no longer present (acne type gone from scan, severity dropped to none). When in doubt, keep it.
- Output exactly 10 items total. All 4 pillars (product, diet, herbal, lifestyle) must remain present.
- All other format rules (title, rationale, time_of_day, notes, impact_rank) remain unchanged.
```

When `existing_plan` is absent (first-time generation), the prompt is unchanged.

### No schema changes

`ranked_items` is already JSONB. The response shape is identical in both modes.

## Client — `scan.tsx`

### New state

Add `existingPlan: PersonalizedPlan | null` state (initially `null`). This is fetched once — right after the scan pipeline completes and `setCompletedSession` is called — so the button label is correct the moment the results screen appears. Also set it when restoring a session via `loadSessionId` (the `useEffect` that handles `loadTs`).

### After scan completes (`startAnalysis`)

After `setCompletedSession(session)`, query `personalized_plans` for `is_active = true` ordered by `created_at desc limit 1` and call `setExistingPlan(data ?? null)`.

### After session restore (`useEffect` on `loadTs`)

Same query, called after `setCompletedSession(session)`.

### `handleStartPlan`

1. Use `existingPlan?.ranked_items` as `existing_plan` in the invoke body (omit the field if `null`).
2. No extra fetch needed at press time — the plan was already fetched when results loaded.

Pass `hasPlan={existingPlan !== null}` to `GlowAnalysisDashboard`.

The loading overlay, error handling, and navigation to `/(tabs)/plan` are unchanged.

## Client — `GlowAnalysisDashboard.tsx`

- Add `hasPlan?: boolean` prop.
- CTA button text: `hasPlan ? "Update My Plan" : "Start My Plan"`.
- No other changes.

## Client — `plan.tsx`

### `generatePlan`

Update to fetch `ranked_items` from the current active plan before invoking `generate-plan`, and pass them as `existing_plan`. This means a manual refresh from the plan tab also does a smart merge rather than wiping the plan.

## Error handling

- If `existing_plan` is malformed or Gemini ignores it, the fallback is the existing behaviour (a fresh 10-item plan is still returned). No new error paths needed.
- Conservative removal is enforced purely via prompt instruction — no code-level diff validation required.

## Out of scope

- Showing the user a diff of what changed ("2 items updated, 1 removed").
- Pinning specific items so they are never removed.
- A separate `update-plan` edge function.
