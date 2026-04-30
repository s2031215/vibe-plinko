# SuperBall

SuperBall is a browser-based arcade Plinko/Pinball game inspired by *Full Tilt! Pinball (1995)*. It uses Phaser 3 with Matter.js, and all visuals/audio are generated procedurally at runtime.
<img width="512" height="873" alt="image" src="https://github.com/user-attachments/assets/11348250-67f1-4077-80ea-5eaa04721613" />

## Requirements

- Node.js 18+

## Quick Start

```bash
npm install
npm run dev
```

Open `http://localhost:3000` in your browser.

## Scripts

- `npm run dev` - Start the dev server
- `npm run build` - Typecheck and build for production
- `npm run preview` - Preview the production build
- `npm run test` - Run unit tests (Vitest)
- `npm run test:e2e` - Run Playwright layout tests
- `npm run test:e2e:headed` - Run Playwright layout tests (headed)
- `npm run lint` - Lint the codebase
- `npm run format` - Format TypeScript files

## Project Notes

- RNG is resolved before physics; the ball is guided afterward.
- Assets are generated at runtime (no external images or audio).
- Canvas is fixed to a 480x854 design and scaled to fit mobile screens.

## Tests and Screenshots

Playwright layout tests generate images under `tests/screenshots/output/`. Those files are not tracked in git.
