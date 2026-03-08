export type LayerName = 'ground' | 'walls' | 'decor' | 'collision'

export interface ChunkData {
  chunkX: number
  chunkY: number
  tileSize: number
  width: number
  height: number
  layers: Record<LayerName, number[]>
}

export interface WorldSaveData {
  version: 1
  config: Pick<WorldConfig, 'tileSize' | 'chunkWidth' | 'chunkHeight' | 'worldChunksX' | 'worldChunksY'>
  chunks: ChunkData[]
}

export interface WorldConfig {
  tileSize: number
  chunkWidth: number
  chunkHeight: number
  worldChunksX: number
  worldChunksY: number
  loadRadius: number
  unloadRadius: number
  startChunkX: number
  startChunkY: number
}

export interface ChunkTilePosition {
  chunkX: number
  chunkY: number
  localTileX: number
  localTileY: number
  worldTileX: number
  worldTileY: number
}

export interface PaletteOption {
  index: number
  label: string
}