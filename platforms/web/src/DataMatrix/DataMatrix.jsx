import { cx } from "../internal/cx.js";

/**
 * DataMatrix – 1px hairline grid matrix layout (internal rules only, no perimeter border) with tabular numeric cells,
 * zero-width space baseline preservation, and accessible tabular landmarks.
 */
export function DataMatrix({ columns = [], rows = [], label = "Data Matrix", className, ...rest }) {
  const cols = columns.map((c) => (typeof c === "string" ? { key: c, label: c } : c));
  const totalColumns = cols.length;
  const totalRows = rows.length;

  return (
    <table
      {...rest}
      className={cx("matrix", className)}
      role="table"
      aria-label={label}
      aria-colcount={totalColumns}
      aria-rowcount={totalRows + 1}
    >
      <thead role="rowgroup">
        <tr role="row" aria-rowindex={1}>
          {cols.map((c, colIndex) => {
            const widthStyle = c.width != null ? {
              width: typeof c.width === "number" ? `${c.width}px` : c.width,
              minWidth: typeof c.width === "number" ? `${c.width}px` : c.width,
              maxWidth: typeof c.width === "number" ? `${c.width}px` : c.width,
            } : undefined;

            return (
              <th
                key={c.key}
                scope="col"
                role="columnheader"
                aria-colindex={colIndex + 1}
                aria-label={c.label}
                className={[c.numeric && "num", c.casing === "asWritten" && "t-as-written"].filter(Boolean).join(" ") || undefined}
                style={widthStyle}
              >
                {c.label}
              </th>
            );
          })}
        </tr>
      </thead>
      <tbody role="rowgroup">
        {rows.map((row, rowIndex) => {
          const rowNum = rowIndex + 2; // Row 1 is header
          return (
            <tr
              key={rowIndex}
              role="row"
              aria-rowindex={rowNum}
              aria-label={`Row ${rowIndex + 1} of ${totalRows}`}
            >
              {cols.map((c, colIndex) => {
                const rawVal = row[c.key];
                const isEmpty = rawVal == null || rawVal === "";
                const displayVal = isEmpty ? "\u200B" : rawVal;
                const widthStyle = c.width != null ? {
                  width: typeof c.width === "number" ? `${c.width}px` : c.width,
                  minWidth: typeof c.width === "number" ? `${c.width}px` : c.width,
                  maxWidth: typeof c.width === "number" ? `${c.width}px` : c.width,
                } : undefined;

                return (
                  <td
                    key={c.key}
                    role="cell"
                    aria-colindex={colIndex + 1}
                    aria-label={isEmpty ? `${c.label}: Empty` : undefined}
                    className={c.numeric ? "num" : undefined}
                    style={widthStyle}
                  >
                    {displayVal}
                  </td>
                );
              })}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export default DataMatrix;

