import Foundation
import Testing
@testable import Judarn

@Suite("Judarn web CSS variables")
struct WebCSSTests {
    private let css = JudarnWebCSS.variables

    /// The text of the first rule that opens with `selector`, up to its closing brace.
    private func block(_ selector: String) throws -> String {
        let start = try #require(css.range(of: selector + " {"))
        let end = try #require(css.range(of: "}", range: start.upperBound..<css.endIndex))
        return String(css[start.lowerBound..<end.upperBound])
    }

    @Test("Every scale token has a value in :root")
    func rootHasScaleTokens() throws {
        let root = try block(":root")
        let styles = ["display", "h1", "h2", "h3", "h4", "body-lg", "body", "small", "label", "micro", "data", "mono"]
        let names = [
            "space-half", "space-1", "space-2", "space-3", "space-4", "space-touch", "space-6", "space-8",
            "space-12", "space-16", "rule", "rule-bold", "rule-heavy", "measure-body", "measure-compact",
            "measure-sidebar", "radius-subtle", "radius-control", "radius-card", "radius-badge"
        ] + styles.flatMap { ["size-\($0)", "lh-\($0)"] }
        for name in names {
            #expect(root.contains("--jd-\(name): "), "missing --jd-\(name)")
        }
        #expect(root.contains("--jd-lh-body: 20px;"))
        #expect(root.contains("--jd-size-body: 16px;"))
    }

    @Test("Neutral colors exist in both schemes")
    func neutralsInBothSchemes() throws {
        let colors = ["substrate", "surface-elevated", "surface-recessed", "ink-100", "ink-60", "ink-30", "signal-error"]
        let light = try block(":root")
        let dark = try block(":root:not([data-theme=\"light\"])")
        for name in colors {
            #expect(light.contains("--jd-\(name): "), "light missing \(name)")
            #expect(dark.contains("--jd-\(name): "), "dark missing \(name)")
        }
    }

    @Test("Only variable-setting rules: no element or class selectors")
    func onlyVariableRules() {
        let allowed = [
            ":root", "[data-theme", "[data-contrast", ".palette-dark",
            "@media (prefers-color-scheme: dark)", "@media (prefers-contrast: more)"
        ]
        var depth = 0
        for line in css.split(separator: "\n") {
            let text = line.trimmingCharacters(in: .whitespaces)
            if text.hasSuffix("{") || text.hasSuffix(",") {
                #expect(allowed.contains { text.hasPrefix($0) }, "unexpected selector: \(text)")
                if text.hasSuffix("{") { depth += 1 }
            } else if text == "}" {
                depth -= 1
            } else {
                #expect(text.hasPrefix("--"), "non-variable declaration: \(text)")
            }
        }
        #expect(depth == 0)
    }
}
