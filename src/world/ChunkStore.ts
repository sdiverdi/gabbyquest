import Chunk from './Chunk'
import TilesetCatalog from './TilesetCatalog'
import type { ChunkData, LayerName, WorldConfig, WorldSaveData } from './types'
import { CAT_WORLD_X, CAT_WORLD_Y, START_WORLD_X, START_WORLD_Y, WORLD_TILE_HEIGHT, WORLD_TILE_WIDTH } from './worldConfig'

const STORAGE_PREFIX = 'phaser-topdown-chunk'
const EMPTY_TILE = -1

export default class ChunkStore {
  constructor(
    private config: WorldConfig,
    private tileset: TilesetCatalog,
  ) {}

  loadChunk(chunkX: number, chunkY: number): Chunk {
    const stored = this.readStoredChunk(chunkX, chunkY)
    return new Chunk(stored ?? this.createDefaultChunk(chunkX, chunkY))
  }

  saveChunk(chunk: Chunk): void {
    localStorage.setItem(this.storageKey(chunk.data.chunkX, chunk.data.chunkY), JSON.stringify(chunk.data))
  }

  exportWorld(): WorldSaveData {
    const chunks: ChunkData[] = []

    for (let chunkY = 0; chunkY < this.config.worldChunksY; chunkY++) {
      for (let chunkX = 0; chunkX < this.config.worldChunksX; chunkX++) {
        chunks.push(this.loadChunk(chunkX, chunkY).data)
      }
    }

    return {
      version: 1,
      config: {
        tileSize: this.config.tileSize,
        chunkWidth: this.config.chunkWidth,
        chunkHeight: this.config.chunkHeight,
        worldChunksX: this.config.worldChunksX,
        worldChunksY: this.config.worldChunksY,
      },
      chunks,
    }
  }

  importWorld(saveData: WorldSaveData): number {
    this.validateWorldSave(saveData)
    this.clearStoredChunks()

    for (const chunkData of saveData.chunks) {
      const normalized = this.normalizeChunkData(chunkData)
      localStorage.setItem(this.storageKey(normalized.chunkX, normalized.chunkY), JSON.stringify(normalized))
    }

    return saveData.chunks.length
  }

  isChunkInWorld(chunkX: number, chunkY: number): boolean {
    return chunkX >= 0 && chunkY >= 0 && chunkX < this.config.worldChunksX && chunkY < this.config.worldChunksY
  }

  private readStoredChunk(chunkX: number, chunkY: number): ChunkData | null {
    const raw = localStorage.getItem(this.storageKey(chunkX, chunkY))
    if (!raw) return null

    try {
      return JSON.parse(raw) as ChunkData
    } catch {
      return null
    }
  }

  private storageKey(chunkX: number, chunkY: number): string {
    return `${STORAGE_PREFIX}:${chunkX}:${chunkY}`
  }

  private clearStoredChunks(): void {
    for (let chunkY = 0; chunkY < this.config.worldChunksY; chunkY++) {
      for (let chunkX = 0; chunkX < this.config.worldChunksX; chunkX++) {
        localStorage.removeItem(this.storageKey(chunkX, chunkY))
      }
    }
  }

  private createDefaultChunk(chunkX: number, chunkY: number): ChunkData {
    const tileCount = this.config.chunkWidth * this.config.chunkHeight
    const layers: Record<LayerName, number[]> = {
      ground: new Array<number>(tileCount).fill(this.tileset.defaultGroundFrame),
      walls: new Array<number>(tileCount).fill(EMPTY_TILE),
      decor: new Array<number>(tileCount).fill(EMPTY_TILE),
      collision: new Array<number>(tileCount).fill(EMPTY_TILE),
    }

    for (let localY = 0; localY < this.config.chunkHeight; localY++) {
      for (let localX = 0; localX < this.config.chunkWidth; localX++) {
        const index = localY * this.config.chunkWidth + localX
        const worldTileX = chunkX * this.config.chunkWidth + localX
        const worldTileY = chunkY * this.config.chunkHeight + localY

        layers.ground[index] = this.hash(worldTileX, worldTileY, 3) > 0.82
          ? this.tileset.roughGroundFrame
          : this.tileset.defaultGroundFrame

        if (!this.isWorldBorder(worldTileX, worldTileY)) continue

        layers.walls[index] = this.getBorderWallTile(worldTileX, worldTileY)
        layers.collision[index] = this.tileset.collisionFrame
      }
    }

    this.addRuinBlocks(chunkX, chunkY, layers)
    this.addDecorations(chunkX, chunkY, layers)
    this.clearProtectedArea(chunkX, chunkY, layers, START_WORLD_X, START_WORLD_Y, 2)
    this.clearProtectedArea(chunkX, chunkY, layers, CAT_WORLD_X, CAT_WORLD_Y, 2)

    return {
      chunkX,
      chunkY,
      tileSize: this.config.tileSize,
      width: this.config.chunkWidth,
      height: this.config.chunkHeight,
      layers,
    }
  }

  private addRuinBlocks(chunkX: number, chunkY: number, layers: Record<LayerName, number[]>): void {
    const blockCount = Math.floor(this.hash(chunkX, chunkY, 7) * 3)

    for (let i = 0; i < blockCount; i++) {
      const width = 2 + Math.floor(this.hash(chunkX, chunkY, 20 + i) * 3)
      const height = 2 + Math.floor(this.hash(chunkX, chunkY, 40 + i) * 3)
      const startX = 2 + Math.floor(this.hash(chunkX, chunkY, 60 + i) * Math.max(1, this.config.chunkWidth - width - 4))
      const startY = 2 + Math.floor(this.hash(chunkX, chunkY, 80 + i) * Math.max(1, this.config.chunkHeight - height - 4))

      for (let localY = startY; localY < startY + height; localY++) {
        for (let localX = startX; localX < startX + width; localX++) {
          const worldTileX = chunkX * this.config.chunkWidth + localX
          const worldTileY = chunkY * this.config.chunkHeight + localY
          if (this.isProtectedTile(worldTileX, worldTileY)) continue

          const index = localY * this.config.chunkWidth + localX
          layers.walls[index] = this.tileset.wallFillFrame
          layers.collision[index] = this.tileset.collisionFrame
          layers.decor[index] = EMPTY_TILE
        }
      }
    }
  }

  private addDecorations(chunkX: number, chunkY: number, layers: Record<LayerName, number[]>): void {
    for (let localY = 1; localY < this.config.chunkHeight - 1; localY++) {
      for (let localX = 1; localX < this.config.chunkWidth - 1; localX++) {
        const index = localY * this.config.chunkWidth + localX
        if (layers.collision[index] !== EMPTY_TILE) continue

        const worldTileX = chunkX * this.config.chunkWidth + localX
        const worldTileY = chunkY * this.config.chunkHeight + localY
        if (this.isProtectedTile(worldTileX, worldTileY)) continue

        const roll = this.hash(worldTileX, worldTileY, 120)
        if (roll < 0.92) continue

        const decorFrames = this.tileset.decorFrames
        const decor = decorFrames[Math.floor(this.hash(worldTileX, worldTileY, 121) * decorFrames.length)]
        layers.decor[index] = decor
      }
    }
  }

  private clearProtectedArea(
    chunkX: number,
    chunkY: number,
    layers: Record<LayerName, number[]>,
    worldX: number,
    worldY: number,
    radius: number,
  ): void {
    const tileX = Math.floor(worldX / this.config.tileSize)
    const tileY = Math.floor(worldY / this.config.tileSize)
    const targetChunkX = Math.floor(tileX / this.config.chunkWidth)
    const targetChunkY = Math.floor(tileY / this.config.chunkHeight)

    if (chunkX !== targetChunkX || chunkY !== targetChunkY) return

    const localCenterX = tileX - chunkX * this.config.chunkWidth
    const localCenterY = tileY - chunkY * this.config.chunkHeight

    for (let localY = Math.max(1, localCenterY - radius); localY <= Math.min(this.config.chunkHeight - 2, localCenterY + radius); localY++) {
      for (let localX = Math.max(1, localCenterX - radius); localX <= Math.min(this.config.chunkWidth - 2, localCenterX + radius); localX++) {
        const index = localY * this.config.chunkWidth + localX
        layers.walls[index] = EMPTY_TILE
        layers.collision[index] = EMPTY_TILE
        layers.decor[index] = EMPTY_TILE
      }
    }
  }

  private isProtectedTile(worldTileX: number, worldTileY: number): boolean {
    return this.distanceToAnchor(worldTileX, worldTileY, START_WORLD_X, START_WORLD_Y) <= 3 ||
      this.distanceToAnchor(worldTileX, worldTileY, CAT_WORLD_X, CAT_WORLD_Y) <= 2
  }

  private distanceToAnchor(worldTileX: number, worldTileY: number, worldX: number, worldY: number): number {
    const anchorTileX = Math.floor(worldX / this.config.tileSize)
    const anchorTileY = Math.floor(worldY / this.config.tileSize)
    return Math.max(Math.abs(worldTileX - anchorTileX), Math.abs(worldTileY - anchorTileY))
  }

  private isWorldBorder(worldTileX: number, worldTileY: number): boolean {
    return worldTileX === 0 || worldTileY === 0 || worldTileX === WORLD_TILE_WIDTH - 1 || worldTileY === WORLD_TILE_HEIGHT - 1
  }

  private getBorderWallTile(worldTileX: number, worldTileY: number): number {
    const maxX = WORLD_TILE_WIDTH - 1
    const maxY = WORLD_TILE_HEIGHT - 1

    if (worldTileX === 0 && worldTileY === 0) return this.tileset.getBorderFrame('topLeft')
    if (worldTileX === maxX && worldTileY === 0) return this.tileset.getBorderFrame('topRight')
    if (worldTileX === 0 && worldTileY === maxY) return this.tileset.getBorderFrame('bottomLeft')
    if (worldTileX === maxX && worldTileY === maxY) return this.tileset.getBorderFrame('bottomRight')
    if (worldTileY === 0) return this.tileset.getBorderFrame('top')
    if (worldTileY === maxY) return this.tileset.getBorderFrame('bottom')
    if (worldTileX === 0) return this.tileset.getBorderFrame('left')
    return this.tileset.getBorderFrame('right')
  }

  private hash(x: number, y: number, salt: number): number {
    const value = Math.sin(x * 12.9898 + y * 78.233 + salt * 37.719) * 43758.5453
    return value - Math.floor(value)
  }

  private validateWorldSave(saveData: WorldSaveData): void {
    if (saveData.version !== 1) {
      throw new Error('Unsupported map file version')
    }

    if (
      saveData.config.tileSize !== this.config.tileSize ||
      saveData.config.chunkWidth !== this.config.chunkWidth ||
      saveData.config.chunkHeight !== this.config.chunkHeight ||
      saveData.config.worldChunksX !== this.config.worldChunksX ||
      saveData.config.worldChunksY !== this.config.worldChunksY
    ) {
      throw new Error('Map file does not match the current world configuration')
    }

    if (!Array.isArray(saveData.chunks) || saveData.chunks.length === 0) {
      throw new Error('Map file is missing chunk data')
    }
  }

  private normalizeChunkData(chunkData: ChunkData): ChunkData {
    if (!this.isChunkInWorld(chunkData.chunkX, chunkData.chunkY)) {
      throw new Error(`Chunk ${chunkData.chunkX},${chunkData.chunkY} is outside the world bounds`)
    }

    const tileCount = this.config.chunkWidth * this.config.chunkHeight
    const requiredLayers: LayerName[] = ['ground', 'walls', 'decor', 'collision']

    for (const layer of requiredLayers) {
      if (!Array.isArray(chunkData.layers[layer]) || chunkData.layers[layer].length !== tileCount) {
        throw new Error(`Chunk ${chunkData.chunkX},${chunkData.chunkY} has invalid ${layer} layer data`)
      }
    }

    return {
      chunkX: chunkData.chunkX,
      chunkY: chunkData.chunkY,
      tileSize: this.config.tileSize,
      width: this.config.chunkWidth,
      height: this.config.chunkHeight,
      layers: {
        ground: [...chunkData.layers.ground],
        walls: [...chunkData.layers.walls],
        decor: [...chunkData.layers.decor],
        collision: [...chunkData.layers.collision],
      },
    }
  }
}