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
function oklchToLinearRgb(l, c, h) {
  if (l <= 0) return [0, 0, 0];
  if (l >= 1) return [1, 1, 1];
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
  return rgb.map((v) => Math.min(1, Math.max(0, v)));
}

const luminanceOf = ([r, g, b]) => 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
const encode = (c) => (c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055);

/** Parses #hex, rgb() or oklch() to gamma-encoded sRGB channels in 0..1, or null. */
function parseSrgb(input) {
  if (typeof input !== "string") return null;
  const value = input.trim().toLowerCase();
  if (value.startsWith("#")) {
    const hex = value.slice(1);
    if (!/^([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/.test(hex)) return null;
    const full = hex.length <= 4 ? [...hex].map((ch) => ch + ch).join("") : hex;
    return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255);
  }
  if (value.startsWith("rgb")) {
    const nums = value.replace(/\/.*$/, "").match(/\d+(\.\d+)?/g);
    if (!nums || nums.length < 3) return null;
    return nums.slice(0, 3).map((n) => Math.min(1, Math.max(0, parseFloat(n) / 255)));
  }
  if (value.startsWith("oklch(")) {
    const m = value.match(/^oklch\(\s*([\d.]+)(%?)\s+([\d.]+)\s+([\d.]+)(?:deg)?\s*(?:\/[^)]*)?\)$/);
    if (!m) return null;
    const l = parseFloat(m[1]) / (m[2] ? 100 : 1);
    return oklchToLinearRgb(l, parseFloat(m[3]), parseFloat(m[4])).map(encode);
  }
  return null;
}

function parseLuminance(input) {
  const rgb = parseSrgb(input);
  return rgb ? luminanceOf(rgb) : null;
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

// WCAG crossover, where black and white reach equal contrast: sqrt(1.05 * 0.05) - 0.05 (ADR-0005).
// Non-Negotiable Invariant: getContrastingAccent clamps by this crossover, never the perceptual one.
const WCAG_CROSSOVER = Math.sqrt(1.05 * 0.05) - 0.05;

const toHex = (rgb) => "#" + rgb.map((c) => Math.round(c * 255).toString(16).padStart(2, "0")).join("");

/**
 * Clamps an accent used as a foreground (text, icon, link) to a contrast ratio against its surface.
 * Same algorithm as Apple's `contrastingAccent`: an accent that already reaches `minRatio` comes back
 * unchanged; otherwise it is mixed toward black (light surface) or white (dark surface) in sRGB,
 * by the smallest amount that reaches the ratio. Call it once per colour scheme, with that scheme's surface.
 * Reachability peaks at about 4.58:1 on surfaces near the WCAG crossover, so a higher `minRatio` can
 * resolve to the strongest reachable ink instead.
 * @param {string} accent - Hex, rgb() or oklch() foreground.
 * @param {string} surface - Hex, rgb() or oklch() surface it sits on.
 * @param {number} [minRatio=4.5] - Target WCAG contrast ratio.
 * @returns {string} The accent as given, or a "#rrggbb" clamp of it.
 * @throws {TypeError} For any format that cannot be resolved without a DOM.
 */
export function getContrastingAccent(accent, surface, minRatio = 4.5) {
  const fg = parseSrgb(accent);
  const bg = parseSrgb(surface);
  if (!fg || !bg) {
    throw new TypeError(`getContrastingAccent: unsupported colour "${String(fg ? surface : accent)}". Use #hex, rgb() or oklch().`);
  }
  const yBg = luminanceOf(bg);
  const ratioOf = (rgb) => {
    const y = luminanceOf(rgb);
    return (Math.max(y, yBg) + 0.05) / (Math.min(y, yBg) + 0.05);
  };
  if (ratioOf(fg) >= minRatio) return accent;
  const darker = yBg > WCAG_CROSSOVER;
  const mix = (t) => fg.map((c) => (darker ? c * (1 - t) : c + (1 - c) * t));
  let low = 0;
  let high = 1;
  for (let i = 0; i < 20; i++) {
    const mid = 0.5 * (low + high);
    if (ratioOf(mix(mid)) >= minRatio) high = mid;
    else low = mid;
  }
  return toHex(mix(high));
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

