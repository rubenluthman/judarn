import * as React from "react";

export interface ButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "type"> {
  children?: React.ReactNode;
  /** Visual style. @default "primary" */
  variant?: "primary" | "outline" | "secondary" | "ghost" | "accent";
  /** @default "md" */
  size?: "sm" | "md" | "lg";
  /** Stretch to full container width. @default false */
  block?: boolean;
  /** @default false */
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
}

/** Judarn button – flat fill, border, and hover inversion. A consumer `className` extends the base classes. */
export function Button(props: ButtonProps): React.JSX.Element;
export default Button;
