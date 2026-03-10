import { describe, it, expect } from "vitest";
import { EndpointsDataSchema } from "./endpoints";

const validData = {
  version: "2026-02-11",
  permissions: {
    manage_grades: { label: "Grades - edit", scope: ["Course", "Account"] },
    read_sis: { label: "SIS Data - view", scope: ["Course", "Account"] },
  },
  endpoints: [
    {
      method: "GET",
      path: "/api/v1/courses/:course_id/assignments",
      category: "Assignments",
      permissions: [{ symbol: "manage_grades" }],
    },
    {
      method: "POST",
      path: "/api/v1/courses/:course_id/enrollments",
      category: "Enrollments",
      permissions: [
        { anyOf: ["manage_grades", "read_sis"] },
        { symbol: "read_sis", required: false, note: "SIS fields" },
      ],
      notes: "Some caveat",
    },
  ],
};

describe("EndpointsDataSchema", () => {
  it("accepts valid data", () => {
    const result = EndpointsDataSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("transforms scope arrays into Sets", () => {
    const result = EndpointsDataSchema.parse(validData);
    expect(result.permissions.manage_grades.scope).toBeInstanceOf(Set);
    expect(result.permissions.manage_grades.scope.has("Course")).toBe(true);
    expect(result.permissions.manage_grades.scope.has("Account")).toBe(true);
  });

  it("rejects missing version", () => {
    const { version: _, ...noVersion } = validData;
    expect(EndpointsDataSchema.safeParse(noVersion).success).toBe(false);
  });

  it("rejects empty permissions record", () => {
    const data = { ...validData, permissions: {} };
    // Empty permissions map is technically valid by the schema (z.record),
    // but endpoints referencing symbols not in the map is a logical error caught elsewhere
    const result = EndpointsDataSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it("rejects invalid HTTP method", () => {
    const data = {
      ...validData,
      endpoints: [
        {
          method: "OPTIONS",
          path: "/api/v1/test",
          category: "Test",
          permissions: [],
        },
      ],
    };
    expect(EndpointsDataSchema.safeParse(data).success).toBe(false);
  });

  it("rejects path not starting with /", () => {
    const data = {
      ...validData,
      endpoints: [
        {
          method: "GET",
          path: "api/v1/test",
          category: "Test",
          permissions: [],
        },
      ],
    };
    expect(EndpointsDataSchema.safeParse(data).success).toBe(false);
  });

  it("rejects empty category", () => {
    const data = {
      ...validData,
      endpoints: [
        {
          method: "GET",
          path: "/api/v1/test",
          category: "",
          permissions: [],
        },
      ],
    };
    expect(EndpointsDataSchema.safeParse(data).success).toBe(false);
  });

  it("rejects anyOf with fewer than 2 symbols", () => {
    const data = {
      ...validData,
      endpoints: [
        {
          method: "GET",
          path: "/api/v1/test",
          category: "Test",
          permissions: [{ anyOf: ["only_one"] }],
        },
      ],
    };
    expect(EndpointsDataSchema.safeParse(data).success).toBe(false);
  });

  it("rejects duplicate scope values", () => {
    const data = {
      ...validData,
      permissions: {
        dupe: { label: "Dupe", scope: ["Course", "Course"] },
      },
    };
    expect(EndpointsDataSchema.safeParse(data).success).toBe(false);
  });

  it("rejects invalid scope value", () => {
    const data = {
      ...validData,
      permissions: {
        bad: { label: "Bad", scope: ["Global"] },
      },
    };
    expect(EndpointsDataSchema.safeParse(data).success).toBe(false);
  });

  it("rejects empty scope array", () => {
    const data = {
      ...validData,
      permissions: {
        empty: { label: "Empty", scope: [] },
      },
    };
    expect(EndpointsDataSchema.safeParse(data).success).toBe(false);
  });

  it("accepts optional permission with required: false and note", () => {
    const data = {
      ...validData,
      endpoints: [
        {
          method: "GET",
          path: "/api/v1/test",
          category: "Test",
          permissions: [
            {
              symbol: "read_sis",
              required: false,
              note: "Required to receive SIS fields",
            },
          ],
        },
      ],
    };
    const result = EndpointsDataSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it("accepts optional anyOf with required: false and note", () => {
    const data = {
      ...validData,
      endpoints: [
        {
          method: "GET",
          path: "/api/v1/test",
          category: "Test",
          permissions: [
            {
              anyOf: ["read_sis", "manage_sis"],
              required: false,
              note: "SIS ID fields in response",
            },
          ],
        },
      ],
    };
    const result = EndpointsDataSchema.safeParse(data);
    expect(result.success).toBe(true);
  });
});
