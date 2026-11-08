import SwiftUI

/// Column definition for `JudarnDataMatrix`.
public struct JudarnMatrixColumn: Identifiable, Sendable {
    public let id: String
    public let title: String
    public let isNumeric: Bool
    public let width: CGFloat?
    /// Pass .asWritten for a header holding a unit symbol or mixed-case term, such as kg or e1RM (ADR-0009).
    public let casing: JudarnTextCasing

    public init(id: String, title: String, isNumeric: Bool = false, width: CGFloat? = nil, casing: JudarnTextCasing = .uppercase) {
        self.id = id
        self.title = title
        self.isNumeric = isNumeric
        self.width = width
        self.casing = casing
    }
}

/// Row definition for `JudarnDataMatrix`.
public struct JudarnMatrixRow: Identifiable, Sendable {
    public let id: String
    public let cells: [String: String]
    
    public init(id: String, cells: [String: String]) {
        self.id = id
        self.cells = cells
    }
}

/// Data Matrix component with continuous 1px hairline grid rules and tabular numeric figures.
public struct JudarnDataMatrix: View {
    public let columns: [JudarnMatrixColumn]
    public let rows: [JudarnMatrixRow]
    
    @Environment(\.colorSchemeContrast) private var colorSchemeContrast

    /// Per-instance prefix so two matrices on one screen never share view or rotor ids.
    @State private var instanceID = UUID().uuidString
    private var rootID: String { "\(instanceID)_root" }
    
    private var dividerRule: CGFloat {
        colorSchemeContrast == .increased ? JudarnSpacing.ruleBold : JudarnSpacing.rule
    }
    
    public init(columns: [JudarnMatrixColumn], rows: [JudarnMatrixRow]) {
        self.columns = columns
        self.rows = rows
    }
    
    /// Preserves font baseline and line height for empty cells using a zero-width space glyph.
    private func resolvedText(_ value: String?) -> String {
        guard let value, !value.isEmpty else {
            return "\u{200B}"
        }
        return value
    }
    
    // MARK: - Accessibility Semantics Helpers
    
    /// Formats the accessibility label for the overall data matrix container.
    static func tableAccessibilityLabel(columnsCount: Int, rowsCount: Int) -> String {
        "Data Matrix, \(columnsCount) columns, \(rowsCount) rows"
    }
    
    /// Formats the accessibility label for a column header cell.
    static func headerAccessibilityLabel(column: JudarnMatrixColumn) -> String {
        column.title
    }
    
    /// Formats the accessibility hint for a column header cell, conveying its horizontal index.
    static func headerAccessibilityHint(columnIndex: Int, totalColumns: Int) -> String {
        "Column \(columnIndex + 1) of \(totalColumns)"
    }
    
    /// Formats the accessibility label for a row container.
    static func rowAccessibilityLabel(rowIndex: Int, totalRows: Int) -> String {
        "Row \(rowIndex + 1) of \(totalRows)"
    }
    
    /// Formats the accessibility label for a data cell (the column title context).
    static func cellAccessibilityLabel(column: JudarnMatrixColumn) -> String {
        column.title
    }
    
    /// Formats the spoken accessibility value for a cell, converting nil or empty strings to "Empty" rather than reading baseline whitespace glyphs.
    static func cellAccessibilityValue(_ rawValue: String?) -> String {
        guard let rawValue, !rawValue.isEmpty else {
            return "Empty"
        }
        return rawValue
    }
    
    /// Formats the coordinate hint for a cell, conveying both row and column positions.
    static func cellAccessibilityHint(rowIndex: Int, totalRows: Int, columnIndex: Int, totalColumns: Int) -> String {
        "Row \(rowIndex + 1) of \(totalRows), Column \(columnIndex + 1) of \(totalColumns)"
    }
    
    // Table Cell Insets: macOS Table and NSTableView cell insets use 8pt horizontal padding (space1) to preserve data grid density on desktop split views. iOS touch tables require 16pt (space2).
    private var cellHorizontalPadding: CGFloat {
        #if os(macOS)
        return JudarnSpacing.space1
        #else
        return JudarnSpacing.space2
        #endif
    }
    
    public var body: some View {
        VStack(spacing: 0) {
            // Header Row
            HStack(spacing: 0) {
                ForEach(Array(columns.enumerated()), id: \.element.id) { index, col in
                    Text(resolvedText(col.title))
                        .judarnLabel(casing: col.casing)
                        .foregroundColor(JudarnColors.ink100)
                        .frame(
                            minWidth: col.width,
                            maxWidth: col.width ?? .infinity,
                            alignment: col.isNumeric ? .trailing : .leading
                        )
                        .padding(.horizontal, cellHorizontalPadding)
                        .padding(.vertical, JudarnSpacing.space1)
                        .id("\(instanceID)_header_\(col.id)")
                        .accessibilityElement(children: .ignore)
                        .accessibilityAddTraits(.isHeader)
                        .accessibilityLabel(Self.headerAccessibilityLabel(column: col))
                        .accessibilityHint(Self.headerAccessibilityHint(columnIndex: index, totalColumns: columns.count))
                    
                    if index < columns.count - 1 {
                        Rectangle()
                            .fill(JudarnColors.ink100)
                            .frame(width: dividerRule)
                            .accessibilityHidden(true)
                    }
                }
            }
            .background(JudarnColors.surfaceElevated)
            .accessibilityElement(children: .contain)
            .accessibilityLabel("Header Row, \(columns.count) columns")
            
            // Header bottom border (2px bold rule)
            Rectangle()
                .fill(JudarnColors.ink100)
                .frame(height: JudarnSpacing.ruleBold)
                .accessibilityHidden(true)
            
            // Data Rows
            ForEach(Array(rows.enumerated()), id: \.element.id) { rowIndex, row in
                HStack(spacing: 0) {
                    ForEach(Array(columns.enumerated()), id: \.element.id) { colIndex, col in
                        let rawValue = row.cells[col.id]
                        Text(resolvedText(rawValue))
                            .judarnData()
                            .frame(
                                minWidth: col.width,
                                maxWidth: col.width ?? .infinity,
                                alignment: col.isNumeric ? .trailing : .leading
                            )
                            .padding(.horizontal, cellHorizontalPadding)
                            .padding(.vertical, JudarnSpacing.space1)
                            .foregroundColor(JudarnColors.ink100)
                            .id("\(instanceID)_cell_\(row.id)_\(col.id)")
                            .accessibilityElement(children: .ignore)
                            .accessibilityLabel(Self.cellAccessibilityLabel(column: col))
                            .accessibilityValue(Self.cellAccessibilityValue(rawValue))
                            .accessibilityHint(Self.cellAccessibilityHint(rowIndex: rowIndex, totalRows: rows.count, columnIndex: colIndex, totalColumns: columns.count))
                        
                        if colIndex < columns.count - 1 {
                            Rectangle()
                                .fill(JudarnColors.ink30)
                                .frame(width: dividerRule)
                                .accessibilityHidden(true)
                        }
                    }
                }
                .background(JudarnColors.surfaceElevated)
                .id("\(instanceID)_row_\(row.id)")
                .accessibilityElement(children: .contain)
                .accessibilityLabel(Self.rowAccessibilityLabel(rowIndex: rowIndex, totalRows: rows.count))
                
                if rowIndex < rows.count - 1 {
                    Rectangle()
                        .fill(JudarnColors.ink30)
                        .frame(height: dividerRule)
                        .accessibilityHidden(true)
                }
            }
        }
        .id(rootID)
        .accessibilityElement(children: .contain)
        .accessibilityLabel(Self.tableAccessibilityLabel(columnsCount: columns.count, rowsCount: rows.count))
        .accessibilityRotor(.tables) {
            AccessibilityRotorEntry("Data Matrix", id: rootID)
        }
        .accessibilityRotor(.landmarks) {
            AccessibilityRotorEntry("Data Matrix", id: rootID)
        }
        .accessibilityRotor("Columns") {
            ForEach(columns) { col in
                AccessibilityRotorEntry(col.title, id: "\(instanceID)_header_\(col.id)")
            }
        }
        .accessibilityRotor("Rows") {
            ForEach(Array(rows.enumerated()), id: \.element.id) { index, row in
                AccessibilityRotorEntry("Row \(index + 1)", id: "\(instanceID)_row_\(row.id)")
            }
        }
    }
}
