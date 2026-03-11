# Regenerating Canvas Permission Data

This document contains the prompt to give Claude when the Canvas LMS releases new API endpoints or changes permission requirements and `endpoints.json` needs to be updated.

## When to regenerate

- A new Canvas release adds API endpoints not covered by the current data
- A Canvas release changes permission requirements for existing endpoints
- The `canvas_api_permissions.md` is found to have errors

## How to use this prompt

Paste the prompt below into a new Claude conversation. Claude will read the Canvas LMS source code on GitHub and produce updated versions of both output files. Work through the endpoint categories in batches if needed — the Canvas codebase is large and it may be practical to regenerate a few categories at a time rather than all 43 in one session.

After Claude produces the output:
1. Replace `canvas_api_permissions.md` and `public/data/endpoints.json` with the new versions.
2. The `**Last updated:**` date in `canvas_api_permissions.md` and `"version"` in `endpoints.json` should already be set by Claude — verify they match the stable branch date from Step 0.
3. Run `pnpm run dev` — any Zod schema violations will surface as an error state in the browser.
4. Spot-check 5–10 endpoints across different categories against the source markdown.

---

## The Prompt

Copy everything below this line and paste it to Claude.

---

I need you to analyse the Canvas LMS source code on GitHub and produce two output files that map Canvas REST API endpoints to the role permissions required to call them.

The two output files are:
1. `canvas_api_permissions.md` — a human-readable reference document
2. `public/data/endpoints.json` — a structured JSON file consumed by a React tool

Work through the source files in the order listed below.

---

### Step 0: Determine the Canvas stable release version

Check the `prod` branch HEAD commit to find the stable release date:
https://api.github.com/repos/instructure/canvas-lms/branches/prod

The commit message will contain a reference like `stable/2026-02-11`. Extract the date portion (e.g. `2026-02-11`) — this is the version identifier for both output files.

---

### Step 1: Read the permission registry

Read the Canvas permission definitions:
https://raw.githubusercontent.com/instructure/canvas-lms/prod/config/initializers/permissions_registry.rb

From this file extract every permission symbol and its UI label. The label is the string passed to `I18n.t(...)` inline in the Ruby.

Build a complete permissions reference table from this.

---

### Step 2: Read the routes

Read the API route definitions:
https://raw.githubusercontent.com/instructure/canvas-lms/prod/config/routes.rb

Focus on the `api_routes` block. For each route, note the HTTP method, URL path, and the controller#action it maps to. This gives you the full list of API endpoints and which controller files to read.

---

### Step 3: Read each API controller

For each controller identified in the routes, read it from:
`https://raw.githubusercontent.com/instructure/canvas-lms/prod/app/controllers/{controller_name}.rb`

Key controllers to prioritise (these cover the majority of the ~300 API endpoints):
- `assignments_api_controller.rb`
- `assignment_groups_api_controller.rb`
- `assignment_overrides_controller.rb`
- `submissions_api_controller.rb`
- `submission_comments_api_controller.rb`
- `peer_reviews_api_controller.rb`
- `courses_controller.rb` (also `courses_api_controller.rb` if present)
- `sections_api_controller.rb`
- `enrollments_api_controller.rb`
- `temporary_enrollment_pairings_api_controller.rb`
- `users_controller.rb` (and `profile_controller.rb`)
- `groups_api_controller.rb`
- `discussion_topics_api_controller.rb`
- `wiki_pages_api_controller.rb`
- `files_controller.rb` (and `folders_controller.rb`)
- `context_modules_api_controller.rb`
- `module_items_api_controller.rb`
- `calendar_events_api_controller.rb`
- `announcements_api_controller.rb`
- `rubrics_api_controller.rb`
- `grading_standards_api_controller.rb`
- `gradebook_filters_api_controller.rb`
- `gradebook_history_api_controller.rb`
- `learning_mastery_gradebook_controller.rb`
- `outcome_results_controller.rb` (and `outcomes_api_controller.rb`)
- `outcome_groups_api_controller.rb`
- `outcome_imports_api_controller.rb`
- `proficiency_ratings_api_controller.rb`
- `account_calendars_api_controller.rb`
- `sis_imports_api_controller.rb`
- `sis_import_errors_api_controller.rb`
- `terms_api_controller.rb`
- `content_exports_api_controller.rb`
- `grade_change_audit_api_controller.rb`
- `course_audit_api_controller.rb`
- `authentication_audit_api_controller.rb`
- `observer_pairing_codes_controller.rb`
- `observer_alert_api_controller.rb`
- `eportfolio_api_controller.rb`
- `api_scopes_controller.rb`
- `account_notifications_controller.rb`
- `comm_messages_api_controller.rb`
- `what_if_grades_controller.rb` (if present)

In each controller, look for permission checks in:
- `before_action` / `before_filter` blocks
- `authorized_action(object, user, :permission)` calls
- `grants_any_right?(user, :perm1, :perm2)` calls
- `grants_right?(user, session, :permission)` calls
- `require_context_with_permission(context, :permission)` calls

For each action, identify:
1. Which permission(s) are checked
2. Whether "any one" (OR) or "all" (AND) are required
3. Any conditional permission checks (e.g. extra permissions for SIS fields in responses)

---

### Step 4: Identify conditional fields requiring extra permissions

Look for permission checks that guard the **inclusion of optional fields or records** in API responses — checks where the endpoint still succeeds without the permission, but the response includes less data. These typically appear as `grants_right?` calls guarding individual field inclusions in serializers or controller response code.

Mark these as `required: false` entries in the endpoint's `permissions` array, with a `note` explaining what the permission unlocks. Both single permissions and OR groups can be `required: false`.

**Categories to look for:**

1. **SIS ID response fields** — `read_sis` or `manage_sis` guarding `sis_user_id`, `sis_course_id`, `sis_section_id`, `sis_account_id` fields on user, enrollment, course, section, and account objects. Mark as:
   ```json
   { "anyOf": ["read_sis", "manage_sis"], "required": false, "note": "Required to receive SIS ID fields in response" }
   ```

2. **SIS URL ID references** — endpoints with entity ID path parameters (`:course_id`, `:user_id`, `:section_id`, `:account_id`) that accept SIS ID syntax (e.g. `sis_course_id:ABC123`). The SIS ID lookup itself requires `read_sis` or `manage_sis`. Mark as:
   ```json
   { "anyOf": ["read_sis", "manage_sis"], "required": false, "note": "Required if referencing this entity by SIS ID in the URL" }
   ```

3. **SIS write fields** — mutating endpoints (POST/PUT) where `manage_sis` is needed to write SIS ID fields. Mark as:
   ```json
   { "symbol": "manage_sis", "required": false, "note": "Required to write SIS ID fields" }
   ```

4. **`sis_import_id` field** — `manage_sis` specifically for this field on enrollment objects. Mark as:
   ```json
   { "symbol": "manage_sis", "required": false, "note": "Required to receive sis_import_id in response" }
   ```

5. **Login ID fields** — `view_user_logins` guarding `login_id` and `sis_login_id` on user objects. Mark as:
   ```json
   { "symbol": "view_user_logins", "required": false, "note": "Required to receive login_id / sis_login_id in response" }
   ```

6. **Email addresses** — `read_email_addresses` guarding `email` field on user and enrollment objects. Mark as:
   ```json
   { "symbol": "read_email_addresses", "required": false, "note": "Required to receive email addresses in response" }
   ```

7. **Grade fields on enrollments** — `view_all_grades` or `manage_grades` guarding grade data for students other than the requesting user. Mark as:
   ```json
   { "anyOf": ["view_all_grades", "manage_grades"], "required": false, "note": "Required to see grade data for all students" }
   ```

8. **Unpublished content** — permissions needed to see unpublished items on content listing/show endpoints. Use the appropriate permission(s) for the content type:
   - Unpublished assignments: `{ "anyOf": ["manage_assignments_add", "manage_assignments_edit", "manage_assignments_delete"], "required": false, "note": "Required to see unpublished assignments" }`
   - Unpublished pages: `{ "symbol": "manage_wiki_update", "required": false, "note": "Required to see unpublished pages" }`
   - Unpublished modules: appropriate permission with `required: false` and note
   - Unpublished discussion topics: `{ "anyOf": ["moderate_forum", "manage_course_content_add", "manage_course_content_edit", "manage_course_content_delete"], "required": false, "note": "Required to see unpublished discussion topics" }`

---

### Conversion rules for permission symbols

Canvas controllers use model-level and policy-level permission symbols that resolve to concrete role permissions. Apply these translations:

| Controller symbol | Concrete permission |
|---|---|
| `:read` (course content context) | `read_course_content` |
| `:create` (assignment context) | `manage_assignments_add` |
| `:update` (assignment context) | `manage_assignments_edit` |
| `:delete` (assignment context) | `manage_assignments_delete` |
| `:grade` | `manage_grades` |
| `:read_as_admin` | context-dependent — document in Notes |
| `GRANULAR_MANAGE_ASSIGNMENT_PERMISSIONS` | anyOf: `manage_assignments_add`, `manage_assignments_edit`, `manage_assignments_delete` |
| `GRANULAR_MANAGE_COURSE_CONTENT_PERMISSIONS` | anyOf: `manage_course_content_add`, `manage_course_content_edit`, `manage_course_content_delete` |

When a Notes column in the existing documentation explains a mapping, use that. When a model-level symbol has no clear mapping, document what you found in the Notes field.

---

### Output 1: `canvas_api_permissions.md`

Produce a markdown file with this structure:

```
# Canvas REST API — Permission Requirements Reference

[brief description]

**Source:** Derived from static analysis of `app/controllers/*_api_controller.rb`,
`courses_controller.rb`, `config/routes.rb`, and
`config/initializers/permissions_registry.rb` in the Canvas LMS codebase.

**Last updated:** [stable branch date from Step 0]

---

## Permission Reference Table

| Permission Symbol | Canvas UI Label |
|---|---|
[one row per permission]

---

## API Endpoint Mappings

### [Category name]

**Controller:** [controller_name]

| Endpoint | Permission Symbol(s) | UI Permission Name | Notes |
|---|---|---|---|
[one row per endpoint]

---
[repeat for each category]
```

For the Permission Symbol(s) column:
- Single permission: `:symbol_name`
- OR group (any one sufficient): `:symbolA` / `:symbolB`
- AND combination (all required): list on separate rows or note "all required"

---

### Output 2: `public/data/endpoints.json`

Produce a JSON file with this exact structure:

```jsonc
{
  "version": "[stable branch date from Step 0, e.g. 2026-02-11]",
  "permissions": {
    "[symbol]": {
      "label": "[Canvas UI label — the I18n.t() string from permissions_registry.rb]"
    }
    // one entry per permission symbol
  },
  "endpoints": [
    {
      "method": "GET",              // GET | POST | PUT | DELETE | PATCH
      "path": "/api/v1/...",        // canonical path with :param placeholders
      "category": "Assignments",    // exact ### section heading from canvas_api_permissions.md
      "permissions": [
        { "symbol": "read_course_content" },
        { "anyOf": ["manage_grades", "view_all_grades"] },
        { "anyOf": ["read_sis", "manage_sis"], "required": false, "note": "Required to receive SIS ID fields in response" }
      ],
      "notes": "Optional user-facing caveat about this endpoint."
    }
    // one entry per API endpoint
  ]
}
```

Rules for the `permissions` array entries:
- Single required permission: `{ "symbol": "symbol_name" }`
- OR group (any one sufficient): `{ "anyOf": ["symbolA", "symbolB"] }` — minimum 2 symbols
- Optional/conditional single permission: `{ "symbol": "xxx", "required": false, "note": "..." }`
- Optional/conditional OR group: `{ "anyOf": ["xxx", "yyy"], "required": false, "note": "..." }`
- `required: false` means the endpoint works without this permission but returns less data. The `note` explains what it unlocks.
- Multiple separate entries are AND-combined — all required entries must be satisfied
- Strip the leading `:` from all Ruby permission symbols (`:manage_grades` → `manage_grades`)

The `permissions` array on each endpoint must contain only symbols that exist as keys in the top-level `permissions` map.

**No duplicate endpoints.** Each `method + path` combination must appear exactly once in the `endpoints` array. If the same API endpoint appears in multiple controllers or route contexts (e.g. a permissions-check endpoint listed under both "Accounts" and "Roles"), merge them into a single entry. Use the category and notes from the more specific or informative context.

---

Produce both files in full. If the task is too large for one response, work through the endpoint categories in order and I will ask you to continue with the next batch.
