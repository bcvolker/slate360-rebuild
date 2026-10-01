# OPERATOR TOOLING: Tour setup density (C1.3). Not a client deliverable.

Brian's internal Directed Tour setup page, captured in the `/preview/tour-operator` harness (Tour API mocked; HouseWalk engineering video). Clients never see this page.

| | 1440×900 page height | 1280×800 page height | 375 |
|---|---|---|---|
| **before** (#45) | 1476 px (scrolls 576 px; checkpoint column runs past the fold; tall card stacks) | 1476 px | 2690 px |
| **after** (C1.3) | **900 px = viewport** (no page scroll; both panes full) | **800 px = viewport** (only the checkpoint list scrolls inside its pane) | 1542 px, single column, no overflow |

Files: `before-*` and `after-*` at `1440x900` and `1280x800` (`-viewport` = what's on screen, `-full` = whole page), and `375`.
