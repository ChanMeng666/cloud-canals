# Cloud Canals

Cloud Canals is a small SVG-based browser game about routing water across floating islands.

Build canal networks from cloud springs to thirsty fields, keep the island hydrated, and grow steady harvests as new fields, reservoirs, rocks, and mist banks appear over time.

## How to play

- Drag from one grid cell to the next to build canals.
- Use the mouse wheel to zoom the island view.
- Hold Space or Shift and drag to pan the map.
- On touch screens, use two fingers to pan and pinch zoom.
- Use the reset-view button to return to the starting area.
- Connect a cloud spring to each field connector so crops can grow.
- Watch the water meter on each field and the overall water meter in the HUD.
- Complete each seasonal objective for extra canal pieces, moisture boosts, or score bonuses.
- Build reservoirs into the network to store water and keep canals flowing longer.
- Right click, or use delete mode, to remove canals and recover canal pieces.
- New fields and reservoirs appear over time and grant more canal pieces.
- Mist banks temporarily block cells before dissipating. Rocks are permanent obstacles.

## Features

- Drag to build canal segments on a larger pan-and-zoom island map.
- Connect springs to fields so crops can grow and harvest automatically.
- Use reservoirs to store water and stabilize disconnected canal networks.
- Remove canals with right click or delete mode.
- Procedural placement keeps new stations reachable from the water network and avoids sealing critical connectors.
- Decorative drifting clouds add motion without blocking canal placement.
- Playable with mouse or touch, with generated SVG visuals and synthesized Web Audio sounds.
- Seasonal objectives, rewards, best-score tracking, and procedural background music.
- Curated in-repo image assets for the menu, terrain texture, stations, blockers, and harvest effects.

## Tech

- Vite
- JavaScript modules
- SVG and CSS generated in code
- Web Audio API procedural music and sound effects
- Lightweight SVG image assets in `public/assets`

## Run locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```
