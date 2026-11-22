import SwiftUI

/// Judarn TextField component: a well set apart by fill alone, with an optional label and, on macOS, an accent focus ring.
/// The well itself is `judarnFieldWell(isMultiline:isInvalid:)`, which any SwiftUI field can use.
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
                        .frame(minHeight: JudarnSpacing.space12)
                } else {
                    TextField(placeholder, text: $text)
                }
            }
            .judarnBody()
            // Form Input Accessibility Semantics: Form inputs must expose explicit accessible names and invalid state hints, while hiding duplicate sibling text elements to streamline VoiceOver navigation.
            .accessibilityLabel(Self.accessibilityLabel(label: label, placeholder: placeholder))
            .accessibilityValue(Self.accessibilityValue(text: text, isInvalid: isInvalid))
            .accessibilityHint(Self.accessibilityHint(hint: hint, isInvalid: isInvalid) ?? "")
            // Fill, outline, radius, padding, focus ring and disabled ink all come from the shared modifier, so the field and any other field using it cannot drift.
            .judarnFieldWell(isMultiline: isMultiline, isInvalid: isInvalid)
            
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
    
    // MARK: - Fill and Border (forwarded to JudarnFieldWell)

    static func fill(isOnElevatedSurface: Bool) -> Color {
        JudarnFieldWell.fill(isOnElevatedSurface: isOnElevatedSurface)
    }

    static func surroundingSurface(isOnElevatedSurface: Bool) -> Color {
        JudarnFieldWell.surroundingSurface(isOnElevatedSurface: isOnElevatedSurface)
    }

    static func textColor(isEnabled: Bool) -> Color? {
        JudarnFieldWell.textColor(isEnabled: isEnabled)
    }

    static func border(
        isInvalid: Bool,
        increasedContrast: Bool,
        isEnabled: Bool = true
    ) -> (color: Color, width: CGFloat, dash: [CGFloat]) {
        JudarnFieldWell.border(isInvalid: isInvalid, increasedContrast: increasedContrast, isEnabled: isEnabled)
    }

    static var cornerRadius: CGFloat { JudarnFieldWell.cornerRadius }
}

public extension EnvironmentValues {
    /// Whether the views below sit on an elevated surface, so a `JudarnTextField` fills with `substrate`
    /// instead of `surfaceRecessed`. `JudarnCard` sets it; set it on your own elevated containers.
    @Entry var judarnOnElevatedSurface: Bool = false
    /// Whether the views below sit inside a `JudarnCard`, flat or not, so a `JudarnTextList` takes the compact
    /// measure like web's `.jd-card .jd-list`. `JudarnCard` sets it.
    @Entry var judarnInCard: Bool = false
}
