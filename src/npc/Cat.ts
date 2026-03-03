import Phaser from 'phaser'

// Cat sprite row 3 of characters.png (frame size 320×320, 10× scale-up of 32×32 design)
// 8 frames per row, row index 3 → absolute frames 24–31
// Layout: walk-left(24,25), walk-up(26,27), walk-right(28,29), walk-down(30,31)
const CAT_FRAMES = {
  left:  { start: 24, end: 25 },
  up:    { start: 26, end: 27 },
  right: { start: 28, end: 29 },
  down:  { start: 30, end: 31 },
}

const DIRECTIONS = ['left', 'up', 'right', 'down'] as const
type Dir = typeof DIRECTIONS[number]

export default class Cat {
  sprite: Phaser.Physics.Arcade.Sprite
  private scene: Phaser.Scene
  private speed = 30
  private dir: Dir = 'down'
  private moveTimer = 0
  private moveDuration = 0

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene

    if (scene.textures.exists('player_sheet')) {
      this.sprite = scene.physics.add.sprite(x, y, 'player_sheet', CAT_FRAMES.down.start)
      this.sprite.setScale(0.1)
    } else {
      // Fallback: tiny coloured square
      const g = scene.add.graphics()
      g.fillStyle(0xff8800, 1)
      g.fillRect(0, 0, 32, 32)
      g.generateTexture('cat_fallback', 32, 32)
      g.destroy()
      this.sprite = scene.physics.add.sprite(x, y, 'cat_fallback')
    }

    this.sprite.setCollideWorldBounds(true)
    this.sprite.setOrigin(0.5, 0.5)

    this.pickNewMove()
  }

  private pickNewMove(): void {
    this.dir = Phaser.Utils.Array.GetRandom([...DIRECTIONS]) as Dir
    // Walk for 1–3 seconds, then pause for 0.5–1.5 s (negative duration = pause)
    const roll = Math.random()
    if (roll < 0.25) {
      // short pause
      this.moveDuration = -(500 + Math.random() * 1000)
    } else {
      this.moveDuration = 800 + Math.random() * 2200
    }
    this.moveTimer = 0
  }

  update(delta: number): void {
    this.moveTimer += delta

    const body = this.sprite.body as Phaser.Physics.Arcade.Body
    const pausing = this.moveDuration < 0

    if (pausing || this.moveTimer >= Math.abs(this.moveDuration)) {
      this.pickNewMove()
      return
    }

    const vx = this.dir === 'left' ? -this.speed : this.dir === 'right' ? this.speed : 0
    const vy = this.dir === 'up'   ? -this.speed : this.dir === 'down'  ? this.speed : 0
    body.setVelocity(vx, vy)

    // If the cat is being pushed back by a wall, pick a new direction immediately
    if (
      (vx < 0 && body.blocked.left)  ||
      (vx > 0 && body.blocked.right) ||
      (vy < 0 && body.blocked.up)    ||
      (vy > 0 && body.blocked.down)
    ) {
      this.pickNewMove()
      return
    }

    if (this.scene.textures.exists('player_sheet')) {
      const f = CAT_FRAMES[this.dir]
      const frameIndex = Math.floor(this.moveTimer / 200) % 2  // toggle every 200 ms
      this.sprite.setFrame(f.start + frameIndex)
    }
  }

  stop(): void {
    const body = this.sprite.body as Phaser.Physics.Arcade.Body
    body.setVelocity(0, 0)
    if (this.scene.textures.exists('player_sheet')) {
      this.sprite.setFrame(CAT_FRAMES[this.dir].start)
    }
  }
}
