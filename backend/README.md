# Open Maps API
FastAPI reads our own PostGIS database and returns GeoJSON for map features, place search and a first custom shortest-path routing prototype.

## Run locally
```bash
cp .env.example .env
docker compose up -d --build
```
Health check: http://localhost:8000/health

## Download and import Rahuri data
Install `osm2pgsql` and `curl`, then run from repository root:
```bash
bash scripts/download-rahuri-osm.sh
export PGPASSWORD='your-postgis-password'
bash scripts/import-rahuri-osm.sh
```
The pilot bbox is 19.30,74.55,19.48,74.78 (south,west,north,east in Overpass). This extract is deliberately small. Retain download date and checksum. Do not commit OSM data or database volumes.

## Endpoints
- `GET /health`
- `GET /api/v1/features?bbox=74.55,19.30,74.78,19.48&layers=roads,water,buildings,places,landuse`
- `GET /api/v1/search?q=Rahuri`
- `GET /api/v1/route?start=74.65,19.39&end=74.68,19.41&profile=driving`

Routing builds a graph from road geometries in the corridor and finds a shortest path. It is a prototype: one-way/turn restrictions, access rules, speed-based ETA, route snapping and precomputed large-area graphs need further implementation and validation before real-world navigation use.

For production, use a read-only DB role for API, TLS, secrets, rate limits, backups and monitoring. Do not expose PostGIS port 5432 publicly.
