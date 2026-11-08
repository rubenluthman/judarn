# Accent colors and the Wada dictionary

Sanzo Wada's *Haishoku Sōkan* holds 348 color combinations built from 159 colors. In this design system they are a source of accent colors, and the default when the owner gives none. Colors the owner gives, through the project's profile or the request, are equally valid and take precedence. Judarn itself stays neutral: the combinations are not core tokens, and no combination is a default, standard or house palette.

## Owner colors

- When the owner gives colors, use them in place of a combination. Add Wada colors only when the owner asks.
- Measure each owner color as the dictionary is measured: its lowest ratio against `jd-substrate` and `jd-surface-elevated` in each theme, its `getContrastingInk` ink and that ink's ratio.
- Give each color the tier its ratio meets, and use it for that tier's uses. Report every shortfall to the owner in one line, then use the color as asked.

## Choosing a combination

Choose a combination only when the owner gives no colors.

1. If the request names a combination, use it, whatever its tier. Report any ratio it misses.
2. Otherwise read `assets/Wada/wada-accents.json` and choose one for this artifact's subject. Choose afresh each time. Never settle on one combination out of habit.
3. Choose from the tier that fits the use. The tiers apply to any accent color:

| Tier | Combinations | Holds | Use for |
| --- | --- | --- | --- |
| `text` | 200 | 4.5:1 on the page surfaces in light and dark | Accent text, eyebrows, links, marks |
| `mark` | 90 | 3:1 in light and dark, not 4.5:1 | Icons, chart marks, focus rings, large text at 24px or more |
| `named` | 58 | Misses 3:1 in at least one theme | Only when the request names it |

4. Say which combination you used in one line when you hand over the artifact.

## Reading the data

Each entry in `wada-accents.json` lists its `colors` with `name`, `hex` and four values:

- `light` and `dark`: the lowest contrast ratio against `jd-substrate` and `jd-surface-elevated` in that theme.
- `ink`: the result of `getContrastingInk` for that fill.
- `inkRatio`: that ink's contrast on the fill.

`wada-accents.json` is a measured copy of the dictionary, kept in the design system's `assets/Wada/` folder. No script in this repository generates it. It is derived from `wada-colors.json` by measuring each color against `jd-substrate` and `jd-surface-elevated` in light and dark and resolving `getContrastingInk` at the 0.50 perceptual crossover, then grouping combinations into the three tiers. Regenerate it by repeating that measurement whenever the surface or ink tokens change.

`wada-catalog.json` is the plain combination list. `wada-colors.json` holds each color's full specification: HEX, RGB, CMYK, CIE L\*a\*b\* and the combinations it appears in.

## Applying it

- Pick each theme's accent from the colors whose ratio holds in that theme. The accent may differ between light and dark. In #119, Dark Tyrian Blue `#12354e` holds 12.0:1 in light but only 1.2:1 in dark, and Light Glaucous Blue `#a5c8d1` is the reverse, so they swap.
- Set `--jd-accent`, `--jd-accent-fg`, `--jd-accent-ink` and `--jd-accent-2` on `:root`, once per theme. `--jd-accent-ink` is the static ink on an accent fill, `#000000` or `#ffffff` by the 0.50 perceptual crossover. Set them on `:root`, or on a theme-scope element (`[data-theme]`, `.palette-*`) to override that subtree; a value on `:root` carries into nested scopes. On any other element they have no effect on `--accent`, which every theme scope resolves itself.
- Use the accent colors as fills for slide panels, chart series, badges and media. Set text on those fills in the color's `ink`, and never in `jd-ink-60`.
- Keep page backgrounds and running text in the neutrals. `jd-ink-60` holds 4.5:1 on only 14 of the 159 colors.
- Keep `jd-signal-error` for errors, even when an accent color is red.
- Use all of the chosen colors, or fewer. Add other colors only when the owner gives them.

## Light box tints

Boxes and cards on the light `jd-substrate` may take a light tint of one of the artifact's accent colors, from the owner or the combination, instead of `jd-surface-elevated`. This needs no separate request.

- Keep the tint at L 0.968 – 0.980 at the color's hue, with chroma of 0.04 or less. For a tint of Light Glaucous Blue, use `oklch(0.975 0.012 215)`.
- Mixing 10% – 18% of the color with white in OKLCh is another route, only when the result stays in that lightness range. A dark color leaves it: an 18% mix keeps `jd-ink-60` at 4.5:1 on only 76 of the 159 colors.
- Set text on a tint in `jd-ink-100` and `jd-ink-60`, not in the color's `ink`. A tint is a box, not a filled surface. Within the range above, `jd-ink-60` holds 4.7:1 or better on every dictionary hue. Check an owner's hue the same way.
- Check accent text on the tint in each use. The `light` values in `wada-accents.json` measure only `jd-substrate` and `jd-surface-elevated`.
- Keep tints to light mode. In dark mode boxes stay on `jd-surface-elevated`.
- Never replace the substrate with a tint. A full harmony theme stays opt-in, for when the owner asks for one.

## Filled surfaces

`ink` follows the white-ink preference in the brand book, so a low `inkRatio` is expected on mid-tone fills. Use the ink as given and report the ratio. Never swap it for a better number.
