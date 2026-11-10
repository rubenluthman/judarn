import * as React from "react";

type FieldControlProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement> &
    React.TextareaHTMLAttributes<HTMLTextAreaElement> &
    React.SelectHTMLAttributes<HTMLSelectElement>,
  "id"
>;

export interface TextFieldProps extends FieldControlProps {
  /** Label above the control, uppercase unless labelCasing is "asWritten". */
  label?: string;
  /** "asWritten" for a label longer than two words or holding a digit, unit, or mixed-case term. @default "uppercase" */
  labelCasing?: "uppercase" | "asWritten";
  /** Helper text below the control, linked with `aria-describedby`. */
  hint?: string;
  /** Error message below the control, linked with `aria-describedby`. Also marks the control invalid. */
  error?: string;
  /** Render an input, textarea, or select. @default "input" */
  as?: "input" | "textarea" | "select";
  /** Overrides the generated `React.useId()` id. */
  id?: string;
  /** Marks the control invalid (`aria-invalid`, signal-error border). @default false */
  invalid?: boolean;
  /** @default false */
  disabled?: boolean;
}

/** Labelled field – input / textarea / select with Judarn styling. */
export function TextField(props: TextFieldProps): React.JSX.Element;
export default TextField;
