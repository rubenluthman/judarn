import SwiftUI

/// Judarn TextField component with hairline borders, optional label, and focus coloring.
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
                JudarnColors.surfaceElevated,
                in: RoundedRectangle(cornerRadius: fieldCornerRadius, style: .continuous)
            )
            .overlay(
                RoundedRectangle(cornerRadius: fieldCornerRadius, style: .continuous)
                    .strokeBorder(borderColor, lineWidth: borderWidth)
            )
            // Outer Keyboard Focus Ring: macOS desktop text fields require a visible outer focus halo when active. Never clip the text field perimeter with .clipShape(); draw an outer accent ring with negative padding.
            .overlay(
                RoundedRectangle(cornerRadius: fieldCornerRadius + JudarnSpacing.ruleBold, style: .continuous)
                    .strokeBorder(accentColor, lineWidth: isFocused ? JudarnSpacing.ruleBold : 0)
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
    
    private var borderColor: Color {
        if isInvalid {
            return JudarnColors.signalError
        }
        return isFocused ? accentColor : JudarnColors.ink100
    }
    
    private var borderWidth: CGFloat {
        if colorSchemeContrast == .increased {
            return JudarnSpacing.ruleBold
        }
        return (isFocused || isInvalid) ? JudarnSpacing.ruleBold : JudarnSpacing.rule
    }

    private var fieldCornerRadius: CGFloat {
        #if os(macOS)
        return JudarnRadius.subtle
        #else
        return JudarnRadius.control
        #endif
    }
}
