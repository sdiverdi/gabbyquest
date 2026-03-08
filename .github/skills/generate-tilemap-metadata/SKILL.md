---
name: generate-tilemap-metadata
description: Generate a new tileset metadata JSON file for a tilemap PNG in this repository by using the existing metadata generator script. Use this when asked to create starter JSON metadata for a new tilesheet image, regenerate metadata after tile size or spacing changes, or scaffold a new map metadata file before hand-labeling tiles.
argument-hint: "--image assets/<tilesheet>.png --output assets/<name>.json --tileWidth <n> --tileHeight <n> [--margin <n>] [--spacing <n>] [--name <tileset-name>] [--textureKey <key>]"
---

# Generate tilemap metadata

Use this skill when a task asks for a new tileset metadata JSON file for an image in `assets/`.

## What this project already provides

- The metadata generator script is [scripts/generate-tileset-metadata.mjs](../../../scripts/generate-tileset-metadata.mjs).
- The active metadata file is typically [assets/map.json](../../../assets/map.json).
- A generated example file exists at [assets/map.generated.json](../../../assets/map.generated.json).
- The runtime tileset selector is [src/world/tilesetConfig.ts](../../../src/world/tilesetConfig.ts).

## Required workflow

1. Confirm the source image exists under `assets/`.
2. Run the generator script with the provided image path, output path, tile size, and optional margin/spacing.
3. Read the generated JSON and verify that:
   - `columns` and `rows` were derived correctly.
   - `imageWidth` and `imageHeight` match the source PNG.
   - `defaults` are only starter placeholders and may need editing.
4. If the user wants the new metadata to become active, update [src/world/tilesetConfig.ts](../../../src/world/tilesetConfig.ts) to point at the new JSON file.
5. If runtime behavior changed, run `npm run build` to validate the project still passes.

## Command pattern

Use this command pattern from the repository root:

`npm run generate:tileset -- --image assets/<tilesheet>.png --output assets/<output>.json --tileWidth <n> --tileHeight <n> --margin <n> --spacing <n> --name <tileset-name> --textureKey <texture-key>`

Only include `--margin`, `--spacing`, `--name`, `--textureKey`, `--columns`, or `--rows` when needed.

## Example

For a 32x32 tilesheet with 1px margin and spacing:

`npm run generate:tileset -- --image assets/map.png --output assets/map.generated.json --tileWidth 32 --tileHeight 32 --margin 1 --spacing 1 --name desert-ruins --textureKey tilesheet`

## Important notes

- The generated metadata is a starter template, not a fully curated tile definition file.
- After generation, tile `name`, `label`, `type`, and `defaults` usually need manual cleanup.
- The game validates both metadata structure and tilesheet image dimensions at boot, so invalid files will surface an on-screen error.
- Prefer generating into a new file such as `assets/<name>.generated.json` unless the user explicitly asks to overwrite an existing metadata file.

## Expected response behavior

When using this skill:

- State which JSON file was created.
- Mention the generator command that was run in summary form.
- Mention whether `src/world/tilesetConfig.ts` was updated.
- Mention whether build validation was run.
