# Slate360 — Homepage Blueprint

**Last Updated:** 2026-03-02
**Context Maintenance:** Update this file whenever homepage layout, platform cards, pricing, or visual identity changes.

---

## 1. Visual Identity

| Element | Value |
|---|---|
| Primary (Slate Blue) | `#1E3A8A` |
| Accent (Orange) | `#FF4D00` |
| Headline | "See it. Experience it. Own it." |
| Font stack | System sans-serif (Tailwind defaults) |

---

## 2. Page Structure

```
app/page.tsx                    ← Homepage (server component)
components/Navbar.tsx           ← Global navbar
components/Footer.tsx           ← Global footer
components/ModelViewerClient.tsx ← 3D model viewer
```

### Section Order
1. **Navbar** — logo, nav links, login/signup
2. **Hero** — headline + 3D model viewer (Google `<model-viewer>` with `csb-stadium-model.glb`)
3. **Platform Cards** — 8 module cards in a responsive grid
4. **Supporting Feature Cards** — 4 value proposition cards
5. **Pricing Teaser** — tier comparison table
6. **CTA Band** — call-to-action with signup button
7. **Footer** — links, legal, social

---

## 3. 3D Model Viewer

```typescript
// components/ModelViewerClient.tsx
// Uses Google's <model-viewer> web component
// Model: /uploads/csb-stadium-model.glb
// Features: auto-rotate, camera-controls, AR button
```

### 360 Tour Preview
- Pannellum viewer for 360° panorama auto-pan
- CSS animation for continuous horizontal rotation

---

## 4. Platform Cards

8 cards representing the platform modules:

| Key | Label | Description |
|---|---|---|
| `project-hub` | Project Hub | Construction project management |
| `design-studio` | Design Studio | 3D/2D design workspace |
| `content-studio` | Content Studio | Media creation tools |
| `tour-builder` | 360 Tour Builder | Virtual tour creation |
| `geospatial` | Geospatial & Robotics | Drone/survey data processing |
| `virtual-studio` | Virtual Studio | VR/immersive experiences |
| `analytics` | Analytics & Reports | Data insights |
| `slatedrop` | SlateDrop | File management |

---

## 5. Pricing Display

| Tier | Monthly | Annual (per month) |
|---|---|---|
| Trial | Free | — |
| Creator | $79 | $66 |
| Model | $199 | $166 |
| Business | $499 | $416 |
| Enterprise | Custom | Custom |

---

## 6. Design Rules

- **No cards/tiles** for primary navigation — use full-width sections
- **Pop-out button** on every canvas/viewer (model viewer, 360 tour, maps)
- Mobile-first responsive design
- Dark header/hero transitioning to light content sections

---

## 7. Context Maintenance Checklist

When making homepage changes, update this file if:
- [ ] Section layout or order changes
- [ ] Platform cards are added/removed/renamed
- [ ] Pricing tiers or display values change
- [ ] Visual identity (colors, fonts, headline) changes
- [ ] 3D model or 360 tour viewer behavior changes
