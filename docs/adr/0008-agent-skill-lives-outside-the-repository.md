# Agent Skill Lives Outside the Repository
Status: Active · 2026-10-31

## Decision

The `judarn` agent skill lives in the owner's shared agent configuration, outside this repository, as a short pointer to `docs/DESIGN.md` and `tokens/judarn-tokens.json`.

- Nothing in this repository creates, changes, or deletes files in an agent's global configuration.
- The skill embeds no token values and no version number, so a token change or release never needs a skill change.
- Moving or renaming `docs/DESIGN.md` or `tokens/judarn-tokens.json` needs a matching update to the skill, in a session in the shared configuration repository.

## Why

`scripts/sync-skill.js` used to generate the skill from this repository, which broke the owner's rule that an application repository never writes global agent configuration. It also forced a write on every version bump and served only one agent. A pointer has nothing to drift.

## What we gave up

- **A check that the skill exists and works.** If it breaks, nothing here notices. The audits in the shared configuration repository cover it.
- **Generated accuracy.** The skill's short summary of the rules is hand-written and can fall behind `docs/DESIGN.md`.

## Revisit if

Agents stop reading shared skills, or the shared configuration repository gains a way to verify the pointer automatically.
