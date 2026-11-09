# Open Maps — Production Roadmap

## Product rule
Open Maps owns its database, API, map styling, renderer, search index and routing engine. OpenStreetMap is an upstream data source, not a runtime map viewer. Do not add Google Maps, Leaflet, MapLibre, hosted raster/vector tile layers, or third-party map rendering SDKs.

## Phase 1 — Geographic data foundation (current)
- [x] Define a bounded pilot region around Rahuri, Maharashtra.
- [x] Define the GeoJSON interchange contract used by the custom renderer.
- [ ] Download an OSM extract and preserve source/licence metadata.
- [ ] Import OSM into our own PostGIS database.
- [ ] Expose viewport-bounded features through our own API.
- [ ] Replace demo geometry in the browser with real geographic features.

## Phase 2 — Custom renderer
- [ ] Web Mercator projection and geographic camera.
- [ ] Layered drawing order: water, landuse, buildings, minor roads, major roads, boundaries, labels.
- [ ] Scale-dependent simplification and label collision handling.
- [ ] Retina rendering, resize handling, pointer pan and anchored wheel/pinch zoom.
- [ ] Attribution visible at all times when OSM-derived data is displayed.

## Phase 3 — Location
- [ ] Permission-aware one-shot GPS and watchPosition tracking.
- [ ] Accuracy circle, heading, recenter and follow modes.
- [ ] Stop location watch on unmount and when the user disables tracking.

## Phase 4 — Search
- [ ] Local place/address index (PostgreSQL + pg_trgm / full-text search).
- [ ] Search suggestions, result ranking and map selection.
- [ ] Admin hierarchy and transliteration support for English, Marathi and Hindi.

## Phase 5 — Routing
- [ ] Build routable graph from OSM ways and restrictions.
- [ ] A*/Dijkstra route engine with turn restrictions and one-way streets.
- [ ] Walking, cycling and driving profiles; route geometry and step instructions.
- [ ] Clearly mark routes as unavailable when coverage is incomplete.

## Phase 6 — Additional map layers
- [ ] Terrain from a separately licensed elevation dataset.
- [ ] Satellite imagery only from a source whose licence explicitly permits the intended storage, processing and display; do not scrape consumer map imagery.
- [ ] Traffic only from a lawful data provider or our own consented/aggregated observations. Do not imply live traffic without a live source.

## Deployment architecture
GitHub Pages hosts only the static web client. A separate VPS/cloud host runs PostGIS and the Open Maps API. The client calls that API using `VITE_MAP_API_URL`. Do not attempt to host PostGIS or large OSM extracts in GitHub Pages.

## Pilot area
Start with a small Rahuri-area extract for development and validation. Expand to Maharashtra only after import, API latency, storage and attribution have been verified.

## OSM licensing
OpenStreetMap data is © OpenStreetMap contributors and is available under ODbL. Display attribution and follow ODbL obligations for derived databases. Keep source extract date, URL and licence metadata with each import. Software code can have a separate licence.
