import * as React from "react";

export type SDUINodeType =
  | "button"
  | "badge"
  | "tag"
  | "card"
  | "data-matrix"
  | "data-table"
  | "text-field"
  | "container"
  | "text";

/** Props accepted per node type. Any other prop is rejected by `validateSDUINode`. */
export interface SDUIPropsByType {
  button: { variant?: "primary" | "secondary" | "ghost" | "accent"; size?: "sm" | "md" | "lg"; block?: boolean; disabled?: boolean; type?: "button" | "submit" | "reset"; token?: string };
  badge: { variant?: "neutral" | "solid" | "accent" | "accent-tint"; accentColor?: string; token?: string };
  tag: { token?: string };
  card: { eyebrow?: string; eyebrowCasing?: "uppercase" | "asWritten"; title?: string; flat?: boolean; compact?: boolean; token?: string };
  "data-matrix": { columns?: SDUIColumn[]; rows?: SDUIRow[]; label?: string; token?: string };
  "data-table": { columns?: SDUIColumn[]; rows?: SDUIRow[]; token?: string };
  "text-field": { label?: string; hint?: string; error?: string; as?: "input" | "textarea" | "select"; invalid?: boolean; disabled?: boolean; labelCasing?: "uppercase" | "asWritten"; placeholder?: string; name?: string; type?: "text" | "email" | "number" | "password" | "search" | "tel" | "url"; defaultValue?: string; token?: string };
  container: { token?: string };
  text: { token?: string };
}

export type SDUIColumn = string | { key: string; label: string; numeric?: boolean; width?: number | string; casing?: "uppercase" | "asWritten" };
export type SDUIRow = Record<string, string | number | boolean | null>;

export interface SDUINode<T extends SDUINodeType = SDUINodeType> {
  type: T;
  props?: SDUIPropsByType[T];
  children?: SDUINode[];
  content?: string;
}

export const VALID_NODE_TYPES: Set<SDUINodeType>;
export const VALID_TOKEN_NAMES: Set<string>;
export const SDUI_PROP_ALLOWLIST: Record<SDUINodeType, Record<string, unknown>>;

export function serializeTokens(rawTokens: any): Record<string, any>;
/** Throws for an unknown node type, a prop outside the type's allowlist, or an invalid prop value. */
export function validateSDUINode(node: unknown): boolean;
export function serializeComponent<T extends SDUINodeType>(
  type: T,
  props?: SDUIPropsByType[T],
  children?: SDUINode[],
  content?: string
): SDUINode<T>;
export function deserializeComponent(
  node: SDUINode,
  customComponents?: Record<string, React.ComponentType<any>>,
  reactInstance?: typeof React
): React.ReactElement;
