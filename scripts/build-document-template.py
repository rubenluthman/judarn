#!/usr/bin/env python3
"""
scripts/build-document-template.py

Generates the canonical Judarn Document Template (.docx) from scratch
with fully compliant OpenXML styles, margins, fonts, and comprehensive
examples of every text style in the Judarn design foundation.

Guarantees:
- Pure Black (#000000) for Headings and Normal text (zero blue themeColor).
- Upright Slate Grey (#55585B) for Subtitle.
- Exact spacing and single leading defined directly in styles without colliding inline overrides.
- Judarn custom color scheme in word/theme/theme1.xml.
"""
import datetime
import os
import json
import subprocess
import math
import shutil
import tempfile
import zipfile
import docx
from docx.shared import Pt, Inches, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import parse_xml
from docx.oxml.ns import nsdecls

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

_hex_dark_tyrian = _wada119.get("surfaceElevated", {}).get("dark", {}).get("hex", "#12354e").lstrip("#").upper()
_hex_light_glaucous = _wada119.get("accent", {}).get("light", {}).get("hex", "#a5c8d1").lstrip("#").upper()

_r_ink60, _g_ink60, _b_ink60 = _oklch_to_rgb(_colors.get("ink60", {}).get("light", {}).get("$value", "oklch(0.520 0.005 92)"))
_hex_ink60 = f"{_r_ink60:02X}{_g_ink60:02X}{_b_ink60:02X}"

def create_judarn_template(output_path):
    doc = docx.Document()
    
    # Page Setup: Letter Portrait with 1.0 inch margins
    section = doc.sections[0]
    section.page_width = Inches(8.5)
    section.page_height = Inches(11.0)
    section.top_margin = Inches(1.0)
    section.bottom_margin = Inches(1.0)
    section.left_margin = Inches(1.0)
    section.right_margin = Inches(1.0)
    
    def style_callout_paragraph(p):
        pPr = p._element.get_or_add_pPr()
        pBdr = parse_xml(r'<w:pBdr %s><w:left w:val="single" w:sz="28" w:space="14" w:color="A5C8D1"/></w:pBdr>' % nsdecls('w'))
        pPr.append(pBdr)
        shd = parse_xml(r'<w:shd %s w:val="clear" w:color="auto" w:fill="F5F8FC"/>' % nsdecls('w'))
        pPr.append(shd)

    def style_code_block_paragraph(p):
        pPr = p._element.get_or_add_pPr()
        pBdr = parse_xml(r'<w:pBdr %s><w:left w:val="single" w:sz="16" w:space="10" w:color="12354E"/></w:pBdr>' % nsdecls('w'))
        pPr.append(pBdr)
        shd = parse_xml(r'<w:shd %s w:val="clear" w:color="auto" w:fill="F8F8F8"/>' % nsdecls('w'))
        pPr.append(shd)

    # 1. Eyebrow / Category Label
    p_label = doc.add_paragraph()
    p_label.paragraph_format.space_before = Pt(0)
    p_label.paragraph_format.space_after = Pt(4)
    run_label = p_label.add_run("SPECIFICATION & ARCHITECTURE FRAMEWORK")
    run_label.font.name = "IBM Plex Sans"
    run_label.font.size = Pt(9.5)
    run_label.font.bold = True
    run_label.font.color.rgb = RGBColor(0x12, 0x35, 0x4E)

    # 2. Document Title (inherits Title style)
    p_title = doc.add_paragraph(style='Title')
    pPr_title = p_title._element.get_or_add_pPr()
    pBdr_none = parse_xml(
        r'<w:pBdr %s>'
        r'  <w:top w:val="none" w:sz="0" w:space="0" w:color="auto"/>'
        r'  <w:left w:val="none" w:sz="0" w:space="0" w:color="auto"/>'
        r'  <w:bottom w:val="none" w:sz="0" w:space="0" w:color="auto"/>'
        r'  <w:right w:val="none" w:sz="0" w:space="0" w:color="auto"/>'
        r'</w:pBdr>' % nsdecls('w')
    )
    pPr_title.append(pBdr_none)
    p_title.add_run("Judarn Document Design Specification")

    # 3. Subtitle / Byline (inherits Subtitle style)
    p_sub = doc.add_paragraph(style='Subtitle')
    p_sub.add_run("Judarn Design Foundation · Typography Specification")

    # 4. Heading 1 (inherits Heading 1 style)
    p_h1 = doc.add_paragraph(style='Heading 1')
    p_h1.add_run("1. Scope and Typographic System")

    # 5. Lead Paragraph (bodyLg: 13pt)
    p_lead = doc.add_paragraph()
    p_lead.paragraph_format.space_before = Pt(0)
    p_lead.paragraph_format.space_after = Pt(8)
    p_lead.paragraph_format.line_spacing = 1.0
    run_lead = p_lead.add_run(
        "This specification establishes the official typographic, spatial, and color foundation for all Judarn long-form documents. "
        "It covers the page's type, spacing, and color."
    )
    run_lead.font.name = "IBM Plex Sans"
    run_lead.font.size = Pt(13)
    run_lead.font.color.rgb = RGBColor(0, 0, 0)

    # 6. Normal Body Text (inherits Normal style)
    p_body1 = doc.add_paragraph(style='Normal')
    p_body1.add_run(
        "Body text is set in black (#000000) for long-form reading. "
        "Intra-paragraph line spacing is calibrated strictly to single leading (1.0), "
        "which keeps a paragraph together as one block. Paragraphs are separated by an 8 pt trailing margin instead of empty lines."
    )

    # 7. Heading 2 (inherits Heading 2 style)
    p_h2_1 = doc.add_paragraph(style='Heading 2')
    p_h2_1.add_run("1.1 Alternating Typeface Hierarchy")

    p_body2 = doc.add_paragraph(style='Normal')
    p_body2.add_run(
        "To tell heading levels apart at a glance, this template alternates typefaces: "
        "the Title is set in IBM Plex Serif, Heading 1 steps into IBM Plex Sans, and Heading 2 returns to IBM Plex Serif."
    )

    # 8. Heading 3 (inherits Heading 3 style)
    p_h3 = doc.add_paragraph(style='Heading 3')
    p_h3.add_run("1.1.1 Sub-Topics")

    p_body3 = doc.add_paragraph(style='Normal')
    p_body3.add_run(
        "Sub-topics step down to 13 pt IBM Plex Sans Semi-Bold. That is 18% larger than the 11 pt body text, in a heavier weight, "
        "so sub-sections stand apart from body prose."
    )

    # 9. Heading 4 (inherits Heading 4 style)
    p_h4 = doc.add_paragraph(style='Heading 4')
    p_h4.add_run("1.1.1.1 Run-In Subsection & Micro Hierarchy")

    p_body4 = doc.add_paragraph(style='Normal')
    p_body4.add_run(
        "When micro subsections require demarcation, Heading 4 matches the 11 pt body baseline in full Bold (700) weight. "
        "It marks the boundary without adding height."
    )

    # 10. Heading 2: Monospace Section
    p_h2_2 = doc.add_paragraph(style='Heading 2')
    p_h2_2.add_run("1.2 Tabular Numbers & Monospace Invariants")

    p_body5 = doc.add_paragraph(style='Normal')
    run_b5_1 = p_body5.add_run("For technical hashes, code tokens, and numeric data matrices, ")
    run_b5_mono = p_body5.add_run("IBM Plex Mono")
    run_b5_mono.font.name = "IBM Plex Mono"
    run_b5_mono.font.bold = True
    run_b5_2 = p_body5.add_run(
        " provides equal-width tabular lining figures. Because IBM Plex Sans and Mono share identical vertical metrics "
        "(516 x-height, 698 cap height), inline code like "
    )
    run_b5_inline = p_body5.add_run("JudarnColors.substrate")
    run_b5_inline.font.name = "IBM Plex Mono"
    run_b5_inline.font.color.rgb = RGBColor(0x12, 0x35, 0x4E)
    run_b5_3 = p_body5.add_run(
        " sits on the 11 pt body baseline without changing the line height. "
        "Standalone code blocks are calibrated to 9.5 pt with single line leading to balance glyph horizontal advance:"
    )

    # 11. Standalone Code Block
    p_code = doc.add_paragraph()
    p_code.paragraph_format.space_before = Pt(8)
    p_code.paragraph_format.space_after = Pt(14)
    p_code.paragraph_format.line_spacing = 1.0
    style_code_block_paragraph(p_code)
    run_code = p_code.add_run(
        'const judarnTokens = {\n'
        '  body: "11pt",\n'
        '  heading1: "20pt",\n'
        '  heading2: "16pt",\n'
        '  heading3: "13pt",\n'
        '  codeBlock: "9.5pt",\n'
        '  spaceAfter: "8pt"\n'
        '};'
    )
    run_code.font.name = "IBM Plex Mono"
    run_code.font.size = Pt(9.5)
    run_code.font.color.rgb = RGBColor(0x12, 0x35, 0x4E)

    # 12. Decision Callout Block
    p_callout = doc.add_paragraph()
    p_callout.paragraph_format.space_before = Pt(12)
    p_callout.paragraph_format.space_after = Pt(16)
    p_callout.paragraph_format.line_spacing = 1.0
    style_callout_paragraph(p_callout)
    
    run_callout_lead = p_callout.add_run("Core Architecture Principle: ")
    run_callout_lead.font.name = "IBM Plex Sans"
    run_callout_lead.font.size = Pt(10.5)
    run_callout_lead.font.bold = True
    run_callout_lead.font.color.rgb = RGBColor(0x12, 0x35, 0x4E)
    
    run_callout_text = p_callout.add_run(
        "Color is strictly removed from body paragraphs and restricted to structural anchors: "
        "callout indicator rules, table header boundaries, and metadata status badges using Sanzo Wada Combination 119."
    )
    run_callout_text.font.name = "IBM Plex Sans"
    run_callout_text.font.size = Pt(10.5)
    run_callout_text.font.color.rgb = RGBColor(0, 0, 0)

    # 13. Heading 1: Section 2
    p_h1_2 = doc.add_paragraph(style='Heading 1')
    p_h1_2.add_run("2. Deliverables & Sanzo Wada Harmony")

    p_body6 = doc.add_paragraph(style='Normal')
    p_body6.add_run(
        "Sanzo Wada Combination 119 pairs Dark Tyrian Blue (#12354e) and Light Glaucous Blue (#a5c8d1) as structural anchors "
        "across data tables and status indicators:"
    )

    # 14. Data Table with Wada Combination 119 Borders
    table = doc.add_table(rows=4, cols=4)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False

    col_widths = [Inches(2.5), Inches(1.5), Inches(1.25), Inches(1.25)]
    for row in table.rows:
        for idx, width in enumerate(col_widths):
            row.cells[idx].width = width

    headers = ["Deliverable Track", "Owner", "Target Date", "Status"]
    hdr_cells = table.rows[0].cells
    for idx, text in enumerate(headers):
        hdr_cells[idx].text = text
        p = hdr_cells[idx].paragraphs[0]
        p.paragraph_format.space_before = Pt(6)
        p.paragraph_format.space_after = Pt(6)
        p.paragraph_format.line_spacing = 1.0
        if idx >= 2:
            p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        else:
            p.alignment = WD_ALIGN_PARAGRAPH.LEFT
        run = p.runs[0]
        run.font.name = "IBM Plex Sans"
        run.font.size = Pt(9.5)
        run.font.bold = True
        run.font.color.rgb = RGBColor(0x12, 0x35, 0x4E)

        tcPr = hdr_cells[idx]._element.get_or_add_tcPr()
        shd = parse_xml(r'<w:shd %s w:val="clear" w:color="auto" w:fill="F8F8F8"/>' % nsdecls('w'))
        tcPr.append(shd)
        tcBorders = parse_xml(
            r'<w:tcBorders %s>'
            r'  <w:top w:val="single" w:sz="12" w:space="0" w:color="12354E"/>'
            r'  <w:bottom w:val="single" w:sz="12" w:space="0" w:color="D1D5DB"/>'
            r'  <w:left w:val="none"/>'
            r'  <w:right w:val="none"/>'
            r'</w:tcBorders>' % nsdecls('w')
        )
        tcPr.append(tcBorders)

    data = [
        ("Wire Protocol Specification", "Alice M.", "Oct 08, 2026", "Complete", (0x13, 0x73, 0x33)),
        ("Log Replication Engine", "Bob K.", "Oct 12, 2026", "In Progress", (0x12, 0x35, 0x4E)),
        ("Compaction Pipeline", "Charlie T.", "Oct 16, 2026", "Pending", (0x55, 0x58, 0x5B))
    ]

    for row_idx, (track, owner, date_str, status_text, status_fg) in enumerate(data, start=1):
        cells = table.rows[row_idx].cells
        
        cells[0].text = track
        p0 = cells[0].paragraphs[0]
        p0.paragraph_format.space_before = Pt(6)
        p0.paragraph_format.space_after = Pt(6)
        p0.paragraph_format.line_spacing = 1.0
        r0 = p0.runs[0]
        r0.font.name = "IBM Plex Sans"
        r0.font.size = Pt(10.5)
        r0.font.bold = True
        r0.font.color.rgb = RGBColor(0, 0, 0)
        
        cells[1].text = owner
        p1 = cells[1].paragraphs[0]
        p1.paragraph_format.space_before = Pt(6)
        p1.paragraph_format.space_after = Pt(6)
        p1.paragraph_format.line_spacing = 1.0
        r1 = p1.runs[0]
        r1.font.name = "IBM Plex Sans"
        r1.font.size = Pt(10.5)
        r1.font.color.rgb = RGBColor(0, 0, 0)
        
        cells[2].text = date_str
        p2 = cells[2].paragraphs[0]
        p2.paragraph_format.space_before = Pt(6)
        p2.paragraph_format.space_after = Pt(6)
        p2.paragraph_format.line_spacing = 1.0
        p2.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        r2 = p2.runs[0]
        r2.font.name = "IBM Plex Mono"
        r2.font.size = Pt(10.5)
        r2.font.color.rgb = RGBColor(0, 0, 0)
        
        cells[3].text = status_text
        p3 = cells[3].paragraphs[0]
        p3.paragraph_format.space_before = Pt(6)
        p3.paragraph_format.space_after = Pt(6)
        p3.paragraph_format.line_spacing = 1.0
        p3.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        r3 = p3.runs[0]
        r3.font.name = "IBM Plex Sans"
        r3.font.size = Pt(9.5)
        r3.font.bold = True
        r3.font.color.rgb = RGBColor(*status_fg)
        
        for cell in cells:
            tcPr = cell._element.get_or_add_tcPr()
            tcBorders = parse_xml(
                r'<w:tcBorders %s>'
                r'  <w:bottom w:val="single" w:sz="4" w:space="0" w:color="E5E7EB"/>'
                r'  <w:top w:val="none"/>'
                r'  <w:left w:val="none"/>'
                r'  <w:right w:val="none"/>'
                r'</w:tcBorders>' % nsdecls('w')
            )
            tcPr.append(tcBorders)

    # Empty spacer after table
    p_spacer = doc.add_paragraph()
    p_spacer.paragraph_format.space_before = Pt(8)
    p_spacer.paragraph_format.space_after = Pt(0)

    # 15. Heading 2: Checklist
    p_h2_3 = doc.add_paragraph(style='Heading 2')
    p_h2_3.add_run("2.1 Verification Checklist")

    checklist_items = [
        ("☑", "Add IBM Plex Serif, IBM Plex Sans, and IBM Plex Mono to font library", True),
        ("☑", "Verify single leading (1.0) inside paragraphs with 8 pt space after", True),
        ("☐", "Confirm pure black (#000000) normal text across all body content", False)
    ]

    for mark, text, checked in checklist_items:
        p_item = doc.add_paragraph()
        p_item.paragraph_format.space_before = Pt(0)
        p_item.paragraph_format.space_after = Pt(4)
        p_item.paragraph_format.line_spacing = 1.0
        
        r_mark = p_item.add_run(f"{mark}  ")
        r_mark.font.name = "IBM Plex Sans"
        r_mark.font.size = Pt(11)
        r_mark.font.bold = True
        if checked:
            r_mark.font.color.rgb = RGBColor(0xA5, 0xC8, 0xD1)
        else:
            r_mark.font.color.rgb = RGBColor(0x74, 0x77, 0x75)
            
        r_text = p_item.add_run(text)
        r_text.font.name = "IBM Plex Sans"
        r_text.font.size = Pt(11)
        r_text.font.color.rgb = RGBColor(0, 0, 0)

    # 16. Micro Caption Label
    p_cap_label = doc.add_paragraph()
    p_cap_label.paragraph_format.space_before = Pt(20)
    p_cap_label.paragraph_format.space_after = Pt(2)
    p_cap_label.paragraph_format.line_spacing = 1.0
    r_cap_label = p_cap_label.add_run("FIGURE 1.0  –  METRIC REFERENCE & MICRO METADATA")
    r_cap_label.font.name = "IBM Plex Sans"
    r_cap_label.font.size = Pt(9)
    r_cap_label.font.bold = True
    r_cap_label.font.color.rgb = RGBColor(0x55, 0x58, 0x5B)

    # 17. Footnote / Citation
    p_footnote = doc.add_paragraph()
    p_footnote.paragraph_format.space_before = Pt(4)
    p_footnote.paragraph_format.space_after = Pt(8)
    p_footnote.paragraph_format.line_spacing = 1.0
    r_fn = p_footnote.add_run(
        "¹ Judarn design system specifications adhere strictly to W3C Design Tokens Community Group standards. "
        "All measurements are mathematically aligned to the 8pt macro grid and 4pt micro subgrid."
    )
    r_fn.font.name = "IBM Plex Sans"
    r_fn.font.size = Pt(9)
    r_fn.font.color.rgb = RGBColor(0x74, 0x77, 0x75)

    props = doc.core_properties
    props.title = "Judarn Document Template"
    props.author = "Ruben Luthman"
    props.last_modified_by = "Ruben Luthman"
    props.subject = "Letter-size starter document set in IBM Plex with Judarn colors"
    props.comments = ""
    props.keywords = "Judarn, template"
    props.created = props.modified = datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None, microsecond=0)
    doc.save(output_path)

    # -------------------------------------------------------------
    # Post-process OpenXML styles and theme
    # -------------------------------------------------------------
    temp_dir = tempfile.mkdtemp()
    try:
        with zipfile.ZipFile(output_path, 'r') as zin:
            zin.extractall(temp_dir)

        import xml.etree.ElementTree as ET
        ns_w = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
        ET.register_namespace('w', ns_w['w'])

        # 1. Replace word/theme/theme1.xml with Judarn Theme
        theme_path = os.path.join(temp_dir, 'word/theme/theme1.xml')
        judarn_theme_xml = (
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
            '<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="Judarn Theme">\n'
            '  <a:themeElements>\n'
            '    <a:clrScheme name="Judarn">\n'
            '      <a:dk1><a:sysClr val="windowText" lastClr="000000"/></a:dk1>\n'
            '      <a:lt1><a:sysClr val="window" lastClr="FFFFFF"/></a:lt1>\n'
            '      <a:dk2><a:srgbClr val="000000"/></a:dk2>\n'
            '      <a:lt2><a:srgbClr val="F4F5F7"/></a:lt2>\n'
            f'      <a:accent1><a:srgbClr val="{_hex_dark_tyrian}"/></a:accent1>\n'
            f'      <a:accent2><a:srgbClr val="{_hex_light_glaucous}"/></a:accent2>\n'
            f'      <a:accent3><a:srgbClr val="{_hex_ink60}"/></a:accent3>\n'
            '      <a:accent4><a:srgbClr val="137333"/></a:accent4>\n'
            f'      <a:accent5><a:srgbClr val="{_hex_ink60}"/></a:accent5>\n'
            '      <a:accent6><a:srgbClr val="000000"/></a:accent6>\n'
            f'      <a:hlink><a:srgbClr val="{_hex_dark_tyrian}"/></a:hlink>\n'
            f'      <a:folHlink><a:srgbClr val="{_hex_light_glaucous}"/></a:folHlink>\n'
            '    </a:clrScheme>\n'
            '    <a:fontScheme name="Judarn Fonts">\n'
            '      <a:majorFont><a:latin typeface="IBM Plex Serif"/><a:ea typeface=""/><a:cs typeface=""/></a:majorFont>\n'
            '      <a:minorFont><a:latin typeface="IBM Plex Sans"/><a:ea typeface=""/><a:cs typeface=""/></a:minorFont>\n'
            '    </a:fontScheme>\n'
            '    <a:fmtScheme name="Judarn Format">\n'
            '      <a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:fillStyleLst>\n'
            '      <a:lnStyleLst><a:ln w="9525" cap="flat" cmpd="s" algn="ctr"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln><a:ln w="19050" cap="flat" cmpd="s" algn="ctr"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln><a:ln w="38100" cap="flat" cmpd="s" algn="ctr"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln></a:lnStyleLst>\n'
            '      <a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst>\n'
            '      <a:bgFillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:bgFillStyleLst>\n'
            '    </a:fmtScheme>\n'
            '  </a:themeElements>\n'
            '</a:theme>'
        )
        os.makedirs(os.path.dirname(theme_path), exist_ok=True)
        with open(theme_path, 'w', encoding='utf-8') as f:
            f.write(judarn_theme_xml)

        # 2. Configure word/styles.xml and word/stylesWithEffects.xml
        style_files = ['word/styles.xml', 'word/stylesWithEffects.xml']
        style_configs = {
            'Title': {'font': 'IBM Plex Serif', 'sz': '56', 'before': '0', 'after': '160', 'line': '240', 'bold': True, 'color': '000000'},
            'TitleChar': {'font': 'IBM Plex Serif', 'sz': '56', 'bold': True, 'color': '000000'},
            'Subtitle': {'font': 'IBM Plex Sans', 'sz': '26', 'before': '0', 'after': '480', 'line': '240', 'color': '55585B'},
            'SubtitleChar': {'font': 'IBM Plex Sans', 'sz': '26', 'color': '55585B'},
            'Heading1': {'font': 'IBM Plex Sans', 'sz': '40', 'before': '720', 'after': '120', 'line': '240', 'bold': True, 'color': '000000'},
            'Heading1Char': {'font': 'IBM Plex Sans', 'sz': '40', 'bold': True, 'color': '000000'},
            'Heading2': {'font': 'IBM Plex Serif', 'sz': '32', 'before': '480', 'after': '100', 'line': '240', 'bold': True, 'color': '000000'},
            'Heading2Char': {'font': 'IBM Plex Serif', 'sz': '32', 'bold': True, 'color': '000000'},
            'Heading3': {'font': 'IBM Plex Sans', 'sz': '26', 'before': '320', 'after': '80', 'line': '240', 'bold': True, 'color': '000000'},
            'Heading3Char': {'font': 'IBM Plex Sans', 'sz': '26', 'bold': True, 'color': '000000'},
            'Heading4': {'font': 'IBM Plex Sans', 'sz': '22', 'before': '240', 'after': '60', 'line': '240', 'bold': True, 'color': '000000'},
            'Heading4Char': {'font': 'IBM Plex Sans', 'sz': '22', 'bold': True, 'color': '000000'},
            'Normal': {'font': 'IBM Plex Sans', 'sz': '22', 'before': '0', 'after': '160', 'line': '240', 'color': '000000'},
        }

        for rel_style_file in style_files:
            styles_xml_path = os.path.join(temp_dir, rel_style_file)
            if not os.path.exists(styles_xml_path):
                continue
            tree = ET.parse(styles_xml_path)
            root = tree.getroot()

            for s in root.findall('w:style', ns_w):
                sId = s.attrib.get('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}styleId')
                
                # Strip all themeColor and themeShade attributes from all colors in every style
                for c in s.findall('.//w:color', ns_w):
                    c.attrib.pop('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}themeColor', None)
                    c.attrib.pop('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}themeShade', None)
                    c.attrib.pop('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}themeTint', None)

                if sId in style_configs:
                    cfg = style_configs[sId]
                    
                    rPr = s.find('w:rPr', ns_w)
                    if rPr is None:
                        rPr = ET.SubElement(s, '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}rPr')
                    
                    # Font
                    if 'font' in cfg:
                        rFonts = rPr.find('w:rFonts', ns_w)
                        if rFonts is None:
                            rFonts = ET.SubElement(rPr, '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}rFonts')
                        rFonts.attrib['{http://schemas.openxmlformats.org/wordprocessingml/2006/main}ascii'] = cfg['font']
                        rFonts.attrib['{http://schemas.openxmlformats.org/wordprocessingml/2006/main}hAnsi'] = cfg['font']
                        rFonts.attrib['{http://schemas.openxmlformats.org/wordprocessingml/2006/main}cs'] = cfg['font']
                    
                    # Size
                    if 'sz' in cfg:
                        for tag in ['w:sz', 'w:szCs']:
                            el = rPr.find(tag, ns_w)
                            if el is None:
                                el = ET.SubElement(rPr, f'{{http://schemas.openxmlformats.org/wordprocessingml/2006/main}}{tag[2:]}')
                            el.attrib['{http://schemas.openxmlformats.org/wordprocessingml/2006/main}val'] = cfg['sz']
                    
                    # Bold
                    if cfg.get('bold'):
                        b = rPr.find('w:b', ns_w)
                        if b is None:
                            b = ET.SubElement(rPr, '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}b')
                        bCs = rPr.find('w:bCs', ns_w)
                        if bCs is None:
                            bCs = ET.SubElement(rPr, '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}bCs')
                    
                    # Color (Strict Hex, NO themeColor)
                    if 'color' in cfg:
                        color = rPr.find('w:color', ns_w)
                        if color is None:
                            color = ET.SubElement(rPr, '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}color')
                        color.attrib['{http://schemas.openxmlformats.org/wordprocessingml/2006/main}val'] = cfg['color']
                        color.attrib.pop('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}themeColor', None)
                        color.attrib.pop('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}themeShade', None)
                        color.attrib.pop('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}themeTint', None)

                    # Italics: strip unless explicitly requested
                    if not cfg.get('italic'):
                        for tag in ['w:i', 'w:iCs']:
                            for el in rPr.findall(tag, ns_w):
                                rPr.remove(el)

                    # Paragraph properties
                    if s.attrib.get('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}type') == 'paragraph':
                        pPr = s.find('w:pPr', ns_w)
                        if pPr is None:
                            pPr = ET.SubElement(s, '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}pPr')
                        
                        # Purge unintended paragraph borders and explicitly set none
                        pBdr = pPr.find('w:pBdr', ns_w)
                        if pBdr is not None:
                            pPr.remove(pBdr)
                        # Explicitly enforce none border to override Word / Docs defaults
                        pBdr_el = ET.SubElement(pPr, '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}pBdr')
                        for border_name in ['top', 'left', 'bottom', 'right']:
                            b_el = ET.SubElement(pBdr_el, f'{{http://schemas.openxmlformats.org/wordprocessingml/2006/main}}{border_name}')
                            b_el.attrib['{http://schemas.openxmlformats.org/wordprocessingml/2006/main}val'] = 'none'
                            b_el.attrib['{http://schemas.openxmlformats.org/wordprocessingml/2006/main}sz'] = '0'
                            b_el.attrib['{http://schemas.openxmlformats.org/wordprocessingml/2006/main}space'] = '0'
                            b_el.attrib['{http://schemas.openxmlformats.org/wordprocessingml/2006/main}color'] = 'auto'

                        spacing = pPr.find('w:spacing', ns_w)
                        if spacing is None:
                            spacing = ET.SubElement(pPr, '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}spacing')
                        if 'before' in cfg:
                            spacing.attrib['{http://schemas.openxmlformats.org/wordprocessingml/2006/main}before'] = cfg['before']
                        if 'after' in cfg:
                            spacing.attrib['{http://schemas.openxmlformats.org/wordprocessingml/2006/main}after'] = cfg['after']
                        if 'line' in cfg:
                            spacing.attrib['{http://schemas.openxmlformats.org/wordprocessingml/2006/main}line'] = cfg['line']
                            spacing.attrib['{http://schemas.openxmlformats.org/wordprocessingml/2006/main}lineRule'] = 'auto'

            tree.write(styles_xml_path, xml_declaration=True, encoding='utf-8')

        with zipfile.ZipFile(output_path, 'w', zipfile.ZIP_DEFLATED) as zout:
            for root_dir, dirs, files in os.walk(temp_dir):
                for file in files:
                    full_path = os.path.join(root_dir, file)
                    rel_path = os.path.relpath(full_path, temp_dir)
                    zout.write(full_path, rel_path)

        print(f"Successfully generated pure-color OpenXML docx: {output_path}")
    finally:
        shutil.rmtree(temp_dir)

if __name__ == '__main__':
    repo_path = 'templates/docs/Judarn-Document-Template.docx'
    create_judarn_template(repo_path)
