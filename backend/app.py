import json
import os
from typing import Any

import psycopg
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from psycopg.rows import dict_row

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://openmaps:openmaps_dev@localhost:5432/openmaps")
ALLOWED_LAYERS = {"roads", "water", "buildings", "places", "landuse"}

app = FastAPI(title="Open Maps API", version="0.1.0")
origins = [item.strip() for item in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",") if item.strip()]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_methods=["GET"], allow_headers=["*"])


@app.get("/health")
def health() -> dict[str, str]:
    try:
        with psycopg.connect(DATABASE_URL) as conn:
            conn.execute("SELECT 1")
        return {"status": "ok", "database": "connected"}
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Database unavailable") from exc


@app.get("/api/v1/features")
def features(
    bbox: str = Query(..., description="west,south,east,north in WGS84"),
    layers: str = Query("roads,water,buildings,places,landuse"),
    limit: int = Query(12000, ge=1, le=20000),
) -> dict[str, Any]:
    try:
        west, south, east, north = [float(value) for value in bbox.split(",")]
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="bbox must be west,south,east,north")
    if not (-180 <= west < east <= 180 and -85 <= south < north <= 85):
        raise HTTPException(status_code=400, detail="bbox is outside valid geographic bounds")
    requested = set(layers.split(",")) & ALLOWED_LAYERS
    if not requested:
        raise HTTPException(status_code=400, detail="No supported layers requested")

    # osm2pgsql's default flex/classic output uses these tables and hstore tags.
    envelope = (west, south, east, north)
    output: list[dict[str, Any]] = []
    queries: list[tuple[str, str]] = []
    if "roads" in requested:
        queries.append(("planet_osm_line", "highway IS NOT NULL"))
    if "water" in requested:
        queries.append(("planet_osm_line", "waterway IS NOT NULL"))
        queries.append(("planet_osm_polygon", "natural = 'water' OR water IS NOT NULL"))
    if "buildings" in requested:
        queries.append(("planet_osm_polygon", "building IS NOT NULL"))
    if "landuse" in requested:
        queries.append(("planet_osm_polygon", "landuse IS NOT NULL OR leisure IS NOT NULL OR natural IN ('wood','grassland')"))
    if "places" in requested:
        queries.append(("planet_osm_point", "place IS NOT NULL OR amenity IS NOT NULL OR shop IS NOT NULL OR tourism IS NOT NULL"))

    try:
        with psycopg.connect(DATABASE_URL, row_factory=dict_row) as conn:
            for table, predicate in queries:
                remaining = limit - len(output)
                if remaining <= 0:
                    break
                sql = f"""
                    SELECT osm_id, name, highway, waterway, water, natural, building,
                           landuse, leisure, place, amenity, shop, tourism,
                           ST_AsGeoJSON(ST_Transform(way, 4326), 6)::json AS geometry
                    FROM {table}
                    WHERE ({predicate})
                      AND way && ST_Transform(ST_MakeEnvelope(%s, %s, %s, %s, 4326), 3857)
                    LIMIT %s
                """
                rows = conn.execute(sql, (*envelope, remaining)).fetchall()
                for row in rows:
                    tags = {key: row[key] for key in ("highway", "waterway", "water", "natural", "building", "landuse", "leisure", "place", "amenity", "shop", "tourism") if row.get(key) is not None}
                    if "highway" in tags:
                        feature_class = "road"
                    elif "waterway" in tags or tags.get("natural") == "water" or "water" in tags:
                        feature_class = "water"
                    elif "building" in tags:
                        feature_class = "building"
                    elif "place" in tags or any(key in tags for key in ("amenity", "shop", "tourism")):
                        feature_class = "place"
                    else:
                        feature_class = "landuse"
                    output.append({
                        "type": "Feature",
                        "id": f"{table.removeprefix('planet_osm_')}/{row['osm_id']}",
                        "properties": {"class": feature_class, "name": row.get("name"), **tags},
                        "geometry": row["geometry"],
                    })
        return {"type": "FeatureCollection", "features": output, "attribution": "© OpenStreetMap contributors"}
    except psycopg.Error as exc:
        raise HTTPException(status_code=503, detail="Map database query failed; check OSM import status") from exc
