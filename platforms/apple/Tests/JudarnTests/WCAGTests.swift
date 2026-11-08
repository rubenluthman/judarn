import Testing
import SwiftUI
@testable import Judarn

@Suite("Judarn WCAG Compliance")
struct WCAGTests {
    @Test("sRGB component linearization and relative luminance formulas")
    func wcagLinearizationAndLuminanceFormulas() {
        // Pure black and pure white
        #expect(abs(JudarnContrastVerifier.linearize(sRGBComponent: 0.0) - 0.0) < 0.0001)
        #expect(abs(JudarnContrastVerifier.linearize(sRGBComponent: 1.0) - 1.0) < 0.0001)

        // Threshold boundary (c <= 0.04045)
        let linearThreshold = JudarnContrastVerifier.linearize(sRGBComponent: 0.04045)
        #expect(abs(linearThreshold - (0.04045 / 12.92)) < 0.0001)

        // Primary channels relative luminance
        let blackL = JudarnContrastVerifier.relativeLuminance(red: 0, green: 0, blue: 0)
        let whiteL = JudarnContrastVerifier.relativeLuminance(red: 1, green: 1, blue: 1)
        let redL = JudarnContrastVerifier.relativeLuminance(red: 1, green: 0, blue: 0)
        let greenL = JudarnContrastVerifier.relativeLuminance(red: 0, green: 1, blue: 0)
        let blueL = JudarnContrastVerifier.relativeLuminance(red: 0, green: 0, blue: 1)

        #expect(abs(blackL - 0.0) < 0.0001)
        #expect(abs(whiteL - 1.0) < 0.0001)
        #expect(abs(redL - 0.2126) < 0.0001)
        #expect(abs(greenL - 0.7152) < 0.0001)
        #expect(abs(blueL - 0.0722) < 0.0001)
    }

    @Test("Contrast ratio calculation and symmetry")
    func wcagContrastRatioCalculation() {
        // Black vs White = 21.0
        let maxRatio = JudarnContrastVerifier.contrastRatio(luminance1: 1.0, luminance2: 0.0)
        #expect(abs(maxRatio - 21.0) < 0.01)

        // Symmetry
        let symmetricRatio = JudarnContrastVerifier.contrastRatio(luminance1: 0.0, luminance2: 1.0)
        #expect(abs(symmetricRatio - 21.0) < 0.01)

        // Identical colors = 1.0
        let minRatio = JudarnContrastVerifier.contrastRatio(luminance1: 0.5, luminance2: 0.5)
        #expect(abs(minRatio - 1.0) < 0.0001)
    }

    @Test("Core tokens WCAG compliance across appearances", arguments: JudarnAppearanceMode.allCases)
    func coreTokensWCAGCompliance(appearance: JudarnAppearanceMode) throws {
        // ink100 on substrate must achieve >= 7.0:1 (AAA) across all appearances
        let ink100Substrate = try #require(
            JudarnContrastVerifier.contrastRatio(
                foreground: JudarnColors.ink100,
                background: JudarnColors.substrate,
                in: appearance
            )
        )
        #expect(
            ink100Substrate >= JudarnContrastContext.normalText.minimumRatio(level: .aaa),
            "ink100 on substrate failed AAA in \(appearance)"
        )

        // ink100 on surfaces must achieve AAA in standard modes
        if appearance == .light || appearance == .dark {
            let elevatedRatio = try #require(
                JudarnContrastVerifier.contrastRatio(
                    foreground: JudarnColors.ink100,
                    background: JudarnColors.surfaceElevated,
                    in: appearance
                )
            )
            let recessedRatio = try #require(
                JudarnContrastVerifier.contrastRatio(
                    foreground: JudarnColors.ink100,
                    background: JudarnColors.surfaceRecessed,
                    in: appearance
                )
            )
            #expect(elevatedRatio >= 7.0)
            #expect(recessedRatio >= 7.0)
        }

        // ink60 on substrate: AA (>=4.5:1) in standard, promotes to AAA (>=7.0:1) in high contrast
        let ink60Ratio = try #require(
            JudarnContrastVerifier.contrastRatio(
                foreground: JudarnColors.ink60,
                background: JudarnColors.substrate,
                in: appearance
            )
        )
        if appearance == .light || appearance == .dark {
            #expect(ink60Ratio >= 4.5, "ink60 failed AA in \(appearance)")
        } else {
            #expect(ink60Ratio >= 7.0, "ink60 failed AAA high-contrast in \(appearance)")
        }

        // signalError on substrate: AA (>=4.5:1) in standard, AAA (>=7.0:1) in high contrast
        let signalRatio = try #require(
            JudarnContrastVerifier.contrastRatio(
                foreground: JudarnColors.signalError,
                background: JudarnColors.substrate,
                in: appearance
            )
        )
        if appearance == .light || appearance == .dark {
            #expect(signalRatio >= 4.5, "signalError failed AA in \(appearance)")
        } else {
            #expect(signalRatio >= 7.0, "signalError failed AAA high-contrast in \(appearance)")
        }
    }

    @Test("Core token 48-pairing audit matrix")
    func auditCoreMatrix() {
        let results = JudarnContrastVerifier.auditCoreMatrix()
        // 4 appearances * 3 surfaces * 4 foregrounds = 48 audits
        #expect(results.count == 48)

        // Verify all ink100 pairings pass AAA normal text
        let ink100Results = results.filter { $0.foregroundName == "ink100" }
        #expect(ink100Results.count == 12)
        for res in ink100Results {
            #expect(res.normalTextAAA, "ink100 on \(res.backgroundName) in \(res.appearance) failed AAA: \(res.contrastRatio):1")
        }
    }

    @Test("Color extension convenience API")
    func colorExtensionConvenience() throws {
        let ratio = try #require(Color.judarn.ink100.contrastRatio(to: Color.judarn.substrate, in: .light))
        #expect(ratio >= 7.0)

        let passesAAA = Color.judarn.ink100.isWCAGCompliant(
            against: Color.judarn.substrate,
            context: .normalText,
            level: .aaa,
            in: .light
        )
        #expect(passesAAA)

        let luminance = try #require(Color.judarn.pureWhite.relativeLuminance(in: .light))
        #expect(abs(luminance - 1.0) < 0.01)
    }
}
