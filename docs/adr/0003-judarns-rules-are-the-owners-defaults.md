---
status: accepted
date: 2026-11-02
deciders: Ruben Luthman
tags: [scope, authority, color, typography, agents, boundaries]
---

# Judarn's Rules Are the Owner's Defaults

## Context and Problem Statement

Judarn is a personal design system. Its rules state how the owner wants things when they ask for nothing special, and almost all of them apply to every project. They were written the way a business system enforces a brand: "never", "every", "only", "strictly prohibited across all hosts". Agents could not tell whom those words bind, so they applied them to the owner as well.

On 2026-11-02 that surfaced twice. Claude's copy of the rules made the Sanzo Wada dictionary "the source of all color beyond the neutrals" and said "Never add colors from outside it", although the owner's own colours, such as a project's graphic profile, are equally valid. A members' website has its own typefaces and accent colours, and the general rule "Use the host's own typeface when it has one" left it no way to use them. Each such choice turned into a justification, an ADR amendment, or a confirmation.

The owner also needs to know when a request departs from Judarn, or the departure happens by mistake.

How should Judarn state its rules so that they guide every project by default and give way to the owner without ceremony?

## Decision Drivers

- Judarn expresses the owner's standard preference, not a limit on their creativity.
- Most rules apply to every project, so an override must change only what it names.
- The owner needs to see each departure once, as information, and then have it settled.
- Measured costs, such as a contrast shortfall, must still reach the owner.
- Judarn's own output (tokens, compiled code, generated docs) must stay exactly as firm as before.

## Considered Options

- **Option 1: Rules are defaults, the owner's word wins.**
- **Option 2: Split rules into firm rules and preferences.**
- **Option 3: Keep the rules firm and amend an ADR per override.**

## Decision Outcome

Chosen option: **Option 1**, because it matches what a personal system is for, needs no per-rule classification, and keeps every default unchanged.

It shapes the rules of the other records:

- The card border prohibition ([ADR-0004](0004-surface-hierarchy-without-card-borders.md)) binds Judarn's own output and an agent's own initiative. An owner's explicit choice for a piece of work or a project is not a violation.
- General rules ([ADR-0002](0002-general-rules-and-host-rules.md)) are defaults, not limits on the owner, and a project profile sits between the general rules and the host rules.
- Light box tints are not limited to Sanzo Wada colours: any accent colour, including the owner's, qualifies.

### Invariants & Negative Constraints

1. **Precedence:** the owner's request wins over the project's profile, which wins over Judarn's defaults.
2. **Override scope:** an override changes only what it names. Every rule it does not name still applies.
3. **Adaptation:** rules that depend on an overridden choice adapt to it rather than lapse: tints come from the owner's colours, weight roles map to the nearest weights the owner's typeface has, and ink is resolved on the owner's fills.
4. **Disclosure without protest:** when work departs from a Judarn default at the owner's word, the agent says so once, in a one-line summary of Judarn's default and what the work uses instead. It never argues, recommends reverting, or asks again. A measured cost, such as a contrast ratio below its tier, is part of that summary.
5. **Settled once approved:** an override the owner approves is recorded in the project's profile and is never raised again in that project. Work without a profile needs no record. An override never needs an ADR.
6. **Agents never originate overrides:** every "never", "only", and "must" in Judarn binds an agent's own initiative. An agent departs from a default only at the owner's word.
7. **Judarn's own output stays firm:** inside this repository the rules define the defaults, so tokens, compiled code, components, and generated docs follow every accepted invariant without exception.
8. **Accent sources:** accent colours come from the owner when given, through a project's profile or the request. When the owner gives none, the Sanzo Wada dictionary is a source of suggestions; a host rule may make choosing a combination its default method, and no single combination is ever a default palette ([ADR-0007](0007-sanzo-wada-dictionary-explorer-and-mcp-server.md)). Every accent colour, the owner's or the dictionary's, is measured against the same ratios per use.
9. **Profiles depend on Judarn:** a profile records what one project always wants where it differs from Judarn. It lives in `docs/profiles/` or in the project's own design record, and its choices never become Judarn defaults, tokens, or general rules.

### Positive Consequences

- The owner can choose any colour, typeface, or layout without a justification, plan, or ADR.
- Each departure is visible once, so a mistaken one can be caught.
- No default changes, so existing work, tokens, and compiled hosts are unaffected.

### Negative Consequences

- **An approved override can still be a poor choice.** Worst case: the owner approves an override they did not understand from its one-line summary, and the project carries it until they notice. Set aside: asking for confirmation before applying, because confirmation is the ceremony the owner wants gone.
- **Profiles and recorded overrides can drift from Judarn.** Worst case: a profile keeps an override after Judarn's default changes to match it, and no check notices. Set aside: a machine check over profiles, because they are short and owner-maintained.
- **Disclosure depends on agents recognising a default.** Worst case: an agent applies a request without noticing it departs from Judarn, and the owner gets no summary. Set aside: listing every rule as an override point, which would bury the summary in noise.

## Pros and Cons of the Options

### Option 1: Rules are defaults, the owner's word wins

- Good, because it matches the owner's intent and changes no default.
- Good, because an override costs one line of disclosure and nothing else.
- Bad, because it relies on agents to recognise when a request departs from a default.

### Option 2: Split rules into firm rules and preferences

- Good, because the firm list would be explicit.
- Bad, because the owner can still choose differently on anything, so a firm list would only reintroduce the friction for the rules on it, and every new rule would need classifying.

### Option 3: Keep the rules firm and amend an ADR per override

- Good, because every departure would carry a full record.
- Bad, because it is the ceremony the owner wants gone, and an ADR is far too strong for a project choice.
