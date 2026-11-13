import { cx } from "../internal/cx.js";

const linearize = (c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));

function oklchToLinearSrgb(l, c, h, clip) {
  const hr = (h * Math.PI) / 180;
  const a = c * Math.cos(hr);
  const b = c * Math.sin(hr);
  const l_ = Math.pow(l + 0.3963377774 * a + 0.2158037573 * b, 3);
  const m_ = Math.pow(l - 0.1055613458 * a - 0.0638541728 * b, 3);
  const s_ = Math.pow(l - 0.0894841775 * a - 1.2914855480 * b, 3);
  const rgb = [
    4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_,
    -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_,
    -0.0041960863 * l_ - 0.7034186147 * m_ + 1.7076147010 * s_,
  ];
  return clip ? rgb.map((v) => Math.min(1, Math.max(0, v))) : rgb;
}

/** CSS Color 4 gamut mapping: reduce chroma at constant lightness and hue until the colour fits sRGB. */
function oklchToLuminance(l, c, h) {
  if (l <= 0) return 0;
  if (l >= 1) return 1;
  const inGamut = (rgb) => rgb.every((v) => v >= -1e-6 && v <= 1 + 1e-6);
  let rgb = oklchToLinearSrgb(l, c, h, false);
  if (!inGamut(rgb)) {
    let low = 0;
    let high = c;
    for (let i = 0; i < 24; i++) {
      const mid = 0.5 * (low + high);
      if (inGamut(oklchToLinearSrgb(l, mid, h, false))) low = mid;
      else high = mid;
    }
    rgb = oklchToLinearSrgb(l, low, h, false);
  }
  const [r, g, b] = rgb.map((v) => Math.min(1, Math.max(0, v)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function parseLuminance(input) {
  const value = input.trim().toLowerCase();
  if (value.startsWith("#")) {
    const hex = value.slice(1);
    if (!/^([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/.test(hex)) return null;
    const full = hex.length <= 4 ? [...hex].map((ch) => ch + ch).join("") : hex;
    const [r, g, b] = [0, 2, 4].map((i) => linearize(parseInt(full.slice(i, i + 2), 16) / 255));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }
  if (value.startsWith("rgb")) {
    const nums = value.replace(/\/.*$/, "").match(/\d+(\.\d+)?/g);
    if (!nums || nums.length < 3) return null;
    const [r, g, b] = nums.slice(0, 3).map((n) => linearize(parseFloat(n) / 255));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }
  if (value.startsWith("oklch(")) {
    const m = value.match(/^oklch\(\s*([\d.]+)(%?)\s+([\d.]+)\s+([\d.]+)(?:deg)?\s*(?:\/[^)]*)?\)$/);
    if (!m) return null;
    const l = parseFloat(m[1]) / (m[2] ? 100 : 1);
    return oklchToLuminance(l, parseFloat(m[3]), parseFloat(m[4]));
  }
  return null;
}

/**
 * Resolves the foreground ink (pure black or pure white) for a filled surface
 * from its relative luminance and the perceptual crossover.
 * Inks are static literals because a fill does not change with color scheme,
 * while `--white` and `--jd-ink-100` invert in dark mode.
 * @param {string} color - Hex (#fff, #ffffff), rgb(r, g, b) or oklch(L C H) string.
 * @returns {string} "#000000" or "#ffffff".
 * @throws {TypeError} For any other format (hsl, named colours, var()), which cannot be resolved without a DOM.
 */
export function getContrastingInk(color) {
  const lum = typeof color === "string" ? parseLuminance(color) : null;
  if (lum === null) {
    throw new TypeError(`getContrastingInk: unsupported colour "${String(color)}". Use #hex, rgb() or oklch().`);
  }
  const perceptualCrossover = 0.50; // perceptual polarity crossover, as in docs/DESIGN.md
  return lum > perceptualCrossover ? "#000000" : "#ffffff";
}

/**
 * Badge – small status chip, set as written (a status is a value), with luminance-aware contrasting ink.
 */
export function Badge({ children, variant = "neutral", accentColor, style, className, ...rest }) {
  const cls = cx(
    "jd-badge",
    variant === "solid" && "jd-badge--solid",
    variant === "accent" && "jd-badge--accent",
    variant === "accent-tint" && "jd-badge--accent-tint",
    className,
  );

  const inlineStyle = { ...style };
  if (accentColor) {
    if (variant === "accent") {
      inlineStyle.backgroundColor = accentColor;
      inlineStyle.color = getContrastingInk(accentColor);
    } else if (variant === "accent-tint") {
      // The stylesheet mixes the tint and drops it in dark mode, so pass the color, not a fill.
      inlineStyle["--jd-badge-accent"] = accentColor;
    }
  }

  return (
    <span {...rest} className={cls} style={Object.keys(inlineStyle).length > 0 ? inlineStyle : undefined}>
      {children}
    </span>
  );
}

/**
 * Tag – sentence-case keyword chip (looser than Badge).
 */
export function Tag({ children, className, ...rest }) {
  return <span {...rest} className={cx("jd-tag", className)}>{children}</span>;
}

export default Badge;

