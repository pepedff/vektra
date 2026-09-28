import { describe, expect, it } from "vitest";
import { toCsv } from "./csv";

describe("toCsv", () => {
  it("usa ; e aspas, com BOM para o Excel", () => {
    expect(toCsv(["Nome", "Valor"], [["Ana", "10,00"]])).toBe('\uFEFF"Nome";"Valor"\n"Ana";"10,00"');
  });

  it("escapa aspas internas", () => {
    expect(toCsv(["a"], [['diz "oi"']])).toBe('\uFEFF"a"\n"diz ""oi"""');
  });

  it("neutraliza fórmulas (CSV injection)", () => {
    const out = toCsv(["a"], [["=HYPERLINK(\"x\")"], ["+1"], ["-2"], ["@SUM(A1)"]]);
    expect(out.split("\n").slice(1)).toEqual(['"\'=HYPERLINK(""x"")"', '"\'+1"', '"\'-2"', '"\'@SUM(A1)"']);
  });
});
