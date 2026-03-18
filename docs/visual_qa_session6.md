# Visual QA Report — Session 6

**Date:** 2026-03-18
**Test runner:** Playwright (desktop project)
**Test file:** `tests/e2e/visualScreenshots.spec.ts`
**Result:** 16/16 tests passed (26.8s)
**Screenshots directory:** `client/test-results/screenshots/`

---

## Desktop Screenshots (1280x720)

### 01 — `01-boot-loading.png`
- **What's shown:** Character selection screen (BootScene appears to have already transitioned to CharacterScene). Shows 3 fighters (SHE/HER, HE/HIM, THEY/THEM), nationality picker, skin selector, nickname input, and start button.
- **Issues found:**
  1. **Boot/loading screen not captured** — The screenshot is identical to the CharacterScene, meaning the BootScene loading screen either transitions too fast or is not rendered. No loading bar, splash, or "Loading..." text is visible.
  2. **Thai text rendering for nationality section header** — The Thai text in the "NATIONALITY" header row shows with irregular spacing between characters ("สัญชาติ" appears as "ส ั ญ ช า ต ิ"), suggesting letter-spacing CSS is applied to Thai text incorrectly.
  3. **Water Gun skin section header** — Shows diamond/question-mark replacement characters before "Water Gun — SKIN", indicating a missing emoji or icon glyph.
- **Severity:**
  - Boot screen not captured: **Medium** (test may need longer wait; or BootScene is too fast)
  - Thai letter-spacing: **Medium** (readability issue for Thai users)
  - Missing glyph in skin header: **High** (broken character rendering)
- **Suggested fix:**
  - Add a deliberate delay or loading state to BootScene so it can be screenshot-tested.
  - Remove `letter-spacing` from Thai text sections or apply it only to English/Latin text.
  - Replace the broken emoji in the skin section header with an inline SVG or a supported Unicode character.

---

### 02 — `02-character-select-default.png`
- **What's shown:** CharacterScene with HE/HIM (middle character) selected by default. Yellow selection border on middle card.
- **Issues found:**
  1. **Same Thai letter-spacing issue** on nationality header and skin header.
  2. **Same missing glyph** in "Water Gun — SKIN" header.
  3. **Locked skin items truncated** — "Win 10 games", "Win 25 games", etc. text is slightly cut off at bottom edges of the skin row.
- **Severity:**
  - Letter-spacing: **Medium**
  - Missing glyph: **High**
  - Skin text truncation: **Low**
- **Suggested fix:** Same as #01. For skin items, add slight padding-bottom to the skin row or reduce font size.

---

### 03 — `03-character-female-selected.png`
- **What's shown:** CharacterScene with SHE/HER (left character) selected. Yellow selection border correctly moves to left card.
- **Issues found:**
  1. Same recurring Thai letter-spacing issue.
  2. Same missing glyph in skin header.
  3. Selection highlight works correctly — no additional layout issues.
- **Severity:** Same as above (**Medium**, **High**)
- **Suggested fix:** Same as #01.

---

### 04 — `04-character-male-selected.png`
- **What's shown:** CharacterScene with HE/HIM selected (identical to screenshot 02).
- **Issues found:**
  1. **Screenshot appears identical to 02-character-select-default.png** — The test may not be differentiating this state from the default state, or "male selected" is the default.
  2. Same recurring issues (Thai letter-spacing, missing glyph).
- **Severity:** **Low** (test coverage gap, not a UI bug per se)
- **Suggested fix:** If HE/HIM is the default, this test is redundant. Consider verifying the test clicks a different character first and then re-selects male.

---

### 05 — `05-character-lgbtq-selected.png`
- **What's shown:** CharacterScene with THEY/THEM (right character) selected. Yellow selection border on right card.
- **Issues found:**
  1. Same recurring issues (Thai letter-spacing, missing glyph).
  2. Selection highlight works correctly for THEY/THEM.
- **Severity:** Same as above.
- **Suggested fix:** Same as #01.

---

### 06 — `06-character-nationality-picked.png`
- **What's shown:** CharacterScene — appears identical to default state. No visible change indicating a nationality was actually picked/highlighted differently.
- **Issues found:**
  1. **No visual feedback for nationality selection** — The test claims a nationality was picked, but the screenshot looks identical to the default (Thai is highlighted by default). The test may not be clicking a different nationality, or the visual diff is too subtle.
  2. Same recurring issues.
- **Severity:** **Medium** (UX issue — user can't tell which nationality is active if they switch and come back)
- **Suggested fix:** Add a more prominent selected state to nationality buttons (e.g., background color change, border highlight like the character cards).

---

### 07 — `07-character-skin-selector.png`
- **What's shown:** CharacterScene — identical to default. "Classic Water" skin is shown selected with a yellow border.
- **Issues found:**
  1. Same recurring issues (Thai letter-spacing, missing glyph).
  2. The skin selector area itself looks functional. "Classic Water" has a light blue circle preview and a yellow selection border.
- **Severity:** Same as above.
- **Suggested fix:** Same as #01.

---

### 08 — `08-lobby-or-next-scene-LobbyScene.png`
- **What's shown:** LobbyScene with map selection (Chiang Mai, Khao San), Quick Match button, Private Room button, and Back button. Player name displayed as "TTeTeTesTesTestT".
- **Issues found:**
  1. **Thai header letter-spacing** — "เลือกแผนที่ — SELECT MAP" header has the same spaced-out Thai character issue.
  2. **Player name is test garbage** — "TTeTeTesTesTestT" is displayed. This is expected for a test, but confirms the nickname input is piped through.
  3. **Map card layout is asymmetric** — Chiang Mai card has a yellow/gold border (selected) while Khao San has a grey border. The Chiang Mai card description text "Open streets, water truck hazard" is slightly clipped at the right edge (the "d" is barely visible).
  4. **Large empty space** at the bottom of the page below the Back button — about 40% of the viewport is unused.
- **Severity:**
  - Thai letter-spacing: **Medium**
  - Text clipping on map card: **Low**
  - Wasted vertical space: **Low**
- **Suggested fix:** Vertically center the lobby content or distribute elements more evenly. Check map card padding for text overflow.

---

### 09 — `09-game-scene-LobbyScene.png`
- **What's shown:** LobbyScene again (not the actual GameScene). Player name is "OfffffffflfflfflL". The test was labeled "GameScene offline" but it navigated to LobbyScene instead.
- **Issues found:**
  1. **Wrong scene captured** — The test expected GameScene (or an offline fallback) but captured LobbyScene. This means the GameScene either failed to load, or the navigation path in the test does not reach GameScene.
  2. **Filename confirms the issue** — `09-game-scene-LobbyScene.png` has "LobbyScene" appended, confirming the scene name detected was LobbyScene, not GameScene.
  3. Same layout and spacing issues as #08.
- **Severity:** **Critical** (GameScene is not being tested at all — no screenshot of actual gameplay exists)
- **Suggested fix:** Fix the test navigation to actually enter a game (may need to click Quick Match and handle matchmaking/offline fallback). Alternatively, add a direct URL route or test hook to load GameScene directly.

---

### 10 — `10-leaderboard-BattlePassScene.png`
- **What's shown:** BattlePassScene (labeled as leaderboard in filename but showing Battle Pass). Shows "Tier 0 — 0/200 XP to next tier", a progress bar, and 7 reward tier cards (1-6 visible, 7th clipped).
- **Issues found:**
  1. **Wrong scene captured** — Test expected LeaderboardScene but got BattlePassScene. The filename confirms this: `10-leaderboard-BattlePassScene.png`.
  2. **Thai header letter-spacing** — "ระดับรางวัล — REWARD TIERS" has the same spaced-out Thai issue.
  3. **Tier 7 card is clipped** at the right edge — "Spray..." text is cut off. The row does not scroll or indicate overflow.
  4. **Even-numbered tiers (2, 4, 6) show dashes** — These tiers display "—" with no reward icon, which may be intentional (empty tiers) or a data loading issue.
  5. **XP progress bar appears empty** (0/200) with no fill — correct for Tier 0, but the bar itself is barely visible (very low contrast grey on dark blue).
  6. **Large empty space** below the tier cards and above the Back button.
- **Severity:**
  - Wrong scene (no leaderboard tested): **Critical**
  - Tier card clipping: **Medium**
  - Progress bar contrast: **Medium**
  - Empty tiers: **Low** (likely by design)
  - Wasted space: **Low**
- **Suggested fix:** Fix test navigation to reach LeaderboardScene. Add horizontal scroll indicator or wrap tier cards. Increase progress bar border/fill contrast.

---

### 11 — `11-battlepass-CharacterScene.png`
- **What's shown:** CharacterScene again (not BattlePassScene). The test expected BattlePassScene but landed on CharacterScene.
- **Issues found:**
  1. **Wrong scene captured** — Test expected BattlePassScene but got CharacterScene. Filename confirms: `11-battlepass-CharacterScene.png`.
  2. Same recurring CharacterScene issues.
- **Severity:** **Critical** (BattlePassScene test is not validating the correct scene from this test path)
- **Suggested fix:** Fix test navigation. The battle pass icon button in the top-right of CharacterScene may not be navigating correctly, or the test is not clicking it.

---

## Mobile Screenshots (375x812)

### 12 — `12-mobile-character-select.png`
- **What's shown:** CharacterScene at mobile viewport (375x812). The entire UI is rendered in the bottom ~60% of the screen. Large empty dark blue area at the top (~40% of viewport).
- **Issues found:**
  1. **Massive dead space at top** — The entire character selection UI is pushed to the bottom half of the screen. The top 40% is completely empty dark blue.
  2. **All text is extremely small** — Character names (SHE/HER, HE/HIM, THEY/THEM), stat labels, nationality buttons, and the nickname input are barely readable at mobile size. Text appears to be ~6-8px effective size.
  3. **Stat bars are tiny** — Speed/Power/Range bars are nearly invisible at this resolution.
  4. **Nationality buttons are too small to tap** — The 12 nationality buttons are crammed into a very small row, making them nearly impossible to tap accurately on a real device.
  5. **Skin selector row is microscopic** — "Classic Water" and locked skin items are barely visible.
  6. **Character sprites are very small** — ~40-50px tall on screen, hard to distinguish details.
  7. **The layout appears to be a scaled-down desktop view** rather than a responsive mobile layout — no reflow or stacking of elements.
  8. **Duplicate rendering** — The UI appears to be rendered twice (once at the top of the content area and once below), suggesting the DOM is duplicated or the Phaser canvas is overlapping with an HTML overlay.
- **Severity:**
  - Dead space / no responsive layout: **Critical**
  - Text too small: **Critical**
  - Buttons too small to tap: **Critical**
  - Duplicate rendering: **High**
- **Suggested fix:** Implement a proper mobile-responsive layout: stack character cards vertically, increase font sizes for mobile, use a scrollable nationality picker, and ensure the content fills the viewport. Investigate the duplicate rendering issue (possible DOM/canvas overlap).

---

### 13 — `13-mobile-character-selected.png`
- **What's shown:** Mobile CharacterScene with a character selected (SHE/HER appears to have selection border).
- **Issues found:**
  1. All the same mobile issues as #12.
  2. Selection state is barely visible at this size.
- **Severity:** **Critical** (same as #12)
- **Suggested fix:** Same as #12.

---

### 14 — `14-mobile-game-CharacterScene.png`
- **What's shown:** Mobile view — still showing CharacterScene (not GameScene). Filename confirms: `14-mobile-game-CharacterScene.png`. The nickname field shows "MMsMobbbisbblbsl" (test input).
- **Issues found:**
  1. **Wrong scene** — Expected mobile GameScene, got CharacterScene.
  2. All same mobile layout issues as #12.
- **Severity:** **Critical** (GameScene not tested on mobile either)
- **Suggested fix:** Fix mobile test navigation to reach GameScene.

---

### 15 — `15-mobile-leaderboard-CharacterScene.png`
- **What's shown:** Mobile view — still showing CharacterScene (not LeaderboardScene). Filename confirms wrong scene.
- **Issues found:**
  1. **Wrong scene** — Expected mobile LeaderboardScene, got CharacterScene.
  2. All same mobile layout issues as #12.
- **Severity:** **Critical** (LeaderboardScene not tested on mobile)
- **Suggested fix:** Fix mobile test navigation to reach LeaderboardScene.

---

### 16 — `16-mobile-battlepass-CharacterScene.png`
- **What's shown:** Mobile view — still showing CharacterScene (not BattlePassScene). Filename confirms wrong scene.
- **Issues found:**
  1. **Wrong scene** — Expected mobile BattlePassScene, got CharacterScene.
  2. All same mobile layout issues as #12.
- **Severity:** **Critical** (BattlePassScene not tested on mobile)
- **Suggested fix:** Fix mobile test navigation to reach BattlePassScene.

---

## Summary of Issues

### Critical (6 issues)
| # | Issue | Screenshots Affected |
|---|-------|---------------------|
| C1 | Mobile layout not responsive — all content tiny and pushed to bottom half | 12, 13, 14, 15, 16 |
| C2 | Mobile text/buttons too small to read or tap | 12, 13, 14, 15, 16 |
| C3 | GameScene never captured (desktop or mobile) — test navigates to wrong scene | 09, 14 |
| C4 | LeaderboardScene never captured (desktop or mobile) — wrong scene | 10, 15 |
| C5 | BattlePassScene test #11 captures CharacterScene instead | 11, 16 |
| C6 | Mobile tests for GameScene, Leaderboard, BattlePass all land on CharacterScene | 14, 15, 16 |

### High (2 issues)
| # | Issue | Screenshots Affected |
|---|-------|---------------------|
| H1 | Missing emoji/glyph in "Water Gun — SKIN" header (shows replacement characters) | 01-07, 11 |
| H2 | Possible duplicate rendering on mobile (DOM/canvas overlap) | 12-16 |

### Medium (4 issues)
| # | Issue | Screenshots Affected |
|---|-------|---------------------|
| M1 | Thai text letter-spacing breaks readability (characters spaced apart) | 01-11 |
| M2 | Nationality selection has no visible feedback when changed | 06 |
| M3 | Battle Pass tier 7 card clipped at right edge | 10 |
| M4 | XP progress bar very low contrast (grey on dark blue) | 10 |

### Low (3 issues)
| # | Issue | Screenshots Affected |
|---|-------|---------------------|
| L1 | Large empty space at bottom of LobbyScene | 08, 09 |
| L2 | Locked skin item text slightly truncated | 01-07 |
| L3 | Screenshot 04 (male selected) identical to 02 (default) — redundant test | 04 |

---

## Design System Color Check
- **#0A2540 (dark navy background):** Correctly used across all scenes.
- **#3AB5F5 (sky blue):** Used in Quick Match button and map card highlight. Appears correct.
- **#F5C842 (gold/yellow):** Used in start button, Private Room button, selection borders, and "SONGKRAN ROYALE" title. Appears correct.
- Overall color consistency is good on desktop. Mobile versions are too small to verify precisely.

---

## Recommendations for Next Pass
1. **Priority 1:** Fix mobile responsive layout — this is the most critical UX blocker.
2. **Priority 2:** Fix test navigation for GameScene, LeaderboardScene, and BattlePassScene so these scenes can actually be QA-tested.
3. **Priority 3:** Fix Thai letter-spacing CSS (apply only to Latin characters or remove globally).
4. **Priority 4:** Fix missing glyph/emoji in skin section header.
5. **Priority 5:** Investigate mobile duplicate rendering (DOM overlay vs Phaser canvas).
