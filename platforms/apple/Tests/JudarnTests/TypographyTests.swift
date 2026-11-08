import Testing
import SwiftUI
@testable import Judarn

@Suite("Judarn Typography")
@MainActor
struct TypographyTests {
    @Test("Font configuration slots and custom fallback")
    func fontConfig() {
        let defaultConfig = JudarnFontConfig.default
        #expect(defaultConfig.sans == nil)
        #expect(defaultConfig.display == nil)
        #expect(defaultConfig.data == nil)

        let customConfig = JudarnFontConfig(sans: "PublicSans", display: "Jost", data: "SFMono-Regular")
        #expect(customConfig.sans == "PublicSans")
        #expect(customConfig.display == "Jost")
        #expect(customConfig.data == "SFMono-Regular")
    }

    @Test("Typography styles and view modifier attachments")
    func typographyStyles() {
        let allStyles: [JudarnTypographyStyle] = [
            .display, .h1, .h2, .h3, .h4,
            .bodyLg, .body, .small, .label, .micro,
            .data, .mono
        ]

        for style in allStyles {
            _ = Text("Test").judarnTypography(style)
        }

        _ = Text("123.45").judarnData()
        _ = Text("0xDEADBEEF").judarnMono()
        _ = Text("STATUS").judarnLabel()
        _ = Text("LIVE").judarnMicro()

        // Test all convenience typography modifiers
        _ = Text("Display").judarnDisplay()
        _ = Text("H1").judarnH1()
        _ = Text("H2").judarnH2()
        _ = Text("H3").judarnH3()
        _ = Text("H4").judarnH4()
        _ = Text("BodyLg").judarnBodyLg()
        _ = Text("Body").judarnBody()
        _ = Text("Small").judarnSmall()

        // Test custom font configuration injection and resolution
        let customFontConfig = JudarnFontConfig(sans: "Helvetica", display: "Georgia", data: "Courier")
        let configuredView = Text("Custom Font")
            .judarnBody()
            .judarnData()
            .judarnFontConfig(customFontConfig)

        #if os(macOS)
        let host = NSHostingView(rootView: configuredView)
        host.layout()
        #expect(host.fittingSize.width > 0)
        #endif
    }

    @Test("Generated styles carry the token slot, digits, uppercase and case-sensitive forms")
    func generatedStyleMetrics() {
        let label = JudarnTypographyStyle.label.typographyModifier
        let micro = JudarnTypographyStyle.micro.typographyModifier
        let data = JudarnTypographyStyle.data.typographyModifier
        let mono = JudarnTypographyStyle.mono.typographyModifier
        #expect(label.isUppercase && micro.isUppercase)
        #expect(data.slot == .data && data.isMonospacedDigit)
        #expect(mono.slot == .mono)
        #expect(label.isMonospacedDigit == false)

        // Case-sensitive forms follow the caseFeature token: on for the caps styles only.
        for style in JudarnTypographyStyle.allCases {
            let expected = (style == .label || style == .micro)
            #expect(style.typographyModifier.usesCaseForms == expected, "\(style)")
        }

        #if os(macOS)
        #expect(label.size == 11.0)
        #expect(data.size == 12.0)
        #expect(JudarnTypographyStyle.h4.typographyModifier.size == 15.0)
        #endif
    }

    @Test("Editorial numerals ride the environment so they compose with any style")
    func editorialNumeralsEnvironment() {
        #expect(EnvironmentValues().judarnEditorialNumerals == false)
        var values = EnvironmentValues()
        values.judarnEditorialNumerals = true
        #expect(values.judarnEditorialNumerals)
        _ = Text("Chapter 1: 1984").judarnBody().judarnEditorialNumerals()
    }

    @Test("Label keeps its rank above micro on each Apple host")
    func labelPlatformMapping() {
        let label = JudarnTypographyStyle.label.typographyModifier
        let micro = JudarnTypographyStyle.micro.typographyModifier
        #if os(macOS)
        #expect(label.textStyle == .subheadline)
        #expect(label.size == 11.0)
        #else
        #expect(label.textStyle == .footnote)
        #expect(label.size == 13.0)
        #endif
        #expect(label.size > micro.size)
    }

    @Test("Large body renders above body and shares h4's size at a different weight")
    func bodyLgPlatformMapping() {
        let bodyLg = JudarnTypographyStyle.bodyLg.typographyModifier
        let body = JudarnTypographyStyle.body.typographyModifier
        let h4 = JudarnTypographyStyle.h4.typographyModifier
        #expect(bodyLg.textStyle == .title3)
        #expect(bodyLg.size > body.size)
        #expect(bodyLg.size == h4.size)
        #expect(bodyLg.weight != h4.weight)
        #if os(macOS)
        #expect(bodyLg.size == 15.0)
        #else
        #expect(bodyLg.size == 20.0)
        #endif
    }

    @Test("Token weights map to the matching Font.Weight, as in CSS")
    func weightMapping() {
        let expected: [(JudarnTypographyStyle, Font.Weight)] = [
            (.display, .black), (.h1, .heavy), (.h2, .heavy), (.h3, .heavy), (.h4, .heavy),
            (.bodyLg, .regular), (.body, .regular), (.label, .heavy), (.micro, .medium)
        ]
        for (style, weight) in expected {
            #expect(style.typographyModifier.weight == weight)
        }
        // display shares h1's text style, so weight is what separates them.
        let display = JudarnTypographyStyle.display.typographyModifier
        let h1 = JudarnTypographyStyle.h1.typographyModifier
        #expect(display.textStyle == h1.textStyle)
        #expect(display.weight != h1.weight)
    }

    @Test("Tracking follows the token em at the rendered size")
    func trackingScalesWithSize() {
        let expected: [(JudarnTypographyStyle, CGFloat)] = [
            (.display, -0.02), (.h1, -0.01), (.h2, -0.01), (.h3, -0.01), (.h4, -0.01),
            (.label, 0.06), (.micro, 0.08), (.body, 0)
        ]
        for (style, em) in expected {
            let m = style.typographyModifier
            #expect(m.trackingEm == em)
            #expect(m.tracking == em * m.size)
        }

        let label = JudarnTypographyStyle.label.typographyModifier
        #if os(macOS)
        #expect(label.resolvedTracking(at: .accessibility3) == label.tracking)
        #else
        #expect(label.resolvedTracking(at: .large) == 0.06 * 13)
        #expect(label.resolvedTracking(at: .accessibility3) > label.resolvedTracking(at: .large))
        #endif
    }

    @Test("Custom fonts take the default-size base so Dynamic Type scales them once")
    func customFontBaseSize() {
        let h1 = JudarnTypographyStyle.h1.typographyModifier
        #if canImport(UIKit) && !os(macOS)
        // The default .largeTitle size, independent of the device's current text size.
        #expect(h1.customFontBaseSize == 34.0)
        #else
        #expect(h1.customFontBaseSize == h1.size)
        #endif
    }

    @Test("As-written casing drops uppercase and label tracking but keeps size and weight")
    func asWrittenCasing() {
        for style in [JudarnTypographyStyle.label, .micro] {
            let uppercase = style.typographyModifier
            let asWritten = uppercase.casing(.asWritten)
            #expect(uppercase.isUppercase)
            #expect(uppercase.tracking > 0)
            #expect(uppercase.casing(.uppercase).tracking == uppercase.tracking)
            #expect(asWritten.isUppercase == false)
            #expect(uppercase.usesCaseForms)
            #expect(asWritten.usesCaseForms == false)
            #expect(asWritten.tracking == JudarnTypographyModifier.bodyTrackingEm * asWritten.size)
            #expect(asWritten.textStyle == uppercase.textStyle)
            #expect(asWritten.weight == uppercase.weight)
            #expect(asWritten.size == uppercase.size)
        }

        // Uppercase casing never forces caps onto a style that has none.
        let h4 = JudarnTypographyStyle.h4.typographyModifier
        #expect(h4.casing(.uppercase).isUppercase == false)

        _ = Text("e1RM").judarnMicro(casing: .asWritten)
        _ = Text("Sweet spot").judarnLabel(casing: .asWritten)
    }

    /// Rendered height of a wrapped two-line paragraph, in pixels at scale 1.
    private func renderedHeight(_ modifier: JudarnTypographyModifier) -> Int {
        let view = Text("Sync body weight from Apple Health and keep going")
            .modifier(modifier)
            .frame(width: 140, alignment: .leading)
            .fixedSize(horizontal: false, vertical: true)
        let renderer = ImageRenderer(content: view)
        renderer.scale = 1
        return renderer.cgImage?.height ?? 0
    }

    @Test("Tight leading shortens wrapped body text against standard leading (ADR-0012)")
    func tightLeadingIsShorterThanStandard() {
        let tight = JudarnTypographyStyle.body.typographyModifier
        #expect(tight.leading == .tight)
        let standard = JudarnTypographyModifier(
            textStyle: tight.textStyle, weight: tight.weight, trackingEm: tight.trackingEm,
            leading: .standard, isUppercase: tight.isUppercase, slot: tight.slot
        )
        let tightHeight = renderedHeight(tight)
        let standardHeight = renderedHeight(standard)
        #expect(tightHeight > 0)
        #expect(tightHeight < standardHeight)
    }

    @Test("Label, micro, data and mono keep standard leading; running-text roles are tight")
    func leadingFollowsTokens() {
        for style in [JudarnTypographyStyle.display, .h1, .h2, .h3, .h4, .bodyLg, .body, .small] {
            #expect(style.typographyModifier.leading == .tight)
        }
        for style in [JudarnTypographyStyle.label, .micro, .data, .mono] {
            #expect(style.typographyModifier.leading == .standard)
        }
    }
}
