/**
 * CSV writing in one place, for the dashboard and masters exports.
 *
 * A quoted cell is not enough: Excel still runs a value that starts with
 * = + - @ or a control character as a formula, so those get a leading
 * apostrophe (the OWASP guidance for spreadsheet exports).
 */
const FORMULA_START = /^[=+\-@\t\r]/;

function cell(value: unknown) {
  const text = String(value ?? "");
  const safe = FORMULA_START.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}

export function toCsv(rows: unknown[][]): string {
  return rows.map((row) => row.map(cell).join(",")).join("\r\n");
}

export function csvResponse(rows: unknown[][], filename: string) {
  return new Response(`\uFEFF${toCsv(rows)}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
