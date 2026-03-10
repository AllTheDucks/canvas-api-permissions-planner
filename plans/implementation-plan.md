# Canvas API Permissions Planner — Implementation Plan

Each step is a self-contained, reviewable unit of work. After completing each step, we review and test together, then commit.

---

## Step 1 — Project scaffold and tooling

Scaffold the Vite + React + TypeScript project and configure all tooling.

**What to do:**
- `pnpm create vite . --template react-ts` (into the existing directory)
- Install all dependencies:
  - `@mantine/core @mantine/hooks @mantine/notifications`
  - `zod js-yaml crc-32`
  - `-D @types/js-yaml postcss postcss-preset-mantine postcss-simple-vars vite-plugin-svgr`
  - `-D vitest @testing-library/react @testing-library/user-event jsdom`
  - `@tabler/icons-react`
- Create `postcss.config.cjs` with Mantine presets
- Configure `vite.config.ts` (SVGR plugin, Vitest config)
- Confirm `tsconfig.json` strict mode; add `"vitest/globals"` to types
- Add `/// <reference types="vite-plugin-svgr/client" />` to `src/vite-env.d.ts`
- Clean up Vite scaffold boilerplate (remove default App.css, assets/react.svg, etc.)

**How to verify:**
- `pnpm dev` starts without errors
- `pnpm build` succeeds
- `pnpm test` runs (even with no tests yet)

**Commit message:**
```
Scaffold Vite + React + TS project with Mantine, Zod, and tooling

Set up the project with all production and dev dependencies:
Mantine 7 (with PostCSS config), Zod, js-yaml, crc-32, SVGR,
Vitest, Testing Library, and Tabler Icons.
```

---

## Step 2 — Mantine theme, fonts, and app shell

Set up the Mantine provider, custom theme, fonts, and the basic app shell layout (header/main/footer landmarks).

**What to do:**
- Generate 10-shade Mantine colour palette for `#FFAF11`
- Create the custom Mantine theme (`primaryColor: 'atdOrange'`, fonts)
- Update `index.html` `<head>` — title, viewport, Google Fonts preconnect + stylesheet links, Mantine `ColorSchemeScript`
- Update `main.tsx` — import Mantine CSS, wrap in `MantineProvider` with `defaultColorScheme="auto"`
- Create `src/components/AppErrorBoundary/index.tsx`
- Wire `main.tsx` render tree: `AppErrorBoundary > MantineProvider > Notifications > App`
- Create minimal `App.tsx` with `<header>`, `<main>`, `<footer>` landmarks and placeholder content
- ATD logo via SVGR in header and footer
- Add `src/vite-env.d.ts` gtag type declarations (placeholder for later)

**How to verify:**
- `pnpm dev` shows the app shell with ATD logo, heading, and footer
- Light/dark mode auto-detection works (check both)
- Fonts (Poppins body, Source Sans 3 headings) are loading

**Commit message:**
```
Add Mantine theme, fonts, and app shell layout

Configure custom ATD orange theme, Poppins/Source Sans 3 fonts,
MantineProvider with auto color scheme, error boundary, and the
header/main/footer landmark structure with ATD logo.
```

---

## Step 3 — Types, Zod schemas, and endpoints.json data

Define shared TypeScript types, write Zod schemas, generate the endpoint data file, and create the `useEndpoints` hook.

**What to do:**
- Create `src/types/index.ts` — `Endpoint`, `PermissionRef`, `AggregatedPermission`, etc.
- Create `src/schemas/endpoints.ts` — Zod schema for `endpoints.json`
- Create `src/schemas/canvasLocale.ts` — Zod schema for Canvas locale YAML
- Generate `public/data/endpoints.json` using the prompt in `docs/regenerate-data-prompt.md` (Claude reads Canvas LMS source on GitHub)
- Create `src/hooks/useEndpoints.ts` — fetch, validate, cache; returns discriminated union
- Wire `App.tsx` to use `useEndpoints` — loading spinner, error state, ready state

**How to verify:**
- `pnpm dev` — app loads, fetches and validates `endpoints.json`; shows endpoint/permission counts in console (or on screen as temp output)
- Intentionally corrupt `endpoints.json` — confirm Zod error surfaces in the UI

**Commit message:**
```
Add types, Zod schemas, endpoint data, and useEndpoints hook

Define shared TypeScript types and Zod validation schemas for
endpoints.json and Canvas locale YAML. Generate the endpoint
permission mapping data (~300 endpoints). Create useEndpoints
hook with fetch, validate, and cache pattern.
```

---

## Step 4 — Schema and utility unit tests

Write the first round of unit tests for schemas and pure utility functions.

**What to do:**
- Create `src/schemas/endpoints.test.ts` — valid data passes, invalid data fails
- Create `src/schemas/canvasLocale.test.ts` — outer key validation, `getTranslation` helper
- Create `src/utils/i18nKey.ts` — Canvas i18nliner key derivation
- Create `src/utils/i18nKey.test.ts` — verified case + edge cases

**How to verify:**
- `pnpm test` — all tests pass

**Commit message:**
```
Add i18nKey utility and unit tests for schemas and i18nKey

Implement Canvas i18nliner key derivation (slug + CRC32). Add unit
tests for endpoints schema, canvas locale schema, and i18nKey with
verified test cases from the Canvas source.
```

---

## Step 5 — Endpoint matcher utility

Implement and test the endpoint matcher that normalises pasted URLs to known endpoints.

**What to do:**
- Create `src/utils/endpointMatcher.ts` — normalise, tokenise, score, match
- Create `src/utils/endpointMatcher.test.ts` — full URL, path-only, SIS IDs, method filtering, multiple method matches, unrecognised paths

**How to verify:**
- `pnpm test` — all endpoint matcher tests pass

**Commit message:**
```
Add endpoint matcher with URL normalisation and scoring

Implement endpointMatcher utility that normalises pasted URLs
(stripping hosts, query strings, replacing numeric/SIS IDs with
wildcards) and scores them against known endpoints. Handles
method-specific and ambiguous matches.
```

---

## Step 6 — Permission aggregator utility

Implement and test the multi-pass permission aggregation logic.

**What to do:**
- Create `src/utils/permissionAggregator.ts` — the full multi-pass algorithm (required singles, optional singles, required OR groups, optional OR groups, subsumption elimination)
- Create `src/utils/permissionAggregator.test.ts` — comprehensive test suite

**How to verify:**
- `pnpm test` — all aggregator tests pass

**Commit message:**
```
Add permission aggregator with multi-pass deduplication

Implement permissionAggregator with five-pass algorithm: required
singles, optional singles, required OR groups, optional OR groups,
and subsumption elimination. Includes comprehensive test suite
covering order-independence and edge cases.
```

---

## Step 7 — EndpointSelector component

Build the searchable, categorised endpoint list with checkboxes.

**What to do:**
- Create `src/components/EndpointSelector/index.tsx` — search TextInput + ScrollArea + Checkbox.Group, category headings, notes tooltips, empty state
- Wire into `App.tsx` — pass endpoints, selected state, onToggle handler

**How to verify:**
- `pnpm dev` — can search and filter endpoints, check/uncheck them
- Category headings appear and hide correctly during search
- Notes icon tooltip works for endpoints that have notes

**Commit message:**
```
Add EndpointSelector with search, categories, and notes tooltips

Searchable endpoint list grouped by category with checkboxes.
Search filters by method+path substring; categories with no
matches are hidden. Endpoints with notes show info icon tooltips.
```

---

## Step 8 — SelectedEndpoints component

Build the selected endpoints display with remove buttons and focus management.

**What to do:**
- Create `src/components/SelectedEndpoints/index.tsx` — badges with truncation, tooltips, notes icons, remove buttons, focus management on removal
- Wire into `App.tsx` — pass selected state, onRemove (same toggle handler), onLastRemoved (focus search input)

**How to verify:**
- `pnpm dev` — selected endpoints appear as badges; can remove them
- Badge text truncates with tooltip for long paths
- Focus moves correctly after removal (next → previous → search input)

**Commit message:**
```
Add SelectedEndpoints with badges, tooltips, and focus management

Display selected endpoints as truncated badges with remove buttons.
Full path shown in tooltip. Focus management after removal: next
badge, then previous, then falls back to search input.
```

---

## Step 9 — EndpointPaste component

Build the paste-to-add textarea with unmatched endpoint reporting.

**What to do:**
- Create `src/components/EndpointPaste/index.tsx` — Textarea + Add button, parse input through endpointMatcher, add matches to selection, report unmatched lines
- Wire into `App.tsx`

**How to verify:**
- `pnpm dev` — paste endpoint URLs, click Add, endpoints are selected
- Unmatched lines shown in an alert
- Lines without a method that match multiple endpoints add all of them

**Commit message:**
```
Add EndpointPaste with URL parsing and unmatched reporting

Textarea for pasting endpoint lists. Lines are parsed through
endpointMatcher and matched endpoints are added to the selection.
Unmatched lines are reported to the user in an alert block.
```

---

## Step 10 — PermissionsResult component

Build the aggregated permissions display with required/optional sections.

**What to do:**
- Create `src/components/PermissionsResult/index.tsx` — required section (scope-grouped singles + OR groups), optional section (flat list with notes), empty state, scope badges with tooltips, OR group info tooltips, `aria-live` region
- Wire into `App.tsx` — pass aggregated permissions from `useMemo`

**How to verify:**
- `pnpm dev` — select endpoints, see permissions grouped by scope
- OR groups display correctly with per-option scope badges
- Optional permissions appear with notes in dimmed text
- Empty state shows when no endpoints selected

**Commit message:**
```
Add PermissionsResult with scope grouping and optional permissions

Display aggregated permissions in two sections: required (grouped
by scope with OR groups) and optional (flat with explanatory notes).
Scope badges with tooltips, OR group info icons, aria-live region.
```

---

## Step 11 — Two-panel responsive layout

Finalize the App.tsx layout with the two-panel grid and responsive behaviour.

**What to do:**
- Implement Mantine `Grid` with `span={{ base: 12, sm: 5/7 }}` in `App.tsx`
- Left panel: EndpointSelector + EndpointPaste + SelectedEndpoints
- Right panel: PermissionsResult
- Responsive header (hide title below `sm`, keep controls)
- Footer with data version and ATD attribution
- `aria-label` on `<main>` for screen readers when title is hidden

**How to verify:**
- `pnpm dev` — two-panel layout on desktop, stacked on mobile (use browser devtools responsive mode)
- Header controls remain visible at all widths
- Footer shows version and attribution

**Commit message:**
```
Wire two-panel responsive layout in App.tsx

Implement Grid layout with endpoint panel (5 cols) and permissions
panel (7 cols) that stacks on mobile. Responsive header hides
title below sm breakpoint. Footer with data version and ATD
attribution.
```

---

## Step 12 — Color scheme toggle

Add the light/dark mode toggle button.

**What to do:**
- Create `src/components/ColorSchemeToggle/index.tsx` — ActionIcon with sun/moon icons
- Add to App.tsx header between language picker slot and help button slot
- Verify favicon and logo work in both schemes

**How to verify:**
- `pnpm dev` — toggle works, persists to localStorage, ATD logo text adapts to scheme

**Commit message:**
```
Add color scheme toggle with sun/moon icons

Light/dark mode toggle using Mantine's color scheme hooks.
Persists preference to localStorage. Logo text adapts via
currentColor. Correct aria-label reflects the action.
```

---

## Step 13 — App UI i18n infrastructure

Set up the app translation system (bundled JSON, context, detect locale).

**What to do:**
- Create `src/i18n/locales.ts` — `SUPPORTED_LOCALES`, `RTL_LOCALES`, `LOCALE_NAMES`, `SUPPLEMENTAL_FONTS`
- Create `src/i18n/en.json` with all UI string keys
- Create `src/context/AppTranslationsContext.tsx` — context, provider, `useAppTranslations` hook with `t()` function and `isRtl`
- Create `src/utils/detectLocale.ts` and `src/utils/detectLocale.test.ts`
- Wire `App.tsx` — locale state with localStorage persistence, `AppTranslationsProvider` wrapping

**How to verify:**
- `pnpm dev` — app loads in English
- `pnpm test` — detectLocale tests pass
- Locale state initialises from browser language and persists to localStorage

**Commit message:**
```
Add app UI i18n infrastructure with English strings

Create translation context with t() function, browser locale
detection, localStorage persistence, and full English string
catalog. Defines supported locales, RTL locales, and native
locale names.
```

---

## Step 14 — Language picker and locale wiring

Add the language picker and wire all components to use `t()`.

**What to do:**
- Create `src/components/LanguagePicker/index.tsx` — Mantine Select with locale names
- Add LanguagePicker to App.tsx header
- Update all components to use `t()` from `useAppTranslations()` for all hardcoded strings
- Add AI translation disclosure text (visible when locale !== 'en')
- Add language picker info tooltip

**How to verify:**
- `pnpm dev` — language picker shows all supported locales
- Selecting a language updates the UI (English for now, since no translations yet)
- AI disclosure note appears when non-English is selected

**Commit message:**
```
Add language picker and wire all UI strings through t()

Replace all hardcoded UI strings with translation keys via
useAppTranslations(). Language picker in header with native
locale names. AI translation disclosure for non-English locales.
```

---

## Step 15 — Canvas permission label localisation (useLocale)

Implement the runtime locale YAML fetch for Canvas permission labels.

**What to do:**
- Create `src/hooks/useLocale.ts` — fetch Canvas locale YAML from GitHub, parse with js-yaml, validate with Zod, build symbol→label map with i18nKey derivation, in-memory cache, AbortController for race conditions
- Create `src/utils/supplementalFont.ts` — idempotent Google Fonts loader
- Wire `App.tsx` — call `useLocale`, pass `localeLabels` to aggregator `useMemo`, pass `isLoadingLocale` to PermissionsResult
- Add `useEffect` for `document.dir`, `document.lang`, and supplemental font loading
- Error notification on locale fetch failure

**How to verify:**
- `pnpm dev` — select Spanish → permission labels change to Spanish
- Select Arabic → layout flips to RTL, Arabic font loads
- Select a locale, switch back to English → instant (cached)
- Block the network request → error notification, English fallback

**Commit message:**
```
Add Canvas permission label localisation via runtime YAML fetch

Implement useLocale hook that fetches Canvas locale YAML from
GitHub, derives i18n keys via CRC32, and builds translated label
maps. In-memory cache, AbortController race handling, supplemental
font loading for non-Latin scripts, RTL support.
```

---

## Step 16 — AI-generated locale translations

Generate all 34 non-English locale files for app UI strings.

**What to do:**
- Use the prompt in `docs/generate-translations-prompt.md` to generate all locale JSON files
- Place at `src/i18n/{locale}.json`
- Update `AppTranslationsContext` to dynamically import non-English locales

**How to verify:**
- `pnpm dev` — switch to any non-English locale → app UI strings translate
- Spot-check a few locales for quality

**Commit message:**
```
Add AI-generated translations for 34 locales

Generate app UI translations for all Canvas-supported locales
using AI. Dynamic import for code splitting — only the selected
locale's JSON is fetched.
```

---

## Step 17 — Help modal

Build the help modal with three informational tabs.

**What to do:**
- Create `src/components/HelpModal/index.tsx` — `?` ActionIcon + Modal with three Tabs (How to use, Canvas Permissions, Common setups)
- Add to App.tsx header
- All content via `t()` keys

**How to verify:**
- `pnpm dev` — click `?` → modal opens with three tabs of content
- Esc closes modal, focus returns to `?` button
- Content translates when locale changes

**Commit message:**
```
Add help modal with usage guide, permissions explainer, and examples

Three-tab help modal: step-by-step usage guide, Canvas RBAC
explanation (scopes, inheritance, OR groups), and common
integration setup examples. All content localised.
```

---

## Step 18 — Print stylesheet

Add print-optimised CSS and the print-only header block.

**What to do:**
- Create `src/styles/print.css` — hide left panel, controls, footer; show permissions full-width; force light scheme; break-inside: avoid
- Add print-only header block in `App.tsx` (tool name, selected endpoints, date)
- Import `print.css` in `main.tsx`

**How to verify:**
- `pnpm dev` — Cmd+P → print preview shows only permissions with context header

**Commit message:**
```
Add print stylesheet with permissions-only layout

Print-optimised CSS hides the endpoint panel, header controls,
and footer. Shows permissions result full-width with a print-only
header containing tool name, selected endpoints, and date.
```

---

## Step 19 — URL sharing and deep linking

Implement bitmask URL encoding for shareable selections.

**What to do:**
- Create `src/utils/urlState.ts` — `encodeSelection`, `decodeSelection`, `readUrlParams`
- Create `src/utils/urlState.test.ts` — round-trip, edge cases, URL-safe chars
- Wire `App.tsx` — read URL on load (sync for version match, async for mismatch), write URL on state change via `replaceState`
- Add "Copy link" ActionIcon in permissions panel header
- Add `share.*` translation keys

**How to verify:**
- `pnpm dev` — select endpoints → URL updates; copy URL → new tab → selection restored
- Empty selection clears URL
- `pnpm test` — urlState tests pass

**Commit message:**
```
Add URL sharing with bitmask encoding and versioned resolution

Encode selected endpoints as a base64url bitmask in the URL query
string. Version-tagged for backward compatibility with archived
data files. Copy link button for easy sharing.
```

---

## Step 20 — Google Analytics 4

Add cookieless GA4 tracking with custom events.

**What to do:**
- Add GA4 script tag to `index.html` (with placeholder measurement ID)
- Create `src/utils/analytics.ts` — `trackEvent` wrapper
- Add `gtag` type declaration to `vite-env.d.ts`
- Wire custom events into components: `endpoint_selected`, `endpoints_pasted`, `locale_changed`, `help_opened`, `shared_link_opened`

**How to verify:**
- `pnpm dev` — open Network tab, interact → `collect` requests fire (or no-op gracefully if GA blocked)

**Commit message:**
```
Add Google Analytics 4 with cookieless consent mode

GA4 integration with analytics_storage denied (no cookies).
Custom events: endpoint_selected, endpoints_pasted, locale_changed,
help_opened, shared_link_opened. Graceful no-op when blocked.
```

---

## Step 21 — Content Security Policy and meta tags

Add CSP, Open Graph tags, and favicon.

**What to do:**
- Add `<meta http-equiv="Content-Security-Policy">` to `index.html`
- Add Open Graph and Twitter card meta tags
- Create `public/favicon.svg` (extracted icon mark from ATD logo)
- Create `public/favicon.ico` (raster fallback)
- Add meta description
- Add favicon `<link>` tags

**How to verify:**
- `pnpm dev` — no CSP violations in console during normal usage
- Favicon appears in browser tab
- Social preview tags present in page source

**Commit message:**
```
Add CSP, Open Graph meta tags, and favicon

Content Security Policy restricting external origins. Open Graph
and Twitter card tags for social sharing previews. SVG and ICO
favicon from ATD icon mark.
```

---

## Step 22 — Deployment configuration

Set up GitHub Pages deployment with GitHub Actions.

**What to do:**
- Create `.github/workflows/deploy.yml`
- Create `public/CNAME` with `canvas-permissions.alltheducks.com`
- Create `public/404.html` SPA redirect
- Add `LICENSE` file (MIT, 2026, All the Ducks)
- Update `og:url` and image URLs to use custom domain

**How to verify:**
- `pnpm build` succeeds
- Workflow YAML is valid
- `dist/` output includes CNAME, 404.html, favicon files, data directory

**Commit message:**
```
Add GitHub Pages deployment config and MIT license

GitHub Actions workflow for automated deployment. CNAME for
custom domain, 404.html for SPA routing, MIT license.
```

---

## Step 23 — Accessibility audit and polish

Final accessibility verification and polish pass.

**What to do:**
- Install `@axe-core/react` (devDependency), enable in `main.tsx` dev mode
- Keyboard-only walkthrough: add endpoints, remove, open help, switch language
- Screen reader test (VoiceOver): verify `aria-live`, modal focus management
- Fix any `axe-core` violations
- Verify touch targets meet 44×44px minimum
- Check all `aria-label` values are correct and dynamic
- Verify no horizontal overflow at 375px

**How to verify:**
- Zero axe-core violations in console
- Complete keyboard-only workflow
- VoiceOver announces permission changes and modal transitions

**Commit message:**
```
Accessibility audit: fix violations and verify keyboard/screen reader

Resolve all axe-core WCAG AA violations. Verify keyboard-only
navigation, screen reader announcements for live regions and
modals, and touch target sizes.
```

---

## Step 24 — Storybook setup and stories

Add Storybook for component documentation and visual testing.

**What to do:**
- Install Storybook (`pnpm dlx storybook@latest init`)
- Configure `.storybook/preview.tsx` with MantineProvider + AppTranslationsProvider decorators + color scheme toolbar
- Write stories for all components:
  - EndpointSelector (Default, WithSearch, WithSelections)
  - EndpointPaste (Default, WithUnmatched, WithMultipleMethodMatches)
  - SelectedEndpoints (Empty, WithItems, WithNotes)
  - PermissionsResult (Empty, SinglesOnly, WithAnyOfGroup, Mixed, WithOptionalPermissions)
  - HelpModal (Default, Open)
  - LanguagePicker (Default, LocaleSelected)

**How to verify:**
- `pnpm storybook` — all stories render correctly in both light and dark mode

**Commit message:**
```
Add Storybook with stories for all components

Storybook setup with Mantine and i18n decorators. Stories for
EndpointSelector, EndpointPaste, SelectedEndpoints,
PermissionsResult, HelpModal, and LanguagePicker with multiple
variants each.
```

---

## Summary

| Step | Description | Key files |
|------|-------------|-----------|
| 1 | Project scaffold and tooling | `package.json`, `vite.config.ts`, `postcss.config.cjs` |
| 2 | Mantine theme, fonts, app shell | `main.tsx`, `App.tsx`, `index.html`, `AppErrorBoundary` |
| 3 | Types, schemas, data, useEndpoints | `types/`, `schemas/`, `endpoints.json`, `useEndpoints.ts` |
| 4 | Schema and utility tests | `*.test.ts` files, `i18nKey.ts` |
| 5 | Endpoint matcher | `endpointMatcher.ts` + tests |
| 6 | Permission aggregator | `permissionAggregator.ts` + tests |
| 7 | EndpointSelector component | `EndpointSelector/index.tsx` |
| 8 | SelectedEndpoints component | `SelectedEndpoints/index.tsx` |
| 9 | EndpointPaste component | `EndpointPaste/index.tsx` |
| 10 | PermissionsResult component | `PermissionsResult/index.tsx` |
| 11 | Two-panel responsive layout | `App.tsx` layout |
| 12 | Color scheme toggle | `ColorSchemeToggle/index.tsx` |
| 13 | App UI i18n infrastructure | `i18n/`, `AppTranslationsContext`, `detectLocale` |
| 14 | Language picker and locale wiring | `LanguagePicker/`, all components use `t()` |
| 15 | Canvas permission label localisation | `useLocale.ts`, `supplementalFont.ts` |
| 16 | AI-generated locale translations | `src/i18n/*.json` (34 files) |
| 17 | Help modal | `HelpModal/index.tsx` |
| 18 | Print stylesheet | `print.css`, print-only header |
| 19 | URL sharing and deep linking | `urlState.ts` + tests, App.tsx wiring |
| 20 | Google Analytics 4 | `analytics.ts`, GA4 script, custom events |
| 21 | CSP and meta tags | `index.html` head, favicon files |
| 22 | Deployment configuration | GitHub Actions, CNAME, 404.html, LICENSE |
| 23 | Accessibility audit | axe-core, keyboard test, screen reader test |
| 24 | Storybook setup and stories | `.storybook/`, `*.stories.tsx` |
