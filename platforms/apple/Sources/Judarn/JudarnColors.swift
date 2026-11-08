import SwiftUI
#if canImport(UIKit)
import UIKit
#elseif canImport(AppKit)
import AppKit
#endif

/// Color definitions and token scope for the Judarn design system.
/// Generated from tokens/judarn-tokens.json with OKLCh conversion (sRGB-gamut chroma, Display P3 container).
public enum JudarnColors {
    // Absolute Static Neutrals (never invert)
    public static let pureBlack = Color(red: 0.0, green: 0.0, blue: 0.0)
    public static let pureWhite = Color(red: 1.0, green: 1.0, blue: 1.0)
    
    // Dynamic Semantic Neutrals (automatically adapt to light/dark color scheme)
    
    /// Base canvas substrate (Light: Pure White #FFFFFF, Dark: Deep Carbon #171717)
    public static let substrate = Color.dynamic(
        light: Color(oklchL: 1.000, c: 0.000, h: 0.0),
        dark: Color(oklchL: 0.205, c: 0.000, h: 0.0)
    )
    
    /// Tier 1 Elevated surface: Cards, sheets, popovers (Light: Crisp Neutral #F8F8F8, Dark: #222222)
    public static let surfaceElevated = Color.dynamic(
        light: Color(oklchL: 0.980, c: 0.000, h: 0.0),
        dark: Color(oklchL: 0.252, c: 0.000, h: 0.0)
    )
    
    /// Tier 2 Recessed surface: Input wells, sunken canvas, matrix hovers (Light: #F1F1F1, Dark: #101010)
    public static let surfaceRecessed = Color.dynamic(
        light: Color(oklchL: 0.958, c: 0.000, h: 0.0),
        dark: Color(oklchL: 0.173, c: 0.000, h: 0.0)
    )
    
    /// Primary high-contrast ink (Light: Optical Black #020202, Dark: Optical White #F8F8F8, >=15.0:1 AAA)
    public static let ink100 = Color.dynamic(
        light: Color(oklchL: 0.080, c: 0.000, h: 0.0),
        dark: Color(oklchL: 0.980, c: 0.000, h: 0.0)
    )
    
    /// Backward-compatible alias for primary ink (dynamically inverting)
    public static var black: Color { ink100 }
    
    /// Reverse-contrast surface (Light: Surface Elevated #F8F8F8, Dark: Surface Elevated #222222)
    public static let white = surfaceElevated
    
    /// Primary canvas substrate (Light: Pure White #FFFFFF, Dark: Deep Carbon #171717)
    public static let paper = substrate
    
    /// Secondary ink / flat grey (Light: #6A6966, Dark: #A6A4A1, guaranteed >=4.8:1 AA contrast; promotes to AAA under high contrast)
    public static let ink60 = Color.dynamic(
        light: Color(oklchL: 0.520, c: 0.005, h: 92.0),
        dark: Color(oklchL: 0.720, c: 0.005, h: 92.0),
        lightHighContrast: ink100,
        darkHighContrast: ink100
    )
    
    /// Hairline / disabled grey (Light: #B8B7B4, Dark: #3B3A38; elevates to high contrast for accessible boundaries)
    public static let ink30 = Color.dynamic(
        light: Color(oklchL: 0.780, c: 0.005, h: 92.0),
        dark: Color(oklchL: 0.350, c: 0.004, h: 92.0),
        lightHighContrast: ink100,
        darkHighContrast: ink100
    )
    
    /// Accessible functional signal red for errors and validation (Light: #CA0221, Dark: #FC5855, >=5.0:1 AA; calibrated AAA under high contrast)
    public static let signalError = Color.dynamic(
        light: Color(oklchL: 0.530, c: 0.214, h: 25.0),
        dark: Color(oklchL: 0.680, c: 0.200, h: 25.0),
        lightHighContrast: Color(oklchL: 0.415, c: 0.168, h: 25.0),
        darkHighContrast: Color(oklchL: 0.762, c: 0.141, h: 25.0)
    )
    
    // Semantic Colors (Default context)
    public static var fg1: Color { ink100 }
    public static var fg2: Color { ink60 }
    public static var fg3: Color { ink30 }
    
    // Default backgrounds (4-tier taxonomy)
    public static var bg1: Color { substrate }
    public static var bg2: Color { surfaceElevated }
}

public extension Color {
    /// Create a dynamic SwiftUI Color that adapts automatically between light and dark mode,
    /// with optional high-contrast overrides for accessibility.
    static func dynamic(
        light: Color,
        dark: Color,
        lightHighContrast: Color? = nil,
        darkHighContrast: Color? = nil
    ) -> Color {
        #if canImport(UIKit)
        return Color(UIColor { trait in
            let isDark = trait.userInterfaceStyle == .dark
            let isHighContrast = trait.accessibilityContrast == .high
            if isHighContrast {
                if isDark, let darkHighContrast { return UIColor(darkHighContrast) }
                if !isDark, let lightHighContrast { return UIColor(lightHighContrast) }
            }
            return isDark ? UIColor(dark) : UIColor(light)
        })
        #elseif canImport(AppKit)
        return Color(NSColor(name: nil) { appearance in
            // Only AppKit's own appearance names exist. A made-up name never matches a real appearance.
            let match = appearance.bestMatch(from: [
                .accessibilityHighContrastDarkAqua,
                .accessibilityHighContrastAqua,
                .darkAqua,
                .aqua
            ])
            switch match {
            case .accessibilityHighContrastDarkAqua:
                return NSColor(darkHighContrast ?? dark)
            case .accessibilityHighContrastAqua:
                return NSColor(lightHighContrast ?? light)
            case .darkAqua:
                return NSColor(dark)
            default:
                return NSColor(light)
            }
        })
        #else
        return light
        #endif
    }

    /// Perceptual relative luminance crossover Y* = 0.50 (ADR-0006).
    /// Surfaces at or below it receive pureWhite, a deliberate preference over WCAG ratios: lighter surfaces receive pureBlack.
    private static let perceptualLuminanceCrossover: Double = 0.50

    /// WCAG luminance crossover Y* = sqrt(1.05 * 0.05) - 0.05, where black and white reach equal ratios (ADR-0005).
    /// Non-Negotiable Invariant: `contrastingAccent` clamps by this crossover, never the perceptual one.
    /// Only the direction with the higher reachable ratio can meet `minRatio` on mid-tone surfaces.
    private static let wcagLuminanceCrossover: Double = 0.17912878474779204

    private static func linearizeSrgbChannel(_ c: Double) -> Double {
        let clamped = max(0.0, min(1.0, c))
        return clamped <= 0.04045 ? (clamped / 12.92) : pow((clamped + 0.055) / 1.055, 2.4)
    }

    private static func srgbRelativeLuminance(r: Double, g: Double, b: Double) -> Double {
        0.2126 * linearizeSrgbChannel(r) + 0.7152 * linearizeSrgbChannel(g) + 0.0722 * linearizeSrgbChannel(b)
    }

    /// Resolves the foreground ink (pureBlack or pureWhite) for a filled surface from its linearized relative luminance and the perceptual crossover (ADR-0006).
    var contrastingInk: Color {
        #if canImport(UIKit)
        return Color(UIColor { trait in
            let uiColor = UIColor(self).resolvedColor(with: trait)
            var r: CGFloat = 0, g: CGFloat = 0, b: CGFloat = 0, a: CGFloat = 0
            guard uiColor.getRed(&r, green: &g, blue: &b, alpha: &a) else {
                return UIColor(JudarnColors.pureWhite)
            }
            let lum = Self.srgbRelativeLuminance(r: Double(r), g: Double(g), b: Double(b))
            return lum > Self.perceptualLuminanceCrossover ? UIColor(JudarnColors.pureBlack) : UIColor(JudarnColors.pureWhite)
        })
        #elseif canImport(AppKit)
        return Color(NSColor(name: nil) { appearance in
            var resolvedColor = NSColor(self)
            appearance.performAsCurrentDrawingAppearance {
                resolvedColor = NSColor(self)
            }
            guard let rgb = resolvedColor.usingColorSpace(.sRGB) ?? resolvedColor.usingColorSpace(.extendedSRGB) else {
                return NSColor(JudarnColors.pureWhite)
            }
            var r: CGFloat = 0, g: CGFloat = 0, b: CGFloat = 0, a: CGFloat = 0
            rgb.getRed(&r, green: &g, blue: &b, alpha: &a)
            let lum = Self.srgbRelativeLuminance(r: Double(r), g: Double(g), b: Double(b))
            return lum > Self.perceptualLuminanceCrossover ? NSColor(JudarnColors.pureBlack) : NSColor(JudarnColors.pureWhite)
        })
        #else
        return JudarnColors.pureWhite
        #endif
    }

    /// Returns a contrast-clamped foreground color that reaches `minRatio` (default 4.5:1 WCAG AA) against `surface`.
    /// Reachability peaks at about 4.58:1 on surfaces near the WCAG crossover, so a higher `minRatio` can resolve to the strongest reachable ink instead.
    func contrastingAccent(against surface: Color = JudarnColors.surfaceElevated, minRatio: Double = 4.5) -> Color {
        #if canImport(UIKit)
        return Color(UIColor { trait in
            let fgUIColor = UIColor(self).resolvedColor(with: trait)
            let bgUIColor = UIColor(surface).resolvedColor(with: trait)
            var fr: CGFloat = 0, fg: CGFloat = 0, fb: CGFloat = 0, fa: CGFloat = 0
            var br: CGFloat = 0, bg: CGFloat = 0, bb: CGFloat = 0, ba: CGFloat = 0
            guard fgUIColor.getRed(&fr, green: &fg, blue: &fb, alpha: &fa),
                  bgUIColor.getRed(&br, green: &bg, blue: &bb, alpha: &ba) else {
                return UIColor(JudarnColors.ink100).resolvedColor(with: trait)
            }
            let yFg = Self.srgbRelativeLuminance(r: Double(fr), g: Double(fg), b: Double(fb))
            let yBg = Self.srgbRelativeLuminance(r: Double(br), g: Double(bg), b: Double(bb))
            let ratio = (max(yFg, yBg) + 0.05) / (min(yFg, yBg) + 0.05)
            if ratio >= minRatio { return fgUIColor }
            let targetDarker = yBg > Self.wcagLuminanceCrossover
            var low = 0.0, high = 1.0
            for _ in 0..<20 {
                let mid = 0.5 * (low + high)
                let cr = targetDarker ? Double(fr) * (1.0 - mid) : Double(fr) + (1.0 - Double(fr)) * mid
                let cg = targetDarker ? Double(fg) * (1.0 - mid) : Double(fg) + (1.0 - Double(fg)) * mid
                let cb = targetDarker ? Double(fb) * (1.0 - mid) : Double(fb) + (1.0 - Double(fb)) * mid
                let yCand = Self.srgbRelativeLuminance(r: cr, g: cg, b: cb)
                let candRatio = (max(yCand, yBg) + 0.05) / (min(yCand, yBg) + 0.05)
                if candRatio >= minRatio { high = mid } else { low = mid }
            }
            let t = high
            let rr = targetDarker ? Double(fr) * (1.0 - t) : Double(fr) + (1.0 - Double(fr)) * t
            let rg = targetDarker ? Double(fg) * (1.0 - t) : Double(fg) + (1.0 - Double(fg)) * t
            let rb = targetDarker ? Double(fb) * (1.0 - t) : Double(fb) + (1.0 - Double(fb)) * t
            return UIColor(red: CGFloat(rr), green: CGFloat(rg), blue: CGFloat(rb), alpha: fa)
        })
        #elseif canImport(AppKit)
        return Color(NSColor(name: nil) { appearance in
            var fgNS = NSColor(self)
            var bgNS = NSColor(surface)
            appearance.performAsCurrentDrawingAppearance {
                fgNS = NSColor(self)
                bgNS = NSColor(surface)
            }
            guard let fgRgb = fgNS.usingColorSpace(.sRGB) ?? fgNS.usingColorSpace(.extendedSRGB),
                  let bgRgb = bgNS.usingColorSpace(.sRGB) ?? bgNS.usingColorSpace(.extendedSRGB) else {
                return NSColor(JudarnColors.ink100)
            }
            var fr: CGFloat = 0, fg: CGFloat = 0, fb: CGFloat = 0, fa: CGFloat = 0
            var br: CGFloat = 0, bg: CGFloat = 0, bb: CGFloat = 0, ba: CGFloat = 0
            fgRgb.getRed(&fr, green: &fg, blue: &fb, alpha: &fa)
            bgRgb.getRed(&br, green: &bg, blue: &bb, alpha: &ba)
            let yFg = Self.srgbRelativeLuminance(r: Double(fr), g: Double(fg), b: Double(fb))
            let yBg = Self.srgbRelativeLuminance(r: Double(br), g: Double(bg), b: Double(bb))
            let ratio = (max(yFg, yBg) + 0.05) / (min(yFg, yBg) + 0.05)
            if ratio >= minRatio { return fgRgb }
            let targetDarker = yBg > Self.wcagLuminanceCrossover
            var low = 0.0, high = 1.0
            for _ in 0..<20 {
                let mid = 0.5 * (low + high)
                let cr = targetDarker ? Double(fr) * (1.0 - mid) : Double(fr) + (1.0 - Double(fr)) * mid
                let cg = targetDarker ? Double(fg) * (1.0 - mid) : Double(fg) + (1.0 - Double(fg)) * mid
                let cb = targetDarker ? Double(fb) * (1.0 - mid) : Double(fb) + (1.0 - Double(fb)) * mid
                let yCand = Self.srgbRelativeLuminance(r: cr, g: cg, b: cb)
                let candRatio = (max(yCand, yBg) + 0.05) / (min(yCand, yBg) + 0.05)
                if candRatio >= minRatio { high = mid } else { low = mid }
            }
            let t = high
            let rr = targetDarker ? Double(fr) * (1.0 - t) : Double(fr) + (1.0 - Double(fr)) * t
            let rg = targetDarker ? Double(fg) * (1.0 - t) : Double(fg) + (1.0 - Double(fg)) * t
            let rb = targetDarker ? Double(fb) * (1.0 - t) : Double(fb) + (1.0 - Double(fb)) * t
            return NSColor(srgbRed: CGFloat(rr), green: CGFloat(rg), blue: CGFloat(rb), alpha: fa)
        })
        #else
        return self
        #endif
    }
}

public extension Color {
    struct JudarnColorScope: Sendable {
        public var substrate: Color { JudarnColors.substrate }
        public var surfaceElevated: Color { JudarnColors.surfaceElevated }
        public var surfaceRecessed: Color { JudarnColors.surfaceRecessed }
        public var pureBlack: Color { JudarnColors.pureBlack }
        public var pureWhite: Color { JudarnColors.pureWhite }
        public var black: Color { JudarnColors.black }
        public var white: Color { JudarnColors.white }
        public var paper: Color { JudarnColors.paper }
        public var ink100: Color { JudarnColors.ink100 }
        public var ink60: Color { JudarnColors.ink60 }
        public var ink30: Color { JudarnColors.ink30 }
        public var signalError: Color { JudarnColors.signalError }
        public var fg1: Color { JudarnColors.fg1 }
        public var fg2: Color { JudarnColors.fg2 }
        public var fg3: Color { JudarnColors.fg3 }
        public var bg1: Color { JudarnColors.bg1 }
        public var bg2: Color { JudarnColors.bg2 }
        public var accent: Color { JudarnColors.ink100 }
        public var accent2: Color { JudarnColors.ink60 }
    }
    
    static let judarn = JudarnColorScope()
}

// System Accent Color Inheritance: Honor the user's system accent color when no app-specific brand accent is configured.
public struct JudarnAccentKey: EnvironmentKey {
    public static let defaultValue: Color = Color.accentColor
}

public struct JudarnAccent2Key: EnvironmentKey {
    public static let defaultValue: Color = JudarnColors.ink60
}

public extension EnvironmentValues {
    /// Primary project accent color
    var judarnAccent: Color {
        get { self[JudarnAccentKey.self] }
        set { self[JudarnAccentKey.self] = newValue }
    }
    
    /// Optional secondary project accent color
    var judarnAccent2: Color {
        get { self[JudarnAccent2Key.self] }
        set { self[JudarnAccent2Key.self] = newValue }
    }
}

public extension View {
    /// Set the project-specific accent colors for this view hierarchy.
    /// The secondary accent defaults to `JudarnColors.ink60`, the same value as `Color.judarn.accent2` and the `judarnAccent2` environment default.
    func judarnAccent(_ accent: Color, secondaryAccent: Color = JudarnColors.ink60) -> some View {
        self
            .environment(\.judarnAccent, accent)
            .environment(\.judarnAccent2, secondaryAccent)
    }
}

extension Color {
    /// Cubed OKLab LMS to linear Display P3. Derived as the sRGB to Display P3 matrix (D65 primaries) times Ottosson's LMS to linear sRGB matrix, so every row sums to 1.0 and neutrals stay neutral.
    static let oklabLmsToLinearDisplayP3: [[Double]] = [
        [+3.127768987206, -2.257135796195, +0.129366808989],
        [-1.091009047849, +2.413331758672, -0.322322710822],
        [-0.026010813013, -0.508041325896, +1.534052138909]
    ]
}

public extension Color {
    /// Initialize a SwiftUI Color from OKLCh coordinates.
    /// Chroma is reduced by bisection until the color fits the sRGB gamut (the CSS Color 4 approach), so wide-gamut chroma is never used.
    /// The result is expressed in the Display P3 color space, where it reads as the same color as the sRGB original on any display.
    /// - Parameters:
    ///   - l: Lightness (0.0 to 1.0)
    ///   - c: Chroma (typically 0.0 to 0.4)
    ///   - h: Hue in degrees (0.0 to 360.0)
    ///   - opacity: Opacity (0.0 to 1.0)
    init(oklchL l: Double, c: Double, h: Double, opacity: Double = 1.0) {
        if l <= 0.0 {
            self.init(.displayP3, red: 0.0, green: 0.0, blue: 0.0, opacity: opacity)
            return
        }
        if l >= 1.0 {
            self.init(.displayP3, red: 1.0, green: 1.0, blue: 1.0, opacity: opacity)
            return
        }

        let hRad = h * Double.pi / 180.0
        let cosH = cos(hRad)
        let sinH = sin(hRad)

        let toLinearSrgb: (Double) -> (r: Double, g: Double, b: Double) = { chroma in
            let a = chroma * cosH
            let b = chroma * sinH
            let l_lms = l + 0.3963377774 * a + 0.2158037573 * b
            let m_lms = l - 0.1055613458 * a - 0.0638541728 * b
            let s_lms = l - 0.0894841775 * a - 1.2914855480 * b
            let l_ = l_lms * l_lms * l_lms
            let m_ = m_lms * m_lms * m_lms
            let s_ = s_lms * s_lms * s_lms
            return (
                r: +4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_,
                g: -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_,
                b: -0.0041960863 * l_ - 0.7034186147 * m_ + 1.7076147010 * s_
            )
        }

        let inSrgbGamut: ((r: Double, g: Double, b: Double)) -> Bool = { rgb in
            let eps = 1e-6
            return rgb.r >= -eps && rgb.r <= 1.0 + eps &&
                   rgb.g >= -eps && rgb.g <= 1.0 + eps &&
                   rgb.b >= -eps && rgb.b <= 1.0 + eps
        }

        var mappedC = max(0.0, c)
        if !inSrgbGamut(toLinearSrgb(mappedC)) {
            var low = 0.0
            var high = mappedC
            for _ in 0..<24 {
                let mid = 0.5 * (low + high)
                if inSrgbGamut(toLinearSrgb(mid)) {
                    low = mid
                } else {
                    high = mid
                }
            }
            mappedC = low
        }

        let a = mappedC * cosH
        let b = mappedC * sinH
        let l_lms = l + 0.3963377774 * a + 0.2158037573 * b
        let m_lms = l - 0.1055613458 * a - 0.0638541728 * b
        let s_lms = l - 0.0894841775 * a - 1.2914855480 * b

        let l_ = l_lms * l_lms * l_lms
        let m_ = m_lms * m_lms * m_lms
        let s_ = s_lms * s_lms * s_lms

        let p3 = Color.oklabLmsToLinearDisplayP3
        let rLinear = p3[0][0] * l_ + p3[0][1] * m_ + p3[0][2] * s_
        let gLinear = p3[1][0] * l_ + p3[1][1] * m_ + p3[1][2] * s_
        let bLinear = p3[2][0] * l_ + p3[2][1] * m_ + p3[2][2] * s_

        let f: (Double) -> Double = { val in
            let clamped = max(0.0, min(1.0, val))
            if clamped <= 0.0031308 {
                return 12.92 * clamped
            } else {
                return 1.055 * pow(clamped, 1.0 / 2.4) - 0.055
            }
        }

        let r = max(0.0, min(1.0, f(rLinear)))
        let g = max(0.0, min(1.0, f(gLinear)))
        let blue = max(0.0, min(1.0, f(bLinear)))

        self.init(.displayP3, red: r, green: g, blue: blue, opacity: opacity)
    }
}
