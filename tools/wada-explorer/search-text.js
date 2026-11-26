// Search text for the color dictionary, shared by the MCP server and the explorer page
// (scripts/build-wada-explorer.js inlines this function, so keep it self-contained).
// Phones type curly apostrophes (iOS Smart Punctuation turns ' into ’), while the color
// names use straight ones, as in "Pale King's Blue".
function normalizeSearchText(value) {
  return String(value ?? '').trim().toLowerCase().replace(/[‘’ʼ′]/g, "'");
}

module.exports = { normalizeSearchText };
