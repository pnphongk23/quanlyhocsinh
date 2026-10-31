import { readFileSync, writeFileSync } from "node:fs";

const stagingHost = "https://qlh-staging-api.tolaphamnhuphong.workers.dev";
const devHost = "https://qlh-dev-api.tolaphamnhuphong.workers.dev";
const source = readFileSync("public/_headers", "utf8");

if (!source.includes(stagingHost) || source.includes(devHost)) {
  throw new Error("Expected staging-only API host in public/_headers");
}

const devHeaders = source.replaceAll(stagingHost, devHost);
writeFileSync("dist-dev/_headers", devHeaders);
