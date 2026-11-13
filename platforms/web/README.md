# `@judarn/ui`

React components and CSS tokens for the Judarn design system, with colors in OKLCh and a fixed 8 px spacing grid.

```bash
npm install --save-exact @judarn/ui
```

```jsx
import "@judarn/ui/styles";
import { Button, Card } from "@judarn/ui";

export function Status() {
  return (
    <Card eyebrow="System status" title="Operational">
      <Button variant="primary">View metrics</Button>
    </Card>
  );
}
```

`react` 18 or later is the only peer dependency. The package ships compiled ESM and CommonJS. Other entry points: `@judarn/ui/colors` (CSS custom properties only), `@judarn/ui/theme` and `@judarn/ui/tailwind` (Tailwind v4), and `@judarn/ui/sdui` (server-driven UI).

## Class names

`@judarn/ui/styles` and `@judarn/ui/components.css` style only `jd-` classes (`jd-btn`, `jd-badge`, `jd-tag`, `jd-card`, `jd-field`, `jd-navbar`, `jd-footer`, `jd-table`, `jd-matrix`, `jd-lockup`), so a project's own `.btn` or `.card` stays its own. Buttons, badges, and tags are set apart by fill, with a transparent border that high-contrast modes turn into an outline.

## Accent colors

A project that sets its own `--jd-accent` also sets `--jd-accent-ink` to `#000000` or `#ffffff`, whichever stays readable on that fill. Accent buttons and badges read the resolved `--accent-ink`. The `--jd-accent*` hooks have no default, so a value set on `:root` carries into nested scopes.

## Guarantees and the checks behind them

| Guarantee | Check |
| :--- | :--- |
| `ink100` meets 7:1 on every surface and appearance; `ink60` and `signalError` meet 4.5:1, and 7:1 in high-contrast appearances | `scripts/verify-contrast.js` (run by `npm test`) |
| Components render the markup their contracts describe | `scripts/verify-unit.js` |
| A page with `data-theme="dark"` gets the dark accent ink | `scripts/verify-visual.js` |
| Server-driven payloads accept only allowlisted props and reject `style`, `className`, and `dangerouslySetInnerHTML` | `scripts/verify-sdui.js` |

White ink on mid-tone fills can fall below 4.5:1 by design, and paragraph line spacing does not meet WCAG SC 1.4.8. The repository README explains both.

## Development

```bash
npm ci
npm test
```

## License

MIT © 2026 Ruben Luthman. The package includes the LICENSE file.
