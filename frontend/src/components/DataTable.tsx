import { useMemo, useState, type ReactNode } from "react";
import { Icon } from "./Icon";

export interface Column<T> {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  /** Value used for sorting; omit to make the column unsortable. */
  sortValue?: (row: T) => string | number;
  align?: "right";
  className?: string;
  /** Drop the column on narrow screens. */
  hideOnMobile?: boolean;
}

interface DataTableProps<T> {
  rows: readonly T[];
  columns: readonly Column<T>[];
  rowKey: (row: T) => string | number;
  onRowClick?: (row: T) => void;
  rowLabel?: (row: T) => string;
  initialSort?: { key: string; dir: "asc" | "desc" };
  caption: string;
  empty?: ReactNode;
}

export function DataTable<T>({ rows, columns, rowKey, onRowClick, rowLabel, initialSort, caption, empty }: DataTableProps<T>) {
  const [sort, setSort] = useState(initialSort ?? null);

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.key === sort.key);
    if (!col?.sortValue) return rows;
    const get = col.sortValue;
    const factor = sort.dir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const va = get(a);
      const vb = get(b);
      const cmp = typeof va === "number" && typeof vb === "number" ? va - vb : String(va).localeCompare(String(vb), "fr");
      return cmp * factor;
    });
  }, [rows, columns, sort]);

  const toggle = (key: string) =>
    setSort((s) => (s?.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));

  if (!rows.length && empty) return <>{empty}</>;

  return (
    <div className="ledger-wrap">
      <table className="ledger">
        <caption className="visually-hidden">{caption}</caption>
        <thead>
          <tr>
            {columns.map((c) => {
              const active = sort?.key === c.key;
              const ariaSort = active ? (sort.dir === "asc" ? "ascending" : "descending") : c.sortValue ? "none" : undefined;
              return (
                <th key={c.key} scope="col" aria-sort={ariaSort} className={[c.align === "right" && "right", c.hideOnMobile && "sm-hide"].filter(Boolean).join(" ") || undefined}>
                  {c.sortValue ? (
                    <button type="button" onClick={() => toggle(c.key)}>
                      {c.header}
                      <Icon name={active ? (sort.dir === "asc" ? "sortAsc" : "sortDesc") : "sort"} size={11} />
                    </button>
                  ) : (
                    c.header
                  )}
                </th>
              );
            })}
            {onRowClick && <th aria-hidden="true" />}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => (
            <tr
              key={rowKey(row)}
              data-href={onRowClick ? "" : undefined}
              tabIndex={onRowClick ? 0 : undefined}
              aria-label={onRowClick && rowLabel ? rowLabel(row) : undefined}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              onKeyDown={
                onRowClick
                  ? (e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onRowClick(row);
                      }
                    }
                  : undefined
              }
            >
              {columns.map((c) => (
                <td key={c.key} className={[c.align === "right" && "right", c.className, c.hideOnMobile && "sm-hide"].filter(Boolean).join(" ") || undefined}>
                  {c.cell(row)}
                </td>
              ))}
              {onRowClick && (
                <td className="right" aria-hidden="true" style={{ width: 28 }}>
                  <Icon name="arrowRight" className="go" />
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
