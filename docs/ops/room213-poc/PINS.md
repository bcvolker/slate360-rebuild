# Room 213 POC — curated spatial pins (verification record, 2026-09-27)

Pin data: `lib/room213/pins.ts`. The anchors are in the golden model's file frame (F) and are bound to sha256
`7e7b5d18…3a62`. Room-frame (V) values below were converted to F with `F = FLIP · R_corrᵀ · V`
(see COORDINATES.md).

## Content (all public assets re-encoded, so no EXIF/GPS survives)

| Pin | Asset | Source | Privacy handling |
|---|---|---|---|
| Furniture layout | `content/furniture-layout.jpg` | `brooke-layout.png` (a phone screenshot of the move email) | **Cropped to the floor-plan drawing only.** The email header, sender name and title, signature block and phone chrome are removed. The email itself (`brooke-email.jpg`) is not used. |
| Tables scheduled to move | `content/table-moving.jpg` | `move-table-underside.jpg` | Shows only a table and wall. |
| Fixture cart | `content/fixture-cart.jpg` | `move-fixture-cart.jpg` | Shows the cart, whiteboard and door. |
| Tables staying in place | `content/table-staying.jpg` | `stay-table-rail.jpg` | Shows only tables. |

## Locations and how they were verified

Verification was done from viewer frames in Walk and Plan, plus screen→wall-plane unprojection.

- **Front wall (x_max, V x ≈ 4.93):** carries the whiteboard (z −2.8 … 0.18), a wall plate, and the orange door
  (z 0.98 … 1.85). The windows and the US flag are on the z_min wall. The table rows run perpendicular to the windows.
- **Furniture layout** is anchored at the whiteboard centre (V 4.90, −0.30, −1.20; facing into the room). This is a
  presentation anchor for a room-wide document; the pin makes no location claim.
- **Fixture cart:** the photo's backdrop matches the capture at the whiteboard/door junction (whiteboard left, wall
  plate, door right; V 4.90, −1.15, 0.50). **The cart is not in the capture**, so the pin says it was photographed here.
- **Legend:** magenta hatched = moving and blue = staying. This is backed by the item counts: 3 magenta rows ≈ the 10
  MOVE tables and 6 blue rows ≈ the 18 STAY tables.
- **Drawing-to-scan registration:**
  - The scan's near-window block has 4 rows (3 white plus the orange instructor table) and matches the drawing's
    4-row block (3 moving, 1 staying).
  - The far block has 5 rows and matches the drawing's 5 staying rows.
  - The drawing's top/bottom orientation cannot be fixed from the capture alone. The pins therefore use only facts
    that hold under **both** orientations:
    - **Tables staying:** a row of the 5-row block (V −1.81, −0.96, 2.60). Every row there stays.
    - **Tables moving:** the window-end row of the near-window block (V −3.21, −0.96, −2.10). It moves under both readings.
- The table photos show a tagged table, not necessarily the pinned one. The pin text says so.
