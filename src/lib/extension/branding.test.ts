import { describe, expect, it } from "vitest";
import { DEFAULT_BRANDING, mergeBranding, pickAllowed, type Branding } from "./branding";

describe("mergeBranding", () => {
  it("usa o padrão global quando o revendedor não tem override", () => {
    expect(mergeBranding(DEFAULT_BRANDING, null).extensionName).toBe(DEFAULT_BRANDING.extensionName);
  });

  it("aplica só os campos preenchidos do revendedor", () => {
    const out = mergeBranding(DEFAULT_BRANDING, { extensionName: "Minha AI", colorPrimary: "#ff00aa" });
    expect(out.extensionName).toBe("Minha AI");
    expect(out.colorPrimary).toBe("#ff00aa");
    expect(out.assistantName).toBe(DEFAULT_BRANDING.assistantName);
  });
});

describe("pickAllowed", () => {
  it("corta campos que o admin não liberou", () => {
    const draft: Partial<Branding> = { extensionName: "X", colorPrimary: "#111111", logoUrl: "https://x.com/l.png" };
    expect(pickAllowed(draft, ["extensionName", "colorPrimary"])).toEqual({
      extensionName: "X",
      colorPrimary: "#111111",
    });
  });
});
