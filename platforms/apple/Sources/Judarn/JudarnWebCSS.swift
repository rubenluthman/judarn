/// CSS custom properties of the Judarn web tokens, for Apple hosts that render HTML (a WebKit preview, PDF export).
/// Generated from tokens/judarn-tokens.json  –  do not edit directly.
public enum JudarnWebCSS {
    /// Only custom-property declarations inside `:root`, `[data-theme]`, `[data-contrast]`, `.palette-dark`
    /// and the color-scheme and contrast media queries. It styles no element, so a host page can add it
    /// to its style sheet and refer to `var(--jd-…)`.
    public static let variables: String = """
    :root {
      --jd-space-half: 4px;
      --jd-space-1: 8px;
      --jd-space-2: 16px;
      --jd-space-3: 24px;
      --jd-space-4: 32px;
      --jd-space-touch: 44px;
      --jd-space-6: 48px;
      --jd-space-8: 64px;
      --jd-space-12: 96px;
      --jd-space-16: 128px;
      --jd-pad-default: 16px;
      --jd-pad-large: 32px;
      --jd-gap-tight: 8px;
      --jd-gap-normal: 16px;
      --jd-rule: 1px;
      --jd-rule-bold: 2px;
      --jd-rule-heavy: 4px;
      --jd-measure-body: 65ch;
      --jd-measure-compact: 45ch;
      --jd-measure-sidebar: 260px;
      --jd-radius-subtle: 6px;
      --jd-radius-control: 10px;
      --jd-radius-card: 16px;
      --jd-radius-badge: 9999px;
      --space-half: var(--jd-space-half);
      --space-1: var(--jd-space-1);
      --space-2: var(--jd-space-2);
      --space-3: var(--jd-space-3);
      --space-4: var(--jd-space-4);
      --space-touch: var(--jd-space-touch);
      --space-6: var(--jd-space-6);
      --space-8: var(--jd-space-8);
      --space-12: var(--jd-space-12);
      --space-16: var(--jd-space-16);
      --pad-default: var(--jd-pad-default);
      --pad-large: var(--jd-pad-large);
      --gap-tight: var(--jd-gap-tight);
      --gap-normal: var(--jd-gap-normal);
      --rule: var(--jd-rule);
      --rule-bold: var(--jd-rule-bold);
      --rule-heavy: var(--jd-rule-heavy);
      --measure-body: var(--jd-measure-body);
      --measure-compact: var(--jd-measure-compact);
      --measure-sidebar: var(--jd-measure-sidebar);
      --radius-subtle: var(--jd-radius-subtle);
      --radius-control: var(--jd-radius-control);
      --radius-card: var(--jd-radius-card);
      --radius-badge: var(--jd-radius-badge);
      --jd-substrate: oklch(1.000 0.000 0);
      --jd-surface-elevated: oklch(0.980 0.000 0);
      --jd-surface-recessed: oklch(0.958 0.000 0);
      --jd-ink-100: oklch(0.080 0.000 0);
      --jd-ink-60: oklch(0.520 0.005 92);
      --jd-ink-30: oklch(0.780 0.005 92);
      --jd-ink100: var(--jd-ink-100);
      --jd-ink60: var(--jd-ink-60);
      --jd-ink30: var(--jd-ink-30);
      --jd-signal-error: oklch(0.530 0.214 25);
      --jd-signal-error-hc: oklch(0.415 0.168 25);
      --jd-black: var(--jd-ink-100);
      --jd-white: var(--jd-surface-elevated);
      --jd-paper: var(--jd-substrate);
      --jd-line: var(--jd-ink-100);
      --black: var(--jd-black);
      --white: var(--jd-white);
      --paper: var(--jd-paper);
      --ink-100: var(--jd-ink-100);
      --ink-60: var(--jd-ink-60);
      --ink-30: var(--jd-ink-30);
      --signal-error: var(--jd-signal-error);
      --line: var(--jd-line);
      --accent: var(--jd-accent, var(--jd-ink-100));
      --accent-fg: var(--jd-accent-fg, var(--accent));
      --accent-ink: var(--jd-accent-ink, #ffffff);
      --accent-2: var(--jd-accent-2, oklch(0.520 0.005 92));
      --jd-primary: var(--accent);
      --jd-secondary: var(--jd-ink-60);
      --jd-tertiary: var(--jd-ink-30);
      --primary: var(--jd-primary);
      --secondary: var(--jd-secondary);
      --tertiary: var(--jd-tertiary);
      --jd-fg1: var(--jd-ink-100);
      --jd-fg2: var(--jd-ink-60);
      --jd-fg3: var(--jd-ink-30);
      --jd-bg1: var(--jd-substrate);
      --jd-bg2: var(--jd-surface-elevated);
      --fg1: var(--jd-fg1);
      --fg2: var(--jd-fg2);
      --fg3: var(--jd-fg3);
      --bg1: var(--jd-bg1);
      --bg2: var(--jd-bg2);
      --jd-font-sans: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      --jd-font-bold: var(--jd-font-sans);
      --font-sans: var(--jd-font-sans);
      --font-bold: var(--jd-font-bold);
      --jd-font-display: var(--jd-font-sans);
      --jd-font-body: var(--jd-font-sans);
      --jd-font-data: var(--jd-font-sans);
      --jd-font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      --font-display: var(--jd-font-display);
      --font-body: var(--jd-font-body);
      --font-data: var(--jd-font-data);
      --font-mono: var(--jd-font-mono);
      --jd-weight-regular: 400;
      --jd-weight-medium: 500;
      --jd-weight-bold: 800;
      --jd-weight-black: 900;
      --weight-regular: var(--jd-weight-regular);
      --weight-medium: var(--jd-weight-medium);
      --weight-bold: var(--jd-weight-bold);
      --weight-black: var(--jd-weight-black);
      --jd-track-display: -0.02em;
      --jd-track-head: -0.01em;
      --jd-track-body: 0em;
      --jd-track-label: 0.06em;
      --jd-track-micro: 0.08em;
      --track-display: var(--jd-track-display);
      --track-head: var(--jd-track-head);
      --track-body: var(--jd-track-body);
      --track-label: var(--jd-track-label);
      --track-micro: var(--jd-track-micro);
      --jd-size-display: 96px;
      --jd-size-h1: 64px;
      --jd-size-h2: 44px;
      --jd-size-h3: 32px;
      --jd-size-h4: 24px;
      --jd-size-body-lg: 20px;
      --jd-size-body: 16px;
      --jd-size-small: 14px;
      --jd-size-label: 12px;
      --jd-size-micro: 10px;
      --jd-size-data: 14px;
      --jd-size-mono: 12px;
      --size-display: var(--jd-size-display);
      --size-h1: var(--jd-size-h1);
      --size-h2: var(--jd-size-h2);
      --size-h3: var(--jd-size-h3);
      --size-h4: var(--jd-size-h4);
      --size-body-lg: var(--jd-size-body-lg);
      --size-body: var(--jd-size-body);
      --size-small: var(--jd-size-small);
      --size-label: var(--jd-size-label);
      --size-micro: var(--jd-size-micro);
      --size-data: var(--jd-size-data);
      --size-mono: var(--jd-size-mono);
      --jd-lh-display: 96px;
      --jd-lh-h1: 68px;
      --jd-lh-h2: 48px;
      --jd-lh-h3: 36px;
      --jd-lh-h4: 28px;
      --jd-lh-body-lg: 24px;
      --jd-lh-body: 20px;
      --jd-lh-small: 16px;
      --jd-lh-label: 16px;
      --jd-lh-micro: 12px;
      --jd-lh-data: 20px;
      --jd-lh-mono: 16px;
      --lh-tight: 1;
      --lh-head: 1.0625;
      --lh-body: 1.25;
    }

    @media (prefers-color-scheme: dark) {
      :root:not([data-theme="light"]) {
        --jd-substrate: oklch(0.205 0.000 0);
        --jd-surface-elevated: oklch(0.252 0.000 0);
        --jd-surface-recessed: oklch(0.173 0.000 0);
        --jd-ink-100: oklch(0.980 0.000 0);
        --jd-ink-60: oklch(0.720 0.005 92);
        --jd-ink-30: oklch(0.350 0.004 92);
        --jd-signal-error: oklch(0.680 0.200 25);
        --jd-signal-error-hc: oklch(0.762 0.141 25);
        --accent-ink: var(--jd-accent-ink, #000000);
      }
    }

    :root[data-theme="dark"] {
      --accent-ink: var(--jd-accent-ink, #000000);
    }

    [data-theme="dark"],
    .palette-dark {
      --jd-substrate: oklch(0.205 0.000 0);
      --jd-surface-elevated: oklch(0.252 0.000 0);
      --jd-surface-recessed: oklch(0.173 0.000 0);
      --jd-ink-100: oklch(0.980 0.000 0);
      --jd-ink-60: oklch(0.720 0.005 92);
      --jd-ink-30: oklch(0.350 0.004 92);
      --jd-signal-error: oklch(0.680 0.200 25);
      --jd-signal-error-hc: oklch(0.762 0.141 25);
      --jd-ink100: var(--jd-ink-100);
      --jd-ink60: var(--jd-ink-60);
      --jd-ink30: var(--jd-ink-30);
      --jd-black: var(--jd-ink-100);
      --jd-white: var(--jd-surface-elevated);
      --jd-paper: var(--jd-substrate);
      --jd-line: var(--jd-ink-100);
      --black: var(--jd-black);
      --white: var(--jd-white);
      --paper: var(--jd-paper);
      --ink-100: var(--jd-ink-100);
      --ink-60: var(--jd-ink-60);
      --ink-30: var(--jd-ink-30);
      --signal-error: var(--jd-signal-error);
      --line: var(--jd-line);
      --rule: var(--jd-rule);
      --accent: var(--jd-accent, var(--jd-ink-100));
      --accent-fg: var(--jd-accent-fg, var(--accent));
      --accent-2: var(--jd-accent-2, oklch(0.520 0.005 92));
      --accent-ink: var(--jd-accent-ink, #000000);
      --jd-primary: var(--accent);
      --jd-secondary: var(--jd-ink-60);
      --jd-tertiary: var(--jd-ink-30);
      --primary: var(--jd-primary);
      --secondary: var(--jd-secondary);
      --tertiary: var(--jd-tertiary);
      --jd-fg1: var(--jd-ink-100);
      --jd-fg2: var(--jd-ink-60);
      --jd-fg3: var(--jd-ink-30);
      --jd-bg1: var(--jd-substrate);
      --jd-bg2: var(--jd-surface-elevated);
      --fg1: var(--jd-fg1);
      --fg2: var(--jd-fg2);
      --fg3: var(--jd-fg3);
      --bg1: var(--jd-bg1);
      --bg2: var(--jd-bg2);
    }

    [data-theme="light"] {
      --jd-substrate: oklch(1.000 0.000 0);
      --jd-surface-elevated: oklch(0.980 0.000 0);
      --jd-surface-recessed: oklch(0.958 0.000 0);
      --jd-ink-100: oklch(0.080 0.000 0);
      --jd-ink-60: oklch(0.520 0.005 92);
      --jd-ink-30: oklch(0.780 0.005 92);
      --jd-signal-error: oklch(0.530 0.214 25);
      --jd-signal-error-hc: oklch(0.415 0.168 25);
      --jd-ink100: var(--jd-ink-100);
      --jd-ink60: var(--jd-ink-60);
      --jd-ink30: var(--jd-ink-30);
      --jd-black: var(--jd-ink-100);
      --jd-white: var(--jd-surface-elevated);
      --jd-paper: var(--jd-substrate);
      --jd-line: var(--jd-ink-100);
      --black: var(--jd-black);
      --white: var(--jd-white);
      --paper: var(--jd-paper);
      --ink-100: var(--jd-ink-100);
      --ink-60: var(--jd-ink-60);
      --ink-30: var(--jd-ink-30);
      --signal-error: var(--jd-signal-error);
      --line: var(--jd-line);
      --rule: var(--jd-rule);
      --accent: var(--jd-accent, var(--jd-ink-100));
      --accent-fg: var(--jd-accent-fg, var(--accent));
      --accent-2: var(--jd-accent-2, oklch(0.520 0.005 92));
      --accent-ink: var(--jd-accent-ink, #ffffff);
      --jd-primary: var(--accent);
      --jd-secondary: var(--jd-ink-60);
      --jd-tertiary: var(--jd-ink-30);
      --primary: var(--jd-primary);
      --secondary: var(--jd-secondary);
      --tertiary: var(--jd-tertiary);
      --jd-fg1: var(--jd-ink-100);
      --jd-fg2: var(--jd-ink-60);
      --jd-fg3: var(--jd-ink-30);
      --jd-bg1: var(--jd-substrate);
      --jd-bg2: var(--jd-surface-elevated);
      --fg1: var(--jd-fg1);
      --fg2: var(--jd-fg2);
      --fg3: var(--jd-fg3);
      --bg1: var(--jd-bg1);
      --bg2: var(--jd-bg2);
    }

    @media (prefers-contrast: more) {
      :root:not([data-contrast="normal"]),
      [data-theme]:not([data-contrast="normal"]),
      .palette-dark:not([data-contrast="normal"]) {
        --jd-rule: var(--jd-rule-bold);
        --rule: var(--jd-rule-bold);
        --jd-ink-60: var(--jd-ink-100);
        --jd-ink-30: var(--jd-ink-100);
        --jd-signal-error: var(--jd-signal-error-hc);
      }
    }

    :root[data-contrast="high"],
    [data-contrast="high"],
    [data-contrast="high"] [data-theme],
    [data-contrast="high"] .palette-dark,
    [data-theme][data-contrast="high"],
    .palette-dark[data-contrast="high"] {
      --jd-rule: var(--jd-rule-bold);
      --rule: var(--jd-rule-bold);
      --jd-ink-60: var(--jd-ink-100);
      --jd-ink-30: var(--jd-ink-100);
      --jd-signal-error: var(--jd-signal-error-hc);
    }
    """
}
