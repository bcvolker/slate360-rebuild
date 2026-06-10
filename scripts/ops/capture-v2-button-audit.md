# Capture-v2 Canvas Button Audit (mobile shell)

## Live state
| Control | Toggle / exit |
|---------|----------------|
| Back (top bar) | Navigates to Site Walk home |
| Maximize (top bar) | Toggles chrome hidden; tap canvas restores |
| Light (bottom left) | Toggle on/off; hidden if unsupported |
| Ghost (bottom left) | Hides chrome; tap canvas restores |
| Shutter tap | Captures when live frames ready; blocked state if not |
| Shutter hold | Opens source sheet; release without hold = tap capture |
| End (bottom right) | Opens SessionExitModal |
| Filmstrip thumb | Selects stop preview |
| Filmstrip collapse | Show/hide tracker |
| Canvas tap | Toggle chrome visibility |

## Captured state
| Control | Toggle / exit |
|---------|----------------|
| Markup tool | Toggle on/off |
| Pin tool | Toggle on/off |
| +Angle tool | Clears preview → live angle capture |
| Angle thumbs | Select main/angle; long-press promote |
| Shutter | Save & next → live camera |
| Details (→) | Opens data entry |
| Long-press photo | Attach-here sheet |

## Source sheet
| Control | Toggle / exit |
|---------|----------------|
| Scrim tap | Close |
| Swipe down on sheet | Close |
| Row tap | Select source then close |

## Data entry
| Control | Toggle / exit |
|---------|----------------|
| Back | Close details (or summary if returnFromSummary) |
| Mic | Toggle dictation |
| Boost with AI | One-shot format |
| Save | Persist draft |
| Save & next | Persist + live camera |

## Session exit modal
| Control | Toggle / exit |
|---------|----------------|
| Cancel | Close modal |
| Exit | Leave walk in progress |
| End Walk | Complete session → summary |
