# Songkran Royale — Mobile QA Checklist

Target device: iPhone 14 / equivalent Android (375x812 logical viewport)

## Touch Controls

- [ ] Virtual joystick renders on mobile viewport (375x812)
- [ ] Virtual joystick responds to touch input and moves the player character
- [ ] Joystick returns to center position when touch is released
- [ ] Shoot button fires a water projectile on tap
- [ ] Shoot button has adequate touch target (minimum 44x44px)
- [ ] Refill button appears when near water stations
- [ ] Refill button is tappable and triggers refill animation
- [ ] Touch controls do not overlap with each other
- [ ] Touch controls do not drift off-screen on smaller devices

## HUD and UI Overlay

- [ ] HUD elements (wet meter, water tank, timer) are visible and readable
- [ ] HUD elements do not overlap virtual joystick or action buttons
- [ ] Mute/sound toggle button is accessible and does not require scrolling
- [ ] Timer text is readable at mobile font scale
- [ ] Wet meter color transitions (green/yellow/red) are clearly distinguishable
- [ ] Water tank fill indicator is visible at low values

## Text and Readability

- [ ] All Thai text is readable at mobile scale (minimum 10px effective)
- [ ] All English text is readable at mobile scale
- [ ] Character names and stat labels on CharacterScene are legible
- [ ] Lobby status messages are not clipped or truncated
- [ ] Result card text (winner name, stats) is fully readable

## Layout and Viewport

- [ ] No horizontal scroll or overflow on any scene
- [ ] No pinch-zoom on the game canvas (viewport meta tag prevents it)
- [ ] Game canvas fills the viewport without black bars or gaps
- [ ] Content does not extend below the visible fold on CharacterScene
- [ ] Safe area insets are respected on notched devices (iPhone X+)

## Character Select Screen (CharacterScene)

- [ ] All 3 character cards are visible without scrolling
- [ ] Character cards are tappable (selection highlight appears on tap)
- [ ] Nationality pills are tappable with minimum 44px touch targets
- [ ] Nationality pills wrap to multiple rows and remain tappable
- [ ] Nickname input field responds to mobile keyboard
- [ ] Mobile keyboard does not obscure the CTA button
- [ ] CTA button ("เข้าสู่สนามรบ") is tappable and triggers scene transition

## Lobby Screen (LobbyScene)

- [ ] Quick Match and Private Room buttons are tappable
- [ ] Room code input accepts mobile keyboard input
- [ ] Ready button is easily tappable
- [ ] Back button is accessible
- [ ] Player list is readable when multiple players are listed

## Gameplay (GameScene / OnlineGameScene)

- [ ] Player character renders and moves smoothly
- [ ] Water projectiles are visible at mobile scale
- [ ] Water station refill zones are clearly indicated
- [ ] Other players and AI dummies are visible
- [ ] Elimination animation plays correctly
- [ ] No frame drops below 30fps during normal gameplay

## Result Screen (ResultScene)

- [ ] Result card is readable and centered
- [ ] Winner name and stats are displayed correctly
- [ ] Share button (if present) works on mobile
- [ ] "Play Again" or "Back to Lobby" button is tappable

## Orientation

- [ ] Game works in landscape orientation (if required)
- [ ] If portrait-only: display an orientation prompt when device is in landscape
- [ ] Orientation changes do not crash or break the layout

## Performance

- [ ] Maintains 60fps on mid-range mobile (e.g., iPhone 12, Galaxy S21)
- [ ] Maintains 30fps minimum on low-end devices (e.g., iPhone SE 2nd gen)
- [ ] No memory leaks after playing multiple rounds (monitor via DevTools)
- [ ] Asset loading time under 5 seconds on 4G connection
- [ ] WebSocket reconnection works after brief network interruption
