import { describe, it, expect } from "vitest";
import { canvasLocaleSchema, getTranslation } from "./canvasLocale";

describe("canvasLocaleSchema", () => {
  it("accepts valid locale data with expected outer key", () => {
    const data = { es: { grades_edit_773dfc24: "Calificaciones: editar" } };
    const result = canvasLocaleSchema("es").safeParse(data);
    expect(result.success).toBe(true);
  });

  it("rejects when outer key does not match requested locale", () => {
    const data = { fr: { some_key: "valeur" } };
    const result = canvasLocaleSchema("es").safeParse(data);
    expect(result.success).toBe(false);
  });

  it("accepts locale data with mixed value types (strings, objects, numbers)", () => {
    const data = {
      ja: {
        flat_key: "翻訳",
        nested_key: { child: "value" },
        numeric_key: 42,
      },
    };
    const result = canvasLocaleSchema("ja").safeParse(data);
    expect(result.success).toBe(true);
  });

  it("rejects non-object input", () => {
    expect(canvasLocaleSchema("en").safeParse("string").success).toBe(false);
    expect(canvasLocaleSchema("en").safeParse(null).success).toBe(false);
    expect(canvasLocaleSchema("en").safeParse(42).success).toBe(false);
  });
});

describe("getTranslation", () => {
  const parsed = {
    es: {
      grades_edit_773dfc24: "Calificaciones: editar",
      nested_value: { child: "not a string" },
      numeric_value: 42,
    },
  };

  it("returns the string value for a valid key", () => {
    expect(getTranslation(parsed, "es", "grades_edit_773dfc24")).toBe(
      "Calificaciones: editar",
    );
  });

  it("returns undefined for a missing key", () => {
    expect(getTranslation(parsed, "es", "nonexistent_key")).toBeUndefined();
  });

  it("returns undefined for a non-string value (nested object)", () => {
    expect(getTranslation(parsed, "es", "nested_value")).toBeUndefined();
  });

  it("returns undefined for a non-string value (number)", () => {
    expect(getTranslation(parsed, "es", "numeric_value")).toBeUndefined();
  });

  it("returns undefined for a missing locale code", () => {
    expect(getTranslation(parsed, "fr", "grades_edit_773dfc24")).toBeUndefined();
  });
});
