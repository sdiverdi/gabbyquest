import Phaser from 'phaser'
import Player from '../player/Player'
import Cat from '../npc/Cat'
import Enemy from '../npc/Enemy'

// ─── Tile frame indices for map.png ─────────────────────────────────────────
// Sheet: 8 cols × 6 rows, 32×32 px tiles, 1px margin, 1px spacing.
// Frame number = row * 8 + col  (0-indexed, left-to-right, top-to-bottom).

// Stone-brick wall pieces (rows 0-2, cols 0-2)
const WALL_TL = 0   // top-left corner
const WALL_T  = 1   // top edge
const WALL_TR = 2   // top-right corner
const WALL_L  = 8   // left edge
const WALL_C  = 9   // solid center fill
const WALL_R  = 10  // right edge
const WALL_BL = 16  // bottom-left corner
const WALL_B  = 17  // bottom edge
const WALL_BR = 18  // bottom-right corner

// Floor
const SAND    = 5   // plain desert sand
const ROUGH   = 13  // sand with scattered-stone stipple

// Decorations (visual only — no physics)
const CACTUS  = 30  // blooming cactus
const ROCKS   = 31  // rock pile
const PLANT_A = 37  // aloe / agave
const PLANT_B = 38  // dried scrub
const PLANT_C = 39  // green succulent
const SIGN    = 45  // wooden signpost
const SHRUB_A = 46  // dark round shrub
const SHRUB_B = 47  // green round bush
// ─────────────────────────────────────────────────────────────────────────────

export default class GameScene extends Phaser.Scene {
  cursors!: Phaser.Types.Input.Keyboard.CursorKeys
  player!: Player
  cat!: Cat
  walls!: Phaser.Physics.Arcade.StaticGroup
  enemy: Enemy | null = null
  hearts: Phaser.GameObjects.Image[] = []
  health: number = 3

  private invincibleUntil = 0   // timestamp — player can't take damage before this
  private wasStabbing = false   // edge-detect stab so hit fires once per press

  constructor() {
    super('GameScene')
  }

  create(): void {
    const TILE = 32
    const mapW = 20
    const mapH = 15

    const hasTilesheet  = this.textures.exists('tilesheet')
    const hasPlayerSheet = this.textures.exists('player_sheet')

    // ── fallback procedural textures ──────────────────────────────────────────
    const g = this.add.graphics()
    g.fillStyle(0x666666, 1)
    g.fillRect(0, 0, TILE, TILE)
    g.generateTexture('tile', TILE, TILE)

    if (hasPlayerSheet) {
      g.destroy()
      // Normal costume layout (row 0, 32×32 frames):
      // 0=walk_left_1, 1=walk_left_2, 2=stand_left
      // 3=walk_up_1,   4=walk_up_2,   5=stand_up
      // 6=walk_right_1,7=walk_right_2, 8=stand_right
      // 9=walk_down_1, 10=walk_down_2, 11=stand_down
      this.anims.create({
        key: 'walk-down',
        frames: this.anims.generateFrameNumbers('player_sheet', { start: 9, end: 10 }),
        frameRate: 6,
        repeat: -1
      })
      this.anims.create({
        key: 'walk-up',
        frames: this.anims.generateFrameNumbers('player_sheet', { start: 3, end: 4 }),
        frameRate: 6,
        repeat: -1
      })
      this.anims.create({
        key: 'walk-left',
        frames: this.anims.generateFrameNumbers('player_sheet', { start: 0, end: 1 }),
        frameRate: 6,
        repeat: -1
      })
      this.anims.create({
        key: 'walk-right',
        frames: this.anims.generateFrameNumbers('player_sheet', { start: 6, end: 7 }),
        frameRate: 6,
        repeat: -1
      })
    } else {
      // No spritesheet: create procedural textures and animations (fallback)
      const makePlayerFrame = (key: string, color: number, inset = 0) => {
        g.clear()
        g.fillStyle(color, 1)
        g.fillRect(inset, inset, TILE - inset * 2, TILE - inset * 2)
        g.generateTexture(key, TILE, TILE)
      }

      // down (green), up (blue), left (red), right (yellow)
      makePlayerFrame('player_down_1',  0x00cc00, 0)
      makePlayerFrame('player_down_2',  0x00aa00, 4)
      makePlayerFrame('player_up_1',    0x0066ff, 0)
      makePlayerFrame('player_up_2',    0x0044dd, 4)
      makePlayerFrame('player_left_1',  0xcc0000, 0)
      makePlayerFrame('player_left_2',  0xaa0000, 4)
      makePlayerFrame('player_right_1', 0xffcc00, 0)
      makePlayerFrame('player_right_2', 0xffaa00, 4)
      g.destroy()

      this.anims.create({
        key: 'walk-down',
        frames: [{ key: 'player_down_1' }, { key: 'player_down_2' }],
        frameRate: 6, repeat: -1
      })
      this.anims.create({
        key: 'walk-up',
        frames: [{ key: 'player_up_1' }, { key: 'player_up_2' }],
        frameRate: 6, repeat: -1
      })
      this.anims.create({
        key: 'walk-left',
        frames: [{ key: 'player_left_1' }, { key: 'player_left_2' }],
        frameRate: 6, repeat: -1
      })
      this.anims.create({
        key: 'walk-right',
        frames: [{ key: 'player_right_1' }, { key: 'player_right_2' }],
        frameRate: 6, repeat: -1
      })
    }

    // ── floor layer (drawn before walls so walls appear on top) ───────────────
    if (hasTilesheet) {
      // Sand everywhere
      for (let ty = 0; ty < mapH; ty++) {
        for (let tx = 0; tx < mapW; tx++) {
          this.add.image(tx * TILE + TILE / 2, ty * TILE + TILE / 2, 'tilesheet', SAND)
        }
      }
      // Rough-sand accent patches for variety
      const roughSpots: [number, number][] = [
        [2, 2], [3, 2], [2, 3],
        [16, 10], [17, 10], [16, 11],
      ]
      for (const [tx, ty] of roughSpots) {
        this.add.image(tx * TILE + TILE / 2, ty * TILE + TILE / 2, 'tilesheet', ROUGH)
      }
    } else {
      // Fallback: sandy-brown background fill
      const bg = this.add.graphics()
      bg.fillStyle(0xc8906a, 1)
      bg.fillRect(0, 0, mapW * TILE, mapH * TILE)
    }

    // ── walls (with physics) ──────────────────────────────────────────────────
    this.walls = this.physics.add.staticGroup()
    const walls = this.walls

    if (hasTilesheet) {
      const aw = (tx: number, ty: number, frame: number) =>
        (walls.create(tx * TILE + TILE / 2, ty * TILE + TILE / 2, 'tilesheet', frame) as Phaser.Physics.Arcade.Image)
          .setOrigin(0.5)
          .refreshBody()

      // Border corners
      aw(0,       0,       WALL_TL)
      aw(mapW-1,  0,       WALL_TR)
      aw(0,       mapH-1,  WALL_BL)
      aw(mapW-1,  mapH-1,  WALL_BR)

      // Top & bottom edges
      for (let x = 1; x < mapW - 1; x++) {
        aw(x, 0,      WALL_T)
        aw(x, mapH-1, WALL_B)
      }
      // Left & right edges
      for (let y = 1; y < mapH - 1; y++) {
        aw(0,       y, WALL_L)
        aw(mapW-1,  y, WALL_R)
      }

      // Inner obstacle — horizontal brick wall
      for (let x = 4; x < 8; x++) {
        aw(x, 6, WALL_C)
      }

      // ── decorations (visual only, no collision) ─────────────────────────────
      const decos: [number, number, number][] = [
        [15, 2, CACTUS],
        [17, 3, ROCKS],
        [2,  11, PLANT_A],
        [3,  12, PLANT_B],
        [17, 12, PLANT_C],
        [9,  12, SIGN],
        [13,  3, SHRUB_A],
        [14,  2, SHRUB_B],
      ]
      for (const [tx, ty, frame] of decos) {
        this.add.image(tx * TILE + TILE / 2, ty * TILE + TILE / 2, 'tilesheet', frame)
      }
    } else {
      // Fallback: plain gray placeholder tiles for all walls
      for (let x = 0; x < mapW; x++) {
        walls.create(x * TILE + TILE / 2, 0 * TILE + TILE / 2, 'tile').setOrigin(0.5).refreshBody()
        walls.create(x * TILE + TILE / 2, (mapH-1) * TILE + TILE / 2, 'tile').setOrigin(0.5).refreshBody()
      }
      for (let y = 1; y < mapH - 1; y++) {
        walls.create(0 * TILE + TILE / 2, y * TILE + TILE / 2, 'tile').setOrigin(0.5).refreshBody()
        walls.create((mapW-1) * TILE + TILE / 2, y * TILE + TILE / 2, 'tile').setOrigin(0.5).refreshBody()
      }
      for (let x = 4; x < 8; x++) {
        walls.create(x * TILE + TILE / 2, 6 * TILE + TILE / 2, 'tile').setOrigin(0.5).refreshBody()
      }
    }

    // ── player ────────────────────────────────────────────────────────────────
    const playerTexture = hasPlayerSheet ? 'player_sheet' : 'player_down_1'
    this.player = new Player(this, (mapW * TILE) / 2, (mapH * TILE) / 2, playerTexture)

    this.physics.add.collider(this.player.sprite, walls)

    // ── enemy ─────────────────────────────────────────────────────────────────
    this.spawnEnemy()

    // ── cat NPC ───────────────────────────────────────────────────────────────
    this.cat = new Cat(this, 5 * TILE + TILE / 2, 5 * TILE + TILE / 2)
    this.physics.add.collider(this.cat.sprite, walls)
    this.physics.add.overlap(this.cat.sprite, this.player.sprite, () => {
      if (this.sound.get('meow')?.isPlaying) return
      this.sound.play('meow')
    })

    // ── physics world bounds ──────────────────────────────────────────────────
    this.physics.world.setBounds(0, 0, mapW * TILE, mapH * TILE)

    // ── camera ────────────────────────────────────────────────────────────────
    this.cameras.main.setBounds(0, 0, mapW * TILE, mapH * TILE)
    this.cameras.main.startFollow(this.player.sprite, true, 0.08, 0.08)
    this.cameras.main.setZoom(1)   // tiles are now 32 px — zoom 1× keeps the same on-screen size

    this.cursors = this.input.keyboard!.createCursorKeys()

    // ── HUD: health bar (3 hearts, fixed to camera) ───────────────────────────
    const makeHeartTexture = (key: string, color: number) => {
      const hg = this.add.graphics()
      hg.fillStyle(color, 1)
      const S = 3 // px per pixel
      const px = (col: number, row: number) => hg.fillRect(col * S, row * S, S, S)
      // 7×6 pixel-art heart shape
      px(1, 0); px(2, 0); px(4, 0); px(5, 0)
      px(0, 1); px(1, 1); px(2, 1); px(3, 1); px(4, 1); px(5, 1); px(6, 1)
      px(0, 2); px(1, 2); px(2, 2); px(3, 2); px(4, 2); px(5, 2); px(6, 2)
      px(1, 3); px(2, 3); px(3, 3); px(4, 3); px(5, 3)
      px(2, 4); px(3, 4); px(4, 4)
      px(3, 5)
      hg.generateTexture(key, 7 * S, 6 * S)
      hg.destroy()
    }
    makeHeartTexture('heart_full',  0xff3333)
    makeHeartTexture('heart_empty', 0x552222)

    const heartW = 7 * 3   // 21 px
    const heartGap = 5
    for (let i = 0; i < 3; i++) {
      const heart = this.add.image(10 + i * (heartW + heartGap), 10, 'heart_full')
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(20)
      this.hearts.push(heart)
    }
  }

  /** Update the visible hearts (call with 0–3). */
  setHealth(hp: number): void {
    this.health = Phaser.Math.Clamp(hp, 0, 3)
    for (let i = 0; i < this.hearts.length; i++) {
      this.hearts[i].setTexture(i < this.health ? 'heart_full' : 'heart_empty')
    }
  }

  // ── enemy management ─────────────────────────────────────────────────────

  /** Spawn a new enemy at a random position well away from the player. */
  private spawnEnemy(): void {
    const TILE = 32
    const mapW = 20
    const mapH = 15

    let ex = 0, ey = 0
    let attempts = 0
    do {
      const tx = 1 + Math.floor(Math.random() * (mapW - 2))
      const ty = 1 + Math.floor(Math.random() * (mapH - 2))
      ex = tx * TILE + TILE / 2
      ey = ty * TILE + TILE / 2
      attempts++
    } while (
      attempts < 30 &&
      Phaser.Math.Distance.Between(ex, ey, this.player.sprite.x, this.player.sprite.y) < 5 * TILE
    )

    this.enemy = new Enemy(this, ex, ey)
    this.physics.add.collider(this.enemy.sprite, this.walls)
    this.physics.add.overlap(
      this.player.sprite,
      this.enemy.sprite,
      () => this.handleEnemyContact(),
    )
  }

  /** Called when the sword hits the enemy. */
  private killEnemy(): void {
    if (!this.enemy?.alive) return
    this.enemy.die()
    this.enemy = null
    // Respawn after 3–6 seconds
    const delay = 3000 + Math.random() * 3000
    this.time.delayedCall(delay, () => this.spawnEnemy())
  }

  /** Called each frame while player & enemy overlap. */
  private handleEnemyContact(): void {
    if (!this.enemy?.alive) return
    const now = this.time.now
    if (now < this.invincibleUntil) return
    this.invincibleUntil = now + 1500  // 1.5 s grace period
    this.setHealth(this.health - 1)
    // Flicker the player sprite to signal damage
    this.tweens.add({
      targets: this.player.sprite,
      alpha: 0.2,
      duration: 80,
      yoyo: true,
      repeat: 5,
      onComplete: () => { this.player.sprite.setAlpha(1) },
    })
  }

  update(_time: number, delta: number): void {
    this.player.update(this.cursors)
    this.cat.update(delta)
    this.enemy?.update(delta)

    // Detect the leading edge of a stab to fire the sword-hit check exactly once.
    const nowStabbing = this.player.stabbing
    if (nowStabbing && !this.wasStabbing) {
      if (this.enemy?.alive) {
        const zone = this.player.getSwordHitZone()
        if (Phaser.Geom.Rectangle.Contains(zone, this.enemy.sprite.x, this.enemy.sprite.y)) {
          this.killEnemy()
        }
      }
    }
    this.wasStabbing = nowStabbing
  }
}
