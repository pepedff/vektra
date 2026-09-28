const FORMULA_START = /^[=+\-@\t\r]/;

function cell(value: string): string {
  const safe = FORMULA_START.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}

/** CSV com ";" (padrão do Excel pt-BR), BOM UTF-8 e células que não viram fórmula. */
export function toCsv(header: string[], rows: string[][]): string {
  return `\uFEFF${[header, ...rows].map((r) => r.map(cell).join(";")).join("\n")}`;
}

export function downloadCsv(filename: string, header: string[], rows: string[][]): void {
  const url = URL.createObjectURL(new Blob([toCsv(header, rows)], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
