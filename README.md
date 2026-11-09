# Open Maps

An independently developed mapping platform. The long-term goal is to own the geographic data pipeline, storage, rendering, search, routing, and web experience.

## Current foundation

- React + TypeScript + Vite website
- Independent Canvas 2D vector renderer (no Google Maps, Leaflet, MapLibre, or hosted map tiles)
- Pan and zoom controls
- Responsive desktop/mobile layout
- Demo vector geometry isolated in `src/map/demoData.ts`

> The current canvas uses clearly labelled illustrative demo geometry. It is not real-world map data and is not suitable for navigation.

## Requirements

- Node.js 20.19+ or 22.12+
- npm

## Local development

```bash
npm install
npm run dev
```

## Production build

```bash
npm run typecheck
npm run build
npm run preview
```

## Planned milestones

1. Replace illustrative geometry with imported geographic data.
2. Build an OSM PBF ingestion pipeline with ODbL attribution and compliance.
3. Design a normalized PostGIS geographic database.
4. Build our own vector tile generation and delivery service.
5. Expand the custom renderer to geographic projections, labels, symbols, and style layers.
6. Add geocoding, routing, and navigation services.
7. Deploy the web application and map-data services.

## Data licensing

OpenStreetMap-derived data must be used in compliance with the Open Database License (ODbL), including attribution and applicable share-alike obligations. Application source code and independently created software components can be licensed separately. See https://www.openstreetmap.org/copyright.
