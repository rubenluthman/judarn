---
status: accepted
date: 2026-10-31
deciders: Ruben Luthman
tags: [agents, skills, tooling, boundaries]
---

# Agent Skill Lives Outside the Repository

## Context and Problem Statement

`scripts/sync-skill.js` generated a file in an agent's global skills folder from the tokens and the current version, and `scripts/verify_commit.sh` failed whenever that file drifted. An application repository was therefore writing global agent configuration, which the owner's global rules forbid. Every version bump also required that write, and the generated file duplicated token values that `DESIGN.md` already publishes.

Shared agent skills now live in the owner's shared agent configuration, outside this repository, as the source of truth across coding agents, and the Judarn skill there is a short pointer to `docs/DESIGN.md` and `tokens/judarn-tokens.json`.

Which side owns the agent skill, and what does Judarn still promise to agents?

## Decision Drivers

- Application repositories never write global agent configuration.
- Version bumps and token changes should not require touching a file outside this repository.
- Token values should exist in one published specification.
- Every agent should read the same contract.

## Considered Options

- **Option 1: Skill owned by the shared config repository, pointing to `docs/DESIGN.md`.**
- **Option 2: Keep generating the skill from this repository.**
- **Option 3: Move the skill into this repository.**

## Decision Outcome

Chosen option: **Option 1**, because a pointer has nothing to drift, and it leaves global configuration with the repository that governs it.

`scripts/sync-skill.js` and the parity step in `scripts/verify_commit.sh` are removed. `docs/DESIGN.md`, generated from the tokens ([ADR-0001](0001-design-tokens-are-the-single-source-of-truth.md)), is the contract agents read.

### Invariants & Negative Constraints

1. **No global writes:** nothing in this repository may create, modify, or delete files in an agent's global configuration directory.
2. **Published contract:** `docs/DESIGN.md` is the agent-facing contract and stays generated from the token files.
3. **No duplicated values:** the agent skill must not embed token values or a version number, so a token change or release never requires a skill change.
4. **Stable paths:** moving or renaming `docs/DESIGN.md` or `tokens/judarn-tokens.json` requires updating the skill in the shared config repository, in a session there.

### Positive Consequences

- Version bumps and token changes no longer depend on anything outside this repository.
- Agents receive token values from one source.
- `scripts/verify_commit.sh` no longer depends on one agent's home directory, so it runs the same for any agent.

### Negative Consequences

- **Judarn no longer verifies that the skill exists or works.** Worst case: the skill is broken and nothing here notices. The check moves to the audits in the shared config repository.
- **The skill's summary of Judarn's rules is hand-written** and can fall behind `docs/DESIGN.md` if a core rule changes. Set aside: generating the skill, which would put global writes back.

## Pros and Cons of the Options

### Option 1: Skill owned by the shared config repository

- Good, because one skill serves every agent and releases have no external side effects.
- Bad, because a rule change here is not checked against the skill's summary.

### Option 2: Keep generating the skill from this repository

- Good, because token values in the skill could never drift.
- Bad, because it violates the rule against writing global configuration from an application repository, and it serves only one agent.

### Option 3: Move the skill into this repository

- Good, because the skill would change atomically with the code.
- Bad, because agents need the skill in every project, so each harness would still need a global link into this repository, and shared skills would split across repositories.
