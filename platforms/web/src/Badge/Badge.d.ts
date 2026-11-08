import * as React from "react";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  children?: React.ReactNode;
  /** @default "outline" */
  variant?: "outline" | "solid" | "accent" | "accent-outline";
  /** Optional custom accent color hex or rgb string. Automatically resolves accessible contrasting text ink. */
  accentColor?: string;
}

export interface TagProps extends React.HTMLAttributes<HTMLSpanElement> {
  children?: React.ReactNode;
}

/**
 * Resolves the foreground ink ("#000000" or "#ffffff") for a fill from its relative luminance and the 0.50 perceptual crossover (ADR-0006).
 * Accepts #hex, rgb() and oklch(); throws a TypeError for any other format.
 */
export function getContrastingInk(hexOrRgb: string): string;

/** Status chip set as written, with optional luminance-aware contrasting ink. */
export function Badge(props: BadgeProps): React.JSX.Element;
/** Sentence-case keyword chip. */
export function Tag(props: TagProps): React.JSX.Element;
export default Badge;

