import { describe, expect, it } from "vitest";
import { emailKey, maskEmail, maskPhone, phoneKey } from "./privacy";

describe("privacy helpers", () => {
  it("keeps only the last three digits of a phone number", () => {
    expect(maskPhone("+216 20 100 400")).toBe("•• •• 400");
    expect(maskPhone(null)).toBe("—");
  });

  it("keeps only the first letter of an e-mail user", () => {
    expect(maskEmail("ines.mansouri@exemple.tn")).toBe("i•••@exemple.tn");
  });

  it("matches contacts regardless of formatting", () => {
    expect(phoneKey("+216 20 100 400")).toBe(phoneKey("21620100400"));
    expect(emailKey("  Ines@Exemple.TN ")).toBe("ines@exemple.tn");
  });
});
