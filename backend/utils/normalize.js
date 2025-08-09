// backend/utils/normalize.js
function parseGenres(raw) {
  if (Array.isArray(raw)) return raw.map(s => String(s).trim()).filter(Boolean);
  if (!raw) return [];
  return String(raw)
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);
}

function parseSpice(raw) {
  // Accept numbers, "Spice High/Medium/Low", or plain words
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return Math.max(0, Math.min(5, Math.round(raw)));
  }
  const v = String(raw || "").toLowerCase();
  if (!v) return 0;
  if (/\bhigh\b/.test(v)) return 5;
  if (/\bmedium\b/.test(v)) return 3;
  if (/\blow\b/.test(v)) return 1;

  const m = v.match(/\d+/);
  if (m) return Math.max(0, Math.min(5, parseInt(m[0], 10)));
  return 0;
}

function normalizeBook(b) {
  return {
    ...b,
    genres: parseGenres(b.genres || b.genre || b.tags),
    spice: parseSpice(b.spice ?? b.spiceLevel ?? b.spice_rating),
  };
}

module.exports = { normalizeBook };
