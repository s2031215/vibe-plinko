# SuperBall — Game Design Document v2

## Overview

SuperBall is a browser-based arcade Plinko game fused with the visual and mechanical language of **Full Tilt! Pinball (1995, Maxis/Cinematronics)**. The game runs on a 480×854 portrait canvas. Players insert beads, charge a spring-loaded plunger, and launch a steel ball through a chrome peg field into one of 12 target tunnels. The winning tunnel is chosen by RNG **before** the ball is launched; the physics animation is cosmetic and guided to land on the predetermined result.

---

## Core Game Rules

| Rule                  | Detail                                                                                   |
| --------------------- | ---------------------------------------------------------------------------------------- |
| Entry cost            | 5 beads per round                                                                        |
| Raise                 | Player may insert additional multiples of 5 beads before launching, increasing the stake |
| Tunnels               | 12 equally-spaced slots at the bottom of the playfield                                   |
| Win condition         | Ball lands in a lit (winning) tunnel                                                     |
| Payout                | `total bet × multiplier`                                                                 |
| Multiplier range      | 2× – 10×                                                                                 |
| Multiplier selection  | RNG; fewer lit tunnels = rarer = higher multiplier                                       |
| Lit tunnels per round | Varies (1–6); determined by RNG before launch                                            |
| Physics               | Ball path is cosmetically random but guided to the RNG-selected tunnel                   |

---

## RNG / Physics Architecture

> **Critical constraint: RNG and physics are decoupled.**

1. **RNG runs first** — `rollRound()` selects winning tunnel(s) and multiplier the moment the player inserts beads, before any input on the launcher.
2. **Physics runs second** — the ball's path through the peg field is visually plausible (bounces, deflections) but subtly nudged each frame so the ball resolves to the RNG-selected tunnel.
3. The player never sees the nudge. The visible randomness of the peg bounce is purely cosmetic.

This matches the real arcade machine behavior: the outcome is fixed at coin-insert, the drama is in the flight.

---

## Launcher Mechanic — Full Tilt Pinball Plunger

Inspired directly by the spring-loaded plunger in Full Tilt! Pinball's Space Cadet table.

### Behavior
- **Hold to charge**: player presses and holds the lever handle. The longer they hold, the more power builds (cap: 1.5 seconds = maximum power 1.0).
- **Release to fire**: releasing the handle fires the ball with velocity proportional to charge.
  - Minimum power (tap): `vx ≈ -3.5`, `vy ≈ -5.4`
  - Maximum power (full hold): `vx ≈ -8`, `vy ≈ -12`
- **Minimum power floor**: even an instant tap gives at least 8% power so the ball always enters the peg field.

### Shooter Lane
- The ball spawns in a **dedicated shooter lane** on the bottom-right of the playfield.
- A static chrome guide wall channels the ball upward through the lane.
- The guide wall ends near the top of the peg field so the ball arcs freely leftward into the pegs.
- This replicates the right-side launch ramp on Space Cadet's table.

### Visual Feedback
| Element      | Idle                  | Charging                                 | Fired                    |
| ------------ | --------------------- | ---------------------------------------- | ------------------------ |
| Lever rod    | Resting position      | Pulls down (up to 50px)                  | Snaps back over 6 frames |
| Spring coils | 5 coils, 7px spacing  | Compresses: up to 9 coils at 2px spacing | Returns to idle          |
| Charge bar   | Hidden                | Amber → orange-red, fills bottom-up      | Clears                   |
| Status text  | "HOLD LEVER / RAISE?" | "MAX POWER!" at cap                      | "IN FLIGHT…"             |

---

## Visual Style — Full Tilt Pinball × SuperBall Pixel Art Hybrid

The playfield interior uses the **Space Cadet table** from Full Tilt! Pinball (1995) as the primary visual reference, rendered in a **pixel art** style — crisp hard-edged outlines, no sub-pixel anti-aliasing on structural shapes, dithered shading, and a tightly constrained palette per zone. Think Space Cadet's bitmapped table art redrawn at 1x pixel density.

### Pixel Art Rules
- **No anti-aliasing on hard edges**: cabinet panels, peg outlines, tunnel dividers, and button rims must have crisp pixel edges — not smoothed curves.
- **Dithered shading only**: any gradient effect (ball hemisphere, peg specular crescent, charge bar fill) is approximated with checkerboard or ordered dithering — no smooth canvas gradients.
- **Repeating tile texture**: the playfield interior uses a repeating 4x4 or 8x8 dark pixel tile pattern (e.g. navy dots on near-black) rather than a uniform solid fill.
- **Sprite-style mascot**: the astronaut is drawn as a fixed-resolution pixel sprite — 1px black outlines on all silhouette edges, flat color fills with a single highlight pixel per shape, no internal gradients.
- **Font**: `"Press Start 2P"` exclusively for all text at all sizes. This font is inherently pixel-perfect at integer sizes.
- **Glow as pixel halo**: LED glow is rendered as 3–4 concentric rings at increasing radius with decreasing opacity (e.g. r+2 @ 40%, r+4 @ 25%, r+6 @ 12%, r+8 @ 6%) — not a smooth radial gradient. Produces the classic CRT dot-matrix bloom effect.
- **Integer pixel snap**: all game object positions are rounded to integer coordinates. No half-pixel offsets anywhere.

### Aesthetic Goals
- **Dark room, glowing machine**: the cabinet is dark; only active elements (LEDs, peg bloom, the ball specular) stand out.
- **Chrome pixel style**: rails, pegs, dividers, and the lever use a pixel-art cylinder look — 1–2px bright pixels top-left for highlight, 1–2px dark pixels bottom-right for shadow, flat body fill.
- **Additive glow on active elements**: lit tunnel LEDs, peg bloom on hit, win float text — all use `BlendModes.ADD` so they appear to emit light.
- **Amber accent lines**: the arch LED strip and charge bar use `#FFB300` amber — the single warm color bridging both source aesthetics.
- **Red LEDs on winning tunnels**: unchanged from the original arcade machine. Maximum contrast against the dark navy playfield.

### Color Palette

| Role                        | Hex       | Source                     |
| --------------------------- | --------- | -------------------------- |
| Cabinet / panel body        | `#1A1E2A` | Dark gunmetal              |
| Panel rim / steel accents   | `#3A3F50` | Steel grey                 |
| Chrome rail highlight       | `#888EA0` | Full Tilt chrome           |
| Playfield interior          | `#0A1628` | Space Cadet deep navy      |
| Art zone background         | `#0D2040` | Space blue                 |
| Arch LED strip / charge bar | `#FFB300` | Amber — shared accent      |
| Peg body                    | `#3A3F50` | Chrome grey cylinder       |
| Peg specular crescent       | `#B0B8C8` | Silver highlight           |
| Peg drop shadow             | `#1A1A2E` | Navy shadow                |
| Lit tunnel LED              | `#FF1A1A` | Red — original arcade kept |
| Unlit tunnel LED            | `#1A1A2E` | Dark navy                  |
| Score display digits        | `#FF2200` | 7-segment red on black     |
| Win float text              | `#FFB300` | Amber                      |

### Peg Style — Top-Down Chrome Cylinder

Each peg is rendered as a cylindrical pin viewed from above, matching Full Tilt's pop bumper aesthetic:

```
Layer (back → front)
  1. Drop shadow:  dark circle offset (+2, +2), r = PEG_RADIUS + 1
  2. Base body:    chrome grey circle, r = PEG_RADIUS
  3. Mid ring:     lighter grey circle, r = PEG_RADIUS × 0.65
  4. Specular:     silver crescent circle offset (-2, -2), r = PEG_RADIUS × 0.38
  5. Glint:        white point, 1px, offset (-3, -3)
```

Physics hitbox: **circle**, `radius = 6`. `restitution = 0.5`.

On collision with ball: **bloom FX** — additive white circle, r expands 8 → 22, alpha fades 0.6 → 0 over ~200ms.

### Ball Style — Heavy Steel Sphere

```
Layer (back → front)
  1. Drop shadow:     black oval, offset (+2, +3), alpha 0.45
  2. Shadow hemi:     dark navy-black fill (#1A1A2A), r = 12
  3. Chrome mid:      steel grey (#6A6E78), r = 11
  4. Highlight ring:  lighter chrome (#9AA0AC), r = 8
  5. Specular:        silver-white (#C8CDD4), top-left, r = 5
  6. Hot glint:       white, 2px
```

### Art Zone Mascot — Astronaut

Replaces the original pink bunny. A cartoon astronaut in Space Cadet style:
- **Helmet**: `#4A7FA8` blue-grey sphere with `#0D2040` dark visor; chrome glint arc top-left; star reflections in visor
- **Torso**: blue-grey suit body with shoulder pads
- **Chest badge**: amber `#FFB300` panel with "SB" label
- **Antenna**: chrome rod with red `#FF1A1A` LED tip
- **Mission rank ring**: Space Cadet-inspired ring of 12 dots below the mascot — every 3rd dot is amber, the rest steel grey
- **Star field**: 28 deterministic white dots behind the astronaut (fixed seed, stable between rounds)

---

## Layout

### Pixel dimensions (480 × 854 canvas)

```
Zone            Y start   Y end   Height   Notes
─────────────── ──────── ──────── ──────── ──────────────────────────────────────
TOP PANEL            0     154     154px   ~18% — gunmetal, logo, score, LEDs
ART ZONE           154     317     163px   ~28% of playfield — stars, astronaut
PEG FIELD          317     648     331px   ~57% of playfield — pegs, ball travel
TUNNEL ROW         648     735      87px   ~15% of playfield — 12 slots, red LEDs
BOTTOM PANEL       734     854     120px   ~14% — INSERT/RAISE buttons, lever
```

```
X constants
───────────────────────────────────────
PLAYFIELD_X1 = 10      (left rail)
PLAYFIELD_X2 = 470     (right rail)
LANE_GUIDE_X = 436     (left wall of shooter lane)
LANE_X       = 453     (ball centre in lane)
```

### ASCII diagram

```
┌──────────────────────────────────┐
│         TOP PANEL                │  Y 0 → 154
│  [SuperBall logo]  [99]  [LEDs]  │  Dark gunmetal, amber accent line at bottom
├──────────────────────────────────┤
│  ╭──────────────────────────╮    │
│  │  ART ZONE (no pegs)      │    │  Y 154 → 317  space blue, stars, astronaut
│  │  astronaut + rank ring   │    │
│  ├────────────────────────┬─┤    │
│  │                        │ │    │
│  │  PEG FIELD             │L│    │  Y 317 → 648  navy, chrome pegs
│  │  staggered chrome pins │A│    │  7 cols odd rows, 6 cols even rows
│  │  6 – 9 rows            │N│    │  ≥ 6 rows, 36px row spacing
│  │                        │E│    │
│  │              ○ ← ball  │ │    │  ball spawns at TUNNEL_Y - 30 (bottom-right)
│  ├────────────────────────┴─┤    │
│  │  TUNNEL ROW (12 slots)   │    │  Y 648 → 735  dark slots, red LED indicators
│  ╰──────────────────────────╯    │
├──────────────────────────────────┤
│     BOTTOM CONTROL PANEL         │  Y 734 → 854
│  [INSERT btn]  [LEVER]  [RAISE]  │  Dark gunmetal, amber accent line at top
└──────────────────────────────────┘
```

### Playfield Details
- **Arch border**: `#FFB300` amber rounded-rect stroke, 3px, bridging art zone and peg field
- **Side rails**: chrome gradient strips — `#888EA0` highlight → `#3A3F50` shadow
- **Tunnel dividers**: chrome `#888EA0`, 2px vertical strips
- **Tunnel interior**: `#050B14` near-black per slot
- **Tunnel LED indicators**: two-layer glow (outer halo 25% alpha, inner 50% alpha, solid core 5px) + white glint for lit; flat `#1A1A2E` for unlit

### Shooter Lane (right side)

```
X: LANE_GUIDE_X (436) → PLAYFIELD_X2 (470)   width = 34px
Y: PEG_FIELD_Y  (317) → TUNNEL_Y      (648)   full peg field height
Ball spawn: LANE_X=453, LANE_SPAWN_Y = TUNNEL_Y - 30 ≈ 618
```

- Ball sits at the **bottom-right** of the lane before launch
- On lever release the ball launches **upward-left** into the peg field
- Left boundary: chrome guide wall — Matter static body (`label:'lane_guide'`) + visual chrome line, runs full peg field height
- Right boundary: main playfield wall at `PLAYFIELD_X2`
- Entry flare: chrome angle lines at top of lane opening leftward into peg field
- **Ceiling wall**: Matter static body at `y = PEG_FIELD_Y`, full width, `restitution 0.4` — prevents ball escaping above the peg field

---

## Peg Grid

| Property                      | Value                                        |
| ----------------------------- | -------------------------------------------- |
| Columns (odd rows)            | 7                                            |
| Columns (even rows)           | 6 (offset by half column spacing)            |
| Minimum rows                  | 6                                            |
| Actual rows                   | `Math.max(6, floor(PEG_FIELD_H / ROW_SPACING))` ≈ 9 |
| Peg radius (visual + physics) | 6px                                          |
| Left offset                   | 26px from `PLAYFIELD_X1`                     |
| Column spacing                | 52px                                         |
| Row spacing                   | `PEG_RADIUS × 6` = 36px                      |
| Physics restitution           | 0.5                                          |
| Physics friction              | 0.05                                         |

---

## Tunnel Row

| Property               | Value                                            |
| ---------------------- | ------------------------------------------------ |
| Count                  | 12                                               |
| Width per tunnel       | `GAME_WIDTH / 12 = 40px`                         |
| LED lit color          | `#FF1A1A` red, multi-layer radial glow           |
| LED unlit color        | `#1A1A2E` dark navy                              |
| Divider style          | Chrome `#888EA0`, 2px                            |
| Floor sensors          | Matter sensor rectangles, `label = "tunnel_N"`   |
| Divider physics bodies | 3px wide static rectangles, `restitution = 0.1`  |
| V-funnel guides        | Chrome lines flaring ±6px above each divider top |

---

## UI Panels

### Top Panel
- Background: `#1A1E2A` gunmetal
- Amber accent line at bottom edge
- **Logo badge**: `#0D1520` dark inset, chrome border, "SuperBall" in `#B0B8C8` silver
- **Score display**: black backing, `#FF2200` red 7-segment digits, ghost segments `#1A0000`
- **Multiplier LED row**: 5 dots for `[2×, 4×, 6×, 8×, 10×]`; active = `#FF1A1A` red, inactive = `#1A1A2E`
- **Status text**: `#B0B8C8` silver (idle/info), `#FFB300` amber (betting), `#FF4444` red (error/no win), `#FFB300` amber (win)

### Bottom Control Panel
- Background: `#1A1E2A` gunmetal
- Amber accent line at top edge
- **INSERT BEADS button**: charcoal face `#4A5060`, steel rim `#3A3F50`
- **RAISE button**: deep blue face `#2A4A8A`, deep blue rim `#1A3A6A`
- **Coin lock**: chrome `#888EA0` decorative circle, center
- **Brand badge**: dark inset with chrome border, "SuperBall" in `#888EA0`

### Game Over Overlay
- Semi-transparent black fill + dark `#1A1E2A` panel with amber border
- "GAME OVER" in `#FF2200` red, 32px
- "PLAY AGAIN" button: steel rim, amber border, chrome text

---

## Sound FX (Synthesised — No Audio Files)

All sounds are generated via WebAudio API at startup and stored as `AudioBuffer` in the Phaser scene registry.

| Key          | Description               | Generation                                 |
| ------------ | ------------------------- | ------------------------------------------ |
| `sfx_launch` | Plunger snap + whoosh     | White noise burst, exp decay 18×, 0.15s    |
| `sfx_peg`    | Metallic click on peg hit | Sine wave 800–1200Hz, exp decay 40×, 0.06s |
| `sfx_win`    | Rising 4-note chime       | C5→E5→G5→C6 sequence, 0.8s                 |
| `sfx_lose`   | Falling drone             | Sine descend 300→100Hz, 0.4s               |

---

## Screenshot Tests (Visual Layout Review)

Playwright + Chromium is used to produce reference screenshots of the three key game states for visual layout review. These are **not pixel-regression tests** — they exist so a developer can quickly see the full canvas in each state without running the game manually.

### Setup

```
npm run test:e2e          # headless — produces PNGs, no browser window
npm run test:e2e:headed   # headed  — Chromium window visible during run
```

Output files land in `tests/screenshots/output/` (gitignored).

### Test Viewport

The Playwright project sets `browserName: 'chromium'` with `viewport: { width: 480, height: 854 }` — matching the Phaser canvas exactly so Scale.FIT renders at 1:1 with no letterboxing or coordinate offset.

> **Do not** use `...devices['Desktop Chrome']` in the project config — it overrides the viewport to 1280x720 and breaks all canvas coordinate math.

### Three Captured States

| File | State | How it is reached |
|---|---|---|
| `01-idle-canvas.png` | Idle — INSERT button visible, 20 credits, all LEDs off | Page load + 2.8s settle |
| `02-round-active-canvas.png` | Round active — multiplier dot lit, tunnel LEDs lit, ball at spawn, RAISE button visible | Gesture-unlock click → INSERT BEADS click → 700ms settle |
| `03-ball-in-flight-canvas.png` | Ball in flight — "IN FLIGHT..." status, ball mid-peg-field, peg bloom FX visible | Above + lever mousedown 800ms → mouseup → 1.2s settle |

### Gesture Unlock

Headless Chromium requires a real user gesture before Phaser pointer events register on game objects. The spec clicks the canvas at `(240, 220)` (art zone / astronaut — safe area with no buttons) before any game interaction.

### Canvas Coordinate Reference

All coordinates are logical canvas pixels (0,0 = top-left of the 480x854 canvas):

```
INSERT btn  (75,  794)   — left of bottom panel
RAISE btn   (405, 794)   — right of bottom panel
Lever zone  (288, 789)   — centre of lever hit zone
```

### Spec Location

`tests/screenshots/layout.spec.ts`

---

## Technical Stack

| Layer       | Technology                            |
| ----------- | ------------------------------------- |
| Engine      | Phaser 3 + Matter.js physics          |
| Build       | Vite + TypeScript strict mode         |
| Canvas      | 480 × 854, `Scale.FIT + CENTER_BOTH`  |
| Tests       | Vitest (node environment, no browser) |
| Audio       | WebAudio API (synthesised, no files)  |
| Persistence | `localStorage` for credit balance     |

### Source Layout

```
src/
  main.ts                   Phaser.Game entry — scene list, physics config
  rng/RoundResult.ts        rollRound() — RNG only, no physics
  physics/BallGuide.ts      Nudge helpers — reads RoundResult, steers ball
  scenes/PreloadScene.ts    Loading bar, ball texture gen, sound FX synthesis
  scenes/GameScene.ts       Playfield, pegs, ball, tunnel sensors, physics loop
  scenes/UIScene.ts         Top panel, credit display, lever, RAISE button
```

### Key Architecture Rules
- `UIScene` runs **on top of** `GameScene` in the scene list.
- Cross-scene communication is via `this.scene.get('UIScene').events.emit(...)`.
- `GameScene.launchBall(power: number)` and `GameScene.beginRound()` are the **only** public methods `UIScene` calls directly on `GameScene`.
- `tsconfig.json` has `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes` — array accesses require null checks.
- `Scene.update()` requires the `override` keyword (`noImplicitOverride: true`).
- Ball texture is generated **once** in `PreloadScene` to avoid Phaser cache key conflicts.
- Gravity nudge is applied via `this.matter.body.setVelocity()` each frame (engine gravity is not directly writable via Phaser types).
- Matter gravity: `{ x: 0, y: 0.4 }` — reduced from default 1.0 for slower, more readable ball traversal.
