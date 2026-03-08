import Phaser from 'phaser'
import Cat from '../npc/Cat'
import Enemy from '../npc/Enemy'
import Player from '../player/Player'
import EditorManager from '../editor/EditorManager'
import ChunkStore from '../world/ChunkStore'
import MapManager from '../world/MapManager'
import {
  CAT_WORLD_X,
  CAT_WORLD_Y,
  START_WORLD_X,
  START_WORLD_Y,
  WORLD_CONFIG,
  WORLD_PIXEL_HEIGHT,
  WORLD_PIXEL_WIDTH,
} from '../world/worldConfig'

export default class GameScene extends Phaser.Scene {
  cursors!: Phaser.Types.Input.Keyboard.CursorKeys
  wasd!: { up: Phaser.Input.Keyboard.Key; down: Phaser.Input.Keyboard.Key; left: Phaser.Input.Keyboard.Key; right: Phaser.Input.Keyboard.Key }
  player!: Player
  cat!: Cat
  enemy: Enemy | null = null
  hearts: Phaser.GameObjects.Image[] = []
  health = 3

  private invincibleUntil = 0
  private wasStabbing = false
  private mapManager!: MapManager
  private editor!: EditorManager
  private currentChunkKey = ''

  constructor() {
    super('GameScene')
  }

  create(): void {
    this.health = 3
    this.invincibleUntil = 0
    this.wasStabbing = false
    this.hearts = []
    this.enemy = null

    this.buildPlayerAnimations()

    const store = new ChunkStore(WORLD_CONFIG)
    this.mapManager = new MapManager(this, store, WORLD_CONFIG)

    this.physics.world.setBounds(0, 0, WORLD_PIXEL_WIDTH, WORLD_PIXEL_HEIGHT)

    const playerTexture = this.textures.exists('player_sheet') ? 'player_sheet' : 'player_down_1'
    this.player = new Player(this, START_WORLD_X, START_WORLD_Y, playerTexture)
    this.player.sprite.setDepth(25)

    this.mapManager.registerColliderTarget(this.player.sprite)
    this.loadChunksNearPlayer(true)

    this.spawnEnemy()

    this.cat = new Cat(this, CAT_WORLD_X, CAT_WORLD_Y)
    this.cat.sprite.setDepth(24)
    this.mapManager.registerColliderTarget(this.cat.sprite)
    this.physics.add.overlap(this.cat.sprite, this.player.sprite, () => {
      if (this.sound.get('meow')?.isPlaying) return
      this.sound.play('meow')
    })

    this.cameras.main.setBounds(0, 0, WORLD_PIXEL_WIDTH, WORLD_PIXEL_HEIGHT)
    this.cameras.main.startFollow(this.player.sprite, true, 0.08, 0.08)
    this.cameras.main.setZoom(1)

    this.cursors = this.input.keyboard!.createCursorKeys()
    this.wasd = {
      up: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    }

    this.editor = new EditorManager(this, this.mapManager, WORLD_CONFIG)

    this.createHearts()
  }

  setHealth(hp: number): void {
    this.health = Phaser.Math.Clamp(hp, 0, 3)
    for (let i = 0; i < this.hearts.length; i++) {
      this.hearts[i].setTexture(i < this.health ? 'heart_full' : 'heart_empty')
    }

    if (this.health === 0) {
      this.onPlayerDeath()
    }
  }

  private onPlayerDeath(): void {
    this.physics.pause()
    this.player.sprite.setTint(0xff4444)

    this.cameras.main.fade(1200, 0, 0, 0)
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('TitleScene')
    })
  }

  private spawnEnemy(): void {
    let ex = this.player.sprite.x, ey = this.player.sprite.y
    let attempts = 0

    do {
      const angle = Math.random() * Math.PI * 2
      const distance = WORLD_CONFIG.tileSize * (4 + Math.random() * 4)
      ex = Phaser.Math.Clamp(
        this.player.sprite.x + Math.cos(angle) * distance,
        WORLD_CONFIG.tileSize * 2,
        WORLD_PIXEL_WIDTH - WORLD_CONFIG.tileSize * 2,
      )
      ey = Phaser.Math.Clamp(
        this.player.sprite.y + Math.sin(angle) * distance,
        WORLD_CONFIG.tileSize * 2,
        WORLD_PIXEL_HEIGHT - WORLD_CONFIG.tileSize * 2,
      )
      attempts++
    } while (
      attempts < 30 &&
      (this.mapManager.isBlockedAtWorld(ex, ey) ||
        Phaser.Math.Distance.Between(ex, ey, this.player.sprite.x, this.player.sprite.y) < 4 * WORLD_CONFIG.tileSize)
    )

    this.enemy = new Enemy(this, ex, ey)
    this.enemy.sprite.setDepth(24)
    this.mapManager.registerColliderTarget(this.enemy.sprite)
    this.physics.add.overlap(
      this.player.sprite,
      this.enemy.sprite,
      () => this.handleEnemyContact(),
    )
  }

  private killEnemy(): void {
    if (!this.enemy?.alive) return
    this.enemy.die()
    this.enemy = null
    const delay = 3000 + Math.random() * 3000
    this.time.delayedCall(delay, () => this.spawnEnemy())
  }

  private handleEnemyContact(): void {
    if (!this.enemy?.alive) return
    const now = this.time.now
    if (now < this.invincibleUntil) return
    this.invincibleUntil = now + 1500
    this.setHealth(this.health - 1)
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
    this.player.update(this.cursors, this.wasd)
    this.cat.update(delta)
    this.enemy?.update(delta)
    this.loadChunksNearPlayer()
    this.editor.update(this.input.activePointer)

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

  private loadChunksNearPlayer(force = false): void {
    const chunkX = Math.floor(this.player.sprite.x / (WORLD_CONFIG.chunkWidth * WORLD_CONFIG.tileSize))
    const chunkY = Math.floor(this.player.sprite.y / (WORLD_CONFIG.chunkHeight * WORLD_CONFIG.tileSize))
    const key = `${chunkX},${chunkY}`

    if (!force && key === this.currentChunkKey) return

    this.currentChunkKey = key
    this.mapManager.loadChunksAround(chunkX, chunkY)
  }

  private buildPlayerAnimations(): void {
    const tileSize = WORLD_CONFIG.tileSize

    if (this.textures.exists('player_sheet') && !this.anims.exists('walk-down')) {
      this.anims.create({
        key: 'walk-down',
        frames: this.anims.generateFrameNumbers('player_sheet', { start: 9, end: 10 }),
        frameRate: 6,
        repeat: -1,
      })
      this.anims.create({
        key: 'walk-up',
        frames: this.anims.generateFrameNumbers('player_sheet', { start: 3, end: 4 }),
        frameRate: 6,
        repeat: -1,
      })
      this.anims.create({
        key: 'walk-left',
        frames: this.anims.generateFrameNumbers('player_sheet', { start: 0, end: 1 }),
        frameRate: 6,
        repeat: -1,
      })
      this.anims.create({
        key: 'walk-right',
        frames: this.anims.generateFrameNumbers('player_sheet', { start: 6, end: 7 }),
        frameRate: 6,
        repeat: -1,
      })
      return
    }

    if (this.textures.exists('player_down_1')) return

    const g = this.add.graphics()
    const makePlayerFrame = (key: string, color: number, inset = 0) => {
      g.clear()
      g.fillStyle(color, 1)
      g.fillRect(inset, inset, tileSize - inset * 2, tileSize - inset * 2)
      g.generateTexture(key, tileSize, tileSize)
    }

    makePlayerFrame('player_down_1', 0x00cc00, 0)
    makePlayerFrame('player_down_2', 0x00aa00, 4)
    makePlayerFrame('player_up_1', 0x0066ff, 0)
    makePlayerFrame('player_up_2', 0x0044dd, 4)
    makePlayerFrame('player_left_1', 0xcc0000, 0)
    makePlayerFrame('player_left_2', 0xaa0000, 4)
    makePlayerFrame('player_right_1', 0xffcc00, 0)
    makePlayerFrame('player_right_2', 0xffaa00, 4)
    g.destroy()

    this.anims.create({
      key: 'walk-down',
      frames: [{ key: 'player_down_1' }, { key: 'player_down_2' }],
      frameRate: 6,
      repeat: -1,
    })
    this.anims.create({
      key: 'walk-up',
      frames: [{ key: 'player_up_1' }, { key: 'player_up_2' }],
      frameRate: 6,
      repeat: -1,
    })
    this.anims.create({
      key: 'walk-left',
      frames: [{ key: 'player_left_1' }, { key: 'player_left_2' }],
      frameRate: 6,
      repeat: -1,
    })
    this.anims.create({
      key: 'walk-right',
      frames: [{ key: 'player_right_1' }, { key: 'player_right_2' }],
      frameRate: 6,
      repeat: -1,
    })
  }

  private createHearts(): void {
    const makeHeartTexture = (key: string, color: number) => {
      const hg = this.add.graphics()
      hg.fillStyle(color, 1)
      const px = (col: number, row: number) => hg.fillRect(col * 3, row * 3, 3, 3)
      px(1, 0); px(2, 0); px(4, 0); px(5, 0)
      px(0, 1); px(1, 1); px(2, 1); px(3, 1); px(4, 1); px(5, 1); px(6, 1)
      px(0, 2); px(1, 2); px(2, 2); px(3, 2); px(4, 2); px(5, 2); px(6, 2)
      px(1, 3); px(2, 3); px(3, 3); px(4, 3); px(5, 3)
      px(2, 4); px(3, 4); px(4, 4)
      px(3, 5)
      hg.generateTexture(key, 21, 18)
      hg.destroy()
    }

    if (!this.textures.exists('heart_full')) {
      makeHeartTexture('heart_full', 0xff3333)
      makeHeartTexture('heart_empty', 0x552222)
    }

    for (let i = 0; i < 3; i++) {
      const heart = this.add.image(10 + i * 26, 10, 'heart_full')
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(200)
      this.hearts.push(heart)
    }
  }
}
