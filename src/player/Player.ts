import Phaser from 'phaser'

export default class Player {
  scene: Phaser.Scene
  sprite: Phaser.Physics.Arcade.Sprite
  speed = 100
  lastDirection: 'down' | 'up' | 'left' | 'right' = 'down'

  private swordGraphics: Phaser.GameObjects.Graphics
  private isStabbing = false
  private spaceKey: Phaser.Input.Keyboard.Key

  constructor(scene: Phaser.Scene, x: number, y: number, texture: string) {
    this.scene = scene
    // If a loaded player spritesheet exists, create sprite using that sheet (frame 0),
    // otherwise use the procedural single-frame texture keys like 'player_down_1'.
    if (this.scene.textures.exists('player_sheet') && texture === 'player_sheet') {
      this.sprite = this.scene.physics.add.sprite(x, y, texture, 0) as Phaser.Physics.Arcade.Sprite
    } else {
      this.sprite = this.scene.physics.add.sprite(x, y, texture) as Phaser.Physics.Arcade.Sprite
    }
    this.sprite.setCollideWorldBounds(true)
    this.sprite.setOrigin(0.5, 0.5)
    // Scale the 320×320 sprite frame down to fit the 32px world grid (320 → 32 = 0.1).
    // Fallback textures are already generated at 32×32, so they need no scaling.
    this.sprite.setScale(
      (this.scene.textures.exists('player_sheet') && texture === 'player_sheet') ? 0.1 : 1.0
    )

    this.swordGraphics = this.scene.add.graphics()
    this.spaceKey = this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)
  }

  private stab(): void {
    if (this.isStabbing) return
    this.isStabbing = true

    this.scene.sound.play('stab')

    // Dismiss the sword after 180 ms
    this.scene.time.delayedCall(180, () => {
      this.swordGraphics.clear()
      this.isStabbing = false
    })
  }

  /** True while the stab animation is active (used by scene for hit detection). */
  get stabbing(): boolean { return this.isStabbing }

  /**
   * Returns the rectangular hit zone of the sword in world-space.
   * The sword extends ~14–42 px in front of the player with ~16 px lateral tolerance.
   */
  getSwordHitZone(): Phaser.Geom.Rectangle {
    const cx = this.sprite.x
    const cy = this.sprite.y
    const half = 16
    const zones: Record<string, Phaser.Geom.Rectangle> = {
      right: new Phaser.Geom.Rectangle(cx + 14, cy - half, 28, half * 2),
      left:  new Phaser.Geom.Rectangle(cx - 42, cy - half, 28, half * 2),
      down:  new Phaser.Geom.Rectangle(cx - half, cy + 14, half * 2, 28),
      up:    new Phaser.Geom.Rectangle(cx - half, cy - 42, half * 2, 28),
    }
    return zones[this.lastDirection]
  }

  private drawSword(): void {
    const cx = this.sprite.x
    const cy = this.sprite.y

    // Offsets: sword starts at the sprite edge (~14px) and extends 28px outward
    const offsets: Record<string, [number, number, number, number]> = {
      right: [ 14,  0,  42,  0],
      left:  [-14,  0, -42,  0],
      down:  [  0, 14,   0, 42],
      up:    [  0,-14,   0,-42],
    }
    const [x1, y1, x2, y2] = offsets[this.lastDirection]

    this.swordGraphics.clear()
    this.swordGraphics.lineStyle(5, 0xdde4ff, 1)   // thick silver-blue sword line
    this.swordGraphics.beginPath()
    this.swordGraphics.moveTo(cx + x1, cy + y1)
    this.swordGraphics.lineTo(cx + x2, cy + y2)
    this.swordGraphics.strokePath()
  }

  update(cursors: Phaser.Types.Input.Keyboard.CursorKeys) {
    // Stab on spacebar press
    if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
      this.stab()
    }

    // Redraw sword every frame so it tracks the player's position
    if (this.isStabbing) {
      this.drawSword()
    }

    const body = this.sprite.body as Phaser.Physics.Arcade.Body
    body.setVelocity(0, 0)

    if (!cursors) return

    if (cursors.left?.isDown) {
      body.setVelocityX(-this.speed)
    } else if (cursors.right?.isDown) {
      body.setVelocityX(this.speed)
    }

    if (cursors.up?.isDown) {
      body.setVelocityY(-this.speed)
    } else if (cursors.down?.isDown) {
      body.setVelocityY(this.speed)
    }

    // normalize diagonal velocity so diagonal isn't faster
    body.velocity.normalize().scale(this.speed)

    // decide direction and animations
    const vx = body.velocity.x
    const vy = body.velocity.y

    if (vx === 0 && vy === 0) {
      // idle — stop animation and set idle texture
      this.sprite.anims.stop()
      if (this.scene.textures.exists('player_sheet')) {
        // Stand frames: stand_left=2, stand_up=5, stand_right=8, stand_down=11
        const frameMap: Record<string, number> = { down: 11, up: 5, left: 2, right: 8 }
        this.sprite.setFrame(frameMap[this.lastDirection])
      } else {
        this.sprite.setTexture(`player_${this.lastDirection}_1`)
      }
      return
    }

    let dir: 'down' | 'up' | 'left' | 'right' = this.lastDirection
    // prefer horizontal movement when both present
    if (vx > 0) dir = 'right'
    else if (vx < 0) dir = 'left'
    else if (vy > 0) dir = 'down'
    else if (vy < 0) dir = 'up'

    this.lastDirection = dir
    this.sprite.anims.play(`walk-${dir}`, true)
  }
}
