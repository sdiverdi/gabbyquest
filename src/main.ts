import Phaser from 'phaser'
import BootScene from './scenes/BootScene'
import TitleScene from './scenes/TitleScene'
import GameScene from './scenes/GameScene'

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 320,
  height: 240,
  parent: 'game',
  pixelArt: true,
  roundPixels: true,
  zoom: 2,
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false
    }
  },
  scene: [BootScene, TitleScene, GameScene]
}

new Phaser.Game(config)
