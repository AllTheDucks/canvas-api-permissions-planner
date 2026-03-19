import { readFileSync, copyFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = resolve(__dirname, "../public/data");
const SOURCE = resolve(DATA_DIR, "endpoints.json");

const raw = JSON.parse(readFileSync(SOURCE, "utf-8"));
const version: string = raw.version;

if (!version || !/^\d{4}-\d{2}-\d{2}$/.test(version)) {
  console.error(`✗ Could not read a valid version from endpoints.json (got "${version}")`);
  process.exit(1);
}

const dest = resolve(DATA_DIR, `endpoints.${version}.json`);

if (existsSync(dest)) {
  console.log(`✓ Archive already exists: endpoints.${version}.json — nothing to do`);
  process.exit(0);
}

copyFileSync(SOURCE, dest);
console.log(`✓ Archived endpoints.json → endpoints.${version}.json`);
