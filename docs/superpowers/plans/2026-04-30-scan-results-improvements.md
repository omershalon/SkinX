# Scan Results Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 11 bugs and UX issues in `GlowAnalysisDashboard` — wiring up components that already exist, improving data display, and polishing visual details.

**Architecture:** All changes are confined to `components/GlowAnalysisDashboard.tsx` except Task 6 which imports `FaceZoneSummary` (already built at `components/FaceZoneSummary.tsx`). No new files needed. Changes are additive and non-breaking.

**Tech Stack:** React Native, Expo, react-native-svg, expo-linear-gradient, TypeScript

---

## File Map

| File | What changes |
|------|-------------|
| `components/GlowAnalysisDashboard.tsx` | All 11 changes live here |
| `components/FaceZoneSummary.tsx` | Read-only reference — imported in Task 6 |

---

### Task 1: Add `TrendDown` icon + fix worsening icon logic

The `deriveTrend` helper (line ~1066) sets `icon: 'flat'` for worsening, so a flat arrow displays when things get worse. There is no `TrendDown` SVG component. Add the icon and wire it up.

**Files:**
- Modify: `components/GlowAnalysisDashboard.tsx`

- [ ] **Step 1: Add `TrendDown` SVG component**

Add this immediately after the `TrendFlat` component (~line 116):

```tsx
const TrendDown = ({ size = 18, color = C.coral }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M3 7l6 6 4-4 8 8" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M14 17h7v-7" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);
```

- [ ] **Step 2: Update `deriveTrend` to return `'down'` for worsening**

Find `deriveTrend` (~line 1056). Change the worsening return:

```tsx
// Before:
if (delta > 1) return { label: 'Trend', value: 'Worsening', color: C.coral, icon: 'flat' as const };

// After:
if (delta > 1) return { label: 'Trend', value: 'Worsening', color: C.coral, icon: 'down' as const };
```

Also update the `icon` type annotation in the return types — the `deriveTrend` function has return types with `icon: 'up' | 'flat'`, extend to `'up' | 'flat' | 'down'`.

- [ ] **Step 3: Wire `TrendDown` in the stat row render**

Find the stat row render (~line 1378) where the trend icon is chosen:

```tsx
// Before:
icon={trend.icon === 'flat' ? <TrendFlat size={18} color={trend.color} /> : <TrendUp size={18} color={trend.color} />}

// After:
icon={
  trend.icon === 'down' ? <TrendDown size={18} color={trend.color} /> :
  trend.icon === 'flat' ? <TrendFlat size={18} color={trend.color} /> :
  <TrendUp size={18} color={trend.color} />
}
```

- [ ] **Step 4: Commit**

```bash
git add components/GlowAnalysisDashboard.tsx
git commit -m "fix: add TrendDown icon for worsening skin trend"
```

---

### Task 2: Fix breakout stat to show count + type

`deriveBreakouts` (line ~1046) shows only the acne type (e.g. "Papules") when spots > 0 and a type is known. Change it to show count + type (e.g. "5 Papules") so users get both pieces of information at a glance.

**Files:**
- Modify: `components/GlowAnalysisDashboard.tsx`

- [ ] **Step 1: Update `deriveBreakouts` value string**

Find `deriveBreakouts` (~line 1046). Change the middle return:

```tsx
// Before:
if (primaryAcneType) {
  const cap = primaryAcneType.charAt(0).toUpperCase() + primaryAcneType.slice(1);
  return { label: 'Breakouts', value: cap, color: n > 8 ? C.coral : C.amber };
}

// After:
if (primaryAcneType) {
  const cap = primaryAcneType.charAt(0).toUpperCase() + primaryAcneType.slice(1);
  return { label: 'Breakouts', value: `${n} ${cap}`, color: n > 8 ? C.coral : C.amber };
}
```

- [ ] **Step 2: Commit**

```bash
git add components/GlowAnalysisDashboard.tsx
git commit -m "fix: show spot count alongside acne type in breakout stat card"
```

---

### Task 3: Show `description` in hero card

The `description` prop is accepted by `GlowAnalysisDashboard` (line 63) but never passed to `HeroCard` or rendered. Show it as a body line beneath the headline.

**Files:**
- Modify: `components/GlowAnalysisDashboard.tsx`

- [ ] **Step 1: Add `description` to `HeroCard` props and render it**

Find the `HeroCard` function props interface (~line 283) and add `description`:

```tsx
// Before:
function HeroCard({
  avatarUri,
  eyebrow,
  headline,
  score,
  scoreLabel,
  accent,
  imageNativeWidth,
  imageNativeHeight,
}: {
  avatarUri: string;
  eyebrow: string;
  headline: string;
  score: number;
  scoreLabel: string;
  accent: { ring: string; ringSoft: string; halo: string };
  imageNativeWidth: number;
  imageNativeHeight: number;
})

// After:
function HeroCard({
  avatarUri,
  eyebrow,
  headline,
  description,
  score,
  scoreLabel,
  accent,
  imageNativeWidth,
  imageNativeHeight,
}: {
  avatarUri: string;
  eyebrow: string;
  headline: string;
  description?: string;
  score: number;
  scoreLabel: string;
  accent: { ring: string; ringSoft: string; halo: string };
  imageNativeWidth: number;
  imageNativeHeight: number;
})
```

- [ ] **Step 2: Render description below headline in the text column**

Find the text column inside `HeroCard` (~line 349). Add description after the headline `<Text>`:

```tsx
<Text style={heroStyles.headline}>{headlineNode}</Text>
{!!description && (
  <Text style={heroStyles.body} numberOfLines={3}>{description}</Text>
)}
```

The `heroStyles.body` style already exists (line ~459):
```ts
body: {
  fontFamily: Fonts.regular,
  fontSize: 11,
  lineHeight: 16,
  color: 'rgba(255,255,255,0.72)',
},
```

- [ ] **Step 3: Pass `description` from main component to `HeroCard`**

Find the `<HeroCard ...>` JSX in the main component render (~line 1347). Add the prop:

```tsx
<HeroCard
  avatarUri={avatarUri}
  eyebrow={eyebrow}
  headline={headline}
  description={description}   {/* add this line */}
  score={score}
  scoreLabel={accent.label}
  accent={accent}
  imageNativeWidth={imageNativeWidth}
  imageNativeHeight={imageNativeHeight}
/>
```

- [ ] **Step 4: Commit**

```bash
git add components/GlowAnalysisDashboard.tsx
git commit -m "feat: display AI description text in hero card"
```

---

### Task 4: Add "Areas to Work On" section (weaknesses)

Currently only `is_strength === true` items are shown. Add a new `SectionCard` below "Today's Highlights" that shows up to 3 weakness items from `skinAssessment`. If there are no weaknesses, the section is omitted.

**Files:**
- Modify: `components/GlowAnalysisDashboard.tsx`

- [ ] **Step 1: Add `deriveConcerns` helper**

Add this function immediately after `deriveHighlights` (~line 1121):

```tsx
function deriveConcerns(assessment: SkinAssessmentItem[] | undefined) {
  if (!assessment || assessment.length === 0) return [];

  const weaknesses = assessment.filter((a) => !a.is_strength).slice(0, 3);
  if (weaknesses.length === 0) return [];

  const map: Partial<Record<SkinAssessmentItem['category'], { icon: React.ReactNode; bg: string; border: string; title: string; desc: string }>> = {
    active_breakouts: { icon: <Shield size={20} color={C.coral} />, bg: C.coralBg, border: C.coralBorder, title: 'Active breakouts', desc: 'Inflamed spots detected in this scan.' },
    comedones:        { icon: <Shield size={20} color={C.amber} />, bg: C.amberBg, border: C.amberBorder, title: 'Clogged pores', desc: 'Blackheads or whiteheads present.' },
    dark_spots:       { icon: <Sun size={20} color={C.amber} />,    bg: C.amberBg, border: C.amberBorder, title: 'Dark spots', desc: 'Post-inflammatory pigmentation detected.' },
    redness:          { icon: <Droplet size={20} color={C.coral} />, bg: C.coralBg, border: C.coralBorder, title: 'Redness', desc: 'Visible inflammation or irritation.' },
    skin_texture:     { icon: <Droplet size={20} color={C.amber} />, bg: C.amberBg, border: C.amberBorder, title: 'Uneven texture', desc: 'Surface roughness or bumpiness detected.' },
    pore_visibility:  { icon: <Shield size={20} color={C.amber} />,  bg: C.amberBg, border: C.amberBorder, title: 'Visible pores', desc: 'Enlarged pores in one or more zones.' },
    skin_tone_evenness:{ icon: <Sun size={20} color={C.amber} />,   bg: C.amberBg, border: C.amberBorder, title: 'Uneven tone', desc: 'Color variation detected across zones.' },
    oiliness:         { icon: <Droplet size={20} color={C.amber} />, bg: C.amberBg, border: C.amberBorder, title: 'Excess oiliness', desc: 'Elevated sebum levels detected.' },
    hydration:        { icon: <Droplet size={20} color={C.coral} />, bg: C.coralBg, border: C.coralBorder, title: 'Low hydration', desc: 'Moisture barrier may need support.' },
    brightness:       { icon: <Sun size={20} color={C.amber} />,     bg: C.amberBg, border: C.amberBorder, title: 'Dull brightness', desc: 'Radiance appears lower than ideal.' },
    under_eye:        { icon: <Sun size={20} color={C.amber} />,     bg: C.amberBg, border: C.amberBorder, title: 'Under-eye fatigue', desc: 'Puffiness or shadows detected.' },
  };

  return weaknesses.map((s, i) => {
    const m = map[s.category];
    return {
      key: `concern-${s.category}-${i}`,
      icon: m?.icon ?? <Shield size={20} color={C.coral} />,
      iconBg: m?.bg ?? C.coralBg,
      iconBorder: m?.border ?? C.coralBorder,
      title: m?.title ?? s.label,
      desc: m?.desc ?? 'This area needs attention.',
    };
  });
}
```

- [ ] **Step 2: Add concern modal copy to `HIGHLIGHT_INFO`**

In the main component body (~line 1297), extend `HIGHLIGHT_INFO` to include concern titles:

```tsx
// Add these entries to HIGHLIGHT_INFO:
'Active breakouts':   { title: 'Active Breakouts', body: 'Inflamed spots are present. Avoid picking — bacteria spread and cause scarring. Benzoyl peroxide (2.5–5%) or salicylic acid applied directly to spots helps clear them without over-drying surrounding skin.' },
'Clogged pores':      { title: 'Clogged Pores', body: 'Blackheads and whiteheads form when sebum and dead cells block pores. A BHA (salicylic acid 1–2%) used 2–3× per week dissolves the buildup from inside. Avoid pore strips — they remove the plug but don\'t prevent new ones forming.' },
'Dark spots':         { title: 'Dark Spots', body: 'Post-inflammatory hyperpigmentation forms after inflammation triggers melanin overproduction. SPF 30+ daily is essential — UV darkens existing spots. Vitamin C, niacinamide, and azelaic acid all help fade them over 8–12 weeks.' },
'Redness':            { title: 'Redness', body: 'Visible inflammation can come from active breakouts, a compromised skin barrier, or external triggers (fragrance, heat, harsh products). Centella asiatica and niacinamide are proven calming actives. Avoid scrubs and alcohol-based toners.' },
'Uneven texture':     { title: 'Uneven Texture', body: 'Rough or bumpy surface texture is usually dead cell buildup or congestion. A gentle AHA (glycolic or lactic acid) 1–2× per week speeds cell turnover. Don\'t layer multiple actives — pick one exfoliant and use it consistently.' },
'Visible pores':      { title: 'Visible Pores', body: 'Pore size is largely genetic, but keeping them clear shrinks their appearance. Niacinamide (5–10%) tightens pore appearance over time. BHA keeps them clear. Clay masks once a week absorb excess oil that enlarges them.' },
'Uneven tone':        { title: 'Uneven Tone', body: 'Colour variation across zones can be from sun damage, acne marks, or inflammation. Daily SPF prevents further darkening. Vitamin C serum (L-ascorbic acid 10–20%) + niacinamide together address both brightness and tone over 8–12 weeks.' },
'Excess oiliness':    { title: 'Excess Oiliness', body: 'Over-production of sebum is often genetic but worsened by over-cleansing (strips the barrier → compensatory oil) or skipping moisturiser. A lightweight gel moisturiser + niacinamide regulates output without stripping.' },
'Low hydration':      { title: 'Low Hydration', body: 'A weakened moisture barrier lets water escape. Apply hyaluronic acid serum to damp skin (it needs water to work) then immediately seal with a moisturiser containing ceramides. Avoid long hot showers and alcohol-based products.' },
'Dull brightness':    { title: 'Dull Brightness', body: 'Dullness is usually dead cell buildup and poor circulation. Gentle AHA exfoliation (1–2×/week), vitamin C serum, and adequate sleep all contribute to radiance. Niacinamide also inhibits melanin transfer for a brightening effect.' },
'Under-eye fatigue':  { title: 'Under-Eye Fatigue', body: 'The under-eye skin is the thinnest on the face — it shows dehydration and fatigue fast. Caffeine eye cream reduces puffiness. Hyaluronic acid eye products plump fine lines. Sleep quality matters more than any product.' },
```

- [ ] **Step 3: Compute concerns and render the section**

In the main component body (~line 1266), add:

```tsx
const concerns = deriveConcerns(skinAssessment);
```

Then in the JSX, after the "Today's Highlights" `SectionCard` (~line 1401), add:

```tsx
{concerns.length > 0 && (
  <SectionCard>
    <SectionHead title="Areas to Work On" />
    {concerns.map((c, i) => (
      <HighlightRow
        key={c.key}
        icon={c.icon}
        iconBg={c.iconBg}
        iconBorder={c.iconBorder}
        title={c.title}
        desc={c.desc}
        last={i === concerns.length - 1}
        onPress={() => setModal(HIGHLIGHT_INFO[c.title] ?? { title: c.title, body: c.desc })}
      />
    ))}
  </SectionCard>
)}
```

- [ ] **Step 4: Commit**

```bash
git add components/GlowAnalysisDashboard.tsx
git commit -m "feat: add Areas to Work On section showing skin weaknesses"
```

---

### Task 5: Render `ProgressMiniChart` in the dashboard

`ProgressMiniChart` is defined in the file (~line 928) but never rendered. Add it inside a `SectionCard` after the product carousel.

**Files:**
- Modify: `components/GlowAnalysisDashboard.tsx`

- [ ] **Step 1: Add the trend history section to the JSX**

In the main component render, after the `carouselWrap` `<View>` (~line 1454) and before the CTA `ctaWrap`, insert:

```tsx
{scanHistory && scanHistory.length > 0 && (
  <SectionCard>
    <SectionHead
      title="Your Progress"
      badge={<Pill text={`${scanHistory.length} scan${scanHistory.length === 1 ? '' : 's'}`} tone="green" />}
    />
    <View style={{ marginTop: 4 }}>
      <ProgressMiniChart history={scanHistory} currentSessionId={currentSessionId} />
    </View>
    <Text style={progressStyles.caption}>
      Spot count over time — lower is better
    </Text>
  </SectionCard>
)}
```

- [ ] **Step 2: Add `progressStyles`**

Add this to the `StyleSheet.create` block at the bottom of the file (inside the existing `styles` object or as a standalone new one — add it as a standalone to keep it co-located with the feature):

```tsx
const progressStyles = StyleSheet.create({
  caption: {
    fontFamily: Fonts.regular,
    fontSize: 10.5,
    color: 'rgba(255,255,255,0.40)',
    textAlign: 'center',
    paddingBottom: 4,
  },
});
```

- [ ] **Step 3: Commit**

```bash
git add components/GlowAnalysisDashboard.tsx
git commit -m "feat: render scan history progress chart in results dashboard"
```

---

### Task 6: Render `FaceZoneSummary` in the dashboard

`zoneScores` is accepted as a prop (line 78) but never passed to the existing `FaceZoneSummary` component. Add an import and render it after the stat row.

**Files:**
- Modify: `components/GlowAnalysisDashboard.tsx`

`FaceZoneSummary` interface (from `components/FaceZoneSummary.tsx`):
```tsx
interface FaceZoneSummaryProps {
  zones: ZoneScore[];
}
```
It renders `null` when `zones` is empty, so no extra guard is needed in the dashboard.

- [ ] **Step 1: Import `FaceZoneSummary`**

At the top of `GlowAnalysisDashboard.tsx`, add the import after the existing component imports:

```tsx
import FaceZoneSummary from '@/components/FaceZoneSummary';
```

- [ ] **Step 2: Render `FaceZoneSummary` wrapped in a `SectionCard`**

After the `<View style={styles.statRow}>` block (~line 1386), insert:

```tsx
{zoneScores && zoneScores.length > 0 && (
  <SectionCard>
    <SectionHead title="Zone Breakdown" />
    <View style={{ marginTop: 6 }}>
      <FaceZoneSummary zones={zoneScores} />
    </View>
  </SectionCard>
)}
```

Note: `FaceZoneSummary` has its own internal `marginHorizontal: 20` and `marginBottom: 28` in its container styles. Override these to fit the `SectionCard` padding by passing a wrapper `View` with negative margin compensation, or simply accept the slight extra padding — the simpler approach is acceptable here.

- [ ] **Step 3: Commit**

```bash
git add components/GlowAnalysisDashboard.tsx
git commit -m "feat: render face zone breakdown in results dashboard"
```

---

### Task 7: Fix product carousel badge copy

The product list is a static global top-10 sorted by `match_percent`, identical for every user. The "For your skin" pill implies personalization that doesn't exist. Change it to "Top Picks" to be accurate.

**Files:**
- Modify: `components/GlowAnalysisDashboard.tsx`

- [ ] **Step 1: Update the carousel section header badge**

Find (~line 1443):

```tsx
<Pill text="For your skin" tone="green" />
```

Change to:

```tsx
<Pill text="Top Picks" tone="green" />
```

- [ ] **Step 2: Commit**

```bash
git add components/GlowAnalysisDashboard.tsx
git commit -m "fix: change product carousel badge from misleading 'For your skin' to 'Top Picks'"
```

---

### Task 8: Increase section header font size for legibility

`sectionStyles.headTitle` uses `fontSize: 10.5` with all-caps and wide letter-spacing. This is below comfortable reading threshold. Increase to 12px and reduce letter-spacing slightly.

**Files:**
- Modify: `components/GlowAnalysisDashboard.tsx`

- [ ] **Step 1: Update `headTitle` style**

Find `sectionStyles` (~line 833), specifically the `headTitle` entry:

```tsx
// Before:
headTitle: {
  fontFamily: Fonts.bold,
  fontSize: 10.5,
  lineHeight: 12,
  letterSpacing: 1.6,
  color: 'rgba(255,255,255,0.85)',
  textTransform: 'uppercase',
  marginLeft: 6,
},

// After:
headTitle: {
  fontFamily: Fonts.bold,
  fontSize: 12,
  lineHeight: 14,
  letterSpacing: 1.2,
  color: 'rgba(255,255,255,0.85)',
  textTransform: 'uppercase',
  marginLeft: 6,
},
```

- [ ] **Step 2: Commit**

```bash
git add components/GlowAnalysisDashboard.tsx
git commit -m "fix: increase section header font size for legibility"
```

---

### Task 9: Wire `onViewFullScan` button

The `onViewFullScan` prop is declared in the interface (line 77) but no button calls it. Add a secondary text button below the "Start My Plan" CTA.

**Files:**
- Modify: `components/GlowAnalysisDashboard.tsx`

- [ ] **Step 1: Add "View Full Scan" button**

Find the CTA section in the main render (~line 1469). After the "Take Another Scan" `TouchableOpacity`, add:

```tsx
{onViewFullScan && (
  <TouchableOpacity onPress={onViewFullScan} activeOpacity={0.7} style={styles.scanAgainBtn}>
    <Text style={styles.viewFullScanText}>View Full Scan Map</Text>
  </TouchableOpacity>
)}
```

- [ ] **Step 2: Add `viewFullScanText` style**

In the bottom `styles` `StyleSheet.create` block, add:

```tsx
viewFullScanText: {
  fontFamily: Fonts.semibold,
  fontSize: 13,
  color: 'rgba(255,255,255,0.45)',
},
```

- [ ] **Step 3: Commit**

```bash
git add components/GlowAnalysisDashboard.tsx
git commit -m "feat: wire onViewFullScan button in results dashboard"
```

---

### Task 10: Hero card layout — two-row redesign

The current single-row layout squishes avatar (100×128), text column, and score ring into one cramped row. Redesign `HeroCard` to a two-row layout:
- **Row 1:** Full-width face photo (170px tall, full card width, rounded top corners)
- **Row 2:** Score ring (left) + headline/eyebrow/description text (right)

This makes the face photo prominent (it's the product of the scan) and gives the score ring more breathing room.

**Files:**
- Modify: `components/GlowAnalysisDashboard.tsx`

- [ ] **Step 1: Replace `HeroCard` JSX layout**

Find the `HeroCard` function return (starting ~line 324). Replace the entire `return` block with:

```tsx
return (
  <View style={heroStyles.outer}>
    <View style={heroStyles.glow} />
    <View style={heroStyles.card}>
      <LinearGradient
        colors={['#2E0B6B', '#1C0655', '#160448']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[StyleSheet.absoluteFill, { borderRadius: 22 }]}
      />

      {/* Row 1: full-width photo */}
      <TouchableOpacity
        style={heroStyles.photoWrap}
        onPress={() => avatarUri && setAvatarExpanded(true)}
        activeOpacity={0.85}
      >
        {avatarUri ? (
          <Image source={{ uri: avatarUri }} style={heroStyles.photo} resizeMode="cover" />
        ) : (
          <View style={[heroStyles.photo, { backgroundColor: 'rgba(167,139,250,0.25)' }]} />
        )}
        {/* subtle expand hint */}
        <View style={heroStyles.expandHint}>
          <Text style={heroStyles.expandHintText}>Tap to expand</Text>
        </View>
      </TouchableOpacity>

      {/* Row 2: score ring + text */}
      <View style={heroStyles.bottomRow}>
        <View style={heroStyles.scoreCol}>
          <GlowScoreRing score={score} accent={accent} />
          <Text style={[heroStyles.scoreLabel, { color: accent.ring }]}>Glow Score</Text>
          <Text style={[heroStyles.scoreSub, { color: accent.ringSoft }]}>{scoreLabel}</Text>
        </View>
        <View style={heroStyles.textCol}>
          <View style={heroStyles.eyebrowRow}>
            <Sparkle size={11} color={C.violetSoft} />
            <Text style={heroStyles.eyebrow}>{eyebrow}</Text>
          </View>
          <Text style={heroStyles.headline}>{headlineNode}</Text>
          {!!description && (
            <Text style={heroStyles.body} numberOfLines={3}>{description}</Text>
          )}
        </View>
      </View>

      {/* full-screen avatar modal */}
      <Modal visible={avatarExpanded} transparent animationType="fade" onRequestClose={() => setAvatarExpanded(false)}>
        <Pressable style={heroStyles.avatarModalBg} onPress={() => setAvatarExpanded(false)}>
          <Image
            source={{ uri: avatarUri }}
            style={[heroStyles.avatarModalImg, { aspectRatio: imageNativeWidth / Math.max(imageNativeHeight, 1) }]}
            resizeMode="contain"
          />
        </Pressable>
      </Modal>
    </View>
  </View>
);
```

- [ ] **Step 2: Replace `heroStyles`**

Replace the entire `heroStyles` StyleSheet with:

```tsx
const heroStyles = StyleSheet.create({
  outer: {
    position: 'relative',
    marginBottom: 12,
  },
  glow: {
    position: 'absolute',
    top: -8,
    left: -8,
    right: -8,
    bottom: -8,
    borderRadius: 28,
    backgroundColor: 'rgba(124,92,252,0.12)',
    shadowColor: C.violet,
    shadowOpacity: 0.45,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  card: {
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: 'rgba(167,139,250,0.55)',
    overflow: 'hidden',
    shadowColor: C.violet,
    shadowOpacity: 0.45,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  photoWrap: {
    width: '100%',
    height: 170,
    position: 'relative',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  expandHint: {
    position: 'absolute',
    bottom: 8,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  expandHintText: {
    fontFamily: Fonts.regular,
    fontSize: 10,
    color: 'rgba(255,255,255,0.65)',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    paddingTop: 16,
    paddingBottom: 16,
  },
  textCol: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  eyebrow: {
    fontFamily: Fonts.medium,
    fontSize: 11,
    color: C.violetSoft,
    letterSpacing: 0.2,
    marginLeft: 4,
  },
  headline: {
    fontFamily: Fonts.bold,
    fontSize: 22,
    lineHeight: 25,
    color: C.text,
    letterSpacing: -0.6,
    marginBottom: 6,
  },
  body: {
    fontFamily: Fonts.regular,
    fontSize: 11,
    lineHeight: 16,
    color: 'rgba(255,255,255,0.72)',
  },
  scoreCol: {
    alignItems: 'center',
  },
  scoreLabel: {
    fontFamily: Fonts.semibold,
    fontSize: 11,
    lineHeight: 13,
    letterSpacing: 0.2,
    marginTop: 4,
  },
  scoreSub: {
    fontFamily: Fonts.semibold,
    fontSize: 11,
    lineHeight: 13,
  },
  avatarModalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarModalImg: {
    width: '90%',
    borderRadius: 18,
  },
});
```

Note: The old `avatarWrap` and `avatar` style keys are replaced by `photoWrap` and `photo`. The `spark` style is also removed since the sparkle decorations on the ring are still handled inside `GlowScoreRing` itself.

- [ ] **Step 3: Remove now-unused description prop pass from Task 3**

Since Task 10 now renders `description` inside `HeroCard`, and Task 3 already added the `description` prop to `HeroCard` — verify that the prop is still being passed from the main component's `<HeroCard ... description={description} ...>` call. No change needed if Task 3 was done first.

- [ ] **Step 4: Commit**

```bash
git add components/GlowAnalysisDashboard.tsx
git commit -m "feat: redesign hero card to two-row layout with full-width photo"
```

---

## Self-Review

### Spec coverage

| Improvement | Task |
|-------------|------|
| Wire ProgressMiniChart | Task 5 ✓ |
| Render FaceZoneSummary | Task 6 ✓ |
| Show description in hero | Task 3 ✓ (+ Task 10 integrates it) |
| Add "Areas to Work On" | Task 4 ✓ |
| Fix breakout count | Task 2 ✓ |
| Add TrendDown icon | Task 1 ✓ |
| Product carousel badge | Task 7 ✓ |
| Hero card layout rework | Task 10 ✓ |
| Section header font size | Task 8 ✓ |
| Wire onViewFullScan | Task 9 ✓ |
| Fix worsening icon | Task 1 ✓ (same task) |

All 11 issues covered.

### Dependency order

Tasks 3 and 10 both touch the `description` prop in `HeroCard`. Task 3 adds the prop + renders it in the old layout. Task 10 replaces the layout wholesale and also renders `description`. **Do Task 3 before Task 10**, or skip Task 3 and fold the description rendering into Task 10 directly. The plan orders them 3 → 10, which is correct.

### Type consistency

- `deriveTrend` returns `icon: 'up' | 'flat' | 'down'` after Task 1 — the stat row JSX ternary in Task 1 Step 3 handles all three values.
- `deriveConcerns` returns the same shape as `deriveHighlights`, used with `HighlightRow` — consistent.
- `FaceZoneSummary` accepts `zones: ZoneScore[]` — prop type matches `zoneScores?: ZoneScore[]`.
