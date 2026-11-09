# Open Maps API (development foundation)

The API reads from our own PostGIS database and returns RFC 7946 GeoJSON. It does not proxy map tiles and does not use a third-party renderer.

## Start services

```bash
cp .env.example .env
docker compose up -d --build
```

API health: http://localhost:8000/health

## Import OSM data

Install osm2pgsql on the host, download a small clipped OSM PBF for the pilot area documented in `docs/data/rahuri-pilot.md`, then import it:

```bash
osm2pgsql --create --slim --database openmaps --username openmaps --host localhost --port 5432 --password --output=pgsql --style /usr/share/osm2pgsql/default.style rahuri-pilot.osm.pbf
```

Use the database password configured in `.env`. The command above prompts for it. The default osm2pgsql schema is expected by the first API implementation. Verify that the imported tables contain data before testing the API.

Example:
```bash
curl 'http://localhost:8000/api/v1/features?bbox=74.55,19.30,74.78,19.48&layers=roads,water,buildings,places,landuse'
```

For a real deployment, use a dedicated database role with read-only API permissions, TLS, rate limits, request logging, bounded viewport queries, backups, and a non-default secret. Never expose PostGIS port 5432 publicly.

## Important
This is the first ingestion/API foundation, not yet a complete production service. The pilot extract must be downloaded and imported before the API can return real features. Keep large PBF extracts and database volumes out of Git.
