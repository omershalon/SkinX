# Plan Tab — Daily Missions Redesign

**Date:** 2026-04-21  
**Status:** Approved

---

## Overview

Replace the boring checklist on the Plan tab with a gamified "Daily Missions" grid. The goal is to make the plan feel rewarding to complete each day — something you look forward to opening, not a chore.

---

## Layout

### Header
- Small eyebrow label: `YOUR PLAN` (uppercase, muted)
- Large bold title: `Daily Missions`
- Streak pill (top-right): shows current day streak as a large number with `DAY STREAK` label below, purple gradient background

### XP Progress Bar
- Full-width row below the header
- Left: level label (`LV 4`, bold purple)
- Center: animated progress bar, purple fill, shows progress toward next level
- Right: `320 / 500 XP` current/threshold

### Pillar Filter Tabs
- Horizontal scrollable tabs: ALL · SKIN · DIET · HERBAL · LIFE
- Active tab: filled purple pill, white bold text
- Inactive tabs: dark fill, muted text
- Tapping a tab filters the grid to show only that pillar's missions

### Mission Grid
- 2-column card grid
- Each card shows:
  - Icon placeholder block (32×32, rounded, pillar-colored background) — uses existing SVG pillar icons
  - Pillar label (tiny, uppercase, muted)
  - Mission title (bold, white)
  - XP value (`+40 XP`, muted)
  - Checkmark badge (top-right corner) — hidden when undone, filled purple circle with check when done

#### Card states
- **Undone:** dark card, white title, muted XP
- **Done:** purple-tinted card (`rgba(124,92,252,0.12)`), purple border, strikethrough title, purple XP label, checkmark badge visible

### Footer
- Single line of muted small text: `N of M complete · X XP earned today`

### All-Done State
- Streak pill increments by 1
- XP bar animates to next threshold (may trigger level-up)
- A banner appears above the grid: `All missions complete` + total XP earned + "Come back tomorrow" copy
- If leveling up: bar fills to 100% then resets, level number increments, burst animation fires

---

## XP System

### XP per pillar
| Pillar | XP per mission |
|--------|---------------|
| Lifestyle | 60 XP |
| Herbal | 50 XP |
| Skincare | 40 XP |
| Diet | 30 XP |

Missions use `impact_rank` to order cards within the grid (highest impact first, left-to-right, top-to-bottom).

### Level thresholds
Each level requires 500 XP. XP resets to 0 on level-up; level is stored persistently. Total lifetime XP is tracked for future use.

### Persistence
- Daily XP and done-state stored in `AsyncStorage` keyed by date (same pattern as existing checklist)
- Level and total XP stored in a separate `AsyncStorage` key (persists across days)
- On a new day: done-state resets, XP-earned-today resets to 0; level and total XP carry over

---

## Streak Logic

- Streak = number of consecutive calendar days where **all** missions were completed before midnight
- Stored in `AsyncStorage` with keys: `streak_count`, `streak_last_completed_date`
- On app open: if `streak_last_completed_date` is yesterday and all done → streak intact; if more than 1 day ago → reset to 0
- Streak increments when the last mission is marked done for the day
- Streak displayed in the header pill; animates (scale pulse) when it increments

---

## Interactions

| Action | Result |
|--------|--------|
| Tap mission card (body) | Opens existing `PickDetailModal` |
| Tap mission card (anywhere) | Toggles done/undone; XP counter animates |
| Mark done | Card flips to done state, XP bar animates, haptic feedback |
| Unmark | Card reverts, XP decrements |
| Complete all missions | All-done banner appears, streak increments, confetti burst |
| Level up | XP bar fills + resets animation, level number increments with scale animation |
| Tap pillar tab | Grid filters live, smooth opacity transition |

---

## Animations

- **XP bar:** `Animated.timing` on width when XP changes
- **Card done state:** `Animated.spring` scale bounce (0.95 → 1) on toggle
- **Streak pulse:** `Animated.sequence` scale 1 → 1.15 → 1 when streak increments
- **Level up:** XP bar fills to end → brief pause → resets to 0, level label updates with `Animated.spring`
- **Confetti:** existing confetti system, fires on all-done

---

## Files Changed

- `app/(tabs)/plan.tsx` — full rewrite of the main UI; XP/streak/level logic added
- No new components needed; reuses `PickDetailModal` and existing pillar icons

---

## Out of Scope

- Server-side XP or streak tracking (AsyncStorage only)
- Social/leaderboard features
- Push notifications for streaks
- Changing the underlying `RankedItem` data model
