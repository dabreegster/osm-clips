# OSM clips

This script takes a directory of GeoJSON files with a boundary polygon,
downloads the appropriate `osm.pbf` file from
[Geofabrik](https://download.geofabrik.de), clips to the boundary, and
maintains a `manifest.json` file describing all such boundaries.

The boundary input files must be a single GeoJSON feature with a `name`
property, like:

```
{
  "type":"Feature",
  "geometry": {
    "type":"Polygon",
    "coordinates": [[[139.6976073, 35.6827626], [139.6863487, 35.6541273], [139.6923092, 35.6513171], [139.7319718, 35.6535294], [139.7259378, 35.6834201], [139.6976073, 35.6827626]]]
   },
   "properties": {
     "name":"Harujuku"
   }
}
```

Requirements: node, wget, osmium

```
mkdir -p input/region1
mkdir -p input/region2
# Create files like input/region1/boundaryA.geojson, input/region2/boundaryB.geojson, etc

npm i
npm run osm-clips sync-all
```

You'll wind up with `output/region1/boundaryA.osm.pbf`,
`output/region1/boundaryA.geojson` (copied from input), and so on, as well
`output/manifest.json`:

```
{
  "japan": {
    "akihabara": [
      "Akihabara",
      "2025-07-12T20:20:44Z"
    ],
    "harujuku": [
      "Harujuku",
      "2025-07-12T20:20:44Z"
    ]
  },
  "usa": {
    "montlake": [
      "Montlake",
      "2023-02-14T21:21:09Z"
    ]
  }
}
```

The timestamp comes from the Geofabrik file and can be used downstream to see
how outdated a clipped file is. You can delete something from `overpass_cache/`
and rerun to download a newer file.
