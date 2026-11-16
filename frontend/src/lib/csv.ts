export interface CsvColumn<T> {
  header: string;
  value: (row: T) => string | number | null | undefined;
}

const escape = (v: string) => (/[";\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

/** Semicolon-separated CSV with BOM so spreadsheet apps open accents correctly. */
export function toCsv<T>(rows: readonly T[], columns: readonly CsvColumn<T>[]): string {
  const head = columns.map((c) => escape(c.header)).join(";");
  const body = rows.map((r) => columns.map((c) => escape(String(c.value(r) ?? ""))).join(";"));
  return "﻿" + [head, ...body].join("\n");
}

export function download(filename: string, content: string, type = "text/csv;charset=utf-8") {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = Object.assign(document.createElement("a"), { href: url, download: filename });
  document.body.append(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
