# AGENTS.md - Guidelines for AI Coding Agents

This file contains crucial instructions and contextual constraints for agentic coding tools (like Cursor, GitHub Copilot, Claude CLI, etc.) operating in the **SuperBall** repository. Please read and internalize this document entirely before proposing, planning, or making code changes.

## 1. Project Context & Core Technology Stack

SuperBall is a browser-based arcade Plinko/Pinball game, visually and mechanically inspired by *Full Tilt! Pinball (1995)*. 
- **Game Engine:** Phaser 3
- **Physics Engine:** Matter.js (integrated via Phaser)
- **Build Tool / Bundler:** Vite
- **Language:** TypeScript (Strict Mode)
- **Testing:** Vitest (Unit Tests) + Playwright (Headless/Headed E2E Tests)
- **Audio/Visuals:** 100% Procedurally generated (WebAudio API + Canvas drawing). **Do not import external image/audio files unless explicitly requested.**

---

## 2. Build, Lint, and Test Commands

When verifying your work, always use the appropriate project commands. If you are instructed to verify code, run tests, or check for errors, utilize the following CLI commands.

### Development & Build
- **Install dependencies:** `npm install`
- **Start local development server:** `npm run dev`
- **Build production bundle:** `npm run build`
- **Type-check codebase:** `npm run typecheck` (or `npx tsc --noEmit`). *Always run this after significant structural changes.*

### Testing
- **Run all unit tests:** `npm run test`
- **Run a single unit test file:** `npx vitest run path/to/test.spec.ts` 
  - *Agent Tip:* Use this targeted command to iterate quickly on specific logic, such as `RoundResult.ts` or physics math helpers, without running the entire suite.
- **Run E2E layout tests (Headless):** `npm run test:e2e` (Produces reference PNGs in `tests/screenshots/output/`).
- **Run E2E layout tests (Headed):** `npm run test:e2e:headed` (Spins up a visible Chromium instance).

### Linting & Formatting
- **Lint the codebase:** `npm run lint`
- **Fix lint errors:** `npm run lint:fix`
- **Format code:** `npm run format`

*Agent Tip:* Before finalizing any task, ensure the application builds successfully (`npm run build`) and passes type-checking without emitting errors.

---

## 3. Code Style & Architecture Guidelines

Please adhere strictly to the following conventions to maintain consistency with the existing codebase and its specific architectural quirks.

### 3.1. Types & Strictness Settings
The project enforces a highly strict `tsconfig.json` to prevent runtime crashes.
- **No Unchecked Indexed Access:** The rule `noUncheckedIndexedAccess` is active. 
  - *Action:* Always handle potential `undefined` values when accessing array elements or dictionary keys (e.g., `const item = arr[0]; if (!item) return;`).
- **Exact Optional Properties:** The rule `exactOptionalPropertyTypes` is enabled. You cannot assign `undefined` to an optional property unless `undefined` is explicitly part of the type definition.
- **Implicit Overrides:** Use the `override` keyword when overriding base class methods. This is specifically common in Phaser Scenes:
  ```typescript
  export class GameScene extends Phaser.Scene {
    override update(time: number, delta: number): void {
      // Logic here
    }
  }
  ```
- **Avoid `any`:** Strive for 100% type safety. Use `unknown` if the data type is truly dynamic, and narrow it down with type guards.

### 3.2. Naming Conventions
- **Classes / Interfaces / Types:** Use `PascalCase` (e.g., `GameScene`, `RoundResult`, `PhysicsNudgeConfig`).
- **Variables / Methods / Functions:** Use `camelCase` (e.g., `rollRound`, `launchBall`, `calculateTrajectory`).
- **Constants & Config Values:** Use `UPPER_SNAKE_CASE` (e.g., `PLAYFIELD_X1`, `LANE_SPAWN_Y`, `MAX_POWER`).
- **Private Class Properties:** Prefix strictly with an underscore `_` (e.g., `private _multiplier: number;`).
- **File Names:** Match the primary class, component, or utility exported (`GameScene.ts`, `RoundResult.ts`).

### 3.3. Architecture & Game Logic
- **Decoupled RNG & Physics:** The core constraint of SuperBall is that RNG and physics are functionally separate.
  - RNG must be resolved *first* (in `rollRound()`), before the ball is launched.
  - Physics animations are secondary. The ball's path must be subtly manipulated/nudged per frame so that it visually lands in the predetermined RNG tunnel.
- **Phaser Scene Management:**
  - `UIScene` runs **in parallel and on top of** `GameScene`.
  - **Cross-Scene Communication:** Use Phaser's event emitter rather than direct references where possible: `this.scene.get('UIScene').events.emit('ui_update', data)`.
  - **Direct Calls:** Keep public method execution between scenes to an absolute minimum to prevent tight coupling (e.g., only expose things like `GameScene.launchBall(power)`).

### 3.4. Visual & Asset Constraints
- **Pixel Art Style:** The game emulates a 1995 pinball aesthetic.
  - *No Anti-Aliasing:* When drawing shapes to the canvas or defining styles, ensure hard edges.
  - *Integer Coordinates:* Round all position coordinates (`x`, `y`) to integers (`Math.round()` or `Math.floor()`) to prevent sub-pixel blurring.
  - *Additive Blending:* Use `BlendModes.ADD` for glowing elements (e.g., lit tunnel LEDs, peg bloom effects).
- **Procedural Generation:** All textures and sounds are generated at runtime.
  - Do not try to load `.png` or `.mp3` files from a hypothetical `public/` directory.
  - Look at `PreloadScene.ts` for examples of how WebAudio API is used for synthesizing sound effects and how Phaser Graphics are used to generate textures in-memory.

### 3.5. Error Handling & Safety
- **Graceful Failures:** Avoid unhandled runtime exceptions. Use `try/catch` around volatile operations, such as parsing `localStorage` data for credit balances.
- **Null Safety:** Because of the strict TypeScript configuration, heavily utilize optional chaining (`?.`), nullish coalescing (`??`), and explicit null checks before accessing nested properties, especially within `Matter.js` collision callbacks where bodies might be unexpectedly destroyed or undefined.

### 3.6. General Formatting
- **Indentation:** Use 2 spaces for all TypeScript/JavaScript/JSON files.
- **Semicolons:** Semicolons are required at the end of statements.
- **Quotes:** Prefer single quotes (`'`) for strings, unless double quotes (`"`) are necessary to avoid escaping internal single quotes.
- **Imports:** Group external dependencies at the top, followed by a blank line, then absolute/relative internal imports.

---
**End of Context Guidelines**