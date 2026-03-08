import Phaser from 'phaser'
import TilesetCatalog, { type TilesetMetadata } from '../world/TilesetCatalog'
import { ACTIVE_TILESET_METADATA_PATH, TILESET_METADATA_CACHE_KEY } from '../world/tilesetConfig'

export default class BootScene extends Phaser.Scene {
  private bootErrorMessage: string | null = null

  constructor() {
    super('BootScene')
  }

  preload(): void {
    this.load.on('loaderror', (file: Phaser.Loader.File) => {
      this.bootErrorMessage = `Failed to load ${file.key}`
    })

    this.load.json(TILESET_METADATA_CACHE_KEY, ACTIVE_TILESET_METADATA_PATH)

    this.load.once(`filecomplete-json-${TILESET_METADATA_CACHE_KEY}`, () => {
      try {
        const tilesetMetadata = this.cache.json.get(TILESET_METADATA_CACHE_KEY) as TilesetMetadata | undefined
        if (!tilesetMetadata) {
          throw new Error(`Unable to load tileset metadata from ${ACTIVE_TILESET_METADATA_PATH}`)
        }

        TilesetCatalog.validateMetadata(tilesetMetadata)

        this.load.spritesheet(tilesetMetadata.textureKey, tilesetMetadata.image, {
          frameWidth: tilesetMetadata.tileWidth,
          frameHeight: tilesetMetadata.tileHeight,
          margin: tilesetMetadata.margin,
          spacing: tilesetMetadata.spacing,
        })
      } catch (error) {
        this.bootErrorMessage = error instanceof Error ? error.message : 'Tileset metadata is invalid'
      }
    })

    // Load the character spritesheet.
    // The image is 2560x1280 with 8 columns x 4 rows — actual frame size is 320x320px
    // (the sheet is the logical 32x32 design scaled up 10x)
    this.load.spritesheet('player_sheet', 'characters.png', { frameWidth: 320, frameHeight: 320 })

    // Title screen image (320×240)
    this.load.image('title', 'title.png')

    this.load.audio('meow', 'meow.mp3')
    this.load.audio('stab', 'stab.mp3')
  }

  create(): void {
    if (this.bootErrorMessage) {
      this.showBootError(this.bootErrorMessage)
      return
    }

    try {
      const tilesetMetadata = this.cache.json.get(TILESET_METADATA_CACHE_KEY) as TilesetMetadata | undefined
      if (!tilesetMetadata) {
        throw new Error('Tileset metadata is unavailable at boot')
      }

      const sourceImage = this.textures.get(tilesetMetadata.textureKey).getSourceImage() as { width?: number; height?: number } | { width?: number; height?: number }[]
      const image = Array.isArray(sourceImage) ? sourceImage[0] : sourceImage
      TilesetCatalog.validateImageDimensions(tilesetMetadata, image.width ?? 0, image.height ?? 0)
    } catch (error) {
      this.showBootError(error instanceof Error ? error.message : 'Tileset image validation failed')
      return
    }

    this.scene.start('TitleScene')
  }

  private showBootError(message: string): void {
    this.cameras.main.setBackgroundColor('#1a0f14')
    this.add.text(16, 16, 'Tileset metadata error', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#ff9090',
    })
    this.add.text(16, 44, message, {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#ffe0e0',
      wordWrap: { width: 288 },
    })
  }
}
