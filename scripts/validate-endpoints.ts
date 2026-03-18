import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { EndpointsDataSchema } from "../src/schemas/endpoints.ts";
import type { EndpointsData } from "../src/schemas/endpoints.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_PATH = resolve(__dirname, "../public/data/endpoints.json");
const EN_PATH = resolve(__dirname, "../src/i18n/en.json");

let errors = 0;
let warnings = 0;

function error(msg: string) {
  console.error(`  ERROR: ${msg}`);
  errors++;
}

function warn(msg: string) {
  console.warn(`  WARN:  ${msg}`);
  warnings++;
}

function info(msg: string) {
  console.log(`  INFO:  ${msg}`);
}

// ---------------------------------------------------------------------------
// Load and parse
// ---------------------------------------------------------------------------

const raw = JSON.parse(readFileSync(DATA_PATH, "utf-8"));

// 1. Zod schema validation
console.log("\n--- Zod schema validation ---");
const parsed = EndpointsDataSchema.safeParse(raw);
if (!parsed.success) {
  for (const issue of parsed.error.issues) {
    error(`${issue.path.join(".")}: ${issue.message}`);
  }
  console.log(`\n✗ ${errors} error(s) — aborting (data does not pass schema)`);
  process.exit(1);
}
info("Schema validation passed");

const data: EndpointsData = parsed.data;

// ---------------------------------------------------------------------------
// 6. Version format
// ---------------------------------------------------------------------------
console.log("\n--- Version format ---");
if (!/^\d{4}-\d{2}-\d{2}$/.test(data.version)) {
  error(`version "${data.version}" does not match YYYY-MM-DD`);
} else {
  info(`Version: ${data.version}`);
}

// ---------------------------------------------------------------------------
// Collect all referenced symbols from endpoints
// ---------------------------------------------------------------------------
const referencedSymbols = new Set<string>();

function extractSymbols(
  entry: { symbol?: string; anyOf?: string[] },
): string[] {
  if ("anyOf" in entry && entry.anyOf) return entry.anyOf;
  if ("symbol" in entry && entry.symbol) return [entry.symbol];
  return [];
}

for (const ep of data.endpoints) {
  for (const perm of ep.permissions) {
    for (const sym of extractSymbols(perm)) {
      referencedSymbols.add(sym);
    }
  }
}

// ---------------------------------------------------------------------------
// 2. Permission symbol references
// ---------------------------------------------------------------------------
console.log("\n--- Permission symbol references ---");
const permissionMap = new Set(Object.keys(data.permissions));
let refErrors = 0;
for (const ep of data.endpoints) {
  for (const perm of ep.permissions) {
    for (const sym of extractSymbols(perm)) {
      if (!permissionMap.has(sym)) {
        error(`${ep.method} ${ep.path}: references unknown permission "${sym}"`);
        refErrors++;
      }
    }
  }
}
if (refErrors === 0) info("All permission references are valid");

// ---------------------------------------------------------------------------
// 3. Orphan permissions
// ---------------------------------------------------------------------------
console.log("\n--- Orphan permissions ---");
let orphanCount = 0;
for (const sym of permissionMap) {
  if (!referencedSymbols.has(sym)) {
    warn(`Permission "${sym}" is defined but never referenced by any endpoint`);
    orphanCount++;
  }
}
if (orphanCount === 0) info("No orphan permissions");

// ---------------------------------------------------------------------------
// 4. Duplicate endpoints
// ---------------------------------------------------------------------------
console.log("\n--- Duplicate endpoints ---");
const endpointKeys = new Set<string>();
let dupCount = 0;
for (const ep of data.endpoints) {
  const key = `${ep.method} ${ep.path}`;
  if (endpointKeys.has(key)) {
    error(`Duplicate endpoint: ${key}`);
    dupCount++;
  }
  endpointKeys.add(key);
}
if (dupCount === 0) info("No duplicate endpoints");

// ---------------------------------------------------------------------------
// 5. Duplicate permission entries within an endpoint
// ---------------------------------------------------------------------------
console.log("\n--- Duplicate permission entries ---");
let dupPermCount = 0;
for (const ep of data.endpoints) {
  const seen = new Set<string>();
  for (const perm of ep.permissions) {
    const key =
      "anyOf" in perm && perm.anyOf
        ? `anyOf:${[...perm.anyOf].sort().join(",")}`
        : `symbol:${"symbol" in perm ? perm.symbol : ""}`;
    if (seen.has(key)) {
      error(
        `${ep.method} ${ep.path}: duplicate permission entry ${key}`,
      );
      dupPermCount++;
    }
    seen.add(key);
  }
}
if (dupPermCount === 0) info("No duplicate permission entries");

// ---------------------------------------------------------------------------
// 7. Path format
// ---------------------------------------------------------------------------
console.log("\n--- Path format ---");
let pathErrors = 0;
for (const ep of data.endpoints) {
  if (!ep.path.startsWith("/api/v1/")) {
    error(`${ep.method} ${ep.path}: path does not start with /api/v1/`);
    pathErrors++;
  }
}
if (pathErrors === 0) info("All paths start with /api/v1/");

// ---------------------------------------------------------------------------
// 8. Permission symbol format (snake_case, no leading colon)
// ---------------------------------------------------------------------------
console.log("\n--- Permission symbol format ---");
let fmtErrors = 0;
for (const [sym] of Object.entries(data.permissions)) {
  if (sym.startsWith(":")) {
    error(`Permission symbol "${sym}" has a leading colon`);
    fmtErrors++;
  }
  if (!/^[a-z][a-z0-9_]*$/.test(sym)) {
    error(`Permission symbol "${sym}" is not snake_case`);
    fmtErrors++;
  }
}
if (fmtErrors === 0) info("All permission symbols are valid snake_case");

// ---------------------------------------------------------------------------
// 9. Optional permissions must have notes
// ---------------------------------------------------------------------------
console.log("\n--- Optional permission notes ---");
let noteErrors = 0;
for (const ep of data.endpoints) {
  for (const perm of ep.permissions) {
    if ("required" in perm && perm.required === false) {
      if (!("note" in perm) || !perm.note) {
        error(
          `${ep.method} ${ep.path}: optional permission entry missing note`,
        );
        noteErrors++;
      }
    }
  }
}
if (noteErrors === 0) info("All optional permissions have notes");

// ---------------------------------------------------------------------------
// 9b. Note values must be valid translation keys in en.json
// ---------------------------------------------------------------------------
console.log("\n--- Note translation keys ---");
const enStrings: Record<string, string> = JSON.parse(
  readFileSync(EN_PATH, "utf-8"),
);
let noteKeyErrors = 0;
for (const ep of data.endpoints) {
  if (ep.notes) {
    if (!ep.notes.startsWith("notes.endpoint.")) {
      error(
        `${ep.method} ${ep.path}: endpoint notes "${ep.notes}" does not use a notes.endpoint.* key`,
      );
      noteKeyErrors++;
    } else if (!(ep.notes in enStrings)) {
      error(
        `${ep.method} ${ep.path}: endpoint notes key "${ep.notes}" not found in en.json`,
      );
      noteKeyErrors++;
    }
  }
  for (const perm of ep.permissions) {
    if ("note" in perm && perm.note) {
      if (!perm.note.startsWith("notes.perm.")) {
        error(
          `${ep.method} ${ep.path}: permission note "${perm.note}" does not use a notes.perm.* key`,
        );
        noteKeyErrors++;
      } else if (!(perm.note in enStrings)) {
        error(
          `${ep.method} ${ep.path}: permission note key "${perm.note}" not found in en.json`,
        );
        noteKeyErrors++;
      }
    }
  }
}
if (noteKeyErrors === 0)
  info("All note values are valid translation keys in en.json");

// ---------------------------------------------------------------------------
// 10. SIS URL reference coverage
// ---------------------------------------------------------------------------
console.log("\n--- SIS URL reference coverage ---");

const SIS_RESOLVABLE_NAMED = new Set([
  ":account_id",
  ":course_id",
  ":user_id",
  ":section_id",
  ":term_id",
  ":group_id",
  ":group_category_id",
  ":login_id",
]);
const SIS_RESOLVABLE_COLLECTIONS = new Set([
  "accounts",
  "courses",
  "users",
  "sections",
  "groups",
]);

function hasSisResolvableParam(path: string): boolean {
  const segments = path.split("/").filter(Boolean);
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    if (SIS_RESOLVABLE_NAMED.has(seg)) return true;
    if (
      seg === ":id" &&
      i > 0 &&
      SIS_RESOLVABLE_COLLECTIONS.has(segments[i - 1])
    ) {
      return true;
    }
  }
  return false;
}

function hasReadSisEntry(
  permissions: Array<{ symbol?: string; anyOf?: string[] }>,
): boolean {
  for (const perm of permissions) {
    const syms = extractSymbols(perm);
    if (syms.includes("read_sis") || syms.includes("manage_sis")) return true;
  }
  return false;
}

let sisMissing = 0;
for (const ep of data.endpoints) {
  if (hasSisResolvableParam(ep.path) && !hasReadSisEntry(ep.permissions)) {
    warn(`${ep.method} ${ep.path}: has SIS-resolvable param but no read_sis/manage_sis entry`);
    sisMissing++;
  }
}
if (sisMissing === 0) {
  info("All endpoints with SIS-resolvable params have read_sis/manage_sis");
} else {
  info(`${sisMissing} endpoint(s) missing SIS permission entry`);
}

// ---------------------------------------------------------------------------
// 11. Empty permissions array
// ---------------------------------------------------------------------------
console.log("\n--- Empty permissions ---");
let emptyCount = 0;
for (const ep of data.endpoints) {
  if (ep.permissions.length === 0) {
    info(`${ep.method} ${ep.path}: empty permissions array`);
    emptyCount++;
  }
}
if (emptyCount === 0) {
  info("No endpoints with empty permissions");
} else {
  info(`${emptyCount} endpoint(s) with empty permissions`);
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
console.log("\n--- Summary ---");
info(`${data.endpoints.length} endpoints, ${Object.keys(data.permissions).length} permissions`);

if (errors > 0) {
  console.log(`\n✗ ${errors} error(s), ${warnings} warning(s)\n`);
  process.exit(1);
} else if (warnings > 0) {
  console.log(`\n✓ 0 errors, ${warnings} warning(s)\n`);
} else {
  console.log(`\n✓ All checks passed\n`);
}
