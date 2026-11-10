import SwiftUI

public enum JudarnBadgeVariant: Sendable {
    case outline
    case solid
    case accent
    case accentOutline
}

/// SwiftUI Status Badge. Set as written, because a status is a value, not a label. Capsule geometry.
public struct JudarnBadge: View {
    public let text: String
    public let variant: JudarnBadgeVariant
    
    @Environment(\.judarnAccent) private var accentColor
    
    public init(_ text: String, variant: JudarnBadgeVariant = .outline) {
        self.text = text
        self.variant = variant
    }
    
    public var body: some View {
        Text(text)
            .judarnLabel(casing: .asWritten)
            .padding(.horizontal, JudarnSpacing.space1)
            .padding(.vertical, JudarnSpacing.spaceHalf)
            .background(backgroundColors.bg, in: Capsule())
            .foregroundColor(backgroundColors.fg)
            .overlay(
                Capsule()
                    .strokeBorder(backgroundColors.border, lineWidth: JudarnSpacing.rule)
            )
            .clipShape(Capsule())
    }
    
    private var backgroundColors: (bg: Color, fg: Color, border: Color) {
        switch variant {
        case .outline:
            return (JudarnColors.surfaceElevated, JudarnColors.ink100, JudarnColors.ink100)
        case .solid:
            return (JudarnColors.ink100, JudarnColors.surfaceElevated, JudarnColors.ink100)
        case .accent:
            return (accentColor, accentColor.contrastingInk, accentColor)
        case .accentOutline:
            let accessibleAccent = accentColor.contrastingAccent(against: JudarnColors.surfaceElevated)
            return (JudarnColors.surfaceElevated, accessibleAccent, accessibleAccent)
        }
    }
}

// Tag vs. Badge Semantic Scale: Status badges use .judarnLabel (.footnote on iOS, .subheadline on macOS), while auxiliary keyword tags scale down to sentence-case .caption2, preserving a clear hierarchical rank.
/// SwiftUI Keyword Tag. Sentence case, smaller, capsule geometry.
public struct JudarnTag: View {
    public let text: String
    
    public init(_ text: String) {
        self.text = text
    }
    
    public var body: some View {
        Text(text)
            .modifier(JudarnTypographyModifier(textStyle: .caption2, weight: .medium, trackingEm: 0, leading: .standard, isUppercase: false, slot: .body))
            .padding(.horizontal, JudarnSpacing.space1)
            .padding(.vertical, JudarnSpacing.spaceHalf)
            .background(JudarnColors.surfaceElevated, in: Capsule())
            .foregroundColor(JudarnColors.ink100)
            .overlay(
                Capsule()
                    .strokeBorder(JudarnColors.ink30, lineWidth: JudarnSpacing.rule)
            )
            .clipShape(Capsule())
    }
}
