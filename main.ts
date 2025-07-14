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
  } else if (process.argv[2] == "sync-all") {
    let skipExisting = false;
    syncAll(skipExisting);
  } else {
    console.log("Unknown command");
  }
}

// Returns the [cache path, full URL, friendly name]
function findSmallest(gjPath: string): [string, string, string] {
  let boundary = JSON.parse(fs.readFileSync(gjPath, { encoding: "utf8" }));
  if (
    boundary.type != "Feature" ||
    !["Polygon", "MultiPolygon"].includes(boundary.geometry.type)
  ) {
    throw new Error(
      `${gjPath} isn't a GJ file with one Polygon or MultiPolygon boundary`,
    );
  }

  let friendlyName = boundary.properties.name;
  if (!friendlyName) {
    throw new Error(`${gjPath} doesn't have a 'name' property`);
  }

  let overpassIndex = getOverpassIndex();
  for (let f of overpassIndex.features) {
    if (booleanContains(f, boundary)) {
      let url = f.properties.urls.pbf;
      let pathName = url.slice("https://download.geofabrik.de/".length);
      return [`overpass_cache/${pathName}`, url, friendlyName];
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
  if (!gjPath.startsWith("input/")) {
    throw new Error(`${gjPath} must be in input/`);
  }

  let [bigPbFPath, url, friendlyName] = findSmallest(gjPath);
  downloadIfNeeded(url, bigPbFPath);

  let outPath = gjPath
    .replace("input/", "output/")
    .replace(".geojson", ".osm.pbf");
  run(`mkdir -p ${path.dirname(outPath)}`);
  run(`osmium extract -p ${gjPath} ${bigPbFPath} -o ${outPath} --overwrite`);
  updateManifest(
    gjPath.slice("input/".length).slice(0, -".geojson".length),
    friendlyName,
    getTimestamp(bigPbFPath),
  );
}

function syncAll(skipExisting: boolean) {
  for (let gjPath of getAllFilePathsInDirectory("input")) {
    if (skipExisting) {
      let outPath = gjPath
        .replace("input/", "output/")
        .replace(".geojson", ".osm.pbf");
      try {
        fs.statSync(outPath);
        console.log(`${outPath} exists, skipping`);
        continue;
      } catch (err) {}
    }

    console.log(`Working on ${gjPath}`);
    clip(gjPath);
  }
}

function getTimestamp(pbfPath: string): string {
  let out = JSON.parse(
    execSync(`osmium fileinfo -j ${pbfPath}`) as unknown as string,
  );
  return out.header.option.timestamp;
}

function updateManifest(
  boundaryPath: string,
  friendlyName: string,
  timestamp: string,
) {
  let parts = [...boundaryPath.split("/")];
  if (parts.length != 2) {
    throw new Error(
      `${boundaryPath} has an unexpected form -- should just be <REGION>/<BOUNDARY>`,
    );
  }
  let [region, boundary] = parts;

  let json = {};
  try {
    json = JSON.parse(
      fs.readFileSync("output/manifest.json", { encoding: "utf8" }),
    );
  } catch (err) {}

  if (!Object.hasOwn(json, region)) {
    json[region] = {};
  }
  json[region][boundary] = [friendlyName, timestamp];

  fs.writeFileSync("output/manifest.json", JSON.stringify(json, null, "  "));
}

function downloadIfNeeded(url: string, outPath: string) {
  try {
    fs.readFileSync(outPath);
    console.log(`${outPath} already exists, not downloading it`);
  } catch (err) {
    console.log(`${outPath} missing, downloading it`);
    run(`mkdir -p ${path.dirname(outPath)}`);
    run(`wget ${url} -O ${outPath}`);
  }
}

function run(command: string) {
  console.log(`> ${command}`);
  execSync(command, { stdio: "inherit" });
}

// Returns the path to all files in a directory, recursing.
function getAllFilePathsInDirectory(directoryPath: string): string[] {
  let results: string[] = [];
  for (let file of fs.readdirSync(directoryPath)) {
    let filePath = path.join(directoryPath, file);
    if (fs.statSync(filePath).isDirectory()) {
      results = results.concat(getAllFilePathsInDirectory(filePath));
    } else {
      results.push(filePath);
    }
  }
  return results;
}

main();
