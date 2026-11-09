#!/usr/bin/env bash
set -euo pipefail

# Small Rahuri pilot extract. Overpass bbox order: south,west,north,east.
OUT="${1:-rahuri-pilot.osm}"
QUERY='[out:xml][timeout:180];(nwr(19.30,74.55,19.48,74.78););out body;>;out skel qt;'

echo "Downloading Rahuri pilot OSM extract to $OUT"
curl --fail --location --retry 3 --retry-delay 5 \
  --user-agent "OpenMaps/0.2 (Rahuri pilot data importer)" \
  --data-urlencode "data=$QUERY" \
  "https://overpass-api.de/api/interpreter" \
  --output "$OUT"

echo "Downloaded:"
ls -lh "$OUT"
sha256sum "$OUT"
echo "Source: https://overpass-api.de/api/interpreter"
echo "Licence: OpenStreetMap contributors, ODbL"
