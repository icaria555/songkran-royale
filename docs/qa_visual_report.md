# Songkran Royale — Visual QA Report

## Scene Inventory and Expected Visual State

### 1. BootScene
- **Purpose:** Asset preloading, splash screen
- **Expected state:** Dark background (#0a2540), loading bar or spinner, "SONGKRAN ROYALE" branding text
- **Desktop:** Centered loading indicator, full-width canvas
- **Mobile:** Same layout, scaled to fit viewport
- **Known issues:** None currently identified

### 2. CharacterScene
- **Purpose:** Character selection, nationality picker, nickname input
- **Expected state:**
  - Gold title "SONGKRAN ROYALE 2569" at top
  - 3 character cards horizontally with pixel art sprites (4x scale), stat bars, labels
  - Default selection on middle card (HE/HIM) with gold border highlight
  - 12 nationality pills in 2 rows of 6, default "Thai" selected with gold highlight
  - Nickname input field with placeholder text
  - Gold CTA button "เข้าสู่สนามรบ" at bottom
- **Desktop (1280x800):** Cards well-spaced, all 12 nationality pills visible without wrapping issues
- **Mobile (375x812):** Cards may be tight; verify pills do not overflow; CTA should be above fold
- **Known issues:**
  - Nationality pills have fixed 110px width; may clip on narrow screens
  - Nickname input relies on Phaser keyboard capture; mobile virtual keyboard may not trigger

### 3. LobbyScene
- **Purpose:** Mode selection, matchmaking, room management
- **Expected state (main menu mode):**
  - "SONGKRAN ROYALE" header, "Lobby" subheading
  - Player nickname displayed in status text
  - Blue "Quick Match" button and gold "Private Room" button
  - Back button at bottom
- **Expected state (waiting mode):**
  - Room code displayed in large gold text
  - Player list with ready indicators
  - Green "READY" button (turns gold when toggled)
- **Desktop:** Buttons centered, comfortable spacing
- **Mobile:** Buttons should fill width adequately; room code must be legible
- **Known issues:**
  - If server is unreachable, status text shows error in red then auto-redirects to offline GameScene after 2 seconds

### 4. GameScene (Offline / Single-player)
- **Purpose:** Core gameplay with WASD movement, shooting, AI dummy
- **Expected state:**
  - Chiang Mai map rendered with tiles (temples, water stations, roads)
  - Player sprite visible at spawn point
  - HUD overlay: wet meter (top-left), water tank (below wet meter), timer (top-center)
  - Water projectiles render as small blue sprites
  - Water station zones have visual indicators
  - AI dummy moves around the map
- **Desktop:** Full map visible with camera following player, HUD comfortably positioned
- **Mobile:** Camera follows player; HUD elements must not overlap touch controls
- **Known issues:**
  - Virtual touch controls (joystick, buttons) overlay visibility on mobile needs verification
  - Particle effects (water splash) may impact performance on low-end devices

### 5. OnlineGameScene
- **Purpose:** Multiplayer gameplay via Colyseus
- **Expected state:** Same as GameScene but with real remote players instead of AI
- **Desktop:** Same as GameScene
- **Mobile:** Same as GameScene
- **Known issues:**
  - Network latency may cause visual jitter on remote player positions
  - State sync at 20Hz means interpolation quality matters for smooth visuals

### 6. ResultScene
- **Purpose:** Post-match results, winner display, stats
- **Expected state:**
  - Result card centered on screen
  - Winner's nickname displayed prominently
  - Match stats (eliminations, damage dealt, survival time)
  - "Play Again" and/or "Back to Lobby" buttons
- **Desktop:** Card centered with comfortable margins
- **Mobile:** Card should fit within viewport without scrolling
- **Known issues:** None currently identified

---

## Desktop vs Mobile Comparison Points

| Element | Desktop (1280x800) | Mobile (375x812) |
|---|---|---|
| Character cards | 3 cards with 20px gap, comfortable | Cards may need smaller scale |
| Nationality pills | 2 rows of 6, 110px each | May overflow; verify wrapping |
| Nickname input | Keyboard capture works natively | Needs mobile keyboard support |
| CTA button | 240px wide, easily clickable | Must meet 44px touch target |
| HUD bars | 160px wide, top-left corner | Must not overlap touch controls |
| Timer | Top-center, 20px font | Verify readability |
| Map tiles | 16x16 at 4x = 64px per tile | Same scale, camera viewport smaller |
| Touch controls | N/A (WASD) | Joystick + buttons must render |

---

## Performance Targets

| Metric | Target | Measurement Method |
|---|---|---|
| Frame rate (desktop) | 60fps sustained | Chrome DevTools Performance tab |
| Frame rate (mid-range mobile) | 60fps sustained | Remote DevTools on real device |
| Frame rate (low-end mobile) | 30fps minimum | Remote DevTools on real device |
| Initial load time (4G) | < 5 seconds | Lighthouse or WebPageTest |
| Canvas memory | < 100MB | Chrome Task Manager |
| WebSocket latency | < 100ms (Singapore region) | Network tab / custom logging |

---

## Visual Checklist Per Scene

### Pre-release visual sign-off:

- [ ] BootScene: loading indicator renders, no flash of unstyled content
- [ ] CharacterScene: all 3 sprites load, stat bars fill correctly, gold highlights work
- [ ] CharacterScene: nationality pill selection changes color to gold
- [ ] LobbyScene: all mode buttons render with correct colors
- [ ] LobbyScene: room code is displayed in gold monospace-style text
- [ ] LobbyScene: player list updates dynamically when players join/leave
- [ ] GameScene: map tiles render without gaps or misalignment
- [ ] GameScene: player sprite animates during movement
- [ ] GameScene: water projectile sprite is visible against all map backgrounds
- [ ] GameScene: HUD bars update in real-time (wet meter, water tank)
- [ ] GameScene: timer counts down and turns red at 30 seconds
- [ ] GameScene: water station refill indicator appears/disappears correctly
- [ ] OnlineGameScene: remote players render and move smoothly
- [ ] OnlineGameScene: elimination effects play for remote players
- [ ] ResultScene: winner name and stats display correctly
- [ ] ResultScene: buttons are styled consistently with other scenes

---

## Areas Needing Attention

1. **Mobile nickname input** — Phaser's keyboard capture may not work with mobile virtual keyboards. May need a DOM `<input>` overlay.
2. **Nationality pill overflow** — At 375px viewport, 6 pills per row at 110px each = 696px total, which exceeds the viewport. The Phaser layout centers based on game width (800), but the actual rendered size on mobile needs verification.
3. **Touch control placement** — Virtual joystick and action buttons must be positioned to avoid overlap with HUD elements. Needs real-device testing.
4. **Particle effects performance** — Water splash particles on every projectile hit may cause frame drops on low-end mobile. Consider reducing particle count or disabling on mobile.
5. **WebSocket reconnection** — If a player loses connection briefly, the visual state should recover gracefully without requiring a page refresh.
