# Judarn roadmap

## Active

- [ ] Next plan – Offentlig Sans as Judarn's default typeface: put `"Offentlig Sans"` first in the `font.sans` token, ship the web font with its OFL licence in the npm package (fetched from a pinned Offentlig release, as `pages.yml` does), and bundle it for Apple hosts. Every consumer's text changes, so the plan shows each host before and after and goes out through the consumer status gate.
- [ ] Wada explorer phone layout: the explorer has no phone rules, so at 375 px the page is about 470 px wide and the top tabs and size filters run off the screen.
- [ ] Consumer status: bring `scripts/consumers.js` into the shared roll-out in commit-checks once that exists, as the gate that stops before a visible update is committed.

## Icebox

### Wada explorer
- [ ] Bring the explorer's labels in line with Judarn's uppercase-label rule: uppercase only for labels of at most two words with no digit or mixed-case term; set others as written, for example "2 colors", "Saved Favorites 0", "CIE L*a*b*", "OKLCh (Judarn Native)", "Judarn Design System".

### Consumer status
- [ ] Count edits to component `README.md` files under `platforms/web/src` as none, not visible: they do not ship as interface.
- [ ] Date the `--page` review page in local time, not UTC, so a run after midnight shows the right day.

### Form controls and tokens
- [ ] Define semantic tokens for toggle/switch, segmented control, and slider inputs.
- [ ] Implement native SwiftUI and web component primitives for them that meet the 44pt touch floor.
- [ ] Formalize surface elevation progression (`substrate`, `surfaceElevated`, `surfaceOverlay`) with native platform materials.

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
- [ ] Swift Package Index DocC deployment and compatibility badge.

### Hardening
- [ ] Consumption audit across real downstream applications.
- [ ] Benchmark runtime OKLCh color conversions and contrast audits.
- [ ] API surface stability freeze and migration contract validation.

### Android (parked)
- [ ] Bring Android back from the private pre-release history, where the Compose components and the Kotlin emitter live. It needs a new ADR that restores the emitter, compiles and tests the output in `verify_commit.sh`, and fixes the weight mapping that maps 800 to `FontWeight.Bold` (ADR-0001).
