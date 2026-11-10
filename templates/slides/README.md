# Judarn Slide Starters (Google Slides & Presentation Ready)

16:9 presentation slide layouts.

> [!NOTE]
> This is a local variant of Judarn, not a statement of its rules. Slide tools need their fonts and colors chosen beforehand, so IBM Plex and Sanzo Wada Combination 119 are set here. They can change at any time, and a change here affects only these files.

## Starters
- [`Judarn-Presentation-Template.pptx`](Judarn-Presentation-Template.pptx): 10-slide PowerPoint file for Google Slides and Keynote.
- [`starter-deck.html`](starter-deck.html): interactive HTML deck with all ten archetypes.
- [`starter-focus-dark.html`](starter-focus-dark.html): dark focus headline slide.
- [`starter-data-light.html`](starter-data-light.html): light technical data slide.

## Features & Archetypes
- **Canvas Aspect Ratio**: Strict 16:9 widescreen (16 × 9 in, 1920 × 1080 px on screen) print-calibrated via `@page { size: 16in 9in landscape; margin: 0; }`.
- **Typography**: Built using an aligned three-family hierarchy (modeled on the Google Docs document specification):
  - **IBM Plex Serif**: Reserved sparsely for Cover Titles, Section Divider Titles, Pullquotes, and H2 Column Headers for editorial authority.
  - **IBM Plex Sans**: Primary slide titles (H1), upright subtitles (`#55585B` / `#8AA3BA`), structural body, card titles, and status pills.
  - **IBM Plex Mono**: Tabular figures (`tabular-nums`), KPI metrics, code blocks, and data grids.
- **Color Scheme**: Rooted in **Sanzo Wada Combination 119**:
  - Dark Tyrian Blue (`#12354e`) as deep substrate and primary structural anchor.
  - Light Glaucous Blue (`#a5c8d1`) as focal highlight, indicator bar, and metric color.
  - Pure Black (`#000000`) and Crisp White (`#FFFFFF`) for maximum contrast.
  - Slate Grey (`#55585B`) and Muted Grey (`#747775`) for secondary metadata and subtitles.
- **Slide numbers**: Omitted by default (toggleable via `# Numbers` pill or `#` key in HTML). Surfaces and cards are grouped strictly by background fill contrast (`#F8F8F8` or `#F0F4F8` on `#FFFFFF`, or subtle deep navy `#0D2538` on `#12354e`), with zero perimeter outline strokes.

---

## 10 Production Slide Archetypes

1. **Cover / Focus Headline Slide (Dark)**: Uppercase tracked eyebrow (`#a5c8d1`), 40 pt IBM Plex Serif title with inline Light Glaucous Blue accent run, upright IBM Plex Sans subtitle in `#8AA3BA`, and a 3-figure row (`348 Combinations`, `159 Colors`, `2 Compiled hosts`).
2. **Section Divider / Chapter Break (Dark)**: Oversized monospace chapter index (`01` in `#a5c8d1`), 34 pt IBM Plex Serif chapter title, and 15 pt scoping summary in `#8AA3BA`.
3. **Executive Narrative & Textual Information (Light)**: Eyebrow label, 24 pt Sans title, alternating Serif H2 heading (`col-h2`), 2-column context and decision blocks, and Wada callout with 3 pt `#a5c8d1` left bar.
4. **Three-Pillar Architecture Grid (Light)**: 3 surface cards (`#F8F8F8`, no perimeter border), monospace indices (`01`, `02`, `03` in `#a5c8d1`), Sans bold headers, and 11 pt body text.
5. **Editorial Pullquote (Light)**: 24 pt IBM Plex Serif quote with 6 pt Light Glaucous Blue left rule, upright 14 pt Sans attribution and role badge in Slate Grey (`#55585B`).
6. **Impact Pullquote (Dark)**: 24 pt IBM Plex Serif quote in `#FFFFFF` with Light Glaucous Blue left rule, attribution in `#a5c8d1`, and subtitle in `#8AA3BA`.
7. **Dense Tabular Data Matrix (Light)**: Full-width 5-column package matrix, uppercase bold header with 1 px top rule and 2 px bottom rule, IBM Plex Mono tabular numbers, and right-aligned Wada status pills (Available green `#137333`, Parked grey `#55585B`).
8. **Figures Grid (Dark)**: 4-card metric grid with massive 38 pt IBM Plex Mono digits in `#a5c8d1`, tracked uppercase labels, and context details.
9. **Technical Architecture & Code Block (Light)**: 2-column layout pairing architectural constraints with an IBM Plex Mono code block featuring a `#12354e` indicator rule and `#F8F8F8` background.
10. **Two-Way Trade-off Comparison (Light)**: 2 contrasting substrate cards: "Conventional UI Libraries" vs "Judarn Design Foundation", comparing paradigms without perimeter strokes.

---

## Quickstart: How to Use in Google Slides

### Option 1: Direct Presentation Upload (Recommended)
1. Open Google Drive in your browser.
2. Drag and drop [`Judarn-Presentation-Template.pptx`](Judarn-Presentation-Template.pptx) into Google Drive.
3. Right-click the file and select **Open with**, then **Google Slides**.
4. All 10 slides and formatting are immediately available to duplicate, edit, and present.

### Option 2: Import Slides into an Existing Deck
1. Open any existing Google Slides presentation.
2. Click **File**, then **Import slides**.
3. Under the **Upload** tab, select [`Judarn-Presentation-Template.pptx`](Judarn-Presentation-Template.pptx).
4. Select all slides and click **Import slides**. Choose "Keep original theme" to preserve the Judarn typography and Wada colors.

### Option 3: Interactive HTML Deck & Print to PDF
1. Open [`starter-deck.html`](starter-deck.html) in Chrome or Safari.
2. Navigate slides using keyboard arrow keys (Left/Right), Space, or the floating control pill. Toggle Fullscreen with `F`.
3. Press `Cmd+P`, select **Landscape**, set margins to **None**, and choose **Save as PDF** for print-ready 16:9 slides.
