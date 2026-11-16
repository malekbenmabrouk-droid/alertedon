import { describe, expect, it } from "vitest";
import { alerteRecente, distanceKm, estCompatible, estEligible, groupesCompatibles, prochaineEligibilite } from "./rules";

describe("targeting rules (mirror of app/domain/regles.py)", () => {
  it("lists donor groups compatible with A+", () => {
    expect(groupesCompatibles("A+")).toEqual(["O-", "O+", "A-", "A+"]);
  });

  it("treats O- as the universal donor", () => {
    for (const g of ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"] as const) expect(estCompatible("O-", g)).toBe(true);
    expect(estCompatible("AB+", "O-")).toBe(false);
  });

  it("measures Tunis–Sfax at about 235 km", () => {
    const d = distanceKm(36.8065, 10.1815, 34.7406, 10.7603);
    expect(d).toBeGreaterThan(220);
    expect(d).toBeLessThan(250);
  });

  it("applies the 56-day rule on its boundary", () => {
    expect(estEligible("2026-09-22", "2026-11-17")).toBe(true);
    expect(estEligible("2026-09-23", "2026-11-17")).toBe(false);
    expect(estEligible(null, "2026-11-17")).toBe(true);
    expect(prochaineEligibilite("2026-11-01", "2026-11-17")).toBe("2026-12-27");
  });

  it("detects a solicitation within the last 7 days", () => {
    const now = new Date("2026-11-17T10:00:00");
    expect(alerteRecente("2026-11-15T10:00:00", now)).toBe(true);
    expect(alerteRecente("2026-11-01T10:00:00", now)).toBe(false);
    expect(alerteRecente(null, now)).toBe(false);
  });
});
