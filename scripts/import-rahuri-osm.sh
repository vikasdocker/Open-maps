#!/usr/bin/env bash
set -euo pipefail

INPUT="${1:-rahuri-pilot.osm}"
: "${PGPASSWORD:?Set PGPASSWORD to the PostGIS password}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-openmaps}"
DB_USER="${DB_USER:-openmaps}"

if [[ ! -f "$INPUT" ]]; then
  echo "Missing $INPUT. Run scripts/download-rahuri-osm.sh first." >&2
  exit 1
fi

osm2pgsql --create --slim --database "$DB_NAME" --username "$DB_USER" \
  --host "$DB_HOST" --port "$DB_PORT" --output=pgsql \
  --hstore "$INPUT"

echo "Import complete. Verify with: SELECT count(*) FROM planet_osm_line;"
