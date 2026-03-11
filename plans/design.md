# Canvas API Permissions Planner — Design

## Context

This is a new greenfield project. The goal is a fully client-side React/TypeScript tool that helps Canvas LMS extension developers identify which API permissions their API user needs, based on the REST endpoints they call.

The tool will:
1. Let users select or paste API endpoint paths
2. Display the required Canvas role permissions for those endpoints
3. Show permissions with UI labels in the user's chosen language

Source data: `canvas_api_permissions.md` (project root) — a comprehensive mapping of ~300 API endpoints to permission symbols, manually derived from Canvas LMS source.

CI/CD is explicitly deferred to a later phase.

---

## Tech Stack

| Tool | Version | Purpose |
|------|---------|---------|
| Vite | 6 | Build tool and dev server |
| React | 19 | UI |
| TypeScript | 5 | Type safety |
| Mantine | 8 | Component library (uses CSS Modules, requires PostCSS) |
| Zod | 4 | Schema validation for all external data |
| js-yaml | 4 | Parse Canvas YAML locale files |
| crc-32 | latest | CRC32 for i18nliner key derivation (pure JS) |
| vite-plugin-svgr | latest | Import SVGs as React components (for theme-aware logo) |
| Vitest | 4 | Unit testing framework |
| pnpm | latest | Package manager |

### Browser Compatibility

**Target:** Last 2 versions of Chrome, Firefox, Safari, and Edge.

Vite's default `build.target` is `'modules'` (ES2020+), which already covers these browsers. No Browserslist config, polyfills, or transpilation overrides are needed. IE 11 is not supported.

---

## Project Initialisation Commands

```bash
pnpm create vite . --template react-ts
pnpm install
pnpm add @mantine/core @mantine/hooks @mantine/notifications
pnpm add zod js-yaml crc-32
pnpm add -D @types/js-yaml postcss postcss-preset-mantine postcss-simple-vars vite-plugin-svgr
```

Mantine v8 requires a `postcss.config.cjs` with `postcss-preset-mantine` and explicit CSS imports in `main.tsx` for each Mantine package used:

```tsx
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
```

(No other Mantine `styles.css` imports are needed — the project uses only `@mantine/core` and `@mantine/notifications` component packages.)

---

## Project Structure

```
canvas-api-permissions-planner/
├── public/
│   ├── favicon.svg                      # ATD icon mark (orange duck/flame shape)
│   ├── favicon.ico                      # ICO fallback (16×16 + 32×32 raster)
│   ├── og-image.png                     # 1200×630 Open Graph / Twitter card image
│   ├── data/
│   │   ├── endpoints.json               # Current endpoint→permission mappings (fetched at runtime)
│   │   └── endpoints.{version}.json     # Archived endpoint data for old link resolution
├── src/
│   ├── main.tsx                         # Entry; AppErrorBoundary + MantineProvider wrapping
│   ├── App.tsx                          # Root layout, state ownership, URL sync
│   ├── vite-env.d.ts                    # Vite + SVGR + gtag type declarations
│   ├── assets/
│   │   └── atd-logo.svg                 # ATD wordmark — text fill="currentColor"; icon #FFAF11
│   ├── i18n/
│   │   ├── locales.ts                   # SUPPORTED_LOCALES, RTL_LOCALES, LOCALE_NAMES, SUPPLEMENTAL_FONTS
│   │   ├── en.json                      # App UI strings — source of truth (English)
│   │   ├── ar.json                      # Arabic (AI-translated)
│   │   ├── cs.json                      # Czech (AI-translated)
│   │   └── ...                          # One file per Canvas locale
│   ├── context/
│   │   └── AppTranslationsContext.tsx    # Context, provider, and useAppTranslations hook
│   ├── schemas/
│   │   ├── endpoints.ts                 # Zod schema validating endpoints.json
│   │   └── canvasLocale.ts              # Zod schema for parsed Canvas locale YAML objects
│   ├── styles/
│   │   └── print.css                    # @media print stylesheet
│   ├── types/
│   │   └── index.ts                     # Shared TypeScript types (Endpoint, Permission, etc.)
│   ├── hooks/
│   │   ├── useEndpoints.ts              # Fetch + validate endpoints.json from public/data/
│   │   └── useLocale.ts                 # Fetch, parse, cache, and apply Canvas locale files
│   ├── utils/
│   │   ├── analytics.ts                 # trackEvent() wrapper around global gtag
│   │   ├── detectLocale.ts              # Browser locale detection from navigator.languages
│   │   ├── endpointMatcher.ts           # Normalise pasted URLs → match against known endpoints
│   │   ├── i18nKey.ts                   # Canvas i18nliner key derivation (slug + CRC32)
│   │   ├── permissionAggregator.ts      # Deduplicate + group permissions from selected endpoints
│   │   ├── supplementalFont.ts          # Idempotent Google Fonts loader for non-Latin scripts
│   │   └── urlState.ts                  # Bitmask encode/decode for URL sharing / deep linking
│   └── components/
│       ├── AppErrorBoundary/
│       │   └── index.tsx                # React error boundary — catches ZodError on startup
│       ├── ColorSchemeToggle/
│       │   └── index.tsx                # Sun/moon icon button; toggles and persists color scheme
│       ├── EndpointPaste/
│       │   └── index.tsx                # Textarea for pasting endpoint lists
│       ├── EndpointSelector/
│       │   └── index.tsx                # Searchable list grouped by category
│       ├── HelpModal/
│       │   └── index.tsx                # ActionIcon button + Modal with three Tabs
│       ├── LanguagePicker/
│       │   └── index.tsx                # Mantine Select for locale choice
│       ├── PermissionsResult/
│       │   └── index.tsx                # Aggregated permissions table
│       └── SelectedEndpoints/
│           └── index.tsx                # Chips/badges for selected endpoints with remove
├── docs/
│   ├── regenerate-data-prompt.md        # Prompt for regenerating endpoints.json from Canvas source
│   └── generate-translations-prompt.md  # Prompt for AI-translating en.json into all 34 locales
├── index.html
├── postcss.config.cjs
├── vite.config.ts
├── tsconfig.json
├── package.json
└── LICENSE                              # MIT
```

---

## Data File: `public/data/endpoints.json`

`endpoints.json` is served as a static asset from `public/data/` and fetched at runtime by `useEndpoints`. It is **not** bundled into the JS — this keeps the initial bundle small so the app shell renders immediately while the data loads in parallel.

`endpoints.json` and `canvas_api_permissions.md` are both generated by Claude reading the Canvas LMS source code on GitHub — primarily `config/initializers/permissions_registry.rb`, `config/routes.rb`, and the relevant `app/controllers/*_api_controller.rb` files.

The full prompt to use when regenerating this data is in **`docs/regenerate-data-prompt.md`**. Use it when Canvas releases new API endpoints or changes permission requirements.

The conversion from Canvas source to JSON requires human (or AI) interpretation — the source uses model-level symbols (`:read`, `:create`, `GRANULAR_*` macros) that must be resolved to concrete permission symbols. The full resolution rules are in the prompt document.

### Conversion Rules

**Permission Reference Table → `permissions` map:**
- Strip the leading `:` from each symbol (`:manage_grades` → `manage_grades`).

**Endpoint table → `endpoints` array:**

Each row in the markdown tables becomes one entry. The conversion rules for each field:

- **`method` + `path`**: Split the first cell on the first space. Path is used verbatim (`:course_id`, `:id`, etc. are already in canonical `:param` form).
- **`category`**: The `### ` section heading the endpoint falls under.
- **`notes`**: Copy the Notes cell text directly. Omit the field entirely if the cell is empty.
- **`permissions`**: The Permission Symbol(s) cell. Apply the following translation rules:

| Source markdown pattern | JSON representation |
|---|---|
| Single `:symbol` | `{ "symbol": "symbol" }` |
| `:symbolA` / `:symbolB` (slash-separated) | `{ "anyOf": ["symbolA", "symbolB"] }` |
| `GRANULAR_MANAGE_ASSIGNMENT_PERMISSIONS` | `{ "anyOf": ["manage_assignments_add", "manage_assignments_edit", "manage_assignments_delete"] }` |
| `GRANULAR_MANAGE_COURSE_CONTENT_PERMISSIONS` | `{ "anyOf": ["manage_course_content_add", "manage_course_content_edit", "manage_course_content_delete"] }` |
| Multiple symbols noted as "all required" | Multiple separate `{ "symbol": "..." }` entries (AND combination) |
| Conditional field — single permission | `{ "symbol": "xxx", "required": false, "note": "Required to receive ... in response" }` |
| Conditional field — OR group | `{ "anyOf": ["xxx", "yyy"], "required": false, "note": "Required to receive ... in response" }` |

Common conditional field patterns (see "Conditional Fields Requiring Extra Permissions" in `canvas_api_permissions.md`):

| Scenario | JSON representation |
|---|---|
| SIS ID response fields | `{ "anyOf": ["read_sis", "manage_sis"], "required": false, "note": "Required to receive SIS ID fields in response" }` |
| SIS URL ID references | `{ "anyOf": ["read_sis", "manage_sis"], "required": false, "note": "Required if referencing this entity by SIS ID in the URL" }` |
| SIS write fields (POST/PUT) | `{ "symbol": "manage_sis", "required": false, "note": "Required to write SIS ID fields" }` |
| `sis_import_id` field | `{ "symbol": "manage_sis", "required": false, "note": "Required to receive sis_import_id in response" }` |
| Login ID fields | `{ "symbol": "view_user_logins", "required": false, "note": "Required to receive login_id / sis_login_id in response" }` |
| Email addresses | `{ "symbol": "read_email_addresses", "required": false, "note": "Required to receive email addresses in response" }` |
| Grade fields for other students | `{ "anyOf": ["view_all_grades", "manage_grades"], "required": false, "note": "Required to see grade data for all students" }` |
| Unpublished assignments | `{ "anyOf": ["manage_assignments_add", "manage_assignments_edit", "manage_assignments_delete"], "required": false, "note": "Required to see unpublished assignments" }` |
| Unpublished pages | `{ "symbol": "manage_wiki_update", "required": false, "note": "Required to see unpublished pages" }` |
| Unpublished discussions | `{ "anyOf": ["moderate_forum", "manage_course_content_add", "manage_course_content_edit", "manage_course_content_delete"], "required": false, "note": "Required to see unpublished discussion topics" }` |

**Model-level permission resolution:** Canvas controllers use policy-level abstractions (`:read`, `:create`, `:update`, `:delete`, `:grade`, `:read_as_admin`). These are not direct permission symbols — they resolve via Canvas policy classes. The Notes column in the markdown typically explains the mapping. Common resolutions:

| Model-level symbol | Resolves to |
|---|---|
| `:read` (course content context) | `read_course_content` |
| `:create` (assignment context) | `manage_assignments_add` |
| `:update` (assignment context) | `manage_assignments_edit` |
| `:delete` (assignment context) | `manage_assignments_delete` |
| `:grade` | `manage_grades` |
| `:read_as_admin` | Context-dependent — check the Notes column; often means any of the relevant `GRANULAR_*` set or `manage_grades` |

When the Notes column gives an explicit mapping, use that. When it doesn't, use the table above. If genuinely ambiguous, add a `notes` entry explaining the uncertainty.

### Verification

After completing the transcription, verify correctness:

1. `pnpm run dev` — `useEndpoints` fetches and validates `public/data/endpoints.json` on mount; any structural violation surfaces as an error state with a Zod error message.
2. Check the browser console for the parsed data to confirm endpoint and permission counts (~300 endpoints, ~100 permissions).
3. Spot-check 5–10 endpoints across different categories against the source markdown to catch transcription errors.

The `version` field is the date of the Canvas LMS stable release the data was derived from (e.g. `"2026-02-11"`), matching the date format used in Instructure's public release notes. It is extracted from the `prod` branch HEAD commit message, which references the stable branch name (e.g. `stable/2026-02-11`). This value is used in the URL sharing `v` parameter for bitmask resolution. Bump it whenever the file is regenerated against a new Canvas release.

### Shape:

```jsonc
{
  "version": "2026-02-11",
  "permissions": {
    "manage_grades": { "label": "Grades - edit" },
    "read_sis":      { "label": "SIS Data - view" },
    "manage_sis":    { "label": "SIS Data - manage" },
    "read_rubrics":  { "label": "Rubrics - read" }
    // ... all ~100 permissions from the Permission Reference Table
  },
  "endpoints": [
    {
      "method": "GET",
      "path": "/api/v1/courses/:course_id/assignments",
      "category": "Assignments",
      "permissions": [
        { "symbol": "read_course_content" },
        { "anyOf": ["manage_grades", "view_all_grades"] }
      ],
      "notes": "Enrolled students see published assignments automatically..."
    },
    {
      "method": "GET",
      "path": "/api/v1/courses/:course_id/enrollments",
      "category": "Enrollments",
      "permissions": [
        { "anyOf": ["read_roster", "view_all_grades", "manage_grades"] },
        { "anyOf": ["read_sis", "manage_sis"], "required": false, "note": "Required to receive SIS ID fields in response" },
        { "anyOf": ["read_sis", "manage_sis"], "required": false, "note": "Required if referencing this entity by SIS ID in the URL" },
        { "symbol": "manage_sis", "required": false, "note": "Required to receive sis_import_id in response" },
        { "symbol": "read_email_addresses", "required": false, "note": "Required to receive email addresses in response" }
      ]
    }
    // ... all ~300 endpoints
  ]
}
```

Each entry in `permissions` is one of two shapes:
- **Single:** `{ "symbol": "...", "required"?: boolean, "note"?: string }` — a specific named permission.
  - `required` omitted or `true` — must have this permission to call the endpoint at all.
  - `required: false` — the endpoint works without it, but returns less data. The `note` field explains what it unlocks (e.g. SIS ID fields, email addresses, unpublished content).
- **OR group:** `{ "anyOf": ["...", "..."], "required"?: boolean, "note"?: string }` — any one of the listed permissions is sufficient.
  - `required` omitted or `true` — must satisfy one of these permissions to call the endpoint.
  - `required: false` — the endpoint works without any of these, but returns less data. The `note` field explains what it unlocks.

All entries in the `permissions` array are **AND-combined** — every required entry must be satisfied to call the endpoint. Entries with `required: false` are optional — they unlock additional data in the response but don't gate access to the endpoint itself. An endpoint can contain any mix of required singles, required OR groups, and optional entries. For example, the first endpoint above requires `read_course_content` **and** one of (`manage_grades` or `view_all_grades`).

`i18nKey` values are **not stored** in `endpoints.json` — they are computed at runtime from `label` by `src/utils/i18nKey.ts` when a locale is selected. See **Localisation Architecture** for the derivation algorithm.

**Notes:** The `notes` field is optional free text providing a user-facing caveat about the endpoint — e.g. when the endpoint behaves differently for certain callers, or requires a feature flag to be enabled. It is displayed via `IconInfoCircle` + Mantine `Tooltip` in two places (see Contextual Tooltips section). Notes are not shown in the permissions result — they belong to the endpoint, not to any individual permission.

**Categories:** The `category` field uses the `### ` section heading strings from the `## API Endpoint Mappings` section of `canvas_api_permissions.md` (e.g. `"Assignments"`, `"Enrollments"`, `"Audit — Grade Change"`). Each endpoint belongs to exactly one category. The schema validates only that it is a non-empty string — no enum constraint — so new categories can be added to `endpoints.json` without any code change.

The `EndpointSelector` derives the category list at runtime from the loaded data:
```typescript
const categories = [...new Set(endpoints.map(e => e.category))];
```
This preserves the order categories appear in `endpoints.json` (which should match the source document order) and automatically picks up any new categories added in future data updates.

---

## Zod Schemas (`src/schemas/`)

### `endpoints.ts`
Validates `endpoints.json` at startup — fail loudly if the file is malformed.

```typescript
const PermissionRefSchema = z.object({
  label: z.string(),      // English label; i18nKey is derived from this at runtime
});

// A single named permission — required to call the endpoint, or conditional (required: false)
const SinglePermissionSchema = z.object({
  symbol: z.string(),
  required: z.boolean().optional(),
  note: z.string().optional(),
});

// An OR group — any one of the listed permissions satisfies the requirement
// Also supports required: false + note for conditional/optional OR groups
const AnyOfPermissionSchema = z.object({
  anyOf: z.array(z.string()).min(2),
  required: z.boolean().optional(),
  note: z.string().optional(),
});

// Discriminated by presence of "anyOf" key
const EndpointPermissionSchema = z.union([AnyOfPermissionSchema, SinglePermissionSchema]);

const EndpointSchema = z.object({
  method: z.enum(["GET", "POST", "PUT", "DELETE", "PATCH"]),
  path: z.string().startsWith("/"),
  category: z.string().min(1),
  permissions: z.array(EndpointPermissionSchema),
  notes: z.string().optional(),
});

export const EndpointsDataSchema = z.object({
  version: z.string(),
  permissions: z.record(z.string(), PermissionRefSchema),
  endpoints: z.array(EndpointSchema),
});
```

Note: `z.union([AnyOfPermissionSchema, SinglePermissionSchema])` — `AnyOfPermissionSchema` must be listed first so Zod's union tries the `anyOf` shape before falling through to `SinglePermissionSchema`. Both schemas now have `required` and `note` as optional fields, but `SinglePermissionSchema` would still accept `anyOf`-shaped objects (since `symbol` is optional-ish via union fallback) if tried first. Keeping `AnyOfPermissionSchema` first ensures the `anyOf` key is matched correctly.

### `canvasLocale.ts`
The Canvas locale YAML files have the structure:
```yaml
es:
  grades_edit_773dfc24: "Calificaciones: editar"
  some_nested_key:
    child_key: "..."
  # ... thousands of other keys (flat and nested)
```

The parsed object is `{ es: { grades_edit_773dfc24: "Calificaciones: editar", ... } }`. We only care about the flat string values at the top level under the locale code — we never need to traverse nested keys for permission labels.

The inner record is intentionally loose since Canvas locale files are large and contain many keys unrelated to permissions. The outer key, however, is constrained to the specific locale code being fetched — this catches the case where the YAML parses successfully but doesn't contain the expected locale key:

```typescript
// Build a schema that expects the fetched locale code as the outer key.
// Called in useLocale.ts with the locale being fetched (e.g. "es").
export function canvasLocaleSchema(localeCode: string) {
  return z.object({
    [localeCode]: z.record(z.string(), z.unknown()),
  });
}

export type CanvasLocaleData = z.infer<ReturnType<typeof canvasLocaleSchema>>;

// Helper to safely extract a permission label translation
export function getTranslation(
  parsed: Record<string, Record<string, unknown>>,
  localeCode: string,
  i18nKey: string
): string | undefined {
  const val = parsed[localeCode]?.[i18nKey];
  return typeof val === "string" ? val : undefined;
}
```

---

## Startup Data Loading and Error Handling

### `src/hooks/useEndpoints.ts`

`endpoints.json` is served as a static asset from `public/data/` and fetched at runtime. This keeps the initial JS bundle small — the app shell (header, spinner, layout chrome) renders immediately while the data loads in parallel.

**Hook signature:**

```typescript
type EndpointsResult =
  | { status: 'loading' }
  | { status: 'error'; error: Error }
  | { status: 'ready'; version: string; allPermissions: Record<string, PermissionRef>; endpoints: Endpoint[] };

export function useEndpoints(): EndpointsResult
```

**Implementation pattern — fetch on mount, module-level cache:**

```typescript
import { useState, useEffect } from 'react';
import { EndpointsDataSchema } from '../schemas/endpoints';
import type { PermissionRef, Endpoint } from '../types';

type EndpointsData = {
  version: string;
  allPermissions: Record<string, PermissionRef>;
  endpoints: Endpoint[];
};

let cached: EndpointsData | null = null;

export function useEndpoints(): EndpointsResult {
  const [state, setState] = useState<EndpointsResult>(
    cached ? { status: 'ready', ...cached } : { status: 'loading' }
  );

  useEffect(() => {
    if (cached) return;

    fetch('/data/endpoints.json')
      .then(res => {
        if (!res.ok) throw new Error(`Failed to fetch endpoints.json: ${res.status}`);
        return res.json();
      })
      .then(raw => {
        const result = EndpointsDataSchema.parse(raw);
        cached = {
          version: result.version,
          allPermissions: result.permissions,
          endpoints: result.endpoints,
        };
        setState({ status: 'ready', ...cached });
      })
      .catch(err => setState({ status: 'error', error: err }));
  }, []);

  return state;
}
```

Key decisions:
- Uses `.parse()` — both `ZodError` (validation failure) and network errors are caught by the single `.catch()` and surfaced via the `error` state.
- Module-level `cached` avoids re-fetching when the hook re-mounts (e.g. React strict mode double-mount). The `useState` initialiser checks the cache synchronously, so subsequent mounts are instant.
- Returns a discriminated union — `App.tsx` renders a loading spinner for `'loading'`, an error state for `'error'`, and the full UI for `'ready'`.

### App Loading State

`App.tsx` renders a centered Mantine `Loader` while `useEndpoints` is in the `'loading'` state. The app shell (header, footer, color scheme) is visible immediately — only the main content area shows the spinner:

```tsx
const endpoints = useEndpoints();

if (endpoints.status === 'loading') {
  return <Center h="60vh"><Loader /></Center>;
}

if (endpoints.status === 'error') {
  return (
    <Center h="60vh">
      <Stack align="center">
        <Text c="red" fw={500}>Failed to load permission data</Text>
        <Text size="sm" c="dimmed" maw={400} ta="center">
          {endpoints.error.message}
        </Text>
      </Stack>
    </Center>
  );
}

const { version, allPermissions, endpoints: endpointList } = endpoints;
// ... rest of App
```

The error state is not a user-facing concern in production — `endpoints.json` is a static file served from the same origin. It exists to surface developer mistakes during development (e.g. editing the JSON and introducing a schema violation) or extremely rare network issues.

### React Error Boundary

A minimal class-based Error Boundary still wraps the app root to catch unexpected render errors (not just data loading failures):

```tsx
// src/components/AppErrorBoundary/index.tsx
import React from 'react';

type State = { error: Error | null };

export class AppErrorBoundary extends React.Component<React.PropsWithChildren, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: '2rem', fontFamily: 'monospace' }}>
          <h1>Something went wrong</h1>
          <pre style={{ whiteSpace: 'pre-wrap', color: 'red' }}>
            {this.state.error.message}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}
```

**`main.tsx` render tree:**

```tsx
import { AppErrorBoundary } from './components/AppErrorBoundary';

createRoot(document.getElementById('root')!).render(
  <AppErrorBoundary>
    <MantineProvider theme={theme} defaultColorScheme="auto">
      <Notifications />
      <App />
    </MantineProvider>
  </AppErrorBoundary>
);
```

`AppErrorBoundary` wraps outside `MantineProvider` so it catches any render error in the tree, including Mantine initialisation failures. Data loading errors are handled by `useEndpoints` state (not thrown), so they don't reach the boundary — they render a styled error message inside the Mantine-themed layout.

---

## Localisation Architecture (`src/hooks/useLocale.ts`)

**How Canvas i18nliner keys work:**
Canvas permission labels are defined in `config/initializers/permissions_registry.rb` as `I18n.t("Grades - edit")`. i18nliner (from `instructure/i18nliner`, method `keyify_underscored_crc32`) processes these into locale YAML files using a derived key of the form `{slug}_{hash}`, where:
- `slug` = the English string lowercased, non-alphanumeric characters replaced with `_`, multiple underscores collapsed
- `hash` = CRC32(`"{length}:{string}"`) converted to hex — e.g., CRC32(`"13:Grades - edit"`) = `773dfc24`

Algorithm in pseudocode:
```
slug = label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
hash = crc32(`${label.length}:${label}`).toString(16)
i18nKey = `${slug}_${hash}`
```

Verified test case: `"Grades - edit"` → `grades_edit_773dfc24` → `es.yml` value `"Calificaciones: editar"` ✓

Canvas fully localises permission labels (confirmed via screenshot of Canvas admin UI in Spanish). The `en.yml` file is intentionally minimal — English labels exist only as inline defaults in the Ruby source.

**i18nKey computation:**
Keys are computed at runtime by `src/utils/i18nKey.ts` using the `crc-32` npm package (pure JS, no native deps). There are only ~100 permissions in the data file and a user's selected set will typically be far fewer — computing a handful of CRC32 hashes on locale selection is negligible. No precomputation or build step is needed.

**Runtime approach:**
1. English labels are hard-coded in `endpoints.json` via `permissions[symbol].label` — always available, no network required.
2. When the user selects a non-English locale:
   a. Fetch `https://raw.githubusercontent.com/instructure/canvas-lms/stable/{version}/config/locales/{locale}.yml` (where `{version}` is the `version` string from `endpoints.json`, e.g. `2026-02-11`)
   b. Parse with `js-yaml`; validate with `canvasLocaleSchema(locale)`
   c. For each permission symbol, look up `parsedYaml[localeCode][permission.i18nKey]`
   d. Fall back to the English `label` for any key that returns a non-string or is absent
3. Results are cached in a `Map<locale, Map<symbol, translatedLabel>>` — fetched once per locale per session.
4. Show a Mantine `Loader` while fetching; show a `Notification` on fetch/parse failure (continue with English).

**Hook signature:**

```typescript
type UseLocaleResult = {
  localeLabels: Record<string, string>; // symbol → translated label (English fallback applied)
  isLoading: boolean;                   // true while fetching a non-English locale YAML
};

function useLocale(
  locale: string,
  allPermissions: Record<string, PermissionRef>,
  dataVersion: string
): UseLocaleResult
```

Behaviour:
- `locale === 'en'`: returns English labels from `allPermissions` immediately, `isLoading: false` — no network request.
- Non-English, first fetch: `isLoading: true` while fetching; `localeLabels` holds the previous locale's labels (or English if this is the first non-English locale selected) to keep the panel populated during the load.
- Non-English, cached locale: returns cached labels immediately, `isLoading: false` — no network request.
- On error: `isLoading: false`, returns English labels, shows a Mantine Notification. The `locale` state in `App.tsx` is **not** reset — the picker stays showing the locale the user selected. Because only successful fetches are added to the cache, re-selecting the same locale (or switching away and back) will automatically retry the fetch.

**Error notification content:**

The notification uses `LOCALE_NAMES[locale]` (imported from `src/i18n/locales.ts`) to produce a human-readable message, e.g.:
> *"Could not load French labels — showing in English"*

`notifications.show({ color: 'red', title: ..., message: ... })` — no custom action buttons; the notification is informational only.

**Race condition handling — AbortController:**

The fetch runs inside a `useEffect` that depends on `locale`. If the user switches locale while a fetch is in-flight, React's cleanup function runs before the new effect, aborting the stale request:

```typescript
useEffect(() => {
  if (locale === 'en' || cache.has(locale)) return;

  const controller = new AbortController();
  setIsLoading(true);

  fetch(url, { signal: controller.signal })
    .then(/* parse, validate, cache, setLocaleLabels, setIsLoading(false) */)
    .catch(err => {
      if (err.name === 'AbortError') return; // stale request cancelled — not an error
      // real fetch/parse error: setIsLoading(false), show Notification
    });

  return () => controller.abort();
}, [locale]);
```

The `AbortError` branch is silent — no notification, no state update. Only genuine network/parse failures trigger the error notification.

**Call site — `App.tsx`:**

`useLocale` is called in `App.tsx` alongside `useEndpoints`, since `App.tsx` already owns the `locale` state. `aggregatePermissions` is run as a `useMemo` in `App.tsx` with the result passed to `PermissionsResult` as a prop (this code is inside the `status === 'ready'` branch):

```tsx
const { version, allPermissions, endpoints: endpointList } = endpoints;
const { localeLabels, isLoading: localeLoading } = useLocale(locale, allPermissions, version);

const aggregated = useMemo(
  () => aggregatePermissions(selectedEndpoints, allPermissions, localeLabels),
  [selectedEndpoints, allPermissions, localeLabels]
);

// ...

<PermissionsResult
  permissions={aggregated}
  isLoadingLocale={localeLoading}
/>
```

`PermissionsResult` sets `aria-busy={isLoadingLocale}` on its container and renders a Mantine `Loader` overlay while `isLoadingLocale` is true. The previously computed `permissions` remain visible underneath (stale-while-revalidate pattern) so the panel is never blank.

**Available locales list** — hard-coded list of Canvas-supported locale codes known to have YAML files:
`ar`, `cs`, `cy`, `da`, `de`, `el`, `es`, `es-ES`, `fa`, `fi`, `fr`, `he`, `hr`, `hu`, `hy`, `ja`, `ko`, `mi`, `nb`, `nl`, `pl`, `pt`, `pt-BR`, `ro`, `ru`, `sk`, `sl`, `sv`, `th`, `tr`, `uk`, `vi`, `zh-Hans`, `zh-Hant`

This list is defined as `SUPPORTED_LOCALES` in `src/i18n/locales.ts` and imported by `useLocale.ts`, `detectLocale.ts`, and `AppTranslationsContext.tsx`.

---

## App i18n Architecture (`src/i18n/`, `src/context/AppTranslationsContext.tsx`)

The tool's own UI strings — labels, buttons, tooltips, help modal content — are fully translated for all Canvas-supported locales. This is **distinct** from Canvas permission label translation:

| Source | Mechanism | Translations by |
|--------|-----------|-----------------|
| Canvas permission labels | Runtime YAML fetch from GitHub | Canvas community |
| App UI strings | Bundled JSON per locale | AI (Claude) |

Both are driven by the same user-selected locale code.

### Browser Locale Detection (`src/utils/detectLocale.ts`)

`App.tsx` initialises the locale state from the browser's `navigator.languages` preference list, so the tool loads in the user's language without any interaction. The LanguagePicker dropdown shows the detected locale and allows the user to override it.

**Persistence:** When the user explicitly changes the locale via the picker, the choice is saved to `localStorage` under the key `locale`. On subsequent loads, the saved preference is used instead of re-detecting from the browser. `localStorage` is appropriate here — the constraint against persistence applies to application data (selected endpoints, etc.), not UI preferences.

If the user explicitly selects the same locale that `detectLocale` would have auto-detected, the stored override is cleared: there is no reason to pin a preference that already matches the browser default. This means a future browser-language change will be picked up again automatically.

```typescript
export function detectLocale(supportedLocales: string[]): string {
  const supported = new Set(supportedLocales);
  for (const browserLocale of navigator.languages ?? [navigator.language]) {
    // Iteratively strip subtags until a match is found: "es-MX" → "es", "zh-Hans-CN" → "zh-Hans"
    const parts = browserLocale.split('-');
    for (let len = parts.length; len >= 1; len--) {
      const candidate = parts.slice(0, len).join('-');
      if (supported.has(candidate)) return candidate;
    }
  }
  return 'en';
}
```

Matching examples:
- `es-ES` (browser) → exact match → `es-ES` ✓
- `es-MX` → strips to `es` → match ✓
- `pt-BR` → exact match ✓
- `pt-PT` → strips to `pt` → match ✓
- `zh-Hans-CN` → strips to `zh-Hans` → match ✓
- `ar` → exact match ✓
- `en-AU`, `en-GB` → strips to `en` → matches `'en'` in supported list ✓

`App.tsx` initialises and persists:
```tsx
const [locale, setLocale] = useState(() => {
  const stored = localStorage.getItem('locale');
  if (stored && isSupportedLocale(stored)) return stored;
  if (stored) localStorage.removeItem('locale'); // stale/invalid — clear it silently
  return detectLocale(SUPPORTED_LOCALES);
});

function handleLocaleChange(newLocale: string) {
  if (newLocale === detectLocale(SUPPORTED_LOCALES)) {
    localStorage.removeItem('locale'); // back to auto-detect; no pin needed
  } else {
    localStorage.setItem('locale', newLocale);
  }
  setLocale(newLocale);
}
// Pass handleLocaleChange to LanguagePicker; pass locale to AppTranslationsProvider and useLocale
```

### Shared Locale Constants (`src/i18n/locales.ts`)

`SUPPORTED_LOCALES`, `RTL_LOCALES`, and `LOCALE_NAMES` are defined once and imported by `detectLocale.ts`, `useLocale.ts`, `AppTranslationsContext.tsx`, and `LanguagePicker`.

`'en'` is included as the first entry in `SUPPORTED_LOCALES` so it appears in the language picker and is matchable by `detectLocale` (e.g. `en-US`, `en-AU` strip to `en` → match).

```typescript
export const SUPPORTED_LOCALES = [
  'en',
  'ar', 'cs', 'cy', 'da', 'de', 'el', 'es', 'es-ES', 'fa', 'fi', 'fr',
  'he', 'hr', 'hu', 'hy', 'ja', 'ko', 'mi', 'nb', 'nl', 'pl', 'pt', 'pt-BR',
  'ro', 'ru', 'sk', 'sl', 'sv', 'th', 'tr', 'uk', 'vi', 'zh-Hans', 'zh-Hant',
] as const;

export type SupportedLocale = typeof SUPPORTED_LOCALES[number];

export function isSupportedLocale(value: string): value is SupportedLocale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

export const RTL_LOCALES = ['ar', 'fa', 'he'] as const;

// Native-script display names for the language picker.
// Always shown in the language's own script regardless of the active UI locale,
// so users can identify their language even when the interface is unfamiliar.
export const LOCALE_NAMES = {
  en:        'English',
  ar:        'العربية',
  cs:        'Čeština',
  cy:        'Cymraeg',
  da:        'Dansk',
  de:        'Deutsch',
  el:        'Ελληνικά',
  es:        'Español',
  'es-ES':   'Español (España)',
  fa:        'فارسی',
  fi:        'Suomi',
  fr:        'Français',
  he:        'עברית',
  hr:        'Hrvatski',
  hu:        'Magyar',
  hy:        'Հայերեն',
  ja:        '日本語',
  ko:        '한국어',
  mi:        'Te Reo Māori',
  nb:        'Norsk Bokmål',
  nl:        'Nederlands',
  pl:        'Polski',
  pt:        'Português',
  'pt-BR':   'Português (Brasil)',
  ro:        'Română',
  ru:        'Русский',
  sk:        'Slovenčina',
  sl:        'Slovenščina',
  sv:        'Svenska',
  th:        'ภาษาไทย',
  tr:        'Türkçe',
  uk:        'Українська',
  vi:        'Tiếng Việt',
  'zh-Hans': '中文 (简体)',
  'zh-Hant': '中文 (繁體)',
} as const satisfies Record<SupportedLocale, string>;
```

`LanguagePicker` builds its Select options from `SUPPORTED_LOCALES`, using `LOCALE_NAMES[code]` as the display label and the locale code as the value.

Locales that require a supplemental font (see Supplemental Font Loading below) are declared here too:

```typescript
// Locale → supplemental Google Font needed for the script.
// Latin-script locales are not listed — Poppins covers them.
// Poppins lacks Cyrillic, Greek, and Armenian; those entries use Noto Sans (base).
export const SUPPLEMENTAL_FONTS = {
  ar:        { family: 'Noto Sans Arabic', googleId: 'Noto+Sans+Arabic:wght@400;500;700' },
  fa:        { family: 'Noto Sans Arabic', googleId: 'Noto+Sans+Arabic:wght@400;500;700' },
  he:        { family: 'Noto Sans Hebrew', googleId: 'Noto+Sans+Hebrew:wght@400;500;700' },
  hy:        { family: 'Noto Sans',        googleId: 'Noto+Sans:wght@400;500;700' }, // Armenian
  el:        { family: 'Noto Sans',        googleId: 'Noto+Sans:wght@400;500;700' }, // Greek (Poppins gap)
  ru:        { family: 'Noto Sans',        googleId: 'Noto+Sans:wght@400;500;700' }, // Cyrillic (Poppins gap)
  uk:        { family: 'Noto Sans',        googleId: 'Noto+Sans:wght@400;500;700' }, // Cyrillic (Poppins gap)
  ja:        { family: 'Noto Sans JP',     googleId: 'Noto+Sans+JP:wght@400;500;700' },
  ko:        { family: 'Noto Sans KR',     googleId: 'Noto+Sans+KR:wght@400;500;700' },
  th:        { family: 'Noto Sans Thai',   googleId: 'Noto+Sans+Thai:wght@400;500;700' },
  'zh-Hans': { family: 'Noto Sans SC',     googleId: 'Noto+Sans+SC:wght@400;500;700' },
  'zh-Hant': { family: 'Noto Sans TC',     googleId: 'Noto+Sans+TC:wght@400;500;700' },
} as const satisfies Partial<Record<SupportedLocale, { family: string; googleId: string }>>;
```

---

### Data: `src/i18n/`

One JSON file per locale: `en.json`, `es.json`, `ar.json`, etc. — one file for each code in the supported locales list.

- `en.json` is the **source of truth** — maintained manually; all keys must be present.
- All other locale files are AI-generated from `en.json` (see workflow below).
- English is imported statically as the fallback baseline.
- Non-English locales are loaded via dynamic `import()` — Vite code-splits each into a separate chunk (not in the main bundle). Only the chunk for the selected locale is fetched on demand.
- A module-level `Map<locale, Record<string, string>>` caches loaded locale objects.
- Any key absent in the target locale falls back to the English value.

The tool title "Canvas API Permissions Planner" **is translated** — it is descriptive, not a trademarked name. It uses the `app.title` translation key like any other UI string.

### Context and Hook: `src/context/AppTranslationsContext.tsx`

```typescript
type AppTranslationsValue = {
  t: (key: string, params?: Record<string, string | number>) => string;
  isRtl: boolean;               // true for ar, fa, he
};
```

The `t` function looks up the key in the active locale's JSON (falling back to English, then to the raw key), and performs `{{placeholder}}` interpolation when `params` is provided:

```typescript
function t(key: string, params?: Record<string, string | number>): string {
  let value = translations[key] ?? fallback[key] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      value = value.replaceAll(`{{${k}}}`, String(v));
    }
  }
  return value;
}
```

No i18n library is needed — only a handful of keys use parameters (`footer.dataVersion`, `share.endpointsDroppedMessage`), all with simple string/number substitution. Pluralisation is not supported; keys that mention counts use static phrasing like `"endpoint(s)"`.

`AppTranslationsProvider` wraps the app root and owns the loading state for the active locale's JSON. `useAppTranslations()` is the consumer hook — no props required in any component.

`App.tsx` holds the `locale` state (shared with `useLocale`) and renders:

```tsx
<AppTranslationsProvider locale={locale}>
  {/* rest of the app */}
</AppTranslationsProvider>
```

When locale changes, the provider dynamically imports the new locale JSON (if not already cached) and updates the context value.

### Translation Key Structure

Keys follow dot-notation grouping. `src/i18n/en.json` is the authoritative key catalog — the table below lists representative examples:

| Key | English value |
|-----|---------------|
| `header.help` | "Help" |
| `language.label` | "Language" |
| `language.tooltip` | (language picker tooltip — see Contextual Tooltips section) |
| `permissions.heading` | "Required Permissions" |
| `permissions.optionalHeading` | "Optional Permissions" |
| `permissions.optionalDescription` | "These permissions are not required to call the endpoints, but unlock additional data in responses." |
| `permissions.empty` | "Add endpoints to see required permissions" |
| `permissions.anyOf` | "Any one of:" |
| `endpoints.heading` | "Add Endpoints" |
| `endpoints.searchPlaceholder` | "Search endpoints…" |
| `endpoints.pasteLabel` | "Or paste a list:" |
| `endpoints.addButton` | "Add" |
| `endpoints.pasteTooltip` | (paste tooltip text) |
| `endpoints.unmatched` | "Unrecognised endpoints:" |
| `help.tab.howToUse` | "How to use" |
| `help.tab.permissions` | "Canvas Permissions" |
| `help.tab.commonSetups` | "Common setups" |
| `help.howToUse.*` | step-by-step content for tab 1 — see Help Modal Content Keys section |
| `help.permissions.*` | RBAC explanation content for tab 2 — see Help Modal Content Keys section |
| `help.commonSetups.*` | examples table content for tab 3 — see Help Modal Content Keys section |
| `footer.dataVersion` | "Canvas data: {{version}}" |
| `footer.credit` | "A free tool by" |
| `aiTranslation.note` | "App interface translated by AI" |
| `colorScheme.switchToDark` | "Switch to dark mode" |
| `colorScheme.switchToLight` | "Switch to light mode" |
| `selectedEndpoints.remove` | "Remove" |
| `common.moreInfo` | "More information" |
| `endpoints.noResults` | "No endpoints found" |

### Help Modal Content Keys

The Help modal's three tabs contain rich content — numbered lists, definition-style paragraphs, and a comparison table. Components handle all structural markup (list tags, table rows, headings); translation keys supply only text strings.

**Tab 1 — How to use** (`help.howToUse.*`):

| Key | English value |
|-----|---------------|
| `help.howToUse.step1` | "Select or paste the API endpoint paths your integration calls." |
| `help.howToUse.step2` | "The Required Permissions panel lists every Canvas role permission your API user needs." |
| `help.howToUse.step3` | "Review the Optional Permissions section — these unlock additional data in API responses (e.g. SIS IDs, email addresses, unpublished content)." |
| `help.howToUse.step4` | "Set up a custom Canvas role (or edit an existing one) with exactly these permissions enabled." |

**Tab 2 — Canvas Permissions** (`help.permissions.*`):

| Key | English value |
|-----|---------------|
| `help.permissions.rbac.heading` | "Role-Based Access Control" |
| `help.permissions.rbac.body` | "Permissions are granted to roles, not users. Users inherit permissions via enrollment (course role) or account membership (account role)." |
| `help.permissions.inheritance.heading` | "Permission inheritance" |
| `help.permissions.inheritance.body` | "An account-level role with a permission automatically has that permission for all courses under the account." |
| `help.permissions.orGroups.heading` | "OR groups" |
| `help.permissions.orGroups.body` | "When the tool shows \"Any one of: A · B · C\", any single permission from that list is sufficient. You do not need all of them." |
| `help.permissions.optional.heading` | "Optional permissions" |
| `help.permissions.optional.body` | "Some endpoints return extra data when the caller has additional permissions. These are shown separately as Optional Permissions with a note explaining what they unlock — for example, SIS ID fields, email addresses, login IDs, or unpublished content. The endpoint works without them; you just get fewer fields or records." |
| `help.permissions.featureFlags.heading` | "Feature flags" |
| `help.permissions.featureFlags.body` | "A small number of permissions require a Canvas feature flag to be enabled before they appear in the Permissions UI. These are noted on individual endpoints." |

**Tab 3 — Common setups** (`help.commonSetups.*`):

Permission symbols (e.g. `read_roster`) are technical identifiers and are **not translated** — the component renders them as inline code. Only human-readable labels are translation keys.

| Key | English value |
|-----|---------------|
| `help.commonSetups.intro` | "Three example configurations for common integration types:" |
| `help.commonSetups.col.type` | "Integration type" |
| `help.commonSetups.col.permissions` | "Minimum permissions" |
| `help.commonSetups.readOnly.name` | "Read-only" |
| `help.commonSetups.readOnly.description` | "Course data, assignments, enrollments" |
| `help.commonSetups.gradebook.name` | "Full gradebook" |
| `help.commonSetups.gradebook.description` | "Read and write grades" |
| `help.commonSetups.sis.name` | "SIS integration" |
| `help.commonSetups.sis.description` | "SIS imports, user sync" |
| `help.commonSetups.optional` | "optional" |

---

### RTL Locales

Three supported locales are right-to-left: `ar` (Arabic), `fa` (Persian), `he` (Hebrew).

`isRtl` is `true` when any of these is active. `App.tsx` syncs both `document.documentElement.dir` and `document.documentElement.lang` when locale changes:

```tsx
useEffect(() => {
  document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
}, [isRtl]);

useEffect(() => {
  document.documentElement.lang = locale;
}, [locale]);
```

Mantine v8 uses CSS logical properties throughout — the `dir` attribute change alone is sufficient to mirror the layout correctly for RTL, with no per-component changes required. The `lang` attribute is required for screen readers to select the correct speech engine, and affects system font selection and rendering for non-Latin scripts.

### Supplemental Font Loading

Poppins (body) and Source Sans 3 (headings) cover Latin Extended, Greek (Source Sans 3 only), and Cyrillic (Source Sans 3 only). Non-Latin scripts — Arabic, Hebrew, CJK, Thai, Armenian — and scripts where Poppins has no coverage (Cyrillic, Greek for body text) require a supplemental font loaded at runtime.

**Script coverage summary:**

| Script | Poppins | Source Sans 3 | Supplemental needed |
|--------|---------|----------------|---------------------|
| Latin | ✓ | ✓ | — |
| Greek | ✗ | ✓ | Noto Sans (body gap) |
| Cyrillic | ✗ | ✓ | Noto Sans (body gap) |
| Armenian | ✗ | ✗ | Noto Sans |
| Arabic / Perso-Arabic | ✗ | ✗ | Noto Sans Arabic |
| Hebrew | ✗ | ✗ | Noto Sans Hebrew |
| Japanese | ✗ | ✗ | Noto Sans JP |
| Korean | ✗ | ✗ | Noto Sans KR |
| Thai | ✗ | ✗ | Noto Sans Thai |
| Simplified Chinese | ✗ | ✗ | Noto Sans SC |
| Traditional Chinese | ✗ | ✗ | Noto Sans TC |

**`src/utils/supplementalFont.ts`** — idempotent Google Fonts loader:

```typescript
const injected = new Set<string>();

export function loadSupplementalFont(locale: string): string | null {
  const spec = SUPPLEMENTAL_FONTS[locale];
  if (!spec) return null;

  if (!injected.has(spec.googleId)) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${spec.googleId}&display=swap`;
    document.head.appendChild(link);
    injected.add(spec.googleId);
  }

  return spec.family;
}
```

`injected` is module-level — fonts are only fetched once per session regardless of how many times the locale changes.

**Integration in `App.tsx`** — extend the locale `useEffect` to also update Mantine's font CSS custom properties:

```tsx
useEffect(() => {
  const family = loadSupplementalFont(locale);
  if (family) {
    // Prepend supplemental font to Mantine's CSS custom properties so it takes
    // priority over Poppins/Source Sans 3 for glyphs those fonts cannot render.
    document.documentElement.style.setProperty(
      '--mantine-font-family',
      `'${family}', Poppins, sans-serif`
    );
    document.documentElement.style.setProperty(
      '--mantine-font-family-headings',
      `'${family}', 'Source Sans 3', sans-serif`
    );
  } else {
    // Revert to Mantine theme defaults (Poppins / Source Sans 3)
    document.documentElement.style.removeProperty('--mantine-font-family');
    document.documentElement.style.removeProperty('--mantine-font-family-headings');
  }
}, [locale]);
```

Mantine v8 sets `--mantine-font-family` and `--mantine-font-family-headings` on `:root` from the theme. Overriding them with an inline style on `<html>` takes precedence without touching the theme object. Removing the inline style reverts to the theme-set value automatically.

No additional `pnpm` install is required — fonts are loaded from Google Fonts at runtime, consistent with how Poppins and Source Sans 3 are loaded.

### AI Translation Disclosure

When any non-English locale is active, a small note is shown in the header controls area, immediately below the language picker:

- Content: `t('aiTranslation.note')` — e.g. "App interface translated by AI"
- Style: Mantine `Text` with `size="xs"`, `c="dimmed"`, `ta="right"`
- Visibility: only rendered when `locale !== 'en'`

This distinguishes the app UI strings (AI-translated) from Canvas permission labels (Canvas community translations via official locale files).

### Workflow for Generating Locale Files

The full prompt for generating all 34 non-English locale files is in **`docs/generate-translations-prompt.md`**. Use it whenever `en.json` is created or updated.

1. Make all changes to `src/i18n/en.json` (add, edit, or remove keys).
2. Run the translation prompt — Claude produces all 34 locale files in one session.
3. Place each output file at `src/i18n/{locale}.json`.
4. Spot-check a few locales you can read to verify quality.
5. Missing keys fall back to English at runtime — a developer-mode console warning is optional.

### Storybook

Add `AppTranslationsProvider` to the Storybook global decorator in `.storybook/preview.tsx`:

```tsx
decorators: [
  (Story, context) => (
    <AppTranslationsProvider locale="en">
      <MantineProvider theme={theme} forceColorScheme={context.globals.colorScheme}>
        <Story />
      </MantineProvider>
    </AppTranslationsProvider>
  ),
],
```

All stories render with English strings by default. Individual stories can override this if locale-specific rendering is needed.

---

## Endpoint Matcher (`src/utils/endpointMatcher.ts`)

Normalises user-pasted endpoint strings and maps them to known data entries.

**Input examples that must all match `GET /api/v1/courses/:course_id/assignments`:**
- `GET /api/v1/courses/123/assignments`
- `https://canvas.example.com/api/v1/courses/abc123/assignments`
- `/api/v1/courses/:course_id/assignments`
- `GET https://my.canvas.edu/api/v1/courses/456/assignments?per_page=50`
- `/api/v1/courses/sis_course_id:BIOL101/assignments`

**Return type:** `Endpoint[]` — empty array means unrecognised; one entry means an unambiguous match; more than one entry means multiple methods exist for that path and no method was specified.

**Algorithm per input line:**
1. Strip leading HTTP method if present → store as `inputMethod` (`string | null`, default `null`)
2. Strip protocol + host if present
3. Strip query string
4. Tokenise path by `/`
5. Replace numeric-only tokens with `:id` placeholder
6. Replace SIS ID lookup tokens with `:id` (same placeholder as step 5 — SIS IDs occupy the same positional slot as numeric IDs in the path)
7. Score and return (see Scoring section below)

**SIS ID lookup tokens (step 6):** Canvas allows any entity ID path segment to be replaced with a SIS ID using the prefix syntax `sis_type_id:VALUE`. The complete set of supported prefixes is:

```typescript
const SIS_ID_PREFIXES = [
  'sis_course_id',
  'sis_user_id',
  'sis_login_id',
  'sis_section_id',
  'sis_account_id',
  'sis_term_id',
  'sis_group_id',
] as const;
```

Detection regex for a single path token: `/^(sis_course_id|sis_user_id|sis_login_id|sis_section_id|sis_account_id|sis_term_id|sis_group_id):.+$/`

All matching tokens are replaced with `:id` — not a separate `:sis_course_id` placeholder — because the known endpoint paths use `:course_id`, `:user_id`, etc. Using `:id` for both numeric and SIS ID tokens means both normalise to the same wildcard form and score identically against the known paths.

**Scoring (step 7):**

A known endpoint is a **candidate** only if it has the same number of tokens as the normalised input. Paths with a different token count are rejected immediately.

For each candidate, compute a score by comparing tokens positionally:
- Tokens are **identical strings**: +2 points
- One or both tokens is a `:param` (starts with `:`): +1 point (wildcard match)
- Tokens are different non-param strings: candidate is disqualified (score = -1, skip)

Find the maximum score across all surviving candidates. Then:

**If `inputMethod` was provided:**
1. Filter top-scoring candidates to those whose `method` matches `inputMethod`.
2. If one or more match → return that one (or first in array order if multiple — rare in practice).
3. If none match → return `[]`. The line is treated as unrecognised and reported to the user. Silently returning a different method's endpoint would show wrong permissions without any indication something was wrong.

**If `inputMethod` is `null` (no method in input):**
1. Return **all** top-scoring candidates. If only one method exists for this path, returns a single-element array. If multiple methods exist (e.g. both `GET` and `POST`), returns all of them.
2. The `EndpointPaste` component adds all returned endpoints to the selection — the user removes any they don't need.

An empty array is returned when: no candidate passes token-count and disqualification checks; or a method was specified but no candidate has that method.

---

## Permission Aggregator (`src/utils/permissionAggregator.ts`)

Takes the list of selected endpoints, returns a deduplicated, sorted set of required and optional permissions to display.

### Types

```typescript
// A single aggregated permission (required or optional)
type SingleAggregated = {
  kind: "single";
  symbol: string;
  label: string;                    // in current locale
  requiredBy: string[];             // endpoint paths that contribute this permission
  optional: boolean;                // true for required: false permissions
  notes: string[];                  // collected unique notes (from required: false entries)
};

// An OR group (required or optional)
type AnyOfAggregated = {
  kind: "anyOf";
  options: Array<{ symbol: string; label: string }>;
  requiredBy: string[];             // endpoint paths that introduce this OR group
  optional: boolean;                // true for required: false OR groups
  notes: string[];                  // collected unique notes (from required: false entries)
};

type AggregatedPermission = SingleAggregated | AnyOfAggregated;

function aggregatePermissions(
  selectedEndpoints: Endpoint[],
  allPermissions: Record<string, PermissionRef>,
  localeLabels: Record<string, string>,  // symbol → translated label
): AggregatedPermission[]
```

### Multi-pass algorithm (order-independent)

**Pass 1 — collect definite required singles:**
For each selected endpoint, for each `{ symbol }` permission where `required !== false`: add symbol to `requiredSymbols: Set<string>` and record the endpoint path in a `requiredBy: Map<symbol, string[]>`.

**Pass 1b — collect optional singles:**
For each selected endpoint, for each `{ symbol, required: false }` permission:
- If symbol is already in `requiredSymbols`: skip (already required — the optional is redundant).
- Otherwise: upsert into `optionalSymbols: Map<symbol, { requiredBy, notes }>`, appending the endpoint path to `requiredBy` and collecting unique `note` values into `notes`.

**Pass 2 — collect required OR groups not already satisfied:**
For each selected endpoint, for each `{ anyOf }` permission where `required !== false`:
   - Compute a canonical key: `[...anyOf].sort().join("|")`
   - If any member of `anyOf` is already in `requiredSymbols`: skip (satisfied by a definite single — no new requirement to surface).
   - Otherwise: upsert into `requiredAnyOfGroups: Map<key, { options, requiredBy }>`, appending the endpoint path to `requiredBy`.

**Pass 2b — collect optional OR groups:**
For each selected endpoint, for each `{ anyOf, required: false }` permission:
   - Compute a canonical key: `[...anyOf].sort().join("|")`
   - If any member of `anyOf` is already in `requiredSymbols`: skip (already satisfied by a required single).
   - If the canonical key matches a required OR group: skip (already shown as required).
   - Otherwise: upsert into `optionalAnyOfGroups: Map<key, { options, requiredBy, notes }>`, appending the endpoint path and collecting unique `note` values.

**Pass 2.5 — subsumption elimination (applied to required and optional groups separately):**
Some OR groups may be supersets of others. If group G's options are a superset of group H's options (i.e. H is strictly more restrictive), then any resolution of H also resolves G — G is redundant.

1. Sort collected OR groups by options-set size ascending (most restrictive first).
2. For each group G (in order): check if any already-kept group H satisfies `H.options ⊆ G.options`.
   - If yes: G is subsumed — drop G, merge G's `requiredBy` (and `notes` for optional groups) into H.
   - If no: keep G.

Example: `{A, B}` and `{A, B, C}` — `{A,B}` is kept; `{A,B,C}` is subsumed by it and dropped (with its `requiredBy` merged). Result: a single "Any one of: A · B" that lists all contributing endpoints.

Partially overlapping groups (e.g. `{A, B}` and `{B, C}`) have no subsumption relationship — both are shown, since the user genuinely needs to satisfy both independently.

**Cross-category subsumption:** Additionally, check whether optional OR groups are subsumed by required OR groups (same canonical key or subset relationship). If an optional group's key matches a required group, the optional is redundant and should be dropped.

**Result assembly:**
- Required singles: for each symbol in `requiredSymbols`, emit `{ kind: "single", symbol, label, requiredBy, optional: false, notes: [] }`.
- Required OR groups: for each surviving required group, emit `{ kind: "anyOf", options: [...], requiredBy, optional: false, notes: [] }`.
- Optional singles: for each symbol in `optionalSymbols`, emit `{ kind: "single", ..., optional: true, notes }`.
- Optional OR groups: for each surviving optional group, emit `{ kind: "anyOf", ..., optional: true, notes }`.
- Sort within each category: singles sorted alphabetically by label. OR groups sorted alphabetically by the label of their first option.
- Final output order: required singles → required OR groups → optional singles → optional OR groups.

### Why this is fully order-independent

All passes scan the complete endpoint set before emitting any output. Pass 1 builds the complete `requiredSymbols` before Pass 1b and Pass 2 check against it. Pass 2.5 operates on the complete set of collected OR groups. No result depends on which endpoint was selected first.

---

## UI Layout (App.tsx)

```
┌──────────────────────────────────────────────────────────────┐
│ [ATD Logo] Canvas API Permissions Planner   [Language ▼] [☀/🌙] [?] │
├────────────────────────┬─────────────────────────────────────┤
│  Add Endpoints         │  Required Permissions                │
│  ─────────────────     │  ──────────────────────             │
│  [Search/Select list]  │  ✓ Course Content - view            │
│                        │  ✓ Grades - edit                    │
│  ─────────────────     │  ✓ SIS Data - manage                │
│  Or paste a list:      │                                     │
│  [Textarea]  [Add]     │  ───────────────────                │
│                        │                                     │
│  Selected:             │  Optional Permissions                │
│  [GET /api/v1/... ×]   │  (unlock additional response data)   │
│  [POST /api/v1/... ×]  │                                     │
│                        │  SIS Data - view                     │
│                        │    Required to receive SIS ID fields │
│                        │  Users - view login IDs              │
│                        │    Required to receive login_id      │
├────────────────────────┴─────────────────────────────────────┤
│  A free tool by [ATD Logo → alltheducks.com]                 │
└──────────────────────────────────────────────────────────────┘
```

Mantine components to use:
- `TextInput` with search for endpoint filtering
- `ScrollArea` + `Checkbox.Group` for endpoint list grouped by category
- `Textarea` + `Button` for paste input
- `Badge` / `CloseButton` for selected endpoints
- `Table` or `List` for permissions output, with OR groups rendered as a distinct row: *"Any one of: A · B · C"* (each option shows its label)
- `Select` for language picker
- `Loader` / `Notification` for locale loading state

---

## Responsive Layout

The app targets viewport widths from 375px (small phone) upward. The primary responsive breakpoint is Mantine's `sm` (768px): above it the two-panel layout sits side by side; below it both panels stack vertically.

### Two-panel layout

Use Mantine `Grid` in `<main>` with responsive `span` props:

```tsx
<Grid>
  <Grid.Col span={{ base: 12, sm: 5 }}>
    {/* Add Endpoints panel */}
  </Grid.Col>
  <Grid.Col span={{ base: 12, sm: 7 }}>
    {/* Required Permissions panel */}
  </Grid.Col>
</Grid>
```

On mobile, "Add Endpoints" appears first (top) and "Required Permissions" below — matching the natural workflow: add endpoints → see required permissions.

### Header

At narrow widths the header becomes cramped. The tool title (`<Title order={1}>`) is hidden below `sm` using Mantine's `visibleFrom="sm"` prop. Because this removes the visible `<h1>`, `<main>` receives `aria-label="Canvas API Permissions Planner"` to preserve document landmark labelling for screen readers. The browser tab `<title>` also carries the tool name.

The right-side controls (language picker, colour scheme toggle, help button) remain visible at all widths.

### EndpointSelector ScrollArea height

Use a responsive height to avoid consuming too much of the viewport on a phone:

```tsx
<ScrollArea h={{ base: 240, sm: 400 }}>
```

240px accommodates approximately 8 checkboxes on a 375px-wide phone.

### EndpointPaste layout

The `Textarea` and `Add` button are stacked vertically (`Stack`) at all viewport widths — textarea above, `fullWidth` button below. The ASCII mockup showing them side by side is schematic; the stacked layout is both simpler and mobile-friendly without any responsive switching.

### Touch targets

Interactive elements must meet a 44×44px minimum touch target:
- **Info icon `ActionIcon`s**: use `size="sm"` minimum — never `size="xs"` for any `ActionIcon` in the app.
- **Badge `CloseButton`**: verify via device testing that Mantine's default `CloseButton` meets 44×44px; add `size="lg"` if not.
- All Mantine `Button`, `Checkbox`, and `Select` controls meet touch target requirements by default.

### Badge max-width

The `max-width: 280px` truncation on selected endpoint badges is unchanged across breakpoints. In the stacked mobile layout the left panel spans full viewport width, so 280px remains a comfortable cap.

### No horizontal overflow

The `<main>` element (or the `Grid` it contains) must not cause horizontal scroll at ≥ 375px. Ensure the `Grid` is wrapped in a `Container` (or equivalent) with `maw="100%"` and appropriate horizontal padding.

---

## EndpointSelector Component

### Props

```tsx
type EndpointSelectorProps = {
  endpoints: Endpoint[];
  selected: Endpoint[];
  onToggle: (endpoint: Endpoint) => void;
  inputRef?: React.Ref<HTMLInputElement>;  // forwarded to search TextInput for external focus control
};
```

### Endpoint identifier

The checkbox value (and key prop) for each endpoint is the string `` `${e.method} ${e.path}` `` — e.g. `"GET /api/v1/courses/:id"`. This is stable, human-readable, and unique within the dataset.

### Structure

```
TextInput (search)
ScrollArea (fixed height, e.g. h={400})
  Checkbox.Group (value = selected endpoint IDs, onChange = onToggle adapter)
    [per visible category:]
      Text (category heading — bold, dimmed, small)
      [per matching endpoint:]
        Checkbox (value = endpointId, label = "METHOD /path [ⓘ]")
    [if no categories have matches:]
      Text "No endpoints match your search"
```

### Category grouping

Category headings are rendered as non-interactive `Text` nodes between checkbox groups — not as accordion panels. There are ~43 categories; a flat scrollable list with labelled sections is sufficient for this use case, and simpler than accordion interaction.

One outer `Checkbox.Group` wraps all checkboxes. Category `Text` dividers are rendered in between as siblings — they are not interactive and do not affect the group semantics.

### Search behaviour

The `TextInput` filters by case-insensitive substring match on the endpoint's method and path concatenated: `"GET /api/v1/courses/:id"`. A category heading is rendered only when at least one of its endpoints matches the current search term.

- **No search query:** all categories and all endpoints are visible.
- **Search active:** only matching endpoints are shown; categories with zero matches are hidden entirely (heading suppressed).
- **No results at all:** a single `"No endpoints match your search"` message replaces the list.
- **Clearing search** (via the `rightSection` `CloseButton` on the `TextInput`, or by deleting the text) immediately restores the full list.
- Already-selected endpoints remain visible and checked during search — they are not hidden even if they wouldn't otherwise match the current query. This prevents the confusing situation where a checked item disappears from the list.

### Notes icon

Each endpoint row label is: `METHOD /path` optionally followed by an inline `<Tooltip label={e.notes}><ActionIcon size="sm" variant="transparent"><IconInfoCircle /></ActionIcon></Tooltip>`. The icon is only rendered when `e.notes` is present. Tooltip content is the raw `notes` string; no truncation.

---

## PermissionsResult Component

### Section structure

The permissions result panel has two top-level sections: **Required Permissions** and **Optional Permissions**. Each section is independently rendered and suppressed when empty.

**Required Permissions** — singles and OR groups where `optional === false`:

```
Required Permissions
────────────────────

  single row           ← alphabetical by label
  single row
  single row

<Divider />            ← only rendered if there are both singles AND OR groups
  OR group row         ← "Any one of: ..."
  OR group row
```

**Optional Permissions** — singles and OR groups where `optional === true`:

```
<Divider />

Optional Permissions
────────────────────
t('permissions.optionalDescription')   ← brief explanation in dimmed text

  optional single row
    note text (dimmed)                 ← from notes[] array
  optional anyOf row
    note text (dimmed)
```

The optional section is suppressed entirely when no optional permissions exist. The `<Divider />` between the two sections renders only when both are present.

Each optional permission row shows:
- The permission label
- Below the label: the note(s) from the `notes[]` array, rendered as `Text size="xs" c="dimmed"` — one line per unique note

The `<Divider />` between singles and OR groups within the required section is rendered only when both are present — if the result is OR groups only, no divider is shown.

### OR group row rendering

Each OR group row renders as:

```
[ⓘ]  Any one of:  Label A  ·  Label B  ·  Label C
```

- The `[ⓘ]` is an `IconInfoCircle` `ActionIcon` whose tooltip reads: *"Your API user needs at least one of these permissions. Any single one is sufficient to satisfy this requirement."*
- `t('permissions.anyOf')` provides the "Any one of:" prefix.
- Each option shows its label, separated by a `·` character.

---

## SelectedEndpoints Component

### Props

```tsx
type SelectedEndpointsProps = {
  selected: Endpoint[];
  onRemove: (endpoint: Endpoint) => void;
  onLastRemoved?: () => void;
};
```

### Structure

Each entry in `selected` is rendered as a composite element containing:
1. A truncated text span showing `METHOD /path` (see Endpoint Path Display section for truncation and tooltip rules)
2. An optional `IconInfoCircle` `ActionIcon` + `Tooltip` when `endpoint.notes` is present
3. A `CloseButton` with `aria-label={\`${t('selectedEndpoints.remove')} ${endpoint.method} ${endpoint.path}\`}`

The three elements sit in a Mantine `Group` with `gap="xs"` and `wrap="nowrap"` so the close button stays visually attached to the badge text regardless of truncation.

When `selected` is empty, `SelectedEndpoints` renders nothing — the empty state message is owned by `PermissionsResult`.

### Removal and state sync

`App.tsx` owns `selectedEndpoints: Endpoint[]` and implements a single toggle handler passed to both components:

```tsx
// App.tsx
function handleToggleEndpoint(endpoint: Endpoint) {
  const id = `${endpoint.method} ${endpoint.path}`;
  setSelectedEndpoints(prev =>
    prev.some(e => `${e.method} ${e.path}` === id)
      ? prev.filter(e => `${e.method} ${e.path}` !== id)
      : [...prev, endpoint]
  );
}

// ...

<EndpointSelector onToggle={handleToggleEndpoint} ... />
<SelectedEndpoints onRemove={handleToggleEndpoint} ... />
```

Because `EndpointSelector` is a controlled component (its checked state derives from the `selected` prop), unchecking a checkbox in the selector and clicking × on a badge are two surfaces for the same underlying operation. They stay in sync automatically — no direct communication between the two components is needed.

### Focus management after removal

See the Focus Management section. In brief: after a badge is removed, focus moves to the next badge; if it was the last, to the previous; if no badges remain, `onLastRemoved` is called and `App.tsx` routes focus to the `EndpointSelector` search input.

---

## Optional Permissions

Some API endpoints return additional fields or records only when the calling user has specific permissions. These are modelled as `required: false` entries in the endpoint's `permissions` array (both singles and OR groups). Each entry has a `note` explaining what it unlocks.

The Permission Aggregator collects these separately from required permissions and outputs them with `optional: true`. The PermissionsResult component displays them in a distinct "Optional Permissions" section below the required permissions, with notes shown in dimmed text.

### Categories of optional permissions

These are the known conditional field categories from the Canvas API:

1. **SIS ID response fields** — `read_sis` / `manage_sis` for `sis_user_id`, `sis_course_id`, `sis_section_id`, `sis_account_id`
2. **SIS URL ID references** — `read_sis` / `manage_sis` when referencing entities by SIS ID in request URLs
3. **SIS write fields** — `manage_sis` specifically for writing SIS ID fields on mutating endpoints
4. **`sis_import_id` field** — `manage_sis` specifically for this field on enrollment objects
5. **Login ID fields** — `view_user_logins` for `login_id` and `sis_login_id`
6. **Email addresses** — `read_email_addresses` for `email` field
7. **Grade fields on enrollments** — `view_all_grades` / `manage_grades` for other students' grades
8. **Unpublished content** — various permissions to see unpublished assignments, pages, modules, discussions

### No user interaction needed

Unlike the previous design (which used SIS checkboxes to toggle optional permissions), optional permissions are always displayed when relevant endpoints are selected. The user reads the notes and decides for themselves whether to include each optional permission in their role configuration. This is simpler, more general, and surfaces information the user might not have known to look for.

**Disabled tooltip:** When Case A checkbox is disabled, a Mantine `Tooltip` wraps it with the message: *"None of your selected endpoints return SIS ID fields."*

---

## Testing Architecture

### Unit Testing: Vitest

Vitest is the natural fit — it shares the Vite config and requires minimal setup.

**Install:**
```bash
pnpm add -D vitest @testing-library/react @testing-library/user-event jsdom
```

**`vite.config.ts` additions:**
```ts
/// <reference types="vitest" />
// inside defineConfig:
test: {
  environment: 'jsdom',
  globals: true,
}
```

**`tsconfig.json` additions:**
```json
"types": ["vitest/globals"]
```

Test files are co-located with source: `src/utils/i18nKey.test.ts`, etc.

#### What to test

**`src/utils/i18nKey.ts`** — pure function, ideal for unit tests.
- The verified case: `"Grades - edit"` → `"grades_edit_773dfc24"`
- Edge cases: labels with multiple special characters, labels with leading/trailing spaces, all-numeric label, single character

**`src/utils/endpointMatcher.ts`** — pure function, wide input surface, high value.
- All input variations: full HTTPS URL, URL with query string, path-only with `:param`, numeric path segments, SIS ID path segments
- SIS ID normalisation: `sis_course_id:ABC123` → `:id`; `sis_section_id:SEC1` → `:id`; `sis_login_id:jdoe` → `:id` — all supported prefixes (see `SIS_ID_PREFIXES` constant)
- An unrecognised SIS-style token (e.g. `sis_foo_id:bar` — not in the prefix list) is treated as a plain non-numeric token, not normalised
- Method specified, one match: `POST /api/v1/courses/123/assignments` → returns `[POST endpoint]`
- Method specified, no match for that method: `DELETE /api/v1/courses/123/assignments` where only `GET` and `POST` exist → returns `[]` (unrecognised — silently returning a different method's endpoint would show wrong permissions)
- No method, single method in data: `/api/v1/courses/123/assignments/bulk_update` → returns `[PUT endpoint]` (only one method exists)
- No method, multiple methods in data: `/api/v1/courses/123/assignments` → returns `[GET endpoint, POST endpoint]` (both added to selection)
- Unrecognised path → `[]`
- Different token count → `[]`

**`src/utils/permissionAggregator.ts`** — the most complex logic; tests are essential.
- Definite required single permissions accumulate correctly
- Optional singles (`required: false`) collected separately with `optional: true` and `notes`
- Optional singles suppressed when the same symbol is already required
- Optional anyOf groups collected with `optional: true` and `notes`
- Optional anyOf groups suppressed when any member is already a required single, or when the same key exists as a required OR group
- Notes collected and deduplicated: same permission from multiple endpoints with different notes → all unique notes in `notes[]`
- Required OR group appears when unsatisfied
- Required OR group is suppressed when a member is already a definite single (order-independent: test both selection orders)
- Pass 2.5 subsumption: `{A,B,C}` is dropped when `{A,B}` is also present; `{A,B}` and `{B,C}` both survive (applied to both required and optional groups separately)
- Result sort order: required singles (alphabetical) → required OR groups (alphabetical) → optional singles (alphabetical) → optional OR groups (alphabetical)

**`src/schemas/endpoints.ts`** — validate the Zod schema logic.
- Valid full data object passes
- Missing required fields fail
- `AnyOfPermissionSchema` with fewer than 2 options fails
- `SinglePermissionSchema` with `required: false` and `note` passes

**`src/schemas/canvasLocale.ts`** — validate schema and `getTranslation` helper.
- `canvasLocaleSchema('es')` passes when outer key is `'es'`
- `canvasLocaleSchema('es')` fails when outer key is a different locale code
- `getTranslation` returns string value when key is present and is a string
- `getTranslation` returns `undefined` for nested objects (not a string)
- `getTranslation` returns `undefined` for missing locale or key

**`src/utils/detectLocale.ts`** — pure function with wide input surface.
- Exact match: `'es'` in `navigator.languages` → `'es'`
- Exact match for hyphenated locale in supported list: `'es-ES'` → `'es-ES'`
- Prefix match: `'es-MX'` → `'es'`
- Prefix match for multi-subtag locale: `'zh-Hans-CN'` → `'zh-Hans'`
- First preference wins: `['fr', 'de']` → `'fr'`
- Falls through to second preference when first has no match: `['xx-XX', 'de']` → `'de'`
- Falls back to `'en'` when no preference matches
- `en-AU` / `en-GB` strip to `en`, returning fallback (not in supported list)

#### What NOT to test

- **`useEndpoints.ts`** — fetches and validates JSON; involves network fetch. Covered implicitly by schema tests and manual verification.
- **`useLocale.ts`** — involves network fetch; mocking `fetch` adds test overhead without proportional benefit for this project. Manual verification step covers this.
- **UI components** — covered by Storybook stories (see below).

---

### Storybook: UI Component Development

Storybook provides isolated component development and visual documentation. Use `@storybook/react-vite` (Vite-native, no webpack).

**Install:**
```bash
pnpm dlx storybook@latest init
# Select: React, Vite builder — this adds the necessary deps and .storybook/ config
```

This creates `.storybook/main.ts` and `.storybook/preview.tsx`. The preview file needs both a `MantineProvider` and an `AppTranslationsProvider` decorator since all components depend on them:

**`.storybook/preview.tsx`:**
```tsx
import { MantineProvider } from '@mantine/core';
import '@mantine/core/styles.css';
import { AppTranslationsProvider } from '../src/context/AppTranslationsContext';
import type { Preview } from '@storybook/react';

const preview: Preview = {
  decorators: [
    (Story, context) => (
      <AppTranslationsProvider locale="en">
        <MantineProvider theme={theme} forceColorScheme={context.globals.colorScheme}>
          <Story />
        </MantineProvider>
      </AppTranslationsProvider>
    ),
  ],
};

export default preview;
```

All stories use English strings by default. Individual stories can override locale if needed.

Story files live alongside the component: `src/components/{Component}/{Component}.stories.tsx`.

#### Stories per component

**`LanguagePicker`**
- `Default` — no locale selected
- `LocaleSelected` — a locale is active

**`EndpointSelector`**
- `Default` — full list, nothing selected
- `WithSearch` — search query filters the list
- `WithSelections` — several endpoints checked

**`EndpointPaste`**
- `Default` — empty textarea
- `WithUnmatched` — shows which lines could not be matched after submit
- `WithMultipleMethodMatches` — a pasted line without a method matched both GET and POST variants; both appear in the selection

**`SelectedEndpoints`**
- `Empty` — no endpoints selected (empty state)
- `WithItems` — several endpoint badges with remove buttons
- `WithNotes` — at least one badge has a `notes` field; confirm `IconInfoCircle` tooltip is visible

**`PermissionsResult`**
- `Empty` — no endpoints selected
- `SinglesOnly` — only definite single permissions
- `WithAnyOfGroup` — at least one OR group row
- `Mixed` — singles + OR groups

**`HelpModal`**
- `Default` — button visible, modal closed
- `Open` — modal open, showing all three tabs

---

## Help and Documentation

The tool should be self-explanatory for Canvas developers. Two complementary approaches are used: a **Help modal** for conceptual documentation, and **contextual tooltips** inline next to specific UI elements.

---

### Help Modal (`src/components/HelpModal/index.tsx`)

A `?` icon button in the top-right of the header (next to the language picker) opens a Mantine `Modal`. The modal contains three tabs:

**Tab 1 — "How to use"**
Step-by-step guide written for this tool:
1. Select or paste the API endpoint paths your integration calls.
2. Check the SIS options if your integration reads SIS IDs or uses SIS ID lookup in URLs.
3. The **Required Permissions** panel lists every Canvas role permission your API user needs.
4. Set up a custom Canvas role (or edit an existing one) with exactly these permissions enabled.

**Tab 2 — "Canvas Permissions"**
Drawn from the "Understanding Canvas Permissions" and "Authorization Patterns Explained" sections of `canvas_api_permissions.md`:

- **Role-based access control:** Permissions are granted to roles, not users. Users inherit permissions via enrollment (course role) or account membership (account role).
- **Permission inheritance:** An account-level role with a permission automatically has that permission for all courses under the account.
- **OR groups:** When the tool shows "Any one of: A · B · C", holding any single permission from that list is sufficient. You don't need all of them.
- **Feature flags:** A small number of permissions require a Canvas feature flag to be enabled before they appear in the Permissions UI. These are noted on individual endpoints.

**Tab 3 — "Common setups"**
Three canonical examples drawn from `canvas_api_permissions.md` § "Common API User Role Setup":

| Integration type | Minimum permissions |
|---|---|
| **Read-only** (course data, assignments, enrollments) | `read_roster`, `read_course_content`, `view_all_grades` · optional: `read_sis`, `view_user_logins` |
| **Full gradebook** (read + write grades) | `manage_grades`, `read_roster` · optional: `read_sis`, `manage_sis`, `view_user_logins` |
| **SIS** (SIS imports, user sync) | `import_sis` · optional: `manage_sis`, `read_roster` |

Mantine components: `Modal`, `Tabs`, `Text`, `Table`, `List`, `ActionIcon` (with `IconQuestionMark`).

---

### Contextual Tooltips

All tooltips use Mantine `Tooltip` with `multiline` and a `maw` (max-width) of ~300px. An `ActionIcon` with a small info icon (`IconInfoCircle` from `@tabler/icons-react`) is placed inline next to the label that needs explanation.

**`PermissionsResult` component — tooltip targets:**

| Element | Tooltip content |
|---|---|
| OR group row info icon | *"Your API user needs at least one of these permissions. Any single one is sufficient to satisfy this requirement."* |
| "Required by" column / tooltip on permission row | Lists the endpoint paths that require this permission (the `requiredBy` array from the aggregator). Rendered as a `Tooltip` on the permission label itself, or as a collapsed detail row. |

**`EndpointSelector` / `EndpointPaste` — tooltip targets:**

| Element | Tooltip content |
|---|---|
| Endpoint list item note icon | The `notes` string from `endpoints.json` for that endpoint (only rendered when `notes` is present). `IconInfoCircle` placed inline after the path, same size and style as other info icons in the app. |
| Paste input info icon | *"Paste one endpoint per line. Supports full URLs (`https://canvas.example.com/api/v1/...`), paths with numeric IDs, or canonical paths with `:param` placeholders."* |

**`LanguagePicker` — tooltip target:**

| Element | Tooltip content |
|---|---|
| Language picker info icon | *"Canvas permission labels are shown in the selected language using Canvas's own community translations. App interface text is translated by AI. Both fall back to English for any missing strings."* |

---

### `@tabler/icons-react` dependency

Mantine v8 pairs naturally with Tabler Icons. Add the dependency:

```bash
pnpm add @tabler/icons-react
```

Icons used: `IconQuestionMark` (help button), `IconInfoCircle` (inline info tooltips), `IconX` (close button — already provided by Mantine).

---

## Branding and Visual Identity

The tool is published by **All the Ducks** (alltheducks.com) as a free open-source resource for Canvas LMS developers, and is intended to establish the company as Canvas development specialists.

### Logo Asset

`src/assets/atd-logo.svg` — the ATD full-wordmark (viewBox `0 0 436 134`). The icon mark group uses `.st0 { fill: #FFAF11 }`. The text letter group has `fill="currentColor"`, so the text colour is controlled by CSS `color` on the rendered component. Imported via `vite-plugin-svgr` as a React component.

### Mantine Theme

Configure a custom theme in `main.tsx` and pass it to `<MantineProvider theme={theme}>`. Use the same theme in `.storybook/preview.tsx`.

```typescript
import { createTheme, MantineColorsTuple } from '@mantine/core';

// Generate all 10 shades at mantine.dev/colors-generator using #FFAF11 as input.
// Shade [5] should be #FFAF11 (the primary brand colour).
const atdOrange: MantineColorsTuple = [/* 10 shades */];

export const theme = createTheme({
  primaryColor: 'atdOrange',
  colors: { atdOrange },
  primaryShade: 5,
  fontFamily: 'Poppins, sans-serif',
  headings: {
    fontFamily: '"Source Sans 3", sans-serif',
    fontWeight: '600',
  },
});
```

> "Source Sans Pro" was renamed "Source Sans 3" on Google Fonts in 2022 — both names refer to the same typeface. Use "Source Sans 3" for the Google Fonts URL.

### Font Loading

Add to `index.html` `<head>`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500&family=Source+Sans+3:wght@400;600;700&display=swap" rel="stylesheet" />
```

### Favicon

**Source:** The ATD icon mark (the orange duck/flame shape in the first `<g>` of `src/assets/atd-logo.svg`) is extracted to create the favicon. The full wordmark (436×134) is not suitable at small sizes — the icon mark alone is recognisable and square enough to use directly.

**Files:**

- `public/favicon.svg` — SVG favicon. Copy the orange icon mark `<g>` from the logo SVG into a minimal `<svg>` with a square viewBox that crops to the icon mark (approximately `viewBox="20 20 120 120"`; refine to fit during implementation). The `#FFAF11` fill is fixed in the path's `class="st0"` style — it needs no colour scheme adaptation. Modern browsers (Chrome, Firefox, Safari ≥ 14) use this.
- `public/favicon.ico` — ICO fallback containing 16×16 and 32×32 raster frames, generated from `favicon.svg` during setup (e.g. using `svgexport` + `png-to-ico`, or any online converter). Needed only for legacy browsers; in CI/CD this can be a manual step.

**`index.html` `<link>` tags** (add to `<head>`, after `ColorSchemeScript`):

```html
<link rel="icon" href="/favicon.svg" type="image/svg+xml" />
<link rel="icon" href="/favicon.ico" sizes="any" />
```

Browser priority: SVG is preferred by all modern browsers; ICO is the fallback for any browser that does not support SVG favicons (primarily legacy IE/Edge).

**No apple-touch-icon or `site.webmanifest`** — this is a developer tool deployed to GitHub Pages, not intended to be pinned to a mobile home screen. PWA features are out of scope.

### Meta Tags and Social Sharing

**Description:** A concise, keyword-relevant sentence for browser tabs, search results, and link previews:

> "Find the Canvas LMS role permissions required for any set of API endpoints. A free tool for Canvas integration developers."

**Social image (`public/og-image.png`):** Create a 1200×630 PNG for Open Graph / Twitter card previews. Suggested content: dark (`#1a1a1a`) background, ATD logo centred-left, tool name and one-line description to the right, orange `#FFAF11` accent strip or border. This is a manual design step; the file must exist at `public/og-image.png` before the first public deploy.

**Open Graph and Twitter card tags:** Add to `index.html` (see complete `<head>` block below). The `og:url` and image URLs contain the GitHub Pages base URL — update these when the repo name is finalised:

```html
<!-- Primary -->
<meta name="description" content="Find the Canvas LMS role permissions required for any set of API endpoints. A free tool for Canvas integration developers." />

<!-- Open Graph -->
<meta property="og:type" content="website" />
<meta property="og:url" content="https://canvas-permissions.alltheducks.com/" />
<meta property="og:title" content="Canvas API Permissions Planner" />
<meta property="og:description" content="Find the Canvas LMS role permissions required for any set of API endpoints. A free tool for Canvas integration developers." />
<meta property="og:image" content="https://canvas-permissions.alltheducks.com/og-image.png" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />

<!-- Twitter / X -->
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="Canvas API Permissions Planner" />
<meta name="twitter:description" content="Find the Canvas LMS role permissions required for any set of API endpoints. A free tool for Canvas integration developers." />
<meta name="twitter:image" content="https://canvas-permissions.alltheducks.com/og-image.png" />
```

### Complete `index.html` `<head>`

All `<head>` concerns are collected here for implementation convenience. Replace the Vite scaffold's `<head>` with this (update the GitHub Pages URLs before deploying):

```html
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Canvas API Permissions Planner</title>

  <!-- Content Security Policy -->
  <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; connect-src 'self' https://raw.githubusercontent.com https://www.google-analytics.com; img-src 'self' data:;" />

  <!-- Favicon -->
  <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
  <link rel="icon" href="/favicon.ico" sizes="any" />

  <!-- SEO / social -->
  <meta name="description" content="Find the Canvas LMS role permissions required for any set of API endpoints. A free tool for Canvas integration developers." />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://canvas-permissions.alltheducks.com/" />
  <meta property="og:title" content="Canvas API Permissions Planner" />
  <meta property="og:description" content="Find the Canvas LMS role permissions required for any set of API endpoints. A free tool for Canvas integration developers." />
  <meta property="og:image" content="https://canvas-permissions.alltheducks.com/og-image.png" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="Canvas API Permissions Planner" />
  <meta name="twitter:description" content="Find the Canvas LMS role permissions required for any set of API endpoints. A free tool for Canvas integration developers." />
  <meta name="twitter:image" content="https://canvas-permissions.alltheducks.com/og-image.png" />

  <!-- Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500&family=Source+Sans+3:wght@400;600;700&display=swap" rel="stylesheet" />

  <!-- Google Analytics 4 — cookieless mode -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('consent', 'default', { analytics_storage: 'denied' });
    gtag('config', 'G-XXXXXXXXXX');
  </script>

  <!-- Mantine color scheme — must be synchronous to prevent flash of wrong theme -->
  <script>/* paste ColorSchemeScript content from @mantine/core docs */</script>
</head>
```

The `<script>` for `ColorSchemeScript` must remain synchronous (no `defer` or `async`) — it reads `localStorage` and sets `data-mantine-color-scheme` on `<html>` before the first paint. See the Mantine v8 docs for the exact script content.

### Header

Left to right in the `App.tsx` header:
1. ATD logo — `<AtdLogo height={32} aria-label="All the Ducks" />` imported as a React component via SVGR, wrapped in `<a href="https://alltheducks.com" target="_blank" rel="noopener noreferrer">`
2. Tool name — `<Title order={2}>Canvas API Permissions Planner</Title>` (renders in Source Sans 3 heading font)
3. Right-aligned controls — language picker, colour scheme toggle, help button (`[Language ▼]  [☀/🌙]  [?]`)

Use a Mantine `Group` with `justify="space-between"` for the header row.

### Footer

A slim footer bar beneath the main two-panel content, implemented as a `<footer>` element wrapping a Mantine `Group` with `justify="space-between"`:

**Left side — Canvas data version:**
- Text: `t('footer.dataVersion', { version })` → e.g. "Canvas data: 2026-02-11"
- Style: `size="xs"` `c="dimmed"`
- The `version` string comes from the `useEndpoints()` result (available in the `'ready'` state) and is the Canvas stable release date (YYYY-MM-DD)
- This makes it immediately clear to developers which Canvas release the permission data corresponds to, without cluttering the main UI

**Right side — Attribution:**
- Content: `t('footer.credit')` text ("A free tool by") followed by `<AtdLogo height={24} aria-label="All the Ducks" />` (the SVGR component) linked to `https://alltheducks.com` (`target="_blank" rel="noopener noreferrer"`)

**Styling:**
- Both sides use `c="dimmed"` text
- Vertical padding only — does not need to be sticky/fixed

---

## Color Scheme (Light/Dark Mode)

The tool supports light and dark color schemes, defaulting to the OS-level `prefers-color-scheme` preference but allowing the user to override with a toggle in the header.

### Mantine Integration

Mantine v8 manages color scheme natively. The `main.tsx` render tree is documented in **Startup Data Loading and Error Handling** — `AppErrorBoundary` wraps `MantineProvider`, which wraps `Notifications` and `App`.

`<Notifications />` must be mounted inside `MantineProvider` — this is a required Mantine v8 setup step; without it, `notifications.show(...)` calls are silently dropped. It renders the notification portal and requires no props.

`defaultColorScheme="auto"` reads `prefers-color-scheme` on first render. When the user manually toggles, Mantine stores the preference in `localStorage` under the key `mantine-color-scheme`. `localStorage` is appropriate for UI preferences — the no-persistence constraint applies to application data, not theme or locale settings.

### Flash Prevention

Add Mantine's `ColorSchemeScript` to `index.html` synchronously before the bundle, so the correct scheme is applied before React renders (prevents flash of wrong theme when a localStorage override exists):

```html
<head>
  <!-- existing head content -->
  <script>/* paste content of ColorSchemeScript from @mantine/core docs */</script>
</head>
```

In Vite's static `index.html` there is no JSX rendering context, so paste the raw inline script from the Mantine v8 `ColorSchemeScript` documentation directly. The script reads `localStorage` and sets `data-mantine-color-scheme` on `<html>` synchronously.

### `ColorSchemeToggle` Component

`src/components/ColorSchemeToggle/index.tsx` — a single `ActionIcon` that cycles between light and dark:

```tsx
import { ActionIcon, useComputedColorScheme, useMantineColorScheme } from '@mantine/core';
import { IconMoon, IconSun } from '@tabler/icons-react';
import { useAppTranslations } from '../../context/AppTranslationsContext';

export function ColorSchemeToggle() {
  const { setColorScheme } = useMantineColorScheme();
  const computed = useComputedColorScheme('light', { getInitialValueInEffect: true });
  const { t } = useAppTranslations();

  return (
    <ActionIcon
      onClick={() => setColorScheme(computed === 'light' ? 'dark' : 'light')}
      variant="default"
      aria-label={computed === 'light' ? t('colorScheme.switchToDark') : t('colorScheme.switchToLight')}
    >
      {computed === 'dark' ? <IconSun /> : <IconMoon />}
    </ActionIcon>
  );
}
```

Icon logic: moon in light mode (click → go dark), sun in dark mode (click → go light). Using `useComputedColorScheme` resolves "auto" to the actual OS value, so the icon always reflects the rendered state.

### ATD Logo — Theme-Aware via SVGR

The logo is imported as a React component using `vite-plugin-svgr`:

```tsx
import AtdLogo from '../assets/atd-logo.svg?react';
```

The SVG's text letter group has `fill="currentColor"`, so the text colour inherits from the CSS `color` property of the component. The icon mark is fixed via `.st0 { fill: #FFAF11 }` in the SVG's own `<style>` block — that class rule takes precedence over any inherited `currentColor`, so the orange is never affected.

Usage — the component renders correctly in both schemes with no extra code:

```tsx
// Text automatically matches surrounding text colour in both light and dark mode
<AtdLogo height={32} aria-label="All the Ducks" />
```

Mantine's `MantineProvider` sets the body text colour appropriately for each scheme, so `currentColor` resolves to near-black in light mode and near-white in dark mode automatically.

**TypeScript:** Add to `src/vite-env.d.ts`:
```ts
/// <reference types="vite-plugin-svgr/client" />
```

**`vite.config.ts`:**
```ts
import svgr from 'vite-plugin-svgr';
// inside defineConfig:
plugins: [react(), svgr()]
```

### Storybook

Update `.storybook/preview.tsx` to add a global toolbar toggle so all stories can be previewed in both schemes:

```tsx
const preview: Preview = {
  globalTypes: {
    colorScheme: {
      description: 'Color scheme',
      defaultValue: 'light',
      toolbar: { title: 'Color scheme', items: ['light', 'dark'] },
    },
  },
  decorators: [
    (Story, context) => (
      <MantineProvider theme={theme} forceColorScheme={context.globals.colorScheme}>
        <Story />
      </MantineProvider>
    ),
  ],
};
```

---

## Endpoint Path Display and Truncation

Canvas API paths vary widely in length. The longest in the dataset are around 70–80 characters (e.g. `/api/v1/courses/:course_id/assignment_groups/:assignment_group_id/assignments/:id`). Each surface area has a different constraint:

| Surface | Behaviour |
|---|---|
| **SelectedEndpoints badge** | Truncate with ellipsis; full path shown in tooltip |
| **EndpointSelector list row** | Wrap naturally — no truncation |
| **Unmatched endpoint feedback** | Wrap naturally — user needs to read the full line |
| **`requiredBy` tooltip content** | Wrap naturally — Mantine `Tooltip` with `multiline` |

### SelectedEndpoints badge truncation

Each badge displays `METHOD /path` as a single text string. Long paths are truncated with CSS:

```css
max-width: 280px;
white-space: nowrap;
overflow: hidden;
text-overflow: ellipsis;
```

The `280px` cap fits comfortably in the left panel at typical viewport widths while keeping the badge single-line. The method prefix (`GET `, `POST `, etc.) is always visible since it occupies only the first 4–6 characters.

A Mantine `Tooltip` wrapping the badge text shows the full `` `${method} ${path}` `` string on hover and focus. The close (`×`) button sits outside the truncated text span so it is always fully visible.

### EndpointSelector list rows

The list is inside a `ScrollArea` with a fixed height. Each row is a `Checkbox` whose label renders `METHOD /path [notes icon]`. Long labels wrap naturally onto a second line within their row — no truncation, no max-width. The scroll area handles any overflow vertically.

### Unmatched endpoint feedback

Unmatched lines (from the paste input) are displayed in a `role="alert"` block. Each unrecognised line is shown in full — monospace font, wrapping allowed. Truncating these would make it harder for the user to identify what they typed incorrectly.

### requiredBy tooltip

The `requiredBy` array on each permission row lists the endpoint paths that require it. These are rendered inside a Mantine `Tooltip` (or a popover for longer lists) using `multiline` and a `maw` of ~320px so the paths wrap rather than causing the tooltip to expand horizontally off-screen.

---

## Accessibility

### Standard

Target WCAG 2.1 AA. This is appropriate for a professional developer tool.

Mantine v8 is the right choice — no library change is warranted. Its standard components provide solid ARIA baselines for Modal, Tabs, Checkbox, Select, Tooltip, and Notifications. The gaps below are standard developer responsibilities, not Mantine deficiencies.

---

### Color Contrast

`#FFAF11` has a relative luminance of ~0.54:
- Against white (`#FFFFFF`): ~1.8:1 — **fails WCAG AA** at all text sizes
- Against black (`#000000`): ~11.8:1 — passes WCAG AAA

Rules that follow from this:

- **Never use `#FFAF11` as a text colour** on any background.
- **`#FFAF11` as a background requires black text.** When generating the `atdOrange` Mantine palette at `mantine.dev/colors-generator`, confirm that shade [5] is assigned `dark` text by Mantine's auto-contrast. If not, override explicitly.
- **`#FFAF11` is safe for decorative, non-text uses** (logo icon mark, active checkbox indicator, focus rings against dark surfaces).
- **Focus indicators:** Mantine's default focus ring uses `primaryColor`. At ~1.8:1 against white, a `#FFAF11` outline ring alone may be marginal (WCAG 2.2 § 2.4.11 requires 3:1 for focus appearance against the adjacent background). Supplement with `outline-offset` and a contrasting double ring if needed, or target a darker shade from the palette for the focus ring.
- **Dark mode:** Mantine's dark mode surfaces are dark enough that `#FFAF11` decorative elements are clearly visible. Mantine handles interactive element contrast in dark mode automatically.

---

### Semantic HTML Structure

- `<header>` landmark for the top bar
- `<main>` landmark for the two-panel content area
- `<footer>` landmark for the footer bar
- Heading hierarchy:
  - `<h1>` — app title ("Canvas API Permissions Planner")
  - `<h2>` — panel headings ("Add Endpoints", "Required Permissions")
  - `<h3>` — subsection headings within panels ("SIS Data")
- The SIS checkbox group: Mantine `Checkbox.Group` renders a `<fieldset>` when given a `label` prop — use this rather than a plain `<div>` heading, so the group relationship is exposed to assistive technology.

---

### `aria-label` on Icon-Only Buttons

All `ActionIcon` elements have no visible text. Each requires an explicit `aria-label`:

| Element | `aria-label` value |
|---|---|
| Color scheme toggle | `"Switch to dark mode"` / `"Switch to light mode"` (dynamic — reflects the action, not the current state) |
| Help button | `"Open help"` |
| Per-endpoint remove buttons | `"Remove GET /api/v1/courses/:course_id/assignments"` (dynamic — includes method + path) |
| Info icon tooltips | Mantine `Tooltip` sets `aria-describedby` on the trigger automatically; also add `aria-label="More information"` to the `ActionIcon` for screen readers that do not follow `aria-describedby` without focus |

---

### ARIA Live Regions

Dynamic content that changes without navigation requires announcement to screen readers:

| Region | Implementation |
|---|---|
| **Permissions result panel** | `aria-live="polite"` on the container element; `aria-atomic="false"` to allow partial updates. Screen reader announces changes when the permission list updates. |
| **Locale loading** | `aria-busy="true"` on the permissions panel during locale fetch; Mantine `Loader` gets `aria-label="Loading permission labels"`. |
| **Unmatched endpoint feedback** | `role="alert"` (equivalent to `aria-live="assertive"`) since it is an error condition requiring immediate attention. |

---

### Focus Management

| Event | Expected behaviour |
|---|---|
| Help modal opens | Focus moves to modal (Mantine handles ✓) |
| Help modal closes | Focus returns to `?` button (Mantine handles ✓) |
| Endpoint badge removed | Focus moves to the next badge; if it was the last badge, to the previous badge; if none remain, `SelectedEndpoints` calls an `onLastRemoved` callback and `App.tsx` focuses the `EndpointSelector` search `TextInput` (not the paste textarea — the search input is the primary add-endpoint affordance). |
| Paste input submits | Focus remains on the textarea (no movement needed) |

**Focus fallback wiring:**

`SelectedEndpoints` receives an `onLastRemoved?: () => void` prop. `App.tsx` holds a `searchInputRef = useRef<HTMLInputElement>(null)` and passes it to `EndpointSelector` as an `inputRef` prop (which the component forwards to its `TextInput`'s `ref`). The callback passed to `SelectedEndpoints` is simply `() => searchInputRef.current?.focus()`.

This keeps `SelectedEndpoints` decoupled from `EndpointSelector` — it emits an event and the parent handles the routing.

---

### Keyboard Navigation

All interactions must be completable without a pointer device:

| Element | Keyboard behaviour |
|---|---|
| Endpoint checkboxes | Tab to reach, Space to toggle |
| Endpoint search input | Tab to reach, type to filter |
| Paste textarea + Add button | Tab to reach textarea, type, Tab to button, Enter to submit |
| Selected endpoint remove buttons | Tab-navigable; Enter or Space to activate |
| Language picker | Tab, Enter to open; arrow keys to navigate; Enter to select (Mantine Select ✓) |
| Help modal tabs | Arrow keys to switch tabs (Mantine Tabs ✓) |
| Info tooltips | Tooltip shown when trigger receives keyboard focus (Mantine Tooltip ✓) |

---

## Print Stylesheet

Developers may want to print the permissions result for documentation or to attach to a ticket. A `@media print` stylesheet handles this with zero JavaScript.

**File:** `src/styles/print.css` — imported in `main.tsx`.

### What it hides

- Left panel (endpoint selector, paste input, SIS options)
- Header controls (language picker, help button, color scheme toggle)
- Footer
- Copy-to-clipboard and copy-link buttons (non-functional on paper)

### What it shows

- Permissions result panel at full page width
- A print-only block at the top containing:
  - The tool name ("Canvas API Permissions Planner")
  - A list of the selected endpoints (method + path), so the printed page has context for the permissions shown
  - The current date (via CSS `content: attr(data-print-date)` — `App.tsx` sets `data-print-date` on the print-only element using `new Date().toLocaleDateString()`)

### Print-specific styles

- Force light color scheme (`color-scheme: light; color: black; background: white`)
- Remove decorative shadows, borders, and background colours that waste ink
- `break-inside: avoid` on permission rows and OR group rows to prevent mid-item page breaks

### Implementation

The print-only header block uses a wrapper `div` with `className={classes.printOnly}` that is `display: none` by default and `display: block` inside `@media print`. No new React components are needed — just a small block of JSX in `App.tsx` (or the permissions panel) gated by the CSS class.

No PDF export button or save-as-file feature — the browser's native Ctrl+P / Cmd+P (which includes "Save as PDF") is sufficient.

---

## URL Sharing / Deep Linking

The URL always reflects the current selection state. Users can share a pre-configured view by copying the URL from the address bar (or using a convenience "Copy link" button). Opening a shared URL restores the exact endpoint selection.

This does not conflict with the "no persistence" rule — URL parameters are transient input (like a form submission), not stored application data. Reloading the page with no query params starts fresh, as before.

### URL Format

Selected endpoints are encoded as a base64url bitmask where each bit position corresponds to an endpoint's index in the `endpoints` array of `endpoints.json`. A version tag identifies which data version the bitmask was created against, enabling backward-compatible resolution when the data is updated.

```
?v=2026-03-03&s=AAAAAAEAAACAAAQAAAABAAAAAQAAAIAA
```

**`s` (selection)** — base64url-encoded bitmask of selected endpoint indices. Bit `N` set = endpoint at index `N` is selected. ~50 characters regardless of how many endpoints are selected (300 endpoints → 38 bytes → ~50 base64url chars).

**`v` (version)** — the `version` string from `endpoints.json` at the time the URL was created (e.g. `"2026-03-03"`). Used to detect and resolve version mismatches (see Versioned Archive Resolution below).

**Locale is not included** in the URL. Language is a user preference (stored in `localStorage`), not application state. A shared URL opens in the recipient's own language.

### Base64url Bitmask Encoding (`src/utils/urlState.ts`)

The bitmask uses native `Uint8Array` + `btoa`/`atob` with the URL-safe base64 variant (RFC 4648 §5: `+/` replaced with `-_`, padding stripped). No external dependencies.

```typescript
function encodeSelection(selectedIndices: number[], endpointCount: number): string {
  const bytes = new Uint8Array(Math.ceil(endpointCount / 8));
  for (const i of selectedIndices) {
    bytes[i >> 3] |= 1 << (i & 7);
  }
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function decodeSelection(encoded: string): number[] {
  const raw = atob(encoded.replace(/-/g, '+').replace(/_/g, '/'));
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);

  const indices: number[] = [];
  for (let i = 0; i < bytes.length * 8; i++) {
    if (bytes[i >> 3] & (1 << (i & 7))) indices.push(i);
  }
  return indices;
}
```

**Size:** 300 endpoints → 38 bytes → ~50 base64url characters. This is fixed-width — selecting 1 or 100 endpoints produces the same URL length. A full URL with 10 selected endpoints is ~100 characters total:

```
https://canvas-permissions.alltheducks.com/?v=2026-03-03&s=AAAAAAEAAACAAAQAAAABAAAAAQAAAIAA
```

### Versioned Archive Resolution

The bitmask is position-dependent — endpoint indices are determined by their order in `endpoints.json`. When the data is updated (endpoints added, removed, or reordered), existing shared URLs become invalid unless the old index order can be recovered.

**Archive files** solve this. Each time `endpoints.json` is updated, the previous version is preserved as a renamed copy in `public/data/`:

```
public/data/endpoints.2026-02-11.json
```

This is the full `endpoints.json` file, not a stripped-down index. Loading unnecessary permission data for an archive resolution is a negligible cost — it only happens when someone opens an old link, and the file is ~50KB. Keeping the full file means no separate extraction script or different format to maintain — just a rename.

These files are static assets served by GitHub Pages and accumulate over time (never deleted).

**Resolution flow on page load:**

1. Read `v` and `s` from URL params
2. If `v` matches the current `endpoints.json` version → decode bitmask directly against the current endpoint array
3. If `v` does not match → fetch `public/data/endpoints.{v}.json`:
   a. **Fetch succeeds:** validate with `EndpointsDataSchema`, decode bitmask against the archived endpoint array to get `Endpoint` objects (by index), then look up each `method + path` in the current endpoint array. Silently drop any that no longer exist.
   b. **Fetch fails (404 or network error):** the link is too old to resolve. Show a Mantine notification: *"This link was created with an older dataset and can't be resolved."* Start with empty selection.
4. After resolution, the URL is updated via `replaceState` to reflect the resolved state against the current data version — effectively "upgrading" the URL.

**Data update workflow:**

When regenerating `endpoints.json` for a new Canvas release:

1. Copy the current `public/data/endpoints.json` to `public/data/endpoints.{currentVersion}.json`
2. Update `public/data/endpoints.json` with the new data and new `version`
3. The archived copy of the previous version is now permanently available for old link resolution

### Reading URL on Page Load

```typescript
type UrlState = {
  version: string;
  selectionEncoded: string;
};

export function readUrlParams(): UrlState | null {
  const params = new URLSearchParams(window.location.search);
  const version = params.get('v');
  const selection = params.get('s');

  if (!version || !selection) return null;

  return { version, selectionEncoded: selection };
}
```

Returns `null` when `v` or `s` are absent — the caller uses default empty state. A bare URL (no query string) behaves exactly as today.

### Resolving Endpoints from URL

`App.tsx` resolves the URL state during initialisation. This code runs inside the `status === 'ready'` branch, after `useEndpoints` has loaded. Because version-mismatched resolution requires an async fetch, the initial state is set synchronously (version match) or via a `useEffect` (version mismatch):

```tsx
const { version: currentVersion, allPermissions, endpoints: endpointList } = endpoints;

const urlState = useMemo(() => readUrlParams(), []);

// Synchronous init for version match
const [selectedEndpoints, setSelectedEndpoints] = useState<Endpoint[]>(() => {
  if (!urlState || urlState.version !== currentVersion) return [];
  const indices = decodeSelection(urlState.selectionEncoded);
  return indices.map(i => endpoints[i]).filter((e): e is Endpoint => e !== undefined);
});

// Async resolution for version mismatch
useEffect(() => {
  if (!urlState || urlState.version === currentVersion) return;

  const controller = new AbortController();

  fetch(`${import.meta.env.BASE_URL}data/endpoints.${urlState.version}.json`, {
    signal: controller.signal,
  })
    .then(res => {
      if (!res.ok) throw new Error(`Archive not found: ${res.status}`);
      return res.json();
    })
    .then(raw => {
      const archived = EndpointsDataSchema.parse(raw);
      const indices = decodeSelection(urlState.selectionEncoded);
      const oldEndpoints = indices
        .map(i => archived.endpoints[i])
        .filter(Boolean);

      // Map old endpoints to current data by method + path
      const currentMap = new Map(endpoints.map(e => [`${e.method} ${e.path}`, e]));
      const resolved: Endpoint[] = [];
      const dropped: string[] = [];

      for (const old of oldEndpoints) {
        const id = `${old.method} ${old.path}`;
        const current = currentMap.get(id);
        if (current) {
          resolved.push(current);
        } else {
          dropped.push(id);
        }
      }

      setSelectedEndpoints(resolved);

      if (dropped.length > 0) {
        notifications.show({
          color: 'yellow',
          title: t('share.endpointsDropped'),
          message: t('share.endpointsDroppedMessage', {
            count: dropped.length,
            endpoints: dropped.join(', '),
          }),
          autoClose: false, // user should acknowledge
        });
      }
    })
    .catch(err => {
      if (err.name === 'AbortError') return;
      notifications.show({
        color: 'red',
        title: t('share.staleLink'),
        message: t('share.staleLinkMessage'),
      });
    });

  return () => controller.abort();
}, [urlState, currentVersion, endpoints]);
```

**Stale endpoint handling:** When resolving via archive, endpoints whose `METHOD /path` no longer exists in the current data are collected and reported to the user via a Mantine notification (yellow, `autoClose: false`). The notification lists the dropped endpoints so the user understands the result is incomplete. The URL is updated on the next `replaceState` cycle to reflect the resolved state against the current version.

Note: the same-version path (synchronous `useState` init) also needs to handle dropped endpoints — an index beyond the current array length indicates data corruption or tampering, not a version mismatch. This case is unlikely and can use the same notification pattern, but with a simpler message since there is no version context to explain it.

### Writing URL on State Change

A `useEffect` in `App.tsx` synchronises the URL whenever `selectedEndpoints` changes:

```tsx
useEffect(() => {
  if (selectedEndpoints.length === 0) {
    // Clear URL entirely when nothing is selected
    window.history.replaceState(null, '', window.location.pathname);
    return;
  }

  const params = new URLSearchParams();
  params.set('v', currentVersion);

  // Build index lookup for selected endpoints
  const indexMap = new Map(endpoints.map((e, i) => [`${e.method} ${e.path}`, i]));
  const selectedIndices = selectedEndpoints
    .map(e => indexMap.get(`${e.method} ${e.path}`))
    .filter((i): i is number => i !== undefined);

  params.set('s', encodeSelection(selectedIndices, endpoints.length));

  window.history.replaceState(null, '', `?${params.toString()}`);
}, [selectedEndpoints, currentVersion, endpoints]);
```

**`replaceState`, not `pushState`** — every state change updates the URL without adding a browser history entry. Pressing Back navigates away from the tool entirely (expected), not through a stack of intermediate states.

**Empty state clears the URL** — when all endpoints are deselected, the query string is removed entirely, leaving a clean URL.

### "Copy Link" Button

A convenience button in the permissions result panel header copies the current URL to the clipboard:

```tsx
<ActionIcon
  onClick={() => navigator.clipboard.writeText(window.location.href)}
  aria-label={t('share.copyLink')}
  variant="subtle"
>
  <IconLink />
</ActionIcon>
```

After clicking, show a brief Mantine `notifications.show` confirming "Link copied". The button is rendered only when at least one endpoint is selected (empty state has nothing to share).

**Translation keys** — add to `src/i18n/en.json`:

| Key | English value |
|-----|---------------|
| `share.copyLink` | "Copy shareable link" |
| `share.copied` | "Link copied to clipboard" |
| `share.staleLink` | "Outdated link" |
| `share.staleLinkMessage` | "This link was created with an older dataset and can't be resolved." |
| `share.endpointsDropped` | "Some endpoints not found" |
| `share.endpointsDroppedMessage` | "{{count}} endpoint(s) from this link no longer exist in the current dataset and were removed: {{endpoints}}" |

### Analytics Integration

When a user loads the page from a shared URL (i.e. `readUrlParams()` returns non-null on initial load), fire a custom event:

```typescript
trackEvent('shared_link_opened', {
  endpoint_count: selectedEndpoints.length,
  version_match: urlState.version === currentVersion ? 'yes' : 'no',
});
```

This tracks how often shared links are used and how often version-mismatched resolution occurs. The event is listed in the Analytics section's custom events table.

### Testing

**`src/utils/urlState.test.ts`** — unit tests for the encode/decode cycle:

- Round-trip: encode a set of indices → decode → same indices
- Empty selection: encodes to a string, decodes to `[]`
- Single endpoint at index 0 and at highest index (e.g. 299)
- All endpoints selected
- Base64url characters: confirm output contains only `[A-Za-z0-9_-]` (no `+`, `/`, or `=`)
- `readUrlParams` returns `null` when `v` or `s` are missing

### Icon Dependency

`IconLink` from `@tabler/icons-react` (already installed).

The `public/data/` directory for archived endpoint files is shown in the main Project Structure section.

---

## Content Security Policy

A `<meta>` CSP tag in `index.html` restricts where the browser can load resources from. GitHub Pages does not support custom HTTP headers, so the meta tag is the only option. Mantine injects inline styles extensively and `ColorSchemeScript` renders an inline `<script>`, so `'unsafe-inline'` is required for both `script-src` and `style-src` — this limits the CSP's protection against XSS but still provides value by locking down external origins.

Add to `index.html` `<head>`, before any `<script>` or `<link>` tags:

```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' 'unsafe-inline' https://www.googletagmanager.com;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src https://fonts.gstatic.com;
  connect-src 'self' https://raw.githubusercontent.com https://www.google-analytics.com;
  img-src 'self' data:;
">
```

**Origin rationale:**

| Directive | Origin | Reason |
|-----------|--------|--------|
| `script-src` | `googletagmanager.com` | GA4 script loader |
| `style-src` | `fonts.googleapis.com` | Google Fonts CSS |
| `font-src` | `fonts.gstatic.com` | Google Fonts WOFF2 files |
| `connect-src` | `raw.githubusercontent.com` | Canvas locale YAML fetch |
| `connect-src` | `google-analytics.com` | GA4 event collection |

If the site later moves to a host that supports custom HTTP headers (e.g. Cloudflare Pages), the meta tag can be replaced with a proper `Content-Security-Policy` header and `'unsafe-inline'` can potentially be replaced with nonces.

---

## GitHub Pages Deployment

The app is deployed as static files to **GitHub Pages** with a custom domain: **`canvas-permissions.alltheducks.com`**.

### Custom Domain

A `CNAME` record at the DNS provider points the subdomain to GitHub:

```
canvas-permissions.alltheducks.com.  CNAME  alltheducks.github.io.
```

A `public/CNAME` file in the repo ensures GitHub Pages retains the custom domain setting across deploys:

```
canvas-permissions.alltheducks.com
```

GitHub automatically provisions a **Let's Encrypt TLS certificate** for the custom domain. Enable "Enforce HTTPS" in repo Settings → Pages after the DNS propagates.

### Vite Base Path

Because the app is served from the root of a custom domain (not a `/repo-name/` subpath), `vite.config.ts` uses the default `base: '/'`. No base path override is needed.

### GitHub Actions Workflow

Deployment is triggered on every push to `main`. The workflow uses GitHub's first-party `actions/deploy-pages` action, which deploys directly to the Pages environment without needing a `gh-pages` branch.

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm

      - run: pnpm install --frozen-lockfile

      - run: pnpm build

      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

      - id: deployment
        uses: actions/deploy-pages@v4
```

### Repository Settings

In the repo's **Settings → Pages**:

1. **Source**: set to "GitHub Actions" (not "Deploy from a branch")
2. **Custom domain**: enter `canvas-permissions.alltheducks.com`
3. **Enforce HTTPS**: enable after DNS verification succeeds

### SPA Routing

This is a single-page app — all routes resolve to `index.html`. GitHub Pages returns 404 for any path that doesn't match a static file. To handle this, add a `public/404.html` that redirects to `index.html` (preserving the query string, which carries the shareable link state):

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <script>
      // Redirect 404s to index.html, preserving query string
      window.location.replace('/' + window.location.search);
    </script>
  </head>
  <body></body>
</html>
```

This is only needed if the app ever uses client-side path routing. Currently all state is in query parameters, so direct visits to `canvas-permissions.alltheducks.com/?v=...&s=...` already resolve to `index.html`. The `404.html` is a low-cost safeguard.

### URL References

All `og:url`, `og:image`, and `twitter:image` URLs in `index.html` must use the custom domain:

```
https://canvas-permissions.alltheducks.com/
https://canvas-permissions.alltheducks.com/og-image.png
```

---

## License

The project is released under the **MIT License**. Copyright holder: All the Ducks.

Add a `LICENSE` file to the repository root with the standard MIT text (year: 2026, holder: "All the Ducks"). The README should also note the license.

---

## Analytics (Google Analytics 4)

GA4 tracks usage patterns to understand the tool's audience and inform future development. The implementation uses **cookieless measurement** (GA4 consent mode with `analytics_storage: 'denied'`) — no cookies are set, no consent banner is needed, and no returning-user identification occurs. This provides aggregate usage data (page views, event counts, geo/language breakdowns) without any privacy trade-off.

### GA4 Script Tag

Add the standard GA4 snippet to `index.html` `<head>`, after the font `<link>` tags and before the `ColorSchemeScript`:

```html
<!-- Google Analytics 4 — cookieless mode -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('consent', 'default', {
    analytics_storage: 'denied'
  });
  gtag('config', 'G-XXXXXXXXXX');
</script>
```

The measurement ID (`G-XXXXXXXXXX`) is hardcoded — there is only one environment (production on GitHub Pages). Development traffic from `localhost` is filtered out in the GA4 dashboard using a hostname exclusion filter (GA4 Admin → Data Streams → Configure tag settings → Define internal traffic).

The `consent('default', { analytics_storage: 'denied' })` call instructs GA4 to operate without cookies. GA4 uses modelled data (based on aggregated signals) to fill gaps that cookies would normally cover. Precision is lower for returning-user and session-duration metrics, but event counts and page views are accurate.

### Analytics Utility (`src/utils/analytics.ts`)

A thin wrapper around the global `gtag` function, providing type safety and a single point of control:

```typescript
type EventParams = Record<string, string | number | boolean>;

export function trackEvent(name: string, params?: EventParams): void {
  if (typeof window.gtag === 'function') {
    window.gtag('event', name, params);
  }
}
```

The `typeof` guard ensures the function is a no-op if the GA4 script fails to load (ad blockers, network errors, development without the real measurement ID). No error is thrown — analytics is strictly best-effort and must never affect app functionality.

**TypeScript declaration** — add to `src/vite-env.d.ts`:

```typescript
declare function gtag(...args: unknown[]): void;
interface Window {
  gtag: typeof gtag;
}
```

### Custom Events

Beyond the automatic `page_view` event, the following custom events provide actionable insight into how the tool is used:

| Event name | Fired when | Parameters | Rationale |
|---|---|---|---|
| `endpoint_selected` | User checks an endpoint in the selector | `category` (string — e.g. "Assignments") | Which API areas are most common; category only (not full path) to keep cardinality low |
| `endpoints_pasted` | User clicks "Add" on the paste input | `count` (number — how many lines were pasted), `matched` (number — how many resolved to known endpoints) | How often paste is used vs. the selector; match rate indicates data coverage quality |
| `locale_changed` | User selects a language in the picker | `locale` (string — e.g. "es") | Audience language distribution; informs which locale translations to prioritise |
| `help_opened` | User opens the help modal | *(none)* | Whether help content is being used; if very low, it may need better discoverability |
| `shared_link_opened` | Page loads with `?v=` and `?s=` params present | `endpoint_count` (number), `version_match` ("yes" / "no") | How often shared links are used; version mismatch rate indicates how often old links circulate |

**No PII or sensitive data** is ever sent — events contain only categorical labels and counts.

### Call Sites

Each event is fired at the point of user interaction, not on derived state changes:

- `EndpointSelector` → `trackEvent('endpoint_selected', { category: endpoint.category })` inside `onToggle` (only when adding, not removing)
- `EndpointPaste` → `trackEvent('endpoints_pasted', { count, matched })` after processing paste input
- `LanguagePicker` → `trackEvent('locale_changed', { locale })` inside `onChange`
- `HelpModal` → `trackEvent('help_opened')` when the modal opens

### Development Filtering

During `pnpm dev`, analytics calls still fire (the `gtag` function is present if the script tag is in `index.html`), but GA4 discards or filters localhost traffic when the dashboard hostname filter is configured. Alternatively, developers can use a browser extension to block GA4 during development — no code-level `import.meta.env.DEV` guard is needed since the filtering happens server-side.

The GA4 snippet is included in the complete `index.html` `<head>` block in the Branding section.

---

## Verification Steps

After scaffolding and implementation:

1. `pnpm dev` — verify dev server starts and app loads in browser
2. Select several endpoints from different categories → confirm correct permissions appear
3. Paste a list of raw URLs (with numeric IDs) → confirm they normalise and match correctly
4. Select an endpoint that has SIS response fields → confirm the "Read SIS fields from responses" checkbox becomes enabled; check it → confirm `read_sis` appears in the output. Check "Use SIS IDs in request URLs" with no SIS-field endpoints selected → confirm `read_sis` still appears.
5. **OR group — unsatisfied:** Select an endpoint whose only permissions are an `anyOf` group → confirm the group appears as "Any one of: A · B · C" in the output.
6. **OR group — satisfied, order-independent:** Select two endpoints: one that requires permission A as a definite single, and one that has `anyOf: [A, B]`. Confirm the OR group does NOT appear (already satisfied). Then reverse the selection order — confirm the result is identical.
7. Switch language to Spanish (`es`) → confirm permissions labels update (or fall back gracefully to English if Canvas locale key lookup fails)
8. Select a locale that doesn't exist (`xx`) → confirm graceful error notification with English fallback
9. `pnpm build` → confirm clean build with no TypeScript errors
10. Open browser DevTools Network tab → interact with the app (select endpoint, change locale, open help) → confirm `collect` requests to `google-analytics.com` fire with the expected event names and parameters
11. **Print:** Select several endpoints → Ctrl+P / Cmd+P → confirm print preview shows only the permissions result at full width with the print-only header (tool name, selected endpoint list, date); confirm left panel, header controls, footer, and action buttons are hidden; confirm light colour scheme is forced
12. **URL sharing — round-trip:** Select endpoints + check an SIS option → copy the URL from the address bar → open in a new tab → confirm the selection and SIS options are restored identically
13. **URL sharing — copy link button:** Click the "Copy link" button → paste into a new tab → confirm same result as step 12
14. **URL sharing — empty state:** Deselect all endpoints → confirm the URL query string is cleared (bare path, no `?v=` or `?s=`)
15. **URL sharing — stale link:** Manually edit the URL to use a `v=` value that has no archived data file → reload → confirm "Outdated link" notification appears and the app starts with empty selection
16. **CSP:** Open browser DevTools Console → navigate the app (change locale, open help, select endpoints) → confirm no `Content-Security-Policy` violation warnings appear
17. **Accessibility — axe-core:** Install `@axe-core/react` as a dev dependency and enable it in development mode to catch WCAG violations in the browser console
18. **Accessibility — keyboard:** Manual keyboard-only walkthrough: add several endpoints, remove one, check SIS options, open help modal, switch language
19. **Accessibility — screen reader:** VoiceOver on macOS: confirm live region announces permission list changes when endpoints are added and removed, and that modal open/close is correctly announced
