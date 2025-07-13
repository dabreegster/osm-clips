import * as fs from "fs";
import * as path from "path";
import booleanContains from "@turf/boolean-contains";
import area from "@turf/area";
import { execSync } from "child_process";
import type { FeatureCollection } from "geojson";

function main() {
  if (process.argv[2] == "find-smallest") {
    console.log(findSmallest(process.argv[3]));
  } else if (process.argv[2] == "clip") {
    clip(process.argv[3]);
  } else {
    console.log("Unknown command");
  }
}

// Returns the [path, full URL]
function findSmallest(gjPath: string): [string, string] {
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
      let url = f.properties.urls.pbf;
      return [url.slice("https://download.geofabrik.de/".length), url];
    }
  }
  throw new Error(`No Overpass region contains the boundary from ${gjPath}`);
}

function getOverpassIndex(): FeatureCollection {
  downloadIfNeeded(
    "https://download.geofabrik.de/index-v1.json",
    "overpass_cache/index-v1.json",
  );

  let gj = JSON.parse(
    fs.readFileSync("overpass_cache/index-v1.json", {
      encoding: "utf8",
    }),
  );
  // Sort by smallest area first
  gj.features.sort((a: any, b: any) => area(a) - area(b));
  return gj;
}

function clip(gjPath: string) {
  let [bigPbFPath, url] = findSmallest(gjPath);
  downloadIfNeeded(url, `overpass_cache/${bigPbFPath}`);
}

function downloadIfNeeded(url: string, outPath: string) {
  try {
    fs.readFileSync(outPath);
    console.log(`${outPath} already exists, not downloading it`);
  } catch (err) {
    console.log(`${outPath} missing, downloading it`);
    execSync(`mkdir -p ${path.dirname(outPath)}`);
    execSync(`wget ${url} -O ${outPath}`, { stdio: "inherit" });
  }
}

main();
