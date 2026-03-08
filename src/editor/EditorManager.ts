import Phaser from 'phaser'
import MapManager from '../world/MapManager'
import TilesetCatalog from '../world/TilesetCatalog'
import type { LayerName, WorldConfig } from '../world/types'

const LAYER_ORDER: LayerName[] = ['ground', 'walls', 'decor', 'collision']

export default class EditorManager {
  private enabled = false
  private selectedLayer: LayerName = 'ground'
  private selectionIndex = 0
  private hoverGraphics: Phaser.GameObjects.Graphics
  private hudText: Phaser.GameObjects.Text
  private statusMessage = 'Ready'
  private fileInput: HTMLInputElement

  constructor(
    private scene: Phaser.Scene,
    private mapManager: MapManager,
    private config: WorldConfig,
    private tileset: TilesetCatalog,
  ) {
    this.hoverGraphics = scene.add.graphics().setDepth(1000)
    this.hudText = scene.add.text(8, 8, '', {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#fff4d6',
      backgroundColor: '#000000aa',
      padding: { left: 6, right: 6, top: 4, bottom: 4 },
    }).setScrollFactor(0).setDepth(1001).setVisible(false)
    this.fileInput = this.createFileInput()

    this.bindInputs()
  }

  update(pointer: Phaser.Input.Pointer): void {
    if (!this.enabled) {
      this.hoverGraphics.clear()
      return
    }

    const worldPoint = pointer.positionToCamera(this.scene.cameras.main) as Phaser.Math.Vector2
    const snappedX = Math.floor(worldPoint.x / this.config.tileSize) * this.config.tileSize
    const snappedY = Math.floor(worldPoint.y / this.config.tileSize) * this.config.tileSize

    this.hoverGraphics.clear()
    this.hoverGraphics.lineStyle(2, 0xfff08a, 0.9)
    this.hoverGraphics.strokeRect(snappedX, snappedY, this.config.tileSize, this.config.tileSize)

    if (!pointer.isDown) return

    if (pointer.leftButtonDown()) {
      this.paint(pointer, this.getSelectedTileIndex())
    } else if (pointer.rightButtonDown()) {
      this.paint(pointer, -1)
    }
  }

  private bindInputs(): void {
    this.scene.input.mouse?.disableContextMenu()

    this.scene.input.keyboard?.on('keydown-TAB', (event: KeyboardEvent) => {
      event.preventDefault()
      this.enabled = !this.enabled
      this.mapManager.setCollisionOverlayVisible(this.enabled)
      this.hudText.setVisible(this.enabled)
      if (!this.enabled) {
        this.hoverGraphics.clear()
      }
      this.refreshHud()
    })

    this.scene.input.keyboard?.on('keydown-ONE', () => this.setLayer('ground'))
    this.scene.input.keyboard?.on('keydown-TWO', () => this.setLayer('walls'))
    this.scene.input.keyboard?.on('keydown-THREE', () => this.setLayer('decor'))
    this.scene.input.keyboard?.on('keydown-FOUR', () => this.setLayer('collision'))
    this.scene.input.keyboard?.on('keydown-Q', () => this.cycleSelection(-1))
    this.scene.input.keyboard?.on('keydown-E', () => this.cycleSelection(1))
    this.scene.input.keyboard?.on('keydown-O', () => this.exportWorld())
    this.scene.input.keyboard?.on('keydown-I', () => this.promptImport())
  }

  private setLayer(layer: LayerName): void {
    this.selectedLayer = layer
    this.selectionIndex = 0
    this.refreshHud()
  }

  private cycleSelection(direction: number): void {
    const options = this.tileset.getPalette(this.selectedLayer)
    this.selectionIndex = Phaser.Math.Wrap(this.selectionIndex + direction, 0, options.length)
    this.refreshHud()
  }

  private getSelectedTileIndex(): number {
    return this.tileset.getPalette(this.selectedLayer)[this.selectionIndex].index
  }

  private paint(pointer: Phaser.Input.Pointer, tileIndex: number): void {
    if (!this.enabled) return

    const worldPoint = pointer.positionToCamera(this.scene.cameras.main) as Phaser.Math.Vector2
    const position = this.mapManager.getChunkAtWorld(worldPoint.x, worldPoint.y)

    this.mapManager.editTile(
      position.chunkX,
      position.chunkY,
      this.selectedLayer,
      position.localTileX,
      position.localTileY,
      tileIndex,
    )

    if (this.selectedLayer === 'walls') {
      this.mapManager.editTile(
        position.chunkX,
        position.chunkY,
        'collision',
        position.localTileX,
        position.localTileY,
        tileIndex === -1 ? -1 : this.tileset.collisionFrame,
      )
    }

    if (this.selectedLayer === 'collision' && tileIndex === -1) {
      this.mapManager.editTile(position.chunkX, position.chunkY, 'walls', position.localTileX, position.localTileY, -1)
    }

    if (this.selectedLayer === 'ground' && tileIndex !== -1) {
      this.mapManager.editTile(position.chunkX, position.chunkY, 'decor', position.localTileX, position.localTileY, -1)
    }

    this.setStatus('Tile updated')
  }

  private refreshHud(): void {
    if (!this.enabled) return

    const palette = this.tileset.getPalette(this.selectedLayer)
    const option = palette[Math.min(this.selectionIndex, palette.length - 1)]
    this.hudText.setText([
      'EDITOR MODE',
      `Layer ${LAYER_ORDER.indexOf(this.selectedLayer) + 1}: ${this.selectedLayer}`,
      `Tile: ${option.label}`,
      '1-4 layer  Q/E tile',
      'LMB paint  RMB erase',
      'O export  I import',
      'Auto-saves to browser storage',
      `Status: ${this.statusMessage}`,
    ])
  }

  private exportWorld(): void {
    try {
      const json = this.mapManager.exportWorld()
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)

      link.href = url
      link.download = `topdown-map-${stamp}.json`
      link.click()
      URL.revokeObjectURL(url)

      this.setStatus('World exported')
    } catch (error) {
      this.setStatus(error instanceof Error ? error.message : 'Export failed')
    }
  }

  private promptImport(): void {
    this.fileInput.value = ''
    this.fileInput.click()
  }

  private createFileInput(): HTMLInputElement {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'application/json,.json'
    input.style.display = 'none'
    input.addEventListener('change', async () => {
      const file = input.files?.[0]
      if (!file) return

      try {
        const jsonText = await file.text()
        const importedCount = this.mapManager.importWorld(jsonText)
        this.setStatus(`Imported ${importedCount} chunks`)
      } catch (error) {
        this.setStatus(error instanceof Error ? error.message : 'Import failed')
      }
    })

    document.body.appendChild(input)
    return input
  }

  private setStatus(message: string): void {
    this.statusMessage = message
    this.refreshHud()
  }
}