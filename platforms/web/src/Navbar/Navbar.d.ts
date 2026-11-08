import * as React from "react";

export interface NavLink {
  label: string;
  href?: string;
}

export interface NavbarProps extends React.HTMLAttributes<HTMLElement> {
  /** Brand wordmark text. @default "JUDARN" */
  brand?: string;
  /** Link labels or {label, href} objects. */
  links?: Array<string | NavLink>;
  /** Label of the active link (gets accent underline). */
  current?: string;
  /** Right-aligned actions (e.g. a Button). */
  actions?: React.ReactNode;
}

/** Top navigation bar – 2px baseline rule, links set as written. */
export function Navbar(props: NavbarProps): React.JSX.Element;
export default Navbar;
