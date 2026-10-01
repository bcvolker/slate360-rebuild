# Light client portal, L1 (theme B): frame + link states

Client-facing. Compared side by side with slate360.ai's homepage (`side-by-side-{375,768,desktop}.png`: homepage | empty portal | link unavailable).

- **Palette:** the portal canvas measures `rgb(250, 250, 248)`, the homepage `--mkt-canvas`. Surfaces are white, lines `--mkt-line`, ink and muted ink identical. The Slate360 wordmark is the same as the homepage header (icon + SLATE in ink + 360 in brand green). The client's own logo replaces it when set.
- **No dark client shell:** `PortalChrome` and `TokenStatePage` contain no `--graphite-*`, and `guard:design` now blocks new dark tokens in client portal files (15 legacy files baselined for L2/L3/L5; the list can only shrink).
- **No horizontal overflow** at 375, 768 or 1280.
- **Empty states are centred cards,** not a line on a blank page.

**Not in L1:** the overview body with content (hero, reality tiles, items, documents) is **L2**, and the sub-pages are **L3**. Their bodies still carry dark-theme classes until then, so review this PR on the frame and link states only.
