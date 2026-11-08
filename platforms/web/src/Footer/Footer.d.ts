import * as React from "react";

export interface FooterColumn {
  head: string;
  links?: Array<string | { label: string; href?: string }>;
}

export interface FooterProps extends React.HTMLAttributes<HTMLElement> {
  /** Brand wordmark. @default "JUDARN" */
  brand?: string;
  /** Short line under the brand. */
  tagline?: string;
  /** Link columns. */
  columns?: FooterColumn[];
  /** "asWritten" for column heads holding mixed-case terms (ADR-0009). Heads render as `h2`. @default "uppercase" */
  headCasing?: "uppercase" | "asWritten";
}

/** Three-column footer with 2px top rule. */
export function Footer(props: FooterProps): React.JSX.Element;
export default Footer;
