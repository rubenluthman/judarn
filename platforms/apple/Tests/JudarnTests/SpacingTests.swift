import Testing
@testable import Judarn

@Suite("Judarn Spacing & Geometry")
struct SpacingTests {
    @Test("Spatial rhythm scale constants")
    func spacingConstants() {
        #expect(JudarnSpacing.spaceHalf == 4)
        #expect(JudarnSpacing.space1 == 8)
        #expect(JudarnSpacing.space2 == 16)
        #expect(JudarnSpacing.space3 == 24)
        #expect(JudarnSpacing.space4 == 32)
        #expect(JudarnSpacing.spaceTouch == 44)
        #expect(JudarnSpacing.space6 == 48)
        #expect(JudarnSpacing.rule == 1)
        #expect(JudarnSpacing.ruleBold == 2)
    }

    @Test("Corner radius constants")
    func radiusConstants() {
        #expect(JudarnRadius.subtle == 6)
        #expect(JudarnRadius.control == 10)
        #expect(JudarnRadius.card == 16)
        #expect(JudarnRadius.badge == 9999)
    }

    @Test("Reading measure line lengths")
    func readingMeasures() {
        #expect(JudarnSpacing.measureBody == 640)
        #expect(JudarnSpacing.measureCompact == 440)
        #expect(JudarnSpacing.measureSidebar == 260)
    }
}
