# Khao San Road Arena — Map Design Document

## Overview

A 40x30 tile map (1280x960 px at 32px/tile) themed after Bangkok's Khao San Road during Songkran night. Features a narrow main street running north-south through the center, branching alleys east and west, food carts, bar fronts, neon sign structures, hostel buildings, and parked tuk-tuks for cover. The atmosphere is chaotic, neon-lit, and claustrophobic compared to the open Chiang Mai arena.

---

## ASCII Map (40 wide x 30 tall)

Each character = one 32x32 tile.

```
Legend:
  .  = open ground (walkable)
  #  = building wall (impassable) — hostels, bars, shops
  B  = bar front (impassable) — neon-lit bar structures
  W  = water refill station
  S  = spawn point (1-8)
  C  = cover object (tuk-tuk, food cart, neon sign post — impassable)
  ~  = flood zone (walkable, periodic slow+refill)
  *  = party zone (walkable, masks audio cues)
  =  = road marking (walkable, cosmetic — center street)
  |  = alley wall (impassable)
```

```
Col: 0000000000111111111122222222223333333333
     0123456789012345678901234567890123456789
R00: ########################################
R01: #S1.....###.........==.........###.S2..#
R02: #.......###....C....==....C...###.....#
R03: #..C....###.........==........###.....#
R04: #.......###...W.....==....W...###.....#
R05: #.............|.....==....|...........#
R06: #.BBB.........|.....==....|.......BBB.#
R07: #.BBB..C.....|.....==....|....C.BBB.#
R08: #.BBB.........|..S3.==....|.......BBB.#
R09: #.............|.....==....|...........#
R10: ##...........||....====....||..........##
R11: #.S4....~~~.........==........~~~.S5..#
R12: #.......~~~....C....==....C...~~~.....#
R13: #.......~~~...|..W..==..W.|...~~~.....#
R14: #.............|.....==....|...........#
R15: #......C.....|..********..|....C......#
R16: #.............|..********..|...........#
R17: #.............|..W..==..W.|...........#
R18: #.......~~~....C....==....C...~~~.....#
R19: #.......~~~.........==........~~~.S6..#
R20: ##..........||....====....||..........##
R21: #.............|.....==....|...........#
R22: #.BBB.........|..S7.==....|.......BBB.#
R23: #.BBB..C.....|.....==....|....C.BBB.#
R24: #.BBB.........|.....==....|.......BBB.#
R25: #.............|.....==....|...........#
R26: #.......###...W.....==....W...###.....#
R27: #..C....###.........==........###.....#
R28: #S8.....###.........==.........###.S3..#
R29: ########################################
```

Note: S3 at R28 should read S8b — corrected in coordinates below. Spawn 3 is at R08, Spawn 8 is at R28.

---

## Tile Legend & IDs

| Tile ID | Symbol | Name              | Properties                                  |
|---------|--------|-------------------|---------------------------------------------|
| 0       | `.`    | Ground            | Walkable, default floor                     |
| 1       | `#`    | Building Wall     | Impassable, hostels/shops                   |
| 2       | `B`    | Bar Front         | Impassable, neon-lit bar structures         |
| 3       | `=`    | Road Marking      | Walkable, cosmetic center street line       |
| 4       | `C`    | Cover Object      | Impassable, tuk-tuk/food cart/neon post     |
| 5       | `~`    | Flood Zone        | Walkable, periodic slow + water refill      |
| 6       | `W`    | Water Refill      | Walkable zone, triggers refill              |
| 7       | `\|`   | Alley Wall        | Impassable, narrow alley boundary           |
| 8       | `S`    | Spawn Point       | Walkable, player start position             |
| 9       | `*`    | Party Zone        | Walkable, masks audio cues when inside      |

---

## Element Coordinates

All coordinates are in pixels. Tile (col, row) maps to pixel center `(col*32+16, row*32+16)`.

### Buildings / Walls (impassable rectangles)

| #  | Description                  | Tile Area (col,row)  | x    | y    | w   | h   |
|----|------------------------------|----------------------|------|------|-----|-----|
| 1  | NW hostel block              | (8-10, 1-4)         | 304  | 80   | 96  | 128 |
| 2  | NE hostel block              | (30-32, 1-4)        | 1008 | 80   | 96  | 128 |
| 3  | SW hostel block              | (8-10, 26-28)       | 304  | 864  | 96  | 96  |
| 4  | SE hostel block              | (30-32, 26-28)      | 1008 | 864  | 96  | 96  |
| 5  | NW bar front                 | (2-4, 6-8)          | 112  | 224  | 96  | 96  |
| 6  | NE bar front                 | (35-37, 6-8)        | 1168 | 224  | 96  | 96  |
| 7  | SW bar front                 | (2-4, 22-24)        | 112  | 736  | 96  | 96  |
| 8  | SE bar front                 | (35-37, 22-24)      | 1168 | 736  | 96  | 96  |
| 9  | West alley wall (north)      | (14, 5-9)           | 464  | 224  | 32  | 160 |
| 10 | East alley wall (north)      | (25, 5-9)           | 816  | 224  | 32  | 160 |
| 11 | West alley wall (mid-N)      | (14, 11-18)         | 464  | 464  | 32  | 256 |
| 12 | East alley wall (mid-N)      | (25, 11-18)         | 816  | 464  | 32  | 256 |
| 13 | West alley wall (south)      | (14, 21-25)         | 464  | 736  | 32  | 160 |
| 14 | East alley wall (south)      | (25, 21-25)         | 816  | 736  | 32  | 160 |
| 15 | NW narrows block             | (0-1, 10)           | 32   | 336  | 64  | 32  |
| 16 | NE narrows block             | (38-39, 10)         | 1248 | 336  | 64  | 32  |
| 17 | West double alley (N)        | (13-14, 10)         | 448  | 336  | 64  | 32  |
| 18 | East double alley (N)        | (25-26, 10)         | 832  | 336  | 64  | 32  |
| 19 | SW narrows block             | (0-1, 20)           | 32   | 656  | 64  | 32  |
| 20 | SE narrows block             | (38-39, 20)         | 1248 | 656  | 64  | 32  |
| 21 | West double alley (S)        | (13-14, 20)         | 448  | 656  | 64  | 32  |
| 22 | East double alley (S)        | (25-26, 20)         | 832  | 656  | 64  | 32  |

### Cover Objects (impassable, small)

| #  | Description              | Tile (col,row) | x    | y    | w   | h   |
|----|--------------------------|----------------|------|------|-----|-----|
| 23 | NW food cart             | (3, 3)         | 112  | 112  | 32  | 32  |
| 24 | N-center-W food cart     | (15, 2)        | 496  | 80   | 32  | 32  |
| 25 | N-center-E food cart     | (24, 2)        | 784  | 80   | 32  | 32  |
| 26 | W bar tuk-tuk            | (7, 7)         | 240  | 240  | 32  | 32  |
| 27 | E bar tuk-tuk            | (33, 7)        | 1072 | 240  | 32  | 32  |
| 28 | Mid-W neon post          | (6, 15)        | 208  | 496  | 32  | 32  |
| 29 | Mid-E neon post          | (33, 15)       | 1072 | 496  | 32  | 32  |
| 30 | Mid-center-W food cart   | (15, 12)       | 496  | 400  | 32  | 32  |
| 31 | Mid-center-E food cart   | (24, 12)       | 784  | 400  | 32  | 32  |
| 32 | Mid-center-W cart (S)    | (15, 18)       | 496  | 592  | 32  | 32  |
| 33 | Mid-center-E cart (S)    | (24, 18)       | 784  | 592  | 32  | 32  |
| 34 | W bar tuk-tuk (S)        | (7, 23)        | 240  | 752  | 32  | 32  |
| 35 | E bar tuk-tuk (S)        | (33, 23)       | 1072 | 752  | 32  | 32  |
| 36 | SW food cart             | (3, 27)        | 112  | 880  | 32  | 32  |

### Water Refill Stations (5 total)

| # | Description            | Tile (col,row) | x    | y    |
|---|------------------------|----------------|------|------|
| 1 | NW street tap          | (15, 4)        | 496  | 144  |
| 2 | NE street tap          | (24, 4)        | 784  | 144  |
| 3 | Center-W hydrant       | (18, 13)       | 592  | 432  |
| 4 | Center-E hydrant       | (21, 17)       | 688  | 560  |
| 5 | SW street tap          | (15, 26)       | 496  | 848  |

Note: The map originally listed symmetric NE/SE taps (W markers at col 24 rows 4 and 26). For balance, 5 stations are used — two north, one center-west, one center-east, one south — forcing north-south rotations.

### Spawn Points (8 players)

| # | Description       | Tile (col,row) | x    | y    |
|---|-------------------|----------------|------|------|
| 1 | NW corner         | (1, 1)         | 48   | 48   |
| 2 | NE corner         | (37, 1)        | 1200 | 48   |
| 3 | Center-east       | (19, 8)        | 624  | 272  |
| 4 | West mid          | (2, 11)        | 80   | 368  |
| 5 | East mid          | (37, 11)       | 1200 | 368  |
| 6 | SE mid            | (37, 19)       | 1200 | 624  |
| 7 | Center-south      | (19, 22)       | 624  | 720  |
| 8 | SW corner         | (1, 28)        | 48   | 912  |

### Flood Zones (Street Flood hazard — 4 puddle strips)

| # | Description          | Tile Area (col,row)  | x    | y    | w   | h   |
|---|----------------------|----------------------|------|------|-----|-----|
| 1 | NW flood strip       | (8-10, 11-12)        | 304  | 368  | 96  | 64  |
| 2 | NE flood strip       | (29-31, 11-12)       | 976  | 368  | 96  | 64  |
| 3 | SW flood strip       | (8-10, 18-19)        | 304  | 592  | 96  | 64  |
| 4 | SE flood strip       | (29-31, 18-19)       | 976  | 592  | 96  | 64  |

### Party Zones (audio-masking hazard)

| # | Description         | Tile Area (col,row)  | x    | y    | w   | h   |
|---|---------------------|----------------------|------|------|-----|-----|
| 1 | Center party zone   | (18-25, 15-16)       | 704  | 496  | 256 | 64  |

Note: The party zone occupies the wide center of the street where the road opens up. It is represented as two separate rectangles for potential future expansion, but currently is a single block.

---

## Map Hazards

### 1. Street Flood (periodic)

- **Behavior:** Every 25 seconds, water floods from overflowing drains in the side alleys, filling the flood zone strips for 6 seconds.
- **Locations:** Four `~` zones flanking the center alleys (NW, NE, SW, SE flood strips).
- **Effect during flood:** Players inside have movement speed reduced by 40% (multiply by 0.6). Additionally, players gain +5% water refill per second (free but risky refill).
- **Effect when dry:** Zones are walkable with no penalty (cosmetic wet tiles only).
- **Visual:** Water rushes in from alley grates, puddle tiles animate with splashing. A gurgling sound plays 2 seconds before flood activates.
- **Warning:** "Flood incoming!" text + drain gurgle SFX 2 seconds before activation.
- **Implementation:** Server tracks a flood timer. Every 25s, set `floodActive = true` for 6s. During active phase, check player positions against flood zone rects. Apply speed multiplier and water refill bonus.

### 2. Party Zone (permanent audio mask)

- **Behavior:** The center street area near the bars blasts loud music permanently.
- **Location:** The `*` zone in the center of the map (rows 15-16, cols 18-25).
- **Effect:** Players inside the party zone cannot hear directional audio cues (footsteps, water gun shots, reload sounds) from other players. The zone plays loud Thai pop music that masks all gameplay audio.
- **Visual:** Neon lights pulse, speaker icons float, confetti particles. The zone has a visible pink/purple glow overlay.
- **Implementation:** Server marks players inside the party zone with a `partyZoneMask` flag. Client suppresses directional audio for masked players and plays the party music loop. Projectile hit sounds still play (visual feedback remains).

---

## Player Flow & Strategy Notes

### Map Structure

The map has a **linear corridor flow** with lateral flanking routes:

1. **Main Street (center N-S axis):** The narrow road with `=` markings runs north-south through the center. This is the primary transit route but is a kill corridor -- exposed from both alley walls. Unlike Chiang Mai's wide E-W road, Khao San's street is narrow (cols 18-21, ~4 tiles wide) forcing close-quarters encounters.

2. **Side Alleys (E and W):** The vertical alley walls at columns 14 and 25 create parallel corridors on each side. These alleys connect to wider flanking areas with bar fronts and hostel buildings.

3. **Cross Streets (rows 10 and 20):** Horizontal narrows create two cross-street intersections. The double alley walls here create tight 2-tile-wide chokepoints. Controlling a cross street lets you cut off north-south movement.

4. **Bar Districts (NW/NE/SW/SE corners):** The bar front blocks (3x3 tiles) provide substantial hard cover near the map edges. These are safe havens for regrouping but are dead ends -- pushing out requires crossing open ground.

### Strategic Zones

- **The Street (center corridor):** High-risk, high-reward. The only direct N-S route, but the alley walls create ambush angles. Food carts at cols 15 and 24 provide the only mid-street cover.

- **Flood Alleys (side strips):** The flood zones near alleys are gambles. When dry, they are fast flanking routes. When flooded, they slow you down severely but provide free water refill. Timing pushes around flood cycles is key.

- **Party Zone (center):** The audio-masking zone in the center is a double-edged sword. You can sneak through without being heard, but you also cannot hear enemies approaching. Ideal for ambushes but dangerous to linger.

- **Bar Districts:** Safe corners with hard cover. Tuk-tuks parked outside bars provide additional cover for peeking. But water stations are in the center street, forcing players to leave safety.

- **Hostel Blocks (N and S ends):** The hostel buildings at the north and south ends create spawn-adjacent cover. They channel newly spawned players into the alley system.

### Water Economy

- 5 water stations (down from Chiang Mai's 6) create scarcity and force movement.
- Two stations in the north street, two in the center (staggered W and E), one in the south.
- The center stations are inside the alley corridor -- contested territory.
- Flood zones provide a risky alternative refill source during flood cycles.

### Spawn Balance

- Spawns are distributed across the map perimeter and center:
  - Corners (1, 2, 8) are protected by hostel blocks.
  - Mid spawns (4, 5, 6) are near bar districts with immediate cover.
  - Center spawns (3, 7) are inside the alley system -- close to action but near alley walls for cover.
- No spawn is more than ~5 seconds from a water station.

### Flood Tactics

- The flood cycle (25s interval, 6s duration) creates a rhythm players must learn:
  - Push through flood zones right after they drain for safe passage.
  - Bait enemies into flood zones just before activation for the slow debuff.
  - Use flood zones for emergency water refills when cut off from stations.
  - The 2-second warning gives time to exit or commit.

### Party Zone Tactics

- The party zone is the most chaotic area:
  - Sneak through to ambush players on the other side of the street.
  - Bait enemies into the zone where they lose audio awareness.
  - Avoid lingering -- you are as deaf as your enemies inside.
  - Use visual cues (projectile trails, splash effects) to compensate for lost audio.
