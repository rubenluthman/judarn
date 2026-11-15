import * as React from "react";

interface TextFieldBaseProps {
  /** Label above the control, uppercase unless labelCasing is "asWritten". */
  label?: string;
  /** "asWritten" for a label longer than two words or holding a digit, unit, or mixed-case term. @default "uppercase" */
  labelCasing?: "uppercase" | "asWritten";
  /** Helper text below the control, linked with `aria-describedby`. */
  hint?: string;
  /** Error message below the control, linked with `aria-describedby`. Also marks the control invalid. */
  error?: string;
  /** Overrides the generated `React.useId()` id. */
  id?: string;
  /** Marks the control invalid (`aria-invalid`, signal-error border). @default false */
  invalid?: boolean;
  /** @default false */
  disabled?: boolean;
}

/** A single-line input, the default. */
export interface TextFieldInputProps extends TextFieldBaseProps, Omit<React.InputHTMLAttributes<HTMLInputElement>, "id"> {
  /** Render an input, textarea, or select. @default "input" */
  as?: "input";
}

/** A multi-line textarea. */
export interface TextFieldTextareaProps extends TextFieldBaseProps, Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "id"> {
  as: "textarea";
}

/** A select; pass `<option>` elements as children. */
export interface TextFieldSelectProps extends TextFieldBaseProps, Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "id"> {
  as: "select";
}

/** The props of a field, narrowed by `as`, so each control takes only its own attributes. */
export type TextFieldProps = TextFieldInputProps | TextFieldTextareaProps | TextFieldSelectProps;

/**
 * Labelled field – input / textarea / select with Judarn styling. A well set apart by fill alone:
 * surfaceRecessed on the page, substrate inside a card, and no outline except in high-contrast modes.
 */
export function TextField(props: TextFieldProps): React.JSX.Element;
export default TextField;
