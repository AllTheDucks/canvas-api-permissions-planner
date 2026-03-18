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
3. Run `pnpm run validate-endpoints-json` — this checks schema validity, referential integrity, uniqueness, format, and semantic rules. Fix any errors before proceeding.
4. Run `pnpm run dev` — any remaining Zod schema violations will surface as an error state in the browser.
5. Spot-check 5–10 endpoints across different categories against the source markdown.

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

Mark these as `required: false` entries in the endpoint's `permissions` array, with a `note` **translation key** explaining what the permission unlocks. Both single permissions and OR groups can be `required: false`.

**IMPORTANT: Note values must be translation keys, not English strings.** The `note` field on permission entries and the `notes` field on endpoint objects must use keys from the predefined set listed at the end of this section. The validation script (`pnpm run validate-endpoints-json`) will reject any note value that is not a valid key in `src/i18n/en.json`.

**Categories to look for:**

1. **SIS ID response fields** — `read_sis` or `manage_sis` guarding `sis_user_id`, `sis_course_id`, `sis_section_id`, `sis_account_id` fields on user, enrollment, course, section, and account objects. Mark as:
   ```json
   { "anyOf": ["read_sis", "manage_sis"], "required": false, "note": "notes.perm.requiredToReceiveSisIdFieldsInResponse" }
   ```

2. **SIS URL ID references** — Canvas allows referencing resources by SIS ID in URL path parameters (e.g. `/api/v1/courses/sis_course_id:ABC123/assignments`). The SIS ID lookup requires `read_sis` or `manage_sis`. Add this optional permission to any endpoint that has a SIS-resolvable path parameter:

   **SIS-resolvable named parameters:** `:account_id`, `:course_id`, `:user_id`, `:section_id`, `:term_id`, `:group_id`, `:group_category_id`, `:login_id`

   **Generic `:id`** is SIS-resolvable when the preceding path segment is a known resource type: `accounts`, `courses`, `users`, `sections`, `groups`

   **Not SIS-resolvable:** `:assignment_id`, `:topic_id`, `:module_id`, `:quiz_id`, `:submission_id`, `:folder_id`, and other non-entity parameters. Also skip endpoints with only literal `self` in the path (e.g. `/api/v1/users/self/todo`) since these don't accept alternative ID forms.

   Mark as:
   ```json
   { "anyOf": ["read_sis", "manage_sis"], "required": false, "note": "notes.perm.requiredIfReferencingThisEntityBySisIdInTheUrl" }
   ```
   Add at most one such entry per endpoint, even if the path contains multiple SIS-resolvable parameters. Skip if the endpoint already has a `read_sis` or `manage_sis` entry (to avoid duplicates with categories 1, 3, or 4).

3. **SIS write fields** — mutating endpoints (POST/PUT) where `manage_sis` is needed to write SIS ID fields. Mark as:
   ```json
   { "symbol": "manage_sis", "required": false, "note": "notes.perm.requiredToWriteSisIdFields" }
   ```

4. **`sis_import_id` field** — `manage_sis` specifically for this field on enrollment objects. Mark as:
   ```json
   { "symbol": "manage_sis", "required": false, "note": "notes.perm.requiredToReceiveSisImportIdInResponse" }
   ```

5. **Login ID fields** — `view_user_logins` guarding `login_id` and `sis_login_id` on user objects. Mark as:
   ```json
   { "symbol": "view_user_logins", "required": false, "note": "notes.perm.requiredToReceiveLoginIdSisLoginIdInResponse" }
   ```

6. **Email addresses** — `read_email_addresses` guarding `email` field on user and enrollment objects. Mark as:
   ```json
   { "symbol": "read_email_addresses", "required": false, "note": "notes.perm.requiredToReceiveEmailAddressesInResponse" }
   ```

7. **Grade fields on enrollments** — `view_all_grades` or `manage_grades` guarding grade data for students other than the requesting user. Mark as:
   ```json
   { "anyOf": ["view_all_grades", "manage_grades"], "required": false, "note": "notes.perm.requiredToSeeGradeDataForAllStudents" }
   ```

8. **Unpublished content** — permissions needed to see unpublished items on content listing/show endpoints. Use the appropriate permission(s) for the content type:
   - Unpublished assignments: `{ "anyOf": ["manage_assignments_add", "manage_assignments_edit", "manage_assignments_delete"], "required": false, "note": "notes.perm.requiredToSeeUnpublishedAssignments" }`
   - Unpublished pages: `{ "symbol": "manage_wiki_update", "required": false, "note": "notes.perm.requiredToSeeUnpublishedPages" }`
   - Unpublished modules: appropriate permission with `required: false` and note key
   - Unpublished discussion topics: `{ "anyOf": ["moderate_forum", "manage_course_content_add", "manage_course_content_edit", "manage_course_content_delete"], "required": false, "note": "notes.perm.requiredToSeeUnpublishedDiscussionTopics" }`

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

When a Notes column in the existing documentation explains a mapping, use that. When a model-level symbol has no clear mapping, document what you found in the Notes field using an appropriate translation key from the predefined set.

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
        { "anyOf": ["read_sis", "manage_sis"], "required": false, "note": "notes.perm.requiredToReceiveSisIdFieldsInResponse" }
      ],
      "notes": "notes.endpoint.exampleNoteKey"
    }
    // one entry per API endpoint
  ]
}
```

Rules for the `permissions` array entries:
- Single required permission: `{ "symbol": "symbol_name" }`
- OR group (any one sufficient): `{ "anyOf": ["symbolA", "symbolB"] }` — minimum 2 symbols
- Optional/conditional single permission: `{ "symbol": "xxx", "required": false, "note": "notes.perm.keyName" }`
- Optional/conditional OR group: `{ "anyOf": ["xxx", "yyy"], "required": false, "note": "notes.perm.keyName" }`
- `required: false` means the endpoint works without this permission but returns less data. The `note` translation key explains what it unlocks.
- Multiple separate entries are AND-combined — all required entries must be satisfied
- Strip the leading `:` from all Ruby permission symbols (`:manage_grades` → `manage_grades`)
- **All `note` and `notes` values must be translation keys** from the predefined set (see "Available note translation keys" below). If you need a note that does not exist in the predefined set, **do not invent a key** — instead, list the new notes you need at the end of your output with the proposed key, English text, and rationale, so the maintainer can add them to the translation files.

The `permissions` array on each endpoint must contain only symbols that exist as keys in the top-level `permissions` map.

**No duplicate endpoints.** Each `method + path` combination must appear exactly once in the `endpoints` array. If the same API endpoint appears in multiple controllers or route contexts (e.g. a permissions-check endpoint listed under both "Accounts" and "Roles"), merge them into a single entry. Use the category and notes from the more specific or informative context.

---

---

### Step 5: Validate the output

After producing both files, run the validation script:

```
pnpm run validate-endpoints-json
```

This checks all structural, referential integrity, uniqueness, format, and semantic invariants on `endpoints.json`. It also verifies that all `note` and `notes` values are valid translation keys present in `src/i18n/en.json`. Fix any errors it reports before considering the output complete. Warnings about missing SIS URL reference coverage are expected and can be addressed in a follow-up pass.

---

### Available note translation keys

All `note` (permission-level) and `notes` (endpoint-level) values in `endpoints.json` **must** use one of these predefined translation keys. Do not use raw English strings.

If you encounter a situation that none of these keys adequately describe, **do not invent a new key**. Instead, list the proposed new notes at the end of your output with:
- Proposed key (following the naming convention)
- English text
- Which endpoint(s) need it

The maintainer will add the key to the translation files before the data is committed.

#### Permission-level note keys (`notes.perm.*`)

| Key | English text |
|-----|-------------|
| `notes.perm.accountLevelPermissionToManageCourses` | Account-level permission to manage courses |
| `notes.perm.requiredForEventConclude` | Required for event=conclude |
| `notes.perm.requiredForEventDelete` | Required for event=delete |
| `notes.perm.requiredIfModifyingGradingAttributesWithExistingSubmissions` | Required if modifying grading attributes with existing submissions |
| `notes.perm.requiredIfReferencingThisEntityBySisIdInTheUrl` | Required if referencing this entity by SIS ID in the URL |
| `notes.perm.requiredOnTheDestinationCourse` | Required on the destination course |
| `notes.perm.requiredToChangeSisId` | Required to change SIS ID |
| `notes.perm.requiredToChangeSisIdOnTheGroupCategory` | Required to change SIS ID on the group category |
| `notes.perm.requiredToChangePublishedStateLockPinOrSetAsAnnouncement` | Required to change published state, lock, pin, or set as announcement |
| `notes.perm.requiredToChangeStorageQuotas` | Required to change storage quotas |
| `notes.perm.requiredToCreateNewCollaborations` | Required to create new collaborations |
| `notes.perm.requiredToEnrollNonStudentRoles` | Required to enroll non-student roles |
| `notes.perm.requiredToEnrollStudents` | Required to enroll students |
| `notes.perm.requiredToReceiveSisIdFieldsInResponse` | Required to receive SIS ID fields in response |
| `notes.perm.requiredToReceiveEmailAddressesInResponse` | Required to receive email addresses in response |
| `notes.perm.requiredToReceiveLoginIdSisLoginIdInResponse` | Required to receive login_id / sis_login_id in response |
| `notes.perm.requiredToReceiveSisImportIdInResponse` | Required to receive sis_import_id in response |
| `notes.perm.requiredToRemoveNonStudentRoles` | Required to remove non-student roles |
| `notes.perm.requiredToRemoveStudentEnrollments` | Required to remove student enrollments |
| `notes.perm.requiredToSeeAllStudentsAssignmentData` | Required to see all students' assignment data |
| `notes.perm.requiredToSeeFullAccountDetails` | Required to see full account details |
| `notes.perm.requiredToSeeFullTemplateDetails` | Required to see full template details |
| `notes.perm.requiredToSeeGradeDataForAllStudents` | Required to see grade data for all students |
| `notes.perm.requiredToSeePeerReviewDetailsForAllStudents` | Required to see peer review details for all students |
| `notes.perm.requiredToSeeUnpublishedAssignments` | Required to see unpublished assignments |
| `notes.perm.requiredToSeeUnpublishedDiscussionTopics` | Required to see unpublished discussion topics |
| `notes.perm.requiredToSeeUnpublishedPages` | Required to see unpublished pages |
| `notes.perm.requiredToSendToAllCourseMembersAtOnce` | Required to send to all course members at once |
| `notes.perm.requiredToSetSisId` | Required to set SIS ID |
| `notes.perm.requiredToSetSisIdOnTheGroupCategory` | Required to set SIS ID on the group category |
| `notes.perm.requiredToSetSisCourseId` | Required to set SIS course ID |
| `notes.perm.requiredToSetCourseVisibility` | Required to set course visibility |
| `notes.perm.requiredToSetSisAccountId` | Required to set sis_account_id |
| `notes.perm.requiredToSetStorageQuotas` | Required to set storage quotas |
| `notes.perm.requiredToSetTopicAsAnnouncementOrPinIt` | Required to set topic as announcement or pin it |
| `notes.perm.requiredToUpdateSisCourseId` | Required to update SIS course ID |
| `notes.perm.requiredToUpdateSisLoginId` | Required to update SIS login ID |
| `notes.perm.requiredToUpdateNameEmailOrLoginDetailsForOtherUsers` | Required to update name, email, or login details for other users |
| `notes.perm.requiredToUpdateSettingsForOtherUsers` | Required to update settings for other users |
| `notes.perm.requiredToUploadFilesOnBehalfOfAnotherStudent` | Required to upload files on behalf of another student |
| `notes.perm.requiredToViewProgressForOtherUsers` | Required to view progress for other users |
| `notes.perm.requiredToWriteSisIdFields` | Required to write SIS ID fields |

#### Endpoint-level note keys (`notes.endpoint.*`)

| Key | English text |
|-----|-------------|
| `notes.endpoint.acceptAnEnrollmentInvitationOnlyTheInvitedUserCanAccept` | Accept an enrollment invitation. Only the invited user can accept. |
| `notes.endpoint.adminDeletionOfAGlobalAnnouncement` | Admin deletion of a global announcement. |
| `notes.endpoint.alsoRequiresUserToHaveAStudentEnrollmentAndAccountSelfRegistrationToBeEnabled` | Also requires user to have a student enrollment and account self-registration to be enabled. |
| `notes.endpoint.batchCreateOverrides` | Batch create overrides. |
| `notes.endpoint.batchRetrieveOverridesForMultipleAssignments` | Batch retrieve overrides for multiple assignments. |
| `notes.endpoint.batchUpdateCoursesInAnAccount` | Batch update courses in an account. |
| `notes.endpoint.batchUpdateOverrides` | Batch update overrides. |
| `notes.endpoint.bulkEnrollmentAtTheAccountLevel` | Bulk enrollment at the account level. |
| `notes.endpoint.bulkGradeUpdate` | Bulk grade update. |
| `notes.endpoint.bulkUpdateAccountCalendarVisibility` | Bulk update account calendar visibility. |
| `notes.endpoint.courseTeachersAdminsCanUpdateTheirOwnCourses` | Course teachers/admins can update their own courses. |
| `notes.endpoint.createsAGradebookFilterForTheCurrentUser` | Creates a gradebook filter for the current user. |
| `notes.endpoint.deleteASubmissionComment` | Delete a submission comment. |
| `notes.endpoint.gradesASubmissionOrAddsAComment` | Grades a submission or adds a comment. |
| `notes.endpoint.hidesAStreamItemFromTheCurrentUsersActivityStream` | Hides a stream item from the current user's activity stream. |
| `notes.endpoint.hidesAllStreamItemsFromTheCurrentUsersActivityStream` | Hides all stream items from the current user's activity stream. |
| `notes.endpoint.initiatesAFileUploadForTheUsersPersonalFiles` | Initiates a file upload for the user's personal files. |
| `notes.endpoint.initiatesAFileUploadToTheGroup` | Initiates a file upload to the group. |
| `notes.endpoint.listsAccessTokensForAUser` | Lists access tokens for a user. |
| `notes.endpoint.listsAccountCalendarsVisibleToTheCurrentUser` | Lists account calendars visible to the current user. |
| `notes.endpoint.listsEnrollmentsForAUserUsersCanListTheirOwnEnrollments` | Lists enrollments for a user. Users can list their own enrollments. |
| `notes.endpoint.listsFilesInAFolderRequiresReadAccessOnTheFolder` | Lists files in a folder. Requires read access on the folder. |
| `notes.endpoint.listsFilesInTheUsersPersonalFilesArea` | Lists files in the user's personal files area. |
| `notes.endpoint.listsGroupsTheCurrentUserBelongsTo` | Lists groups the current user belongs to. |
| `notes.endpoint.listsSubfoldersRequiresReadAccessOnTheFolder` | Lists subfolders. Requires read access on the folder. |
| `notes.endpoint.mergesOneUserAccountIntoAnotherRequiresSiteAdmin` | Merges one user account into another. Requires site admin. |
| `notes.endpoint.queryGradeChangeAuditLogsWithFilters` | Query grade change audit logs with filters. |
| `notes.endpoint.rejectAnEnrollmentInvitationOnlyTheInvitedUserCanReject` | Reject an enrollment invitation. Only the invited user can reject. |
| `notes.endpoint.requiresAbilityToViewTheUserAdminsCanViewAnyUserInTheirAccount` | Requires ability to view the user. Admins can view any user in their account. |
| `notes.endpoint.requiresRatingToBeEnabledOnTheTopic` | Requires rating to be enabled on the topic. |
| `notes.endpoint.requiresTheAccountSettingAdminsCanViewNotificationsToBeEnabled` | Requires the account setting 'admins_can_view_notifications' to be enabled. |
| `notes.endpoint.reserveATimeSlotInAnAppointmentGroup` | Reserve a time slot in an appointment group. |
| `notes.endpoint.returnsASummaryOfTheCurrentUsersActivityStream` | Returns a summary of the current user's activity stream. |
| `notes.endpoint.returnsATemporaryPublicDownloadUrlRequiresDownloadAccessOnTheFile` | Returns a temporary public download URL. Requires download access on the file. |
| `notes.endpoint.returnsAccountsTheCurrentUserHasAccessToNoSpecificPermissionRequiredBeyondAuthentication` | Returns accounts the current user has access to. No specific permission required beyond authentication. |
| `notes.endpoint.returnsAccountsTheUserCanCreateCoursesIn` | Returns accounts the user can create courses in. |
| `notes.endpoint.returnsCalendarEventsForTheCurrentUsersVisibleContexts` | Returns calendar events for the current user's visible contexts. |
| `notes.endpoint.returnsCourseDetailsEnrolledUsersAndAdminsCanView` | Returns course details. Enrolled users and admins can view. |
| `notes.endpoint.returnsCoursesForTheSpecifiedUserTheCurrentUserCanListTheirOwnCourses` | Returns courses for the specified user. The current user can list their own courses. |
| `notes.endpoint.returnsCoursesTheCurrentUserIsEnrolledInOrHasAccessTo` | Returns courses the current user is enrolled in or has access to. |
| `notes.endpoint.returnsCustomColorsForTheUserUsersCanViewTheirOwn` | Returns custom colors for the user. Users can view their own. |
| `notes.endpoint.returnsDashboardCardsForTheCurrentUser` | Returns dashboard cards for the current user. |
| `notes.endpoint.returnsEnrollmentTermsAccessibleToUsersWithAnyAccountRole` | Returns enrollment terms. Accessible to users with any account role. |
| `notes.endpoint.returnsFileDetailsRequiresReadAccessOnTheFilesContext` | Returns file details. Requires read access on the file's context. |
| `notes.endpoint.returnsFolderDetailsRequiresReadAccessOnTheFoldersContext` | Returns folder details. Requires read access on the folder's context. |
| `notes.endpoint.returnsGlobalAnnouncementsForTheCurrentUser` | Returns global announcements for the current user. |
| `notes.endpoint.returnsMissingSubmissionsForAStudent` | Returns missing submissions for a student. |
| `notes.endpoint.returnsPermissionFlagsForTheCurrentUserInThisAccount` | Returns permission flags for the current user in this account. |
| `notes.endpoint.returnsPermissionFlagsForTheCurrentUserInThisCourse` | Returns permission flags for the current user in this course. |
| `notes.endpoint.returnsTheCountOfTheCurrentUsersTodoItems` | Returns the count of the current user's TODO items. |
| `notes.endpoint.returnsTheCurrentUsersActivityStream` | Returns the current user's activity stream. |
| `notes.endpoint.returnsTheCurrentUsersOwnGradebookFilters` | Returns the current user's own gradebook filters. |
| `notes.endpoint.returnsTheCurrentUsersTodoItems` | Returns the current user's TODO items. |
| `notes.endpoint.returnsTheCurrentUsersUpcomingEvents` | Returns the current user's upcoming events. |
| `notes.endpoint.returnsUserProfileData` | Returns user profile data. |
| `notes.endpoint.returnsUserSettingsUsersCanViewTheirOwnSettings` | Returns user settings. Users can view their own settings. |
| `notes.endpoint.revertsAPageToAPreviousRevision` | Reverts a page to a previous revision. |
| `notes.endpoint.setsACustomColorForAContextUsersCanSetTheirOwn` | Sets a custom color for a context. Users can set their own. |
| `notes.endpoint.splitsAPreviouslyMergedUserRequiresSiteAdmin` | Splits a previously merged user. Requires site admin. |
| `notes.endpoint.studentsCanAlsoViewTheirOwnSubmissionsWithoutThesePermissions` | Students can also view their own submissions without these permissions. |
| `notes.endpoint.studentsSelectAMasteryPathOption` | Students select a mastery path option. |
| `notes.endpoint.studentsSubmitTheirOwnWorkNoSpecificRolePermissionRequired` | Students submit their own work. No specific role permission required. |
| `notes.endpoint.theEventParameterDeterminesWhichPermissionIsCheckedDeleteOrConclude` | The event parameter determines which permission is checked: 'delete' or 'conclude'. |
| `notes.endpoint.theSpecificPermissionDependsOnTheEnrollmentTypeBeingCreated` | The specific permission depends on the enrollment type being created. |
| `notes.endpoint.theSpecificPermissionDependsOnTheEnrollmentTypeBeingRemoved` | The specific permission depends on the enrollment type being removed. |
| `notes.endpoint.topicAuthorCanEditTheirOwnTopicContent` | Topic author can edit their own topic content. |
| `notes.endpoint.updateASubmissionComment` | Update a submission comment. |
| `notes.endpoint.uploadAFileToAttachToASubmissionComment` | Upload a file to attach to a submission comment. |
| `notes.endpoint.usersCanViewTheirOwnConversations` | Users can view their own conversations. |
| `notes.endpoint.usersCanViewTheirOwnSubmissionsInstructorsCanViewAnyStudentsSubmission` | Users can view their own submissions. Instructors can view any student's submission. |

---

Produce both files in full. If the task is too large for one response, work through the endpoint categories in order and I will ask you to continue with the next batch.
