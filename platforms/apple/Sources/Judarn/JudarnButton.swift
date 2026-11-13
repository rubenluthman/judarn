import SwiftUI

public enum JudarnButtonVariant: Sendable {
    case primary
    case secondary
    case ghost
    case accent
}

public enum JudarnButtonSize: Sendable {
    case sm
    case md
    case lg
}

/// SwiftUI ButtonStyle conforming to the Judarn interaction model.
/// Flat solid fill, continuous squircle corners, color inversion on hover. Set apart by fill alone
/// (DESIGN.md, Surface Hierarchy): no stroke at rest, an `ink100` outline in Increase Contrast.
public struct JudarnButtonStyle: ButtonStyle {
    public let variant: JudarnButtonVariant
    public let size: JudarnButtonSize
    public let explicitHovered: Bool?
    
    public init(variant: JudarnButtonVariant = .primary, size: JudarnButtonSize = .md, isHovered: Bool? = nil) {
        self.variant = variant
        self.size = size
        self.explicitHovered = isHovered
    }
    
    public func makeBody(configuration: Configuration) -> some View {
        JudarnButtonContent(
            configuration: configuration,
            variant: variant,
            size: size,
            explicitHovered: explicitHovered
        )
    }
}

struct JudarnButtonContent: View {
    let configuration: ButtonStyle.Configuration
    let variant: JudarnButtonVariant
    let size: JudarnButtonSize
    let explicitHovered: Bool?
    
    @State private var isHovered = false
    @Environment(\.judarnAccent) private var accentColor
    @Environment(\.isEnabled) private var isEnabled
    @Environment(\.isFocused) private var isFocused
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.judarnOnElevatedSurface) private var isOnElevatedSurface
    @Environment(\.colorSchemeContrast) private var colorSchemeContrast
    
    private var activeHover: Bool {
        explicitHovered ?? isHovered
    }
    
    var body: some View {
        let isPressed = configuration.isPressed
        let colors = Self.resolveColors(
            variant: variant,
            accentColor: accentColor,
            isPressed: isPressed,
            isEnabled: isEnabled,
            isHovered: activeHover,
            isOnElevatedSurface: isOnElevatedSurface
        )
        let border = Self.border(variant: variant, increasedContrast: colorSchemeContrast == .increased)
        // Control Corner Curvature: macOS controls use subtle 6pt rounding; iOS controls use 10pt continuous squircles.
        #if os(macOS)
        let cornerRadius = JudarnRadius.subtle
        #else
        let cornerRadius = JudarnRadius.control
        #endif
        let shape = RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
        
        return configuration.label
            .judarnButtonText(size: size)
            .judarnButtonPadding(size: size)
            .background(colors.background, in: shape)
            .foregroundColor(colors.foreground)
            .overlay(
                shape.strokeBorder(border.color, lineWidth: border.width)
            )
            .overlay(
                VStack {
                    Spacer()
                    if variant == .ghost && activeHover && isEnabled {
                        Rectangle()
                            .fill(colors.foreground)
                            .frame(height: JudarnSpacing.ruleBold)
                    }
                }
                .clipShape(shape)
            )
            // Keyboard Focus Indicator & Focus Ring Clip Isolation: macOS Full Keyboard Access and keyboard navigation require focus rings to draw outside the control boundary. Never clip the outer button container with .clipShape(); isolate clipping to internal decorative overlays. When focused, provide an accessible outer focus ring conforming to HIG standards.
            .overlay(
                RoundedRectangle(cornerRadius: cornerRadius + JudarnSpacing.ruleBold, style: .continuous)
                    .strokeBorder(accentColor, lineWidth: isFocused ? JudarnSpacing.ruleBold : 0)
                    .padding(-JudarnSpacing.spaceHalf / 2)
                    .opacity(isFocused ? 1.0 : 0.0)
            )
            .opacity(isPressed ? 0.85 : (isEnabled ? 1.0 : 0.6))
            // Touch Target Floor: Apple's HIG sets a 44pt minimum touch target on iOS. On macOS, pointer precision allows compact heights.
            #if os(iOS)
            // Expand transparent layout bounding box to the 44pt touch floor without inflating visual box
            .frame(minHeight: JudarnSpacing.spaceTouch)
            .contentShape(shape)
            #endif
            #if os(macOS) || os(iOS)
            .onHover { hovering in
                self.isHovered = hovering
            }
            #endif
            // Reduce Motion Accessibility Trait: Skip decorative transitions when Reduce Motion is active.
            .animation(reduceMotion ? nil : .linear(duration: 0.12), value: activeHover)
            .animation(reduceMotion ? nil : .linear(duration: 0.12), value: isPressed)
            .animation(reduceMotion ? nil : .linear(duration: 0.12), value: isFocused)
    }
    
    /// The button's colors. A secondary or disabled button is a well like a text field: `surfaceRecessed`
    /// on the substrate, `substrate` on an elevated surface. Hover inverts the fill; press is flat `ink60`.
    static func resolveColors(
        variant: JudarnButtonVariant,
        accentColor: Color,
        isPressed: Bool,
        isEnabled: Bool,
        isHovered: Bool,
        isOnElevatedSurface: Bool = false
    ) -> (background: Color, foreground: Color) {
        let well = JudarnTextField.fill(isOnElevatedSurface: isOnElevatedSurface)
        if !isEnabled {
            return (well, JudarnColors.ink30)
        }
        
        if isPressed {
            return (JudarnColors.ink60, JudarnColors.substrate)
        }
        
        switch variant {
        case .primary:
            return isHovered ? (JudarnColors.surfaceRecessed, JudarnColors.ink100) : (JudarnColors.ink100, JudarnColors.substrate)
        case .secondary:
            return isHovered ? (JudarnColors.ink100, JudarnColors.substrate) : (well, JudarnColors.ink100)
        case .ghost:
            return (Color.clear, JudarnColors.ink100)
        case .accent:
            if isHovered {
                return (JudarnColors.surfaceRecessed, accentColor.contrastingAccent(against: JudarnColors.surfaceRecessed))
            }
            return (accentColor, accentColor.contrastingInk)
        }
    }

    /// No stroke at rest; Increase Contrast adds an `ink100` outline. The ghost button stays text with its hover underline.
    static func border(variant: JudarnButtonVariant, increasedContrast: Bool) -> (color: Color, width: CGFloat) {
        variant == .ghost ? (.clear, 0) : judarnControlOutlineStyle(increasedContrast: increasedContrast)
    }
}

fileprivate extension View {
    @ViewBuilder
    func judarnButtonText(size: JudarnButtonSize) -> some View {
        switch size {
        case .sm:
            self.judarnSmall()
        case .md:
            self.judarnBody()
        case .lg:
            self.judarnBodyLg()
        }
    }

    // Desktop vs. Touch Button Padding: Native macOS push buttons have heights of 20–22pt (sm) and 28pt (md/prominent). iOS touch targets require wider vertical padding combined with the 44pt touch floor.
    func judarnButtonPadding(size: JudarnButtonSize) -> some View {
        #if os(macOS)
        switch size {
        case .sm:
            return self.padding(.horizontal, JudarnSpacing.space2).padding(.vertical, JudarnSpacing.spaceHalf)
        case .md:
            return self.padding(.horizontal, JudarnSpacing.space2).padding(.vertical, JudarnSpacing.space1)
        case .lg:
            return self.padding(.horizontal, JudarnSpacing.space3).padding(.vertical, JudarnSpacing.space2)
        }
        #else
        switch size {
        case .sm:
            return self.padding(.horizontal, JudarnSpacing.space2).padding(.vertical, JudarnSpacing.space1)
        case .md:
            return self.padding(.horizontal, JudarnSpacing.space3).padding(.vertical, JudarnSpacing.space2)
        case .lg:
            return self.padding(.horizontal, JudarnSpacing.space4).padding(.vertical, JudarnSpacing.space3)
        }
        #endif
    }
}

public extension ButtonStyle where Self == JudarnButtonStyle {
    static var judarnPrimary: JudarnButtonStyle { JudarnButtonStyle(variant: .primary) }
    static var judarnSecondary: JudarnButtonStyle { JudarnButtonStyle(variant: .secondary) }
    static var judarnGhost: JudarnButtonStyle { JudarnButtonStyle(variant: .ghost) }
    static var judarnAccent: JudarnButtonStyle { JudarnButtonStyle(variant: .accent) }
}

/// Standardized Judarn Button.
public struct JudarnButton<Content: View>: View {
    private let variant: JudarnButtonVariant
    private let size: JudarnButtonSize
    private let action: () -> Void
    private let content: Content
    
    public init(
        variant: JudarnButtonVariant = .primary,
        size: JudarnButtonSize = .md,
        action: @escaping () -> Void,
        @ViewBuilder content: () -> Content
    ) {
        self.variant = variant
        self.size = size
        self.action = action
        self.content = content()
    }
    
    public var body: some View {
        Button(action: action) {
            content
        }
        .buttonStyle(JudarnButtonStyle(variant: variant, size: size))
    }
}
