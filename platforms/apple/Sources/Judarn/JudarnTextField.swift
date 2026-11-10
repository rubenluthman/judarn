import SwiftUI

/// Judarn TextField component: a well set apart by fill alone, with an optional label and an accent focus ring.
///
/// The field fills with `surfaceRecessed`, or `substrate` inside a `JudarnCard` or any view that sets
/// `judarnOnElevatedSurface`. It draws no outline at rest; Increase Contrast adds an `ink100` outline.
/// The fill's low ratio is an accepted cost (DESIGN.md, Surface Hierarchy).
public struct JudarnTextField: View {
    public let label: String?
    public let placeholder: String
    @Binding public var text: String
    public let hint: String?
    public let isInvalid: Bool
    public let isMultiline: Bool
    /// Pass .asWritten for a label longer than two words or holding a digit, unit, or mixed-case term.
    public let labelCasing: JudarnTextCasing

    @FocusState private var isFocused: Bool
    @Environment(\.judarnAccent) private var accentColor
    @Environment(\.colorSchemeContrast) private var colorSchemeContrast
    @Environment(\.judarnOnElevatedSurface) private var isOnElevatedSurface
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    
    public init(
        label: String? = nil,
        placeholder: String = "",
        text: Binding<String>,
        hint: String? = nil,
        isInvalid: Bool = false,
        isMultiline: Bool = false,
        labelCasing: JudarnTextCasing = .uppercase
    ) {
        self.label = label
        self.placeholder = placeholder
        self._text = text
        self.hint = hint
        self.isInvalid = isInvalid
        self.isMultiline = isMultiline
        self.labelCasing = labelCasing
    }
    
    public var body: some View {
        VStack(alignment: .leading, spacing: JudarnSpacing.gapTight) {
            // Label
            if let label = label {
                Text(label)
                    .judarnLabel(casing: labelCasing)
                    .foregroundColor(JudarnColors.ink100)
                    .accessibilityHidden(true)
            }
            
            // Input Control
            Group {
                if isMultiline {
                    TextEditor(text: $text)
                        .scrollContentBackground(.hidden)
                        .frame(minHeight: JudarnSpacing.space12)
                        .padding(JudarnSpacing.space1)
                } else {
                    TextField(placeholder, text: $text)
                        .textFieldStyle(.plain)
                        .padding(.horizontal, JudarnSpacing.space2)
                        #if os(macOS)
                        .padding(.vertical, JudarnSpacing.spaceHalf)
                        #else
                        .padding(.vertical, JudarnSpacing.space1)
                        #endif
                        // Input Field Minimum Height: macOS desktop text fields natively stand 22pt high (snapped here to 24pt space3 on 8pt grid). iOS uses the 44pt minimum touch target from Apple's HIG.
                        #if os(iOS)
                        .frame(minHeight: JudarnSpacing.spaceTouch)
                        #elseif os(macOS)
                        .frame(minHeight: JudarnSpacing.space3)
                        #else
                        .frame(minHeight: JudarnSpacing.space4)
                        #endif
                }
            }
            .focused($isFocused)
            .judarnBody()
            // Form Input Accessibility Semantics: Form inputs must expose explicit accessible names and invalid state hints, while hiding duplicate sibling text elements to streamline VoiceOver navigation.
            .accessibilityLabel(Self.accessibilityLabel(label: label, placeholder: placeholder))
            .accessibilityValue(Self.accessibilityValue(text: text, isInvalid: isInvalid))
            .accessibilityHint(Self.accessibilityHint(hint: hint, isInvalid: isInvalid) ?? "")
            // Input Corner Curvature: macOS text fields use subtle 6pt continuous rounding; iOS inputs use 10pt continuous squircles.
            .background(
                Self.fill(isOnElevatedSurface: isOnElevatedSurface),
                in: RoundedRectangle(cornerRadius: fieldCornerRadius, style: .continuous)
            )
            .overlay(
                RoundedRectangle(cornerRadius: fieldCornerRadius, style: .continuous)
                    .strokeBorder(border.color, lineWidth: border.width)
            )
            // Outer Keyboard Focus Ring: macOS desktop text fields require a visible outer focus halo when active. Never clip the text field perimeter with .clipShape(); draw an outer accent ring with negative padding.
            .overlay(
                RoundedRectangle(cornerRadius: fieldCornerRadius + JudarnSpacing.ruleBold, style: .continuous)
                    .strokeBorder(focusRingColor, lineWidth: isFocused ? JudarnSpacing.ruleBold : 0)
                    .padding(-JudarnSpacing.spaceHalf / 2)
                    .opacity(isFocused ? 1.0 : 0.0)
            )
            // Reduce Motion Accessibility Trait: Skip transitions when Reduce Motion is active.
            .animation(reduceMotion ? nil : .linear(duration: 0.12), value: isFocused)
            
            // Hint/Error
            if let hint = hint {
                Text(hint)
                    .judarnSmall()
                    .foregroundColor(isInvalid ? JudarnColors.signalError : JudarnColors.ink60)
                    .accessibilityHidden(true)
            }
        }
    }
    
    // MARK: - Accessibility Semantics Helpers
    public static func accessibilityLabel(label: String?, placeholder: String) -> String {
        if let label = label, !label.isEmpty {
            return label
        }
        return placeholder.isEmpty ? "Text input" : placeholder
    }

    /// The spoken value: the field text, followed by the invalid state so it is announced with the value and not only through the hint.
    public static func accessibilityValue(text: String, isInvalid: Bool) -> String {
        guard isInvalid else { return text }
        return text.isEmpty ? "Invalid entry" : "\(text), invalid entry"
    }

    public static func accessibilityHint(hint: String?, isInvalid: Bool) -> String? {
        if isInvalid {
            if let hint = hint, !hint.isEmpty {
                return "Invalid entry. \(hint)"
            }
            return "Invalid entry"
        }
        return hint
    }
    
    // MARK: - Fill and Border

    /// The well fill: `substrate` inside an elevated surface, `surfaceRecessed` directly on the substrate.
    static func fill(isOnElevatedSurface: Bool) -> Color {
        isOnElevatedSurface ? JudarnColors.substrate : JudarnColors.surfaceRecessed
    }

    /// The surface around the field, which the focus ring must reach 3:1 against.
    static func surroundingSurface(isOnElevatedSurface: Bool) -> Color {
        isOnElevatedSurface ? JudarnColors.surfaceElevated : JudarnColors.substrate
    }

    /// The field's own border. None at rest; the invalid ring wins over focus, and Increase Contrast adds an `ink100` outline.
    static func border(
        isFocused: Bool,
        isInvalid: Bool,
        increasedContrast: Bool,
        focusColor: Color
    ) -> (color: Color, width: CGFloat) {
        if isInvalid {
            return (JudarnColors.signalError, JudarnSpacing.ruleBold)
        }
        if isFocused {
            return (focusColor, JudarnSpacing.ruleBold)
        }
        if increasedContrast {
            return (JudarnColors.ink100, JudarnSpacing.ruleBold)
        }
        return (.clear, 0)
    }

    /// The accent, clamped so the focus ring reaches 3:1 against the surface around the field.
    private var focusRingColor: Color {
        accentColor.contrastingAccent(
            against: Self.surroundingSurface(isOnElevatedSurface: isOnElevatedSurface),
            minRatio: 3.0
        )
    }

    private var border: (color: Color, width: CGFloat) {
        Self.border(
            isFocused: isFocused,
            isInvalid: isInvalid,
            increasedContrast: colorSchemeContrast == .increased,
            focusColor: focusRingColor
        )
    }

    private var fieldCornerRadius: CGFloat {
        #if os(macOS)
        return JudarnRadius.subtle
        #else
        return JudarnRadius.control
        #endif
    }
}

public extension EnvironmentValues {
    /// Whether the views below sit on an elevated surface, so a `JudarnTextField` fills with `substrate`
    /// instead of `surfaceRecessed`. `JudarnCard` sets it; set it on your own elevated containers.
    @Entry var judarnOnElevatedSurface: Bool = false
}
