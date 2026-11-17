import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Server-rendered table. Headers stay in view while scrolling and the whole
 * table becomes stacked cards inside a narrow container, so a phone reads one
 * record at a time without a second markup path (Modern Web Guidance:
 * responsive-table / tabs).
 */
export type Column<T> = {
  key: string;
  label: string;
  cell: (row: T) => ReactNode;
  end?: boolean;
};

export function DataTable<T extends { id: string }>({
  caption,
  columns,
  rows,
  href,
  empty,
}: {
  caption: string;
  columns: Column<T>[];
  rows: T[];
  href: string;
  empty: ReactNode;
}) {
  if (rows.length === 0) return <>{empty}</>;
  const captionId = `table-${caption.replace(/\W+/g, "-").toLowerCase()}`;

  return (
    <div className="table-wrap" role="region" aria-labelledby={captionId} tabIndex={0}>
      <table className="data-table">
        <caption id={captionId}>{caption}</caption>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} scope="col" data-end={column.end ? "" : undefined}>
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              {columns.map((column, index) =>
                index === 0 ? (
                  <th key={column.key} scope="row">
                    <Link href={`${href}/${row.id}`}>{column.cell(row)}</Link>
                  </th>
                ) : (
                  <td key={column.key} data-label={column.label} data-end={column.end ? "" : undefined}>
                    {column.cell(row)}
                  </td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Previous/next paging as plain links, so it works without JavaScript. */
export function Pager({ page, pages, base }: { page: number; pages: number; base: string }) {
  if (pages <= 1) return null;
  const href = (target: number) => `${base}${base.includes("?") ? "&" : "?"}page=${target}`;

  return (
    <nav className="pager" aria-label="Pages">
      {page > 1 ? <Link className="btn" href={href(page - 1)}>Previous</Link> : null}
      <span className="muted">
        Page {page} of {pages}
      </span>
      {page < pages ? <Link className="btn" href={href(page + 1)}>Next</Link> : null}
    </nav>
  );
}
