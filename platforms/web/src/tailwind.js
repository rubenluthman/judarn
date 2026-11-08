/**
 * Judarn Design Foundation – Tailwind CSS Plugin & Preset
 * Generated from tokens/judarn-tokens.json  –  do not edit directly.
 */
module.exports = function judarnTailwindPlugin({ addBase, theme }) {
  // Do not override global border radius to 0px; adhere to ADR-0002
};

module.exports.theme = {
  extend: {
    colors: {
      substrate: 'var(--jd-substrate)',
      'surface-elevated': 'var(--jd-surface-elevated)',
      'surface-recessed': 'var(--jd-surface-recessed)',
      'ink-100': 'var(--jd-ink-100)',
      'ink-60': 'var(--jd-ink-60)',
      'ink-30': 'var(--jd-ink-30)',
      'signal-error': 'var(--jd-signal-error)',
      accent: 'var(--accent)',
      'accent-fg': 'var(--accent-fg)',
      'accent-ink': 'var(--accent-ink)',
      paper: 'var(--jd-substrate)',
    },
    fontFamily: {
      display: 'var(--jd-font-display)',
      body: 'var(--jd-font-body)',
      data: 'var(--jd-font-data)',
      mono: 'var(--jd-font-mono)',
    },
    spacing: {
      half: 'var(--jd-space-half)',
      '1': 'var(--jd-space-1)',
      '2': 'var(--jd-space-2)',
      '3': 'var(--jd-space-3)',
      '4': 'var(--jd-space-4)',
      touch: 'var(--jd-space-touch)',
      '6': 'var(--jd-space-6)',
      '8': 'var(--jd-space-8)',
      '12': 'var(--jd-space-12)',
      '16': 'var(--jd-space-16)',
    },
    borderWidth: {
      rule: 'var(--jd-rule)',
      'rule-bold': 'var(--jd-rule-bold)',
      'rule-heavy': 'var(--jd-rule-heavy)',
    },
    borderRadius: {
      subtle: 'var(--jd-radius-subtle, 6px)',
      control: 'var(--jd-radius-control, 10px)',
      card: 'var(--jd-radius-card, 16px)',
      badge: 'var(--jd-radius-badge, 9999px)',
      DEFAULT: 'var(--jd-radius-control, 10px)',
      sm: 'var(--jd-radius-subtle, 6px)',
      md: 'var(--jd-radius-control, 10px)',
      lg: 'var(--jd-radius-card, 16px)',
      xl: 'var(--jd-radius-card, 16px)',
      '2xl': 'var(--jd-radius-card, 16px)',
      full: 'var(--jd-radius-badge, 9999px)',
    },
  },
};
