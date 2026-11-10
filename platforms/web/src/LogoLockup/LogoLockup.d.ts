import * as React from "react";

export interface LogoLockupProps {
  /** Wordmark text (heavy sans). @default "JUDARN" */
  name?: string;
  /** Optional descriptor under/after the name. */
  tagline?: string;
  /** Your geometric mark (SVG element). Omit for a construction placeholder. */
  mark?: React.ReactNode;
  /** Lockup arrangement. @default "horizontal" */
  variant?: "horizontal" | "vertical" | "icon" | "reversed";
  /** Pixel size of the placeholder mark. */
  markSize?: number;
  /** "asWritten" keeps the tagline as written. @default "uppercase" */
  taglineCasing?: "uppercase" | "asWritten";
}

/** Logo frame – geometric mark + wordmark, four variants. */
export function LogoLockup(props: LogoLockupProps): React.JSX.Element;
export default LogoLockup;
