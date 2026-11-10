# Judarn Document Starter (Google Docs & Print Ready)

Vertical-page template for specifications and project documentation.

> [!NOTE]
> This is a local variant of Judarn, not a statement of its rules. Google Docs needs its fonts and colors chosen beforehand, so IBM Plex and Sanzo Wada Combination 119 are set here. They can change at any time, and a change here affects only these files.

## Features & Template Choices
- **Canvas**: Standard Letter ($8.5 \times 11\,\text{in}$, $1\,\text{in}$ margins) calibrated for screen reading, direct copy-pasting, and clean print-to-PDF generation (`@media print`).
- **Typography**: Authored with an alternating **IBM Plex Serif** (Title 28 pt, Heading 2 16 pt) and **IBM Plex Sans** (Heading 1 20 pt, Heading 3 13 pt, Subtitle 13 pt, 11 pt Normal text) hierarchy paired with **IBM Plex Mono** (9.5 pt block / 11 pt inline) for tabular numbers.
- **Black text and spacing**: Body text is `#000000` with single line leading and 8 pt after each paragraph.
- **Structural Wada Harmony**: Employs Sanzo Wada Combination 119 (Light Glaucous Blue `#a5c8d1` and Dark Tyrian Blue `#12354e`) for callout borders, status badges, and table header boundaries.
- **Tabular Alignment**: Task ownership matrices pair left-aligned text with right-aligned dates and status pills.
- **No page furniture**: No running headers, footers, confidentiality stamps, or watermarks.

## Quickstart: How to Use in Google Docs

### Option 1: Load Native Template (.docx)
1. Open [`Judarn-Document-Template.docx`](Judarn-Document-Template.docx) directly in Google Drive / Google Docs.
2. Go to **Format** $\rightarrow$ **Paragraph styles** $\rightarrow$ **Options** $\rightarrow$ **Save as my default styles**.
3. All new documents will default to this typography hierarchy and vertical rhythm.

### Google Docs Invariants & Workarounds

- **List Item Spacing**: Google Docs assigns the **Normal text** style to list items. When Normal text has an 8 pt trailing margin, applying Normal text across lists adds 8 pt after every bullet point. To keep lists compact:
  1. Highlight the list items.
  2. Select **Format** $\rightarrow$ **Line & paragraph spacing** $\rightarrow$ **Remove space after list item** (or set **Custom spacing** to Before: 0 pt, After: 0 pt).
  3. Keep the 8 pt space after only on the final item of the list to separate it from the following paragraph.
  4. Never check **"Don't add space between paragraphs of the same style"** on Normal text, as this strips the intentional 8 pt clearance between standard prose paragraphs.
- **Preventing Creeping Indents**: Google Docs samples full paragraph geometry (including left and first-line indents) when updating styles. If your cursor sits in an indented list item or callout when clicking **Update 'Normal text' to match**, that indent becomes permanent. Prior to updating Normal text:
  1. Inspect **Format** $\rightarrow$ **Align & indent** $\rightarrow$ **Indentation options**.
  2. Ensure **Left**: `0`, **Right**: `0`, and **Special indent**: `None`.
  3. Verify ruler indent markers sit flush at `0.0`.
- **Clearing Title Paragraph Borders**: If upgrading from an older Google Docs default style that has a sticky bottom line under Title:
  1. Place the cursor in the Title.
  2. Open **Format** $\rightarrow$ **Paragraph styles** $\rightarrow$ **Borders and shading**.
  3. Deselect the **Bottom border** icon (or set **Border width** to `0 pt`) and click **Apply**.
  4. With the cursor in Title, select **Format** $\rightarrow$ **Paragraph styles** $\rightarrow$ **Title** $\rightarrow$ **Update 'Title' to match**.
  5. Select **Format** $\rightarrow$ **Paragraph styles** $\rightarrow$ **Options** $\rightarrow$ **Save as my default styles**.

### Option 2: Print / Save to PDF
1. Open [`starter-google-doc.html`](starter-google-doc.html) in Chrome or Safari.
2. Open Print (`Cmd+P`), set destination to **Save as PDF**, paper size to **Letter**, and disable headers and footers.
3. Save your finished document.

### Option 3: Reformat via LLM Prompt
To reformat existing unformatted or draft prose directly into a Judarn document via an LLM chatbot, use the copy-paste prompt in [`prompt-implement-judarn.md`](prompt-implement-judarn.md) (also synchronized with the Google Drive document `Prompt to implement Judarn`).

## Customizing Palettes
To switch to a different Sanzo Wada color harmony, update the `--accent` variables in the `:root` block of [`starter-google-doc.html`](starter-google-doc.html) using any palette exported from `tools/wada-explorer/index.html`.
