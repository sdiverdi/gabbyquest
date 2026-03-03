# Agent Context & Plan

Date: 2026-02-26

Purpose: Hand off current project state, design decisions, run instructions, blockers, and next implementation steps so another agent can continue.

Environment
- OS: Windows (workspace root: `C:\Users\steve\dev\game`)
- Preferred terminal: Git Bash (agent cannot launch Git Bash here; PowerShell used by runner)

Key decisions
- Engine: Phaser 3
- Bundler/dev server: Vite
- Language: TypeScript (`strict: true`)
- Base resolution: 320×240, zoom 2× (pixelArt on)
- Tile size: 16×16
- Controls: Keyboard (arrow keys/WASD); Gamepad optional later
- Assets: Start with procedural/free placeholders; replace later with custom art

Files created
- `package.json` — scripts and dependencies
- `tsconfig.json` — TypeScript config
- `vite.config.ts` — minimal Vite config
- `index.html` — host page
- `README.md` — run instructions
- `TODO.md` — earlier handoff notes
- `AGENT_CONTEXT.md` — this file
- `src/main.ts` — Phaser bootstrap
- `src/scenes/BootScene.ts` — boot scene
- `src/scenes/GameScene.ts` — procedural map, walls, camera, input
- `src/player/Player.ts` — Player class (movement)

Current todo (high level)
1. Implement scenes and `Player` (completed; basic movement implemented and directional animations added)
2. Install dependencies and start dev server (completed)
3. Verify player movement, collisions, and camera behavior (completed — manual + automated keypress checks performed)
4. Replace procedural textures with real assets and add tilemap/Tiled JSON (placeholder `assets/player.png` added) (partial — temporary directional procedural frames created; replace with real art next)

How to run (Git Bash recommended)
```bash
cd /c/Users/steve/dev/game
npm install
npm run dev
```

PowerShell alternative (temporary execution policy bypass):
```powershell
cd 'C:\Users\steve\dev\game'
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass; npm install
npm run dev
```

What to verify after running dev server
- Player (green square) moves with arrow keys / WASD
- Player collides with border and inner obstacle
- Camera follows player and canvas scales crisply (nearest-neighbor)

Blockers / notes
- `npm install` may fail in PowerShell due to script execution policy; use Git Bash or temporary bypass.
- Phaser typings are included in `phaser` package; `skipLibCheck` is enabled in `tsconfig.json` to reduce typing noise.

Next implementation tasks (recommended order)
1. Replace the temporary procedural player frames with a proper spritesheet/tileset in `assets/` and update animations to use the sheet.
2. Import a Tiled JSON map or create a proper tilemap in `GameScene`, convert tile collision to a collision layer.
3. Add a simple enemy with pathing and basic collision/damage (AI + health/damage hooks).
4. Add mobile/touch and Gamepad input support.
5. Polish: add sound effects, UI (health, score), and asset pipeline.

Contact: pick up where the `TODO.md` left off; main entry point is `src/main.ts` and gameplay logic in `src/scenes/GameScene.ts`.
