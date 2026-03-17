# Chiang Mai Street Arena — Map Design Document

## Overview

A 40x30 tile map (1280x960 px at 32px/tile) themed after the Tha Pae Road area during Songkran. Features a wide main road running east-west, narrow side alleys running north-south, temple compounds, shop buildings, and scattered street objects (tuk-tuks, market stalls, songthaew trucks) that provide partial cover.

---

## ASCII Map (40 wide x 30 tall)

Each character = one 32x32 tile.

```
Legend:
  .  = open ground (walkable)
  #  = building wall (impassable)
  T  = temple wall (impassable)
  W  = water refill station
  S  = spawn point (1-8)
  C  = cover object (tuk-tuk, stall, songthaew — impassable)
  ~  = slippery zone (walkable, -30% speed)
  =  = main road marking (walkable, cosmetic)
  |  = alley wall (impassable)
```

```
Col: 0000000000111111111122222222223333333333
     0123456789012345678901234567890123456789
R00: ########################################
R01: #S1..............====..............S2..#
R02: #....###........====........###........#
R03: #....###..C.....====.....C.###........#
R04: #....###........====........###........#
R05: #..............W====..............W...#
R06: #.......|.......====.......|...........#
R07: #.......|.......====.......|...........#
R08: #..C...|.......====.......|....C......#
R09: #.......|...............S3.|...........#
R10: #.......|..............................#
R11: ####....|............C............|.####
R12: #..........====..........====.........#
R13: #.S4.....====..........====......S5..#
R14: #..........====....CC....====.........#
R15: #..........====..........====.........#
R16: #..........====..........====.........#
R17: #.W.......====..........====........W.#
R18: ####....|...........................|.####
R19: #.......|..............................#
R20: #.......|.....S6..........|...........#
R21: #..C...|.......====.......|....C......#
R22: #.......|.......====.......|...........#
R23: #.......|.......====.......|...........#
R24: #..............W====..............W...#
R25: #....TTT........====........TTT........#
R26: #..~~TTT~~.C....====....C.~~TTT~~....#
R27: #..~~TTT~~......====......~~TTT~~....#
R28: #S7..............====..............S8..#
R29: ########################################
```

---

## Tile Legend & IDs

| Tile ID | Symbol | Name              | Properties                           |
|---------|--------|-------------------|--------------------------------------|
| 0       | `.`    | Ground            | Walkable, default floor              |
| 1       | `#`    | Building Wall     | Impassable, shops/houses             |
| 2       | `T`    | Temple Wall       | Impassable, ornate temple blocks     |
| 3       | `=`    | Road Marking      | Walkable, cosmetic road stripe       |
| 4       | `C`    | Cover Object      | Impassable, tuk-tuk/stall/songthaew  |
| 5       | `W`    | Water Refill      | Walkable zone, triggers refill       |
| 6       | `~`    | Slippery Puddle   | Walkable, -30% movement speed        |
| 7       | `\|`   | Alley Wall        | Impassable, narrow alley boundary    |
| 8       | `S`    | Spawn Point       | Walkable, player start position      |

---

## Element Coordinates

All coordinates are in pixels. Obstacle `{x, y}` = center of the rectangle. Tile (col, row) maps to pixel center `(col*32+16, row*32+16)`.

### Buildings / Walls (impassable rectangles)

These are the `OBSTACLES` array entries. Each is `{x, y, w, h}` where x,y = center.

| # | Description                     | Tile Area (col,row)   | x    | y    | w   | h   |
|---|--------------------------------|-----------------------|------|------|-----|-----|
| 1 | NW shop block                  | (4-6, 2-4)           | 176  | 96   | 96  | 96  |
| 2 | NE shop block                  | (28-30, 2-4)         | 944  | 96   | 96  | 96  |
| 3 | SW temple block                | (4-6, 25-27)         | 176  | 832  | 96  | 96  |
| 4 | SE temple block                | (28-30, 25-27)       | 944  | 832  | 96  | 96  |
| 5 | West alley wall (north seg)    | (8, 6-10)            | 272  | 256  | 32  | 160 |
| 6 | East alley wall (north seg)    | (28, 6-10)           | 912  | 256  | 32  | 160 |
| 7 | W border block (mid)           | (0-3, 11)            | 64   | 368  | 128 | 32  |
| 8 | E border block (mid)           | (36-39, 11)          | 1216 | 368  | 128 | 32  |
| 9 | W border block (mid-low)       | (0-3, 18)            | 64   | 592  | 128 | 32  |
| 10| E border block (mid-low)       | (36-39, 18)          | 1216 | 592  | 128 | 32  |
| 11| West alley wall (south seg)    | (8, 19-23)           | 272  | 672  | 32  | 160 |
| 12| East alley wall (south seg)    | (28, 19-23)          | 912  | 672  | 32  | 160 |
| 13| Cover: NW tuk-tuk              | (5, 8)               | 176  | 272  | 32  | 32  |
| 14| Cover: NE tuk-tuk              | (33, 8)              | 1072 | 272  | 32  | 32  |
| 15| Cover: center object           | (21, 11)             | 688  | 368  | 32  | 32  |
| 16| Cover: NW road stall           | (10, 3)              | 336  | 112  | 32  | 32  |
| 17| Cover: NE road stall           | (25, 3)              | 816  | 112  | 32  | 32  |
| 18| Cover: mid-left pair           | (18-19, 14)          | 608  | 464  | 64  | 32  |
| 19| Cover: SW tuk-tuk              | (5, 21)              | 176  | 688  | 32  | 32  |
| 20| Cover: SE tuk-tuk              | (33, 21)             | 1072 | 688  | 32  | 32  |
| 21| Cover: SW road stall           | (11, 26)             | 368  | 848  | 32  | 32  |
| 22| Cover: SE road stall           | (25, 26)             | 816  | 848  | 32  | 32  |

### Water Refill Stations (6 total)

| # | Description          | Tile (col,row) | x    | y    |
|---|---------------------|----------------|------|------|
| 1 | NW road hydrant      | (15, 5)        | 496  | 176  |
| 2 | NE road hydrant      | (35, 5)        | 1136 | 176  |
| 3 | SW road hydrant      | (15, 24)       | 496  | 784  |
| 4 | SE road hydrant      | (35, 24)       | 1136 | 784  |
| 5 | West mid tank        | (2, 17)        | 80   | 560  |
| 6 | East mid tank        | (37, 17)       | 1200 | 560  |

### Spawn Points (8 players)

| # | Description   | Tile (col,row) | x    | y    |
|---|--------------|----------------|------|------|
| 1 | NW corner     | (1, 1)         | 48   | 48   |
| 2 | NE corner     | (36, 1)        | 1168 | 48   |
| 3 | East mid-N    | (27, 9)        | 880  | 304  |
| 4 | West mid      | (2, 13)        | 80   | 432  |
| 5 | East mid      | (35, 13)       | 1136 | 432  |
| 6 | West mid-S    | (14, 20)       | 464  | 656  |
| 7 | SW corner     | (1, 28)        | 48   | 912  |
| 8 | SE corner     | (36, 28)       | 1168 | 912  |

### Slippery Zones (2 puddle areas near temples)

| # | Description        | Tile Area (col,row)  | x    | y    | w   | h   |
|---|--------------------|----------------------|------|------|-----|-----|
| 1 | SW temple puddle   | (3-8, 26-27)         | 176  | 848  | 192 | 64  |
| 2 | SE temple puddle   | (28-33, 26-27)       | 976  | 848  | 192 | 64  |

---

## Map Hazards

### 1. Water Truck (periodic)

- **Behavior:** A water truck drives horizontally across the main road every 30 seconds.
- **Path:** From x=0 to x=1280, at y=480 (row 15, center of map). Speed: 320 px/s (~4 seconds to cross).
- **Effect:** Any player within 48px of the truck's center line gets +25% wet meter.
- **Visual:** A large blue truck sprite moving left-to-right, with water spray particles.
- **Warning:** A horn sound + "Water Truck!" text 2 seconds before it enters.
- **Implementation:** Server spawns a virtual entity every 30s at `{x: -64, y: 480}` moving right. Each tick, check player proximity. Remove when x > 1344.

### 2. Slippery Zones (permanent)

- **Locations:** Two puddle zones near the SW and SE temple compounds.
- **Effect:** Players inside these zones have movement speed reduced by 30% (multiply velocity by 0.7).
- **Visual:** Animated water puddle tiles with a slight blue shimmer.
- **Implementation:** Server checks if player position is within the zone rectangles. If so, apply speed multiplier before movement.

---

## Player Flow & Strategy Notes

### Map Structure

The map has a **figure-8 flow pattern**:

1. **Main Road (center E-W axis):** The wide road with `=` markings runs east-west through the middle of the map. This is the fastest route across the map but offers little cover -- high-risk, high-reward for aggressive players.

2. **North & South Halves:** Mirror each other. Each half has:
   - A large building (shops in the north, temples in the south) in the NW and NE/SW and SE corners providing hard cover.
   - Two narrow alleys (the `|` walls) creating chokepoints between the building zones and the central road.

3. **Alleys (N-S corridors):** The vertical alley walls at columns 8 and 28 create narrow north-south corridors. These are **chokepoints** -- deadly for anyone caught in the open, but useful for flanking players on the main road.

4. **Mid-map crossroads:** Where the alleys intersect the main road (around rows 11-18), there are border blocks that narrow the passages, creating ambush points.

### Strategic Zones

- **Corner Buildings (NW/NE/SW/SE):** Safe zones near spawn. Players can peek around corners. Water stations nearby encourage camping but they are exposed.

- **The Alley Gauntlet:** Running north-south through the alleys is fast but dangerous. Cover objects (tuk-tuks) at rows 8 and 21 provide brief respite.

- **Center Arena:** The open area around rows 12-17 between the two road segments is the main fighting zone. The paired cover objects (CC at row 14) provide the only mid-map cover. Controlling center = controlling both water truck timing and map flow.

- **Temple Puddles (SW/SE):** The slippery zones near temples punish careless movement. Players fighting here are slower and more vulnerable, but the temple walls provide excellent hard cover for ambushes.

### Water Economy

- 6 water refill stations ensure no one area monopolizes refills.
- Corner stations (NW/NE road hydrants) are near spawns but exposed on the main road.
- Mid-side stations (W/E mid tanks) are tucked in the border block alcoves -- safer but require detours.
- Players must balance aggression (spending water) with refill runs (vulnerability).

### Spawn Balance

- Spawns are distributed to avoid immediate spawn-fighting:
  - Corners (1,2,7,8) are far from each other with buildings for initial cover.
  - Mid spawns (3,4,5,6) are closer to action but near alley walls for quick escape.
- No spawn is more than ~6 seconds walk from a water station.

### Water Truck Tactics

- The truck crosses the main road every 30 seconds. Smart players will:
  - Bait enemies onto the road before the truck arrives.
  - Use the truck as a "wall" to block line of sight temporarily.
  - Time pushes right after the truck passes (enemies in the road are +25% wet).
- The 2-second horn warning gives players time to dodge into alleys.
