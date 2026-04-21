import { describe, expect, it } from "vitest";

import { isStudentProfileComplete } from "./student-profile.js";

describe("isStudentProfileComplete", () => {
  const base = () =>
    isStudentProfileComplete("A Student", "5551234567", "123456789012", 42, "1/a.pdf", "1/r.pdf");

  it("returns true when all fields and both PDF paths are set", () => {
    expect(base()).toBe(true);
  });

  it("returns false when Aadhaar PDF path is missing", () => {
    expect(
      isStudentProfileComplete("A", "5551234567", "123456789012", 42, null, "1/r.pdf"),
    ).toBe(false);
  });

  it("returns false when rank PDF path is missing", () => {
    expect(
      isStudentProfileComplete("A", "5551234567", "123456789012", 42, "1/a.pdf", null),
    ).toBe(false);
  });

  it("returns false when PDF paths are blank", () => {
    expect(
      isStudentProfileComplete("A", "5551234567", "123456789012", 42, "  ", "1/r.pdf"),
    ).toBe(false);
  });
});
