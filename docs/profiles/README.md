# Project profiles

A profile records what one project always wants where it differs from Judarn's defaults, so the owner says it once. It names only what differs, and every rule it does not name still applies ([ADR-0003](../adr/0003-judarns-rules-are-the-owners-defaults.md)).

A profile lives here as `<project>.md`, in `kebab-case`, or in the project's own design record when the project keeps one. A profile depends on Judarn, and Judarn never depends on it: its choices never become Judarn defaults, tokens, or general rules.

## What a profile may set

Anything the owner chooses. Typical entries are accent colors, typefaces, a mark, and a substrate that replaces the white light-mode page.

## Format

```markdown
# <Project name>

- Accent colors: <hex values, and the role of each when it matters>
- Typefaces: <face for each role, for example headings and running text>
- Mark: <where the owner-supplied file lives>
- Substrate: <only when the owner asked to replace Judarn's>

## Overrides

- YYYY-MM-DD: <what the project uses> instead of Judarn's <default>.
```

Leave out any line the project does not change.

## Overrides

When work departs from a Judarn default at the owner's word, the agent says so once, in one line, and the owner approves or reverts it. An approved override goes in the profile's `Overrides` list and is never raised again in that project. Choices Judarn leaves open, such as which Wada combination to use, are not overrides.
