import { test, expect } from '@playwright/test';
import fs from 'fs';

// Layout tests from idea_v2.md
test.describe('SuperBall Layout Screenshots', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the Vite dev server URL
    await page.goto('/');

    // Required gesture unlock for Headless Chromium WebAudio + interactions
    // Click in art zone / astronaut area (safe area)
    await page.mouse.click(240, 220);

    // Wait for canvas to be fully ready
    await page.waitForSelector('canvas');
  });

  test('01-idle-canvas', async ({ page }) => {
    // Idle state: wait for 2.8s settle time as per design doc
    await page.waitForTimeout(2800);

    // Capture screenshot
    const screenshotPath = 'tests/screenshots/output/01-idle-canvas.png';
    await page.locator('canvas').screenshot({ path: screenshotPath });

    expect(fs.existsSync(screenshotPath)).toBeTruthy();
  });

  test('02-round-active-canvas', async ({ page }) => {
    await page.waitForTimeout(1000); // let initial load settle

    // Simulating INSERT BEADS click (now at X: 100)
    await page.mouse.click(100, 794);

    // Wait 700ms settle
    await page.waitForTimeout(700);

    // Capture screenshot
    const screenshotPath = 'tests/screenshots/output/02-round-active-canvas.png';
    await page.locator('canvas').screenshot({ path: screenshotPath });

    expect(fs.existsSync(screenshotPath)).toBeTruthy();
  });

  test('03-ball-in-flight-canvas', async ({ page }) => {
    await page.waitForTimeout(1000); // let initial load settle

    // Simulating INSERT BEADS click
    await page.mouse.click(100, 794);
    await page.waitForTimeout(700);

    // Lever mousedown 800ms (now at X: 453)
    await page.mouse.down({ button: 'left' });
    await page.mouse.move(453, 789); // Lever zone
    await page.waitForTimeout(800);

    // Mouseup -> release lever
    await page.mouse.up();

    // Wait 1.2s for ball to hit mid-peg-field
    await page.waitForTimeout(1200);

    // Capture screenshot
    const screenshotPath = 'tests/screenshots/output/03-ball-in-flight-canvas.png';
    await page.locator('canvas').screenshot({ path: screenshotPath });

    expect(fs.existsSync(screenshotPath)).toBeTruthy();
  });

  test('04-ball-reaches-tunnel', async ({ page }) => {
    // We want to ensure that the ball actually completes a full run without getting stuck
    await page.waitForTimeout(1000);

    let roundComplete = false;
    page.on('console', (msg) => {
      console.log('E2E BROWSER LOG:', msg.text());
      if (msg.text().includes('ROUND_COMPLETE_TUNNEL_ENTRY')) {
        roundComplete = true;
      }
    });

    // Simulating INSERT BEADS click
    await page.mouse.click(100, 794);
    await page.waitForTimeout(700);

    // Pull the lever 800ms
    await page.mouse.move(453, 794); // Move to lever zone
    await page.mouse.down({ button: 'left' });
    await page.mouse.move(453, 850); // Drag down
    await page.waitForTimeout(1400); // Wait longer for full power
    await page.mouse.up();

    // Wait up to 20 seconds for the ball to traverse the pegs and hit the tunnel
    let waited = 0;
    while (!roundComplete && waited < 20000) {
      await page.waitForTimeout(500);
      waited += 500;
    }

    if (!roundComplete) {
      await page
        .locator('canvas')
        .screenshot({ path: 'tests/screenshots/output/debug-stuck-ball.png' });
      const ballPos = await page.evaluate(() => ({
        x: (window as any).debug_ball_x,
        y: (window as any).debug_ball_y,
        vx: (window as any).debug_ball_vx,
        vy: (window as any).debug_ball_vy,
      }));
      console.log('STUCK_BALL_POS:', ballPos);
    }

    expect(roundComplete).toBeTruthy();
  });
});
