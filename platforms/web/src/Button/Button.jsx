import { cx } from "../internal/cx.js";

/**
 * Button – Judarn button with flat fill, border, and hover inversion.
 * Flat fill, 1px border with the host control radius (var(--radius-control)). Hover inverts fg/bg.
 * Variants: primary (black), outline, secondary (surfaceRecessed), ghost (underline), accent.
 */
export function Button({
  children,
  variant = "primary",
  size = "md",
  block = false,
  disabled = false,
  type = "button",
  onClick,
  className,
  ...rest
}) {
  const cls = cx(
    "btn",
    variant === "outline" && "btn--outline",
    variant === "secondary" && "btn--secondary",
    variant === "ghost" && "btn--ghost",
    variant === "accent" && "btn--accent",
    size === "sm" && "btn--sm",
    size === "lg" && "btn--lg",
    block && "btn--block",
    className,
  );

  return (
    <button {...rest} className={cls} type={type} disabled={disabled} onClick={onClick}>
      {children}
    </button>
  );
}

export default Button;
