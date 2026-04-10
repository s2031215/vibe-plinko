# SuperBall Design Document

## 1. Core Concept

SuperBall is a browser-based arcade Plinko/Pinball hybrid game, built using Phaser 3 and Matter.js. The game draws visual and mechanical inspiration from late-90s arcade pinball games (specifically _Full Tilt! Pinball (1995)_).

**Key Pivot:** The game relies completely on **pure physics** for ball traversal, rather than forced RNG manipulation. Payouts are determined by the physical trajectory of the ball falling through a peg grid and landing in one of 12 distinct tunnels at the bottom.

## 2. Playfield Layout & Mechanics

- **Canvas:** 480x854 pixels, strict pixel-art aesthetics, scaled to fit the browser window.
- **Shooter Lane:** Located on the right side. The player pulls a lever to charge a launch. The ball is propelled vertically based on lever charge duration (velocity clamped to prevent clipping/tunneling).
- **Curved Deflector:** Top-right corner, built using many small Matter.js rectangle segments to form a perfectly smooth arch that forces the ball to bounce leftward across the peg field.
- **Peg Field:** A grid of statically placed circular pegs with reduced elasticity.
- **Tunnels:** 12 equal-sized drop slots at the bottom of the screen.

## 3. Pure Physics Tuning

To ensure the game feels "heavy" and operates predictably without breaking physics engine limits:

- **Ball Settings:**
  - Radius: `7` (smaller hitbox to drop easily)
  - Restitution: `0.1` (low elasticity to prevent wild bounces)
  - FrictionAir: `0.005` (adds air drag to create a natural terminal velocity)
  - Speed Limit: Velocity is strictly clamped to a max speed of `50` per frame to prevent tunneling and phantom energy launches.
- **Peg Settings:**
  - Radius: `4` (small physical hitbox relative to visual size)
  - Restitution: `0.05` (almost entirely deadened bounciness)
- **World Gravity:** Y-axis gravity set to `1.0`.
- **Anti-Stuck Measures:**
  - The ball receives tiny horizontal micro-jitters if its velocity nears zero on top of a peg to prevent infinite balancing.
  - Impenetrable Outer Walls: Thick 50px invisible barriers on the top, left, and right bounds ensure the ball can never leave the playfield.
  - Failed Launch Detection: If a weak launch causes the ball to fall back down the shooter lane, the ball is destroyed, and the UI resets allowing the player to "Try Again" without losing credits.

## 4. Game Flow & Payouts (RNG Logic)

- **Insert Beads:** The player inserts 5 credits. The game randomly selects 1 to 6 winning tunnels before launch. The fewer the winning tunnels, the higher the multiplier.
- **Launch:** The player pulls and holds the lever to build power, shooting the ball into the peg field.
- **Result:**
  - If the ball lands in a lit, winning tunnel, the player wins the corresponding multiplier.
  - Upon a win, a golden bead spawns at the winning tunnel and arcs to the credit counter, triggering a visual flash and sound effect.
- **Auto-Loop:** After a round ends, if the player has at least 5 credits remaining, the game automatically resets the state and "inserts beads" for the next round. The player can immediately hold the lever again.

## 5. Visuals & Audio

- **Procedural Generation:** All textures and audio are synthesized at runtime. No external image or audio files are loaded.
- **Style:** 1995 Arcade Pixel Art. Hard edges, integer coordinates, restricted color palette (Gunmetal blues, charcoal, glowing ambers, and reds).
- **Effects:** Additive blending is used extensively for glowing elements, including lit tunnel LEDs and the "Peg Bloom" impact effect.

## 6. Development Stack

- Engine: Phaser 3 + Matter.js
- Language: TypeScript (Strict Mode)
- Bundler: Vite
- Testing: Vitest (Unit) & Playwright (E2E Headless screenshots)
