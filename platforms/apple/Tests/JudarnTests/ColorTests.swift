import Testing
import SwiftUI
@testable import Judarn

@Suite("Judarn Colors")
@MainActor
struct ColorTests {
    /// sRGB bytes of a color in an appearance, rounded.
    private func bytes(_ color: Color, in mode: JudarnAppearanceMode) throws -> [Int] {
        let rgb = try #require(JudarnContrastVerifier.sRGBComponents(of: color, in: mode))
        return [rgb.red, rgb.green, rgb.blue].map { Int(($0 * 255.0).rounded()) }
    }

    private func expectBytes(_ actual: [Int], _ expected: [Int], _ name: String) {
        // The sRGB to Display P3 round trip may move a byte by one.
        for (a, e) in zip(actual, expected) {
            #expect(abs(a - e) <= 1, "\(name): \(actual) vs \(expected)")
        }
    }

    // Expected bytes come from an independent implementation of the same OKLCh to sRGB conversion with chroma bisection.
    @Test("Chromatic OKLCh conversions are pinned to sRGB bytes")
    func chromaticOklchConversionsArePinned() throws {
        expectBytes(try bytes(JudarnColors.ink60, in: .light), [0x6A, 0x69, 0x66], "ink60 light")
        expectBytes(try bytes(JudarnColors.ink60, in: .dark), [0xA6, 0xA4, 0xA1], "ink60 dark")
        expectBytes(try bytes(JudarnColors.signalError, in: .light), [0xCA, 0x02, 0x21], "signalError light")
        expectBytes(try bytes(JudarnColors.signalError, in: .dark), [0xFC, 0x58, 0x55], "signalError dark")
        expectBytes(try bytes(JudarnColors.signalError, in: .lightHighContrast), [0x92, 0x00, 0x14], "signalError light HC")
        expectBytes(try bytes(JudarnColors.signalError, in: .darkHighContrast), [0xFF, 0x8B, 0x84], "signalError dark HC")
    }

    @Test("Display P3 matrix rows sum to 1 so neutrals stay neutral")
    func displayP3MatrixRowsSumToOne() {
        for (index, row) in Color.oklabLmsToLinearDisplayP3.enumerated() {
            #expect(abs(row.reduce(0, +) - 1.0) < 1e-9, "row \(index) sums to \(row.reduce(0, +))")
        }
        let gray = Color(oklchL: 0.6, c: 0.0, h: 0.0)
        let rgb = JudarnContrastVerifier.sRGBComponents(of: gray, in: .light)
        #expect(rgb != nil)
        if let rgb {
            #expect(abs(rgb.red - rgb.green) < 1e-6 && abs(rgb.green - rgb.blue) < 1e-6)
        }
    }

    @Test("Every color token resolves to a luminance")
    func judarnColorTokens() {
        let tokens: [Color] = [
            Color.judarn.substrate,
            Color.judarn.surfaceElevated,
            Color.judarn.surfaceRecessed,
            Color.judarn.paper,
            Color.judarn.ink100,
            Color.judarn.ink60,
            Color.judarn.ink30,
            Color.judarn.signalError,
            Color.judarn.pureBlack,
            Color.judarn.pureWhite,
            Color.judarn.black,
            Color.judarn.white,
            Color.judarn.fg1,
            Color.judarn.fg2,
            Color.judarn.fg3,
            Color.judarn.bg1,
            Color.judarn.bg2,
            Color.judarn.accent,
            Color.judarn.accent2,
            JudarnColors.substrate,
            JudarnColors.surfaceElevated,
            JudarnColors.surfaceRecessed,
            JudarnColors.signalError,
            JudarnColors.paper,
            JudarnColors.pureBlack,
            JudarnColors.pureWhite,
            JudarnColors.black,
            JudarnColors.fg1,
            JudarnColors.fg2,
            JudarnColors.fg3,
            JudarnColors.bg1,
            JudarnColors.bg2
        ]
        #expect(tokens.allSatisfy { $0.relativeLuminance(in: .light) != nil })
        #expect(JudarnColors.substrate.relativeLuminance(in: .light) != nil)
        #expect(JudarnColors.surfaceElevated.relativeLuminance(in: .light) != nil)
        #expect(JudarnColors.surfaceRecessed.relativeLuminance(in: .light) != nil)
        #expect(JudarnColors.pureBlack.relativeLuminance(in: .light) != nil)
        #expect(JudarnColors.pureWhite.relativeLuminance(in: .light) != nil)

        // Accent environment modifier
        let accentView = Text("Accent")
            .judarnAccent(Color.red, secondaryAccent: Color.blue)
        #if os(macOS)
        let host = NSHostingView(rootView: accentView)
        host.layout()
        #expect(host.fittingSize.width > 0)
        #endif
    }

    @Test("High-contrast dynamic color tokens")
    func highContrastColorTokens() {
        // Fixed sRGB values: system colors such as Color.yellow are themselves dynamic.
        let lightValue = Color(red: 1, green: 1, blue: 1)
        let darkValue = Color(red: 0, green: 0, blue: 0)
        let lightHC = Color(red: 1, green: 1, blue: 0)
        let darkHC = Color(red: 1, green: 0.5, blue: 0)
        let dynamicColor = Color.dynamic(
            light: lightValue,
            dark: darkValue,
            lightHighContrast: lightHC,
            darkHighContrast: darkHC
        )
        func luminance(_ color: Color, _ mode: JudarnAppearanceMode) -> Double? {
            color.relativeLuminance(in: mode)
        }
        // Each appearance resolves its own variant: this fails if high contrast falls back to the standard value.
        #expect(luminance(dynamicColor, .light) == luminance(lightValue, .light))
        #expect(luminance(dynamicColor, .dark) == luminance(darkValue, .dark))
        #expect(luminance(dynamicColor, .lightHighContrast) == luminance(lightHC, .light))
        #expect(luminance(dynamicColor, .darkHighContrast) == luminance(darkHC, .dark))

        // High contrast promotes the greys to ink100 and gives signalError its own calibrated values.
        for mode in [JudarnAppearanceMode.lightHighContrast, .darkHighContrast] {
            #expect(luminance(JudarnColors.ink60, mode) == luminance(JudarnColors.ink100, mode))
            #expect(luminance(JudarnColors.ink30, mode) == luminance(JudarnColors.ink100, mode))
        }
        #expect(luminance(JudarnColors.signalError, .lightHighContrast) != luminance(JudarnColors.signalError, .light))
        #expect(luminance(JudarnColors.signalError, .darkHighContrast) != luminance(JudarnColors.signalError, .dark))
    }

    @Test("Out-of-gamut chroma is reduced into sRGB, not clipped")
    func outOfGamutChromaIsReduced() throws {
        let vivid = try bytes(Color(oklchL: 0.55, c: 0.40, h: 25.0), in: .light)
        let mapped = try bytes(Color(oklchL: 0.55, c: 0.60, h: 25.0), in: .light)
        #expect(vivid.allSatisfy { (0...255).contains($0) })
        // Both exceed the sRGB gamut at this lightness, so bisection lands them on the same boundary color.
        expectBytes(vivid, mapped, "gamut boundary")
    }

    @Test("Contrasting ink resolution")
    func contrastingInk() {
        let whiteInk = Color.black.contrastingInk
        #expect(whiteInk.relativeLuminance(in: .light) == 1.0)

        let blackInk = Color.white.contrastingInk
        #expect(blackInk.relativeLuminance(in: .light) == 0.0)

        // Perceptual Polarity Proofs:
        // Chromatic accents and mid-tones (Y <= 0.50) resolve to pureWhite (1.0)
        let redOrange = Color(red: 221.0 / 255.0, green: 64.0 / 255.0, blue: 39.0 / 255.0) // Wada Red Orange
        let cerulean = Color(red: 0.0, green: 147.0 / 255.0, blue: 165.0 / 255.0) // Wada Cerulean
        let steelBlue = Color(red: 70.0 / 255.0, green: 130.0 / 255.0, blue: 180.0 / 255.0)
        let midGray = Color(red: 128.0 / 255.0, green: 128.0 / 255.0, blue: 128.0 / 255.0)
        let mutedSage = Color(red: 132.0 / 255.0, green: 169.0 / 255.0, blue: 140.0 / 255.0)
        let coral = Color(red: 255.0 / 255.0, green: 127.0 / 255.0, blue: 80.0 / 255.0)
        let vividCyan = Color(red: 0.0, green: 188.0 / 255.0, blue: 212.0 / 255.0)
        let crossoverGrayBelow = Color(red: 186.0 / 255.0, green: 186.0 / 255.0, blue: 186.0 / 255.0)

        #expect(redOrange.contrastingInk.relativeLuminance(in: .light) == 1.0)
        #expect(cerulean.contrastingInk.relativeLuminance(in: .light) == 1.0)
        #expect(steelBlue.contrastingInk.relativeLuminance(in: .light) == 1.0)
        #expect(midGray.contrastingInk.relativeLuminance(in: .light) == 1.0)
        #expect(mutedSage.contrastingInk.relativeLuminance(in: .light) == 1.0)
        #expect(coral.contrastingInk.relativeLuminance(in: .light) == 1.0)
        #expect(vividCyan.contrastingInk.relativeLuminance(in: .light) == 1.0)
        #expect(crossoverGrayBelow.contrastingInk.relativeLuminance(in: .light) == 1.0)

        // High-lightness pastel washes (Y > 0.50) resolve to pureBlack (0.0)
        let crossoverGrayAbove = Color(red: 189.0 / 255.0, green: 189.0 / 255.0, blue: 189.0 / 255.0)
        let lemonYellow = Color(red: 255.0 / 255.0, green: 241.0 / 255.0, blue: 118.0 / 255.0)
        let wadaGold = Color(red: 251.0 / 255.0, green: 192.0 / 255.0, blue: 45.0 / 255.0)

        #expect(crossoverGrayAbove.contrastingInk.relativeLuminance(in: .light) == 0.0)
        #expect(lemonYellow.contrastingInk.relativeLuminance(in: .light) == 0.0)
        #expect(wadaGold.contrastingInk.relativeLuminance(in: .light) == 0.0)
    }

    // The middle gray levels span Y = 0.19 to 0.50, where the WCAG and perceptual crossovers disagree (ADR-0005).
    @Test(
        "Contrasting accent reaches AA on any surface",
        arguments: [0.05, 0.2, 0.475, 128.0 / 255.0, 0.584, 0.665, 0.735, 0.95],
        [(221.0, 64.0, 39.0), (0.0, 147.0, 165.0), (128.0, 128.0, 128.0)]
    )
    func contrastingAccentReachesAA(surfaceGray: Double, accent: (Double, Double, Double)) throws {
        let surface = Color(red: surfaceGray, green: surfaceGray, blue: surfaceGray)
        let foreground = Color(red: accent.0 / 255.0, green: accent.1 / 255.0, blue: accent.2 / 255.0)

        let clamped = foreground.contrastingAccent(against: surface)

        let ratio = try #require(clamped.contrastRatio(to: surface, in: .light))
        #expect(ratio >= 4.5)
    }

    @Test("Contrasting accent is unchanged when contrast already passes")
    func contrastingAccentPreservesPassingColors() {
        let cerulean = Color(red: 0.0, green: 147.0 / 255.0, blue: 165.0 / 255.0)
        let clamped = cerulean.contrastingAccent(against: JudarnColors.pureBlack)
        #expect(clamped.relativeLuminance(in: .light) == cerulean.relativeLuminance(in: .light))
    }

    @Test("Secondary accent has one default: the dynamic ink60")
    func secondaryAccentDefault() {
        #expect(JudarnAccent2Key.defaultValue == JudarnColors.ink60)
        #expect(Color.judarn.accent2 == JudarnColors.ink60)
        #expect(EnvironmentValues().judarnAccent2 == JudarnColors.ink60)
    }

    @Test("Mode-polar surface luminance ordering and sRGB hex calibration")
    func modePolarSurfaceLuminanceOrdering() throws {
        let subLight = try #require(JudarnColors.substrate.relativeLuminance(in: .light))
        let elvLight = try #require(JudarnColors.surfaceElevated.relativeLuminance(in: .light))
        let recLight = try #require(JudarnColors.surfaceRecessed.relativeLuminance(in: .light))
        #expect(recLight < elvLight && elvLight < subLight)
        #expect(abs(subLight - 1.0) < 0.001)

        let subDark = try #require(JudarnColors.substrate.relativeLuminance(in: .dark))
        let elvDark = try #require(JudarnColors.surfaceElevated.relativeLuminance(in: .dark))
        let recDark = try #require(JudarnColors.surfaceRecessed.relativeLuminance(in: .dark))
        #expect(recDark < subDark && subDark < elvDark)

        func hexBytes(_ color: Color, in mode: JudarnAppearanceMode) throws -> (Int, Int, Int) {
            let rgb = try #require(JudarnContrastVerifier.sRGBComponents(of: color, in: mode))
            return (Int((rgb.red * 255.0).rounded()), Int((rgb.green * 255.0).rounded()), Int((rgb.blue * 255.0).rounded()))
        }

        #expect(try hexBytes(JudarnColors.substrate, in: .light) == (0xFF, 0xFF, 0xFF))
        #expect(try hexBytes(JudarnColors.surfaceElevated, in: .light) == (0xF8, 0xF8, 0xF8))
        #expect(try hexBytes(JudarnColors.surfaceRecessed, in: .light) == (0xF1, 0xF1, 0xF1))
        #expect(try hexBytes(JudarnColors.substrate, in: .dark) == (0x17, 0x17, 0x17))
        #expect(try hexBytes(JudarnColors.surfaceElevated, in: .dark) == (0x22, 0x22, 0x22))
        #expect(try hexBytes(JudarnColors.surfaceRecessed, in: .dark) == (0x10, 0x10, 0x10))
    }
}
