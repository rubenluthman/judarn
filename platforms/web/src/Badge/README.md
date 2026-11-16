Badge is a small status chip, set as written because a status is a value, not a label. Tag is its keyword sibling.

Use Badge for short states and Tag for keywords. Variants are `neutral` (the default), `solid`, `accent` and `accent-tint`. Neutral badges and tags are wells: `jd-surface-recessed` on the page and `jd-substrate` inside a card. There is no outlined variant; high-contrast modes add an `ink-100` outline.

The consumer provides `children` and, for a Wada color, `accentColor` as a hex, rgb or oklch string. On `accent`, Badge fills with that color and resolves the ink through `getContrastingInk`, so don't set the text color yourself. On `accent-tint`, it mixes 14% of the color with white and keeps `ink-100` text; tints belong to light mode, so dark mode falls back to the neutral well. Without `accentColor`, both accent variants use the page accent.

To use an accent as text, on a link or an icon, call `getContrastingAccent(accent, surface)` once per color scheme with that scheme's surface. It returns the accent unchanged when it reaches 4.5:1 and otherwise mixes it toward black or white, the same as Apple's `contrastingAccent`. Don't hand-mix the accent with ink.
