import SwiftUI
import CoreText

/// Typography styles conforming to the Judarn modular typographic scale.
/// Generated from tokens/judarn-tokens.json  –  do not edit directly.
public enum JudarnTypographyStyle: Sendable, CaseIterable {
    case display
    case h1
    case h2
    case h3
    case h4
    case bodyLg
    case body
    case small
    case label
    case micro
    case data
    case mono
}

/// Casing for the uppercase label styles, label and micro.
/// uppercase is for eyebrows, section labels, column headers, and value labels of at most two words
/// with no digit, unit symbol, or mixed-case term. asWritten keeps size and weight with body tracking,
/// for statuses, counts, values, units, messages, and controls.
public enum JudarnTextCasing: Sendable {
    case uppercase
    case asWritten
}

extension JudarnTypographyStyle {
    @MainActor var typographyModifier: JudarnTypographyModifier {
        switch self {
        case .display:
            return JudarnTypographyModifier(textStyle: .largeTitle, weight: .black, trackingEm: -0.02, leading: .tight, isUppercase: false, slot: .display, usesCaseForms: false)
        case .h1:
            return JudarnTypographyModifier(textStyle: .largeTitle, weight: .heavy, trackingEm: -0.01, leading: .tight, isUppercase: false, slot: .display, usesCaseForms: false)
        case .h2:
            return JudarnTypographyModifier(textStyle: .title, weight: .heavy, trackingEm: -0.01, leading: .tight, isUppercase: false, slot: .display, usesCaseForms: false)
        case .h3:
            return JudarnTypographyModifier(textStyle: .title2, weight: .heavy, trackingEm: -0.01, leading: .tight, isUppercase: false, slot: .display, usesCaseForms: false)
        case .h4:
            return JudarnTypographyModifier(textStyle: .title3, weight: .heavy, trackingEm: -0.01, leading: .tight, isUppercase: false, slot: .body, usesCaseForms: false)
        case .bodyLg:
            return JudarnTypographyModifier(textStyle: .title3, weight: .regular, trackingEm: 0, leading: .tight, isUppercase: false, slot: .body, usesCaseForms: false)
        case .body:
            return JudarnTypographyModifier(textStyle: .body, weight: .regular, trackingEm: 0, leading: .tight, isUppercase: false, slot: .body, usesCaseForms: false)
        case .small:
            return JudarnTypographyModifier(textStyle: .callout, weight: .regular, trackingEm: 0, leading: .tight, isUppercase: false, slot: .body, usesCaseForms: false)
        case .label:
            #if os(macOS)
            return JudarnTypographyModifier(textStyle: .subheadline, weight: .heavy, trackingEm: 0.06, leading: .standard, isUppercase: true, slot: .body, usesCaseForms: true)
            #else
            return JudarnTypographyModifier(textStyle: .footnote, weight: .heavy, trackingEm: 0.06, leading: .standard, isUppercase: true, slot: .body, usesCaseForms: true)
            #endif
        case .micro:
            return JudarnTypographyModifier(textStyle: .caption2, weight: .medium, trackingEm: 0.08, leading: .standard, isUppercase: true, slot: .body, usesCaseForms: true)
        case .data:
            return JudarnTypographyModifier(textStyle: .callout, weight: .regular, trackingEm: 0, leading: .standard, isUppercase: false, slot: .data, isMonospacedDigit: true, usesCaseForms: false)
        case .mono:
            return JudarnTypographyModifier(textStyle: .caption, weight: .regular, trackingEm: 0, leading: .standard, isUppercase: false, slot: .mono, isMonospacedDigit: true, usesCaseForms: false)
        }
    }
}

/// Semantic typographic font slot roles.
public enum JudarnFontSlot: Sendable {
    case display
    case body
    case data
    case mono
}

/// Pluggable font configuration allowing projects to override display or data fonts while falling back to sans.
public struct JudarnFontConfig: Sendable, Equatable {
    public let sans: String?
    public let display: String?
    public let data: String?
    
    public init(sans: String? = nil, display: String? = nil, data: String? = nil) {
        self.sans = sans
        self.display = display
        self.data = data
    }
    
    public static let `default` = JudarnFontConfig()
}

private struct JudarnFontConfigKey: EnvironmentKey {
    static let defaultValue: JudarnFontConfig = .default
}

public extension EnvironmentValues {
    var judarnFontConfig: JudarnFontConfig {
        get { self[JudarnFontConfigKey.self] }
        set { self[JudarnFontConfigKey.self] = newValue }
    }
}

// Platform Preferred Point Sizes: macOS desktop uses denser baseline metrics (13pt body, 11pt subhead, 10pt caption) compared to iOS touch standards (17pt body, 15pt subhead, 11pt caption).
#if os(macOS)
import AppKit

private func preferredPointSize(for style: Font.TextStyle, dynamicTypeSize: DynamicTypeSize? = nil) -> CGFloat {
    let nsStyle: NSFont.TextStyle
    switch style {
    case .largeTitle: nsStyle = .largeTitle
    case .title: nsStyle = .title1
    case .title2: nsStyle = .title2
    case .title3: nsStyle = .title3
    case .headline: nsStyle = .headline
    case .subheadline: nsStyle = .subheadline
    case .body: nsStyle = .body
    case .callout: nsStyle = .callout
    case .footnote: nsStyle = .footnote
    case .caption: nsStyle = .caption1
    case .caption2: nsStyle = .caption2
    @unknown default: nsStyle = .body
    }
    return NSFont.preferredFont(forTextStyle: nsStyle).pointSize
}

private func platformWeight(_ weight: Font.Weight) -> NSFont.Weight {
    switch weight {
    case .ultraLight: return .ultraLight
    case .thin: return .thin
    case .light: return .light
    case .medium: return .medium
    case .semibold: return .semibold
    case .bold: return .bold
    case .heavy: return .heavy
    case .black: return .black
    default: return .regular
    }
}
#elseif canImport(UIKit)
import UIKit

private func preferredPointSize(for style: Font.TextStyle, dynamicTypeSize: DynamicTypeSize? = nil) -> CGFloat {
    let uiStyle: UIFont.TextStyle
    switch style {
    case .largeTitle: uiStyle = .largeTitle
    case .title: uiStyle = .title1
    case .title2: uiStyle = .title2
    case .title3: uiStyle = .title3
    case .headline: uiStyle = .headline
    case .subheadline: uiStyle = .subheadline
    case .body: uiStyle = .body
    case .callout: uiStyle = .callout
    case .footnote: uiStyle = .footnote
    case .caption: uiStyle = .caption1
    case .caption2: uiStyle = .caption2
    @unknown default: uiStyle = .body
    }
    guard let dynamicTypeSize else { return UIFont.preferredFont(forTextStyle: uiStyle).pointSize }
    let traits = UITraitCollection(preferredContentSizeCategory: UIContentSizeCategory(dynamicTypeSize))
    return UIFont.preferredFont(forTextStyle: uiStyle, compatibleWith: traits).pointSize
}

private func platformWeight(_ weight: Font.Weight) -> UIFont.Weight {
    switch weight {
    case .ultraLight: return .ultraLight
    case .thin: return .thin
    case .light: return .light
    case .medium: return .medium
    case .semibold: return .semibold
    case .bold: return .bold
    case .heavy: return .heavy
    case .black: return .black
    default: return .regular
    }
}
#else
private func preferredPointSize(for style: Font.TextStyle, dynamicTypeSize: DynamicTypeSize? = nil) -> CGFloat {
    16
}
#endif

/// Typographic scale modifiers for the Judarn design system with native text style scaling and pluggable font slots.
public struct JudarnTypographyModifier: ViewModifier {
    @Environment(\.judarnFontConfig) private var fontConfig
    @Environment(\.dynamicTypeSize) private var dynamicTypeSize
    @Environment(\.judarnEditorialNumerals) private var editorialNumerals
    private let explicitSize: CGFloat?
    public let textStyle: Font.TextStyle
    public let weight: Font.Weight
    /// Tracking in em, as in the tokens. Points follow the rendered size, so Apple matches the web.
    public let trackingEm: CGFloat
    /// Font leading from the role's `appleLeading` token: tight removes the open gap Apple's standard leading adds between wrapped lines.
    public let leading: Font.Leading
    public let isUppercase: Bool
    public let slot: JudarnFontSlot
    public let isMonospacedDigit: Bool
    /// Applies the OpenType case-sensitive forms (`case` feature, token `caseFeature`) so punctuation and figures sit on the cap height. Meant for uppercase styles.
    public let usesCaseForms: Bool

    public var size: CGFloat {
        explicitSize ?? preferredPointSize(for: textStyle)
    }

    /// Tracking in points at the current preferred size.
    public var tracking: CGFloat {
        trackingEm * size
    }

    /// Tracking in points at a Dynamic Type size; macOS has no Dynamic Type and uses its preferred size.
    func resolvedTracking(at dynamicTypeSize: DynamicTypeSize) -> CGFloat {
        trackingEm * (explicitSize ?? preferredPointSize(for: textStyle, dynamicTypeSize: dynamicTypeSize))
    }

    /// Base size for a custom font. Font.custom(_:size:relativeTo:) scales from the default Dynamic Type
    /// size itself, so the base must be the default size, not the current preferred size.
    var customFontBaseSize: CGFloat {
        explicitSize ?? preferredPointSize(for: textStyle, dynamicTypeSize: .large)
    }

    public init(
        size: CGFloat? = nil,
        textStyle: Font.TextStyle = .body,
        weight: Font.Weight,
        trackingEm: CGFloat = 0,
        leading: Font.Leading = .standard,
        isUppercase: Bool = false,
        slot: JudarnFontSlot = .body,
        isMonospacedDigit: Bool = false,
        usesCaseForms: Bool = false
    ) {
        self.explicitSize = size
        self.textStyle = textStyle
        self.weight = weight
        self.trackingEm = trackingEm
        self.leading = leading
        self.isUppercase = isUppercase
        self.slot = slot
        self.isMonospacedDigit = isMonospacedDigit
        self.usesCaseForms = usesCaseForms
    }

    private var customFontName: String? {
        switch slot {
        case .display: return fontConfig.display ?? fontConfig.sans
        case .body:    return fontConfig.sans
        case .data:    return fontConfig.data ?? fontConfig.sans
        case .mono:    return nil
        }
    }

    /// True when the font must be built from a CoreText descriptor to carry OpenType features.
    private var needsFeatureFont: Bool {
        #if os(macOS) || canImport(UIKit)
        return usesCaseForms || editorialNumerals
        #else
        return false
        #endif
    }

    #if os(macOS) || canImport(UIKit)
    /// Font with OpenType features, sized from the current Dynamic Type size so scaling and style composition survive.
    private var featureFont: Font {
        let pointSize = explicitSize ?? preferredPointSize(for: textStyle, dynamicTypeSize: dynamicTypeSize)
        #if os(macOS)
        let base: NSFont
        if let name = customFontName, let custom = NSFont(name: name, size: pointSize) {
            base = custom
        } else if slot == .mono {
            base = NSFont.monospacedSystemFont(ofSize: pointSize, weight: platformWeight(weight))
        } else {
            base = NSFont.systemFont(ofSize: pointSize, weight: platformWeight(weight))
        }
        #else
        let base: UIFont
        if let name = customFontName, let custom = UIFont(name: name, size: pointSize) {
            base = custom
        } else if slot == .mono {
            base = UIFont.monospacedSystemFont(ofSize: pointSize, weight: platformWeight(weight))
        } else {
            base = UIFont.systemFont(ofSize: pointSize, weight: platformWeight(weight))
        }
        #endif
        var descriptor = CTFontCopyFontDescriptor(base)
        if usesCaseForms {
            descriptor = CTFontDescriptorCreateCopyWithFeature(
                descriptor,
                kCaseSensitiveLayoutType as CFNumber,
                kCaseSensitiveLayoutOnSelector as CFNumber
            )
        }
        if editorialNumerals {
            descriptor = CTFontDescriptorCreateCopyWithFeature(
                descriptor,
                kNumberCaseType as CFNumber,
                kLowerCaseNumbersSelector as CFNumber
            )
            descriptor = CTFontDescriptorCreateCopyWithFeature(
                descriptor,
                kNumberSpacingType as CFNumber,
                kProportionalNumbersSelector as CFNumber
            )
        }
        let font = Font(CTFontCreateWithFontDescriptor(descriptor, pointSize, nil))
        return customFontName == nil ? font : font.weight(weight)
    }
    #endif

    private var resolvedFont: Font {
        #if os(macOS) || canImport(UIKit)
        if needsFeatureFont { return featureFont }
        #endif
        if let fontName = customFontName {
            return Font.custom(fontName, size: customFontBaseSize, relativeTo: textStyle).weight(weight)
        }

        let design: Font.Design = (slot == .mono) ? .monospaced : .default
        if let explicitSize {
            return Font.system(size: explicitSize, weight: weight, design: design)
        }
        return Font.system(textStyle, design: design).weight(weight)
    }

    public func body(content: Content) -> some View {
        let base = content
            .font(resolvedFont.leading(leading))
            .tracking(resolvedTracking(at: dynamicTypeSize))
            .textCase(isUppercase ? .uppercase : nil)

        if isMonospacedDigit {
            base.monospacedDigit()
        } else {
            base
        }
    }

    /// Body tracking in em, from tracking.body in the tokens.
    static let bodyTrackingEm: CGFloat = 0

    /// Returns this style with the given casing. As written drops the uppercase transform and the
    /// positive tracking that pairs only with it; uppercase never adds caps to a style without them.
    public func casing(_ casing: JudarnTextCasing) -> JudarnTypographyModifier {
        guard casing == .asWritten else { return self }
        return JudarnTypographyModifier(
            size: explicitSize,
            textStyle: textStyle,
            weight: weight,
            trackingEm: Self.bodyTrackingEm,
            leading: leading,
            isUppercase: false,
            slot: slot,
            isMonospacedDigit: isMonospacedDigit,
            usesCaseForms: false
        )
    }
}

/// Environment switch behind `judarnEditorialNumerals()`.
struct JudarnEditorialNumeralsKey: EnvironmentKey {
    static let defaultValue = false
}

extension EnvironmentValues {
    var judarnEditorialNumerals: Bool {
        get { self[JudarnEditorialNumeralsKey.self] }
        set { self[JudarnEditorialNumeralsKey.self] = newValue }
    }
}

public extension View {
    /// Injects a custom Judarn font configuration into the view hierarchy.
    func judarnFontConfig(_ config: JudarnFontConfig) -> some View {
        environment(\.judarnFontConfig, config)
    }

    // Semantic Text Style Mapping: Uses Apple system text styles to preserve platform density, optical variant selection (SF Pro Text vs SF Pro Display), and accessibility Dynamic Type scaling. A role takes a different style on macOS only where its own style would match a smaller role's size there: label is .footnote on iOS but .subheadline on macOS, where .footnote equals micro's .caption2. Apple has fewer sizes above .body than Judarn has roles above body, so some roles share a size; a shared size goes to roles of different weights, as bodyLg (regular) shares .title3 with h4 (heavy) and display (black) shares .largeTitle with h1 (heavy). Token weights map to the matching Font.Weight, so 800 is .heavy and 900 is .black, as in CSS.
    /// Applies a Judarn typographic style mapped to native platform text styles.
    func judarnTypography(_ style: JudarnTypographyStyle) -> some View {
        modifier(style.typographyModifier)
    }

    /// Poster-scale headline (mapped to .largeTitle, black; shares h1's size and differs by weight)
    func judarnDisplay() -> some View {
        judarnTypography(.display)
    }

    /// H1 header (mapped to .largeTitle, heavy)
    func judarnH1() -> some View {
        judarnTypography(.h1)
    }

    /// H2 header (mapped to .title, heavy)
    func judarnH2() -> some View {
        judarnTypography(.h2)
    }

    /// H3 header (mapped to .title2, heavy)
    func judarnH3() -> some View {
        judarnTypography(.h3)
    }

    /// H4 header (mapped to .title3, heavy)
    func judarnH4() -> some View {
        judarnTypography(.h4)
    }

    /// Large body copy (mapped to .title3, regular; shares h4's size and differs by weight)
    func judarnBodyLg() -> some View {
        judarnTypography(.bodyLg)
    }

    /// Standard body copy (mapped to .body, regular)
    func judarnBody() -> some View {
        judarnTypography(.body)
    }

    /// Small descriptive copy (mapped to .callout, regular)
    func judarnSmall() -> some View {
        judarnTypography(.small)
    }

    /// Small bold label (mapped to .footnote, .subheadline on macOS, heavy). Uppercase by default; pass .asWritten
    /// for statuses, counts, values, units, messages, and controls.
    func judarnLabel(casing: JudarnTextCasing = .uppercase) -> some View {
        modifier(JudarnTypographyStyle.label.typographyModifier.casing(casing))
    }

    /// Micro label (mapped to .caption2, medium). Uppercase by default; pass .asWritten
    /// for statuses, counts, values, units, messages, and controls.
    func judarnMicro(casing: JudarnTextCasing = .uppercase) -> some View {
        modifier(JudarnTypographyStyle.micro.typographyModifier.casing(casing))
    }

    /// Tabular numeric figures (mapped to .callout, tabular digits)
    func judarnData() -> some View {
        judarnTypography(.data)
    }

    /// Monospaced technical copy (mapped to .caption, monospaced)
    func judarnMono() -> some View {
        judarnTypography(.mono)
    }

    /// Applies proportional old-style figures to every Judarn typography style in this view subtree, for narrative editorial prose.
    /// Apply it after the style or on a container; the styles read it from the environment, so the size, weight, tracking,
    /// Dynamic Type scaling and any configured font family stay those of the style. Text without a Judarn style is unchanged.
    func judarnEditorialNumerals(_ enabled: Bool = true) -> some View {
        environment(\.judarnEditorialNumerals, enabled)
    }
}

#if os(macOS)
public extension JudarnTypographyStyle {
    /// AppKit font for this style, for labels, fields, and attributed strings that SwiftUI modifiers cannot reach.
    /// It resolves the same text style, weight, slot, and OpenType case forms as the SwiftUI modifier, at the
    /// current preferred size. Leading and tracking are not part of an `NSFont`; apply them separately when an attributed string needs them. Pass a config to use project fonts, as `judarnFontConfig` does.
    @MainActor
    func nsFont(config: JudarnFontConfig = .default, editorialNumerals: Bool = false) -> NSFont {
        let modifier = typographyModifier
        let pointSize = modifier.size
        let customName: String?
        switch modifier.slot {
        case .display: customName = config.display ?? config.sans
        case .body: customName = config.sans
        case .data: customName = config.data ?? config.sans
        case .mono: customName = nil
        }
        let weight = platformWeight(modifier.weight)
        let base: NSFont
        if let customName, let custom = NSFont(name: customName, size: pointSize) {
            base = custom
        } else if modifier.slot == .mono {
            base = NSFont.monospacedSystemFont(ofSize: pointSize, weight: weight)
        } else {
            base = NSFont.systemFont(ofSize: pointSize, weight: weight)
        }
        var descriptor = CTFontCopyFontDescriptor(base)
        if modifier.usesCaseForms {
            descriptor = CTFontDescriptorCreateCopyWithFeature(
                descriptor, kCaseSensitiveLayoutType as CFNumber, kCaseSensitiveLayoutOnSelector as CFNumber)
        }
        if editorialNumerals {
            descriptor = CTFontDescriptorCreateCopyWithFeature(
                descriptor, kNumberCaseType as CFNumber, kLowerCaseNumbersSelector as CFNumber)
            descriptor = CTFontDescriptorCreateCopyWithFeature(
                descriptor, kNumberSpacingType as CFNumber, kProportionalNumbersSelector as CFNumber)
        }
        if modifier.isMonospacedDigit {
            descriptor = CTFontDescriptorCreateCopyWithFeature(
                descriptor, kNumberSpacingType as CFNumber, kMonospacedNumbersSelector as CFNumber)
        }
        return CTFontCreateWithFontDescriptor(descriptor, pointSize, nil) as NSFont
    }
}
#endif
