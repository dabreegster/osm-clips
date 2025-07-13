import * as fs from "fs";
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
  let overpassIndex = getOverpassIndex();
  console.log(overpassIndex);
}

function getOverpassIndex(): FeatureCollection<MultiPolygon, {}> {
  try {
    let file = fs.readFileSync("overpass_cache/index-v1.json", {
      encoding: "utf8",
    });
    return JSON.parse(file);
  } catch (err) {
    console.log("Overpass index missing, downloading it");
    execSync("mkdir -p overpass_cache");
    execSync(
      "wget https://download.geofabrik.de/index-v1.json -O overpass_cache/index-v1.json",
    );

    let file = fs.readFileSync("overpass_cache/index-v1.json", {
      encoding: "utf8",
    });
    return JSON.parse(file);
  }
}

main();
