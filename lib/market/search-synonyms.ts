const SYNONYMS: Record<string, string[]> = {
  weather: ["weather", "rain", "snow", "temperature", "hurricane", "storm", "tornado", "flood", "climate", "forecast", "drought"],
  crypto: ["crypto", "bitcoin", "btc", "ethereum", "eth", "solana", "sol", "cryptocurrency"],
  election: ["election", "vote", "primary", "presidential", "ballot", "candidate", "democrat", "republican"],
  sports: ["sports", "nba", "nfl", "mlb", "soccer", "football", "basketball", "baseball"],
  economy: ["economy", "gdp", "inflation", "interest rate", "fed", "federal reserve", "recession", "unemployment"],
};

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
