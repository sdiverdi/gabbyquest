import type { WorldConfig } from './types'

export const WORLD_CONFIG: WorldConfig = {
  tileSize: 32,
  chunkWidth: 16,
  chunkHeight: 16,
  worldChunksX: 8,
  worldChunksY: 8,
  loadRadius: 1,
  unloadRadius: 2,
  startChunkX: 4,
  startChunkY: 4,
}

export const WORLD_TILE_WIDTH = WORLD_CONFIG.chunkWidth * WORLD_CONFIG.worldChunksX
export const WORLD_TILE_HEIGHT = WORLD_CONFIG.chunkHeight * WORLD_CONFIG.worldChunksY
export const WORLD_PIXEL_WIDTH = WORLD_TILE_WIDTH * WORLD_CONFIG.tileSize
export const WORLD_PIXEL_HEIGHT = WORLD_TILE_HEIGHT * WORLD_CONFIG.tileSize

export const START_WORLD_X =
  (WORLD_CONFIG.startChunkX * WORLD_CONFIG.chunkWidth + Math.floor(WORLD_CONFIG.chunkWidth / 2)) *
    WORLD_CONFIG.tileSize +
  WORLD_CONFIG.tileSize / 2

export const START_WORLD_Y =
  (WORLD_CONFIG.startChunkY * WORLD_CONFIG.chunkHeight + Math.floor(WORLD_CONFIG.chunkHeight / 2)) *
    WORLD_CONFIG.tileSize +
  WORLD_CONFIG.tileSize / 2

export const CAT_WORLD_X = START_WORLD_X + WORLD_CONFIG.tileSize * 4
export const CAT_WORLD_Y = START_WORLD_Y - WORLD_CONFIG.tileSize * 2