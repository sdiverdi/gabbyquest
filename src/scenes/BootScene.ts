import Phaser from 'phaser'

export default class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene')
  }

  async preload(): Promise<void> {
    // Load the character spritesheet.
    // The image is 2560x1280 with 8 columns x 4 rows — actual frame size is 320x320px
    // (the sheet is the logical 32x32 design scaled up 10x)
    this.load.spritesheet('player_sheet', 'characters.png', { frameWidth: 320, frameHeight: 320 })

    // Load the map tileset: 32×32 tiles with 1px margin and 1px spacing between tiles.
    // Sheet layout: 8 columns × 6 rows (265×199 px total).
    this.load.audio('meow', 'meow.mp3')
    this.load.audio('stab', 'stab.mp3')

    this.load.spritesheet('tilesheet', 'map.png', {
      frameWidth: 32,
      frameHeight: 32,
      margin: 1,
      spacing: 1,
    })

    await new Promise<void>((resolve) => {
      this.load.once('complete', () => resolve())
      this.load.start()
    })
  }

  create(): void {
    this.scene.start('GameScene')
  }
}
