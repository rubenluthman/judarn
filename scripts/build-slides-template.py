#!/usr/bin/env python3
"""
scripts/build-slides-template.py

Generates the canonical Judarn Presentation Template (.pptx) from scratch
with fully compliant OpenXML presentation markup, 16:9 widescreen dimensions,
and comprehensive examples of every slide archetype in the Judarn system:
- Title / Cover (Dark Tyrian Blue)
- Section Divider / Chapter Break (Dark Tyrian Blue)
- Executive Narrative & Textual Information (Light Paper)
- Three-Pillar Architecture Grid (Light Paper)
- Editorial Pullquote (Light Paper)
- Impact Pullquote (Dark Tyrian Blue)
- Dense Tabular Data Matrix (Light Paper)
- Key Performance Metrics / KPI Grid (Dark Tyrian Blue)
- Technical Architecture & Code Block (Light Paper)
- Two-Way Trade-off Comparison (Light Paper)
"""
import datetime
import os
import json
import subprocess
import math
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import PP_ALIGN

# -------------------------------------------------------------
# Color Palette: Load dynamically from tokens/judarn-tokens.json
# -------------------------------------------------------------
def _oklch_to_rgb(oklch_str):
    parts = oklch_str.replace("oklch(", "").replace(")", "").split()
    l, c, h_deg = float(parts[0]), float(parts[1]), float(parts[2])
    h = math.radians(h_deg)
    a = c * math.cos(h)
    b = c * math.sin(h)
    l_ = l + 0.3963377774 * a + 0.2158037573 * b
    m_ = l - 0.1055613458 * a - 0.0638541728 * b
    s_ = l - 0.0894841775 * a - 1.2914855480 * b
    l3, m3, s3 = l_**3, m_**3, s_**3
    r_lin = +4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3
    g_lin = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3
    b_lin = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.7076147010 * s3
    def gamma(v):
        v = max(0.0, min(1.0, v))
        return 12.92 * v if v <= 0.0031308 else 1.055 * (v ** (1.0 / 2.4)) - 0.055
    return int(round(gamma(r_lin) * 255)), int(round(gamma(g_lin) * 255)), int(round(gamma(b_lin) * 255))

# Resolved flat view of tokens/judarn.resolver.json (Design Tokens Format Module 2025.10); the Node
# loader validates conformance and fails loudly, so this never reads a half-valid token set.
_loader_path = os.path.join(os.path.dirname(__file__), "lib/design-tokens.js")
_tokens_data = json.loads(subprocess.run(
    ["node", _loader_path, "--flat"], check=True, capture_output=True, text=True
).stdout)

_wada119 = _tokens_data.get("theme", {}).get("wada119", {})
_colors = _tokens_data.get("color", {})

_r, _g, _b = _oklch_to_rgb(_wada119.get("surfaceElevated", {}).get("dark", {}).get("$value", "oklch(0.317 0.060 243.1)"))
COLOR_DARK_TYRIAN = RGBColor(_r, _g, _b)

_r, _g, _b = _oklch_to_rgb(_wada119.get("accent", {}).get("light", {}).get("$value", "oklch(0.810 0.039 215.1)"))
COLOR_LIGHT_GLAUCOUS = RGBColor(_r, _g, _b)

_r, _g, _b = _oklch_to_rgb(_colors.get("surfaceElevated", {}).get("light", {}).get("$value", "oklch(1.000 0.000 0)"))
COLOR_WHITE = RGBColor(_r, _g, _b)

_r, _g, _b = _oklch_to_rgb(_colors.get("ink100", {}).get("light", {}).get("$value", "oklch(0.080 0.000 0)"))
COLOR_BLACK = RGBColor(_r, _g, _b)

_r, _g, _b = _oklch_to_rgb(_colors.get("ink60", {}).get("light", {}).get("$value", "oklch(0.520 0.005 92)"))
COLOR_SLATE_GREY = RGBColor(_r, _g, _b)
COLOR_MUTED_GREY = RGBColor(_r, _g, _b)

COLOR_LIGHT_MUTED  = RGBColor(0x8A, 0xA3, 0xBA) # #8aa3ba (on dark)
COLOR_CARD_LIGHT   = RGBColor(0xF8, 0xF9, 0xFA) # #f8f9fa
_r, _g, _b = _oklch_to_rgb(_colors.get("surfaceRecessed", {}).get("light", {}).get("$value", "oklch(0.935 0.008 92)"))
COLOR_CARD_ALT     = RGBColor(_r, _g, _b)       # Judarn surfaceRecessed
COLOR_CALLOUT_TINT = RGBColor(0xF5, 0xF8, 0xFC) # #f5f8fc
COLOR_BORDER_LIGHT = RGBColor(0xE5, 0xE7, 0xEB) # #e5e7eb
COLOR_GREEN_STATUS = RGBColor(0x13, 0x73, 0x33) # #137333
COLOR_DARK_CARD    = RGBColor(0x0D, 0x25, 0x38) # #0d2538

FONT_SERIF = "IBM Plex Serif"
FONT_SANS  = "IBM Plex Sans"
FONT_MONO  = "IBM Plex Mono"

def add_solid_background(slide, prs, color):
    bg = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, prs.slide_width, prs.slide_height)
    bg.fill.solid()
    bg.fill.fore_color.rgb = color
    bg.line.fill.background()
    return bg

def add_card(slide, left, top, width, height, fill_color):
    card = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, left, top, width, height)
    card.fill.solid()
    card.fill.fore_color.rgb = fill_color
    card.line.fill.background()
    return card

def add_header_group(slide, eyebrow, title, subtitle, is_dark=False):
    # Eyebrow
    tx_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.6), Inches(11.733), Inches(0.4))
    tf = tx_box.text_frame
    tf.word_wrap = True
    tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0
    p = tf.paragraphs[0]
    p.text = eyebrow.upper()
    p.font.name = FONT_SANS
    p.font.size = Pt(10)
    p.font.bold = True
    p.font.color.rgb = COLOR_LIGHT_GLAUCOUS if is_dark else COLOR_DARK_TYRIAN

    # Title
    p_title = tf.add_paragraph()
    p_title.text = title
    p_title.font.name = FONT_SANS
    p_title.font.size = Pt(28)
    p_title.font.bold = True
    p_title.font.color.rgb = COLOR_WHITE if is_dark else COLOR_DARK_TYRIAN
    p_title.space_before = Pt(4)

    # Subtitle
    if subtitle:
        p_sub = tf.add_paragraph()
        p_sub.text = subtitle
        p_sub.font.name = FONT_SANS
        p_sub.font.size = Pt(14)
        p_sub.font.color.rgb = COLOR_LIGHT_MUTED if is_dark else COLOR_SLATE_GREY
        p_sub.space_before = Pt(4)

def build_presentation(output_path):
    prs = Presentation()
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)
    blank_layout = prs.slide_layouts[6]

    # =========================================================
    # SLIDE 1: Cover / Focus Headline (Dark Tyrian Blue)
    # =========================================================
    s1 = prs.slides.add_slide(blank_layout)
    add_solid_background(s1, prs, COLOR_DARK_TYRIAN)

    # Slide Focus Message (Centered Vertical Rhythm)
    tx1 = s1.shapes.add_textbox(Inches(1.0), Inches(1.2), Inches(11.333), Inches(3.6))
    tf1 = tx1.text_frame
    tf1.word_wrap = True
    tf1.margin_left = tf1.margin_top = tf1.margin_right = tf1.margin_bottom = 0

    p_eye = tf1.paragraphs[0]
    p_eye.text = "DESIGN SPECIFICATION"
    p_eye.font.name = FONT_SANS
    p_eye.font.size = Pt(11)
    p_eye.font.bold = True
    p_eye.font.color.rgb = COLOR_LIGHT_GLAUCOUS

    p_title = tf1.add_paragraph()
    p_title.font.name = FONT_SERIF
    p_title.font.size = Pt(40)
    p_title.font.bold = True
    p_title.space_before = Pt(12)

    r1 = p_title.add_run()
    r1.text = "Host geometry with "
    r1.font.color.rgb = COLOR_WHITE

    r2 = p_title.add_run()
    r2.text = "OKLCh color"
    r2.font.color.rgb = COLOR_LIGHT_GLAUCOUS

    r3 = p_title.add_run()
    r3.text = " from one token set."
    r3.font.color.rgb = COLOR_WHITE

    p_sub = tf1.add_paragraph()
    p_sub.text = "Judarn sets color, spatial rhythm, and typography. The host platform shapes geometry, depth, and touch behavior."
    p_sub.font.name = FONT_SANS
    p_sub.font.size = Pt(16)
    p_sub.font.color.rgb = COLOR_LIGHT_MUTED
    p_sub.space_before = Pt(16)

    # Metric Anchors (Balanced 3-column baseline)
    line1 = s1.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(1.0), Inches(5.1), Inches(11.333), Inches(0.015))
    line1.fill.solid()
    line1.fill.fore_color.rgb = RGBColor(0x28, 0x4D, 0x67)
    line1.line.fill.background()

    metrics_s1 = [
        ("348", "Combinations", "Sanzo Wada color dictionary"),
        ("159", "Colors", "Named in the dictionary"),
        ("2", "Compiled hosts", "Apple and web, from one token set")
    ]
    col_w_s1 = Inches(3.7)
    gap_s1 = Inches(0.116)
    for idx, (val, lbl, sub) in enumerate(metrics_s1):
        left_pos = Inches(1.0) + idx * (col_w_s1 + gap_s1)
        tx_m = s1.shapes.add_textbox(left_pos, Inches(5.3), col_w_s1, Inches(1.6))
        tf_m = tx_m.text_frame
        tf_m.word_wrap = True
        tf_m.margin_left = tf_m.margin_top = tf_m.margin_right = tf_m.margin_bottom = 0

        p_v = tf_m.paragraphs[0]
        p_v.text = val
        p_v.font.name = FONT_MONO
        p_v.font.size = Pt(34)
        p_v.font.bold = True
        p_v.font.color.rgb = COLOR_LIGHT_GLAUCOUS

        p_l = tf_m.add_paragraph()
        p_l.text = lbl
        p_l.font.name = FONT_SANS
        p_l.font.size = Pt(12)
        p_l.font.bold = True
        p_l.font.color.rgb = COLOR_WHITE
        p_l.space_before = Pt(4)

        p_s = tf_m.add_paragraph()
        p_s.text = sub
        p_s.font.name = FONT_SANS
        p_s.font.size = Pt(10.5)
        p_s.font.color.rgb = COLOR_LIGHT_MUTED
        p_s.space_before = Pt(2)

    # =========================================================
    # SLIDE 2: Section Divider / Chapter Break (Dark Tyrian Blue)
    # =========================================================
    s2 = prs.slides.add_slide(blank_layout)
    add_solid_background(s2, prs, COLOR_DARK_TYRIAN)

    tx2 = s2.shapes.add_textbox(Inches(1.0), Inches(2.0), Inches(11.333), Inches(4.0))
    tf2 = tx2.text_frame
    tf2.word_wrap = True
    tf2.margin_left = tf2.margin_top = tf2.margin_right = tf2.margin_bottom = 0

    p2_num = tf2.paragraphs[0]
    p2_num.text = "01"
    p2_num.font.name = FONT_MONO
    p2_num.font.size = Pt(64)
    p2_num.font.bold = True
    p2_num.font.color.rgb = COLOR_LIGHT_GLAUCOUS

    p2_title = tf2.add_paragraph()
    p2_title.text = "Scope and Typographic Rhythm"
    p2_title.font.name = FONT_SERIF
    p2_title.font.size = Pt(38)
    p2_title.font.bold = True
    p2_title.font.color.rgb = COLOR_WHITE
    p2_title.space_before = Pt(8)

    p2_desc = tf2.add_paragraph()
    p2_desc.text = "Scope, type scale, spacing grid, and optional Sanzo Wada color combinations."
    p2_desc.font.name = FONT_SANS
    p2_desc.font.size = Pt(16)
    p2_desc.font.color.rgb = COLOR_LIGHT_MUTED
    p2_desc.space_before = Pt(14)

    # =========================================================
    # SLIDE 3: Executive Narrative & Textual Information (Light Paper)
    # =========================================================
    s3 = prs.slides.add_slide(blank_layout)
    add_solid_background(s3, prs, COLOR_WHITE)
    add_header_group(s3, "EXECUTIVE BRIEFING", "Cross-Platform Spatial Rhythm & Surface Contrasts", "Surfaces are grouped by fill, not by outline")

    # Column 1: Context
    tx3_col1 = s3.shapes.add_textbox(Inches(0.8), Inches(2.2), Inches(5.6), Inches(3.2))
    tf3_1 = tx3_col1.text_frame
    tf3_1.word_wrap = True
    tf3_1.margin_left = tf3_1.margin_top = tf3_1.margin_right = tf3_1.margin_bottom = 0

    p_h2_1 = tf3_1.paragraphs[0]
    p_h2_1.text = "Why not borders"
    p_h2_1.font.name = FONT_SERIF
    p_h2_1.font.size = Pt(18)
    p_h2_1.font.bold = True
    p_h2_1.font.color.rgb = COLOR_DARK_TYRIAN

    p_body_1 = tf3_1.add_paragraph()
    p_body_1.text = (
        "Borders drawn around every card compete with the content inside them. "
        "Grouping by fill keeps the eye on the data instead of the container."
    )
    p_body_1.font.name = FONT_SANS
    p_body_1.font.size = Pt(13)
    p_body_1.font.color.rgb = COLOR_BLACK
    p_body_1.space_before = Pt(8)

    # Column 2: Architecture Decision
    tx3_col2 = s3.shapes.add_textbox(Inches(6.9), Inches(2.2), Inches(5.6), Inches(3.2))
    tf3_2 = tx3_col2.text_frame
    tf3_2.word_wrap = True
    tf3_2.margin_left = tf3_2.margin_top = tf3_2.margin_right = tf3_2.margin_bottom = 0

    p_h2_2 = tf3_2.paragraphs[0]
    p_h2_2.text = "Fill instead of outline"
    p_h2_2.font.name = FONT_SERIF
    p_h2_2.font.size = Pt(18)
    p_h2_2.font.bold = True
    p_h2_2.font.color.rgb = COLOR_DARK_TYRIAN

    p_body_2 = tf3_2.add_paragraph()
    p_body_2.text = (
        "Judarn groups surfaces by background fill. Elevated cards (#F8F8F8) sit on a "
        "white (#FFFFFF) substrate with no perimeter border; the step in fill separates them."
    )
    p_body_2.font.name = FONT_SANS
    p_body_2.font.size = Pt(13)
    p_body_2.font.color.rgb = COLOR_BLACK
    p_body_2.space_before = Pt(8)

    # Wada Callout Box at bottom
    add_card(s3, Inches(0.8), Inches(5.6), Inches(11.733), Inches(1.2), COLOR_CALLOUT_TINT)
    # Left indicator rule
    rule_s3 = s3.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.8), Inches(5.6), Inches(0.06), Inches(1.2))
    rule_s3.fill.solid()
    rule_s3.fill.fore_color.rgb = COLOR_LIGHT_GLAUCOUS
    rule_s3.line.fill.background()

    tx3_callout = s3.shapes.add_textbox(Inches(1.1), Inches(5.75), Inches(11.2), Inches(0.9))
    tf3_callout = tx3_callout.text_frame
    tf3_callout.word_wrap = True
    tf3_callout.margin_left = tf3_callout.margin_top = tf3_callout.margin_right = tf3_callout.margin_bottom = 0
    p_callout = tf3_callout.paragraphs[0]
    p_callout.text = "Core Invariant: "
    p_callout.font.name = FONT_SANS
    p_callout.font.size = Pt(12)
    p_callout.font.bold = True
    p_callout.font.color.rgb = COLOR_DARK_TYRIAN

    run_c_text = p_callout.add_run()
    run_c_text.text = "Distinguish surfaces by background fill contrast (surfaceElevated on substrate). Never apply .border() or .overlay(strokeBorder()) around card perimeters. Hairlines belong only inside tabular matrices."
    run_c_text.font.name = FONT_SANS
    run_c_text.font.size = Pt(12)
    run_c_text.font.bold = False
    run_c_text.font.color.rgb = COLOR_BLACK

    # =========================================================
    # SLIDE 4: Three-Pillar Architecture Grid (Light Paper)
    # =========================================================
    s4 = prs.slides.add_slide(blank_layout)
    add_solid_background(s4, prs, COLOR_WHITE)
    add_header_group(s4, "FOUNDATIONAL ARCHITECTURE", "The Three Judarn Platform Invariants", "A clean authority split between design tokens and native operating system mechanics")

    pillars = [
        ("01", "OKLCh Color & Grid", 
         "Colors are authored in OKLCh for light and dark appearances. Spacing snaps to an 8 pt grid with a 4 pt subgrid."),
        ("02", "Native Curve Authority", 
         "Judarn never overrides host platform physics, hardware curves, or native interaction states. Squircle geometry and corner radii belong to the operating system."),
        ("03", "Sanzo Wada Harmony", 
         "Optional accents from Sanzo Wada's color combinations (Tyrian Blue and Olympic Blue), used here for indicators, data tables, and badges.")
    ]

    card_w = Inches(3.75)
    gap = Inches(0.24)
    start_left = Inches(0.8)

    for idx, (num, p_title, p_desc) in enumerate(pillars):
        left_pos = start_left + idx * (card_w + gap)
        add_card(s4, left_pos, Inches(2.2), card_w, Inches(4.5), COLOR_CARD_LIGHT)

        tx_p = s4.shapes.add_textbox(left_pos + Inches(0.35), Inches(2.5), card_w - Inches(0.7), Inches(3.9))
        tf_p = tx_p.text_frame
        tf_p.word_wrap = True
        tf_p.margin_left = tf_p.margin_top = tf_p.margin_right = tf_p.margin_bottom = 0

        p_idx = tf_p.paragraphs[0]
        p_idx.text = num
        p_idx.font.name = FONT_MONO
        p_idx.font.size = Pt(24)
        p_idx.font.bold = True
        p_idx.font.color.rgb = COLOR_LIGHT_GLAUCOUS

        p_h = tf_p.add_paragraph()
        p_h.text = p_title
        p_h.font.name = FONT_SANS
        p_h.font.size = Pt(18)
        p_h.font.bold = True
        p_h.font.color.rgb = COLOR_DARK_TYRIAN
        p_h.space_before = Pt(14)

        p_b = tf_p.add_paragraph()
        p_b.text = p_desc
        p_b.font.name = FONT_SANS
        p_b.font.size = Pt(13)
        p_b.font.color.rgb = COLOR_BLACK
        p_b.space_before = Pt(12)

    # =========================================================
    # SLIDE 5: Editorial Pullquote (Light Paper)
    # =========================================================
    s5 = prs.slides.add_slide(blank_layout)
    add_solid_background(s5, prs, COLOR_WHITE)
    add_header_group(s5, "EDITORIAL PERSPECTIVE", "Platform Authority Invariant", None)

    # Vertical Olympic Blue bar
    bar5 = s5.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(1.2), Inches(2.3), Inches(0.08), Inches(3.8))
    bar5.fill.solid()
    bar5.fill.fore_color.rgb = COLOR_LIGHT_GLAUCOUS
    bar5.line.fill.background()

    tx5 = s5.shapes.add_textbox(Inches(1.6), Inches(2.3), Inches(10.5), Inches(3.8))
    tf5 = tx5.text_frame
    tf5.word_wrap = True
    tf5.margin_left = tf5.margin_top = tf5.margin_right = tf5.margin_bottom = 0

    p5_quote = tf5.paragraphs[0]
    p5_quote.text = "“Design systems that override host platform physics inevitably feel foreign. Judarn sets color, spatial rhythm, and typography  –  the operating system owns geometry, depth, and touch mechanics.”"
    p5_quote.font.name = FONT_SERIF
    p5_quote.font.size = Pt(28)
    p5_quote.font.bold = False
    p5_quote.font.color.rgb = COLOR_BLACK

    p5_attr = tf5.add_paragraph()
    p5_attr.text = "Judarn Design Principles"
    p5_attr.font.name = FONT_SANS
    p5_attr.font.size = Pt(16)
    p5_attr.font.bold = True
    p5_attr.font.color.rgb = COLOR_DARK_TYRIAN
    p5_attr.space_before = Pt(24)

    p5_role = tf5.add_paragraph()
    p5_role.text = "Section 1.1 · Platform Invariants Contract"
    p5_role.font.name = FONT_SANS
    p5_role.font.size = Pt(13)
    p5_role.font.color.rgb = COLOR_SLATE_GREY
    p5_role.space_before = Pt(4)

    # =========================================================
    # SLIDE 6: Impact Pullquote (Dark Tyrian Blue)
    # =========================================================
    s6 = prs.slides.add_slide(blank_layout)
    add_solid_background(s6, prs, COLOR_DARK_TYRIAN)
    add_header_group(s6, "TYPOGRAPHY", "Body Text", None, is_dark=True)

    # Vertical Olympic Blue bar
    bar6 = s6.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(1.2), Inches(2.3), Inches(0.08), Inches(3.8))
    bar6.fill.solid()
    bar6.fill.fore_color.rgb = COLOR_LIGHT_GLAUCOUS
    bar6.line.fill.background()

    tx6 = s6.shapes.add_textbox(Inches(1.6), Inches(2.3), Inches(10.5), Inches(3.8))
    tf6 = tx6.text_frame
    tf6.word_wrap = True
    tf6.margin_left = tf6.margin_top = tf6.margin_right = tf6.margin_bottom = 0

    p6_quote = tf6.paragraphs[0]
    p6_quote.text = "“Body text is set in black on white, with lines close together so a paragraph reads as one block.”"
    p6_quote.font.name = FONT_SERIF
    p6_quote.font.size = Pt(28)
    p6_quote.font.bold = False
    p6_quote.font.color.rgb = COLOR_WHITE

    p6_attr = tf6.add_paragraph()
    p6_attr.text = "Judarn Typography Specification"
    p6_attr.font.name = FONT_SANS
    p6_attr.font.size = Pt(16)
    p6_attr.font.bold = True
    p6_attr.font.color.rgb = COLOR_LIGHT_GLAUCOUS
    p6_attr.space_before = Pt(24)

    p6_role = tf6.add_paragraph()
    p6_role.text = "Typography contract"
    p6_role.font.name = FONT_MONO
    p6_role.font.size = Pt(13)
    p6_role.font.color.rgb = COLOR_LIGHT_MUTED
    p6_role.space_before = Pt(4)

    # =========================================================
    # SLIDE 7: Dense Tabular Data Matrix (Light Paper)
    # =========================================================
    s7 = prs.slides.add_slide(blank_layout)
    add_solid_background(s7, prs, COLOR_WHITE)
    add_header_group(s7, "HOSTS", "Package Matrix", "Hosts, distribution, and status")

    table_shape = s7.shapes.add_table(6, 5, Inches(0.8), Inches(2.2), Inches(11.733), Inches(4.4))
    table = table_shape.table

    table.columns[0].width = Inches(3.2)
    table.columns[1].width = Inches(2.6)
    table.columns[2].width = Inches(1.6)
    table.columns[3].width = Inches(2.0)
    table.columns[4].width = Inches(2.333)

    headers = ["Package Target", "Runtime", "Distribution", "Tokens", "Status"]
    for idx, title in enumerate(headers):
        cell = table.cell(0, idx)
        cell.text = title
        cell.fill.solid()
        cell.fill.fore_color.rgb = COLOR_CARD_LIGHT
        p = cell.text_frame.paragraphs[0]
        p.font.name = FONT_SANS
        p.font.size = Pt(11)
        p.font.bold = True
        p.font.color.rgb = COLOR_DARK_TYRIAN
        if idx == 4:
            p.alignment = PP_ALIGN.RIGHT

    data = [
        ("Apple Native (SwiftUI)", "macOS 14+ / iOS 17+", "Swift package", "Compiled", "Available", COLOR_GREEN_STATUS),
        ("Web (@judarn/ui)", "React / Tailwind v4", "npm package", "Compiled", "Available", COLOR_GREEN_STATUS),
        ("Android Compose", "Jetpack Compose", "Not published", "Not compiled", "Parked", COLOR_SLATE_GREY),
        ("Design Tokens", "Design Tokens Format 2025.10", "JSON in repository", "Source", "Available", COLOR_GREEN_STATUS),
        ("Document & Slide Starters", "Word, PowerPoint, Google", "Files in repository", "Local variant", "Available", COLOR_GREEN_STATUS),
    ]

    for row_idx, (track, env, ver, latency, status_txt, status_col) in enumerate(data, start=1):
        # Target
        c0 = table.cell(row_idx, 0)
        c0.text = track
        p0 = c0.text_frame.paragraphs[0]
        p0.font.name = FONT_SANS
        p0.font.size = Pt(12)
        p0.font.bold = True
        p0.font.color.rgb = COLOR_BLACK

        # Env
        c1 = table.cell(row_idx, 1)
        c1.text = env
        p1 = c1.text_frame.paragraphs[0]
        p1.font.name = FONT_SANS
        p1.font.size = Pt(12)
        p1.font.color.rgb = COLOR_SLATE_GREY

        # Ver
        c2 = table.cell(row_idx, 2)
        c2.text = ver
        p2 = c2.text_frame.paragraphs[0]
        p2.font.name = FONT_MONO
        p2.font.size = Pt(12)
        p2.font.color.rgb = COLOR_BLACK

        # Latency
        c3 = table.cell(row_idx, 3)
        c3.text = latency
        p3 = c3.text_frame.paragraphs[0]
        p3.font.name = FONT_MONO
        p3.font.size = Pt(12)
        p3.font.color.rgb = COLOR_BLACK

        # Status
        c4 = table.cell(row_idx, 4)
        c4.text = status_txt
        p4 = c4.text_frame.paragraphs[0]
        p4.font.name = FONT_SANS
        p4.font.size = Pt(11)
        p4.font.bold = True
        p4.font.color.rgb = status_col
        p4.alignment = PP_ALIGN.RIGHT

    # =========================================================
    # SLIDE 8: Key Performance Metrics / KPI Grid (Dark Tyrian Blue)
    # =========================================================
    s8 = prs.slides.add_slide(blank_layout)
    add_solid_background(s8, prs, COLOR_DARK_TYRIAN)
    add_header_group(s8, "VERIFICATION", "What the Checks Cover", "Figures come from the token set and the web test suite", is_dark=True)

    metrics = [
        ("348", "WADA COMBINATIONS", "From the dictionary, calibrated in OKLCh"),
        ("159", "WADA COLORS", "Named in the dictionary"),
        ("15:1", "MINIMUM INK CONTRAST", "ink100 on surfaceElevated; WCAG AAA asks for 7:1"),
        ("2", "COMPILED HOSTS", "Apple and web, from one token set")
    ]

    card_m_w = Inches(2.78)
    gap_m = Inches(0.2)
    start_m = Inches(0.8)

    for idx, (val, lbl, sub) in enumerate(metrics):
        left_m = start_m + idx * (card_m_w + gap_m)
        add_card(s8, left_m, Inches(2.4), card_m_w, Inches(4.2), COLOR_DARK_CARD)

        tx_m = s8.shapes.add_textbox(left_m + Inches(0.25), Inches(2.7), card_m_w - Inches(0.5), Inches(3.6))
        tf_m = tx_m.text_frame
        tf_m.word_wrap = True
        tf_m.margin_left = tf_m.margin_top = tf_m.margin_right = tf_m.margin_bottom = 0

        p_v = tf_m.paragraphs[0]
        p_v.text = val
        p_v.font.name = FONT_MONO
        p_v.font.size = Pt(44)
        p_v.font.bold = True
        p_v.font.color.rgb = COLOR_LIGHT_GLAUCOUS

        p_l = tf_m.add_paragraph()
        p_l.text = lbl
        p_l.font.name = FONT_SANS
        p_l.font.size = Pt(11)
        p_l.font.bold = True
        p_l.font.color.rgb = COLOR_LIGHT_MUTED
        p_l.space_before = Pt(14)

        p_s = tf_m.add_paragraph()
        p_s.text = sub
        p_s.font.name = FONT_SANS
        p_s.font.size = Pt(12)
        p_s.font.color.rgb = COLOR_WHITE
        p_s.space_before = Pt(8)

    # =========================================================
    # SLIDE 9: Technical Architecture & Code Block (Light Paper)
    # =========================================================
    s9 = prs.slides.add_slide(blank_layout)
    add_solid_background(s9, prs, COLOR_WHITE)
    add_header_group(s9, "SPECIFICATION", "Token Interface", "One token source, compiled for each host")

    # Left Narrative
    tx9_left = s9.shapes.add_textbox(Inches(0.8), Inches(2.2), Inches(5.4), Inches(4.5))
    tf9_l = tx9_left.text_frame
    tf9_l.word_wrap = True
    tf9_l.margin_left = tf9_l.margin_top = tf9_l.margin_right = tf9_l.margin_bottom = 0

    p9_h = tf9_l.paragraphs[0]
    p9_h.text = "Token Pipeline"
    p9_h.font.name = FONT_SERIF
    p9_h.font.size = Pt(20)
    p9_h.font.bold = True
    p9_h.font.color.rgb = COLOR_DARK_TYRIAN

    p9_desc = tf9_l.add_paragraph()
    p9_desc.text = (
        "Design tokens originate in tokens/judarn-tokens.json, which follows the Design Tokens Format Module 2025.10. "
        "A build script compiles them into Swift constants and CSS custom properties, and a check fails when the output drifts from the source."
    )
    p9_desc.font.name = FONT_SANS
    p9_desc.font.size = Pt(13)
    p9_desc.font.color.rgb = COLOR_BLACK
    p9_desc.space_before = Pt(10)

    # Right Code Block
    add_card(s9, Inches(6.6), Inches(2.2), Inches(5.933), Inches(4.5), COLOR_CARD_LIGHT)
    # Dark indicator rule
    rule_s9 = s9.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(6.6), Inches(2.2), Inches(0.06), Inches(4.5))
    rule_s9.fill.solid()
    rule_s9.fill.fore_color.rgb = COLOR_DARK_TYRIAN
    rule_s9.line.fill.background()

    tx9_code = s9.shapes.add_textbox(Inches(6.9), Inches(2.5), Inches(5.4), Inches(4.0))
    tf9_c = tx9_code.text_frame
    tf9_c.word_wrap = True
    tf9_c.margin_left = tf9_c.margin_top = tf9_c.margin_right = tf9_c.margin_bottom = 0

    code_text = (
        "// Judarn token excerpt\n"
        "const judarnContract = {\n"
        "  grid: { macro: 8, micro: 4 },\n"
        "  colors: {\n"
        "    substrate: \"oklch(1.000 0.000 0)\",\n"
        "    elevated:  \"oklch(0.980 0.000 0)\",\n"
        "    tyrian:    \"#12354e\",\n"
        "    glaucous:  \"#a5c8d1\"\n"
        "  },\n"
        "  authority: {\n"
        "    judarn: [\"color\", \"type\", \"grid\"],\n"
        "    native: [\"curves\", \"motion\", \"touch\"]\n"
        "  }\n"
        "};"
    )
    p_code = tf9_c.paragraphs[0]
    p_code.text = code_text
    p_code.font.name = FONT_MONO
    p_code.font.size = Pt(11.5)
    p_code.font.color.rgb = COLOR_DARK_TYRIAN

    # =========================================================
    # SLIDE 10: Two-Way Trade-off Comparison (Light Paper)
    # =========================================================
    s10 = prs.slides.add_slide(blank_layout)
    add_solid_background(s10, prs, COLOR_WHITE)
    add_header_group(s10, "TRADE-OFFS", "Conventional Libraries and Judarn", "What changes when the host owns geometry and touch")

    card_comp_w = Inches(5.666)
    
    # Left Card: Conventional
    add_card(s10, Inches(0.8), Inches(2.2), card_comp_w, Inches(4.5), COLOR_CARD_LIGHT)
    tx10_l = s10.shapes.add_textbox(Inches(1.15), Inches(2.5), card_comp_w - Inches(0.7), Inches(4.0))
    tf10_l = tx10_l.text_frame
    tf10_l.word_wrap = True
    tf10_l.margin_left = tf10_l.margin_top = tf10_l.margin_right = tf10_l.margin_bottom = 0

    p10_lh = tf10_l.paragraphs[0]
    p10_lh.text = "Conventional UI Libraries"
    p10_lh.font.name = FONT_SERIF
    p10_lh.font.size = Pt(18)
    p10_lh.font.bold = True
    p10_lh.font.color.rgb = COLOR_DARK_TYRIAN

    conv_points = [
        "Overrides native controls, so touch behavior differs from the host",
        "Applies decorative stroke borders around every card perimeter",
        "Uses one-off spacing values that break the rhythm",
        "Ties styling to large components that change often"
    ]
    for pt in conv_points:
        p_pt = tf10_l.add_paragraph()
        p_pt.text = f"–  {pt}"
        p_pt.font.name = FONT_SANS
        p_pt.font.size = Pt(12.5)
        p_pt.font.color.rgb = COLOR_SLATE_GREY
        p_pt.space_before = Pt(10)

    # Right Card: Judarn
    add_card(s10, Inches(6.866), Inches(2.2), card_comp_w, Inches(4.5), COLOR_CARD_ALT)
    tx10_r = s10.shapes.add_textbox(Inches(7.216), Inches(2.5), card_comp_w - Inches(0.7), Inches(4.0))
    tf10_r = tx10_r.text_frame
    tf10_r.word_wrap = True
    tf10_r.margin_left = tf10_r.margin_top = tf10_r.margin_right = tf10_r.margin_bottom = 0

    p10_rh = tf10_r.paragraphs[0]
    p10_rh.text = "Judarn Design Foundation"
    p10_rh.font.name = FONT_SERIF
    p10_rh.font.size = Pt(18)
    p10_rh.font.bold = True
    p10_rh.font.color.rgb = COLOR_DARK_TYRIAN

    judarn_points = [
        "Leaves platform physics, curves, and haptics to the host",
        "Groups surfaces by background fill",
        "Follows an 8 pt grid with a 4 pt subgrid",
        "Compiles every host from one token source"
    ]
    for pt in judarn_points:
        p_pt = tf10_r.add_paragraph()
        p_pt.text = f"✓  {pt}"
        p_pt.font.name = FONT_SANS
        p_pt.font.size = Pt(12.5)
        p_pt.font.bold = True
        p_pt.font.color.rgb = COLOR_DARK_TYRIAN
        p_pt.space_before = Pt(10)

    # Save output
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    props = prs.core_properties
    props.title = "Judarn Presentation Template"
    props.author = "Ruben Luthman"
    props.last_modified_by = "Ruben Luthman"
    props.subject = "16:9 starter deck set in IBM Plex with Judarn colors"
    props.comments = ""
    props.keywords = "Judarn, template"
    props.created = props.modified = datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None, microsecond=0)
    prs.save(output_path)
    print(f"Successfully generated Judarn Presentation Template: {output_path}")

if __name__ == '__main__':
    repo_path = 'templates/slides/Judarn-Presentation-Template.pptx'
    build_presentation(repo_path)
