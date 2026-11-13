import * as React from "react";
import { cx } from "../internal/cx.js";

/**
 * TextField – labelled input / textarea / select.
 * A well set apart by fill alone: surfaceRecessed on the page, substrate inside a card, no outline at rest.
 * High-contrast modes add an ink-100 outline; focus draws an --accent ring and invalid a signal-error ring.
 * Uses the host control radius (var(--radius-control)).
 * Ids come from `React.useId()` unless `id` is given; hint and error are linked with `aria-describedby`.
 */
export function TextField({
  label,
  hint,
  error,
  as = "input",
  id,
  invalid = false,
  disabled = false,
  labelCasing = "uppercase",
  className,
  children,
  "aria-describedby": describedByProp,
  ...rest
}) {
  const generated = React.useId();
  const fid = id || generated;
  const hintId = hint ? `${fid}-hint` : undefined;
  const errorId = error ? `${fid}-error` : undefined;
  const describedBy = [describedByProp, hintId, errorId].filter(Boolean).join(" ") || undefined;
  const common = {
    ...rest,
    id: fid,
    className: cx("jd-field__input", className),
    "aria-invalid": invalid || error ? true : undefined,
    "aria-describedby": describedBy,
    disabled,
  };
  let control;
  if (as === "textarea") control = <textarea {...common} />;
  else if (as === "select") control = <select {...common}>{children}</select>;
  else control = <input {...common} />;

  return (
    <div className="jd-field">
      {label ? <label className={cx("jd-field__label", labelCasing === "asWritten" && "t-as-written")} htmlFor={fid}>{label}</label> : null}
      {control}
      {hint ? <span className="jd-field__hint" id={hintId}>{hint}</span> : null}
      {error ? <span className="jd-field__hint is-error" id={errorId}>{error}</span> : null}
    </div>
  );
}

export default TextField;
