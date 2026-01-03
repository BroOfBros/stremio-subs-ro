const fuzz = require("fuzzball");

/**
 * Calculate token-based similarity between two strings.
 * Uses token_set_ratio which handles word reordering and partial matches.
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} - Similarity score 0-100
 */
function tokenSimilarity(str1, str2) {
  if (!str1 || !str2) return 0;
  return fuzz.token_set_ratio(str1.toLowerCase(), str2.toLowerCase());
}

/**
 * Find the best matching string from a list of candidates.
 * @param {string} target - The target string to match against
 * @param {string[]} candidates - Array of candidate strings
 * @returns {{ match: string, score: number, index: number } | null}
 */
function findBestMatch(target, candidates) {
  if (!target || !candidates || candidates.length === 0) return null;

  let bestMatch = null;
  let bestScore = 0;
  let bestIndex = -1;

  candidates.forEach((candidate, index) => {
    const score = tokenSimilarity(target, candidate);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = candidate;
      bestIndex = index;
    }
  });

  return bestScore > 0
    ? { match: bestMatch, score: bestScore, index: bestIndex }
    : null;
}

/**
 * Check if a text contains a specific season/episode pattern.
 * Matches: S01E05, S1E5, 1x05, E05, Ep.5, Episode 5, etc.
 * @param {string} text - Text to search in (title, description, filename)
 * @param {number} season - Season number
 * @param {number} episode - Episode number
 * @returns {boolean}
 */
function matchesEpisode(text, season, episode) {
  if (!text || episode === undefined || episode === null) return false;

  const normalizedText = text.toLowerCase();
  const s = String(season).padStart(2, "0");
  const e = String(episode).padStart(2, "0");
  const sShort = String(season);
  const eShort = String(episode);

  // Patterns to match (ordered by specificity)
  const patterns = [
    // Full S01E05 format (most specific)
    new RegExp(`s${s}e${e}\\b`, "i"),
    new RegExp(`s${sShort}e${eShort}\\b`, "i"),
    // Alternative format: 1x05 or 1x5
    new RegExp(`\\b${sShort}x${e}\\b`, "i"),
    new RegExp(`\\b${sShort}x${eShort}\\b`, "i"),
    // Episode only
    new RegExp(`\\be${e}\\b`, "i"),
    new RegExp(`\\bep\\.?\\s*${eShort}\\b`, "i"),
    new RegExp(`\\bep\\.?\\s*${e}\\b`, "i"),
    // Universal keywords for Episode (multiple languages)
    new RegExp(
      `\\b(?:episode|episod|episodio|épisode|folge|epizód|επεισόδιο|episódio)\\s*${eShort}\\b`,
      "i"
    ),
    new RegExp(
      `\\b(?:episode|episod|episodio|épisode|folge|epizód|επεισόδιο|episódio)\\s*${e}\\b`,
      "i"
    ),
  ];

  // If season is provided, also check for "Season 1 Episode 5" style patterns in various languages
  if (season !== null) {
    const seasonKeywords =
      "(?:season|sezon|stagione|saison|staffel|évad|κύκλος|temporada)";
    patterns.push(
      new RegExp(
        `${seasonKeywords}\\s*${sShort}.*?(?:episode|episod|episodio|épisode|folge|epizód|επεισόδιο|episódio)\\s*${eShort}`,
        "i"
      )
    );
    patterns.push(
      new RegExp(
        `${seasonKeywords}\\s*${s}.*?(?:episode|episod|episodio|épisode|folge|epizód|επεισόδιο|episódio)\\s*${e}`,
        "i"
      )
    );
  }

  return patterns.some((pattern) => pattern.test(normalizedText));
}

/**
 * Extract season and episode from various text formats.
 * @param {string} text - Text to parse
 * @returns {{ season: number, episode: number } | null}
 */
function extractSeasonEpisode(text) {
  if (!text) return null;

  const patterns = [
    /s(\d{1,2})e(\d{1,2})/i, // S01E05
    /(\d{1,2})x(\d{1,2})/i, // 1x05
    // Universal pattern for Season X Episode Y
    /(?:season|sezon|stagione|saison|staffel|évad|κύκλος|temporada)\s*(\d+).*?(?:episode|episod|episodio|épisode|folge|epizód|επεισόδιο|episódio)\s*(\d+)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return {
        season: parseInt(match[1], 10),
        episode: parseInt(match[2], 10),
      };
    }
  }

  return null;
}

module.exports = {
  tokenSimilarity,
  findBestMatch,
  matchesEpisode,
  extractSeasonEpisode,
};
