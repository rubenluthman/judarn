# Judarn color dictionary

Interactive multi-context visual dictionary for the 348 historic Japanese color combinations documented by Sanzo Wada (1883–1967) in *A Dictionary of Color Combinations* (*Haishoku Sōkan*, 1933–1934), calibrated in wide-gamut OKLCh for modern screens.

This tool is an optional add-on, not part of Judarn's core identity ([ADR-0007](../../docs/adr/0007-sanzo-wada-dictionary-explorer-and-mcp-server.md)). Judarn's core contrast guarantees cover only its own surfaces.

## Overview
The Judarn Color Dictionary provides three unified exploration tiers:
1. **Combinations Gallery (348)**: Visual collection landing view displaying all 348 classic combinations with proportional split-color preview swatches, size filtering (`All (348)`, `2 Colors (120)`, `3 Colors (120)`, `4 Colors (108)`), instant search across color names and hex codes, multi-criteria sorting, and persistent favorites.
2. **Live Multi-Context Explorer**: Real-time rendering of any combination simultaneously across 4 foundational Judarn design contexts:
   - **Presentation Slide Master (16:9)**: Historical context on Sanzo Wada and *Haishoku Sōkan* (1933).
   - **Technical Specification Document**: Data sources and licences in a table.
   - **Native App Interface (macOS / iOS)**: Judarn's wide-gamut OKLCh perceptual calibration, squircle geometry, and contrast math.
   - **Web Editorial Hero**: A landing-page hero set in the chosen palette.
3. **All Colors Catalog (159)**: Individual catalog of all 159 historical colors with search and sorting by Index, Name (A – Z), Most combinations, Darkest first, Lightest first, and Hue.

## Color detail inspector
Modal inspection for any color providing large swatch previews, one-click clipboard copying across 5 color spaces (HEX, RGB, CMYK, CIE L*a*b*, and OKLCh), and cross-references to every combination containing the color with direct click-through to the Live Explorer.

## Model context protocol (MCP) server
Judarn includes a local stdio MCP server with no dependencies for AI coding assistants (Claude Desktop, Cursor, Antigravity):
```bash
node tools/wada-explorer/mcp/server.js
```

<!-- vale HouseStyle.Headings = NO -->
### Claude Desktop configuration
<!-- vale HouseStyle.Headings = YES -->
Add to `claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "judarn-color-dictionary": {
      "command": "node",
      "args": ["<path-to-judarn>/tools/wada-explorer/mcp/server.js"]
    }
  }
}
```

### Available tools
- `search_colors`: Search individual colors by keyword, hex, or index.
- `get_color`: Retrieve full specifications (HEX, RGB, CMYK, CIE L*a*b*, OKLCh) for a color.
- `search_combinations`: Filter combinations by size (2, 3, or 4) or color name.
- `get_combination`: Get full details and calibrated OKLCh values for a combination by ID (1–348).
- `random_combination`: Get a random historic harmony for inspiration.
- `export_tokens`: Export any combination as Design Tokens Format Module 2025.10 JSON, CSS variables, or Tailwind CSS theme.

## Usage
Open `tools/wada-explorer/index.html` in any modern web browser or run:
```bash
open tools/wada-explorer/index.html
```

## Attribution & provenance
- Original harmonies by **Sanzo Wada** (*A Dictionary of Color Combinations*, 1930s, Public Domain).
- Digitized color dataset based on the open-source archive by **Matt DesLauriers** ([mattdesl/dictionary-of-colour-combinations](https://github.com/mattdesl/dictionary-of-colour-combinations)), MIT License.
- Harmonic reference: [espectro.dev](https://espectro.dev) by Labro.
