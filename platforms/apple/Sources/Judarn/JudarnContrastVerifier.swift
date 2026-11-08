import SwiftUI
#if canImport(UIKit)
import UIKit
#elseif canImport(AppKit)
import AppKit
#endif

/// WCAG 2.1 / 2.2 contrast compliance tier.
public enum JudarnWCAGLevel: Sendable {
    case aa
    case aaa
}

/// Typographic and UI element context for WCAG contrast evaluation.
public enum JudarnContrastContext: Sendable {
    /// Standard body and data text (<18pt regular, <14pt bold). AA requires 4.5:1, AAA requires 7.0:1.
    case normalText
    /// Large titles and headings (>=18pt regular, >=14pt bold). AA requires 3.0:1, AAA requires 4.5:1.
    case largeText
    /// Graphical elements, interactive boundaries, and hairline controls. AA requires 3.0:1.
    case graphicalComponent
    
    /// Minimum contrast ratio required for the given WCAG compliance level.
    public func minimumRatio(level: JudarnWCAGLevel) -> Double {
        switch (self, level) {
        case (.normalText, .aaa): return 7.0
        case (.normalText, .aa): return 4.5
        case (.largeText, .aaa): return 4.5
        case (.largeText, .aa): return 3.0
        case (.graphicalComponent, _): return 3.0
        }
    }
}

/// Appearance mode context for resolving dynamic trait-bridged colors.
public enum JudarnAppearanceMode: String, Sendable, CaseIterable {
    case light
    case dark
    case lightHighContrast
    case darkHighContrast
}

/// Verification report for a foreground and background color pairing.
public struct JudarnContrastAuditResult: Sendable {
    public let foregroundName: String
    public let backgroundName: String
    public let appearance: JudarnAppearanceMode
    public let contrastRatio: Double
    public let normalTextAAA: Bool
    public let normalTextAA: Bool
    public let largeTextAAA: Bool
    public let largeTextAA: Bool
    public let graphicalAA: Bool
    
    public init(
        foregroundName: String,
        backgroundName: String,
        appearance: JudarnAppearanceMode,
        contrastRatio: Double
    ) {
        self.foregroundName = foregroundName
        self.backgroundName = backgroundName
        self.appearance = appearance
        self.contrastRatio = contrastRatio
        self.normalTextAAA = contrastRatio >= JudarnContrastContext.normalText.minimumRatio(level: .aaa)
        self.normalTextAA = contrastRatio >= JudarnContrastContext.normalText.minimumRatio(level: .aa)
        self.largeTextAAA = contrastRatio >= JudarnContrastContext.largeText.minimumRatio(level: .aaa)
        self.largeTextAA = contrastRatio >= JudarnContrastContext.largeText.minimumRatio(level: .aa)
        self.graphicalAA = contrastRatio >= JudarnContrastContext.graphicalComponent.minimumRatio(level: .aa)
    }
}

/// Mathematical and trait-aware WCAG AAA/AA contrast verifier for Judarn color tokens and surface pairings.
public enum JudarnContrastVerifier {
    /// Linearizes an sRGB component in the range [0.0, 1.0] according to W3C WCAG 2.1 specs.
    public static func linearize(sRGBComponent c: Double) -> Double {
        let clamped = max(0.0, min(1.0, c))
        if clamped <= 0.04045 {
            return clamped / 12.92
        } else {
            return pow((clamped + 0.055) / 1.055, 2.4)
        }
    }
    
    /// Computes relative luminance (Y) from sRGB red, green, and blue components in [0.0, 1.0].
    public static func relativeLuminance(red: Double, green: Double, blue: Double) -> Double {
        let rLin = linearize(sRGBComponent: red)
        let gLin = linearize(sRGBComponent: green)
        let bLin = linearize(sRGBComponent: blue)
        return 0.2126 * rLin + 0.7152 * gLin + 0.0722 * bLin
    }
    
#if canImport(AppKit)
    /// Appearance that reports a real AppKit high-contrast name to the dynamic color provider.
    /// \`NSAppearance(named: .accessibilityHighContrast*)\` cannot stand in: it is a composite that follows the system's
    /// Increase Contrast setting and reports plain Aqua or DarkAqua, so the high-contrast branch would never run in a test.
    /// The base appearance keeps the instance valid, and \`name\` and \`bestMatch(from:)\` both report the simulated name.
    private final class SimulatedHighContrastAppearance: NSAppearance, @unchecked Sendable {
        private var simulatedName: NSAppearance.Name = .aqua

        convenience init?(appearanceNamed base: NSAppearance.Name, bundle: Bundle?, simulating name: NSAppearance.Name) {
            self.init(appearanceNamed: base, bundle: bundle)
            simulatedName = name
        }

        override var name: NSAppearance.Name { simulatedName }

        override func bestMatch(from appearances: [NSAppearance.Name]) -> NSAppearance.Name? {
            appearances.contains(simulatedName) ? simulatedName : super.bestMatch(from: appearances)
        }
    }
#endif

#if canImport(UIKit)
    /// UIMutableTraits is main-actor isolated, so the mutation runs on the main thread; resolving the color afterwards is thread-safe.
    private static func traitCollection(style: UIUserInterfaceStyle, contrast: UIAccessibilityContrast) -> UITraitCollection {
        func make() -> UITraitCollection {
            MainActor.assumeIsolated {
                UITraitCollection { traits in
                    traits.userInterfaceStyle = style
                    traits.accessibilityContrast = contrast
                }
            }
        }
        return Thread.isMainThread ? make() : DispatchQueue.main.sync(execute: make)
    }
#endif

    /// Resolves the sRGB components of a SwiftUI Color in the given appearance mode.
    public static func sRGBComponents(of color: Color, in appearance: JudarnAppearanceMode) -> (red: Double, green: Double, blue: Double)? {
        #if canImport(AppKit)
        let app: NSAppearance?
        switch appearance {
        case .light:
            app = NSAppearance(named: .aqua)
        case .dark:
            app = NSAppearance(named: .darkAqua)
        case .lightHighContrast:
            app = SimulatedHighContrastAppearance(appearanceNamed: .aqua, bundle: nil, simulating: .accessibilityHighContrastAqua)
        case .darkHighContrast:
            app = SimulatedHighContrastAppearance(appearanceNamed: .darkAqua, bundle: nil, simulating: .accessibilityHighContrastDarkAqua)
        }
        guard let app else { return nil }
        
        var resolved: (red: Double, green: Double, blue: Double)?
        app.performAsCurrentDrawingAppearance {
            let nsColor = NSColor(color)
            guard let srgb = nsColor.usingColorSpace(.sRGB) ?? nsColor.usingColorSpace(.extendedSRGB) else { return }
            var r: CGFloat = 0, g: CGFloat = 0, b: CGFloat = 0, a: CGFloat = 0
            srgb.getRed(&r, green: &g, blue: &b, alpha: &a)
            resolved = (Double(r), Double(g), Double(b))
        }
        return resolved
        #elseif canImport(UIKit)
        let uiColor = UIColor(color)
        let style: UIUserInterfaceStyle = (appearance == .dark || appearance == .darkHighContrast) ? .dark : .light
        let contrast: UIAccessibilityContrast = (appearance == .lightHighContrast || appearance == .darkHighContrast) ? .high : .normal
        let traits = traitCollection(style: style, contrast: contrast)
        let resolvedColor = uiColor.resolvedColor(with: traits)
        var r: CGFloat = 0, g: CGFloat = 0, b: CGFloat = 0, a: CGFloat = 0
        guard resolvedColor.getRed(&r, green: &g, blue: &b, alpha: &a) else { return nil }
        return (Double(r), Double(g), Double(b))
        #else
        return nil
        #endif
    }
    
    /// Calculates relative luminance for a SwiftUI Color in the specified appearance mode.
    public static func relativeLuminance(of color: Color, in appearance: JudarnAppearanceMode) -> Double? {
        guard let rgb = sRGBComponents(of: color, in: appearance) else { return nil }
        return relativeLuminance(red: rgb.red, green: rgb.green, blue: rgb.blue)
    }
    
    /// Calculates the WCAG contrast ratio between two relative luminance values.
    /// Returns a value between 1.0 (no contrast) and 21.0 (maximum contrast).
    public static func contrastRatio(luminance1: Double, luminance2: Double) -> Double {
        let lighter = max(luminance1, luminance2)
        let darker = min(luminance1, luminance2)
        return (lighter + 0.05) / (darker + 0.05)
    }
    
    /// Calculates the WCAG contrast ratio between two SwiftUI colors in a given appearance mode.
    public static func contrastRatio(foreground: Color, background: Color, in appearance: JudarnAppearanceMode) -> Double? {
        guard let l1 = relativeLuminance(of: foreground, in: appearance),
              let l2 = relativeLuminance(of: background, in: appearance) else {
            return nil
        }
        return contrastRatio(luminance1: l1, luminance2: l2)
    }
    
    /// Audits a specific foreground/background pair in a given appearance mode.
    public static func auditPair(
        foreground: Color,
        foregroundName: String,
        background: Color,
        backgroundName: String,
        in appearance: JudarnAppearanceMode
    ) -> JudarnContrastAuditResult? {
        guard let ratio = contrastRatio(foreground: foreground, background: background, in: appearance) else {
            return nil
        }
        return JudarnContrastAuditResult(
            foregroundName: foregroundName,
            backgroundName: backgroundName,
            appearance: appearance,
            contrastRatio: ratio
        )
    }
    
    /// Audits the entire core token matrix across all surfaces and appearances.
    public static func auditCoreMatrix() -> [JudarnContrastAuditResult] {
        let foregrounds: [(String, Color)] = [
            ("ink100", JudarnColors.ink100),
            ("ink60", JudarnColors.ink60),
            ("ink30", JudarnColors.ink30),
            ("signalError", JudarnColors.signalError)
        ]
        
        let surfaces: [(String, Color)] = [
            ("substrate", JudarnColors.substrate),
            ("surfaceElevated", JudarnColors.surfaceElevated),
            ("surfaceRecessed", JudarnColors.surfaceRecessed)
        ]
        
        var results: [JudarnContrastAuditResult] = []
        for appearance in JudarnAppearanceMode.allCases {
            for (bgName, bg) in surfaces {
                for (fgName, fg) in foregrounds {
                    if let result = auditPair(
                        foreground: fg,
                        foregroundName: fgName,
                        background: bg,
                        backgroundName: bgName,
                        in: appearance
                    ) {
                        results.append(result)
                    }
                }
            }
        }
        return results
    }
}

public extension Color {
    /// Computes the WCAG contrast ratio between this color and another background color in a given appearance.
    func contrastRatio(to background: Color, in appearance: JudarnAppearanceMode = .light) -> Double? {
        JudarnContrastVerifier.contrastRatio(foreground: self, background: background, in: appearance)
    }
    
    /// Computes the relative luminance of this color in a given appearance.
    func relativeLuminance(in appearance: JudarnAppearanceMode = .light) -> Double? {
        JudarnContrastVerifier.relativeLuminance(of: self, in: appearance)
    }
    
    /// Asserts whether this color complies with WCAG standards against a given background.
    func isWCAGCompliant(
        against background: Color,
        context: JudarnContrastContext = .normalText,
        level: JudarnWCAGLevel = .aaa,
        in appearance: JudarnAppearanceMode = .light
    ) -> Bool {
        guard let ratio = contrastRatio(to: background, in: appearance) else { return false }
        return ratio >= context.minimumRatio(level: level)
    }
}
