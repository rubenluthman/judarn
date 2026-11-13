import SwiftUI

public enum JudarnBadgeVariant: Sendable {
    /// A well fill: `surfaceRecessed` on the substrate, `substrate` on an elevated surface.
    case neutral
    case solid
    case accent
    /// A light tint of the accent with `ink100` text. Tints belong to light mode, so dark mode falls back to the neutral well.
    case accentTint
}

/// SwiftUI Status Badge. Set as written, because a status is a value, not a label. Capsule geometry.
/// Set apart by fill alone (DESIGN.md, Surface Hierarchy): no stroke at rest, an `ink100` outline in Increase Contrast.
public struct JudarnBadge: View {
    public let text: String
    public let variant: JudarnBadgeVariant

    @Environment(\.judarnAccent) private var accentColor
    @Environment(\.judarnOnElevatedSurface) private var isOnElevatedSurface
    @Environment(\.colorScheme) private var colorScheme
    @Environment(\.colorSchemeContrast) private var colorSchemeContrast
    @Environment(\.self) private var environment

    public init(_ text: String, variant: JudarnBadgeVariant = .neutral) {
        self.text = text
        self.variant = variant
    }

    public var body: some View {
        let colors = Self.colors(
            variant: variant,
            accentColor: accentColor,
            isOnElevatedSurface: isOnElevatedSurface,
            isDark: colorScheme == .dark,
            tint: { Self.tint($0, in: environment) }
        )
        Text(text)
            .judarnLabel(casing: .asWritten)
            .padding(.horizontal, JudarnSpacing.space1)
            .padding(.vertical, JudarnSpacing.spaceHalf)
            .background(colors.background, in: Capsule())
            .foregroundColor(colors.foreground)
            .judarnControlOutline(Capsule(), increasedContrast: colorSchemeContrast == .increased)
    }

    static func colors(
        variant: JudarnBadgeVariant,
        accentColor: Color,
        isOnElevatedSurface: Bool,
        isDark: Bool,
        tint: (Color) -> Color
    ) -> (background: Color, foreground: Color) {
        let well = JudarnTextField.fill(isOnElevatedSurface: isOnElevatedSurface)
        switch variant {
        case .neutral:
            return (well, JudarnColors.ink100)
        case .solid:
            return (JudarnColors.ink100, JudarnColors.substrate)
        case .accent:
            return (accentColor, accentColor.contrastingInk)
        case .accentTint:
            return (isDark ? well : tint(accentColor), JudarnColors.ink100)
        }
    }

    /// Mixes `amount` of the color with white in OKLab, which equals the OKLCh mix because white has no hue.
    static func tint(_ color: Color, in environment: EnvironmentValues, amount: Double = 0.14) -> Color {
        let resolved = color.resolve(in: environment)
        let lab = OKLab(linearRed: Double(resolved.linearRed), green: Double(resolved.linearGreen), blue: Double(resolved.linearBlue))
        let mixed = OKLab(l: 1 + (lab.l - 1) * amount, a: lab.a * amount, b: lab.b * amount)
        let rgb = mixed.linearSRGB
        return Color(.sRGBLinear, red: rgb.r, green: rgb.g, blue: rgb.b)
    }
}

/// OKLab from and to linear sRGB (Björn Ottosson's matrices).
struct OKLab: Equatable {
    var l: Double
    var a: Double
    var b: Double

    init(l: Double, a: Double, b: Double) {
        self.l = l
        self.a = a
        self.b = b
    }

    init(linearRed r: Double, green g: Double, blue b: Double) {
        let lms = (
            cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b),
            cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b),
            cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
        )
        self.l = 0.2104542553 * lms.0 + 0.7936177850 * lms.1 - 0.0040720468 * lms.2
        self.a = 1.9779984951 * lms.0 - 2.4285922050 * lms.1 + 0.4505937099 * lms.2
        self.b = 0.0259040371 * lms.0 + 0.7827717662 * lms.1 - 0.8086757660 * lms.2
    }

    var linearSRGB: (r: Double, g: Double, b: Double) {
        let l1 = pow(l + 0.3963377774 * a + 0.2158037573 * b, 3)
        let m1 = pow(l - 0.1055613458 * a - 0.0638541728 * b, 3)
        let s1 = pow(l - 0.0894841775 * a - 1.2914855480 * b, 3)
        return (
            4.0767416621 * l1 - 3.3077115913 * m1 + 0.2309699292 * s1,
            -1.2684380046 * l1 + 2.6097574011 * m1 - 0.3413193965 * s1,
            -0.0041960863 * l1 - 0.7034186147 * m1 + 1.7076147010 * s1
        )
    }
}

// Tag vs. Badge Semantic Scale: Status badges use .judarnLabel (.footnote on iOS, .subheadline on macOS), while auxiliary keyword tags scale down to sentence-case .caption2, preserving a clear hierarchical rank.
/// SwiftUI Keyword Tag. Sentence case, smaller, capsule geometry, a well fill like the neutral badge.
public struct JudarnTag: View {
    public let text: String

    @Environment(\.judarnOnElevatedSurface) private var isOnElevatedSurface
    @Environment(\.colorSchemeContrast) private var colorSchemeContrast

    public init(_ text: String) {
        self.text = text
    }

    public var body: some View {
        Text(text)
            .modifier(JudarnTypographyModifier(textStyle: .caption2, weight: .medium, trackingEm: 0, leading: .standard, isUppercase: false, slot: .body))
            .padding(.horizontal, JudarnSpacing.space1)
            .padding(.vertical, JudarnSpacing.spaceHalf)
            .background(JudarnTextField.fill(isOnElevatedSurface: isOnElevatedSurface), in: Capsule())
            .foregroundColor(JudarnColors.ink100)
            .judarnControlOutline(Capsule(), increasedContrast: colorSchemeContrast == .increased)
    }
}

/// The outline of a control set apart by fill: none at rest, `ink100` at `rule` width in Increase Contrast.
func judarnControlOutlineStyle(increasedContrast: Bool) -> (color: Color, width: CGFloat) {
    increasedContrast ? (JudarnColors.ink100, JudarnSpacing.rule) : (.clear, 0)
}

extension View {
    func judarnControlOutline<S: InsettableShape>(_ shape: S, increasedContrast: Bool) -> some View {
        let outline = judarnControlOutlineStyle(increasedContrast: increasedContrast)
        return overlay(shape.strokeBorder(outline.color, lineWidth: outline.width))
    }
}
