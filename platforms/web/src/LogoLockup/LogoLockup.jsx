/**
 * LogoLockup – the canonical logo frame. A logo in this system is always
 * a geometric MARK (built from rect / ellipse / polygon primitives) paired
 * with a heavy sans wordmark. Ships in four variants:
 * horizontal · vertical · icon · reversed.
 *
 * Pass your own `mark` (any SVG/element). If omitted, a neutral geometric
 * construction placeholder is shown to demonstrate the grid.
 */
function PlaceholderMark({ size = 48 }) {
  // Demonstrates primitive-only construction on an 8pt grid (no rasters).
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <rect x="0" y="0" width="48" height="24" fill="var(--black)" />
      <rect x="0" y="24" width="24" height="24" fill="var(--ink-60)" />
      <polygon points="24,24 48,24 48,48" fill="var(--accent)" />
    </svg>
  );
}

export function LogoLockup({
  name = "JUDARN",
  tagline,
  mark,
  variant = "horizontal",
  markSize,
  taglineCasing = "uppercase",
}) {
  const isIcon = variant === "icon";
  const cls = [
    "lockup",
    variant === "vertical" && "lockup--vertical",
    variant === "reversed" && "lockup--reversed",
  ].filter(Boolean).join(" ");

  const theMark = mark || <PlaceholderMark size={markSize || (variant === "vertical" ? 64 : 48)} />;

  if (isIcon) {
    return <span className="lockup__mark" role="img" aria-label={name}>{mark || <PlaceholderMark size={markSize || 64} />}</span>;
  }

  return (
    <div className={cls} role="img" aria-label={tagline ? `${name} – ${tagline}` : name}>
      <span className="lockup__mark">{theMark}</span>
      <span className="lockup__words">
        <span className="lockup__name">{name}</span>
        {tagline ? <span className={taglineCasing === "asWritten" ? "lockup__tag t-label t-as-written" : "lockup__tag t-label"}>{tagline}</span> : null}
      </span>
    </div>
  );
}

export default LogoLockup;
