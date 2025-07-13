import * as fs from "fs";
import booleanContains from "@turf/boolean-contains";
import area from "@turf/area";
import { execSync } from "child_process";
import type { MultiPolygon, FeatureCollection } from "geojson";

async function main() {
  if (process.argv[2] == "find-smallest") {
    await findSmallest(process.argv[3]);
  } else {
    console.log("Unknown command");
  }
}

async function findSmallest(gjPath: string) {
  let boundary = JSON.parse(fs.readFileSync(gjPath, { encoding: "utf8" }));
  if (
    boundary.type != "Feature" ||
    !["Polygon", "MultiPolygon"].includes(boundary.geometry.type)
  ) {
    throw new Error(
      `${gjPath} isn't a GJ file with one Polygon or MultiPolygon boundary`,
    );
  }

  let overpassIndex = getOverpassIndex();
  for (let f of overpassIndex.features) {
    if (booleanContains(f, boundary)) {
      console.log(f.properties);
      return;
    }
  }
  throw new Error(`No Overpass region contains the boundary from ${gjPath}`);
}

function getOverpassIndex(): FeatureCollection<MultiPolygon, {}> {
  try {
    fs.readFileSync("overpass_cache/index-v1.json");
  } catch (err) {
    console.log("Overpass index missing, downloading it");
    execSync("mkdir -p overpass_cache");
    execSync(
      "wget https://download.geofabrik.de/index-v1.json -O overpass_cache/index-v1.json",
    );
  }

  let gj = JSON.parse(
    fs.readFileSync("overpass_cache/index-v1.json", {
      encoding: "utf8",
    }),
  );
  // Sort by smallest area first
  gj.features.sort((a: any, b: any) => area(a) - area(b));
  return gj;
}

main();
