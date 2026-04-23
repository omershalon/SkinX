# Plan Tab — Daily Missions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the boring checklist Plan tab with a gamified Daily Missions grid featuring XP, levels, streaks, pillar filter tabs, and a 2-column card grid.

**Architecture:** Single-file rewrite of `app/(tabs)/plan.tsx`. All gamification state (XP, level, streak, daily done-set) lives in `AsyncStorage`. No new components or edge functions needed — reuses `PickDetailModal` and existing pillar SVG icons.

**Tech Stack:** React Native `Animated`, `AsyncStorage`, `expo-haptics`, `react-native-svg`, existing `supabase` client, existing `PickDetailModal` component.

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `app/(tabs)/plan.tsx` | **Full rewrite** | All UI, XP/level/streak logic, animations, AsyncStorage persistence |

---

### Task 1: AsyncStorage helpers — gamification state

**Files:**
- Modify: `app/(tabs)/plan.tsx`

These helpers read and write all persisted gamification state. Write them first so every other task can import them.

- [ ] **Step 1: Define storage key constants and types at the top of plan.tsx**

Replace the existing file content from the top through the `PlanScreen` function signature with the following (keep all existing icon components and `PILLAR_ICONS` / `PILLAR_LABELS` / `PILLAR_ORDER` / `ACNE_LABELS` constants intact):

```typescript
// ── Storage keys ──────────────────────────────────────────────────────────
const MISSIONS_KEY   = 'missions_v1';      // { date, doneRanks: number[] }
const XP_KEY         = 'xp_v1';           // { level: number, totalXp: number }
const STREAK_KEY     = 'streak_v1';       // { count: number, lastDate: string }

// ── XP per pillar ─────────────────────────────────────────────────────────
const PILLAR_XP: Record<string, number> = {
  lifestyle: 60,
  herbal:    50,
  product:   40,  // 'product' pillar = Skincare
  diet:      30,
};
const XP_PER_LEVEL = 500;

// ── Pillar filter tabs ─────────────────────────────────────────────────────
const FILTER_TABS = [
  { key: 'all',       label: 'ALL' },
  { key: 'product',   label: 'SKIN' },
  { key: 'diet',      label: 'DIET' },
  { key: 'herbal',    label: 'HERBAL' },
  { key: 'lifestyle', label: 'LIFE' },
] as const;
type FilterKey = typeof FILTER_TABS[number]['key'];
```

- [ ] **Step 2: Add loadMissionsState helper**

```typescript
async function loadMissionsState(): Promise<{ doneRanks: Set<number> }> {
  try {
    const raw = await AsyncStorage.getItem(MISSIONS_KEY);
    if (raw) {
      const { date, doneRanks } = JSON.parse(raw);
      if (date === new Date().toDateString()) {
        return { doneRanks: new Set(doneRanks as number[]) };
      }
    }
  } catch {}
  return { doneRanks: new Set() };
}

async function saveMissionsState(doneRanks: Set<number>): Promise<void> {
  try {
    await AsyncStorage.setItem(MISSIONS_KEY, JSON.stringify({
      date:      new Date().toDateString(),
      doneRanks: Array.from(doneRanks),
    }));
  } catch {}
}
```

- [ ] **Step 3: Add loadXpState and saveXpState helpers**

```typescript
interface XpState { level: number; totalXp: number; }

async function loadXpState(): Promise<XpState> {
  try {
    const raw = await AsyncStorage.getItem(XP_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { level: 1, totalXp: 0 };
}

async function saveXpState(state: XpState): Promise<void> {
  try {
    await AsyncStorage.setItem(XP_KEY, JSON.stringify(state));
  } catch {}
}
```

- [ ] **Step 4: Add loadStreakState and saveStreakState helpers**

```typescript
interface StreakState { count: number; lastDate: string }

async function loadStreakState(): Promise<StreakState> {
  try {
    const raw = await AsyncStorage.getItem(STREAK_KEY);
    if (raw) {
      const parsed: StreakState = JSON.parse(raw);
      const today     = new Date().toDateString();
      const yesterday = new Date(Date.now() - 86400000).toDateString();
      // Break streak if last completed date is older than yesterday
      if (parsed.lastDate !== today && parsed.lastDate !== yesterday) {
        return { count: 0, lastDate: '' };
      }
      return parsed;
    }
  } catch {}
  return { count: 0, lastDate: '' };
}

async function saveStreakState(state: StreakState): Promise<void> {
  try {
    await AsyncStorage.setItem(STREAK_KEY, JSON.stringify(state));
  } catch {}
}
```

- [ ] **Step 5: Commit**

```bash
git add app/(tabs)/plan.tsx
git commit -m "feat(plan): add gamification AsyncStorage helpers"
```

---

### Task 2: State wiring — load gamification state on focus

**Files:**
- Modify: `app/(tabs)/plan.tsx`

- [ ] **Step 1: Add gamification state variables inside `PlanScreen`**

Inside the `PlanScreen` function, after the existing state declarations, add:

```typescript
const [doneToday,    setDoneToday]    = useState<Set<number>>(new Set());
const [xpState,      setXpState]      = useState<XpState>({ level: 1, totalXp: 0 });
const [streak,       setStreak]       = useState<StreakState>({ count: 0, lastDate: '' });
const [activeFilter, setActiveFilter] = useState<FilterKey>('all');
const [allDone,      setAllDone]      = useState(false);
```

- [ ] **Step 2: Compute derived values after state declarations**

```typescript
const rankedItems: RankedItem[] = (plan?.ranked_items as unknown as RankedItem[]) ?? [];

// Sort by impact_rank ascending (rank 1 = highest impact, shown first)
const sortedItems = [...rankedItems].sort((a, b) => a.impact_rank - b.impact_rank);

const filteredItems = activeFilter === 'all'
  ? sortedItems
  : sortedItems.filter(item => item.pillar === activeFilter);

const totalItems   = rankedItems.length;
const doneCount    = rankedItems.filter(i => doneToday.has(i.impact_rank)).length;
const xpToday      = rankedItems
  .filter(i => doneToday.has(i.impact_rank))
  .reduce((sum, i) => sum + (PILLAR_XP[i.pillar] ?? 40), 0);
const xpInLevel    = xpState.totalXp % XP_PER_LEVEL;
const xpProgress   = xpInLevel / XP_PER_LEVEL; // 0–1
```

- [ ] **Step 3: Load all gamification state in `useFocusEffect`**

Replace the existing `useFocusEffect` with:

```typescript
useFocusEffect(
  useCallback(() => {
    fetchPlan();
    Promise.all([
      loadMissionsState(),
      loadXpState(),
      loadStreakState(),
    ]).then(([missions, xp, str]) => {
      setDoneToday(missions.doneRanks);
      setXpState(xp);
      setStreak(str);
    });
  }, [fetchPlan])
);
```

- [ ] **Step 4: Remove old `loadChecklist` / `saveChecklist` calls and state**

Delete:
- `const [doneToday, setDoneToday]` (the old one, now replaced above)
- `const CHECKLIST_KEY` constant
- `loadChecklist` function
- `saveChecklist` function
- The old `useFocusEffect` that called both `fetchPlan()` and `loadChecklist()`

- [ ] **Step 5: Commit**

```bash
git add app/(tabs)/plan.tsx
git commit -m "feat(plan): wire gamification state loading on focus"
```

---

### Task 3: Toggle mission done — XP and streak logic

**Files:**
- Modify: `app/(tabs)/plan.tsx`

- [ ] **Step 1: Add animation refs for XP bar and streak pill**

Inside `PlanScreen`, after the existing `useRef` declarations:

```typescript
const xpBarAnim     = useRef(new Animated.Value(xpProgress)).current;
const streakScaleAnim = useRef(new Animated.Value(1)).current;
```

- [ ] **Step 2: Sync xpBarAnim when xpState changes**

```typescript
useEffect(() => {
  Animated.timing(xpBarAnim, {
    toValue:         (xpState.totalXp % XP_PER_LEVEL) / XP_PER_LEVEL,
    duration:        600,
    useNativeDriver: false, // width animation requires false
  }).start();
}, [xpState.totalXp]);
```

- [ ] **Step 3: Write `toggleMission` handler**

```typescript
const toggleMission = async (item: RankedItem) => {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

  const wasDone  = doneToday.has(item.impact_rank);
  const xpDelta  = PILLAR_XP[item.pillar] ?? 40;

  // Update done set
  const nextDone = new Set(doneToday);
  if (wasDone) nextDone.delete(item.impact_rank); else nextDone.add(item.impact_rank);
  setDoneToday(nextDone);
  saveMissionsState(nextDone);

  // Update XP
  const newTotalXp = Math.max(0, xpState.totalXp + (wasDone ? -xpDelta : xpDelta));
  const oldLevel   = Math.floor(xpState.totalXp / XP_PER_LEVEL) + 1;
  const newLevel   = Math.floor(newTotalXp      / XP_PER_LEVEL) + 1;
  const didLevelUp = newLevel > oldLevel && !wasDone;
  const nextXp: XpState = { level: newLevel, totalXp: newTotalXp };
  setXpState(nextXp);
  saveXpState(nextXp);

  if (didLevelUp) {
    // Fill bar to 100%, pause, then reset to 0
    Animated.sequence([
      Animated.timing(xpBarAnim, { toValue: 1, duration: 400, useNativeDriver: false }),
      Animated.delay(300),
      Animated.timing(xpBarAnim, { toValue: 0, duration: 200, useNativeDriver: false }),
    ]).start();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  // Check all-done
  const nowAllDone = rankedItems.length > 0 &&
    rankedItems.every(i => nextDone.has(i.impact_rank));

  if (nowAllDone && !wasDone) {
    // Update streak
    const today = new Date().toDateString();
    const newStreak: StreakState = { count: streak.count + 1, lastDate: today };
    setStreak(newStreak);
    saveStreakState(newStreak);

    // Pulse streak pill
    Animated.sequence([
      Animated.spring(streakScaleAnim, { toValue: 1.2, useNativeDriver: true, speed: 50, bounciness: 6 }),
      Animated.spring(streakScaleAnim, { toValue: 1,   useNativeDriver: true, speed: 30, bounciness: 4 }),
    ]).start();

    setAllDone(true);
    triggerConfetti();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } else if (!nowAllDone) {
    setAllDone(false);
  }
};
```

- [ ] **Step 4: Commit**

```bash
git add app/(tabs)/plan.tsx
git commit -m "feat(plan): add toggleMission with XP and streak logic"
```

---

### Task 4: Mission card component

**Files:**
- Modify: `app/(tabs)/plan.tsx`

- [ ] **Step 1: Write the `MissionCard` sub-component** (above `PlanScreen`):

```typescript
interface MissionCardProps {
  item:      RankedItem;
  done:      boolean;
  onToggle:  () => void;
  onPress:   () => void;
}

function MissionCard({ item, done, onToggle, onPress }: MissionCardProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const xp        = PILLAR_XP[item.pillar] ?? 40;
  const Icon      = PILLAR_ICONS[item.pillar];

  const handlePressIn  = () => Animated.spring(scaleAnim, { toValue: 0.95, useNativeDriver: true, speed: 50, bounciness: 0 }).start();
  const handlePressOut = () => Animated.spring(scaleAnim, { toValue: 1,    useNativeDriver: true, speed: 30, bounciness: 5 }).start();

  const handlePress = () => {
    onToggle();
    onPress();
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
        style={[cardStyles.card, done && cardStyles.cardDone]}
      >
        {/* Icon block */}
        <View style={[cardStyles.iconWrap, done && cardStyles.iconWrapDone]}>
          {Icon
            ? <Icon size={18} color={done ? Colors.primaryLight : Colors.textMuted} />
            : <View style={{ width: 18, height: 18, backgroundColor: Colors.border, borderRadius: 4 }} />
          }
        </View>

        {/* Pillar label */}
        <Text style={cardStyles.pillarLabel}>
          {PILLAR_LABELS[item.pillar] ?? item.pillar.toUpperCase()}
        </Text>

        {/* Title */}
        <Text
          style={[cardStyles.title, done && cardStyles.titleDone]}
          numberOfLines={2}
        >
          {item.title}
        </Text>

        {/* XP */}
        <Text style={[cardStyles.xp, done && cardStyles.xpDone]}>
          +{xp} XP
        </Text>

        {/* Checkmark badge */}
        {done && (
          <View style={cardStyles.checkBadge}>
            <Svg width={12} height={12} viewBox="0 0 12 12">
              <Path
                d="M2 6l3 3 5-5"
                stroke="#FFFFFF"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </Svg>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderWidth:     1,
    borderColor:     Colors.border,
    borderRadius:    16,
    padding:         12,
    gap:             4,
  },
  cardDone: {
    backgroundColor: 'rgba(124,92,252,0.12)',
    borderColor:     'rgba(124,92,252,0.45)',
  },
  iconWrap: {
    width:           32,
    height:          32,
    borderRadius:    10,
    backgroundColor: 'rgba(255,255,255,0.07)',
    alignItems:      'center',
    justifyContent:  'center',
    marginBottom:    4,
  },
  iconWrapDone: {
    backgroundColor: 'rgba(124,92,252,0.25)',
  },
  pillarLabel: {
    fontSize:        8,
    fontWeight:      '700',
    color:           Colors.textMuted,
    letterSpacing:   0.8,
    textTransform:   'uppercase',
  },
  title: {
    fontSize:   11,
    fontWeight: '600',
    color:      Colors.text,
    lineHeight: 15,
  },
  titleDone: {
    textDecorationLine: 'line-through',
    color:              Colors.textMuted,
  },
  xp: {
    fontSize:   9,
    fontWeight: '600',
    color:      Colors.textMuted,
    marginTop:  2,
  },
  xpDone: {
    color: Colors.primaryLight,
  },
  checkBadge: {
    position:        'absolute',
    top:             10,
    right:           10,
    width:           20,
    height:          20,
    borderRadius:    10,
    backgroundColor: Colors.primary,
    alignItems:      'center',
    justifyContent:  'center',
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add app/(tabs)/plan.tsx
git commit -m "feat(plan): add MissionCard component"
```

---

### Task 5: Rewrite the main UI render

**Files:**
- Modify: `app/(tabs)/plan.tsx`

Replace the entire `return` block of `PlanScreen` (the `/* ── main UI ── */` section) with the following. Keep the loading and empty states unchanged.

- [ ] **Step 1: Replace the main return block**

```tsx
return (
  <Animated.View style={[styles.container, { paddingTop: insets.top }, animatedStyle]}>
    <ScreenBackground preset="plan" />

    {/* ── Header ── */}
    <View style={styles.header}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.eyebrow}>YOUR PLAN</Text>
          <Text style={styles.title}>Daily Missions</Text>
        </View>

        {/* Streak pill */}
        <Animated.View style={{ transform: [{ scale: streakScaleAnim }] }}>
          <LinearGradient
            colors={[Colors.primary, Colors.primaryLight]}
            style={styles.streakPill}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.streakNumber}>{streak.count}</Text>
            <Text style={styles.streakLabel}>DAY STREAK</Text>
          </LinearGradient>
        </Animated.View>
      </View>

      {/* XP bar */}
      <View style={styles.xpRow}>
        <Text style={styles.levelLabel}>LV {xpState.level}</Text>
        <View style={styles.xpBarTrack}>
          <Animated.View
            style={[
              styles.xpBarFill,
              {
                width: xpBarAnim.interpolate({
                  inputRange:  [0, 1],
                  outputRange: ['0%', '100%'],
                }),
              },
            ]}
          />
        </View>
        <Text style={styles.xpText}>
          {xpToday} / {XP_PER_LEVEL} XP
        </Text>
      </View>
    </View>

    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Pillar filter tabs ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabsContent}
        style={styles.tabs}
      >
        {FILTER_TABS.map(tab => (
          <TouchableOpacity
            key={tab.key}
            onPress={() => setActiveFilter(tab.key)}
            style={[styles.tab, activeFilter === tab.key && styles.tabActive]}
            activeOpacity={0.75}
          >
            <Text style={[styles.tabLabel, activeFilter === tab.key && styles.tabLabelActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* ── All-done banner ── */}
      {allDone && (
        <View style={styles.allDoneBanner}>
          <Text style={styles.allDoneTitle}>All missions complete</Text>
          <Text style={styles.allDoneSub}>
            You earned {xpToday} XP today. Come back tomorrow to keep your streak.
          </Text>
        </View>
      )}

      {/* ── Mission grid ── */}
      <View style={styles.grid}>
        {filteredItems.map(item => (
          <View key={item.impact_rank} style={styles.gridCell}>
            <MissionCard
              item={item}
              done={doneToday.has(item.impact_rank)}
              onToggle={() => toggleMission(item)}
              onPress={() => setSelectedPick(item)}
            />
          </View>
        ))}
      </View>

      {/* ── Footer summary ── */}
      <Text style={styles.footerText}>
        {doneCount} of {totalItems} complete · {xpToday} XP earned today
      </Text>

      {/* ── Regenerate ── */}
      <TouchableOpacity style={styles.regenRow} onPress={generatePlan} disabled={generating}>
        <Text style={styles.regenText}>
          {generating ? t('plan.generating') : t('plan.regenerate')}
        </Text>
      </TouchableOpacity>
    </ScrollView>

    {/* ── Confetti ── */}
    {showConfetti && (
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {confettiAnims.map((c, i) => (
          <Animated.View key={i} style={{
            position: 'absolute', left: c.x, top: -20,
            width: c.size, height: c.size * 0.6,
            backgroundColor: c.color, borderRadius: 2,
            transform: [
              { translateY: c.anim.interpolate({ inputRange: [0, 1], outputRange: [0, Dimensions.get('window').height + 50] }) },
              { translateX: c.anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, c.drift, c.drift * 1.2] }) },
              { rotate: c.anim.interpolate({ inputRange: [0, 1], outputRange: [`${c.rotation}deg`, `${c.rotation + 720}deg`] }) },
            ],
            opacity: c.anim.interpolate({ inputRange: [0, 0.8, 1], outputRange: [1, 1, 0] }),
          }} />
        ))}
      </View>
    )}

    {/* ── Pick detail modal ── */}
    <PickDetailModal
      visible={!!selectedPick}
      pick={selectedPick}
      onClose={() => setSelectedPick(null)}
      onToggleRoutine={() => {}}
      isInRoutine={false}
    />
  </Animated.View>
);
```

- [ ] **Step 2: Replace the `styles` StyleSheet**

Delete the existing `const styles = StyleSheet.create({...})` block and replace with:

```typescript
const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: Colors.background },
  centered:     { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: Spacing.xxl, gap: Spacing.lg, paddingBottom: 80 },

  // Header
  header:       { paddingHorizontal: Spacing.xl, paddingTop: Spacing.lg, paddingBottom: Spacing.md, gap: 12 },
  headerRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  eyebrow:      { fontSize: 10, fontWeight: '600', color: Colors.textMuted, letterSpacing: 1.5, textTransform: 'uppercase' },
  title:        { fontSize: 26, fontWeight: '800', color: Colors.text, letterSpacing: -0.5, marginTop: 2 },

  // Streak pill
  streakPill:   { borderRadius: 14, paddingVertical: 8, paddingHorizontal: 14, alignItems: 'center', minWidth: 64 },
  streakNumber: { fontSize: 22, fontWeight: '900', color: Colors.white, lineHeight: 24 },
  streakLabel:  { fontSize: 8, fontWeight: '700', color: 'rgba(255,255,255,0.85)', letterSpacing: 1.2, marginTop: 1 },

  // XP bar
  xpRow:        { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: Colors.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  levelLabel:   { fontSize: 10, fontWeight: '900', color: Colors.primaryLight, letterSpacing: 0.8, minWidth: 28 },
  xpBarTrack:   { flex: 1, height: 5, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 4, overflow: 'hidden' },
  xpBarFill:    { height: '100%', backgroundColor: Colors.primary, borderRadius: 4 },
  xpText:       { fontSize: 10, color: Colors.textMuted, minWidth: 70, textAlign: 'right' },

  // Tabs
  tabs:         { marginBottom: 12 },
  tabsContent:  { paddingHorizontal: Spacing.xl, gap: 6, flexDirection: 'row' },
  tab:          { borderRadius: 20, paddingVertical: 5, paddingHorizontal: 12, backgroundColor: 'rgba(255,255,255,0.06)' },
  tabActive:    { backgroundColor: Colors.primary },
  tabLabel:     { fontSize: 9, fontWeight: '700', color: Colors.textMuted, letterSpacing: 0.8 },
  tabLabelActive: { color: Colors.white },

  // All-done banner
  allDoneBanner: { marginHorizontal: Spacing.xl, marginBottom: 12, backgroundColor: 'rgba(124,92,252,0.14)', borderWidth: 1.5, borderColor: 'rgba(124,92,252,0.4)', borderRadius: 16, padding: 16, gap: 4 },
  allDoneTitle:  { fontSize: 15, fontWeight: '800', color: Colors.white },
  allDoneSub:    { fontSize: 11, color: Colors.textSecondary, lineHeight: 16 },

  // Grid
  scroll:        { flex: 1 },
  scrollContent: { paddingBottom: 100 },
  grid:          { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: Spacing.xl, gap: 8, marginBottom: 12 },
  gridCell:      { width: '48.5%' },

  // Footer
  footerText:   { textAlign: 'center', fontSize: 10, color: Colors.textMuted, marginBottom: 8 },

  // Regen
  regenRow:     { alignItems: 'center', paddingVertical: Spacing.xl },
  regenText:    { ...Typography.bodySmall, color: Colors.textMuted },

  // Empty state (unchanged)
  emptyIconWrap:    { width: 52, height: 52, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.sm },
  emptyTitle:       { ...Typography.headlineLarge, color: Colors.text, textAlign: 'center' },
  emptySubtitle:    { ...Typography.bodyMedium, color: Colors.textMuted, textAlign: 'center', lineHeight: 22 },
  generateBtn:      { width: '100%', borderRadius: BorderRadius.md, overflow: 'hidden', ...Shadows.md, marginTop: Spacing.sm },
  generateGradient: { height: 54, justifyContent: 'center', alignItems: 'center' },
  generateBtnText:  { ...Typography.headlineSmall, color: Colors.white },
});
```

- [ ] **Step 3: Build and run on device**

```bash
npx expo start
```

Open the Plan tab. Verify:
- Header shows "Daily Missions" + streak pill
- XP bar renders
- Pillar filter tabs appear and filter the grid
- Cards render in 2-column grid
- Tapping a card marks it done (purple tint, strikethrough, checkmark badge)
- XP bar animates on each tap
- When all done: banner appears, confetti fires, streak increments and pulses

- [ ] **Step 4: Commit**

```bash
git add app/(tabs)/plan.tsx
git commit -m "feat(plan): rewrite plan tab as Daily Missions gamified grid"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Covered by |
|-----------------|-----------|
| Header: eyebrow + title + streak pill | Task 5 render |
| XP bar with level, fill, XP/threshold text | Task 5 render + Task 3 animation |
| Pillar filter tabs (ALL/SKIN/DIET/HERBAL/LIFE) | Task 2 derived + Task 5 render |
| 2-col mission card grid | Task 4 MissionCard + Task 5 grid |
| Card: icon, pillar label, title, XP, checkmark badge | Task 4 MissionCard |
| Done card: purple tint, border, strikethrough, purple XP | Task 4 cardStyles |
| Tap body → PickDetailModal | Task 5 onPress |
| Tap card → toggle done/undone + XP animate | Task 3 toggleMission |
| Haptic on toggle | Task 3 toggleMission |
| All-done banner | Task 5 render |
| Streak increments on all-done | Task 3 toggleMission |
| Streak pulse animation | Task 3 + Task 5 streakScaleAnim |
| Level-up animation (fill → pause → reset) | Task 3 toggleMission |
| Confetti on all-done | Task 3 triggerConfetti call |
| Streak: count consecutive all-done days | Task 1 saveStreakState |
| Streak: break if >1 day gap | Task 1 loadStreakState |
| Daily XP resets on new day, level persists | Task 1 loadMissionsState + loadXpState |
| Footer: N of M complete · X XP | Task 5 render |
| Regenerate button | Task 5 render |

**Placeholder scan:** None found — all steps contain complete code.

**Type consistency:**
- `XpState` defined in Task 1, used in Tasks 2, 3 ✓
- `StreakState` defined in Task 1, used in Tasks 2, 3 ✓
- `FilterKey` defined in Task 1, used in Task 2 ✓
- `MissionCard` props defined in Task 4, consumed in Task 5 ✓
- `PILLAR_XP` defined in Task 1, used in Tasks 3, 4 ✓
- `toggleMission` defined in Task 3, called in Task 5 ✓
