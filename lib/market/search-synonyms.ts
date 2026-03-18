const SYNONYMS: Record<string, string[]> = {
  weather: ["weather", "rain", "snow", "temperature", "hurricane", "storm", "tornado", "flood", "climate", "forecast", "drought"],
  crypto: ["crypto", "bitcoin", "btc", "ethereum", "eth", "solana", "sol", "cryptocurrency"],
  election: ["election", "vote", "primary", "presidential", "ballot", "candidate", "democrat", "republican"],
  sports: ["sports", "nba", "nfl", "mlb", "soccer", "football", "basketball", "baseball"],
  economy: ["economy", "gdp", "inflation", "interest rate", "fed", "federal reserve", "recession", "unemployment"],
};

/** Titles containing these terms are esports/gaming, not weather or science. */
const ESPORTS_BLOCKLIST_RE = /\b(?:rainbow\s*six|cs:?go|counter[\s-]?strike|valorant|dota|league\s+of\s+legends|overwatch|fortnite|esports?|e[\s-]?sports?|pubg|apex\s+legends|call\s+of\s+duty|cod\b|rocket\s+league|halo\s+infinite)\b/i;

/** Expand search queries with synonyms so users find markets with related terms. */
export function expandSearchTerms(query: string): string[] {
  const terms = [query];
  for (const [key, synonyms] of Object.entries(SYNONYMS)) {
    if (query.includes(key)) {
      terms.push(...synonyms.filter(s => s !== query));
    }
  }
  return terms;
}

/**
 * Word-boundary-aware matching for search terms.
 * The original user query uses substring matching (user typed it intentionally).
 * Synonym expansions use word-boundary matching to prevent false positives
 * like "rain" matching "Rainbow" or "storm" matching "Brainstorm".
 */
export function queryMatchesText(query: string, text: string): boolean {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return true;
  const haystack = text.toLowerCase();

  // Original query: substring match (user typed it)
  if (haystack.includes(normalizedQuery)) return true;

  // Synonym expansions: word-boundary match
  for (const [key, synonyms] of Object.entries(SYNONYMS)) {
    if (!normalizedQuery.includes(key)) continue;
    for (const synonym of synonyms) {
      if (synonym === normalizedQuery) continue;
      // Use word boundary: synonym must be preceded/followed by non-word char or string boundary
      const escaped = synonym.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const re = new RegExp(`\\b${escaped}\\b`, "i");
      if (re.test(text)) return true;
    }
  }

  return false;
}

/** Returns true if the title looks like an esports/gaming market. */
export function isEsportsTitle(title: string): boolean {
  return ESPORTS_BLOCKLIST_RE.test(title);
}
