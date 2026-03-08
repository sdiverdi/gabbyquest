import Phaser from 'phaser'

export default class TitleScene extends Phaser.Scene {
  constructor() {
    super('TitleScene')
  }

  create(): void {
    // Display the title image filling the 320×240 game canvas exactly
    this.add.image(160, 120, 'title')

    // Advance on any keyboard key or pointer click
    const advance = () => this.scene.start('GameScene')

    this.input.keyboard!.once('keydown', advance)
    this.input.once('pointerdown', advance)
  }
}
