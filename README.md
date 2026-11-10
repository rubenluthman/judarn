# Judarn

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

A personal design system: general rules for everything I make, plus specific rules for each platform.

Judarn sets colors, spatial cadence, and typography, leaving curves, depth, and touch mechanics to each host. [`docs/DESIGN.md`](docs/DESIGN.md) holds the rules, and native packages cover Apple, web, and Android.

---

## Design rules

### 1. Perceptual OKLCh color model
Every color token is defined in OKLCh (`oklch(L C H)`) and resolves across standard and high-contrast light and dark schemes:
- **Substrate / Paper**: `#FFFFFF` (light), `#171717` (dark)
- **Surface Elevated**: `#F8F8F8` (light), `#222222` (dark)
- **Primary Ink (`ink100`)**: `#020202` (light), `#F8F8F8` (dark) with a contrast of at least 15:1 (AAA)
- **Secondary Ink (`ink60`)**: At least 4.8:1 (AA), and AAA under high-contrast modes
- **Signal Error (`signalError`)**: At least 4.5:1 (AA), and AAA under high-contrast modes

### 2. 8pt macro grid / 4pt micro subgrid
- **Micro subgrid** (`4pt`): Typographic leading, hairline offsets, and micro cell insets.
- **Touch target floors**: `44pt` on Apple, as in Apple's HIG; the tokens also carry the `48dp` floor of Android Material Design 3.
- **Macro grid** (`8pt` increments): Standard margin and card padding progression (`8`, `16`, `24`, `32`, `48`, `64`, `96`, `128`).

### 3. Native platform geometry
Judarn never fights platform curves or physics:
- **Apple (SwiftUI)**: Native continuous squircles (`RoundedRectangle(cornerRadius: 16, style: .continuous)`), system materials (`.regularMaterial`), and spring transitions.
- **web (React / CSS)**: CSS custom properties, system font slots, and semantic tokenized radii.

### 4. Tabular density & surface contrast
- **Surface Hierarchy**: Grouping is achieved exclusively through background fill contrast (`surfaceElevated` or a light accent tint on `substrate`). Perimeter borders and overlays around cards are prohibited.
- **Tabular Figures**: Numeric data uses monospaced digit formatting (`.monospacedDigit()`, `.t-data`) with zero-width space baseline preservation. Hairlines (`rule = 1pt`) belong only within data matrices.

---

## Components & tools

- **Design Tokens**: Tokens for color, spatial cadence, and typography available as native packages for Apple (SwiftUI) and web (React / CSS), alongside the AI reference in [`docs/DESIGN.md`](docs/DESIGN.md).
- **Judarn Color Dictionary & MCP Server** (optional add-on): Curated Japanese color harmonies derived from Sanzo Wada's 1930s dictionary (*Haishoku Sōkan*), calibrated in wide-gamut OKLCh. The colour data derives from Matt DesLauriers' [dictionary-of-colour-combinations](https://github.com/mattdesl/dictionary-of-colour-combinations) (MIT), itself built on Dain M. Blodorn Kim's dataset; the licence sits in [`tools/wada-explorer/data/LICENSE`](tools/wada-explorer/data/LICENSE). Browse all 348 combinations and 159 individual colors in an interactive combinations gallery and multi-context previewer ([`tools/wada-explorer/`](tools/wada-explorer/README.md)), with a local Model Context Protocol (MCP) server for AI coding assistants.
- **Presentation & Document Starters**: Local variants of Judarn for Google Docs, Slides, Word, and PowerPoint ([`templates/`](templates/docs/README.md)). Formats with pre-selected IBM Plex typography and Wada harmonies for document and deck authoring:
  - `templates/slides/`: 16:9 presentation slide templates covering dark focus headline and light technical data archetypes.
  - `templates/docs/`: Vertical letter specification template for group projects and architecture decisions, copy-pasteable into Google Docs and calibrated for PDF export.
- **Documentation & Native Support**: DocC documentation catalog for Apple platforms, and npm package distribution for web applications. Android is parked and lives in the owner's offline Git bundle of the pre-release history ([ADR-0001](docs/adr/0001-design-tokens-are-the-single-source-of-truth.md)).

---

## Monorepo topology

```text
judarn/
├── tokens/                     # Design Tokens Format Module 2025.10
│   ├── judarn-tokens.json      # Foundation set
│   ├── judarn.resolver.json    # Resolver: foundation plus one colour context per appearance
│   └── modes/                  # Colour values: light, dark, and high-contrast overrides
├── platforms/
│   ├── apple/                  # Native SwiftUI package (iOS 17+, macOS 14+)
│   │   ├── Sources/Judarn/
│   │   └── Tests/JudarnTests/  # Swift Testing test suite
│   └── web/                    # @judarn/ui React components & CSS
│       ├── src/
│       └── styles/
├── docs/                       # Architecture decisions and generated DESIGN.md for AI coding tools
├── templates/                  # Presentation & document starters
│   ├── docs/                   # 8.5 × 11 in vertical specification starter
│   └── slides/                 # 16:9 dark focus & light data starters
├── tools/                      # Judarn Color Dictionary & MCP server
│   └── wada-explorer/          # 348 combinations gallery, 159 colors & MCP server
├── scripts/                    # Token compiler and verification scripts
├── Package.swift               # Root SwiftPM manifest
├── ARCHITECTURE.md             # System architecture
├── ROADMAP.md                  # Roadmap
├── CHANGELOG.md                # Release history
└── AGENTS.md                   # CLI workflows & verification suites
```

---

## Quickstart

Judarn is in beta. The Apple package integrates through SwiftPM from GitHub. The web package is published to npm as `@judarn/ui`.

### Apple native (SwiftUI)

Add Judarn to your `Package.swift` dependencies:

```swift
dependencies: [
    .package(url: "https://github.com/rubenluthman/judarn.git", branch: "main")
]
```

Consume tokens and components:

```swift
import Judarn
import SwiftUI

struct MetricCard: View {
    var body: some View {
        JudarnCard(eyebrow: "Revenue", title: "$124,500") {
            Text("Q3 Target Achieved")
                .font(JudarnTypography.small)
                .foregroundStyle(JudarnColors.ink60)
        }
    }
}
```

### Web (React & CSS)

Install `@judarn/ui` from the npm registry and pin an exact version ([ADR-0013](docs/adr/0013-apps-consume-judarn-ui-from-the-public-npm-registry.md)):

```bash
npm install --save-exact @judarn/ui
```

To work on Judarn and an app together, use `npm link` or `npm install --no-save <path>`; never commit a `file:` or `link:` specifier.

Import styles and components:

```tsx
import "@judarn/ui/styles";
import { Card, Button, DataMatrix } from "@judarn/ui";

export function Dashboard() {
  return (
    <Card eyebrow="System status" title="Operational">
      <Button variant="primary">View Metrics</Button>
    </Card>
  );
}
```

---

## WCAG accessibility matrix

| Pairing | Normal appearance | High-contrast appearance | Standard |
| :--- | :--- | :--- | :--- |
| `ink100` on `substrate` | at least 16.9:1 | at least 16.9:1 | WCAG 2.2 AAA (7.0:1) |
| `ink100` on `surfaceElevated` | at least 15.0:1 | at least 15.0:1 | WCAG 2.2 AAA (7.0:1) |
| `ink60` on `substrate` | at least 5.5:1 | at least 7.0:1 | AA (4.5:1), AAA under high contrast |
| `signalError` on `substrate` | at least 5.6:1 | at least 7.0:1 | AA (4.5:1), AAA under high contrast |

Two accepted trade-offs sit outside this matrix. White ink on a mid-tone fill can fall to 1.91:1 at the crossover, below the 4.5:1 AA floor for small text, because Judarn prefers white ink to what contrast math alone suggests. Paragraph line spacing is tighter than 1.5, so Judarn text does not meet WCAG 2.2 SC 1.4.8, a AAA criterion.

---

## Testing

```bash
# Apple Native (SwiftPM)
swift test

# Web (@judarn/ui)
npm --prefix platforms/web test
```

---

## License

MIT © 2026 Ruben Luthman. See [LICENSE](LICENSE) for details.
