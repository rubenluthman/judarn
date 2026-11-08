import { cx } from "../internal/cx.js";

/**
 * DataTable – bordered tabular data. Columns can be flagged numeric (right-aligned, tabular figures).
 */
const headerClass = (c) =>
  [c.numeric && "num", c.casing === "asWritten" && "t-as-written"].filter(Boolean).join(" ") || undefined;

export function DataTable({ columns = [], rows = [], className, ...rest }) {
  const cols = columns.map((c) => (typeof c === "string" ? { key: c, label: c } : c));
  return (
    <table {...rest} className={cx("table", className)}>
      <thead>
        <tr>
          {cols.map((c) => (
            <th key={c.key} className={headerClass(c)}>{c.label}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i}>
            {cols.map((c) => (
              <td key={c.key} className={c.numeric ? "num" : undefined}>{row[c.key]}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default DataTable;
