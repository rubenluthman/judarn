import * as React from "react";

export interface CardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  /** Small accent label, set as a `t-label` (uppercase unless `eyebrowCasing` is "asWritten"). */
  eyebrow?: string;
  /** "asWritten" for an eyebrow holding a unit, a digit, or a mixed-case term. @default "uppercase" */
  eyebrowCasing?: "uppercase" | "asWritten";
  title?: React.ReactNode;
  children?: React.ReactNode;
  /** Media block (image/figure) rendered at top. */
  media?: React.ReactNode;
  /** Action row (buttons) rendered at bottom. */
  actions?: React.ReactNode;
  /** Remove elevation + padding. @default false */
  flat?: boolean;
  /** Apply compact padding (space2 / 16px) for sidebars and dense panes. @default false */
  compact?: boolean;
}

/** Content card block with substrate background contrast (surfaceElevated) and the host card radius. */
export function Card(props: CardProps): React.JSX.Element;
export default Card;
