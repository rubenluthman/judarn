# Judarn roadmap

## Active

## Icebox

### Form controls and tokens
- [ ] Define semantic tokens for toggle/switch, segmented control, slider, and text field inputs.
- [ ] Implement native SwiftUI and web component primitives that meet the 44pt touch floor.
- [ ] Formalize surface elevation progression (`substrate`, `surfaceElevated`, `surfaceOverlay`) with native platform materials.

### Brand and assets
- [ ] Design the official Judarn mark and emblem.
- [ ] Generate vector SVG and multi-resolution PNG assets for SPI, documentation, and package manifests.

### Platforms
- [ ] Localize the Apple components' built-in strings (text-field accessibility values and hints).
- [ ] Audit watchOS and tvOS availability and manifest support in `Package.swift`.
- [ ] Calibrate compact watch density and tvOS 10-foot typography.
- [ ] Linux Swift toolchain support and headless verification.
- [ ] Windows App SDK / WinUI token generator.
- [ ] Figma Token Bridge / Tokens Studio bidirectional sync.

### Typography and layout
- [ ] Fluid typography scaling across Apple (Dynamic Type bridges), and web (`clamp()` scales).
- [ ] Container-query-driven spatial rhythm tokens for responsive embeddings.

### Distribution
- [ ] Automated npm publishing for `@judarn/ui` with provenance attestations.
- [ ] Swift Package Index DocC deployment and compatibility badge.

### Hardening
- [ ] Consumption audit across real downstream applications.
- [ ] Benchmark runtime OKLCh color conversions and contrast audits.
- [ ] API surface stability freeze and migration contract validation.

### Android (parked)
- [ ] Bring Android back from the owner's offline Git bundle of the pre-release history, where the Compose components and the Kotlin emitter live. It needs a new ADR that restores the emitter, compiles and tests the output in `verify_commit.sh`, and fixes the weight mapping that maps 800 to `FontWeight.Bold` (ADR-0001).
