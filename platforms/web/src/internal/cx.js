/** Joins class names, skipping falsy values, so consumer classes extend the base classes. */
export function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}
