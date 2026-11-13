import { cx } from "../internal/cx.js";

/**
 * Button – Judarn button set apart by fill alone, with hover inversion.
 * Flat fill with the host control radius (var(--radius-control)) and a transparent border that
 * high-contrast modes turn into an ink-100 outline. Hover inverts the fill.
 * Variants: primary (ink fill), secondary (well fill), ghost (underline), accent.
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
    "jd-btn",
    variant === "secondary" && "jd-btn--secondary",
    variant === "ghost" && "jd-btn--ghost",
    variant === "accent" && "jd-btn--accent",
    size === "sm" && "jd-btn--sm",
    size === "lg" && "jd-btn--lg",
    block && "jd-btn--block",
    className,
  );

  return (
    <button {...rest} className={cls} type={type} disabled={disabled} onClick={onClick}>
      {children}
    </button>
  );
}

export default Button;
