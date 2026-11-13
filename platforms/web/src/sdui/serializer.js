/**
 * Judarn Server-Driven UI (SDUI) Token Serializer & Hydration Engine.
 *
 * A payload is untrusted data. The validator accepts only the node types, the props of each type,
 * and the prop values listed below; anything else (`style`, `className`, `dangerouslySetInnerHTML`,
 * event handlers, `data-*`) is rejected, never forwarded to the DOM.
 */
import * as React from "react";
import { Button } from "../Button/Button.jsx";
import { Badge, Tag } from "../Badge/Badge.jsx";
import { Card } from "../Card/Card.jsx";
import { DataMatrix } from "../DataMatrix/DataMatrix.jsx";
import { DataTable } from "../DataTable/DataTable.jsx";
import { TextField } from "../TextField/TextField.jsx";

export const VALID_NODE_TYPES = new Set([
  "button",
  "badge",
  "tag",
  "card",
  "data-matrix",
  "data-table",
  "text-field",
  "container",
  "text",
]);

const BUTTON_VARIANTS = ["primary", "secondary", "ghost", "accent"];
const BADGE_VARIANTS = ["neutral", "solid", "accent", "accent-tint"];
const SIZES = ["sm", "md", "lg"];
const CASINGS = ["uppercase", "asWritten"];

/** Wire names produced by `serializeTokens`, one namespace after another. */
export const VALID_TOKEN_NAMES = new Set([
  // color
  "substrate", "surfaceElevated", "surfaceRecessed", "ink100", "ink60", "ink30", "signalError",
  // radius
  "subtle", "control", "card", "badge",
  // space
  "half", "1", "2", "3", "4", "6", "8", "12", "16", "touch",
  // measure
  "body", "compact", "sidebar",
]);

const string = { kind: "string" };
const boolean = { kind: "boolean" };
const oneOf = (values) => ({ kind: "enum", values });
const columns = { kind: "columns" };
const rows = { kind: "rows" };
const colorValue = { kind: "color" };

/**
 * Props allowed per node type, with the value shape of each. This table is the single definition:
 * `schema.json` mirrors it and `verify-sdui.js` fails when the two differ.
 */
export const SDUI_PROP_ALLOWLIST = {
  button: { variant: oneOf(BUTTON_VARIANTS), size: oneOf(SIZES), block: boolean, disabled: boolean, type: oneOf(["button", "submit", "reset"]), token: string },
  badge: { variant: oneOf(BADGE_VARIANTS), accentColor: colorValue, token: string },
  tag: { token: string },
  card: { eyebrow: string, eyebrowCasing: oneOf(CASINGS), title: string, flat: boolean, compact: boolean, token: string },
  "data-matrix": { columns, rows, label: string, token: string },
  "data-table": { columns, rows, token: string },
  "text-field": {
    label: string, hint: string, error: string, as: oneOf(["input", "textarea", "select"]),
    invalid: boolean, disabled: boolean, labelCasing: oneOf(CASINGS), placeholder: string,
    name: string, type: oneOf(["text", "email", "number", "password", "search", "tel", "url"]),
    defaultValue: string, token: string,
  },
  container: { token: string },
  text: { token: string },
};

const COLOR_PATTERN = /^(#[0-9a-f]{3,8}|rgba?\([\d\s.,%/]+\)|oklch\([\d\s.%/deg]+\))$/i;
const COLUMN_KEYS = new Set(["key", "label", "numeric", "width", "casing"]);

const fail = (message) => {
  throw new Error(message);
};

function validateColumns(value, where) {
  if (!Array.isArray(value)) fail(`${where}: "columns" must be an array.`);
  for (const col of value) {
    if (typeof col === "string") continue;
    if (!col || typeof col !== "object" || Array.isArray(col)) fail(`${where}: a column must be a string or an object.`);
    for (const [k, v] of Object.entries(col)) {
      if (!COLUMN_KEYS.has(k)) fail(`${where}: unsupported column key "${k}".`);
      if ((k === "key" || k === "label") && typeof v !== "string") fail(`${where}: column "${k}" must be a string.`);
      if (k === "numeric" && typeof v !== "boolean") fail(`${where}: column "numeric" must be a boolean.`);
      if (k === "width" && typeof v !== "number" && typeof v !== "string") fail(`${where}: column "width" must be a number or string.`);
      if (k === "casing" && !CASINGS.includes(v)) fail(`${where}: column "casing" must be one of ${CASINGS.join(", ")}.`);
    }
    if (typeof col.key !== "string" || typeof col.label !== "string") fail(`${where}: a column needs "key" and "label" strings.`);
  }
}

function validateRows(value, where) {
  if (!Array.isArray(value)) fail(`${where}: "rows" must be an array.`);
  for (const row of value) {
    if (!row || typeof row !== "object" || Array.isArray(row)) fail(`${where}: a row must be an object.`);
    for (const cell of Object.values(row)) {
      if (cell !== null && !["string", "number", "boolean"].includes(typeof cell)) fail(`${where}: row cells must be strings, numbers, booleans or null.`);
    }
  }
}

function validateProp(type, name, spec, value) {
  const where = `SDUI ${type} prop "${name}"`;
  switch (spec.kind) {
    case "string":
      if (typeof value !== "string") fail(`${where} must be a string.`);
      break;
    case "boolean":
      if (typeof value !== "boolean") fail(`${where} must be a boolean.`);
      break;
    case "enum":
      if (!spec.values.includes(value)) fail(`Unsupported ${where}: "${value}". Allowed: ${spec.values.join(", ")}`);
      break;
    case "color":
      if (typeof value !== "string" || !COLOR_PATTERN.test(value)) fail(`${where} must be a #hex, rgb() or oklch() colour.`);
      break;
    case "columns":
      validateColumns(value, where);
      break;
    case "rows":
      validateRows(value, where);
      break;
    default:
      fail(`${where} has an unknown spec.`);
  }
  if (name === "token" && !VALID_TOKEN_NAMES.has(value)) fail(`Unsupported SDUI token reference: "${value}".`);
}

/**
 * Normalizes canonical design tokens into an SDUI-ready wire format.
 * @param {object} tokens - Flat token view from scripts/lib/design-tokens.js (resolved from
 *   tokens/judarn.resolver.json), whose values are strings such as "16px" and "oklch(0.520 0.005 92)".
 * @returns {object} SDUI token registry.
 */
export function serializeTokens(tokens) {
  if (!tokens || typeof tokens !== 'object') {
    throw new Error('Invalid tokens object provided for SDUI serialization.');
  }

  const sduiTokens = {
    $schema: 'https://judarn.design/schemas/sdui/tokens/v1.json',
    space: {},
    measure: {},
    border: {},
    radius: {},
    color: {}
  };

  if (tokens.space) {
    for (const [key, val] of Object.entries(tokens.space)) {
      sduiTokens.space[key] = val.$value;
    }
  }

  if (tokens.measure) {
    for (const [key, val] of Object.entries(tokens.measure)) {
      sduiTokens.measure[key] = val.$value;
    }
  }

  if (tokens.border) {
    for (const [key, val] of Object.entries(tokens.border)) {
      sduiTokens.border[key] = val.$value;
    }
  }

  if (tokens.radius) {
    for (const [key, val] of Object.entries(tokens.radius)) {
      sduiTokens.radius[key] = val.$value;
    }
  }

  if (tokens.color) {
    for (const [key, val] of Object.entries(tokens.color)) {
      sduiTokens.color[key] = {
        light: val.light?.$value,
        dark: val.dark?.$value,
        lightHighContrast: val.lightHighContrast?.$value,
        darkHighContrast: val.darkHighContrast?.$value
      };
    }
  }

  return sduiTokens;
}

/**
 * Validates an SDUI node against Judarn invariants.
 * @param {object} node - SDUI node to validate.
 * @returns {boolean} True if valid, throws if invalid.
 */
export function validateSDUINode(node) {
  if (!node || typeof node !== "object" || Array.isArray(node)) {
    fail("SDUI Node must be a non-null object.");
  }
  if (!node.type || typeof node.type !== "string") {
    fail('SDUI Node missing required "type" string property.');
  }
  if (!VALID_NODE_TYPES.has(node.type)) {
    fail(`Unsupported SDUI node type: "${node.type}". Allowed: ${Array.from(VALID_NODE_TYPES).join(", ")}`);
  }

  if (node.props !== undefined) {
    if (!node.props || typeof node.props !== "object" || Array.isArray(node.props)) fail("SDUI Node props must be an object.");
    const allowed = SDUI_PROP_ALLOWLIST[node.type];
    for (const [name, value] of Object.entries(node.props)) {
      if (!Object.prototype.hasOwnProperty.call(allowed, name)) {
        fail(`Unsupported SDUI prop "${name}" on "${node.type}". Allowed: ${Object.keys(allowed).join(", ") || "none"}`);
      }
      validateProp(node.type, name, allowed[name], value);
    }
  }

  if (node.content !== undefined && typeof node.content !== "string") {
    fail("SDUI Node content must be a string.");
  }

  if (node.children !== undefined) {
    if (!Array.isArray(node.children)) fail("SDUI Node children must be an array.");
    for (const child of node.children) validateSDUINode(child);
  }

  return true;
}

/**
 * Creates a validated SDUI component node.
 * @param {string} type - Component type.
 * @param {object} [props] - Component properties.
 * @param {Array<object>} [children] - Child SDUI nodes.
 * @param {string} [content] - Text content for leaf nodes.
 * @returns {object} SDUI Node.
 */
export function serializeComponent(type, props = {}, children = [], content = undefined) {
  const node = { type, props: { ...props } };
  if (content !== undefined) node.content = String(content);
  if (Array.isArray(children) && children.length > 0) node.children = children;
  validateSDUINode(node);
  return node;
}

/**
 * Deserializes an SDUI node into a hydrated React element tree.
 * @param {object} node - SDUI Node.
 * @param {object} [customComponents] - Optional map of component overrides (Button, Badge, Tag, Card, DataMatrix, DataTable, TextField).
 * @param {object} [reactInstance] - Optional React instance.
 * @returns {object} ReactElement.
 */
export function deserializeComponent(node, customComponents = {}, reactInstance = React) {
  validateSDUINode(node);

  const components = {
    Button, Badge, Tag, Card, DataMatrix, DataTable, TextField,
    ...customComponents,
  };
  const h = (type, props, children) => reactInstance.createElement(type, props, ...children);

  const childElements = node.children
    ? node.children.map((child, i) => {
        const el = deserializeComponent(child, customComponents, reactInstance);
        return reactInstance.isValidElement(el) ? reactInstance.cloneElement(el, { key: i }) : el;
      })
    : [];
  const contentOrChildren = node.content !== undefined ? [node.content] : childElements;

  // `token` documents which design token a node refers to; it is not a DOM attribute.
  const { token: _token, ...props } = node.props || {};

  switch (node.type) {
    case "button":
      return h(components.Button, props, contentOrChildren);
    case "badge":
      return h(components.Badge, props, contentOrChildren);
    case "tag":
      return h(components.Tag, props, contentOrChildren);
    case "card":
      return h(components.Card, props, contentOrChildren);
    case "data-matrix":
      return h(components.DataMatrix, props, []);
    case "data-table":
      return h(components.DataTable, props, []);
    case "text-field":
      return h(components.TextField, props, []);
    case "container":
      return h("div", props, contentOrChildren);
    case "text":
      return h("span", props, [node.content || ""]);
    default:
      return fail(`Unhandled SDUI node type: ${node.type}`);
  }
}
