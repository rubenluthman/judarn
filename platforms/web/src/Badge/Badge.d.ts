import * as React from "react";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  children?: React.ReactNode;
  /** Neutral is a well fill, accent-tint a light tint of the accent (neutral in dark mode). @default "neutral" */
  variant?: "neutral" | "solid" | "accent" | "accent-tint";
  /** Optional custom accent color (#hex, rgb() or oklch()). The accent variant fills with it and resolves contrasting ink; accent-tint tints with it. */
  accentColor?: string;
}

export interface TagProps extends React.HTMLAttributes<HTMLSpanElement> {
  children?: React.ReactNode;
}

/**
 * Resolves the foreground ink ("#000000" or "#ffffff") for a fill from its relative luminance and the 0.50 perceptual crossover.
 * Accepts #hex, rgb() and oklch(); throws a TypeError for any other format.
 */
export function getContrastingInk(hexOrRgb: string): string;

/** Status chip set as written, with optional luminance-aware contrasting ink. */
export function Badge(props: BadgeProps): React.JSX.Element;
/** Sentence-case keyword chip. */
export function Tag(props: TagProps): React.JSX.Element;
export default Badge;

