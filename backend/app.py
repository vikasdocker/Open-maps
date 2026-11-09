import math
import os
from typing import Any

import networkx as nx
import psycopg
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from psycopg.rows import dict_row
from shapely.geometry import LineString, mapping, shape
from shapely.ops import unary_union

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://openmaps:openmaps_dev@localhost:5432/openmaps")
ALLOWED_LAYERS = {"roads", "water", "buildings", "places", "landuse"}
app = FastAPI(title="Open Maps API", version="0.2.0")
origins = [item.strip() for item in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",") if item.strip()]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_methods=["GET"], allow_headers=["*"])


def db():
    return psycopg.connect(DATABASE_URL, row_factory=dict_row)


@app.get("/health")
def health() -> dict[str, str]:
    try:
        with db() as conn:
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
    envelope = (west, south, east, north)
    output: list[dict[str, Any]] = []
    queries: list[tuple[str, str]] = []
    if "roads" in requested:
        queries.append(("planet_osm_line", "highway IS NOT NULL"))
    if "water" in requested:
        queries.extend([("planet_osm_line", "waterway IS NOT NULL"), ("planet_osm_polygon", "natural = 'water' OR water IS NOT NULL")])
    if "buildings" in requested:
        queries.append(("planet_osm_polygon", "building IS NOT NULL"))
    if "landuse" in requested:
        queries.append(("planet_osm_polygon", "landuse IS NOT NULL OR leisure IS NOT NULL OR natural IN ('wood','grassland')"))
    if "places" in requested:
        queries.append(("planet_osm_point", "place IS NOT NULL OR amenity IS NOT NULL OR shop IS NOT NULL OR tourism IS NOT NULL"))
    try:
        with db() as conn:
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
                for row in conn.execute(sql, (*envelope, remaining)).fetchall():
                    tags = {key: row[key] for key in ("highway", "waterway", "water", "natural", "building", "landuse", "leisure", "place", "amenity", "shop", "tourism") if row.get(key) is not None}
                    if "highway" in tags: feature_class = "road"
                    elif "waterway" in tags or tags.get("natural") == "water" or "water" in tags: feature_class = "water"
                    elif "building" in tags: feature_class = "building"
                    elif "place" in tags or any(k in tags for k in ("amenity", "shop", "tourism")): feature_class = "place"
                    else: feature_class = "landuse"
                    output.append({"type": "Feature", "id": f"{table.removeprefix('planet_osm_')}/{row['osm_id']}", "properties": {"class": feature_class, "name": row.get("name"), **tags}, "geometry": row["geometry"]})
        return {"type": "FeatureCollection", "features": output, "attribution": "© OpenStreetMap contributors"}
    except psycopg.Error as exc:
        raise HTTPException(status_code=503, detail="Map database query failed; check OSM import status") from exc


@app.get("/api/v1/search")
def search(q: str = Query(..., min_length=2, max_length=120), limit: int = Query(12, ge=1, le=30)) -> dict[str, Any]:
    term = q.strip()
    if not term:
        raise HTTPException(status_code=400, detail="Search query is empty")
    try:
        with db() as conn:
            rows = conn.execute("""
                SELECT osm_id, name, place, amenity, shop, tourism,
                       ST_Y(ST_Transform(way,4326)) AS lat,
                       ST_X(ST_Transform(way,4326)) AS lon
                FROM planet_osm_point
                WHERE name ILIKE %s OR place ILIKE %s
                ORDER BY CASE WHEN name ILIKE %s THEN 0 ELSE 1 END, name
                LIMIT %s
            """, (f"%{term}%", f"%{term}%", f"{term}%", limit)).fetchall()
        return {"query": term, "results": [{"id": f"node/{r['osm_id']}", "name": r["name"] or r["place"], "type": r["place"] or r["amenity"] or r["shop"] or r["tourism"] or "place", "lat": r["lat"], "lon": r["lon"]} for r in rows]}
    except psycopg.Error as exc:
        raise HTTPException(status_code=503, detail="Search database unavailable") from exc


def haversine(a: tuple[float, float], b: tuple[float, float]) -> float:
    lon1, lat1, lon2, lat2 = map(math.radians, (a[0], a[1], b[0], b[1]))
    dlat, dlon = lat2 - lat1, lon2 - lon1
    h = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    return 6371000 * 2 * math.asin(math.sqrt(h))


@app.get("/api/v1/route")
def route(
    start: str = Query(..., description="start longitude,latitude"),
    end: str = Query(..., description="end longitude,latitude"),
    profile: str = Query("driving", pattern="^(driving|cycling|walking)$"),
) -> dict[str, Any]:
    try:
        start_xy = tuple(float(v) for v in start.split(","))
        end_xy = tuple(float(v) for v in end.split(","))
        if len(start_xy) != 2 or len(end_xy) != 2: raise ValueError()
    except ValueError:
        raise HTTPException(status_code=400, detail="start/end must be longitude,latitude")
    west, east = min(start_xy[0], end_xy[0]) - .08, max(start_xy[0], end_xy[0]) + .08
    south, north = min(start_xy[1], end_xy[1]) - .08, max(start_xy[1], end_xy[1]) + .08
    if not (-180 <= west < east <= 180 and -85 <= south < north <= 85):
        raise HTTPException(status_code=400, detail="Route endpoints outside supported bounds")
    allowed = {
        "driving": ["motorway", "trunk", "primary", "secondary", "tertiary", "unclassified", "residential", "service"],
        "cycling": ["primary", "secondary", "tertiary", "unclassified", "residential", "service", "cycleway"],
        "walking": ["footway", "path", "pedestrian", "living_street", "residential", "service", "steps"]
    }[profile]
    try:
        with db() as conn:
            rows = conn.execute("""
                SELECT ST_AsGeoJSON(ST_Transform(way,4326))::json AS geometry, highway, oneway
                FROM planet_osm_line
                WHERE highway = ANY(%s)
                  AND way && ST_Transform(ST_MakeEnvelope(%s,%s,%s,%s,4326),3857)
                LIMIT 25000
            """, (allowed, west, south, east, north)).fetchall()
        lines = [shape(r["geometry"]) for r in rows if r["geometry"] and shape(r["geometry"]).geom_type == "LineString"]
        if not lines: raise HTTPException(status_code=404, detail="No routable roads found in this area")
        noded = unary_union(lines)
        segments = list(noded.geoms) if hasattr(noded, "geoms") else [noded]
        graph = nx.Graph()
        for line in segments:
            if not isinstance(line, LineString): continue
            coords = list(line.coords)
            for a, b in zip(coords, coords[1:]):
                weight = haversine(a, b)
                if weight > 0:
                    graph.add_edge(tuple(a), tuple(b), weight=weight)
        if graph.number_of_nodes() == 0: raise HTTPException(status_code=404, detail="Road network is empty")
        source = min(graph.nodes, key=lambda p: haversine(p, start_xy))
        target = min(graph.nodes, key=lambda p: haversine(p, end_xy))
        path = nx.shortest_path(graph, source, target, weight="weight")
        distance = sum(haversine(a, b) for a, b in zip(path, path[1:]))
        return {"type": "Feature", "geometry": mapping(LineString(path)), "properties": {"profile": profile, "distance_m": round(distance), "engine": "Open Maps A* / Dijkstra graph prototype"}, "attribution": "© OpenStreetMap contributors"}
    except nx.NetworkXNoPath:
        raise HTTPException(status_code=404, detail="No connected route found between these points")
    except psycopg.Error as exc:
        raise HTTPException(status_code=503, detail="Routing database unavailable") from exc
