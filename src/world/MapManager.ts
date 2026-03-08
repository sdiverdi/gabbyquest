import Phaser from 'phaser'
import Chunk from './Chunk'
import ChunkStore from './ChunkStore'
import type { ChunkTilePosition, LayerName, WorldConfig } from './types'

const EMPTY_TILE = -1

interface LoadedChunk {
  chunk: Chunk
  map: Phaser.Tilemaps.Tilemap
  layers: Record<LayerName, Phaser.Tilemaps.TilemapLayer>
  colliders: Phaser.Physics.Arcade.Collider[]
}

export default class MapManager {
  private loaded = new Map<string, LoadedChunk>()
  private colliderTargets: Phaser.GameObjects.GameObject[] = []
  private collisionOverlayVisible = false

  constructor(
    private scene: Phaser.Scene,
    private store: ChunkStore,
    private config: WorldConfig,
  ) {}

  loadChunksAround(chunkX: number, chunkY: number): void {
    for (let y = chunkY - this.config.loadRadius; y <= chunkY + this.config.loadRadius; y++) {
      for (let x = chunkX - this.config.loadRadius; x <= chunkX + this.config.loadRadius; x++) {
        this.ensureChunkLoaded(x, y)
      }
    }

    this.unloadFarChunks(chunkX, chunkY)
  }

  ensureChunkLoaded(chunkX: number, chunkY: number): void {
    if (!this.store.isChunkInWorld(chunkX, chunkY)) return

    const key = this.getChunkKey(chunkX, chunkY)
    if (this.loaded.has(key)) return

    const chunk = this.store.loadChunk(chunkX, chunkY)
    const map = this.scene.make.tilemap({
      tileWidth: this.config.tileSize,
      tileHeight: this.config.tileSize,
      width: this.config.chunkWidth,
      height: this.config.chunkHeight,
    })

    const tileset = map.addTilesetImage('tilesheet', 'tilesheet', this.config.tileSize, this.config.tileSize, 1, 1)
    if (!tileset) throw new Error('Unable to create chunk tileset')

    const worldX = chunkX * this.config.chunkWidth * this.config.tileSize
    const worldY = chunkY * this.config.chunkHeight * this.config.tileSize

    const ground = map.createBlankLayer('ground', tileset, worldX, worldY)
    const walls = map.createBlankLayer('walls', tileset, worldX, worldY)
    const decor = map.createBlankLayer('decor', tileset, worldX, worldY)
    const collision = map.createBlankLayer('collision', tileset, worldX, worldY)

    if (!ground || !walls || !decor || !collision) throw new Error('Unable to create chunk layers')

    ground.setDepth(0)
    walls.setDepth(10)
    collision.setDepth(15)
    decor.setDepth(20)

    this.populateLayer(ground, chunk, 'ground')
    this.populateLayer(walls, chunk, 'walls')
    this.populateLayer(decor, chunk, 'decor')
    this.populateLayer(collision, chunk, 'collision')

    collision.setCollisionByExclusion([EMPTY_TILE], true)
    collision.setVisible(this.collisionOverlayVisible)
    collision.setAlpha(this.collisionOverlayVisible ? 0.35 : 0)
    collision.setTint(0xff5577)

    const loadedChunk: LoadedChunk = {
      chunk,
      map,
      layers: { ground, walls, decor, collision },
      colliders: [],
    }

    this.loaded.set(key, loadedChunk)

    this.colliderTargets = this.colliderTargets.filter((target) => target.active)
    for (const target of this.colliderTargets) {
      loadedChunk.colliders.push(this.scene.physics.add.collider(target, collision))
    }
  }

  unloadFarChunks(centerChunkX: number, centerChunkY: number): void {
    for (const [key, loadedChunk] of this.loaded.entries()) {
      const dx = Math.abs(loadedChunk.chunk.data.chunkX - centerChunkX)
      const dy = Math.abs(loadedChunk.chunk.data.chunkY - centerChunkY)
      if (dx <= this.config.unloadRadius && dy <= this.config.unloadRadius) continue

      for (const collider of loadedChunk.colliders) {
        collider.destroy()
      }

      Object.values(loadedChunk.layers).forEach((layer) => layer.destroy())
      loadedChunk.map.destroy()
      this.loaded.delete(key)
    }
  }

  registerColliderTarget(target: Phaser.GameObjects.GameObject): void {
    this.colliderTargets = this.colliderTargets.filter((entry) => entry.active)
    if (this.colliderTargets.includes(target)) return

    this.colliderTargets.push(target)
    for (const loadedChunk of this.loaded.values()) {
      loadedChunk.colliders.push(this.scene.physics.add.collider(target, loadedChunk.layers.collision))
    }
  }

  setCollisionOverlayVisible(visible: boolean): void {
    this.collisionOverlayVisible = visible
    for (const loadedChunk of this.loaded.values()) {
      loadedChunk.layers.collision.setVisible(visible)
      loadedChunk.layers.collision.setAlpha(visible ? 0.35 : 0)
    }
  }

  exportWorld(): string {
    return JSON.stringify(this.store.exportWorld(), null, 2)
  }

  importWorld(jsonText: string): number {
    const saveData = JSON.parse(jsonText) as ReturnType<ChunkStore['exportWorld']>
    const importedCount = this.store.importWorld(saveData)
    this.reloadLoadedChunks()
    return importedCount
  }

  editTile(chunkX: number, chunkY: number, layer: LayerName, tileX: number, tileY: number, tileIndex: number): void {
    const loadedChunk = this.loaded.get(this.getChunkKey(chunkX, chunkY))
    if (!loadedChunk) return

    loadedChunk.chunk.setTile(layer, tileX, tileY, tileIndex)
    this.writeTileToLayer(loadedChunk.layers[layer], tileX, tileY, tileIndex)

    if (layer === 'collision') {
      loadedChunk.layers.collision.setCollisionByExclusion([EMPTY_TILE], true)
    }

    this.store.saveChunk(loadedChunk.chunk)
  }

  getChunkAtWorld(worldX: number, worldY: number): ChunkTilePosition {
    const worldTileX = Phaser.Math.Clamp(
      Math.floor(worldX / this.config.tileSize),
      0,
      this.config.worldChunksX * this.config.chunkWidth - 1,
    )
    const worldTileY = Phaser.Math.Clamp(
      Math.floor(worldY / this.config.tileSize),
      0,
      this.config.worldChunksY * this.config.chunkHeight - 1,
    )
    const chunkX = Math.floor(worldTileX / this.config.chunkWidth)
    const chunkY = Math.floor(worldTileY / this.config.chunkHeight)

    return {
      chunkX,
      chunkY,
      localTileX: worldTileX - chunkX * this.config.chunkWidth,
      localTileY: worldTileY - chunkY * this.config.chunkHeight,
      worldTileX,
      worldTileY,
    }
  }

  getTile(chunkX: number, chunkY: number, layer: LayerName, tileX: number, tileY: number): number {
    const loadedChunk = this.loaded.get(this.getChunkKey(chunkX, chunkY))
    if (loadedChunk) return loadedChunk.chunk.getTile(layer, tileX, tileY)
    return this.store.loadChunk(chunkX, chunkY).getTile(layer, tileX, tileY)
  }

  isBlockedAtWorld(worldX: number, worldY: number): boolean {
    const position = this.getChunkAtWorld(worldX, worldY)
    return this.getTile(position.chunkX, position.chunkY, 'collision', position.localTileX, position.localTileY) !== EMPTY_TILE
  }

  private populateLayer(layer: Phaser.Tilemaps.TilemapLayer, chunk: Chunk, layerName: LayerName): void {
    for (let y = 0; y < chunk.data.height; y++) {
      for (let x = 0; x < chunk.data.width; x++) {
        this.writeTileToLayer(layer, x, y, chunk.getTile(layerName, x, y))
      }
    }
  }

  private writeTileToLayer(layer: Phaser.Tilemaps.TilemapLayer, tileX: number, tileY: number, tileIndex: number): void {
    if (tileIndex === EMPTY_TILE) {
      layer.removeTileAt(tileX, tileY, true, true)
      return
    }

    layer.putTileAt(tileIndex, tileX, tileY, true)
  }

  private getChunkKey(chunkX: number, chunkY: number): string {
    return `${chunkX},${chunkY}`
  }

  private reloadLoadedChunks(): void {
    const loadedPositions = [...this.loaded.values()].map(({ chunk }) => ({
      chunkX: chunk.data.chunkX,
      chunkY: chunk.data.chunkY,
    }))

    for (const key of [...this.loaded.keys()]) {
      const loadedChunk = this.loaded.get(key)
      if (!loadedChunk) continue

      for (const collider of loadedChunk.colliders) {
        collider.destroy()
      }

      Object.values(loadedChunk.layers).forEach((layer) => layer.destroy())
      loadedChunk.map.destroy()
      this.loaded.delete(key)
    }

    for (const position of loadedPositions) {
      this.ensureChunkLoaded(position.chunkX, position.chunkY)
    }
  }
}