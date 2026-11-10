import * as React from "react";

export interface MatrixColumn {
  key: string;
  label: string;
  /** Right-align with tabular figures. @default false */
  numeric?: boolean;
  /** Fixed width in pixels (number) or CSS length (string). */
  width?: number | string;
  /** "asWritten" for a header holding a unit symbol or mixed-case term, such as kg or e1RM. @default "uppercase" */
  casing?: "uppercase" | "asWritten";
}

export interface DataMatrixProps extends React.TableHTMLAttributes<HTMLTableElement> {
  /** Column keys (strings) or {key,label,numeric,width} objects. */
  columns?: Array<string | MatrixColumn>;
  /** Row objects keyed by column key. */
  rows?: Array<Record<string, React.ReactNode>>;
  /** Spoken table label for assistive tech. @default "Data Matrix" */
  label?: string;
}

/** Data Matrix with 1px hairline rules between cells and no perimeter border, tabular figures, and accessible landmarks. */
export function DataMatrix(props: DataMatrixProps): React.JSX.Element;
export default DataMatrix;

