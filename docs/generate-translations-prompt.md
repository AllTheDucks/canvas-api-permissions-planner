# Generating App UI Translations

This document contains the prompt to give Claude when `src/i18n/en.json` has been created or updated and the non-English locale files need to be generated or regenerated.

## When to regenerate

- `en.json` has been created for the first time (generate all locale files)
- Keys have been added, removed, or changed in `en.json`
- A translation error is found and needs correcting across all locales

## How to use this prompt

1. Make sure `src/i18n/en.json` is finalised with all current keys.
2. Paste the prompt below into a new Claude conversation.
3. Attach `src/i18n/en.json` to the message (or paste its contents where indicated).
4. Claude will produce all 34 non-English locale JSON files in a single response.
5. Place each output file at `src/i18n/{locale}.json`.
6. Spot-check a few locales you can read to verify quality.

If regenerating after an `en.json` update, you can optionally attach the previous version of a locale file so Claude can preserve any manual corrections. This is optional — a full regeneration from English is the default.

---

## The Prompt

Copy everything below this line and paste it to Claude, attaching `en.json`.

---

I need you to translate a JSON file of UI strings for a web application into 34 languages. The application is called "Canvas API Permissions Planner" — a developer tool for Canvas LMS.

## Source file

The attached `en.json` is the English source of truth. Every key in this file must appear in every output file. Do not add, remove, or rename any keys.

## Target locales

Produce one JSON file for each of the following locale codes:

```
ar, cs, cy, da, de, el, es, es-ES, fa, fi, fr,
he, hr, hu, hy, ja, ko, mi, nb, nl, pl, pt, pt-BR,
ro, ru, sk, sl, sv, th, tr, uk, vi, zh-Hans, zh-Hant
```

That is 34 files total. Name each file `{locale}.json` (e.g. `ar.json`, `zh-Hans.json`).

## Translation rules

1. **Translate every value.** The output JSON must have the same keys as `en.json`, with values translated into the target language.

2. **Preserve interpolation placeholders exactly.** Strings may contain `{{variable}}` placeholders (e.g. `"Canvas data: {{version}}"`). Keep placeholder names unchanged and in the correct position for natural word order in the target language.

3. **Technical terms — do not translate:**
   - "Canvas" (the LMS product name)
   - "Canvas LMS"
   - "API"
   - "SIS" (Student Information System)
   - "REST"
   - Permission symbol names that appear as code (e.g. `read_roster`, `manage_grades`) — these are technical identifiers
   - "RBAC" (Role-Based Access Control)
   - URL patterns like `/api/v1/courses/:id`

4. **Translate descriptive names:**
   - The app title `"Canvas API Permissions Planner"` should be translated — it is descriptive, not a trademark. Keep "Canvas" and "API" untranslated within the translated title.
   - Role names like "Course" and "Account" (as Canvas role scopes) should be translated.

5. **Regional variants:**
   - `es` = Latin American Spanish, `es-ES` = Peninsular Spanish — use appropriate regional vocabulary and conventions for each.
   - `pt` = European Portuguese, `pt-BR` = Brazilian Portuguese — use appropriate regional vocabulary and conventions for each.
   - `zh-Hans` = Simplified Chinese, `zh-Hant` = Traditional Chinese.

6. **RTL locales** (`ar`, `fa`, `he`): Translate the text content only. The application handles text direction automatically — do not add directional markers or modify string structure for RTL.

7. **Tone:** Professional but approachable. This is a developer tool — translations should be clear and precise, not marketing-style. Match the register of the English source.

8. **Less common languages:** `cy` (Welsh) and `mi` (Te Reo Māori) — do your best with these. Accuracy is more important than fluency; if uncertain about a technical term, keep the English term.

## Output format

Output each file as a fenced code block with the filename as the label:

````
```json ar.json
{
  "key": "translated value",
  ...
}
```
````

Output all 34 files. Maintain the same key order as `en.json` in every output file.
