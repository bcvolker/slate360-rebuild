# Slate360 — Future Features Roadmap

**Last Updated:** 2025-01-XX  
**Status definitions:** 🔴 Not started · 🟡 Planned · 🟢 In Progress · ✅ Done

---

## Platform-Wide

| Feature | Description | Priority | Status |
|---|---|---|---|
| Full activity/audit log | `project_activity_log` DB table recording every field-level change with actor, timestamp, old/new values — powers ChangeHistory panel | High | 🔴 |
| Real-time collaboration | WebSocket or Supabase Realtime subscriptions so multiple users see live updates without page refresh | High | 🔴 |
| Notification center | In-app notifications for RFI responses, submittal approvals, overdue punch items, budget alerts | High | 🔴 |
| Email digests | Daily/weekly project digest emails via Resend to stakeholders and team members | Medium | 🔴 |
| Mobile-first views | Responsive layouts optimized for on-site tablet/phone use (field workers) | Medium | 🟡 |
| Offline capability | Service worker / progressive web app for field use with limited connectivity | Low | 🔴 |
| AI assistant (SlateMind) | Cross-module AI answering questions like "What are all open items blocking closeout?" | High | 🔴 |
| Global search | Keyboard-shortcut search across all projects, RFIs, submittals, documents, contacts | Medium | 🔴 |
| Custom branding | White-label option: custom logo, colors, company name on reports, portals, emails | Medium | 🔴 |
| Credit rollover improvements | Unused monthly credits roll over (capped) per tier — see `CREDIT_ROLLOVER_SYSTEM.md` | Medium | 🟡 |

---

## Project Hub

### RFIs
| Feature | Status |
|---|---|
| External client portal for RFI responses (`/external/project/[token]`) | 🔴 |
| RFI distribution list email blast | 🔴 |
| RFI response SLA tracking with countdown badge | 🔴 |
| Link RFIs to drawings (drag-and-drop pin on PDF) | 🔴 |
| RFI → Change Order conversion | 🔴 |

### Submittals
| Feature | Status |
|---|---|
| Full AIA document workflow with e-signature | 🔴 |
| Submittal log reconciliation against specification sections | 🔴 |
| Revision tracking with side-by-side diff view | 🔴 |
| Submittal package bundling (export all as ZIP) | 🔴 |

### Daily Logs
| Feature | Status |
|---|---|
| Auto-save daily log as PDF to SlateDrop /Daily Logs/ folder | 🔴 |
| Weather auto-fetch on log creation (Open-Meteo API — already wired in UI, needs server-side save) | 🟡 |
| Daily log photo upload (direct camera capture on mobile) | 🔴 |
| Daily log export to Word/PDF report | 🔴 |
| Crew count analytics chart (trades vs. time) | 🔴 |

### Punch List
| Feature | Status |
|---|---|
| Photo attachment per punch item (camera roll / file upload) | 🔴 |
| QR code scan to open punch item on site | 🔴 |
| Punch list PDF export with photos | 🔴 |
| Auto-save punch list snapshot to SlateDrop /Reports/ | 🔴 |
| Contractor notification when items assigned | 🔴 |

### Drawings
| Feature | Status |
|---|---|
| Drawing markup / redline annotations (paint layer on PDF) | 🔴 |
| Revision set management (supersede old sheets) | 🔴 |
| Issue log linked to drawing sheets | 🔴 |
| Drawing comparison (overlay two versions) | 🔴 |
| RFI / Punch item pin on drawing | 🔴 |

### Photos
| Feature | Status |
|---|---|
| AI photo tagging (location, trade, progress %) | 🔴 |
| 360° photo viewer (equirectangular) | 🔴 |
| Photo timeline slider (date-based progress view) | 🔴 |
| Bulk upload from mobile (zip/folder) | 🔴 |
| Comparison view (before/after slider) | 🔴 |

### Budget
| Feature | Status |
|---|---|
| Change order log with approval workflow | 🔴 |
| Budget vs. actual chart (category bars) | 🔴 |
| Invoice matching against budget line items | 🔴 |
| Cash flow projection chart | 🔴 |
| Budget import from CSV / Excel | 🔴 |
| Integration with QuickBooks / Procore budget export | 🔴 |
| Pay application auto-generation (AIA G702/G703) | 🔴 |

### Schedule
| Feature | Status |
|---|---|
| Critical path highlighting | 🔴 |
| Baseline vs. actual comparison | 🔴 |
| Successor/predecessor dependencies | 🔴 |
| Schedule import from MS Project / P6 | 🔴 |
| Resource leveling | 🔴 |
| S-curve earned value chart | 🔴 |

### Management
| Feature | Status |
|---|---|
| Contract e-signature (DocuSign / HelloSign integration) | 🔴 |
| Stakeholder portal — external view of assigned items | 🔴 |
| Insurance certificate tracking with expiry alerts | 🔴 |
| Lien waiver management | 🔴 |
| Subcontractor pre-qualification checklist | 🔴 |
| Project closeout checklist with document bundling | 🔴 |
| Organization-level contractor database (reuse across projects) | 🔴 |

### Project Home (Tier 2 Overview)
| Feature | Status |
|---|---|
| Live weather widget on project home | 🔴 |
| Milestone countdown ticker | 🔴 |
| Recent activity feed (last 10 changes across all tools) | 🔴 |
| Budget health gauge | 🔴 |
| Open items summary cards | 🔴 |

---

## SlateDrop

| Feature | Status |
|---|---|
| `file_folders` → `project_folders` Phase 2 migration (Design Studio, export-zip) | 🟡 |
| Folder share links with expiry | 🔴 |
| File version history (versioned uploads) | 🔴 |
| OCR on uploaded PDFs (full-text search) | 🔴 |
| Bulk file operations (move, copy, rename multiple) | 🔴 |
| Storage quota warning UI (when approaching tier limit) | 🔴 |
| File preview for more types (DWG, DXF, IFC) | 🔴 |
| "Receive file" link (external upload without account) | 🔴 |

---

## Design Studio

| Feature | Status |
|---|---|
| Full 3D model viewer (IFC, GLTF) | 🟡 (infrastructure audit done) |
| AI floorplan generation | 🔴 |
| Material library browser | 🔴 |
| Rendering queue with GPU worker | 🟡 (GPU_WORKER_DEPLOYMENT.md) |
| Design → Drawing markup linking | 🔴 |

---

## 360 Tour Builder

| Feature | Status |
|---|---|
| Hotspot editor (interactive info points) | 🔴 |
| Multi-floor navigation | 🔴 |
| VR headset export (WebXR) | 🔴 |
| Shareable public tour links | 🔴 |
| Progress comparison (same camera angle, different dates) | 🔴 |

---

## Analytics & Reports

| Feature | Status |
|---|---|
| Cross-project portfolio dashboard | 🔴 |
| Budget burn-rate analytics | 🔴 |
| Schedule performance index (SPI) chart | 🔴 |
| Subcontractor performance scorecard | 🔴 |
| Custom report builder (drag-drop widgets) | 🔴 |
| Automated weekly PDF report delivery via email | 🔴 |

---

## Geospatial & Robotics

| Feature | Status |
|---|---|
| LiDAR point cloud viewer | 🔴 |
| Drone flight path planning | 🔴 |
| Progress scan comparison (mesh diff) | 🔴 |
| Google Routes API (pending API key allowlist update) | ⚠️ Blocked |
| Automated site boundary detection from cadastral data | 🔴 |

---

## Virtual Studio

| Feature | Status |
|---|---|
| Real-time avatar collaboration in virtual space | 🔴 |
| Integration with Design Studio assets | 🔴 |
| Meeting room with screen share | 🔴 |

---

## Platform / Billing

| Feature | Status |
|---|---|
| Self-service plan upgrade/downgrade in My Account | 🟡 |
| Seat management (add/remove team members per org) | 🔴 |
| Usage analytics in admin dashboard | 🔴 |
| API key management for integrations | 🟢 (in progress) |
| Webhook events for third-party integrations | 🔴 |
| Zapier / Make.com connector | 🔴 |
| Procore BIM 360 data sync | 🔴 |
| Autodesk Docs integration | 🔴 |

---

## External / Stakeholder Portal

| Feature | Status |
|---|---|
| `/external/project/[token]` read-only project view | 🔴 |
| External RFI response form | 🔴 |
| External submittal approval (approve/reject with signature) | 🔴 |
| External-facing daily log summary | 🔴 |

---

_To propose a new feature, add it to this document with 🔴 status and a description. Move to 🟡 when approved and prioritized._
