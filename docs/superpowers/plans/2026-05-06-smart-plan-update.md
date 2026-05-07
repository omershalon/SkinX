# Smart Plan Update Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a user scans again and already has a plan, pass the existing plan to the edge function so Gemini can keep relevant items, add new ones for new conditions, and conservatively remove resolved ones — and update the post-scan CTA button text to "Update My Plan" vs "Start My Plan".

**Architecture:** Single edge function (`generate-plan`) gains an optional `existing_plan` field; when present, a CURRENT PLAN section is injected into the Gemini prompt switching it to merge mode. Three client files fetch the active plan before invoking the function and thread through a `hasPlan` boolean to the dashboard CTA.

**Tech Stack:** Deno edge function (Supabase), React Native (Expo), TypeScript, Supabase JS client, Gemini 2.5 Flash

---

### Task 1: Update `generate-plan` edge function — accept and inject existing plan

**Files:**
- Modify: `supabase/functions/generate-plan/index.ts`

- [ ] **Step 1: Accept `existing_plan` from request body**

In `supabase/functions/generate-plan/index.ts`, change the body parsing (currently line 28) from:

```ts
const { skin_profile_id } = await req.json();
```

to:

```ts
const { skin_profile_id, existing_plan } = await req.json();
```

`existing_plan` is `any[] | undefined` — no type import needed in Deno.

- [ ] **Step 2: Build the merge-mode prompt section**

After all the context sections are assembled (after line 129, before the `const prompt = ...` line), add:

```ts
const existingPlanContext = Array.isArray(existing_plan) && existing_plan.length > 0
  ? `═══ CURRENT PLAN (smart-merge mode) ═══\n${existing_plan.map((item: any, i: number) =>
      `${i + 1}. [${item.pillar}] ${item.title} — ${item.rationale}`
    ).join('\n')}`
  : '';
```

- [ ] **Step 3: Replace the task instruction block in the prompt**

The current prompt ends with this fixed task instruction block (lines 148–177):

```
═══ YOUR TASK ═══
Generate exactly 10 actionable recommendations ...
```

Replace the entire `═══ YOUR TASK ═══` block with a conditional that switches between merge mode and fresh generation:

```ts
const taskInstruction = existingPlanContext
  ? `${existingPlanContext}

═══ YOUR TASK ═══
You are updating this patient's existing plan based on their latest scan. Rules:
- KEEP items whose pillar/rationale still matches the current skin profile.
- ADD 1–2 new items if the latest scan reveals a condition not addressed in the current plan (e.g. a new acne type detected).
- REMOVE an item ONLY when you are certain its target condition is no longer present (acne type gone from scan, severity dropped to none). When in doubt, keep it.
- Output exactly 10 items total. All 4 pillars (product, diet, herbal, lifestyle) must remain present.
- All other format rules apply: "title" 1-3 words max, "rationale" ultra-short, "time_of_day" morning/midday/evening, "notes" array of exactly 3 personalised bullet strings, "impact_rank" 1=highest.

CRITICAL FORMAT RULES:
- "title": 1-3 words max
- "rationale": ultra-short action hint (e.g. "2 cups daily · anti-androgen")
- "time_of_day": assign based on what makes sense for this specific item — "morning", "midday", or "evening". Spread product picks intelligently across all three times. Do NOT put all products in morning.
- "notes": an array of exactly 3 bullet strings. Each bullet MUST (a) name the patient's exact skin type / acne type / severity from the profile above, (b) explain the biological or nutritional mechanism connecting this pick to THAT specific condition, (c) NEVER repeat or paraphrase the rationale field.

Return ONLY a JSON array. No markdown. No explanation. No backticks.
[{"pillar":"...","title":"...","rationale":"...","time_of_day":"morning","notes":["...","...","..."],"impact_rank":1}, ...10 items]

pillar values: product | diet | herbal | lifestyle
time_of_day values: morning | midday | evening
Exactly 10 items. 6-7 must be product pillar, spread across morning/midday/evening. impact_rank 1 = highest priority. notes field is REQUIRED and must be personalised to this patient's exact profile.`
  : `═══ YOUR TASK ═══
Generate exactly 10 actionable recommendations — always include 6-7 PRODUCT picks, 1-2 diet, 1 herbal, 1 lifestyle:

PRODUCT picks: Clean/natural skincare only. Recommend specific natural ingredients — tallow balm, rosehip oil (natural vitamin A), willow bark (natural BHA), tea tree oil, bakuchiol, manuka honey, niacinamide in clean formulations, zinc oxide mineral SPF. Favor brands like Santa Cruz Paleo, Cocokind, Herbivore, OSEA, Pai, Badger, Weleda, True Botanicals. Prioritize product picks — this is a skincare app and topical interventions are the most actionable for the patient.

DIET picks: Whole-food nutrition categories — be broad and category-level, NOT specific foods. Say "omega-3 rich foods" not "salmon". Say "fermented foods" not "sauerkraut". Say "antioxidant-rich berries" not "blueberries". Use nutrient/category framing: collagen-building foods, anti-inflammatory omega-3 sources, gut-healing fermented foods, antioxidant-rich produce, blood-sugar-stabilising whole grains. Recommend eliminating: dairy, refined sugar, seed oils, processed foods, whey protein. Keep it approachable and non-prescriptive about specific foods.

HERBAL picks: Traditional herbs with real evidence + specific dosages. Spearmint tea (anti-androgen, 2 cups/day), ashwagandha (cortisol reduction), neem (Ayurvedic purification), triphala (digestive cleanse), manjistha (blood purifying), burdock root (liver + skin), holy basil/tulsi (adaptogen), turmeric + black pepper (anti-inflammatory), dandelion root (liver detox).

LIFESTYLE picks: Natural practices — morning sunlight 10-20 min (circadian reset + vitamin D), grounding/earthing barefoot on grass, cold showers or ice rolling (reduces inflammation), gua sha facial massage (lymphatic drainage), silk/satin pillowcase (less friction), breathwork or meditation (cortisol management), exercise (sweating = detox), clean water (filtered, no fluoride).

CRITICAL FORMAT RULES:
- "title": 1-3 words max
- "rationale": ultra-short action hint (e.g. "2 cups daily · anti-androgen")
- "time_of_day": assign based on what makes sense for this specific item — "morning", "midday", or "evening". Spread product picks intelligently across all three times (e.g. morning cleanser + SPF, midday mist, evening serum + moisturiser). Do NOT put all products in morning.
- "notes": an array of exactly 3 bullet strings. Each bullet MUST (a) name the patient's exact skin type / acne type / severity from the profile above, (b) explain the biological or nutritional mechanism connecting this pick to THAT specific condition, (c) NEVER repeat or paraphrase the rationale field. Be precise, personal, and brief — each bullet is one short punchy sentence, no more than 15 words.

BAD notes (do NOT do this): ["Rosehip oil is great for your skin.", "It helps with acne.", "Use it nightly."] — too vague, repeats rationale, doesn't mention their specific condition.
GOOD notes: ["Your hormonal acne triggers excess sebum via androgens — rosehip's trans-retinoic acid directly normalises sebocyte output at the follicle.", "Unlike synthetic retinoids, it won't disrupt your combination skin barrier or trigger the inflammation that worsens your breakouts.", "The linoleic acid in rosehip also corrects the fatty-acid deficiency common in acne-prone skin."]

Example items:
{"pillar":"product","title":"Rosehip oil","rationale":"Natural vitamin A alt · nightly","notes":["Your hormonal acne triggers excess sebum via androgens — rosehip's trans-retinoic acid directly normalises sebocyte output at the follicle.","Unlike synthetic retinoids, it won't disrupt your combination skin barrier or trigger inflammation that worsens your breakouts.","The linoleic acid in rosehip corrects the fatty-acid deficiency that is consistently elevated in acne-prone skin."],"impact_rank":1}
{"pillar":"diet","title":"Bone broth","rationale":"1 cup daily · collagen + gut healing","notes":["Your inflammatory acne is linked to intestinal permeability — a leaky gut floods your bloodstream with endotoxins that spike skin inflammation.","Bone broth's glycine and glutamine tighten tight-junction proteins in the intestinal wall, cutting off this inflammatory trigger at source.","Collagen peptides also support your skin's own structural repair, reducing the scarring severity common with your acne type."],"impact_rank":2}

Return ONLY a JSON array. No markdown. No explanation. No backticks.
[{"pillar":"...","title":"...","rationale":"...","time_of_day":"morning","notes":["...","...","..."],"impact_rank":1}, ...10 items]

pillar values: product | diet | herbal | lifestyle
time_of_day values: morning | midday | evening
Exactly 10 items. 6-7 must be product pillar, spread across morning/midday/evening. impact_rank 1 = highest priority. notes field is REQUIRED and must be personalised to this patient's exact profile.`;
```

- [ ] **Step 4: Use `taskInstruction` in the prompt template**

In the `const prompt = \`...\`` string, find the line that starts with `═══ YOUR TASK ═══` and everything after it up to the closing backtick, and replace the entire `YOUR TASK` section with `${taskInstruction}`. The prompt template should end with:

```ts
${progressContext ? `═══ SKIN PROGRESS OVER TIME ═══\n${progressContext}\n` : ''}

${taskInstruction}`;
```

- [ ] **Step 5: Deploy and verify**

```bash
npx supabase functions deploy generate-plan --project-ref nkkqsiyeiqvxaojyythz
```

Expected output: `Deployed Functions on project nkkqsiyeiqvxaojyythz: generate-plan`

- [ ] **Step 6: Commit**

```bash
git add supabase/functions/generate-plan/index.ts
git commit -m "feat: generate-plan accepts existing_plan for smart merge mode"
```

---

### Task 2: Update `scan.tsx` — fetch active plan after scan, thread to dashboard

**Files:**
- Modify: `app/(tabs)/scan.tsx`

- [ ] **Step 1: Add `existingPlan` state**

In `app/(tabs)/scan.tsx`, after the `planGenerating` state declaration (around line 106), add:

```ts
const [existingPlan, setExistingPlan] = useState<import('@/lib/database.types').Database['public']['Tables']['personalized_plans']['Row'] | null>(null);
```

- [ ] **Step 2: Extract active plan fetch into a helper**

Add this helper function near the top of the component body (after state declarations):

```ts
const fetchActivePlan = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { data } = await supabase
    .from('personalized_plans')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  setExistingPlan(data ?? null);
};
```

- [ ] **Step 3: Call `fetchActivePlan` after scan completes**

In `startAnalysis`, after `setSkinProfileId(newSkinProfileId)` and the `loadScanHistory` block (around line 265–268), add:

```ts
fetchActivePlan();
```

- [ ] **Step 4: Call `fetchActivePlan` after session restore**

In the `useEffect` that handles `loadSessionId`/`loadTs` (around line 109–116), after `setCompletedSession(session)`, add:

```ts
if (session) {
  setCompletedSession(session);
  fetchActivePlan();
}
```

The existing `if (session) setCompletedSession(session);` becomes the block above.

- [ ] **Step 5: Pass `existing_plan` to the edge function in `handleStartPlan`**

In `handleStartPlan`, change the invoke call from:

```ts
const { error } = await supabase.functions.invoke('generate-plan', {
  body: { skin_profile_id: profileId },
});
```

to:

```ts
const body: Record<string, unknown> = { skin_profile_id: profileId };
if (existingPlan?.ranked_items) {
  body.existing_plan = existingPlan.ranked_items;
}
const { error } = await supabase.functions.invoke('generate-plan', { body });
```

- [ ] **Step 6: Pass `hasPlan` to `GlowAnalysisDashboard`**

In the JSX where `<GlowAnalysisDashboard` is rendered (around line 396), add the prop:

```tsx
hasPlan={existingPlan !== null}
```

- [ ] **Step 7: Reset `existingPlan` in `resetScan`**

In the `resetScan` function, add:

```ts
setExistingPlan(null);
```

- [ ] **Step 8: Commit**

```bash
git add app/(tabs)/scan.tsx
git commit -m "feat: fetch active plan after scan and pass to generate-plan for smart merge"
```

---

### Task 3: Update `GlowAnalysisDashboard.tsx` — add `hasPlan` prop, update CTA text

**Files:**
- Modify: `components/GlowAnalysisDashboard.tsx`

- [ ] **Step 1: Add `hasPlan` to the props interface**

Find the props interface (around line 78 where `onStartPlan?: () => void` is defined). Add:

```ts
hasPlan?: boolean;
```

- [ ] **Step 2: Destructure `hasPlan` in the component**

Find the component destructuring (around line 1414 where `onStartPlan` is destructured). Add `hasPlan` to the list:

```ts
hasPlan,
```

- [ ] **Step 3: Update CTA button text**

Find the CTA button text (line 1699):

```tsx
<Text style={styles.ctaText}>Start My Plan</Text>
```

Change to:

```tsx
<Text style={styles.ctaText}>{hasPlan ? 'Update My Plan' : 'Start My Plan'}</Text>
```

- [ ] **Step 4: Commit**

```bash
git add components/GlowAnalysisDashboard.tsx
git commit -m "feat: show 'Update My Plan' CTA when user already has an active plan"
```

---

### Task 4: Update `plan.tsx` — pass existing plan when regenerating from plan tab

**Files:**
- Modify: `app/(tabs)/plan.tsx`

- [ ] **Step 1: Update `generatePlan` to pass `existing_plan`**

In `app/(tabs)/plan.tsx`, find the `generatePlan` function (around line 510). The current invoke call is:

```ts
const { error } = await supabase.functions.invoke('generate-plan', { body: { skin_profile_id: skinProfile.id } });
```

Replace the entire `generatePlan` function body with:

```ts
const generatePlan = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { data: skinProfile } = await supabase.from('skin_profiles').select('id')
    .eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).single();
  if (!skinProfile) {
    Alert.alert(t('plan.scanRequired'), t('plan.completeScanFirst'), [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Scan Now', onPress: () => router.push('/(tabs)/scan') },
    ]);
    return;
  }
  setGenerating(true);
  setDoneToday(new Set());
  try {
    const body: Record<string, unknown> = { skin_profile_id: skinProfile.id };
    const currentItems = (plan?.ranked_items as unknown as import('@/lib/database.types').RankedItem[]) ?? [];
    if (currentItems.length > 0) {
      body.existing_plan = currentItems;
    }
    const { error } = await supabase.functions.invoke('generate-plan', { body });
    if (error) throw error;
    await fetchPlan();
  } catch (err) {
    console.error('generate-plan error:', err);
    Alert.alert('Error', 'Could not generate your plan. Please try again.');
  } finally {
    setGenerating(false);
  }
};
```

Note: `setPlan(null)` is removed — the old plan stays visible until the new one loads (avoids a blank flash during merge).

- [ ] **Step 2: Commit**

```bash
git add app/(tabs)/plan.tsx
git commit -m "feat: plan tab regenerate passes existing plan for smart merge"
```
