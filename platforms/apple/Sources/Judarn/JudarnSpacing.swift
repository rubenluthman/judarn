import CoreGraphics

/// Strict 8pt base grid and spatial rules for the Judarn design system.
/// Generated from tokens/judarn-tokens.json  –  do not edit directly.
public enum JudarnSpacing {
    /// 4pt micro spacing / hairline offset / typographic leading sub-step
    public static let spaceHalf: CGFloat = 4
    /// 8pt tight spacing / gap (macro base unit)
    public static let space1: CGFloat = 8
    /// 16pt standard padding / gap
    public static let space2: CGFloat = 16
    /// 24pt medium frame padding
    public static let space3: CGFloat = 24
    /// 32pt large frame padding
    public static let space4: CGFloat = 32
    /// 44pt touch target floor from Apple's HIG (11 * 4pt)
    public static let spaceTouch: CGFloat = 44
    /// 48pt extra large spacing
    public static let space6: CGFloat = 48
    /// 64pt layout section spacing
    public static let space8: CGFloat = 64
    /// 96pt display header spacing
    public static let space12: CGFloat = 96
    /// 128pt extreme layout spacing
    public static let space16: CGFloat = 128
    
    // Semantic aliases
    public static let padDefault: CGFloat = 16
    public static let padLarge: CGFloat = 32
    public static let gapTight: CGFloat = 8
    public static let gapNormal: CGFloat = 16
    
    // Border weights
    public static let rule: CGFloat = 1
    public static let ruleBold: CGFloat = 2
    public static let ruleHeavy: CGFloat = 4
    
    // Typographic reading measures
    /// 640pt maximum column measure for continuous body reading (~65ch)
    public static let measureBody: CGFloat = 640
    /// 440pt compact column measure for cards and sidebars (~45ch)
    public static let measureCompact: CGFloat = 440
    /// 260pt compact desktop pane and sidebar column measure
    public static let measureSidebar: CGFloat = 260
}

/// Host platform corner radius tokens for Apple Native environments.
/// Generated from tokens/judarn-tokens.json  –  do not edit directly.
public enum JudarnRadius {
    /// 6pt subtle rounding for micro elements
    public static let subtle: CGFloat = 6
    /// 10pt continuous corner radius for functional interactive controls, text fields, and buttons
    public static let control: CGFloat = 10
    /// 16pt continuous corner radius for content cards, grouping tiles, and sheets
    public static let card: CGFloat = 16
    /// 9999pt full pill shape for badges, tags, and status chips
    public static let badge: CGFloat = 9999
}
