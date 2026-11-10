import SwiftUI

/// Judarn Card component. Content block with Apple continuous squircle curvature and optional glass hybrid background.
public struct JudarnCard<Content: View, Media: View, Actions: View>: View {
    public let eyebrow: String?
    public let title: String?
    public let content: Content
    public let media: Media?
    public let actions: Actions?
    public let isFlat: Bool
    public let useGlassBackground: Bool
    public let isCompact: Bool
    /// Pass .asWritten for an eyebrow longer than two words or holding a digit, unit, or mixed-case term.
    public let eyebrowCasing: JudarnTextCasing
    
    @Environment(\.judarnAccent) private var accentColor
    @Environment(\.accessibilityReduceTransparency) private var reduceTransparency
    @Environment(\.controlSize) private var controlSize
    
    public init(
        eyebrow: String? = nil,
        title: String? = nil,
        isFlat: Bool = false,
        useGlassBackground: Bool = false,
        isCompact: Bool = false,
        eyebrowCasing: JudarnTextCasing = .uppercase,
        @ViewBuilder media: () -> Media,
        @ViewBuilder actions: () -> Actions,
        @ViewBuilder content: () -> Content
    ) {
        self.eyebrow = eyebrow
        self.title = title
        self.useGlassBackground = useGlassBackground
        self.isFlat = isFlat
        self.isCompact = isCompact
        self.eyebrowCasing = eyebrowCasing
        self.media = media()
        self.actions = actions()
        self.content = content()
    }
    
    public var body: some View {
        VStack(alignment: .leading, spacing: JudarnSpacing.gapNormal) {
            // Media Frame (3:2 Aspect Ratio)
            if let media = media, !(Media.self == EmptyView.self) {
                media
                    .aspectRatio(3.0 / 2.0, contentMode: .fit)
                    .background(JudarnColors.bg2)
                    .clipShape(RoundedRectangle(cornerRadius: JudarnRadius.control, style: .continuous))
            }
            
            // Eyebrow
            if let eyebrow = eyebrow {
                Text(eyebrow)
                    .judarnLabel(casing: eyebrowCasing)
                    .foregroundColor(accentColor.contrastingAccent(against: JudarnColors.surfaceElevated))
            }
            
            // Title (H4)
            if let title = title {
                Text(title)
                    .judarnH4()
                    .foregroundColor(JudarnColors.ink100)
            }
            
            // Content body
            content
                .judarnBody()
            
            // Actions Row (horizontal stack)
            if let actions = actions, !(Actions.self == EmptyView.self) {
                HStack(spacing: JudarnSpacing.gapTight) {
                    actions
                }
            }
        }
        // Compact Desktop Card Insets: Compact desktop panes, sidebars (~260pt), and small control hierarchies adopt 16pt card padding (`JudarnSpacing.space2`), leaving sufficient typographic envelope for nested content. Standard cards adopt 24pt (`JudarnSpacing.space3`).
        .padding(isFlat ? 0 : (isCompact || controlSize == .small ? JudarnSpacing.space2 : JudarnSpacing.space3))
        .background(backgroundView)
        .modifier(CardClip(isFlat: isFlat))
        // Card Container Accessibility Semantics: Group composite content cards with `.accessibilityElement(children: .contain)` and an identifiable container label, preserving focus hierarchy for nested controls.
        .accessibilityElement(children: .contain)
        .accessibilityLabel(Self.accessibilityLabel(eyebrow: eyebrow, title: title) ?? "Card")
    }
    
    // MARK: - Accessibility Semantics Helpers
    public static func accessibilityLabel(eyebrow: String?, title: String?) -> String? {
        switch (eyebrow, title) {
        case let (.some(e), .some(t)):
            return "\(e), \(t)"
        case let (.none, .some(t)):
            return t
        case let (.some(e), .none):
            return e
        case (.none, .none):
            return nil
        }
    }
    
    // Reduce Transparency Accessibility Trait: Fall back from translucent materials to opaque surfaces when Reduce Transparency is active.
    @ViewBuilder
    private var backgroundView: some View {
        if isFlat {
            Color.clear
        } else if useGlassBackground && !reduceTransparency {
            Rectangle().fill(.ultraThinMaterial)
        } else {
            JudarnColors.surfaceElevated
        }
    }
}

/// Clips to the card squircle, except on a flat card: a flat card has no surface to round, and a clip would cut child focus halos.
private struct CardClip: ViewModifier {
    let isFlat: Bool

    func body(content: Content) -> some View {
        if isFlat {
            content
        } else {
            content.clipShape(RoundedRectangle(cornerRadius: JudarnRadius.card, style: .continuous))
        }
    }
}

// Convenience initializer when there is no media/actions
public extension JudarnCard where Media == EmptyView, Actions == EmptyView {
    init(
        eyebrow: String? = nil,
        title: String? = nil,
        isFlat: Bool = false,
        useGlassBackground: Bool = false,
        isCompact: Bool = false,
        eyebrowCasing: JudarnTextCasing = .uppercase,
        @ViewBuilder content: () -> Content
    ) {
        self.init(
            eyebrow: eyebrow,
            title: title,
            isFlat: isFlat,
            useGlassBackground: useGlassBackground,
            isCompact: isCompact,
            eyebrowCasing: eyebrowCasing,
            media: { EmptyView() },
            actions: { EmptyView() },
            content: content
        )
    }
}
