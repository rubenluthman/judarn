import SwiftUI

/// Bullets for items of text, or numbers when their order matters (DESIGN.md, Lists).
public enum JudarnTextListStyle: Sendable, Equatable {
    case bulleted
    /// Numbered from `start`, so a list can continue after other content.
    case numbered(start: Int = 1)
}

/// Items of text – facts, steps, conditions – with a marker in secondary ink and a hanging indent.
///
/// Rows of links, data, or controls take no markers: use the system's `List` or `Form`, whose separators
/// and insets belong to the host. This view takes one level; nest on web only.
public struct JudarnTextList: View {
    public let items: [String]
    public let style: JudarnTextListStyle

    // The marker column scales with Dynamic Type, so wrapped lines keep hanging under the text.
    // Column plus the space1 gutter equals the indent: space3 for bullets, space4 for numbers.
    @ScaledMetric(relativeTo: .body) private var bulletColumn: CGFloat = JudarnTextList.bulletColumnWidth
    @ScaledMetric(relativeTo: .body) private var numberColumn: CGFloat = JudarnTextList.numberColumnWidth

    static let bulletColumnWidth: CGFloat = JudarnSpacing.space3 - JudarnSpacing.space1
    static let numberColumnWidth: CGFloat = JudarnSpacing.space4 - JudarnSpacing.space1
    static let itemSpacing: CGFloat = JudarnSpacing.space1
    static let markerColor: Color = JudarnColors.ink60

    public init(_ items: [String], style: JudarnTextListStyle = .bulleted) {
        self.items = items
        self.style = style
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: Self.itemSpacing) {
            ForEach(Array(items.enumerated()), id: \.offset) { index, item in
                HStack(alignment: .firstTextBaseline, spacing: JudarnSpacing.space1) {
                    Text(Self.marker(at: index, style: style))
                        .judarnBody()
                        .monospacedDigit()
                        .foregroundColor(Self.markerColor)
                        .frame(width: style == .bulleted ? bulletColumn : numberColumn, alignment: .trailing)
                        .accessibilityHidden(style == .bulleted)
                    Text(item)
                        .judarnBody()
                        .fixedSize(horizontal: false, vertical: true)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }
                .accessibilityElement(children: .combine)
            }
        }
        .frame(maxWidth: JudarnSpacing.measureBody, alignment: .leading)
    }

    static func marker(at index: Int, style: JudarnTextListStyle) -> String {
        switch style {
        case .bulleted: "•"
        case .numbered(let start): "\(start + index)."
        }
    }
}
