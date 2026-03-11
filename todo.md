# Canvas API Permissions Planner — Todo

> **Implementation plan:** See `plans/implementation-plan.md` for the ordered, PR-sized breakdown of work from blank project to completion. Each step below maps to one or more implementation steps.

## Project Setup

- [x] Scaffold Vite + React + TypeScript project (`pnpm create vite . --template react-ts`)
- [x] Install Mantine 8 and configure PostCSS (`postcss.config.cjs`); import `@mantine/core/styles.css` and `@mantine/notifications/styles.css` in `main.tsx`; mount `<Notifications />` inside `<MantineProvider>` in `main.tsx`
- [x] Install Zod, js-yaml, and crc-32
- [x] Install `vite-plugin-svgr` (devDependency); add to `vite.config.ts` plugins; add `/// <reference types="vite-plugin-svgr/client" />` to `src/vite-env.d.ts`
- [x] Install Vitest and Testing Library (`vitest`, `@testing-library/react`, `@testing-library/user-event`, `jsdom`)
  - Add `test: { environment: 'jsdom', globals: true }` to `vite.config.ts`
  - Add `"vitest/globals"` to `tsconfig.app.json` types
- [ ] Install Storybook (`pnpm dlx storybook@latest init`) and configure `.storybook/preview.tsx` with `AppTranslationsProvider locale="en"` + `MantineProvider` decorators
- [ ] Install `@axe-core/react` (devDependency) and enable in `main.tsx` during development for automated WCAG violation reporting
- [x] Configure `vite.config.ts` (SVGR plugin, Vitest config)
- [x] Confirm `tsconfig.json` strict mode is enabled

## Branding

- [x] `src/assets/atd-logo.svg` — text group has `fill="currentColor"`; icon mark fixed `#FFAF11` (single file, no dark variant needed)
- [ ] Create `public/og-image.png` — 1200×630 branded social card (dark background, ATD logo, tool name + description); manual design step required before first public deploy
- [x] Write `index.html` `<head>` — use the complete block from the plan (charset, viewport, title, favicon links, meta description, Open Graph + Twitter card tags, Google Fonts preconnect + stylesheet, ColorSchemeScript inline script); update GitHub Pages URLs (`og:url`, `og:image`) when repo URL is finalised
- [x] Favicon — create `public/favicon.svg` (icon mark only, square viewBox ~`18 26 110 95`, `#FFAF11` duck shape extracted from `atd-logo.svg`) and `public/favicon.ico` (16×16 raster, generated from the SVG)
- [x] Generate 10-shade Mantine colour palette for #FFAF11 (use mantine.dev/colors-generator) — confirm shade [5] is assigned **dark (black) text** by Mantine's auto-contrast; override if not (accessibility: #FFAF11 on white is only ~1.8:1)
- [x] Configure custom Mantine theme in `main.tsx` — `primaryColor: 'atdOrange'`, `fontFamily: 'Poppins'`, `headings.fontFamily: 'Source Sans 3'`
- [x] Set `defaultColorScheme="auto"` on `MantineProvider` in `main.tsx`
- [ ] Update `.storybook/preview.tsx` — use custom theme + add global color scheme toolbar toggle (`forceColorScheme` per story)
- [x] `App.tsx` header — `<AtdLogo>` SVGR component + tool name on the left, controls on the right
- [x] `App.tsx` footer — `Group` with `justify="space-between"`: left side shows Canvas data version (`t('footer.dataVersion', { version })` where `version` comes from `useEndpoints()`); right side shows "A free tool by" + `<AtdLogo>` SVGR component linked to alltheducks.com

## Color Scheme

- [x] `src/components/ColorSchemeToggle/index.tsx` — `ActionIcon` using `useMantineColorScheme` + `useComputedColorScheme`; shows moon in light mode, sun in dark mode; toggles and persists scheme; `aria-label` must reflect the *action* ("Switch to dark mode" / "Switch to light mode")
- [x] Add `ColorSchemeToggle` to `App.tsx` header between language picker and help button

## Data

- [x] Generate `public/data/endpoints.json` using the prompt in `docs/regenerate-data-prompt.md` (Claude reads Canvas LMS source on GitHub)
  - `version` is the Canvas stable release date from the `prod` branch (e.g. `"2026-02-11"`) — Claude extracts this in Step 0 of the prompt
  - Verify: `pnpm run dev` → error state shows any Zod errors; spot-check 5–10 endpoints against source
- [x] Write Zod schema for `endpoints.json` in `src/schemas/endpoints.ts`
  - `EndpointPermissionSchema` is a union of `SinglePermissionSchema` and `AnyOfPermissionSchema`
  - Both shapes support `required?: boolean` and `note?: string` for conditional/optional permissions
- [x] Write Zod schema for Canvas locale YAML in `src/schemas/canvasLocale.ts`

## Core Features

- [x] `src/types/index.ts` — shared TypeScript interfaces (Endpoint, PermissionRef, AggregatedPermission, etc.)
- [x] `src/utils/i18nKey.ts` — Canvas i18nliner key derivation: `slug + "_" + CRC32("{len}:{label}").toString(16)`
- [x] `src/utils/i18nKey.test.ts` — unit tests: verified case + edge cases (special chars, spaces, single char)
- [x] `src/components/AppErrorBoundary/index.tsx` — class-based React Error Boundary; wraps app root in `main.tsx` (outside `MantineProvider`); catches unexpected render errors
- [x] `src/hooks/useEndpoints.ts` — fetch `public/data/endpoints.json` on mount, Zod-validate, module-level cache; returns discriminated union `{ status: 'loading' } | { status: 'error', error } | { status: 'ready', version, allPermissions, endpoints }`
- [x] `src/schemas/endpoints.test.ts` — unit tests: valid data passes; invalid data (missing fields, bad anyOf, duplicate scope) fails
- [x] `src/schemas/canvasLocale.test.ts` — unit tests: `canvasLocaleSchema(locale)` validates outer key; `getTranslation` returns string/undefined correctly
- [x] `src/utils/endpointMatcher.ts` — normalise and match pasted/typed URLs to known endpoints; returns `Endpoint[]` (empty = unrecognised, one = unambiguous, many = multiple methods matched path with no method specified)
- [x] `src/utils/endpointMatcher.test.ts` — unit tests: full URL, query string stripped, numeric IDs, SIS IDs (all 7 prefixes), path-only; method specified + match found → that endpoint; no method + multiple methods in data → all returned; method specified + no matching method → `[]` (unrecognised, no fallback); unrecognised path → `[]`
- [x] `src/utils/permissionAggregator.ts` — multi-pass, order-independent aggregation
  - Pass 1: collect all definite required symbols into a Set
  - Pass 1b: collect optional singles (`required: false`) separately, skipping if already in required set
  - Pass 2: collect unsatisfied required OR groups (skip if any member is in the Pass 1 set)
  - Pass 2b: collect optional OR groups (`required: false`), skipping if satisfied by required singles or matching a required OR group
  - Pass 2.5: subsumption elimination (applied to required and optional groups separately)
  - Result: required singles/OR groups followed by optional singles/OR groups, each with `notes[]`
- [x] `src/utils/permissionAggregator.test.ts` — unit tests: required singles, optional singles, required OR groups, optional OR groups, optional suppressed when already required, notes collected and deduplicated, subsumption, result sort order
- [x] `src/components/EndpointSelector/index.tsx` — props: `{ endpoints, selected, onToggle, inputRef?: React.Ref<HTMLInputElement> }` (inputRef forwarded to the search TextInput for external focus control); `TextInput` (search) + `ScrollArea` + one `Checkbox.Group`; category headings as `Text` dividers (not accordion); checkbox value is `` `${e.method} ${e.path}` ``; search filters by case-insensitive substring on method+path, hiding category headers with zero matches; already-selected endpoints always visible regardless of search; endpoints with `notes` show inline `IconInfoCircle` + `Tooltip`; "No endpoints match" empty state when nothing matches
- [ ] `src/components/EndpointSelector/EndpointSelector.stories.tsx` — Default, WithSearch, WithSelections
- [x] `src/components/EndpointPaste/index.tsx` — textarea to paste a list of endpoints
- [ ] `src/components/EndpointPaste/EndpointPaste.stories.tsx` — Default, WithUnmatched, WithMultipleMethodMatches
- [x] `src/components/SelectedEndpoints/index.tsx` — props: `{ selected, onRemove: (endpoint) => void, onLastRemoved?: () => void }`; display selected endpoints with remove controls; badge text truncated at `max-width: 280px` with ellipsis, full path shown in `Tooltip`; endpoints with a `notes` field show an `IconInfoCircle` + Mantine `Tooltip` on the badge; each remove button needs `aria-label="${t('selectedEndpoints.remove')} METHOD /path"`; on removal focus moves to: next badge → previous badge → calls `onLastRemoved` (App.tsx then focuses EndpointSelector search input); renders nothing when `selected` is empty
- [ ] `src/components/SelectedEndpoints/SelectedEndpoints.stories.tsx` — Empty, WithItems, WithNotes
- [x] `src/components/PermissionsResult/index.tsx` — two sections: Required Permissions (singles in three scope sections + OR groups) and Optional Permissions (flat list with notes in dimmed text); each section suppressed when empty; `<Divider />` between sections when both present; each OR group row: `[ⓘ] Any one of: Label [scope] · Label [scope]` with scope badge per option (not per row); optional permission rows show `notes[]` below label as `Text size="xs" c="dimmed"`; add `aria-live="polite"` `aria-atomic="false"` on the container; add `aria-busy="true"` during locale fetch
- [ ] `src/components/PermissionsResult/PermissionsResult.stories.tsx` — Empty, SinglesOnly, WithAnyOfGroup, Mixed, WithOptionalPermissions
- [x] `src/App.tsx` — wire all components into the two-panel layout; use `<header>`, `<main>`, `<footer>` landmarks; heading hierarchy: `<h1>` app title, `<h2>` panel headings, `<h3>` subsections; implement `handleToggleEndpoint` (single handler passed to `EndpointSelector` as `onToggle` and `SelectedEndpoints` as `onRemove`); pass `aggregatePermissions(selectedEndpoints, allPermissions, localeLabels)` result to `<PermissionsResult>`

## Localisation

### Canvas permission labels (runtime YAML fetch)
- [x] `src/hooks/useLocale.ts` — fetch + parse + cache Canvas locale YAML files from GitHub
  - Signature: `useLocale(locale, allPermissions, dataVersion) → { localeLabels: Record<string, string>, isLoading: boolean }`
  - Fetches from `stable/{dataVersion}` branch on GitHub (not `master` or `prod`) to match the exact codebase the permission labels were derived from
  - `locale === 'en'` or cached: returns labels immediately, no fetch
  - Non-English: fetches YAML, computes i18n keys (slug + CRC32 hash), builds symbol→translatedLabel map with English fallback
  - During fetch: `isLoading: true`, `localeLabels` holds previous locale's labels (stale-while-revalidate — panel never goes blank)
  - Race condition: `useEffect` creates `AbortController`; cleanup calls `controller.abort()`; `AbortError` silently ignored (not shown as error)
  - In-memory cache per session (`Map<locale, Map<symbol, translatedLabel>>`)
  - Called in `App.tsx` alongside `useEndpoints`; `localeLabels` passed into `aggregatePermissions` via `useMemo`; `isLoading` forwarded to `PermissionsResult` as `isLoadingLocale` prop
- [x] Loading state during locale fetch — `PermissionsResult` renders Mantine `Loader` overlay when `isLoadingLocale` is true; sets `aria-busy={isLoadingLocale}` on container; stale permissions remain visible underneath
- [x] Error notification on locale fetch failure — `notifications.show({ color: 'red', ... })` with message "Could not load {LOCALE_NAMES[locale]} labels — showing in English"; picker state unchanged; failed locale not cached so re-selecting retries automatically

### App UI i18n (bundled JSON)
- [x] `src/i18n/locales.ts` — `SUPPORTED_LOCALES` (with `'en'` as first entry), `RTL_LOCALES`, `LOCALE_NAMES`, and `SUPPLEMENTAL_FONTS` constants (shared by all locale-aware code)
- [x] Create `src/i18n/en.json` — all app UI string keys; English source of truth
- [x] `src/context/AppTranslationsContext.tsx` — context + `AppTranslationsProvider` + `useAppTranslations` hook
  - Static import of `en.json` as baseline fallback
  - Dynamic `import()` for non-English locales (Vite code splits them; module-level `Map` cache)
  - Returns `{ t: (key) => string, isRtl: boolean }`
- [x] `src/utils/detectLocale.ts` — `detectLocale(supportedLocales)`: iterates `navigator.languages`, strips subtags iteratively, returns first match or `'en'`
- [x] `src/utils/detectLocale.test.ts` — exact match, prefix match (`es-MX` → `es`), multi-subtag (`zh-Hans-CN` → `zh-Hans`), fallback to `'en'`
- [x] `App.tsx` locale state: init with a `useState` lazy initializer — read `localStorage.getItem('locale')`, validate against `SUPPORTED_LOCALES` (if invalid/missing, call `localStorage.removeItem` and fall back to `detectLocale(SUPPORTED_LOCALES)`); `handleLocaleChange` saves to localStorage, but calls `localStorage.removeItem('locale')` when the selected locale matches the auto-detected value (clears unnecessary pin; browser-language changes are picked up again automatically)
- [ ] Write `src/i18n/en.json` with all keys: UI chrome keys (from Translation Key Structure table), `colorScheme.switchToDark/Light`, `selectedEndpoints.remove`, `common.moreInfo`, `endpoints.noResults`, and all `help.*` content keys (tabs 1–3 as defined in Help Modal Content Keys section)
- [x] Generate AI translations for all 30 non-English locale JSON files in `src/i18n/` (matching SUPPORTED_LOCALES in locales.ts)
- [x] Update all components to use `t()` from `useAppTranslations()` for all hardcoded UI strings
- [x] `src/utils/supplementalFont.ts` — idempotent loader: injects Google Fonts `<link>` for non-Latin locales (module-level `Set` prevents double-loading); returns the font family name
- [x] `App.tsx` locale sync: three `useEffect` calls — (1) `document.documentElement.dir` from `isRtl`, (2) `document.documentElement.lang` to active locale code, (3) call `loadSupplementalFont(locale)` and set/remove `--mantine-font-family` + `--mantine-font-family-headings` CSS custom properties
- [x] AI translation disclosure — Mantine `Text` (`size="xs"`, `c="dimmed"`) rendered below language picker in header; visible only when `locale !== 'en'`; content: `t('aiTranslation.note')`

### Language picker
- [x] `src/components/LanguagePicker/index.tsx` — Mantine Select; options built from `SUPPORTED_LOCALES` using `LOCALE_NAMES[code]` as label; value is the locale code
- [ ] `src/components/LanguagePicker/LanguagePicker.stories.tsx` — Default, LocaleSelected

## Help and Documentation

- [x] Install `@tabler/icons-react` (`pnpm add @tabler/icons-react`)
- [x] `src/components/HelpModal/index.tsx` — `?` ActionIcon button + Modal with three Tabs:
  - Tab 1 "How to use": step-by-step guide for using the tool
  - Tab 2 "Canvas Permissions": RBAC overview, course vs account scope, permission inheritance, OR groups
  - Tab 3 "Common setups": read-only / gradebook / SIS integration examples
- [ ] `src/components/HelpModal/HelpModal.stories.tsx` — Closed (default), Open
- [x] Add `[?]` HelpModal trigger to the `App.tsx` header (next to LanguagePicker)
- [ ] `PermissionsResult` contextual tooltips:
  - **Course** scope badge tooltip: course-level role explanation
  - **Account** scope badge tooltip: account-level role explanation
  - OR group row info icon: "any one is sufficient" explanation
  - Permission label tooltip listing contributing endpoints (`requiredBy` array)
- [ ] `EndpointPaste` info icon tooltip explaining accepted input formats
- [ ] `LanguagePicker` info icon tooltip explaining locale source and English fallback

## Polish

- [x] Unmatched endpoint reporting in paste input (show which lines could not be matched, using `role="alert"`)
- [x] Responsive layout (works on tablet/mobile)
  - Use `Grid` with `span={{ base: 12, sm: 5/7 }}` for two-panel layout; panels stack on mobile
  - Header: hide `<Title order={1}>` below `sm` (`visibleFrom="sm"`); add `aria-label="Canvas API Permissions Planner"` to `<main>`
  - `EndpointSelector` `ScrollArea`: `h={{ base: 240, sm: 400 }}`
  - `EndpointPaste`: `Stack` layout (textarea above, `fullWidth` button below) at all widths
  - Touch targets: `ActionIcon` info icons use `size="sm"` minimum (never `size="xs"`); verify badge `CloseButton` meets 44×44px on device
  - Wrap `Grid` in `Container` / `maw="100%"` to prevent horizontal overflow at ≥ 375px
- [x] Empty state for permissions panel (no endpoints selected yet)
- [ ] Copy-to-clipboard button for permissions list
- [x] `src/styles/print.css` — `@media print` stylesheet: hide left panel, header controls, footer, action buttons; show permissions result full-width with print-only header (tool name, selected endpoints list, date); force light scheme; `break-inside: avoid` on permission rows; import in `main.tsx`
- [x] Print-only header block in `App.tsx` — `div` with `display: none` default / `display: block` in print; contains tool name, selected endpoint list, and `data-print-date` attribute for current date

## Accessibility Verification

- [ ] Keyboard-only walkthrough: add endpoints, remove one, open help, switch language — no mouse required at any step
- [ ] Screen reader test (VoiceOver on macOS): confirm `aria-live` announces permission list updates; confirm modal open/close is announced and focus is managed correctly
- [ ] Check browser console for `@axe-core/react` violations in dev mode; resolve all WCAG AA failures

## URL Sharing / Deep Linking

- [x] `src/utils/urlState.ts` — `encodeSelection` (indices → base64url bitmask via `Uint8Array` + `btoa`), `decodeSelection` (base64url → indices via `atob`), `readUrlParams` (parse `v`, `s` from query string)
- [x] `src/utils/urlState.test.ts` — round-trip encode/decode, empty selection, single endpoint at index 0 and 299, all selected, confirm output is URL-safe (`[A-Za-z0-9_-]` only), `readUrlParams` returns `null` when `v`/`s` missing
- [x] Update `useEndpoints` return type to include `version` string (needed for URL versioning)
- [x] `App.tsx` — read URL params on load: if `v` matches current version, decode bitmask synchronously in `useState` initialiser; if `v` differs, `useEffect` fetches archived index file, resolves to current endpoints, silently drops missing ones
- [x] `App.tsx` — write URL on state change: `useEffect` encodes current selection via `replaceState`; clears query string when empty
- [x] "Copy link" `ActionIcon` (`IconLink`) in permissions panel header — copies `window.location.href` to clipboard; Mantine notification confirms; only shown when ≥1 endpoint selected
- [ ] Data update workflow: before updating `endpoints.json`, copy it to `public/data/endpoints.{version}.json` to preserve old link resolution
- [x] Add `share.*` translation keys to `src/i18n/en.json` (and all locale files): `copyLink`, `copied`, `staleLink`, `staleLinkMessage`, `endpointsDropped`, `endpointsDroppedMessage`
- [x] Analytics: fire `shared_link_opened` event (with `endpoint_count` and `version_match`) when page loads from a shared URL

## Analytics (Google Analytics 4)

- [ ] Create GA4 property and obtain measurement ID (`G-XXXXXXXXXX`)
- [x] Add GA4 script tag to `index.html` `<head>` with cookieless consent mode (`analytics_storage: 'denied'`)
- [x] `src/utils/analytics.ts` — `trackEvent(name, params?)` wrapper around global `gtag()`; no-op if `gtag` is unavailable (ad blockers, dev without GA)
- [x] Add `gtag` type declaration to `src/vite-env.d.ts`
- [x] Wire custom events into components:
  - `EndpointSelector` → `endpoint_selected` (category only, on add)
  - `EndpointPaste` → `endpoints_pasted` (count + matched)
  - `LanguagePicker` → `locale_changed` (locale code)
  - `HelpModal` → `help_opened`
- [ ] Configure GA4 dashboard: add hostname filter to exclude `localhost` traffic

## Deployment

- [x] Add `<meta http-equiv="Content-Security-Policy">` to `index.html` `<head>` — lock down `script-src`, `style-src`, `font-src`, `connect-src`, `img-src` to known origins (see plan for full directive)
- [ ] Add `public/CNAME` file containing `canvas-permissions.alltheducks.com`
- [ ] Add `public/404.html` SPA redirect (preserves query string for shareable links)
- [ ] Create `.github/workflows/deploy.yml` — build with pnpm, deploy via `actions/deploy-pages@v4` on push to `main`
- [x] Update `index.html` `og:url` / `og:image` / `twitter:image` URLs to use `https://canvas-permissions.alltheducks.com/`
- [ ] Configure DNS: `canvas-permissions.alltheducks.com` CNAME → `alltheducks.github.io`
- [ ] Configure repo Settings → Pages: source "GitHub Actions", custom domain, enforce HTTPS
- [ ] Add `LICENSE` file to repo root (MIT, 2026, All the Ducks)
- [ ] Write `README.md` (project description, how to use, how to run locally, how to contribute, license)
- [ ] Set up GitHub repository and push initial code
