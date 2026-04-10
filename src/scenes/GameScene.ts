import Phaser from 'phaser';
import { RoundResultData } from '../rng/RoundResult';

export class GameScene extends Phaser.Scene {
  private _ball: Phaser.Physics.Matter.Sprite | undefined;
  private _currentRoundData: RoundResultData | undefined;

  private _tunnelLEDs: Phaser.GameObjects.Image[] = [];

  constructor() {
    super('GameScene');
  }

  create() {
    // Scaffold out physics playfield, pegs, tunnel sensors
    this.createPlayfield();
    this.createPegGrid();
    this.createTunnels();

    // Set world bounds (left, top, right, bottom)
    this.matter.world.setBounds(0, 0, 480, 854);

    // Launching logic hooks
    this.events.on('launchBall', this.launchBall, this);
    this.events.on('ui_update_tunnels', this.updateTunnels, this);

    this.matter.world.on('collisionstart', (event: MatterJS.IEventCollision<MatterJS.Body>) => {
      for (const pair of event.pairs) {
        this.checkTunnelCollision(pair.bodyA as MatterJS.BodyType, pair.bodyB as MatterJS.BodyType);
        this.checkPegCollision(pair.bodyA as MatterJS.BodyType, pair.bodyB as MatterJS.BodyType);
      }
    });
  }

  override update(_time: number, _delta: number): void {
    // Expose ball coordinates for e2e tests
    if (this._ball) {
      (window as any).debug_ball_x = this._ball.x;
      (window as any).debug_ball_y = this._ball.y;
      (window as any).debug_ball_vx = this._ball.body?.velocity.x;
      (window as any).debug_ball_vy = this._ball.body?.velocity.y;

      const body = this._ball.body as MatterJS.BodyType;

      if (body) {
        // 1. Strict Speed Limit (Clamp velocity to prevent tunneling and phantom energy launches)
        // Set MAX_SPEED high enough to allow the full power launch (which is up to -45 vy)
        const MAX_SPEED = 50;
        const currentSpeed = Math.sqrt(body.velocity.x ** 2 + body.velocity.y ** 2);
        if (currentSpeed > MAX_SPEED) {
          const scale = MAX_SPEED / currentSpeed;
          this.matter.body.setVelocity(body, {
            x: body.velocity.x * scale,
            y: body.velocity.y * scale,
          });
        }

        // 2. Prevent perfect balancing on pegs
        if (this._ball.y > 200 && this._ball.y < 640) {
          if (Math.abs(body.velocity.y) < 0.2 && Math.abs(body.velocity.x) < 0.2) {
            const forceX = Math.random() > 0.5 ? 0.02 : -0.02;
            this._ball.applyForce(new Phaser.Math.Vector2(forceX, 0.01));
          }
        }

        // 3. Failed launch detection (fell back down shooter lane)
        if (this._ball.y > 740 && this._ball.x > 430) {
          this.scene.get('UIScene').events.emit('failed_launch');
          this._ball.destroy();
          this._ball = undefined;
        }
      }
    }
  }

  private createPlayfield() {
    // Backgrounds
    // Art Zone (154 -> 317)
    this.add.rectangle(10, 154, 460, 163, 0x0d2040).setOrigin(0);
    // Peg Field (317 -> 648)
    const bgTile = this.add.tileSprite(10, 317, 426, 331, 'bg_tile').setOrigin(0);
    bgTile.alpha = 0.5; // Tone down the dithering a bit

    // Arch Border
    const g = this.add.graphics();
    g.lineStyle(3, 0xffb300);
    g.strokeRoundedRect(10, 154, 460, 580, 20); // covers art zone, peg field, tunnels, and lane

    // Side rails (gradient simulation + physics)
    this.add.rectangle(0, 154, 10, 580, 0x3a3f50).setOrigin(0); // left rail
    // Widen invisible wall outside the left edge to prevent tunneling
    this.matter.add.rectangle(-20, 154 + 290, 50, 580, { isStatic: true });

    this.add.rectangle(470, 154, 10, 580, 0x3a3f50).setOrigin(0); // right rail
    // Widen invisible wall outside the right edge to prevent tunneling
    this.matter.add.rectangle(500, 154 + 290, 50, 580, { isStatic: true });

    // Ceiling wall (widen to 50 thick, moved 20px up so the bottom edge sits exactly at 154)
    this.matter.add.rectangle(240, 154 - 25, 480, 50, { isStatic: true });

    // Lane Guide (right side) - start lower at 350 so ball can escape
    const LANE_GUIDE_X = 436;
    const LANE_GUIDE_Y = 350;
    const LANE_GUIDE_HEIGHT = 734 - LANE_GUIDE_Y; // 384
    this.add.rectangle(LANE_GUIDE_X, LANE_GUIDE_Y, 4, LANE_GUIDE_HEIGHT, 0x888ea0).setOrigin(0); // chrome guide wall
    this.matter.add.rectangle(
      LANE_GUIDE_X + 2,
      LANE_GUIDE_Y + LANE_GUIDE_HEIGHT / 2,
      4,
      LANE_GUIDE_HEIGHT,
      { isStatic: true }
    );
    this.matter.add.circle(LANE_GUIDE_X + 2, LANE_GUIDE_Y, 2, { isStatic: true, restitution: 0.4 });

    // Solid Curved Deflector Block in top right
    g.fillStyle(0x1a1e2a); // gunmetal cabinet color
    g.beginPath();
    g.moveTo(380, 154); // start on ceiling
    g.lineTo(470, 154); // over to corner
    g.lineTo(470, 260); // down right wall

    // Smooth curve back up
    const curve = new Phaser.Curves.QuadraticBezier(
      new Phaser.Math.Vector2(470, 260), // Start (bottom right)
      new Phaser.Math.Vector2(460, 180), // Control point
      new Phaser.Math.Vector2(380, 154) // End (ceiling)
    );
    const curvePoints = curve.getPoints(16);
    curvePoints.forEach((p) => g.lineTo(p.x, p.y));

    g.closePath();
    g.fillPath();

    // Chrome face of the curved deflector
    g.lineStyle(4, 0x888ea0);
    g.beginPath();
    curvePoints.forEach((p, index) => {
      if (index === 0) g.moveTo(p.x, p.y);
      else g.lineTo(p.x, p.y);
    });
    g.strokePath();

    // Physics for curved deflector using small rectangles (segments) to ensure perfect alignment
    for (let i = 0; i < curvePoints.length - 1; i++) {
      const p1 = curvePoints[i];
      const p2 = curvePoints[i + 1];
      if (!p1 || !p2) continue;

      const cx = (p1.x + p2.x) / 2;
      const cy = (p1.y + p2.y) / 2;
      const angle = Phaser.Math.Angle.Between(p1.x, p1.y, p2.x, p2.y);
      const length = Phaser.Math.Distance.Between(p1.x, p1.y, p2.x, p2.y);

      this.matter.add.rectangle(cx, cy, length, 4, {
        isStatic: true,
        angle: angle,
        restitution: 0.2,
      });

      // Smooth out the joints with tiny circles so the ball never snags on a corner
      this.matter.add.circle(p1.x, p1.y, 2, {
        isStatic: true,
        restitution: 0.2,
      });
    }
    const lastP = curvePoints[curvePoints.length - 1];
    if (lastP) {
      this.matter.add.circle(lastP.x, lastP.y, 2, { isStatic: true, restitution: 0.2 });
    }

    // Also add the vertical right wall part of the deflector (down to 260)
    // The right rail goes from 154 -> 734. The curve ends at 470, 260.
    // The ball needs to smoothly hit the curve from the right wall.

    // (Removed old thin 10px ceiling wall since the new 50px thick one is declared above)

    // Astronaut Mascot in Art Zone
    this.add.image(210, 235, 'astronaut'); // shifted slightly left

    // Draw 28 deterministic stars in art zone
    const rng = new Phaser.Math.RandomDataGenerator('stars_seed');
    g.fillStyle(0xffffff);
    for (let i = 0; i < 28; i++) {
      g.fillRect(rng.integerInRange(20, 420), rng.integerInRange(160, 300), 2, 2);
    }
  }

  private createPegGrid() {
    // 9 cols even rows, 8 cols odd rows to make spacing wider
    // Y: 317 -> 648
    const PLAYFIELD_X1 = 10;
    const ROW_SPACING = 48; // increased from 36
    const COL_SPACING = 48; // increased from 44
    const LEFT_OFFSET = 18; // pushed close to left wall
    const PEG_FIELD_Y = 317;

    let rows = Math.max(5, Math.floor(331 / ROW_SPACING));

    for (let r = 0; r < rows; r++) {
      const isIndented = r % 2 === 1;
      const cols = isIndented ? 8 : 9;
      const xOffset = isIndented ? LEFT_OFFSET + COL_SPACING / 2 : LEFT_OFFSET;

      for (let c = 0; c < cols; c++) {
        const px = PLAYFIELD_X1 + xOffset + c * COL_SPACING;
        const py = PEG_FIELD_Y + 20 + r * ROW_SPACING;

        // Skip rightmost pegs if they cross into shooter lane (436)
        if (px < 420) {
          this.matter.add.image(px, py, 'peg', undefined, {
            isStatic: true,
            circleRadius: 4, // Smaller hitbox (reduced from 6)
            restitution: 0.05, // extremely low elasticity so ball doesn't bounce off
            friction: 0.05,
            label: 'peg', // Give it a label so we can identify collisions
          });
        }
      }
    }
  }

  private createTunnels() {
    // 12 slots, red LEDs
    // Y: 648 -> 735
    const TUNNEL_Y = 648;
    const TUNNEL_HEIGHT = 86;

    this.add.rectangle(10, TUNNEL_Y, 426, TUNNEL_HEIGHT, 0x050b14).setOrigin(0);

    const slotWidth = 426 / 12; // 35.5px

    for (let i = 0; i < 12; i++) {
      const x = 10 + i * slotWidth;
      // Divider
      this.add.rectangle(x, TUNNEL_Y, 2, TUNNEL_HEIGHT, 0x888ea0).setOrigin(0);
      this.matter.add.rectangle(x + 1, TUNNEL_Y + TUNNEL_HEIGHT / 2, 3, TUNNEL_HEIGHT, {
        isStatic: true,
        restitution: 0.1,
      });

      // Unlit LED (vertically centered in the 86px tall tunnel)
      const led = this.add.image(x + slotWidth / 2, TUNNEL_Y + TUNNEL_HEIGHT / 2, 'led_unlit');
      this._tunnelLEDs.push(led);

      // Add a sensor at the bottom of the tunnel to detect the ball
      const sensorHeight = 10;
      this.matter.add.rectangle(
        x + slotWidth / 2,
        TUNNEL_Y + TUNNEL_HEIGHT - sensorHeight / 2,
        slotWidth - 4, // slightly narrower than the slot
        sensorHeight,
        {
          isStatic: true,
          isSensor: true,
          label: `tunnel_sensor_${i}`,
        }
      );
    }
  }

  public updateTunnels(winningTunnels: number[]): void {
    this._tunnelLEDs.forEach((led, idx) => {
      led.setTexture(winningTunnels.includes(idx) ? 'led_lit' : 'led_unlit');
    });
  }

  public launchBall(power: number, roundData: RoundResultData): void {
    // If ball exists, destroy it before spawning a new one
    if (this._ball) {
      this._ball.destroy();
    }

    this.sound.play('sfx_launch');

    this._currentRoundData = roundData;

    // Spawn ball from shooter lane
    const spawnX = 453;
    const spawnY = 720;

    this._ball = this.matter.add.sprite(spawnX, spawnY, 'ball', undefined, {
      circleRadius: 7, // Reduced from 10 to make hitbox smaller
      restitution: 0.1, // Reduced to 0.1 to eliminate high bounces on pegs
      friction: 0.001,
      frictionAir: 0.005, // Slightly increased from 0.001 to bleed off speed continuously as it drops
      label: 'ball',
    });
    // Prevent the ball from ever sleeping
    if (this._ball.body) {
      this.matter.body.set(this._ball.body as MatterJS.BodyType, 'sleepThreshold', -1);
    }

    // Apply velocity proportional to charge power
    // Shooting straight up the lane
    const minVy = -25;
    const maxVy = -45;
    const vy = minVy + (maxVy - minVy) * power;

    this._ball.setVelocity(0, vy);
  }

  public beginRound(): void {
    // Initialize betting cycle
  }

  private checkTunnelCollision(bodyA: MatterJS.BodyType, bodyB: MatterJS.BodyType): void {
    if (!this._ball || !this._currentRoundData) return;

    // Check if either body is the ball
    const isBallA = bodyA.gameObject === this._ball;
    const isBallB = bodyB.gameObject === this._ball;

    if (!isBallA && !isBallB) return;

    // Identify which body is the tunnel sensor
    const sensorBody = isBallA ? bodyB : bodyA;

    // The tunnel sensor's label should start with 'tunnel_sensor_'
    if (sensorBody.label && sensorBody.label.startsWith('tunnel_sensor_')) {
      const tunnelIndexStr = sensorBody.label.replace('tunnel_sensor_', '');
      const tunnelIndex = parseInt(tunnelIndexStr, 10);

      this.handleTunnelEntry(tunnelIndex);
    }
  }

  private checkPegCollision(bodyA: MatterJS.BodyType, bodyB: MatterJS.BodyType): void {
    if (!this._ball) return;

    const isBallA = bodyA.gameObject === this._ball;
    const isBallB = bodyB.gameObject === this._ball;

    if (!isBallA && !isBallB) return;

    const pegBody = isBallA ? bodyB : bodyA;

    if (pegBody.label === 'peg' && pegBody.gameObject) {
      this.triggerPegBloom(pegBody.gameObject as Phaser.Physics.Matter.Image);
    }
  }

  private triggerPegBloom(pegImage: Phaser.Physics.Matter.Image): void {
    this.sound.play('sfx_peg', { volume: 0.5 });

    // 1. Create a bloom sprite exactly over the peg
    const bloom = this.add.sprite(pegImage.x, pegImage.y - 2, 'peg_bloom'); // shift up slightly to center over the ball part of the peg
    bloom.setBlendMode(Phaser.BlendModes.ADD);

    // Pick a random vibrant color from the palette
    const colors = [0xffb300, 0x00d9ff, 0xff0055, 0x00ff88, 0xbf00ff];
    const tint = colors[Math.floor(Math.random() * colors.length)];
    if (tint !== undefined) bloom.setTint(tint);

    // 2. Animate it scaling up and fading out
    this.tweens.add({
      targets: bloom,
      scale: 1.5,
      alpha: 0,
      duration: 300,
      ease: 'Power2',
      onComplete: () => {
        bloom.destroy();
      },
    });

    // 3. Very subtle camera shake to sell the impact
    this.cameras.main.shake(100, 0.002);
  }

  private handleTunnelEntry(tunnelIndex: number): void {
    if (!this._currentRoundData) return;

    console.log('ROUND_COMPLETE_TUNNEL_ENTRY');

    // Verify it hit a winning tunnel
    const isWin = this._currentRoundData.winningTunnels.includes(tunnelIndex);
    // Determine payout (We'll assume the bet was tracked by UI, but we can pass back multiplier)
    const multiplier = isWin ? this._currentRoundData.multiplier : 0;

    // Cleanup the ball
    if (this._ball) {
      this._ball.destroy();
      this._ball = undefined;
    }

    // Reset visual tunnels
    this.updateTunnels([]);

    // Inform UIScene
    this.scene.get('UIScene').events.emit('round_complete', { isWin, multiplier, tunnelIndex });

    this._currentRoundData = undefined;
  }
}
