# ``Judarn``

Unified cross-platform design foundation for Apple Native platforms (iOS 17+ and macOS 14+) implementing calibrated dual-tier OKLCh color mathematics, spatial geometry, and accessible tabular matrices.

## Overview

Judarn sets color, spatial rhythm, and typography while respecting native platform conventions. Corner shapes, touch physics, and material blurs delegate to the host operating system.

### Key capabilities

- **Dual-Tier OKLCh Mathematics**: Perceptually uniform color tokens with separate standard and high-contrast values. Contrast ratios are audited per pairing with ``JudarnContrastVerifier``; the white-ink preference in `docs/DESIGN.md` accepts some pairings below WCAG minimums.
- **8/4 Spatial Rhythm**: Mathematical grid tokens establishing layout hierarchy without host-specific coupling.
- **Continuous Squircle Geometry**: Hardware-aligned continuous corner smoothing across cards, controls, and tags.
- **Accessible Data Matrices**: Tabular VoiceOver rotor navigation, coordinate hints, and baseline-preserving cell geometry.

## Topics

### Foundations
- ``JudarnColors``
- ``JudarnSpacing``
- ``JudarnRadius``
- ``JudarnTypographyStyle``
- ``JudarnTextCasing``
- ``JudarnFontSlot``
- ``JudarnTypographyModifier``
- ``JudarnFontConfig``

### Components
- ``JudarnButton``
- ``JudarnButtonStyle``
- ``JudarnButtonVariant``
- ``JudarnButtonSize``
- ``JudarnCard``
- ``JudarnDataMatrix``
- ``JudarnMatrixColumn``
- ``JudarnMatrixRow``
- ``JudarnTextField``
- ``JudarnBadge``
- ``JudarnBadgeVariant``
- ``JudarnTag``

### Accessibility & contrast engine
- ``JudarnContrastVerifier``
- ``JudarnContrastContext``
- ``JudarnWCAGLevel``
- ``JudarnAppearanceMode``
- ``JudarnContrastAuditResult``
