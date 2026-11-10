# Decision records

A record has the line `Status: Active | Retired · Date` and the headings Decision, Why, What we gave up, and Revisit if. It is edited in place, and `scripts/verify-adrs.js` checks the format. A record exists only when an AI undoing the decision would lose data, cost money, break something people rely on, or throw away more than a day of work. Design rules live in [`docs/DESIGN.md`](../DESIGN.md). Numbers of deleted records are not reused.

| ADR | Title | Status |
| :--- | :--- | :--- |
| [0001](0001-design-tokens-are-the-single-source-of-truth.md) | Design tokens are the single source of truth | Active |
| [0005](0005-compile-time-contrast-checks-and-gamut-mapping.md) | Compile-time contrast checks and gamut mapping | Active |
| [0007](0007-sanzo-wada-dictionary-explorer-and-mcp-server.md) | Sanzo Wada dictionary, explorer, and MCP server | Active |
| [0008](0008-agent-skill-lives-outside-the-repository.md) | Agent skill lives outside the repository | Active |
| [0011](0011-web-package-ships-compiled-javascript.md) | Web package ships compiled JavaScript | Active |
| [0013](0013-apps-consume-judarn-ui-from-the-public-npm-registry.md) | Apps consume @judarn/ui from the public npm registry | Active |
| [0014](0014-public-repository-starts-from-a-fresh-history.md) | Public repository starts from a fresh history | Active |
