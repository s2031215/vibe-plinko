import Phaser from 'phaser';
import { PreloadScene } from './scenes/PreloadScene';
import { GameScene } from './scenes/GameScene';
import { UIScene } from './scenes/UIScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: 480,
  height: 854,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  backgroundColor: '#1A1E2A',
  scene: [PreloadScene, GameScene, UIScene],
  physics: {
    default: 'matter',
    matter: {
      gravity: { x: 0, y: 1.0 }, // Adjusted to give ball more weight so it drops through pegs reliably
      debug: true, // Turn on for collision visualization if needed
    },
  },
  pixelArt: true, // No anti-aliasing
  antialias: false,
  roundPixels: true,
};

export default new Phaser.Game(config);
