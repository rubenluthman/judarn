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
  const cls = cx("jd-card", flat && "jd-card--flat", compact && "jd-card--compact", className);
  return (
    <div {...rest} className={cls}>
      {media ? <div className="jd-card__media">{media}</div> : null}
      {eyebrow ? (
        <span className={cx("jd-card__eyebrow", "t-label", eyebrowCasing === "asWritten" && "t-as-written")}>{eyebrow}</span>
      ) : null}
      {title ? <div className="jd-card__title">{title}</div> : null}
      {children ? <div className="jd-card__body">{children}</div> : null}
      {actions ? <div style={{ display: "flex", gap: "var(--gap-tight)" }}>{actions}</div> : null}
    </div>
  );
}

export default Card;
