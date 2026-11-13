Button triggers an action. It is set apart by fill alone, and hover inverts the fill.

Use `primary` for the main action in a view, `secondary` for supporting actions, `ghost` for quiet inline actions and `accent` when the action should carry the page's accent. Secondary is a well: `jd-surface-recessed` on the page and `jd-substrate` inside a card. There is no outlined variant; high-contrast modes add an `ink-100` outline.

The consumer provides `children` as a sentence-case label, plus `variant`, `size` (`sm`, `md`, `lg`), `block`, `disabled`, `type` and `onClick`.

The `accent` text takes `--accent-ink`, a fixed ink that defaults to white. When you set `--jd-accent`, set `--jd-accent-ink` to `getContrastingInk` of the same color. Don't use uppercase labels.
