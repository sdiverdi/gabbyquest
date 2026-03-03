import Phaser from 'phaser'

// Placeholder texture key – replaced by a sprite sheet later.
const TEXTURE = 'enemy_placeholder'

const DIRECTIONS = ['left', 'up', 'right', 'down'] as const
type Dir = typeof DIRECTIONS[number]

export default class Enemy {
  sprite: Phaser.Physics.Arcade.Sprite
  alive = true

  private scene: Phaser.Scene
  private speed = 45
  private dir: Dir = 'down'
  private moveTimer = 0
  private moveDuration = 0

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene

    // ── placeholder graphic (red square with angry face) ──────────────────────
    if (!scene.textures.exists(TEXTURE)) {
      const g = scene.add.graphics()

      // Body — dark red
      g.fillStyle(0xbb1111, 1)
      g.fillRect(2, 2, 28, 28)

      // Body highlight
      g.fillStyle(0xdd3333, 1)
      g.fillRect(3, 3, 12, 10)

      // Eyes — white
      g.fillStyle(0xffffff, 1)
      g.fillRect(7, 8, 6, 6)
      g.fillRect(19, 8, 6, 6)

      // Pupils — black
      g.fillStyle(0x000000, 1)
      g.fillRect(9, 10, 3, 3)
      g.fillRect(21, 10, 3, 3)

      // Angry brow
      g.fillStyle(0x660000, 1)
      g.fillRect(6, 6, 8, 2)
      g.fillRect(18, 6, 8, 2)

      // Mouth — angry frown
      g.fillStyle(0x330000, 1)
      g.fillRect(9,  21, 14, 2)
      g.fillRect(8,  20, 2,  2)
      g.fillRect(22, 20, 2,  2)

      g.generateTexture(TEXTURE, 32, 32)
      g.destroy()
    }

    this.sprite = scene.physics.add.sprite(x, y, TEXTURE)
    this.sprite.setOrigin(0.5, 0.5)
    this.sprite.setCollideWorldBounds(true)

    this.pickNewMove()
  }

  // ─────────────────────────────────────────────────────────────────────────────

  private pickNewMove(): void {
    this.dir = Phaser.Utils.Array.GetRandom([...DIRECTIONS]) as Dir
    if (Math.random() < 0.25) {
      // brief pause
      this.moveDuration = -(400 + Math.random() * 1200)
    } else {
      this.moveDuration = 900 + Math.random() * 2100
    }
    this.moveTimer = 0
  }

  die(): void {
    if (!this.alive) return
    this.alive = false

    const body = this.sprite.body as Phaser.Physics.Arcade.Body
    body.setVelocity(0, 0)
    body.enable = false          // stop physics interactions immediately

    // Death animation: red flash → fade + expand → destroy
    this.scene.tweens.add({
      targets: this.sprite,
      alpha: 0,
      scaleX: 1.8,
      scaleY: 1.8,
      duration: 350,
      ease: 'Power2',
      onStart: () => { this.sprite.setTint(0xff4444) },
      onComplete: () => { this.sprite.destroy() },
    })
  }

  update(delta: number): void {
    if (!this.alive) return

    this.moveTimer += delta

    const body = this.sprite.body as Phaser.Physics.Arcade.Body
    const pausing = this.moveDuration < 0

    if (pausing || this.moveTimer >= Math.abs(this.moveDuration)) {
      // only stop velocity when switching to/from a pause
      body.setVelocity(0, 0)
      this.pickNewMove()
      return
    }

    const vx = this.dir === 'left' ? -this.speed : this.dir === 'right' ? this.speed : 0
    const vy = this.dir === 'up'   ? -this.speed : this.dir === 'down'  ? this.speed : 0
    body.setVelocity(vx, vy)

    // Bounce off walls immediately
    if (
      (vx < 0 && body.blocked.left)  ||
      (vx > 0 && body.blocked.right) ||
      (vy < 0 && body.blocked.up)    ||
      (vy > 0 && body.blocked.down)
    ) {
      this.pickNewMove()
    }
  }
}
