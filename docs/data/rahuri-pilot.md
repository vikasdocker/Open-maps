# Rahuri pilot data

The first real-data pilot is a small viewport around Rahuri, Maharashtra. Keep the initial extract small; do not download or commit a country-scale PBF into this repository.

Suggested initial bounding box (WGS84):
- west: 74.55
- south: 19.30
- east: 74.78
- north: 19.48

This is a development window, not a claim that it covers all of Rahuri taluka. Adjust it after inspecting the downloaded source data.

## Import plan
1. Download an OSM extract for the pilot area from an OSM-compatible extract service or create a clipped PBF from a regional extract.
2. Record source URL, download timestamp, extract timestamp and checksum.
3. Import into our own PostGIS database using osm2pgsql.
4. Query only viewport-intersecting geometries from the API and serialize RFC 7946 GeoJSON.
5. Verify roads, buildings, waterways, place labels and boundaries against OSM source attribution.

Do not use the OSM standard tile server as the app's map display. OSM data may be imported and rendered by our own software subject to ODbL.
