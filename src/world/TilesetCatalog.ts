import Phaser from 'phaser'
import type { LayerName, PaletteOption } from './types'
import { TILESET_METADATA_CACHE_KEY } from './tilesetConfig'

type TileType = 'ground' | 'wall' | 'decor' | 'unused'

interface BorderTileNames {
  topLeft: string
  top: string
  topRight: string
  left: string
  right: string
  bottomLeft: string
  bottom: string
  bottomRight: string
}

interface TilesetDefaults {
  ground: string[]
  walls: string[]
  decor: string[]
  collision: string
  borderWalls: BorderTileNames
}

export interface TilesetTileMetadata {
  frame: number
  name: string
  label: string
  type: TileType
  x: number
  y: number
  solid?: boolean
  palette?: boolean
  tags?: string[]
}

export interface TilesetMetadata {
  name: string
  textureKey: string
  image: string
  tileWidth: number
  tileHeight: number
  margin: number
  spacing: number
  columns: number
  rows: number
  defaults: TilesetDefaults
  tiles: TilesetTileMetadata[]
}

const LAYER_TYPE_MAP: Record<Exclude<LayerName, 'collision'>, TileType> = {
  ground: 'ground',
  walls: 'wall',
  decor: 'decor',
}

export default class TilesetCatalog {
  private readonly tilesByName: Map<string, TilesetTileMetadata>

  constructor(public readonly metadata: TilesetMetadata) {
    TilesetCatalog.validateMetadata(metadata)
    this.tilesByName = new Map(metadata.tiles.map((tile) => [tile.name, tile]))
  }

  static fromScene(scene: Phaser.Scene): TilesetCatalog {
    const metadata = scene.cache.json.get(TILESET_METADATA_CACHE_KEY) as TilesetMetadata | undefined
    if (!metadata) {
      throw new Error('Tileset metadata has not been loaded')
    }

    return new TilesetCatalog(metadata)
  }

  static validateMetadata(metadata: TilesetMetadata): void {
    if (!metadata || typeof metadata !== 'object') {
      throw new Error('Tileset metadata must be a JSON object')
    }

    if (!metadata.name || !metadata.textureKey || !metadata.image) {
      throw new Error('Tileset metadata must include name, textureKey, and image')
    }

    if (!Number.isInteger(metadata.tileWidth) || metadata.tileWidth <= 0) {
      throw new Error('Tileset metadata must include a positive tileWidth')
    }

    if (!Number.isInteger(metadata.tileHeight) || metadata.tileHeight <= 0) {
      throw new Error('Tileset metadata must include a positive tileHeight')
    }

    if (!Number.isInteger(metadata.columns) || metadata.columns <= 0 || !Number.isInteger(metadata.rows) || metadata.rows <= 0) {
      throw new Error('Tileset metadata must include positive columns and rows')
    }

    if (!Array.isArray(metadata.tiles) || metadata.tiles.length === 0) {
      throw new Error('Tileset metadata must define tiles')
    }

    const maxFrame = metadata.columns * metadata.rows - 1
    const names = new Set<string>()
    const frames = new Set<number>()

    for (const tile of metadata.tiles) {
      if (typeof tile.name !== 'string' || tile.name.length === 0) {
        throw new Error('Each tile must include a non-empty name')
      }

      if (!Number.isInteger(tile.frame) || tile.frame < 0 || tile.frame > maxFrame) {
        throw new Error(`Tile ${tile.name} has an out-of-range frame index`)
      }

      if (!Number.isInteger(tile.x) || tile.x < 0 || tile.x >= metadata.columns) {
        throw new Error(`Tile ${tile.name} has an invalid x coordinate`)
      }

      if (!Number.isInteger(tile.y) || tile.y < 0 || tile.y >= metadata.rows) {
        throw new Error(`Tile ${tile.name} has an invalid y coordinate`)
      }

      const expectedFrame = tile.y * metadata.columns + tile.x
      if (tile.frame !== expectedFrame) {
        throw new Error(`Tile ${tile.name} frame ${tile.frame} does not match x/y coordinates (${tile.x}, ${tile.y})`)
      }

      if (names.has(tile.name)) {
        throw new Error(`Duplicate tile name: ${tile.name}`)
      }

      if (frames.has(tile.frame)) {
        throw new Error(`Duplicate tile frame: ${tile.frame}`)
      }

      names.add(tile.name)
      frames.add(tile.frame)
    }

    TilesetCatalog.validateDefaults(metadata, names)
  }

  static validateImageDimensions(metadata: TilesetMetadata, imageWidth: number, imageHeight: number): void {
    if (!Number.isInteger(imageWidth) || imageWidth <= 0 || !Number.isInteger(imageHeight) || imageHeight <= 0) {
      throw new Error('Tileset image dimensions could not be determined')
    }

    const expectedWidth = metadata.margin * 2 + metadata.columns * metadata.tileWidth + (metadata.columns - 1) * metadata.spacing
    const expectedHeight = metadata.margin * 2 + metadata.rows * metadata.tileHeight + (metadata.rows - 1) * metadata.spacing

    if (imageWidth !== expectedWidth || imageHeight !== expectedHeight) {
      throw new Error(
        `Tileset image size ${imageWidth}x${imageHeight} does not match metadata size ${expectedWidth}x${expectedHeight}`,
      )
    }
  }

  get textureKey(): string {
    return this.metadata.textureKey
  }

  get frameWidth(): number {
    return this.metadata.tileWidth
  }

  get frameHeight(): number {
    return this.metadata.tileHeight
  }

  get defaultGroundFrame(): number {
    return this.getFrameByName(this.metadata.defaults.ground[0])
  }

  get roughGroundFrame(): number {
    return this.getFrameByName(this.metadata.defaults.ground[1] ?? this.metadata.defaults.ground[0])
  }

  get wallFillFrame(): number {
    return this.getFrameByName(this.metadata.defaults.walls[0])
  }

  get collisionFrame(): number {
    return this.getFrameByName(this.metadata.defaults.collision)
  }

  get decorFrames(): number[] {
    return this.metadata.defaults.decor.map((name) => this.getFrameByName(name))
  }

  getPalette(layer: LayerName): PaletteOption[] {
    if (layer === 'collision') {
      return [{ index: this.collisionFrame, label: this.getTileByName(this.metadata.defaults.collision).label }]
    }

    const defaultNames = this.getDefaultNamesForLayer(layer)
    return defaultNames.map((name) => {
      const tile = this.getTileByName(name)
      return { index: tile.frame, label: tile.label }
    })
  }

  getBorderFrame(border: keyof BorderTileNames): number {
    return this.getFrameByName(this.metadata.defaults.borderWalls[border])
  }

  getFrameByName(name: string): number {
    return this.getTileByName(name).frame
  }

  private getDefaultNamesForLayer(layer: Exclude<LayerName, 'collision'>): string[] {
    const names = this.metadata.defaults[layer]
    if (!names?.length) {
      const fallbackType = LAYER_TYPE_MAP[layer]
      return this.metadata.tiles.filter((tile) => tile.type === fallbackType && tile.palette).map((tile) => tile.name)
    }
    return names
  }

  private getTileByName(name: string): TilesetTileMetadata {
    const tile = this.tilesByName.get(name)
    if (!tile) {
      throw new Error(`Unknown tileset entry: ${name}`)
    }

    return tile
  }

  private static validateDefaults(metadata: TilesetMetadata, names: Set<string>): void {
    const requiredLists: Array<keyof Omit<TilesetDefaults, 'collision' | 'borderWalls'>> = ['ground', 'walls', 'decor']
    for (const key of requiredLists) {
      if (!Array.isArray(metadata.defaults?.[key]) || metadata.defaults[key].length === 0) {
        throw new Error(`Tileset metadata defaults.${key} must be a non-empty array`)
      }

      for (const name of metadata.defaults[key]) {
        if (!names.has(name)) {
          throw new Error(`Tileset metadata defaults.${key} references unknown tile ${name}`)
        }
      }
    }

    if (!metadata.defaults?.collision || !names.has(metadata.defaults.collision)) {
      throw new Error('Tileset metadata defaults.collision must reference a known tile')
    }

    const borderKeys: Array<keyof BorderTileNames> = ['topLeft', 'top', 'topRight', 'left', 'right', 'bottomLeft', 'bottom', 'bottomRight']
    for (const key of borderKeys) {
      const name = metadata.defaults?.borderWalls?.[key]
      if (!name || !names.has(name)) {
        throw new Error(`Tileset metadata defaults.borderWalls.${key} must reference a known tile`)
      }
    }
  }
}