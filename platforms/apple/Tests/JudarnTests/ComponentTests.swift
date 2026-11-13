import Testing
import SwiftUI
#if canImport(AppKit)
import AppKit
#endif
@testable import Judarn

@Suite("Judarn Components")
@MainActor
struct ComponentTests {
    private typealias Palette = (background: Color, foreground: Color)

    private func palette(
        _ variant: JudarnButtonVariant,
        accent: Color = .red,
        pressed: Bool = false,
        enabled: Bool = true,
        hovered: Bool = false,
        elevated: Bool = false
    ) -> Palette {
        JudarnButtonContent.resolveColors(variant: variant, accentColor: accent, isPressed: pressed, isEnabled: enabled, isHovered: hovered, isOnElevatedSurface: elevated)
    }

    private func expectPalette(_ actual: Palette, _ expected: Palette, _ name: String) {
        #expect(actual.background == expected.background, "\(name) background")
        #expect(actual.foreground == expected.foreground, "\(name) foreground")
    }

    @Test("Button colour matrix: variant, hover, press and disabled")
    func buttonColourMatrix() {
        typealias C = JudarnColors
        expectPalette(palette(.primary), (C.ink100, C.substrate), "primary")
        expectPalette(palette(.primary, hovered: true), (C.surfaceRecessed, C.ink100), "primary hover")
        expectPalette(palette(.secondary), (C.surfaceRecessed, C.ink100), "secondary")
        expectPalette(palette(.secondary, elevated: true), (C.substrate, C.ink100), "secondary on an elevated surface")
        expectPalette(palette(.secondary, hovered: true), (C.ink100, C.substrate), "secondary hover")
        expectPalette(palette(.ghost), (.clear, C.ink100), "ghost")
        expectPalette(palette(.ghost, hovered: true), (.clear, C.ink100), "ghost hover")

        // Pressed overrides every variant; disabled overrides pressed.
        for variant in [JudarnButtonVariant.primary, .secondary, .ghost, .accent] {
            expectPalette(palette(variant, pressed: true), (C.ink60, C.substrate), "\(variant) pressed")
            expectPalette(palette(variant, pressed: true, enabled: false), (C.surfaceRecessed, C.ink30), "\(variant) disabled")
        }
    }

    @Test("Buttons, badges and tags draw no stroke at rest and an ink100 outline in Increase Contrast")
    func controlsSetApartByFill() {
        for variant in [JudarnButtonVariant.primary, .secondary, .accent] {
            let rest = JudarnButtonContent.border(variant: variant, increasedContrast: false)
            #expect(rest.width == 0, "\(variant) draws no stroke at rest")
            let contrast = JudarnButtonContent.border(variant: variant, increasedContrast: true)
            #expect(contrast.color == JudarnColors.ink100 && contrast.width == JudarnSpacing.rule, "\(variant) outline in Increase Contrast")
        }
        #expect(JudarnButtonContent.border(variant: .ghost, increasedContrast: true).width == 0, "ghost stays text")
        #expect(judarnControlOutlineStyle(increasedContrast: false).width == 0)
        #expect(judarnControlOutlineStyle(increasedContrast: true).color == JudarnColors.ink100)
    }

    @Test("Badge fills: neutral well, solid ink, accent fill, accent tint in light mode only")
    func badgeColours() {
        typealias C = JudarnColors
        let accent = Color(red: 221.0 / 255.0, green: 64.0 / 255.0, blue: 39.0 / 255.0)
        let tinted = Color.green
        func colors(_ v: JudarnBadgeVariant, elevated: Bool = false, dark: Bool = false) -> (background: Color, foreground: Color) {
            JudarnBadge.colors(variant: v, accentColor: accent, isOnElevatedSurface: elevated, isDark: dark, tint: { _ in tinted })
        }
        #expect(colors(.neutral).background == C.surfaceRecessed)
        #expect(colors(.neutral, elevated: true).background == C.substrate)
        #expect(colors(.solid).background == C.ink100 && colors(.solid).foreground == C.substrate)
        #expect(colors(.accent).background == accent)
        #expect(colors(.accentTint).background == tinted && colors(.accentTint).foreground == C.ink100)
        #expect(colors(.accentTint, dark: true).background == C.surfaceRecessed, "tints belong to light mode")
    }

    @Test("The accent tint mixes 14% of the color with white in OKLab")
    func accentTintMix() {
        var light = EnvironmentValues()
        light.colorScheme = .light
        let black = JudarnBadge.tint(Color(.sRGBLinear, red: 0, green: 0, blue: 0), in: light).resolve(in: light)
        let lab = OKLab(linearRed: Double(black.linearRed), green: Double(black.linearGreen), blue: Double(black.linearBlue))
        #expect(abs(lab.l - 0.86) < 0.001)
        #expect(abs(lab.a) < 0.001 && abs(lab.b) < 0.001)

        let red = JudarnBadge.tint(Color(.sRGBLinear, red: 1, green: 0, blue: 0), in: light).resolve(in: light)
        let redLab = OKLab(linearRed: Double(red.linearRed), green: Double(red.linearGreen), blue: Double(red.linearBlue))
        #expect(redLab.l > 0.9 && redLab.a > 0, "a light tint keeps the hue")
    }

    @Test("Accent button fills with the accent and clamps its hover ink against the recessed fill")
    func accentButtonColours() {
        let accent = Color(red: 221.0 / 255.0, green: 64.0 / 255.0, blue: 39.0 / 255.0)
        let rest = palette(.accent, accent: accent)
        #expect(rest.background == accent)
        #expect(rest.foreground.relativeLuminance(in: .light) == accent.contrastingInk.relativeLuminance(in: .light))

        let hover = palette(.accent, accent: accent, hovered: true)
        #expect(hover.background == JudarnColors.surfaceRecessed)
        let ratio = hover.foreground.contrastRatio(to: JudarnColors.surfaceRecessed, in: .light)
        #expect((ratio ?? 0) >= 4.5)
    }

    @Test("Button style keeps an explicit hover override")
    func explicitHoverButton() {
        #expect(JudarnButtonStyle(variant: .primary).explicitHovered == nil)
        #expect(JudarnButtonStyle(variant: .primary, isHovered: true).explicitHovered == true)
        #expect(JudarnButtonStyle(variant: .accent, size: .lg).variant == .accent)

        // Invalid state is spoken with the value, not only the hint.
        #expect(JudarnTextField.accessibilityValue(text: "abc", isInvalid: false) == "abc")
        #expect(JudarnTextField.accessibilityValue(text: "abc", isInvalid: true) == "abc, invalid entry")
        #expect(JudarnTextField.accessibilityValue(text: "", isInvalid: true) == "Invalid entry")

        _ = JudarnButton(variant: .primary) {} content: {
            Text("Click")
        }
    }

    @Test("Badge presentation variants")
    func badges() {
        let variants: [JudarnBadgeVariant] = [.neutral, .solid, .accent, .accentTint]
        for variant in variants {
            let badge = JudarnBadge("Pro", variant: variant)
            #if os(macOS)
            let host = NSHostingView(rootView: badge)
            host.layout()
            #expect(host.fittingSize.width > 0)
            #expect(host.fittingSize.height > 0)
            #endif
        }

        let tag = JudarnTag("Swift")
        #if os(macOS)
        let tagHost = NSHostingView(rootView: tag)
        tagHost.layout()
        #expect(tagHost.fittingSize.width > 0)
        #expect(tagHost.fittingSize.height > 0)
        #endif
    }

    @Test("Button view rendering and variants")
    func buttonRendering() {
        let variants: [JudarnButtonVariant] = [.primary, .secondary, .ghost, .accent]
        let sizes: [JudarnButtonSize] = [.sm, .md, .lg]

        for variant in variants {
            for size in sizes {
                let button = JudarnButton(variant: variant, size: size) {} content: {
                    Text("Action")
                }
                #if os(macOS)
                let host = NSHostingView(rootView: button)
                host.layout()
                #expect(host.fittingSize.width > 0)
                #endif

                let hoveredButton = Button("Hovered") {}
                    .buttonStyle(JudarnButtonStyle(variant: variant, size: size, isHovered: true))
                #if os(macOS)
                let hoveredHost = NSHostingView(rootView: hoveredButton)
                hoveredHost.layout()
                #expect(hoveredHost.fittingSize.width > 0)
                #endif
            }
        }

        // Test static ButtonStyle convenience properties
        _ = Button("P") {}.buttonStyle(.judarnPrimary)
        _ = Button("S") {}.buttonStyle(.judarnSecondary)
        _ = Button("G") {}.buttonStyle(.judarnGhost)
        _ = Button("A") {}.buttonStyle(.judarnAccent)
    }

    @Test("Card layout and background variants")
    func cardRendering() {
        let defaultCard = JudarnCard(title: "Default") {
            Text("Content")
        }
        let flatCard = JudarnCard(title: "Flat Card", isFlat: true) {
            Text("Content")
        }
        let glassCard = JudarnCard(title: "Glass Card", isFlat: false, useGlassBackground: true) {
            Text("Content")
        }
        let fullCard = JudarnCard(
            eyebrow: "Eyebrow",
            title: "Full Card",
            isFlat: false,
            media: { Image(systemName: "circle") },
            actions: { Button("Action") {} },
            content: { Text("Content") }
        )

        #if os(macOS)
        for card in [AnyView(defaultCard), AnyView(flatCard), AnyView(glassCard), AnyView(fullCard)] {
            let host = NSHostingView(rootView: card)
            host.layout()
            #expect(host.fittingSize.width > 0)
            #expect(host.fittingSize.height > 0)
        }
        #endif
    }

    @Test("Compact, small-control and glass cards, button and text field lay out")
    func cardCompactAndGlassLayout() {
        let compactCard = JudarnCard(title: "Compact", isCompact: true) {
            Text("Content")
        }
        let smallControlCard = JudarnCard(title: "Small Control") {
            Text("Content")
        }
        .controlSize(.small)

        let glassCard = JudarnCard(title: "Glass", useGlassBackground: true) {
            Text("Content")
        }

        let button = JudarnButton(variant: .primary) {} content: {
            Text("Motion")
        }

        let field = JudarnTextField(text: .constant("Field"))

        #if os(macOS)
        for view in [AnyView(compactCard), AnyView(smallControlCard), AnyView(glassCard), AnyView(button), AnyView(field)] {
            let host = NSHostingView(rootView: view)
            host.layout()
            #expect(host.fittingSize.width > 0)
            #expect(host.fittingSize.height > 0)
        }
        #endif
    }

    @Test("Text field binding, multiline and validation layout")
    func textFieldRendering() {
        let text = Binding.constant("Test")
        let standardField = JudarnTextField(label: "Standard", placeholder: "Placeholder", text: text, hint: "Hint")
        let multilineField = JudarnTextField(label: "Multiline", placeholder: "Area", text: text, isMultiline: true)
        let invalidField = JudarnTextField(label: "Invalid", placeholder: "Err", text: text, hint: "Required field", isInvalid: true)

        #if os(macOS)
        for field in [AnyView(standardField), AnyView(multilineField), AnyView(invalidField)] {
            let host = NSHostingView(rootView: field)
            host.layout()
            #expect(host.fittingSize.width > 0)
            #expect(host.fittingSize.height > 0)
        }
        #endif
    }

    @Test("Text field fills with substrate inside an elevated surface and surfaceRecessed on the page")
    func textFieldFill() {
        #expect(JudarnTextField.fill(isOnElevatedSurface: true) == JudarnColors.substrate)
        #expect(JudarnTextField.fill(isOnElevatedSurface: false) == JudarnColors.surfaceRecessed)
        #expect(JudarnTextField.surroundingSurface(isOnElevatedSurface: true) == JudarnColors.surfaceElevated)
        #expect(JudarnTextField.surroundingSurface(isOnElevatedSurface: false) == JudarnColors.substrate)
        #expect(EnvironmentValues().judarnOnElevatedSurface == false)
    }

    @Test("Text field draws no outline at rest, an ink100 outline in Increase Contrast, and keeps focus and error rings")
    func textFieldBorder() {
        func border(focused: Bool = false, invalid: Bool = false, increased: Bool = false) -> (color: Color, width: CGFloat) {
            JudarnTextField.border(isFocused: focused, isInvalid: invalid, increasedContrast: increased, focusColor: .red)
        }
        let rest = border()
        #expect(rest.color == .clear)
        #expect(rest.width == 0)

        let increased = border(increased: true)
        #expect(increased.color == JudarnColors.ink100)
        #expect(increased.width == JudarnSpacing.ruleBold)

        let focused = border(focused: true, increased: true)
        #expect(focused.color == .red)
        #expect(focused.width == JudarnSpacing.ruleBold)

        let invalid = border(focused: true, invalid: true)
        #expect(invalid.color == JudarnColors.signalError)
        #expect(invalid.width == JudarnSpacing.ruleBold)
    }

    @Test("Text fields lay out inside standard, flat and glass cards")
    func textFieldInsideCards() {
        let field = JudarnTextField(label: "Name", text: .constant("Ada"))
        let cards = [
            AnyView(JudarnCard(title: "Standard") { field }),
            AnyView(JudarnCard(title: "Flat", isFlat: true) { field }),
            AnyView(JudarnCard(title: "Glass", useGlassBackground: true) { field }),
            AnyView(field.environment(\.judarnOnElevatedSurface, true)),
        ]
        #if os(macOS)
        for view in cards {
            let host = NSHostingView(rootView: view)
            host.layout()
            #expect(host.fittingSize.width > 0)
            #expect(host.fittingSize.height > 0)
        }
        #else
        #expect(cards.count == 4)
        #endif
    }

    @Test("Card container accessibility semantics")
    func cardAccessibilitySemantics() {
        #expect(JudarnCard<EmptyView, EmptyView, EmptyView>.accessibilityLabel(eyebrow: "INFRA", title: "Cluster") == "INFRA, Cluster")
        #expect(JudarnCard<EmptyView, EmptyView, EmptyView>.accessibilityLabel(eyebrow: nil, title: "Cluster") == "Cluster")
        #expect(JudarnCard<EmptyView, EmptyView, EmptyView>.accessibilityLabel(eyebrow: "INFRA", title: nil) == "INFRA")
        #expect(JudarnCard<EmptyView, EmptyView, EmptyView>.accessibilityLabel(eyebrow: nil, title: nil) == nil)

        let labeledCard = JudarnCard(eyebrow: "EYE", title: "TITLE") {
            Text("Body")
        }
        #if os(macOS)
        let host = NSHostingView(rootView: labeledCard)
        host.layout()
        #expect(host.fittingSize.width > 0)
        #expect(host.fittingSize.height > 0)
        #endif
    }

    @Test("Text field accessibility label and error hint semantics")
    func textFieldAccessibilitySemantics() {
        // Label mapping
        #expect(JudarnTextField.accessibilityLabel(label: "Host", placeholder: "example.com") == "Host")
        #expect(JudarnTextField.accessibilityLabel(label: nil, placeholder: "example.com") == "example.com")
        #expect(JudarnTextField.accessibilityLabel(label: "", placeholder: "example.com") == "example.com")
        #expect(JudarnTextField.accessibilityLabel(label: nil, placeholder: "") == "Text input")

        // Hint mapping
        #expect(JudarnTextField.accessibilityHint(hint: "Port 5432", isInvalid: false) == "Port 5432")
        #expect(JudarnTextField.accessibilityHint(hint: nil, isInvalid: false) == nil)
        #expect(JudarnTextField.accessibilityHint(hint: "Must be a valid URI", isInvalid: true) == "Invalid entry. Must be a valid URI")
        #expect(JudarnTextField.accessibilityHint(hint: nil, isInvalid: true) == "Invalid entry")
        #expect(JudarnTextField.accessibilityHint(hint: "", isInvalid: true) == "Invalid entry")

        let invalidField = JudarnTextField(label: "Field", placeholder: "Ph", text: .constant("Val"), hint: "Err", isInvalid: true)
        #if os(macOS)
        let host = NSHostingView(rootView: invalidField)
        host.layout()
        #expect(host.fittingSize.width > 0)
        #expect(host.fittingSize.height > 0)
        #endif
    }

    @Test("Data matrix lays out header, rule and rows")
    func dataMatrixLayout() {
        let cols = [
            JudarnMatrixColumn(id: "k", title: "Key"),
            JudarnMatrixColumn(id: "v", title: "Val", isNumeric: true)
        ]
        let one = [JudarnMatrixRow(id: "1", cells: ["k": "Metric", "v": "100"])]
        let two = one + [JudarnMatrixRow(id: "2", cells: ["k": "Other", "v": "7"])]
        #if os(macOS)
        func height(_ rows: [JudarnMatrixRow]) -> CGFloat {
            let host = NSHostingView(rootView: JudarnDataMatrix(columns: cols, rows: rows).frame(width: 300))
            host.layout()
            return host.fittingSize.height
        }
        #expect(height(one) > 0)
        #expect(height(two) > height(one))
        #endif
        #expect(one.count == 1 && two.count == 2)
    }

    @Test("Card keeps its eyebrow casing option")
    func cardEyebrowCasing() {
        let upper = JudarnCard(eyebrow: "New", title: "T") { Text("C") }
        let written = JudarnCard(eyebrow: "Body weight in kg", title: "T", eyebrowCasing: .asWritten) { Text("C") }
        #expect(upper.eyebrowCasing == .uppercase)
        #expect(written.eyebrowCasing == .asWritten)
    }

    @Test("Column headers and field labels default to uppercase and opt out for protected tokens")
    func labelCasingOptOut() {
        let set = JudarnMatrixColumn(id: "set", title: "Set")
        let weight = JudarnMatrixColumn(id: "kg", title: "kg", isNumeric: true, casing: .asWritten)
        #expect(set.casing == .uppercase)
        #expect(weight.casing == .asWritten)
        _ = JudarnDataMatrix(columns: [set, weight], rows: [JudarnMatrixRow(id: "1", cells: ["set": "1", "kg": "80"])])

        let short = JudarnTextField(label: "Email", text: .constant(""))
        let long = JudarnTextField(label: "Body weight in kg", text: .constant(""), labelCasing: .asWritten)
        #expect(short.labelCasing == .uppercase)
        #expect(long.labelCasing == .asWritten)
    }

    @Test("Data matrix fixed column constraints")
    func dataMatrixFixedColumnConstraints() {
        let cols = [
            JudarnMatrixColumn(id: "k", title: "Key", width: 120),
            JudarnMatrixColumn(id: "v", title: "Val", isNumeric: true, width: 80),
            JudarnMatrixColumn(id: "desc", title: "Description")
        ]
        let rows = [
            JudarnMatrixRow(id: "1", cells: ["k": "Metric", "v": "100", "desc": "Flexible description"])
        ]
        let matrix = JudarnDataMatrix(columns: cols, rows: rows)

        #if os(macOS)
        let host = NSHostingView(rootView: matrix)
        let fittingSize = host.fittingSize
        #expect(fittingSize.width >= 264)
        #endif
    }

    @Test("Data matrix empty cell baseline height preservation")
    func dataMatrixEmptyCellBaselineHeightPreservation() {
        let cols = [
            JudarnMatrixColumn(id: "k", title: "Key", width: 100),
            JudarnMatrixColumn(id: "v", title: "Val", isNumeric: true, width: 80)
        ]
        let populatedRow = [
            JudarnMatrixRow(id: "1", cells: ["k": "Metric", "v": "100"])
        ]
        let emptyRow = [
            JudarnMatrixRow(id: "1", cells: ["k": "", "v": ""])
        ]
        let missingKeysRow = [
            JudarnMatrixRow(id: "1", cells: [:])
        ]

        #if os(macOS)
        let populatedMatrix = JudarnDataMatrix(columns: cols, rows: populatedRow)
        let emptyMatrix = JudarnDataMatrix(columns: cols, rows: emptyRow)
        let missingKeysMatrix = JudarnDataMatrix(columns: cols, rows: missingKeysRow)

        let populatedHeight = NSHostingView(rootView: populatedMatrix).fittingSize.height
        let emptyHeight = NSHostingView(rootView: emptyMatrix).fittingSize.height
        let missingKeysHeight = NSHostingView(rootView: missingKeysMatrix).fittingSize.height

        #expect(populatedHeight == emptyHeight)
        #expect(populatedHeight == missingKeysHeight)
        #endif
    }

    @Test("Data matrix cell accessibility semantics")
    func dataMatrixCellAccessibilitySemantics() {
        let col = JudarnMatrixColumn(id: "metric", title: "Latency (ms)", isNumeric: true)

        #expect(JudarnDataMatrix.headerAccessibilityLabel(column: col) == "Latency (ms)")
        #expect(JudarnDataMatrix.headerAccessibilityHint(columnIndex: 1, totalColumns: 4) == "Column 2 of 4")
        #expect(JudarnDataMatrix.cellAccessibilityLabel(column: col) == "Latency (ms)")
        #expect(JudarnDataMatrix.cellAccessibilityValue("42") == "42")
        #expect(JudarnDataMatrix.cellAccessibilityValue("") == "Empty")
        #expect(JudarnDataMatrix.cellAccessibilityValue(nil) == "Empty")
        #expect(
            JudarnDataMatrix.cellAccessibilityHint(rowIndex: 0, totalRows: 5, columnIndex: 2, totalColumns: 3)
            == "Row 1 of 5, Column 3 of 3"
        )
    }

    @Test("Data matrix container and row accessibility semantics")
    func dataMatrixContainerAndRowAccessibilitySemantics() {
        #expect(JudarnDataMatrix.tableAccessibilityLabel(columnsCount: 0, rowsCount: 0) == "Data Matrix, 0 columns, 0 rows")
        #expect(JudarnDataMatrix.tableAccessibilityLabel(columnsCount: 3, rowsCount: 12) == "Data Matrix, 3 columns, 12 rows")
        #expect(JudarnDataMatrix.rowAccessibilityLabel(rowIndex: 0, totalRows: 10) == "Row 1 of 10")
        #expect(JudarnDataMatrix.rowAccessibilityLabel(rowIndex: 9, totalRows: 10) == "Row 10 of 10")
    }

    @Test("Data matrix with an empty cell lays out")
    func dataMatrixWithEmptyCellLaysOut() {
        let cols = [
            JudarnMatrixColumn(id: "k", title: "Key"),
            JudarnMatrixColumn(id: "v", title: "Val", isNumeric: true)
        ]
        let rows = [
            JudarnMatrixRow(id: "r1", cells: ["k": "Alpha", "v": "100"]),
            JudarnMatrixRow(id: "r2", cells: ["k": "Beta", "v": ""])
        ]
        let matrix = JudarnDataMatrix(columns: cols, rows: rows)

        #if os(macOS)
        let host = NSHostingView(rootView: matrix)
        host.layout()
        #expect(host.fittingSize.width > 0)
        #expect(host.fittingSize.height > 0)
        #endif
    }

    @Test("Desktop button heights stay compact")
    func desktopComponentDensity() {
        #if os(macOS)
        let smButton = JudarnButton(variant: .primary, size: .sm) {} content: { Text("Small") }
        let mdButton = JudarnButton(variant: .primary, size: .md) {} content: { Text("Medium") }
        let lgButton = JudarnButton(variant: .primary, size: .lg) {} content: { Text("Large") }

        let smHeight = NSHostingView(rootView: smButton).fittingSize.height
        let mdHeight = NSHostingView(rootView: mdButton).fittingSize.height
        let lgHeight = NSHostingView(rootView: lgButton).fittingSize.height

        #expect(smHeight <= 26)
        #expect(mdHeight <= 34)
        #expect(lgHeight <= 52)

        let text = Binding.constant("Input")
        let field = JudarnTextField(placeholder: "Search", text: text)
        let fieldHeight = NSHostingView(rootView: field).fittingSize.height
        #expect(fieldHeight <= 26)

        let badge = JudarnBadge("PRO")
        let tag = JudarnTag("Tag")
        let badgeHeight = NSHostingView(rootView: badge).fittingSize.height
        let tagHeight = NSHostingView(rootView: tag).fittingSize.height
        #expect(tagHeight <= badgeHeight)
        #endif
    }
}
