# Phaser Top-down Prototype

Minimal browser playable prototype using Phaser 3 + TypeScript + Vite.

Run locally:

```bash
npm install
npm run dev
```

Open the provided dev URL (usually http://localhost:5173) and use arrow keys or WASD to move.

Editor controls:
- `Tab`: toggle map edit mode
- `1-4`: choose ground / walls / decor / collision layer
- `Q` / `E`: cycle the current layer's tile palette
- `O`: export the full world as JSON
- `I`: import a previously exported world JSON file
- Left mouse: paint
- Right mouse: erase

The world is now chunked and much larger than the original prototype. Map edits auto-save in browser local storage.

Notes:
- This prototype uses procedural textures so no external assets are required. Replace with your own sprites/tiles later in `assets/`.
- Base resolution is 320×240 with a 2× zoom for crisp pixel art.
