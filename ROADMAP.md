# Judarn roadmap

## Active

## Icebox

- Decide whether Offentlig Sans should become the `font.sans` default for web. Wait until the owner says Offentlig is finished and no longer updated. Then compare the projects that use Judarn, set in their current font and in Offentlig Sans, before any token change. A switch ships the token, an `@font-face` snippet and the rewritten artifact rule together; native Apple and the cloud document templates stay as they are.
- Bring the explorer's labels in line with Judarn's uppercase-label rule: uppercase only for labels of at most two words with no digit or mixed-case term; set others as written, for example "2 colors", "Saved Favorites 0", "CIE L*a*b*", "OKLCh (Judarn Native)", "Judarn Design System".
- Add a shared search-field style: two apps that use Judarn hand-build capsule search wells.
- Define semantic tokens for toggle/switch, segmented control, and slider inputs.
- Implement native SwiftUI and web component primitives for them that meet the 44pt touch floor.
- Formalize surface elevation progression (`substrate`, `surfaceElevated`, `surfaceOverlay`) with native platform materials.
- Localize the Apple components' built-in strings (text-field accessibility values and hints).
- Audit watchOS and tvOS availability and manifest support in `Package.swift`.
- Calibrate compact watch density and tvOS 10-foot typography.
- Linux Swift toolchain support and headless verification.
- Windows App SDK / WinUI token generator.
- Figma Token Bridge / Tokens Studio bidirectional sync.
- Fluid typography scaling across Apple (Dynamic Type bridges), and web (`clamp()` scales).
- Container-query-driven spatial rhythm tokens for responsive embeddings.
- Swift Package Index DocC deployment and compatibility badge.
- Consumption audit across real downstream applications.
- Benchmark runtime OKLCh color conversions and contrast audits.
- API surface stability freeze and migration contract validation.
- Bring Android back from the private pre-release history, where the Compose components and the Kotlin emitter live. It needs a new ADR that restores the emitter, compiles and tests the output in `verify_commit.sh`, and fixes the weight mapping that maps 800 to `FontWeight.Bold` (ADR-0001).
