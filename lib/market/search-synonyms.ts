const SYNONYMS: Record<string, string[]> = {
  weather: ["weather", "rain", "snow", "temperature", "hurricane", "storm", "tornado", "flood", "climate", "forecast", "drought", "wind"],
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
