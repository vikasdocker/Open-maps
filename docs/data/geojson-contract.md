# Open Maps GeoJSON contract

The browser renderer consumes GeoJSON FeatureCollections from our own API. Coordinates are WGS84 longitude/latitude in RFC 7946 order.

Supported geometry types in the first renderer pass:
- Point / MultiPoint — POIs and address nodes
- LineString / MultiLineString — roads, waterways and boundaries
- Polygon / MultiPolygon — buildings, parks, landuse and water areas

Feature properties should be normalized and stable:
- `id`: stable source feature ID, e.g. `way/123`
- `osm_type`, `osm_id`: original OSM identity
- `name`, `name:en`, `name:mr`, `name:hi`: optional names
- `class`: normalized renderer class (road, waterway, building, park, landuse, boundary, place, poi)
- `subclass`: optional OSM-derived subtype
- `tags`: optional source tags, filtered to useful public map attributes

The API must require a bbox in `west,south,east,north` order, clamp it to the supported data extent, cap response size, and return only features intersecting the viewport. Never send the full regional dataset to a mobile browser.

Example endpoint:
`GET /api/v1/features?bbox=74.55,19.30,74.78,19.48&layers=roads,water,buildings,places`

Response: RFC 7946 FeatureCollection with `properties.class` set for styling. OSM attribution must be displayed in the UI.
