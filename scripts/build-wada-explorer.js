const fs = require('fs');
const path = require('path');

const catalog = JSON.parse(fs.readFileSync(path.join(__dirname, '../tools/wada-explorer/data/wada-catalog.json'), 'utf8'));
const colors = JSON.parse(fs.readFileSync(path.join(__dirname, '../tools/wada-explorer/data/wada-colors.json'), 'utf8'));
// Resolved, validated Judarn tokens (tokens/judarn.resolver.json), flat view.
const judarnTokens = require('./lib/design-tokens').loadFlatOrThrow();

console.log(`Loaded ${catalog.length} combinations and ${colors.length} individual colors.`);

const countBySize = (size) => catalog.filter((p) => p.colors.length === size).length;

const tokenSubstrate = judarnTokens.color.substrate.light.$value;
const tokenSurfaceElevated = judarnTokens.color.surfaceElevated.light.$value;
const tokenSurfaceRecessed = judarnTokens.color.surfaceRecessed.light.$value;
const tokenInk100 = judarnTokens.color.ink100.light.$value;
const tokenInk60 = judarnTokens.color.ink60.light.$value;
const tokenInk30 = judarnTokens.color.ink30.light.$value;

// Build index.html
const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Judarn Color Dictionary</title>
<style>
  :root {
    /* San Francisco Native Typography Stack */
    --font-sans: -apple-system, BlinkMacSystemFont, "SF Pro", "SF Pro Display", "SF Pro Text", "Segoe UI", Roboto, sans-serif;
    --font-mono: "SF Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    
    /* Judarn Canonical Dynamic OKLCh Neutrals */
    --substrate: ${tokenSubstrate};         /* Pure white substrate */
    --surface: ${tokenSurfaceElevated};           /* Crisp neutral box surface */
    --surface-recessed: ${tokenSurfaceRecessed};  /* Refined neutral track / Sunken well */
    --surface-hover: oklch(0.935 0.000 0);
    
    /* Razor-Sharp Dark Typography */
    --ink-100: ${tokenInk100};           /* Optical black */
    --ink-80: oklch(0.250 0.004 92);           /* High-contrast secondary */
    --ink-60: ${tokenInk60};           /* Secondary dark neutral */
    --ink-30: ${tokenInk30};           /* Hairline / Muted */
    --rule: ${tokenInk30};             /* 1pt tabular hairline */
    
    --btn-primary-bg: ${tokenInk100};    /* Optical black action button */
    --btn-primary-hover: oklch(0.200 0.000 0);
    
    --radius-card: ${judarnTokens.radius.card.$value};
    --radius-control: ${judarnTokens.radius.control.$value};
    --radius-badge: ${judarnTokens.radius.badge.$value};
    
    --space-half: ${judarnTokens.space.half.$value};
    --space-1: ${judarnTokens.space['1'].$value};
    --space-2: ${judarnTokens.space['2'].$value};
    --space-3: ${judarnTokens.space['3'].$value};
    --space-4: ${judarnTokens.space['4'].$value};
  }
  
  html {
    scrollbar-gutter: stable;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: var(--font-sans);
    background-color: var(--substrate);
    color: var(--ink-100);
    line-height: 1.5;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    font-optical-sizing: auto;
    padding-bottom: 80px;
  }

  /* Micro-Typography Utilities */
  .mono-nums {
    font-family: var(--font-mono);
    font-variant-numeric: tabular-nums;
    font-feature-settings: "tnum" 1, "zero" 1;
  }
  .small-caps {
    font-variant-caps: all-small-caps;
    font-feature-settings: "smcp" 1, "c2sc" 1;
    letter-spacing: 0.07em;
    font-weight: 700;
  }

  /* Sticky Top Header */
  header {
    background: rgba(255, 255, 255, 0.94);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border-bottom: 1px solid var(--rule);
    position: sticky;
    top: 0;
    z-index: 50;
    width: 100%;
  }
  .header-inner {
    max-width: 1400px;
    margin: 0 auto;
    padding: 0 var(--space-4);
    height: 64px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  /* Header Left: View Switcher Nav directly in the left spot */
  .view-switch-nav {
    display: flex;
    background: var(--surface-recessed);
    padding: 3px;
    border-radius: var(--radius-control);
    gap: 2px;
  }
  .view-switch-nav .pill-tab {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 14px;
    font-size: 13px;
    font-weight: 600;
    border-radius: 8px;
    cursor: pointer;
    border: none;
    background: transparent;
    color: var(--ink-60);
    transition: all 0.15s ease;
  }
  .view-switch-nav .pill-tab svg {
    opacity: 0.75;
    transition: opacity 0.15s ease;
  }
  .view-switch-nav .pill-tab.active {
    background: var(--surface);
    color: var(--ink-100);
  }
  .view-switch-nav .pill-tab.active svg {
    opacity: 1;
  }

  /* Header Right: Actions */
  .header-actions {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }
  
  .btn {
    appearance: none;
    background: var(--surface-recessed);
    border: none;
    border-radius: var(--radius-control);
    padding: var(--space-1) 14px;
    font-size: 13px;
    font-weight: 600;
    color: var(--ink-100);
    cursor: pointer;
    transition: background 0.15s ease, transform 0.1s ease;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    user-select: none;
  }
  .btn:hover { background: var(--surface-hover); }
  .btn:active { transform: scale(0.98); }
  
  .btn-primary {
    background: var(--btn-primary-bg);
    color: #FFFFFF;
  }
  .btn-primary:hover { background: var(--btn-primary-hover); }
  
  .btn-favorite {
    background: var(--surface);
    border: 1px solid var(--rule);
    color: var(--ink-60);
  }
  .btn-favorite.active {
    background: var(--surface-recessed);
    border-color: var(--ink-60);
    color: var(--ink-100);
  }
  .btn-favorite svg {
    width: 15px;
    height: 15px;
    fill: none;
    stroke: currentColor;
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
    transition: transform 0.15s ease;
  }
  .btn-favorite.active svg {
    fill: var(--ink-100);
    stroke: var(--ink-100);
  }

  select {
    appearance: none;
    background: var(--surface) url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="%234B5360" viewBox="0 0 16 16"><path d="M8 11L3 6h10l-5 5z"/></svg>') no-repeat right 12px center;
    border: 1px solid var(--rule);
    border-radius: var(--radius-control);
    padding: var(--space-1) 34px var(--space-1) 12px;
    font-size: 13px;
    font-weight: 600;
    color: var(--ink-100);
    cursor: pointer;
  }

  /* Main Container */
  .main-container {
    max-width: 1400px;
    margin: 0 auto;
    padding: 0 var(--space-4);
  }

  /* Hero Section */
  .hero-section {
    text-align: center;
    margin: 44px auto 36px auto;
    max-width: 820px;
  }
  .hero-eyebrow {
    font-size: 11px;
    color: var(--ink-60);
    margin-bottom: 10px;
  }
  .hero-title {
    font-size: clamp(34px, 4.8vw, 52px);
    font-weight: 800;
    letter-spacing: -0.035em;
    line-height: 1.1;
    color: var(--ink-100);
    margin-bottom: 14px;
  }
  .hero-subtitle {
    font-size: 17px;
    color: var(--ink-80);
    line-height: 1.5;
    font-weight: 450;
    margin-bottom: 18px;
  }
  .hero-provenance {
    display: inline-flex;
    align-items: center;
    gap: 12px;
    font-size: 12px;
    color: var(--ink-60);
    padding: 6px 18px;
    background: var(--surface);
    border-radius: var(--radius-badge);
  }
  .hero-provenance a {
    color: var(--ink-100);
    font-weight: 600;
    text-decoration: underline;
    text-underline-offset: 2px;
  }

  /* Filter Bars */
  .filter-bar,
  .color-filter-bar {
    background: var(--surface);
    border-radius: var(--radius-card);
    padding: 14px 22px;
    margin-bottom: 28px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2);
    flex-wrap: wrap;
  }
  .filter-group {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .filter-label {
    font-size: 11px;
    color: var(--ink-60);
  }
  .pill-tabs {
    display: flex;
    background: var(--surface-recessed);
    padding: 3px;
    border-radius: 8px;
    gap: 2px;
  }
  .pill-tab {
    padding: 5px 12px;
    font-size: 12px;
    font-weight: 600;
    border-radius: 6px;
    cursor: pointer;
    border: none;
    background: transparent;
    color: var(--ink-60);
  }
  .pill-tab.active {
    background: var(--surface);
    color: var(--ink-100);
  }

  /* Combinations Grid */
  .combinations-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(290px, 1fr));
    gap: var(--space-3);
  }
  .combination-card {
    background: var(--surface);
    border-radius: var(--radius-card);
    padding: 14px;
    cursor: pointer;
    
    display: flex;
    flex-direction: column;
    text-align: left;
    position: relative;
  }
  .combination-card:hover {
  }
  .comb-swatch-box {
    width: 100%;
    aspect-ratio: 16 / 10;
    border-radius: 12px;
    display: flex;
    overflow: hidden;
    box-shadow: inset 0 0 0 1px rgba(0,0,0,0.06);
    margin-bottom: 12px;
  }
  .comb-stripe {
    flex: 1;
    height: 100%;
  }
  .comb-meta-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--space-half);
    padding: 0 2px;
  }
  .comb-title {
    font-size: 14px;
    font-weight: 700;
    letter-spacing: -0.01em;
    color: var(--ink-100);
  }
  .comb-badge {
    font-size: 10px;
    color: var(--ink-60);
    background: var(--surface-recessed);
    padding: 2px 7px;
    border-radius: var(--radius-badge);
  }
  .comb-colors-list {
    font-size: 12px;
    color: var(--ink-60);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    padding: 0 2px;
  }
  .comb-card-fav-btn {
    position: absolute;
    top: 22px;
    right: 22px;
    width: 28px;
    height: 28px;
    border-radius: var(--radius-badge);
    background: rgba(255, 255, 255, 0.88);
    backdrop-filter: blur(8px);
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    opacity: 0;
    transition: opacity 0.15s ease, transform 0.1s ease;
    color: var(--ink-60);
  }
  .combination-card:hover .comb-card-fav-btn,
  .comb-card-fav-btn.active {
    opacity: 1;
  }
  .comb-card-fav-btn:hover {
    transform: scale(1.1);
  }
  .comb-card-fav-btn.active {
    color: var(--ink-100);
  }
  .comb-card-fav-btn svg {
    width: 14px;
    height: 14px;
    fill: none;
    stroke: currentColor;
    stroke-width: 2;
  }
  .comb-card-fav-btn.active svg {
    fill: var(--ink-100);
    stroke: var(--ink-100);
  }

  /* Active Palette Bar in Live Explorer */
  .palette-bar {
    background: var(--surface);
    border-radius: var(--radius-card);
    padding: 20px var(--space-3);
    margin-bottom: var(--space-3);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
    flex-wrap: wrap;
  }
  .palette-meta {
    display: flex;
    align-items: center;
    gap: 14px;
  }
  .palette-number {
    font-size: 26px;
    font-weight: 800;
    letter-spacing: -0.02em;
    color: var(--ink-100);
  }
  .palette-name {
    font-size: 14px;
    color: var(--ink-60);
    font-weight: 500;
  }
  .swatches-strip {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }
  .swatch-card {
    display: flex;
    align-items: center;
    gap: 10px;
    background: var(--substrate);
    padding: 6px 12px 6px 6px;
    border-radius: 8px;
    cursor: pointer;
    transition: background 0.15s ease;
  }
  .swatch-card:hover {
    background: var(--surface-hover);
  }
  .swatch-color {
    width: 32px;
    height: 32px;
    border-radius: 6px;
    box-shadow: inset 0 0 0 1px rgba(0,0,0,0.12);
  }
  .swatch-info {
    display: flex;
    flex-direction: column;
  }
  .swatch-name-row {
    display: flex;
    align-items: center;
    gap: var(--space-half);
  }
  .swatch-name {
    font-size: 11px;
    color: var(--ink-100);
  }
  .swatch-role-tag {
    font-family: var(--font-mono);
    font-size: 10px;
    color: var(--ink-60);
  }

  /* Favorites Drawer Strip */
  .favorites-strip {
    background: var(--surface);
    border-radius: var(--radius-card);
    padding: var(--space-2) 20px;
    margin-bottom: var(--space-3);
    display: none;
  }
  .favorites-strip.has-favorites {
    display: block;
  }
  .fav-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
  }
  .fav-title {
    font-size: 11px;
    color: var(--ink-60);
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .fav-count-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 18px;
    height: 18px;
    padding: 0 6px;
    border-radius: var(--radius-badge);
    background: var(--surface-recessed);
    font-size: 11px;
    font-weight: 700;
    line-height: 1;
    color: var(--ink-80);
  }
  .fav-list {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }
  .fav-item {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    background: var(--substrate);
    border-radius: 8px;
    padding: 6px 10px;
    cursor: pointer;
    transition: all 0.15s ease;
  }
  .fav-item:hover {
    background: var(--surface-hover);
  }
  .fav-mini-swatches {
    display: flex;
    border-radius: 4px;
    overflow: hidden;
  }
  .fav-mini-swatch {
    width: 10px;
    height: 18px;
  }
  .fav-label {
    font-size: 12px;
    font-weight: 700;
    font-family: var(--font-mono);
    color: var(--ink-100);
  }

  /* Grid of Contexts */
  .contexts-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--space-3);
  }
  .context-frame {
    background: var(--surface);
    border-radius: var(--radius-card);
    padding: var(--space-3);
    display: flex;
    flex-direction: column;
  }
  .context-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--space-2);
  }
  .context-title {
    font-size: 11px;
    color: var(--ink-60);
  }
  .context-role-badge {
    font-size: 11px;
    font-family: var(--font-mono);
    color: var(--ink-60);
    background: var(--surface-recessed);
    padding: 3px var(--space-1);
    border-radius: var(--radius-badge);
  }

  /* Stage 1: Slide (16:9) */
  .slide-stage {
    aspect-ratio: 16 / 9;
    width: 100%;
    border-radius: 12px;
    padding: var(--space-4);
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    box-shadow: inset 0 0 0 1px rgba(0,0,0,0.06);
    position: relative;
    overflow: hidden;
  }
  .slide-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .slide-category {
    font-size: 11px;
  }
  .slide-counter {
    font-size: 12px;
    opacity: 0.7;
  }
  .slide-headline {
    font-size: 22px;
    font-weight: 750;
    letter-spacing: -0.02em;
    line-height: 1.35;
    max-width: 90%;
  }
  .slide-bottom {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
  }
  .slide-stat-num {
    font-size: 38px;
    font-weight: 800;
    letter-spacing: -0.03em;
    line-height: 1;
  }
  .slide-stat-lbl {
    font-size: 11px;
    opacity: 0.8;
    margin-top: var(--space-half);
  }
  .slide-tag {
    padding: 6px 14px;
    border-radius: var(--radius-badge);
    font-size: 11px;
  }

  /* Stage 2: Technical Specification Document (Pure White Surface) */
  .doc-stage {
    min-height: 290px;
    width: 100%;
    border-radius: 12px;
    padding: 28px;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    background: var(--substrate);
  }
  .doc-eyebrow {
    font-size: 11px;
    margin-bottom: 6px;
  }
  .doc-title {
    font-size: 18px;
    font-weight: 800;
    margin-bottom: var(--space-1);
    letter-spacing: -0.015em;
    color: var(--ink-100);
  }
  .doc-body {
    font-size: 12.5px;
    line-height: 1.55;
    color: var(--ink-80);
    margin-bottom: 18px;
  }
  .doc-body a {
    color: var(--ink-100);
    font-weight: 600;
    text-decoration: underline;
  }
  .doc-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 11.5px;
  }
  .doc-table th {
    text-align: left;
    padding: 7px 10px;
    font-weight: 700;
    border-bottom: 1px solid var(--rule);
    color: var(--ink-60);
    font-size: 10px;
  }
  .doc-table td {
    padding: 7px 10px;
    border-bottom: 1px solid rgba(0,0,0,0.05);
    color: var(--ink-100);
  }
  .doc-table code {
    font-family: var(--font-mono);
    font-size: 11px;
  }
  .doc-accent-pill {
    display: inline-block;
    padding: 3px var(--space-1);
    border-radius: 4px;
    font-weight: 700;
    font-size: 11px;
  }

  /* Stage 3: Native App Interface */
  .app-stage {
    min-height: 290px;
    width: 100%;
    border-radius: 12px;
    padding: 20px;
    display: flex;
    gap: var(--space-2);
    box-shadow: inset 0 0 0 1px rgba(0,0,0,0.06);
    background: var(--substrate);
  }
  .app-sidebar {
    width: 130px;
    display: flex;
    flex-direction: column;
    gap: var(--space-half);
  }
  .app-sidebar-item {
    padding: var(--space-1) 12px;
    border-radius: 8px;
    font-size: 12px;
    font-weight: 600;
    color: var(--ink-60);
  }
  .app-sidebar-item.active {
    background: var(--surface);
    color: var(--ink-100);
  }
  .app-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .app-card {
    background: var(--surface);
    border-radius: 12px;
    padding: var(--space-2);
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .app-card-title {
    font-size: 13px;
    font-weight: 700;
    color: var(--ink-100);
  }
  .app-card-sub {
    font-size: 11px;
    color: var(--ink-60);
    margin-top: 2px;
  }
  .app-badge {
    padding: var(--space-half) 10px;
    border-radius: var(--radius-badge);
    font-size: 11px;
    font-weight: 700;
  }
  .app-btn {
    padding: 10px var(--space-2);
    border-radius: var(--radius-control);
    font-size: 12px;
    font-weight: 700;
    border: none;
    cursor: pointer;
    text-align: center;
  }

  /* Stage 4: Web Editorial Hero */
  .web-stage {
    min-height: 290px;
    width: 100%;
    border-radius: 12px;
    padding: var(--space-4);
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    box-shadow: inset 0 0 0 1px rgba(0,0,0,0.06);
    position: relative;
  }
  .web-nav {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.02em;
    opacity: 0.85;
  }
  .web-hero {
    margin: 20px 0;
  }
  .web-hero h2 {
    font-size: 24px;
    font-weight: 800;
    letter-spacing: -0.02em;
    line-height: 1.25;
    margin-bottom: var(--space-1);
  }
  .web-hero p {
    font-size: 13px;
    line-height: 1.5;
    opacity: 0.85;
    max-width: 85%;
  }
  .web-footer {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  /* Token Export Section */
  .export-section {
    background: var(--surface);
    border-radius: var(--radius-card);
    padding: var(--space-3);
    margin-top: var(--space-3);
  }
  .export-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
  }
  .export-header h3 {
    font-size: 11px;
    color: var(--ink-60);
  }
  .export-desc {
    font-size: 13px;
    color: var(--ink-80);
    margin-bottom: 14px;
  }
  pre {
    background: #090B0E;
    color: #E2E8F0;
    padding: 18px;
    border-radius: 10px;
    font-family: var(--font-mono);
    font-size: 12px;
    overflow-x: auto;
  }

  /* All Colors View */
  .search-box {
    position: relative;
    flex: 1;
    min-width: 260px;
    max-width: 480px;
  }
  .search-box input {
    width: 100%;
    padding: 9px var(--space-4) 9px 36px;
    border-radius: var(--radius-control);
    border: 1px solid var(--rule);
    background: var(--surface);
    font-size: 13px;
    font-family: inherit;
    color: var(--ink-100);
    transition: border-color 0.15s ease, box-shadow 0.15s ease;
  }
  .search-box input:focus {
    outline: none;
    border-color: var(--ink-100);
    box-shadow: 0 0 0 2px rgba(9, 11, 14, 0.08);
  }
  .search-box .search-icon {
    position: absolute;
    left: 11px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--ink-60);
    pointer-events: none;
  }
  .search-clear-btn {
    position: absolute;
    right: 8px;
    top: 50%;
    transform: translateY(-50%);
    background: transparent;
    border: none;
    color: var(--ink-60);
    font-size: 16px;
    line-height: 1;
    cursor: pointer;
    padding: var(--space-half);
    border-radius: 4px;
  }
  .search-clear-btn:hover {
    color: var(--ink-100);
  }

  .color-filter-controls {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    flex-wrap: wrap;
  }
  .color-count-badge {
    font-size: 12px;
    font-weight: 600;
    color: var(--ink-60);
    background: var(--surface-recessed);
    padding: 6px 12px;
    border-radius: var(--radius-badge);
  }

  .colors-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(185px, 1fr));
    gap: 18px;
  }
  .color-card {
    background: var(--surface);
    border-radius: var(--radius-card);
    padding: 12px;
    cursor: pointer;
    
    display: flex;
    flex-direction: column;
    text-align: left;
  }
  .color-card:hover {
  }
  .color-card-swatch {
    width: 100%;
    aspect-ratio: 1 / 1;
    border-radius: 10px;
    box-shadow: inset 0 0 0 1px rgba(0,0,0,0.08);
    position: relative;
    overflow: hidden;
  }
  .color-card-badge {
    position: absolute;
    bottom: 8px;
    right: 8px;
    background: rgba(9, 11, 14, 0.72);
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
    color: #FFFFFF;
    font-size: 10px;
    font-weight: 700;
    padding: 2px 7px;
    border-radius: var(--radius-badge);
  }
  .color-card-body {
    padding: var(--space-1) var(--space-half) var(--space-half) var(--space-half);
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .color-card-hex {
    font-family: var(--font-mono);
    font-size: 12px;
    font-weight: 700;
        color: var(--ink-100);
    letter-spacing: 0.04em;
  }
  .color-card-name {
    font-size: 13px;
    font-weight: 600;
    color: var(--ink-80);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .color-card-sub {
    font-size: 11px;
    color: var(--ink-60);
  }

  .colors-empty-state {
    background: var(--surface);
    border-radius: var(--radius-card);
    padding: 48px var(--space-3);
    text-align: center;
    margin-top: 20px;
  }
  .colors-empty-state p {
    font-size: 14px;
    color: var(--ink-60);
    margin-bottom: var(--space-2);
  }

  /* Modal Backdrop & Dialog */
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(9, 11, 14, 0.45);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    z-index: 100;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
  }
  .modal-dialog {
    background: var(--surface);
    border-radius: var(--radius-card);
    max-width: 820px;
    width: 100%;
    max-height: 90vh;
    overflow-y: auto;
    padding: 28px;
    position: relative;
  }
  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--space-3);
  }
  .btn-back {
    background: var(--substrate);
    color: var(--ink-60);
  }
  .btn-back:hover {
    background: var(--surface-hover);
    color: var(--ink-100);
  }
  .modal-close-btn {
    appearance: none;
    background: var(--substrate);
    border: none;
    width: 32px;
    height: 32px;
    border-radius: 8px;
    font-size: 18px;
    line-height: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: var(--ink-60);
    transition: all 0.15s ease;
  }
  .modal-close-btn:hover {
    background: var(--surface-hover);
    color: var(--ink-100);
  }

  .modal-hero {
    display: flex;
    gap: var(--space-3);
    align-items: center;
    margin-bottom: 28px;
    flex-wrap: wrap;
  }
  .modal-swatch {
    width: 130px;
    height: 130px;
    border-radius: 14px;
    box-shadow: inset 0 0 0 1px rgba(0,0,0,0.12), 0 4px 14px rgba(0,0,0,0.06);
    flex-shrink: 0;
  }
  .modal-hero-details {
    display: flex;
    flex-direction: column;
    gap: var(--space-half);
    flex: 1;
    min-width: 220px;
  }
  .modal-eyebrow {
    font-size: 11px;
    color: var(--ink-60);
  }
  .modal-title {
    font-size: 28px;
    font-weight: 800;
    letter-spacing: -0.015em;
    color: var(--ink-100);
    line-height: 1.15;
  }
  .modal-hex-badge {
    font-family: var(--font-mono);
    font-size: 14px;
    font-weight: 700;
        letter-spacing: 0.06em;
    color: var(--ink-60);
  }
  .modal-usage-summary {
    font-size: 13px;
    color: var(--ink-80);
    margin-top: var(--space-half);
  }

  .modal-section {
    margin-top: var(--space-3);
    padding-top: 20px;
    border-top: 1px solid var(--rule);
  }
  .modal-section-title {
    font-size: 11px;
    color: var(--ink-60);
    margin-bottom: 12px;
  }
  .modal-section-subtitle {
    font-size: 12px;
    color: var(--ink-60);
    margin-top: -6px;
    margin-bottom: 14px;
  }

  .color-values-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 10px;
  }
  .value-card {
    background: var(--substrate);
    border-radius: var(--radius-control);
    padding: 10px 12px;
    display: flex;
    flex-direction: column;
    gap: var(--space-half);
  }
  .value-card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .value-label {
    font-size: 10px;
    color: var(--ink-60);
  }
  .value-copy-btn {
    appearance: none;
    border: 1px solid var(--rule);
    background: var(--surface);
    border-radius: 6px;
    padding: 2px 7px;
    font-size: 11px;
    font-weight: 600;
    color: var(--ink-60);
    cursor: pointer;
    transition: all 0.12s ease;
  }
  .value-copy-btn:hover {
    background: var(--substrate);
    color: var(--ink-100);
  }
  .value-copy-btn.copied {
    background: #ECFDF5;
    border-color: #A7F3D0;
    color: #059669;
  }
  .value-text {
    font-family: var(--font-mono);
    font-size: 12px;
    font-weight: 600;
    color: var(--ink-100);
    word-break: break-all;
  }

  .modal-combinations-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 12px;
  }
  .comb-card {
    background: var(--substrate);
    border-radius: var(--radius-control);
    padding: var(--space-1);
    cursor: pointer;
    transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }
  .comb-card:hover {
    background: var(--surface);
  }
  .comb-card-strip {
    display: flex;
    height: 36px;
    border-radius: 6px;
    overflow: hidden;
    box-shadow: inset 0 0 0 1px rgba(0,0,0,0.1);
  }
  .comb-card-stripe {
    flex: 1;
    height: 100%;
    transition: flex 0.2s ease;
  }
  .comb-card:hover .comb-card-stripe:hover {
    flex: 1.4;
  }
  .comb-card-meta {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    padding: 0 2px;
  }
  .comb-card-title {
    font-size: 13px;
    font-weight: 700;
    color: var(--ink-100);
  }
  .comb-card-sub {
    font-size: 11px;
    color: var(--ink-60);
  }

  /* Floating Toast */
  .toast {
    position: fixed;
    bottom: 28px;
    left: 50%;
    transform: translateX(-50%) translateY(100px);
    background: var(--ink-100);
    color: #FFFFFF;
    padding: 9px 18px;
    border-radius: var(--radius-badge);
    font-size: 12px;
    font-weight: 600;
    z-index: 200;
    opacity: 0;
    pointer-events: none;
    transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease;
  }
  .toast.show {
    transform: translateX(-50%) translateY(0);
    opacity: 1;
  }

  /* Clean Attribution Footer */
  footer.attribution {
    margin-top: 56px;
    padding-top: 28px;
    border-top: 1px solid var(--rule);
    font-size: 12px;
    color: var(--ink-60);
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--space-2);
  }
  footer.attribution a {
    color: var(--ink-100);
    text-decoration: underline;
    font-weight: 600;
    text-underline-offset: 2px;
  }
</style>
</head>
<body>

<header>
  <div class="header-inner">
    <!-- Header Left: View Switcher Nav directly in left spot -->
    <div class="view-switch-nav">
      <button class="pill-tab active" id="viewCombinationsBtn" onclick="switchView('combinations')">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
        <span>Combinations (348)</span>
      </button>
      <button class="pill-tab" id="viewLiveExplorerBtn" onclick="switchView('live-explorer')">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
        <span>Live Explorer</span>
      </button>
      <button class="pill-tab" id="viewColorsBtn" onclick="switchView('colors')">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 0 18v-9z"/></svg>
        <span>All Colors (159)</span>
      </button>
    </div>

    <!-- Header Right: Context Actions -->
    <div class="header-actions">
      <div id="combinationsActions" style="display:flex;align-items:center;gap:10px;">
        <button class="btn" onclick="randomCombination()">Random Combination</button>
      </div>
      <div id="liveExplorerActions" style="display:none;align-items:center;gap:10px;">
        <button class="btn" onclick="randomCombination()">Random Combination</button>
        <button class="btn btn-favorite" id="favToggleBtn" onclick="toggleCurrentFavorite()">
          <svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
          <span id="favBtnLabel">Favorite</span>
        </button>
        <button class="btn btn-primary" onclick="copyThemeJson()">Copy Judarn Tokens</button>
      </div>
      <div id="colorsActions" style="display:none;align-items:center;gap:10px;">
        <button class="btn" onclick="randomColor()">Random Color</button>
      </div>
    </div>
  </div>
</header>

<div class="main-container">

  <!-- Confident Hero Section (Single canonical title) -->
  <div class="hero-section">
    <div class="hero-eyebrow small-caps">Judarn Design Foundation</div>
    <h1 class="hero-title">Judarn Color Dictionary</h1>
    <p class="hero-subtitle">
      348 Japanese color harmonies by Sanzo Wada, calibrated in OKLCh for modern screens.
    </p>
    <div class="hero-provenance">
      <span>Archive: <a href="https://github.com/mattdesl/dictionary-of-colour-combinations" target="_blank">mattdesl</a> (MIT)</span>
      <span>Reference: <a href="https://espectro.dev" target="_blank">espectro.dev</a></span>
    </div>
  </div>

  <!-- ========================================================= -->
  <!-- 1. COMBINATIONS GALLERY VIEW (348 COMBINATIONS - LANDING) -->
  <!-- ========================================================= -->
  <div id="combinationsView">

    <!-- Combinations Filter Bar -->
    <div class="filter-bar">
      <div class="filter-group">
        <span class="filter-label small-caps">Size:</span>
        <div class="pill-tabs" id="combSizeTabs">
          <button class="pill-tab active" onclick="setCombSizeFilter('all', this)">All (${catalog.length})</button>
          <button class="pill-tab" onclick="setCombSizeFilter(2, this)">2 Colors (${countBySize(2)})</button>
          <button class="pill-tab" onclick="setCombSizeFilter(3, this)">3 Colors (${countBySize(3)})</button>
          <button class="pill-tab" onclick="setCombSizeFilter(4, this)">4 Colors (${countBySize(4)})</button>
        </div>
      </div>

      <div class="filter-group" style="flex:1; max-width:380px;">
        <div class="search-box" style="max-width:100%;">
          <svg class="search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" id="combSearchInput" placeholder="Filter combinations by name or hex..." oninput="onCombSearchInput(this.value)">
          <button class="search-clear-btn" id="combSearchClearBtn" onclick="clearCombSearch()" style="display:none;" title="Clear search">&times;</button>
        </div>
      </div>

      <div class="filter-group">
        <span class="filter-label small-caps">Sort:</span>
        <select id="combSortSelect" onchange="onCombSortChange(this.value)">
          <option value="id">Index (#1 – #348)</option>
          <option value="size-asc">2 Colors first</option>
          <option value="size-desc">4 Colors first</option>
        </select>
      </div>
    </div>

    <!-- Favorites Drawer Strip -->
    <div class="favorites-strip" id="favStrip">
      <div class="fav-header">
        <div class="fav-title small-caps">
          <svg style="width:13px;height:13px;fill:var(--ink-100);stroke:var(--ink-100);" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
          <span>Saved Favorites</span>
          <span class="fav-count-badge mono-nums" id="favCount">0</span>
        </div>
        <button class="btn" style="padding:4px 8px;font-size:11px;" onclick="clearAllFavorites()">Clear All</button>
      </div>
      <div class="fav-list" id="favList"></div>
    </div>

    <!-- Combinations Grid -->
    <div class="combinations-grid" id="combinationsGrid"></div>

    <!-- Empty State -->
    <div class="colors-empty-state" id="combEmptyState" style="display:none;">
      <p>No combinations match your filter.</p>
      <button class="btn" onclick="clearCombSearch()">Reset Search</button>
    </div>

  </div>

  <!-- ========================================================= -->
  <!-- 2. LIVE EXPLORER VIEW (4 CONTEXT TEMPLATES)               -->
  <!-- ========================================================= -->
  <div id="liveExplorerView" style="display:none;">

    <!-- Palette Header Strip -->
    <div class="palette-bar">
      <div class="palette-meta">
        <div class="palette-number mono-nums" id="pNum">#264</div>
        <div class="palette-name" id="pName">Harmonic Palette</div>
      </div>
      
      <div class="filter-group">
        <button class="btn" onclick="stepPalette(-1)" title="Previous combination">&larr; Prev</button>
        <select id="paletteSelect" onchange="selectPalette(parseInt(this.value))"></select>
        <button class="btn" onclick="stepPalette(1)" title="Next combination">Next &rarr;</button>
      </div>

      <div class="swatches-strip" id="swatchesStrip"></div>
    </div>

    <!-- Multi-Context Preview Grid -->
    <div class="contexts-grid">

      <!-- Context 1: Slide -->
      <div class="context-frame">
        <div class="context-header">
          <span class="context-title small-caps">1. Presentation Slide Master</span>
          <span class="context-role-badge">Substrate Canvas + Accent Badge</span>
        </div>
        <div class="slide-stage" id="slideStage">
          <div class="slide-top">
            <span class="slide-category small-caps" id="slideCat">Sanzo Wada (1883–1967)</span>
            <span class="slide-counter mono-nums">Haishoku Sōkan &middot; 1933</span>
          </div>
          <div class="slide-headline" id="slideHead">
            In 1930s Japan, painter and costume designer Sanzo Wada pioneered a systematic study of color combinations, creating a timeless reference for aesthetic balance.
          </div>
          <div class="slide-bottom">
            <div class="slide-stat">
              <div class="slide-stat-num mono-nums" id="slideStat">348</div>
              <div class="slide-stat-lbl small-caps">Historic Harmonies</div>
            </div>
            <div class="slide-tag small-caps" id="slideTag">Public Domain Heritage</div>
          </div>
        </div>
      </div>

      <!-- Context 2: Technical Specification Document -->
      <div class="context-frame">
        <div class="context-header">
          <span class="context-title small-caps">2. Technical Specification Document</span>
          <span class="context-role-badge">Pure White Surface &amp; Tabular Matrix</span>
        </div>
        <div class="doc-stage" id="docStage">
          <div class="doc-eyebrow small-caps" id="docEyebrow">Data Provenance</div>
          <div class="doc-title">Data Sources</div>
          <div class="doc-body">
            This dictionary builds upon the open-source color archive digitized by <a href="https://github.com/mattdesl/dictionary-of-colour-combinations" target="_blank">Matt DesLauriers</a> (MIT License) from the dataset compiled by Dain M. Blodorn Kim.
          </div>
          <table class="doc-table" id="docTable">
            <thead>
              <tr>
                <th class="small-caps">Resource</th>
                <th class="small-caps">Origin</th>
                <th class="small-caps">License</th>
                <th class="small-caps">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><em>Haishoku Sōkan</em></td>
                <td>Sanzo Wada</td>
                <td>Public Domain</td>
                <td class="mono-nums">Canonical</td>
              </tr>
              <tr>
                <td>Color Dataset</td>
                <td>Matt DesLauriers</td>
                <td>MIT License</td>
                <td class="mono-nums">Verified</td>
              </tr>
              <tr>
                <td>Perceptual Gamut</td>
                <td>Judarn OKLCh</td>
                <td>Display P3</td>
                <td><span class="doc-accent-pill mono-nums" id="docRatioPill">WCAG AAA/AA</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Context 3: Native App Interface -->
      <div class="context-frame">
        <div class="context-header">
          <span class="context-title small-caps">3. Native App Interface</span>
          <span class="context-role-badge">Substrate Wash, Squircle Surface &amp; Badges</span>
        </div>
        <div class="app-stage" id="appStage">
          <div class="app-sidebar">
            <div class="app-sidebar-item active">Philosophy</div>
            <div class="app-sidebar-item">Wide Gamut</div>
            <div class="app-sidebar-item">Invariants</div>
          </div>
          <div class="app-content">
            <div class="app-card">
              <div>
                <div class="app-card-title">OKLCh Perceptual Uniformity</div>
                <div class="app-card-sub">Mapped to Display P3 with sRGB fallbacks</div>
              </div>
              <div class="app-badge mono-nums" id="appBadge">P3</div>
            </div>
            <div class="app-card">
              <div>
                <div class="app-card-title">Host Platform Invariants</div>
                <div class="app-card-sub">Judarn sets color &amp; rhythm; OS shapes geometry</div>
              </div>
              <div class="app-badge mono-nums" id="appBadge2">Host</div>
            </div>
            <button class="app-btn" id="appBtn">Explore Judarn Foundation</button>
          </div>
        </div>
      </div>

      <!-- Context 4: Web Editorial Hero -->
      <div class="context-frame">
        <div class="context-header">
          <span class="context-title small-caps">4. Web Editorial Hero</span>
          <span class="context-role-badge">High-Contrast Canvas &amp; Accent CTA</span>
        </div>
        <div class="web-stage" id="webStage">
          <div class="web-nav">
            <span>Judarn Design</span>
            <span>Documentation / Tokens</span>
          </div>
          <div class="web-hero">
            <h2 id="webHead">Sanzo Wada's color combinations in OKLCh.</h2>
            <p id="webSub">
              Browse 348 combinations, inspect 159 colors, and copy their OKLCh values.
            </p>
          </div>
          <div class="web-footer">
            <button class="btn" id="webBtnPrimary" style="font-weight:700;">Explore Combinations</button>
            <span style="font-size:11px; opacity:0.85;">Judarn Color Dictionary</span>
          </div>
        </div>
      </div>

    </div>

    <!-- Token Export Snippet -->
    <div class="export-section">
      <div class="export-header">
        <h3 class="small-caps">Ready-to-Use Judarn Token JSON (OKLCh Calibrated)</h3>
        <button class="btn btn-primary" onclick="copyThemeJson()">Copy JSON</button>
      </div>
      <div class="export-desc">
        Outputs the Design Tokens Format Module 2025.10 with mathematically calculated <code>oklch(L C H)</code> coordinates and sRGB hex fallbacks, ready to integrate into Judarn or any design system.
      </div>
      <pre><code id="exportCode"></code></pre>
    </div>

  </div>

  <!-- ========================================================= -->
  <!-- 3. ALL COLORS VIEW (159 INDIVIDUAL COLORS)                 -->
  <!-- ========================================================= -->
  <div id="colorsView" style="display:none;">

    <!-- Color Controls Bar (Search & Sort) -->
    <div class="color-filter-bar">
      <div class="search-box">
        <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input type="text" id="colorSearchInput" placeholder="Search by name, hex, or index (e.g. Hermosa Pink, #f9c1ce, pink)..." oninput="onColorSearchInput(this.value)">
        <button class="search-clear-btn" id="searchClearBtn" onclick="clearColorSearch()" style="display:none;" title="Clear search">&times;</button>
      </div>

      <div class="color-filter-controls">
        <div class="filter-group">
          <span class="filter-label small-caps">Sort:</span>
          <select id="colorSortSelect" onchange="onColorSortChange(this.value)">
            <option value="id">Index</option>
            <option value="name">Name (A – Z)</option>
            <option value="usage">Most combinations</option>
            <option value="lightness-asc">Darkest first</option>
            <option value="lightness-desc">Lightest first</option>
            <option value="hue">Hue</option>
          </select>
        </div>

        <div class="color-count-badge mono-nums" id="colorCountBadge">Showing 159 colors</div>
      </div>
    </div>

    <!-- Color Grid -->
    <div class="colors-grid" id="colorsGrid"></div>

    <!-- Empty State -->
    <div class="colors-empty-state" id="colorsEmptyState" style="display:none;">
      <p>No colors match your search query.</p>
      <button class="btn" onclick="clearColorSearch()">Reset Search</button>
    </div>

  </div>

  <!-- Clean Attribution Footer -->
  <footer class="attribution">
    <div>
      Archive: <a href="https://github.com/mattdesl/dictionary-of-colour-combinations" target="_blank">mattdesl/dictionary-of-colour-combinations</a> (MIT)
    </div>
    <div>
      Reference: <a href="https://espectro.dev" target="_blank">espectro.dev</a>
    </div>
  </footer>

</div>

<!-- ========================================================= -->
<!-- 4. COLOR DETAIL MODAL (INSPECTOR & CROSS-REFERENCES)       -->
<!-- ========================================================= -->
<div id="colorModal" class="modal-backdrop" style="display:none;" onclick="onBackdropClick(event)">
  <div class="modal-dialog" role="dialog" aria-modal="true" aria-labelledby="modalColorName">
    <!-- Close / Back Header -->
    <div class="modal-header">
      <button class="btn btn-back" onclick="closeColorModal()">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
        <span>Back to Explorer</span>
      </button>
      <button class="modal-close-btn" onclick="closeColorModal()" title="Close (Esc)">&times;</button>
    </div>

    <!-- Color Hero & Identification -->
    <div class="modal-hero">
      <div class="modal-swatch" id="modalSwatch"></div>
      <div class="modal-hero-details">
        <div class="modal-eyebrow small-caps" id="modalEyebrow">Sanzo Wada Color #1</div>
        <h2 class="modal-title" id="modalColorName">Hermosa Pink</h2>
        <div class="modal-hex-badge mono-nums" id="modalHexBadge">#F9C1CE</div>
        <p class="modal-usage-summary" id="modalUsageSummary">Used in 3 historical combinations</p>
      </div>
    </div>

    <!-- Color Space Values Matrix -->
    <div class="modal-section">
      <h3 class="modal-section-title small-caps">Color Values &amp; Formats</h3>
      <div class="color-values-grid">
        <div class="value-card">
          <div class="value-card-header">
            <span class="value-label small-caps">HEX</span>
            <button class="value-copy-btn" onclick="copyValue('hex')" id="copyBtn-hex">Copy</button>
          </div>
          <div class="value-text mono-nums" id="valHex">#f9c1ce</div>
        </div>
        <div class="value-card">
          <div class="value-card-header">
            <span class="value-label small-caps">RGB</span>
            <button class="value-copy-btn" onclick="copyValue('rgb')" id="copyBtn-rgb">Copy</button>
          </div>
          <div class="value-text mono-nums" id="valRgb">249, 193, 206</div>
        </div>
        <div class="value-card">
          <div class="value-card-header">
            <span class="value-label small-caps">CMYK</span>
            <button class="value-copy-btn" onclick="copyValue('cmyk')" id="copyBtn-cmyk">Copy</button>
          </div>
          <div class="value-text mono-nums" id="valCmyk">0, 30, 6, 0</div>
        </div>
        <div class="value-card">
          <div class="value-card-header">
            <span class="value-label small-caps">CIE L*a*b*</span>
            <button class="value-copy-btn" onclick="copyValue('lab')" id="copyBtn-lab">Copy</button>
          </div>
          <div class="value-text mono-nums" id="valLab">83.43, 22.14, 1.64</div>
        </div>
        <div class="value-card">
          <div class="value-card-header">
            <span class="value-label small-caps">OKLCh (Judarn Native)</span>
            <button class="value-copy-btn" onclick="copyValue('oklch')" id="copyBtn-oklch">Copy</button>
          </div>
          <div class="value-text mono-nums" id="valOklch">oklch(0.864 0.063 8.2)</div>
        </div>
      </div>
    </div>

    <!-- Used in X Combinations Section -->
    <div class="modal-section">
      <h3 class="modal-section-title small-caps" id="modalCombinationsTitle">Used in 3 Combinations</h3>
      <p class="modal-section-subtitle">Click any combination to load and preview across all 4 Judarn design surfaces:</p>
      <div class="modal-combinations-grid" id="modalCombinationsGrid"></div>
    </div>
  </div>
</div>

<!-- Floating Toast -->
<div id="toast" class="toast">Copied to clipboard</div>

<script>
const CATALOG = ${JSON.stringify(catalog)};
const COLOR_CATALOG = ${JSON.stringify(colors)};

let currentView = 'combinations'; // 'combinations' | 'live-explorer' | 'colors'
let currentPaletteId = 1;
let memoryFavorites = [];

let combSizeFilter = 'all';
let combSearchQuery = '';
let combSortOrder = 'id';

let colorSearchQuery = '';
let colorSortOrder = 'id';
let activeModalColor = null;
let toastTimeout = null;

let enrichedColors = [];

function getFavorites() {
  try {
    const raw = localStorage.getItem('judarn_wada_favorites');
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return memoryFavorites;
}

function saveFavorites(favs) {
  try {
    localStorage.setItem('judarn_wada_favorites', JSON.stringify(favs));
  } catch (e) {}
  memoryFavorites = favs;
  renderFavorites();
  updateFavButton();
  renderCombinationsGrid();
}

function toggleFavoriteId(id) {
  const favs = [...getFavorites()];
  const idx = favs.indexOf(id);
  if (idx > -1) {
    favs.splice(idx, 1);
  } else {
    favs.push(id);
  }
  saveFavorites(favs);
}

function toggleCurrentFavorite() {
  toggleFavoriteId(currentPaletteId);
}

function clearAllFavorites() {
  saveFavorites([]);
}

function updateFavButton() {
  const favs = getFavorites();
  const isFav = favs.includes(currentPaletteId);
  const btn = document.getElementById('favToggleBtn');
  const lbl = document.getElementById('favBtnLabel');
  if (isFav) {
    btn.classList.add('active');
    lbl.textContent = 'Favorited';
  } else {
    btn.classList.remove('active');
    lbl.textContent = 'Favorite';
  }
}

function renderFavorites() {
  const favs = getFavorites();
  const strip = document.getElementById('favStrip');
  const count = document.getElementById('favCount');
  const list = document.getElementById('favList');
  
  count.textContent = favs.length;
  if (favs.length === 0) {
    strip.classList.remove('has-favorites');
    list.innerHTML = '';
    return;
  }
  strip.classList.add('has-favorites');
  list.innerHTML = '';
  
  favs.forEach(id => {
    const item = CATALOG.find(p => p.id === id);
    if (!item) return;
    const el = document.createElement('div');
    el.className = 'fav-item';
    el.title = \`Open Combination #\${item.id} in Live Explorer\`;
    el.onclick = () => {
      loadCombinationIntoExplorer(item.id);
    };
    
    let miniSwatches = '<div class="fav-mini-swatches">';
    item.colors.forEach(c => {
      miniSwatches += \`<div class="fav-mini-swatch" style="background:\${c.hex}"></div>\`;
    });
    miniSwatches += '</div>';
    
    el.innerHTML = \`\${miniSwatches}<span class="fav-label">#\${item.id}</span>\`;
    list.appendChild(el);
  });
}

function hexToRgb(hex) {
  const clean = hex.replace('#', '');
  const bigint = parseInt(clean, 16);
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255
  };
}

function srgbToOklch(r, g, b) {
  const invGamma = (v) => {
    v = v / 255.0;
    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  const rL = invGamma(r);
  const gL = invGamma(g);
  const bL = invGamma(b);

  const l = 0.4122214708 * rL + 0.5363325363 * gL + 0.0514459929 * bL;
  const m = 0.2119034982 * rL + 0.6806995451 * gL + 0.1073969566 * bL;
  const s = 0.0883024619 * rL + 0.2817188376 * gL + 0.6299787005 * bL;

  const l_ = l > 0 ? Math.cbrt(l) : 0;
  const m_ = m > 0 ? Math.cbrt(m) : 0;
  const s_ = s > 0 ? Math.cbrt(s) : 0;

  const L = 0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_;
  const a = 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_;
  const bVal = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_;

  const C = Math.sqrt(a * a + bVal * bVal);
  let H = Math.atan2(bVal, a) * (180 / Math.PI);
  if (H < 0) H += 360;

  return {
    l: parseFloat(L.toFixed(3)),
    c: parseFloat(C.toFixed(3)),
    h: parseFloat(H.toFixed(1)),
    css: \`oklch(\${L.toFixed(3)} \${C.toFixed(3)} \${H.toFixed(1)})\`
  };
}

function getLuminance(r, g, b) {
  const a = [r, g, b].map(v => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

// -------------------------------------------------------------
// View Switching Logic (Combinations vs Live Explorer vs All Colors)
// -------------------------------------------------------------
function switchView(view) {
  currentView = view;
  const combView = document.getElementById('combinationsView');
  const liveView = document.getElementById('liveExplorerView');
  const colorsView = document.getElementById('colorsView');

  const combBtn = document.getElementById('viewCombinationsBtn');
  const liveBtn = document.getElementById('viewLiveExplorerBtn');
  const colorsBtn = document.getElementById('viewColorsBtn');

  const combActions = document.getElementById('combinationsActions');
  const liveActions = document.getElementById('liveExplorerActions');
  const colorsActions = document.getElementById('colorsActions');

  [combBtn, liveBtn, colorsBtn].forEach(b => b.classList.remove('active'));
  [combView, liveView, colorsView].forEach(v => v.style.display = 'none');
  [combActions, liveActions, colorsActions].forEach(a => a.style.display = 'none');

  if (view === 'combinations') {
    combView.style.display = 'block';
    combBtn.classList.add('active');
    combActions.style.display = 'flex';
    renderCombinationsGrid();
    if (!location.hash.startsWith('#color=') && !location.hash.startsWith('#palette=')) {
      history.replaceState(null, '', '#combinations');
    }
  } else if (view === 'live-explorer') {
    liveView.style.display = 'block';
    liveBtn.classList.add('active');
    liveActions.style.display = 'flex';
    selectPalette(currentPaletteId);
    if (!location.hash.startsWith('#color=')) {
      history.replaceState(null, '', \`#palette=\${currentPaletteId}\`);
    }
  } else {
    colorsView.style.display = 'block';
    colorsBtn.classList.add('active');
    colorsActions.style.display = 'flex';
    renderColorsGrid();
    if (!location.hash.startsWith('#color=')) {
      history.replaceState(null, '', '#colors');
    }
  }
}

// -------------------------------------------------------------
// Combinations Gallery Grid Engine
// -------------------------------------------------------------
function setCombSizeFilter(size, tabElem) {
  document.querySelectorAll('#combSizeTabs .pill-tab').forEach(t => t.classList.remove('active'));
  tabElem.classList.add('active');
  combSizeFilter = size;
  renderCombinationsGrid();
}

function onCombSearchInput(val) {
  combSearchQuery = val.trim().toLowerCase();
  const clearBtn = document.getElementById('combSearchClearBtn');
  clearBtn.style.display = combSearchQuery ? 'block' : 'none';
  renderCombinationsGrid();
}

function clearCombSearch() {
  const input = document.getElementById('combSearchInput');
  if (input) input.value = '';
  combSearchQuery = '';
  const clearBtn = document.getElementById('combSearchClearBtn');
  if (clearBtn) clearBtn.style.display = 'none';
  renderCombinationsGrid();
}

function onCombSortChange(val) {
  combSortOrder = val;
  renderCombinationsGrid();
}

function renderCombinationsGrid() {
  const grid = document.getElementById('combinationsGrid');
  const emptyState = document.getElementById('combEmptyState');
  const favs = getFavorites();

  let list = CATALOG.filter(p => {
    if (combSizeFilter !== 'all' && p.colors.length !== combSizeFilter) return false;
    if (!combSearchQuery) return true;
    if (String(p.id) === combSearchQuery || ('#' + p.id) === combSearchQuery) return true;
    const names = p.colors.map(c => c.name.toLowerCase()).join(' ');
    if (names.includes(combSearchQuery)) return true;
    const hexes = p.colors.map(c => c.hex.toLowerCase()).join(' ');
    if (hexes.includes(combSearchQuery)) return true;
    return false;
  });

  // Sort
  list.sort((a, b) => {
    if (combSortOrder === 'size-asc') return a.colors.length - b.colors.length || a.id - b.id;
    if (combSortOrder === 'size-desc') return b.colors.length - a.colors.length || a.id - b.id;
    return a.id - b.id;
  });

  if (list.length === 0) {
    grid.innerHTML = '';
    emptyState.style.display = 'block';
    return;
  }
  emptyState.style.display = 'none';

  grid.innerHTML = '';
  const fragment = document.createDocumentFragment();

  list.forEach(p => {
    const card = document.createElement('div');
    card.className = 'combination-card';
    card.title = \`Open Combination #\${p.id} in Live Explorer\`;
    card.onclick = (e) => {
      // Don't trigger if favorite button was clicked
      if (e.target.closest('.comb-card-fav-btn')) return;
      loadCombinationIntoExplorer(p.id);
    };

    const isFav = favs.includes(p.id);

    let stripes = '<div class="comb-swatch-box">';
    p.colors.forEach(col => {
      stripes += \`<div class="comb-stripe" style="background-color: \${col.hex};" title="\${col.name}: \${col.hex}"></div>\`;
    });
    stripes += '</div>';

    const colorNames = p.colors.map(c => c.name).join(', ');

    card.innerHTML = \`
      \${stripes}
      <button class="comb-card-fav-btn \${isFav ? 'active' : ''}" onclick="toggleFavoriteId(\${p.id})" title="\${isFav ? 'Remove favorite' : 'Save favorite'}">
        <svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
      </button>
      <div class="comb-meta-row">
        <span class="comb-title mono-nums">Combination #\${p.id}</span>
        <span class="comb-badge small-caps">\${p.colors.length} colors</span>
      </div>
      <div class="comb-colors-list">\${colorNames}</div>
    \`;

    fragment.appendChild(card);
  });

  grid.appendChild(fragment);
}

function loadCombinationIntoExplorer(id) {
  currentPaletteId = id;
  switchView('live-explorer');
  document.getElementById('paletteSelect').value = id;
  selectPalette(id);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function randomCombination() {
  const rand = CATALOG[Math.floor(Math.random() * CATALOG.length)];
  if (currentView === 'live-explorer') {
    document.getElementById('paletteSelect').value = rand.id;
    selectPalette(rand.id);
  } else {
    loadCombinationIntoExplorer(rand.id);
  }
}

function stepPalette(step) {
  const currentIndex = CATALOG.findIndex(p => p.id === currentPaletteId);
  let nextIndex = currentIndex + step;
  if (nextIndex < 0) nextIndex = CATALOG.length - 1;
  if (nextIndex >= CATALOG.length) nextIndex = 0;
  const nextId = CATALOG[nextIndex].id;
  document.getElementById('paletteSelect').value = nextId;
  selectPalette(nextId);
}

// -------------------------------------------------------------
// Filled-surface ink: perceptual crossover Y* = 0.50, pure black or white (ADR-0006).
const PERCEPTUAL_LUMINANCE_CROSSOVER = 0.50;
function inkFor(lum) { return lum > PERCEPTUAL_LUMINANCE_CROSSOVER ? '#000000' : '#FFFFFF'; }

// Live Explorer & Context Engine
// -------------------------------------------------------------
function selectPalette(id) {
  currentPaletteId = id;
  updateFavButton();
  const item = CATALOG.find(x => x.id === id) || CATALOG[0];
  document.getElementById('pNum').textContent = '#' + item.id;
  document.getElementById('pName').textContent = \`\${item.colors.length}-Color Harmony\`;

  const enriched = item.colors.map(c => {
    const rgb = hexToRgb(c.hex);
    const oklch = srgbToOklch(rgb.r, rgb.g, rgb.b);
    return {
      ...c,
      rgb,
      oklch,
      lum: getLuminance(rgb.r, rgb.g, rgb.b)
    };
  });

  const sorted = [...enriched].sort((a, b) => b.lum - a.lum);
  const n = sorted.length;

  const substrate = sorted[0];
  const ink = sorted[n - 1];
  let accent1, accent2;

  if (n === 2) {
    accent1 = substrate;
    accent2 = ink;
  } else if (n === 3) {
    accent1 = sorted[1];
    accent2 = ink;
  } else {
    accent1 = sorted[1];
    accent2 = sorted[2];
  }

  const getRoleName = (color) => {
    if (color.hex === substrate.hex) return 'Substrate / Tint';
    if (color.hex === ink.hex) return 'Ink / Contrast';
    if (color.hex === accent1.hex) return 'Accent 1';
    if (color.hex === accent2.hex) return 'Accent 2';
    return 'Harmony';
  };

  const strip = document.getElementById('swatchesStrip');
  strip.innerHTML = '';
  enriched.forEach(c => {
    const card = document.createElement('div');
    card.className = 'swatch-card';
    card.title = \`Inspect \${c.name} (\${c.hex}) & view all combinations\`;
    card.onclick = () => openColorModal(c.hex);
    card.innerHTML = \`
      <div class="swatch-color" style="background-color: \${c.hex}"></div>
      <div class="swatch-info">
        <div class="swatch-name-row">
          <span class="swatch-name">\${c.name}</span>
        </div>
        <span class="swatch-role-tag">\${getRoleName(c)} &bull; \${c.oklch.css}</span>
      </div>
    \`;
    strip.appendChild(card);
  });

  // 1. Context: Presentation Slide Master (Sanzo Wada History)
  const slide = document.getElementById('slideStage');
  slide.style.backgroundColor = substrate.hex;
  const slideTextColor = inkFor(substrate.lum);
  slide.style.color = slideTextColor;
  document.getElementById('slideCat').style.color = ink.hex;
  document.getElementById('slideHead').style.color = slideTextColor;
  document.getElementById('slideStat').style.color = (n === 2) ? ink.hex : accent1.hex;
  const slideTag = document.getElementById('slideTag');
  slideTag.style.backgroundColor = (n === 2) ? ink.hex : accent2.hex;
  slideTag.style.color = inkFor((n === 2) ? ink.lum : accent2.lum);

  // 2. Context: Technical Specification Document (Pure White Surface)
  const doc = document.getElementById('docStage');
  doc.style.backgroundColor = '#FFFFFF';
  document.getElementById('docEyebrow').style.color = ink.hex;
  
  const ths = document.querySelectorAll('#docTable th');
  ths.forEach(th => th.style.borderBottomColor = ink.hex);
  
  const pill = document.getElementById('docRatioPill');
  pill.style.backgroundColor = accent1.hex;
  pill.style.color = inkFor(accent1.lum);

  // 3. Context: Native App Interface (Judarn Invariants)
  const appStage = document.getElementById('appStage');
  appStage.style.backgroundColor = substrate.hex + '35';
  const appBadge = document.getElementById('appBadge');
  appBadge.style.backgroundColor = accent1.hex;
  appBadge.style.color = inkFor(accent1.lum);
  const appBadge2 = document.getElementById('appBadge2');
  appBadge2.style.backgroundColor = accent2.hex;
  appBadge2.style.color = inkFor(accent2.lum);
  const appBtn = document.getElementById('appBtn');
  appBtn.style.backgroundColor = ink.hex;
  appBtn.style.color = inkFor(ink.lum);

  // 4. Context: Web Editorial Hero
  const webStage = document.getElementById('webStage');
  webStage.style.backgroundColor = ink.hex;
  webStage.style.color = inkFor(ink.lum);
  const webBtn = document.getElementById('webBtnPrimary');
  webBtn.style.backgroundColor = accent1.hex;
  webBtn.style.color = inkFor(accent1.lum);
  webBtn.onclick = () => switchView('combinations');

  // JSON export: Design Tokens Format Module 2025.10, colours as Color Module objects.
  const dtcg = (c, extra) => ({
    "$type": "color",
    "$value": { colorSpace: "oklch", components: [Number(c.oklch.l), Number(c.oklch.c), Number(c.oklch.h)], ...(extra || {}), hex: c.hex.toLowerCase() }
  });
  const exportPayload = {
    "$schema": "https://www.designtokens.org/schemas/2025.10/format.json",
    "color": {
      "substrate": dtcg(substrate),
      "surfaceWash": {
        "$type": "color",
        "$value": { colorSpace: "oklch", components: [Number(substrate.oklch.l), Number(substrate.oklch.c), Number(substrate.oklch.h)], alpha: 0.15 }
      },
      "accent": dtcg(accent1),
      "accentSecondary": dtcg(accent2),
      "inkContrast": dtcg(ink)
    },
    "$extensions": {
      "design.judarn": {
        "theme": \`wada-\${item.id}\`,
        "title": \`Sanzo Wada Harmony #\${item.id}\`,
        "paletteSize": item.colors.length,
        "originalColors": enriched.map(c => ({
          name: c.name,
          hex: c.hex,
          oklch: c.oklch.css
        }))
      }
    }
  };
  document.getElementById('exportCode').textContent = JSON.stringify(exportPayload, null, 2);

  if (currentView === 'live-explorer' && !location.hash.startsWith('#color=')) {
    history.replaceState(null, '', \`#palette=\${item.id}\`);
  }
}

function copyThemeJson() {
  const code = document.getElementById('exportCode').textContent;
  navigator.clipboard.writeText(code).then(() => {
    showToast('Copied Judarn OKLCh Token JSON to clipboard');
  });
}

function populateSelect(list) {
  const select = document.getElementById('paletteSelect');
  select.innerHTML = '';
  list.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = \`Combination #\${p.id} (\${p.colors.length}c: \${p.colors.map(c => c.name).join(', ')})\`;
    select.appendChild(opt);
  });
}

// -------------------------------------------------------------
// 159 Colors Catalog Grid Engine (Search, Filter, Sort)
// -------------------------------------------------------------
function onColorSearchInput(val) {
  colorSearchQuery = val.trim().toLowerCase();
  const clearBtn = document.getElementById('searchClearBtn');
  clearBtn.style.display = colorSearchQuery ? 'block' : 'none';
  renderColorsGrid();
}

function clearColorSearch() {
  const input = document.getElementById('colorSearchInput');
  if (input) input.value = '';
  colorSearchQuery = '';
  const clearBtn = document.getElementById('searchClearBtn');
  if (clearBtn) clearBtn.style.display = 'none';
  renderColorsGrid();
}

function onColorSortChange(val) {
  colorSortOrder = val;
  renderColorsGrid();
}

function renderColorsGrid() {
  const grid = document.getElementById('colorsGrid');
  const emptyState = document.getElementById('colorsEmptyState');
  const countBadge = document.getElementById('colorCountBadge');

  let list = enrichedColors.filter(c => {
    if (!colorSearchQuery) return true;
    if (c.name.toLowerCase().includes(colorSearchQuery)) return true;
    if (c.slug.toLowerCase().includes(colorSearchQuery)) return true;
    if (c.hex.toLowerCase().includes(colorSearchQuery)) return true;
    if (String(c.id) === colorSearchQuery || ('#' + c.id) === colorSearchQuery) return true;
    return false;
  });

  // Sort
  list.sort((a, b) => {
    if (colorSortOrder === 'name') return a.name.localeCompare(b.name);
    if (colorSortOrder === 'usage') return b.combinationIds.length - a.combinationIds.length || a.id - b.id;
    if (colorSortOrder === 'lightness-desc') return b.lab[0] - a.lab[0];
    if (colorSortOrder === 'lightness-asc') return a.lab[0] - b.lab[0];
    if (colorSortOrder === 'hue') return a.oklch.h - b.oklch.h;
    return a.id - b.id;
  });

  countBadge.textContent = \`Showing \${list.length} of \${enrichedColors.length} colors\`;

  if (list.length === 0) {
    grid.innerHTML = '';
    emptyState.style.display = 'block';
    return;
  }
  emptyState.style.display = 'none';

  grid.innerHTML = '';
  const fragment = document.createDocumentFragment();

  list.forEach(c => {
    const card = document.createElement('div');
    card.className = 'color-card';
    card.title = \`Inspect \${c.name} (\${c.hex}) & find combinations\`;
    card.onclick = () => openColorModal(c.id);

    const combCount = c.combinationIds.length;

    card.innerHTML = \`
      <div class="color-card-swatch" style="background-color: \${c.hex};">
        <span class="color-card-badge mono-nums">\${combCount} \${combCount === 1 ? 'combo' : 'combos'}</span>
      </div>
      <div class="color-card-body">
        <span class="color-card-hex">\${c.hex}</span>
        <span class="color-card-name">\${c.name}</span>
        <span class="color-card-sub mono-nums">#\${c.id} &bull; L* \${c.lab[0].toFixed(1)}</span>
      </div>
    \`;
    fragment.appendChild(card);
  });

  grid.appendChild(fragment);
}

function randomColor() {
  const rand = enrichedColors[Math.floor(Math.random() * enrichedColors.length)];
  openColorModal(rand.id);
}

// -------------------------------------------------------------
// Color Detail Inspector Modal
// -------------------------------------------------------------
function resolveColor(query) {
  if (typeof query === 'number') {
    return enrichedColors.find(c => c.id === query);
  }
  if (!query) return null;
  const q = String(query).toLowerCase().trim();
  const num = parseInt(q, 10);
  if (!isNaN(num) && num >= 1 && num <= 159 && (q === String(num) || q === '#' + num)) {
    const byId = enrichedColors.find(c => c.id === num);
    if (byId) return byId;
  }
  const byHex = enrichedColors.find(c => c.hex.toLowerCase() === (q.startsWith('#') ? q : '#' + q));
  if (byHex) return byHex;
  const bySlug = enrichedColors.find(c => c.slug.toLowerCase() === q);
  if (bySlug) return bySlug;
  return enrichedColors.find(c => c.name.toLowerCase() === q);
}

function openColorModal(query) {
  const color = resolveColor(query);
  if (!color) return;
  activeModalColor = color;

  document.getElementById('modalSwatch').style.backgroundColor = color.hex;
  document.getElementById('modalEyebrow').textContent = \`Sanzo Wada Color #\${color.id}\`;
  document.getElementById('modalColorName').textContent = color.name;
  document.getElementById('modalHexBadge').textContent = color.hex;

  const count = color.combinationIds.length;
  document.getElementById('modalUsageSummary').textContent = \`Used across \${count} historical \${count === 1 ? 'combination' : 'combinations'} in A Dictionary of Color Combinations.\`;
  document.getElementById('modalCombinationsTitle').textContent = \`Used in \${count} \${count === 1 ? 'Combination' : 'Combinations'}\`;

  document.getElementById('valHex').textContent = color.hex;
  document.getElementById('valRgb').textContent = \`\${color.rgb[0]}, \${color.rgb[1]}, \${color.rgb[2]}\`;
  document.getElementById('valCmyk').textContent = \`\${color.cmyk[0]}, \${color.cmyk[1]}, \${color.cmyk[2]}, \${color.cmyk[3]}\`;
  document.getElementById('valLab').textContent = \`\${color.lab[0]}, \${color.lab[1]}, \${color.lab[2]}\`;
  document.getElementById('valOklch').textContent = color.oklch.css;

  ['hex', 'rgb', 'cmyk', 'lab', 'oklch'].forEach(t => {
    const btn = document.getElementById(\`copyBtn-\${t}\`);
    if (btn) {
      btn.textContent = 'Copy';
      btn.classList.remove('copied');
    }
  });

  const combGrid = document.getElementById('modalCombinationsGrid');
  combGrid.innerHTML = '';
  const fragment = document.createDocumentFragment();

  color.combinationIds.forEach(combId => {
    const item = CATALOG.find(p => p.id === combId);
    if (!item) return;

    const card = document.createElement('div');
    card.className = 'comb-card';
    card.title = \`Load Combination #\${item.id} in Live Explorer\`;
    card.onclick = () => {
      closeColorModal();
      loadCombinationIntoExplorer(item.id);
    };

    let stripes = '<div class="comb-card-strip">';
    item.colors.forEach(col => {
      stripes += \`<div class="comb-card-stripe" style="background-color: \${col.hex}" title="\${col.name}: \${col.hex}"></div>\`;
    });
    stripes += '</div>';

    card.innerHTML = \`
      \${stripes}
      <div class="comb-card-meta">
        <span class="comb-card-title mono-nums">Combination #\${item.id}</span>
        <span class="comb-card-sub small-caps">\${item.colors.length} colors</span>
      </div>
    \`;
    fragment.appendChild(card);
  });
  combGrid.appendChild(fragment);

  const modal = document.getElementById('colorModal');
  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';

  history.replaceState(null, '', \`#color=\${color.slug}\`);
}

function closeColorModal() {
  const modal = document.getElementById('colorModal');
  modal.style.display = 'none';
  document.body.style.overflow = '';
  activeModalColor = null;

  if (currentView === 'live-explorer') {
    history.replaceState(null, '', \`#palette=\${currentPaletteId}\`);
  } else if (currentView === 'combinations') {
    history.replaceState(null, '', '#combinations');
  } else {
    history.replaceState(null, '', '#colors');
  }
}

function onBackdropClick(e) {
  if (e.target && e.target.id === 'colorModal') {
    closeColorModal();
  }
}

function copyValue(type) {
  if (!activeModalColor) return;
  let text = '';
  if (type === 'hex') text = activeModalColor.hex;
  else if (type === 'rgb') text = \`rgb(\${activeModalColor.rgb.join(', ')})\`;
  else if (type === 'cmyk') text = activeModalColor.cmyk.join(', ');
  else if (type === 'lab') text = activeModalColor.lab.join(', ');
  else if (type === 'oklch') text = activeModalColor.oklch.css;

  navigator.clipboard.writeText(text).then(() => {
    const btn = document.getElementById(\`copyBtn-\${type}\`);
    if (btn) {
      btn.textContent = 'Copied!';
      btn.classList.add('copied');
      setTimeout(() => {
        btn.textContent = 'Copy';
        btn.classList.remove('copied');
      }, 2000);
    }
    showToast(\`Copied \${text} to clipboard\`);
  });
}

function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.classList.remove('show');
  }, 2200);
}

// -------------------------------------------------------------
// Initialization & Deep Linking
// -------------------------------------------------------------
function handleUrlHash() {
  const hash = location.hash;
  if (!hash) return;

  if (hash === '#colors') {
    switchView('colors');
  } else if (hash === '#combinations') {
    switchView('combinations');
  } else if (hash.startsWith('#color=')) {
    const slug = hash.replace('#color=', '');
    switchView('colors');
    openColorModal(slug);
  } else if (hash.startsWith('#palette=')) {
    const id = parseInt(hash.replace('#palette=', ''), 10);
    if (!isNaN(id)) {
      loadCombinationIntoExplorer(id);
    }
  }
}

function init() {
  enrichedColors = COLOR_CATALOG.map(c => {
    const oklch = srgbToOklch(c.rgb[0], c.rgb[1], c.rgb[2]);
    const lum = getLuminance(c.rgb[0], c.rgb[1], c.rgb[2]);
    return {
      ...c,
      oklch,
      lum
    };
  });

  populateSelect(CATALOG);
  renderFavorites();
  renderCombinationsGrid();

  // Escape key closes modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && document.getElementById('colorModal').style.display === 'flex') {
      closeColorModal();
    }
  });

  handleUrlHash();
  window.addEventListener('hashchange', handleUrlHash);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
</script>

</body>
</html>
`;

const outputPath = path.join(__dirname, '../tools/wada-explorer/index.html');

if (process.argv.includes('--check')) {
  // index.html is generated output: hand edits to it are lost on the next build.
  const current = fs.existsSync(outputPath) ? fs.readFileSync(outputPath, 'utf8') : null;
  if (current !== html) {
    console.error('✗ tools/wada-explorer/index.html differs from scripts/build-wada-explorer.js output.');
    console.error('  Make the change in the build script, then run: node scripts/build-wada-explorer.js');
    process.exit(1);
  }
  console.log('✓ tools/wada-explorer/index.html matches its build script.');
} else {
  fs.writeFileSync(outputPath, html);
  console.log('Successfully wrote tools/wada-explorer/index.html');
}
