import SwiftUI

/// The Judarn text-field look as a view modifier, so any SwiftUI field (`TextField`, `SecureField`,
/// `TextEditor`) can take it. `JudarnTextField` draws its well through this modifier.
///
/// The well is set apart by fill alone: `surfaceRecessed`, or `substrate` when `judarnOnElevatedSurface` is set.
/// It draws no outline at rest. An invalid field gets a 2 pt `signalError` ring on its edge, and Increase Contrast
/// adds an `ink100` outline (dashed when the field is disabled). On macOS the focused field gets one 2 pt ring,
/// 2 pt outside the field: accent, or `signalError` when invalid. While the ring shows it is the field's only line,
/// so the edge outline is dropped. Other platforms draw no ring: the host's caret and keyboard show focus.
///
/// The modifier sets no font and no label; the caller keeps those.
public struct JudarnFieldWell: ViewModifier {
    private let isMultiline: Bool
    private let isInvalid: Bool
    private let externalFocus: FocusState<Bool>.Binding?

    @FocusState private var ownFocus: Bool
    @Environment(\.judarnAccent) private var accentColor
    @Environment(\.colorSchemeContrast) private var colorSchemeContrast
    @Environment(\.isEnabled) private var isEnabled
    @Environment(\.judarnOnElevatedSurface) private var isOnElevatedSurface
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    /// Creates a well that keeps its own focus state.
    public init(isMultiline: Bool = false, isInvalid: Bool = false) {
        self.isMultiline = isMultiline
        self.isInvalid = isInvalid
        self.externalFocus = nil
    }

    /// Creates a well that follows the caller's focus binding, so a view never carries two `.focused` bindings.
    public init(isMultiline: Bool = false, isInvalid: Bool = false, focused: FocusState<Bool>.Binding) {
        self.isMultiline = isMultiline
        self.isInvalid = isInvalid
        self.externalFocus = focused
    }

    public func body(content: Content) -> some View {
        let isFocused = externalFocus?.wrappedValue ?? ownFocus
        let styled = well(content, isFocused: isFocused)
        if let externalFocus {
            styled.focused(externalFocus)
        } else {
            styled.focused($ownFocus)
        }
    }

    private func well(_ content: Content, isFocused: Bool) -> some View {
        let radius = Self.cornerRadius
        let ringShows = Self.showsFocusRing && isFocused
        let border = Self.edge(
            isFocused: isFocused,
            isInvalid: isInvalid,
            increasedContrast: colorSchemeContrast == .increased,
            isEnabled: isEnabled
        )
        return Group {
            if isMultiline {
                content
                    .scrollContentBackground(.hidden)
                    .padding(JudarnSpacing.space1)
            } else {
                content
                    .textFieldStyle(.plain)
                    #if os(macOS)
                    .padding(.horizontal, JudarnSpacing.space1)
                    .padding(.vertical, JudarnSpacing.spaceHalf)
                    // Input Field Minimum Height: macOS desktop text fields natively stand 22pt high (snapped here to 24pt space3 on 8pt grid). iOS uses the 44pt minimum touch target from Apple's HIG.
                    .frame(minHeight: JudarnSpacing.space3)
                    #elseif os(iOS)
                    .padding(.horizontal, JudarnSpacing.space2)
                    .padding(.vertical, JudarnSpacing.space1)
                    .frame(minHeight: JudarnSpacing.spaceTouch)
                    #else
                    .padding(.horizontal, JudarnSpacing.space2)
                    .padding(.vertical, JudarnSpacing.space1)
                    .frame(minHeight: JudarnSpacing.space4)
                    #endif
            }
        }
        // Disabled text takes `ink30`, never reduced opacity.
        .foregroundColor(Self.textColor(isEnabled: isEnabled))
        // Input Corner Curvature: macOS text fields use subtle 6pt continuous rounding; iOS inputs use 10pt continuous squircles.
        .background(
            Self.fill(isOnElevatedSurface: isOnElevatedSurface),
            in: RoundedRectangle(cornerRadius: radius, style: .continuous)
        )
        .overlay(
            RoundedRectangle(cornerRadius: radius, style: .continuous)
                .strokeBorder(border.color, style: StrokeStyle(lineWidth: border.width, dash: border.dash))
        )
        // Outer Keyboard Focus Ring: macOS only, one 2pt ring 2pt outside the field, accent (clamped to 3:1) or `signalError` when invalid. While it shows it is the field's only line: the edge outline is dropped (see `edge`). Never clip the field perimeter with .clipShape(); draw the ring with negative padding. Other hosts draw their own focus cue (caret, keyboard).
        .overlay(
            RoundedRectangle(cornerRadius: radius + 2 * JudarnSpacing.ruleBold, style: .continuous)
                .strokeBorder(
                    Self.ringIsError(isInvalid: isInvalid) ? JudarnColors.signalError : focusRingColor,
                    lineWidth: ringShows ? JudarnSpacing.ruleBold : 0
                )
                .padding(-2 * JudarnSpacing.ruleBold)
                .opacity(ringShows ? 1 : 0)
        )
        // Reduce Motion Accessibility Trait: Skip transitions when Reduce Motion is active.
        .animation(reduceMotion ? nil : .linear(duration: 0.12), value: isFocused)
    }

    // MARK: - Fill, border and radius

    /// The well fill: `substrate` inside an elevated surface, `surfaceRecessed` directly on the substrate.
    static func fill(isOnElevatedSurface: Bool) -> Color {
        isOnElevatedSurface ? JudarnColors.substrate : JudarnColors.surfaceRecessed
    }

    /// The surface around the field, which the focus ring must reach 3:1 against.
    static func surroundingSurface(isOnElevatedSurface: Bool) -> Color {
        isOnElevatedSurface ? JudarnColors.surfaceElevated : JudarnColors.substrate
    }

    /// The text color: `nil` keeps the host's own ink while enabled, and a disabled field takes `ink30`.
    static func textColor(isEnabled: Bool) -> Color? {
        isEnabled ? nil : JudarnColors.ink30
    }

    /// The field's edge outline. None at rest and none for focus; the invalid ring is `signalError`, and Increase
    /// Contrast adds an `ink100` outline. Increase Contrast promotes `ink30` to `ink100`, so a disabled field's
    /// outline is dashed to tell it from an enabled one.
    static func border(
        isInvalid: Bool,
        increasedContrast: Bool,
        isEnabled: Bool = true
    ) -> (color: Color, width: CGFloat, dash: [CGFloat]) {
        if isInvalid {
            return (JudarnColors.signalError, JudarnSpacing.ruleBold, [])
        }
        if increasedContrast {
            let dash: [CGFloat] = isEnabled ? [] : [JudarnSpacing.spaceHalf, JudarnSpacing.spaceHalf]
            return (JudarnColors.ink100, JudarnSpacing.ruleBold, dash)
        }
        return (.clear, 0, [])
    }

    /// The edge outline the field draws. While the focus ring shows it is the field's only line, so the edge is
    /// clear; otherwise the edge follows `border`.
    static func edge(
        isFocused: Bool,
        isInvalid: Bool,
        increasedContrast: Bool,
        isEnabled: Bool = true,
        showsRing: Bool = showsFocusRing
    ) -> (color: Color, width: CGFloat, dash: [CGFloat]) {
        if showsRing && isFocused {
            return (.clear, 0, [])
        }
        return border(isInvalid: isInvalid, increasedContrast: increasedContrast, isEnabled: isEnabled)
    }

    /// Whether the focus ring is `signalError` (an invalid field) rather than the accent.
    static func ringIsError(isInvalid: Bool) -> Bool {
        isInvalid
    }

    /// 6 pt on macOS, 10 pt elsewhere, both continuous.
    static var cornerRadius: CGFloat {
        #if os(macOS)
        JudarnRadius.subtle
        #else
        JudarnRadius.control
        #endif
    }

    /// Whether Judarn draws a focus ring: only on macOS, where the host draws none on a plain field.
    static var showsFocusRing: Bool {
        #if os(macOS)
        true
        #else
        false
        #endif
    }

    /// The accent, clamped so the focus ring reaches 3:1 against the surface around the field.
    private var focusRingColor: Color {
        accentColor.contrastingAccent(
            against: Self.surroundingSurface(isOnElevatedSurface: isOnElevatedSurface),
            minRatio: 3.0
        )
    }
}

public extension View {
    /// Gives a `TextField`, `SecureField` or `TextEditor` the Judarn field look: fill, radius, padding, invalid
    /// and Increase Contrast outline, and on macOS the focus ring. Keeps its own focus state.
    func judarnFieldWell(isMultiline: Bool = false, isInvalid: Bool = false) -> some View {
        modifier(JudarnFieldWell(isMultiline: isMultiline, isInvalid: isInvalid))
    }

    /// The same look, following the caller's focus binding. Use it when the view already tracks focus,
    /// so it never carries two `.focused` bindings.
    func judarnFieldWell(isMultiline: Bool = false, isInvalid: Bool = false, focused: FocusState<Bool>.Binding) -> some View {
        modifier(JudarnFieldWell(isMultiline: isMultiline, isInvalid: isInvalid, focused: focused))
    }
}
