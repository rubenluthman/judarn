import * as React from "react";

export interface DataColumn {
  key: string;
  label: string;
  /** Right-align with tabular figures. @default false */
  numeric?: boolean;
  /** "asWritten" for a header holding a unit symbol or mixed-case term, such as kg or e1RM (ADR-0009). @default "uppercase" */
  casing?: "uppercase" | "asWritten";
}

export interface DataTableProps extends React.TableHTMLAttributes<HTMLTableElement> {
  /** Column keys (strings) or {key,label,numeric} objects. */
  columns?: Array<string | DataColumn>;
  /** Row objects keyed by column key. */
  rows?: Array<Record<string, React.ReactNode>>;
}

/** Bordered data table – uppercase headers unless a column sets casing "asWritten", hairline row rules. */
export function DataTable(props: DataTableProps): React.JSX.Element;
export default DataTable;
