import Phaser from 'phaser';
import { rollRound, RoundResultData } from '../rng/RoundResult';

type GameState = 'idle' | 'betting' | 'charging' | 'in_flight';

export class UIScene extends Phaser.Scene {
  private static readonly BASE_WIDTH = 480;
  private static readonly BASE_HEIGHT = 854;
  private _credits: number = 100;
  private _state: GameState = 'idle';
  private _betAmount: number = 0;
  private _chargeStartTime: number = 0;
  private _debugMultiBall: boolean = false;

  // UI Elements that update
  private _scoreText!: Phaser.GameObjects.Text;
  private _multiplierLEDs: Phaser.GameObjects.Image[] = [];
  private _statusText!: Phaser.GameObjects.Text;
  private _chargeBarFill!: Phaser.GameObjects.Rectangle;
  private _potentialWinText!: Phaser.GameObjects.Text;

  // Lever elements
  private _leverHandle!: Phaser.GameObjects.Arc;
  private _leverHighlight!: Phaser.GameObjects.Arc;
  private _leverBaseY: number = 754; // BOTTOM_Y + 20
  private _leverMaxPull: number = 70;

  private _roundData: RoundResultData | undefined;
  private _gameOverContainer?: Phaser.GameObjects.Container;
  private _activeGameSceneKey: 'GameScene' | 'MoonScene' = 'GameScene';
  private _travelLocked: boolean = false;

  constructor() {
    super('UIScene');
  }

  create() {
    this.applyViewport();
    this.scale.on('resize', this.applyViewport, this);

    // Scaffold UI panels, buttons, LED strips, Lever
    this.createTopPanel();
    this.createBottomPanel();
    this.createOverlay();

    // Example: Bind insert beads button
    // The GameScene handles logic, UIScene just reads/sends events

    this.onInsertBeads();

    this.input.keyboard?.on('keydown-B', () => {
      this._debugMultiBall = !this._debugMultiBall;
      this.setStatusText(this._debugMultiBall ? 'DEBUG: MULTIBALL' : 'DEBUG: OFF', '#ffb300');
    });

    this.input.keyboard?.on('keydown-F', this.onCheatCredits, this);
    this.input.keyboard?.on('keydown-M', this.onToggleMap, this);
  }

  override update(time: number, _delta: number): void {
    // Handle lever charge animation if active
    if (this._state === 'charging') {
      const chargeDuration = time - this._chargeStartTime;
      const ratio = Phaser.Math.Clamp(chargeDuration / 1500, 0, 1);
      const newY = this._leverBaseY + ratio * this._leverMaxPull;

      this._leverHandle.y = newY;
      this._leverHighlight.y = newY;

      this._chargeBarFill.scaleY = ratio;
      this.emitToGameScene('spring_charge', ratio);
      if (ratio === 1) {
        this.setStatusText('MAX POWER!', '#ff2200');
        this._chargeBarFill.fillColor = 0xff2200;
      }
    }
  }

  private createTopPanel() {
    // 0 -> 154: Gunmetal
    this.add.rectangle(0, 0, 480, 154, 0x1a1e2a).setOrigin(0);
    // Amber accent
    this.add.rectangle(0, 151, 480, 3, 0xffb300).setOrigin(0);

    this._statusText = this.add
      .text(240, 20, 'INSERT BEADS', {
        fontFamily: '"Press Start 2P"',
        fontSize: '14px',
        color: '#b0b8c8',
      })
      .setOrigin(0.5);

    // Logo badge
    this.add.rectangle(70, 60, 120, 56, 0x050b14).setOrigin(0.5);
    this.add.rectangle(70, 60, 114, 50, 0x0d1520).setOrigin(0.5); // inner inset
    this.add
      .text(70, 60, 'SUPER\nBALL', {
        fontFamily: '"Press Start 2P"',
        fontSize: '14px',
        color: '#b0b8c8',
        align: 'center',
      })
      .setOrigin(0.5);

    // Score / credits display (shifted to right)
    this.add.rectangle(370, 60, 150, 56, 0x000000).setOrigin(0.5);
    this._scoreText = this.add
      .text(370, 60, this._credits.toString().padStart(4, '0'), {
        fontFamily: '"Press Start 2P"',
        fontSize: '36px',
        color: '#ff2200',
      })
      .setOrigin(0.5);

    // Bet x multiplier display (same row as logo)
    this.add.rectangle(215, 60, 150, 56, 0x0d1520).setOrigin(0.5);
    this._potentialWinText = this.add
      .text(215, 60, 'BET x MULT\n0 x 0 = 0', {
        fontFamily: '"Press Start 2P"',
        fontSize: '13px',
        color: '#b0b8c8',
        align: 'center',
      })
      .setOrigin(0.5);

    // Multiplier LEDs (placeholder unlit)
    const mults = [2, 4, 6, 8, 10];
    this._multiplierLEDs = [];
    mults.forEach((m, idx) => {
      const led = this.add.image(120 + idx * 60, 126, 'led_unlit');
      this._multiplierLEDs.push(led);
      this.add
        .text(120 + idx * 60, 142, m + 'X', {
          fontFamily: '"Press Start 2P"',
          fontSize: '10px',
          color: '#b0b8c8',
        })
        .setOrigin(0.5);
    });
  }

  private createBottomPanel() {
    // 734 -> 854
    const BOTTOM_Y = 734;
    this.add.rectangle(0, BOTTOM_Y, 480, 120, 0x1a1e2a).setOrigin(0);
    this.add.rectangle(0, BOTTOM_Y, 480, 3, 0xffb300).setOrigin(0);

    // Preset bet chips (single row)
    const chipValues = [5, 10, 50, 100];
    const chipStartX = 70;
    const chipY = BOTTOM_Y + 50;
    const chipSpacing = 80;
    const chipWidth = 70;
    const chipHeight = 56;

    chipValues.forEach((value, index) => {
      const chipX = chipStartX + index * chipSpacing;
      const chip = this.add
        .rectangle(chipX, chipY, chipWidth, chipHeight, 0x2a4a8a)
        .setInteractive({ cursor: 'pointer' });
      chip.setStrokeStyle(4, 0x1a3a6a);
      this.add
        .text(chipX, chipY, `+${value}`, {
          fontFamily: '"Press Start 2P"',
          fontSize: '14px',
          color: '#ffffff',
        })
        .setOrigin(0.5);

      chip.on('pointerdown', () => this.onBetChip(value));
    });


    // Charge bar (hidden initially)
    this.add.rectangle(416, BOTTOM_Y + 56, 10, 96, 0x050b14).setOrigin(0.5);
    this._chargeBarFill = this.add
      .rectangle(416, BOTTOM_Y + 104, 10, 96, 0xffb300)
      .setOrigin(0.5, 1);
    this._chargeBarFill.scaleY = 0;

    // Lever slot background
    this.add.rectangle(458, BOTTOM_Y + 56, 12, 96, 0x050b14).setOrigin(0.5);
    // Lever shaft
    this.add.rectangle(458, BOTTOM_Y + 46, 4, 76, 0x888ea0).setOrigin(0.5);
    // Lever handle (resting at top of slot)
    this._leverHandle = this.add.circle(458, BOTTOM_Y + 16, 14, 0x3a3f50); // main handle
    this._leverHighlight = this.add.circle(458, BOTTOM_Y + 16, 6, 0x4a5060); // handle highlight

    this._leverBaseY = BOTTOM_Y + 16;
    this._leverMaxPull = 70;

    // Interactive hit zone for the lever
    const leverHitZone = this.add
      .zone(458, BOTTOM_Y + 56, 50, 120)
      .setInteractive({ cursor: 'pointer' });
    leverHitZone.on('pointerdown', this.onLeverDown, this);
    this.input.on('pointerup', this.onLeverUp, this);

    // Listen for events from GameScene
    this.bindGameSceneEvents(this._activeGameSceneKey);
  }

  private onInsertBeads(): void {
    if (this._state === 'idle') {
      if (this._credits >= 5) {
        this.updateCredits(this._credits - 5);
        this._betAmount = 5;
        this._state = 'betting';
        this.setStatusText('HOLD LEVER / RAISE?', '#ffb300');

        this._roundData = rollRound();

        this.emitToGameScene('prepare_ball', this._roundData);

        if (this._potentialWinText) {
          this._potentialWinText.setText(
            `BET x MULT\n${this._betAmount} x ${this._roundData.multiplier} = ${
              this._betAmount * this._roundData.multiplier
            }`
          );
        }

        // Update multiplier LEDs
        const mults = [2, 4, 6, 8, 10];
        const ledIndex = mults.indexOf(this._roundData.multiplier);
        this._multiplierLEDs.forEach((led, i) => {
          led.setTexture(i === ledIndex ? 'led_lit' : 'led_unlit');
        });

        // Tell GameScene to update the tunnel colors
        this.emitToGameScene('ui_update_tunnels', this._roundData.winningTunnels);
      }
    }
  }

  private onBetChip(amount: number): void {
    if (this._state === 'betting') {
      if (this._credits >= amount) {
        this.updateCredits(this._credits - amount);
        this._betAmount += amount;

        if (this._roundData && this._potentialWinText) {
          this._potentialWinText.setText(
            `BET x MULT\n${this._betAmount} x ${this._roundData.multiplier} = ${
              this._betAmount * this._roundData.multiplier
            }`
          );
        }
      }
    }
  }

  private onCheatCredits(): void {
    this.updateCredits(this._credits + 500);
  }

  private onToggleMap(): void {
    const isMoonActive = this.scene.isActive('MoonScene');
    const isGameActive = this.scene.isActive('GameScene');

    if (isMoonActive) {
      this.scene.stop('MoonScene');
      this.scene.launch('GameScene');
      this.setActiveGameScene('GameScene');
      return;
    }

    if (isGameActive) {
      this.scene.stop('GameScene');
      this.scene.launch('MoonScene');
      this.setActiveGameScene('MoonScene');
      return;
    }
  }

  private setActiveGameScene(key: 'GameScene' | 'MoonScene'): void {
    if (this._activeGameSceneKey === key) return;
    this.unbindGameSceneEvents(this._activeGameSceneKey);
    this._activeGameSceneKey = key;
    this.bindGameSceneEvents(this._activeGameSceneKey);
    this.emitToGameScene('ui_update_credits', this._credits);
    const tunnels = this._roundData ? this._roundData.winningTunnels : [];
    this.time.delayedCall(0, () => {
      this.emitToGameScene('ui_update_tunnels', tunnels);
    });
  }

  private bindGameSceneEvents(key: 'GameScene' | 'MoonScene'): void {
    const scene = this.scene.get(key);
    scene.events.on('round_complete', this.onRoundComplete, this);
    scene.events.on('failed_launch', this.onFailedLaunch, this);
    scene.events.on('map_travel_complete', this.onMapTravelComplete, this);
    scene.events.on('map_travel_begin', this.onMapTravelBegin, this);
  }

  private unbindGameSceneEvents(key: 'GameScene' | 'MoonScene'): void {
    const scene = this.scene.get(key);
    scene.events.off('round_complete', this.onRoundComplete, this);
    scene.events.off('failed_launch', this.onFailedLaunch, this);
    scene.events.off('map_travel_complete', this.onMapTravelComplete, this);
    scene.events.off('map_travel_begin', this.onMapTravelBegin, this);
  }

  private emitToGameScene(eventName: string, ...args: unknown[]): void {
    const scene = this.scene.get(this._activeGameSceneKey);
    scene.events.emit(eventName, ...args);
  }

  private onLeverDown(): void {
    if (this._state === 'betting' && !this._travelLocked) {
      this._state = 'charging';
      this._chargeStartTime = this.time.now;
      this.setStatusText('CHARGING...', '#ffb300');
      this._chargeBarFill.fillColor = 0xffb300;
    }
  }

  private onLeverUp(): void {
    if (this._state === 'charging' && !this._travelLocked) {
      this._state = 'in_flight';
      this.setStatusText('IN FLIGHT...', '#b0b8c8');
      this._chargeBarFill.scaleY = 0;
      this.emitToGameScene('spring_charge', 0);

      const chargeDuration = this.time.now - this._chargeStartTime;
      const power = Phaser.Math.Clamp(chargeDuration / 1500, 0.08, 1.0); // max 1.5s, min 8%

      // Snap lever back
      this._leverHandle.y = this._leverBaseY;
      this._leverHighlight.y = this._leverBaseY;

      // Tell game scene to launch
      const ballCount = this._debugMultiBall ? 10 : 1;
      this.emitToGameScene('launchBall', power, this._roundData, ballCount);
    }
  }

  private onFailedLaunch(): void {
    if (this._state === 'in_flight') {
      this._state = 'betting';
      this.setStatusText('TRY AGAIN / HOLD LEVER', '#ffb300');
    }
  }

  private onRoundComplete(data: { isWin: boolean; multiplier: number; tunnelIndex: number }): void {
    const payout = this._betAmount * data.multiplier;

    this.setStatusText(
      data.isWin ? `WIN +${payout} BEADS` : 'NO WIN / TRY AGAIN',
      data.isWin ? '#ffb300' : '#b0b8c8'
    );

    if (data.isWin) {
      // Calculate start position from tunnelIndex
      const slotWidth = 426 / 12;
      const tunnelX = 10 + data.tunnelIndex * slotWidth + slotWidth / 2;
      const tunnelY = 648 + 43;

      // Create a visual bead that flies to the score
      const bead = this.add.image(tunnelX, tunnelY, 'ball');
      bead.setTint(0xffb300);
      bead.setBlendMode(Phaser.BlendModes.ADD);

      // Add a cool arc using a path or just tween x and y
      this.tweens.add({
        targets: bead,
        x: 330,
        y: 60,
        duration: 800,
        ease: 'Cubic.easeIn',
        onComplete: () => {
          bead.destroy();
          this.sound.play('sfx_win');
          this.updateCredits(this._credits + payout);
          this.showFloatText(`+${payout} BEADS`, 330, 60, '#FFB300');
          this.playBeadWinFX();
          this.resetRoundState();
        },
      });
    } else {
      this.sound.play('sfx_lose');
      this.showFloatText('+0 BEADS', 330, 60, '#888ea0');
      this.time.delayedCall(600, () => this.resetRoundState());
    }
  }

  private resetRoundState(): void {
    // Reset multiplier LEDs first
    this._multiplierLEDs.forEach((led) => led.setTexture('led_unlit'));

    // Reset state
    this._state = 'idle';
    this._betAmount = 0;
    this._roundData = undefined;

    if (this._potentialWinText) {
      this._potentialWinText.setText('BET x MULT\n0 x 0 = 0');
      this._potentialWinText.setColor('#b0b8c8');
    }

    if (this._credits < 5) {
      this.showGameOver();
    } else {
      // Automatically "loop" and insert beads if the player has credits!
      this.onInsertBeads();
    }
  }

  private onMapTravelBegin(): void {
    this._travelLocked = true;
    this._state = 'idle';
    this.setStatusText('TRAVELING...', '#ffb300');
  }

  private onMapTravelComplete(): void {
    this._travelLocked = false;
    if (this._activeGameSceneKey !== 'MoonScene') {
      this.scene.stop('GameScene');
      this.scene.launch('MoonScene');
      this.setActiveGameScene('MoonScene');
    }
  }

  private playBeadWinFX(): void {
    // Scale up score text
    this.tweens.add({
      targets: this._scoreText,
      scaleX: 1.5,
      scaleY: 1.5,
      duration: 150,
      yoyo: true,
      ease: 'Power2',
    });

    // Add a little bloom/flash behind the score text
    const flash = this.add.circle(330, 60, 30, 0xffb300, 0.8);
    flash.setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({
      targets: flash,
      scale: 2,
      alpha: 0,
      duration: 400,
      onComplete: () => flash.destroy(),
    });
  }

  private showFloatText(msg: string, x: number, y: number, color: string) {
    const txt = this.add
      .text(x, y, msg, {
        fontFamily: '"Press Start 2P"',
        fontSize: '24px',
        color: color,
      })
      .setOrigin(0.5);
    txt.setBlendMode(Phaser.BlendModes.ADD);

    this.tweens.add({
      targets: txt,
      y: y - 40,
      alpha: 0,
      duration: 1500,
      ease: 'Power2',
      onComplete: () => txt.destroy(),
    });
  }

  private setStatusText(msg: string, color: string) {
    if (this._statusText) {
      this._statusText.setText(msg);
      this._statusText.setColor(color);
    }
  }

  private createOverlay() {
    this._gameOverContainer = this.add.container(0, 0);
    this._gameOverContainer.setVisible(false);

    // Semi-transparent background
    const bg = this.add.rectangle(0, 0, 480, 854, 0x000000, 0.8).setOrigin(0);
    this._gameOverContainer.add(bg);

    // Panel
    const panel = this.add.rectangle(240, 427, 300, 160, 0x1a1e2a).setOrigin(0.5);
    panel.setStrokeStyle(4, 0xffb300);
    this._gameOverContainer.add(panel);

    // Game Over text
    const goText = this.add
      .text(240, 390, 'GAME OVER', {
        fontFamily: '"Press Start 2P"',
        fontSize: '24px',
        color: '#ff2200',
      })
      .setOrigin(0.5);
    this._gameOverContainer.add(goText);

    // Play Again button
    const btn = this.add
      .rectangle(240, 460, 200, 50, 0x3a3f50)
      .setInteractive({ cursor: 'pointer' });
    btn.setStrokeStyle(2, 0xffb300);
    const btnText = this.add
      .text(240, 460, 'PLAY AGAIN', {
        fontFamily: '"Press Start 2P"',
        fontSize: '14px',
        color: '#888ea0',
      })
      .setOrigin(0.5);

    this._gameOverContainer.add([btn, btnText]);

    btn.on('pointerdown', () => {
      this._gameOverContainer?.setVisible(false);
      this.updateCredits(100);
      this._state = 'idle';
      this.setStatusText('INSERT BEADS', '#b0b8c8');
      this.onInsertBeads();
    });
  }

  private applyViewport(): void {
    const { width, height } = this.scale;
    const zoom = Math.min(width / UIScene.BASE_WIDTH, height / UIScene.BASE_HEIGHT);
    const roundedZoom = Math.max(0.5, Math.floor(zoom * 100) / 100);
    this.cameras.main.setZoom(roundedZoom);
    this.cameras.main.centerOn(UIScene.BASE_WIDTH / 2, UIScene.BASE_HEIGHT / 2);
  }

  private showGameOver() {
    this._gameOverContainer?.setVisible(true);
  }

  public updateCredits(val: number): void {
    this._credits = val;
    if (this._credits < 0) this._credits = 0;
    // Update score text
    if (this._scoreText) {
      this._scoreText.setText(this._credits.toString().padStart(4, '0'));
    }
    this.emitToGameScene('ui_update_credits', this._credits);
  }
}
