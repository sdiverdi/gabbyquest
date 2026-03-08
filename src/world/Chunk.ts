import type { ChunkData, LayerName } from './types'

export default class Chunk {
  constructor(public data: ChunkData) {}

  get key(): string {
    return `${this.data.chunkX},${this.data.chunkY}`
  }

  getIndex(tileX: number, tileY: number): number {
    return tileY * this.data.width + tileX
  }

  getTile(layer: LayerName, tileX: number, tileY: number): number {
    return this.data.layers[layer][this.getIndex(tileX, tileY)] ?? -1
  }

  setTile(layer: LayerName, tileX: number, tileY: number, tileIndex: number): void {
    this.data.layers[layer][this.getIndex(tileX, tileY)] = tileIndex
  }
}