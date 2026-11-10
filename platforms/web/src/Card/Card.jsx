import { cx } from "../internal/cx.js";

/**
 * Card – content block with substrate background contrast. Optional eyebrow, title, body, media, actions.
 * The eyebrow is a `t-label` set in uppercase; `eyebrowCasing="asWritten"` keeps it as written.
 */
export function Card({
  eyebrow,
  eyebrowCasing = "uppercase",
  title,
  children,
  media,
  actions,
  flat = false,
  compact = false,
  className,
  ...rest
}) {
  const cls = cx("card", flat && "card--flat", compact && "card--compact", className);
  return (
    <div {...rest} className={cls}>
      {media ? <div className="card__media">{media}</div> : null}
      {eyebrow ? (
        <span className={cx("card__eyebrow", "t-label", eyebrowCasing === "asWritten" && "t-as-written")}>{eyebrow}</span>
      ) : null}
      {title ? <div className="card__title">{title}</div> : null}
      {children ? <div className="card__body">{children}</div> : null}
      {actions ? <div style={{ display: "flex", gap: "var(--gap-tight)" }}>{actions}</div> : null}
    </div>
  );
}

export default Card;
