import { describe, it, expect } from "vitest";
import { i18nKey } from "./i18nKey";

describe("i18nKey", () => {
  it("produces the verified Canvas key for 'Grades - edit'", () => {
    expect(i18nKey("Grades - edit")).toBe("grades_edit_773dfc24");
  });

  it("handles labels with multiple special characters", () => {
    const key = i18nKey("SIS Data - manage & export!!");
    expect(key).toMatch(/^sis_data_manage_export_[0-9a-f]+$/);
  });

  it("handles labels with leading/trailing spaces", () => {
    const key = i18nKey("  Grades - edit  ");
    // Leading/trailing underscores are stripped
    expect(key).toMatch(/^grades_edit_[0-9a-f]+$/);
    // But the CRC32 hash differs because the input string differs
    expect(key).not.toBe("grades_edit_773dfc24");
  });

  it("handles an all-numeric label", () => {
    const key = i18nKey("12345");
    expect(key).toMatch(/^12345_[0-9a-f]+$/);
  });

  it("handles a single character label", () => {
    const key = i18nKey("A");
    expect(key).toMatch(/^a_[0-9a-f]+$/);
  });

  it("collapses multiple consecutive special characters into one underscore", () => {
    const key = i18nKey("Users---manage///edit");
    expect(key).toMatch(/^users_manage_edit_[0-9a-f]+$/);
  });

  it("produces distinct keys for different labels", () => {
    expect(i18nKey("Grades - edit")).not.toBe(i18nKey("Grades - view"));
  });
});
