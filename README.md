# Monopoly — Lagos Edition

A browser-based, 3D Monopoly table built with **Three.js + Vite**. The interface takes inspiration from the broad design language of Lagos Life's public experience—an immersive world-first view, compact HUD panels, activity feed, location markers, and a mobile-friendly layout—while using original Monopoly-themed visual design and assets.

## Run locally

```bash
npm install
npm run dev
```

Open the local URL Vite prints. For a production build:

```bash
npm run build
npm run preview
```

## Included

- Three.js board with all 40 classic squares, property color groups, board lighting, shadows, fog, orbit camera, zoom, and alternate camera views.
- Eight token designs, animated movement, dice roll animation, doubles effect, turn indicators, player stats, and activity feed.
- Buy/pass property, rent calculation, color-set bonuses, railroad and utility rent, taxes, GO salary, Chance and Community Chest decks, jail and bail, building houses/hotels, mortgages, property portfolio, simple player-to-player trades, and bankruptcy asset transfer.
- Responsive HUD, setup screen, help guide, property details, and win state.

## Notes

- This is a local hot-seat game prototype; players share one browser/device. Online multiplayer, persistent saves, sound assets, and a full auction/bidding flow are not included yet.
- The game is an original implementation and is not affiliated with or endorsed by Hasbro or Lagos Life.
