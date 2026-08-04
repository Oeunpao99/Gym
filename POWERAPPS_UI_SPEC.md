# Gym Membership — Power Apps UI Specification (Handover Document)

> **Purpose:** This document is the design handover for rebuilding the Gym Membership
> front desk system in **Microsoft Power Apps**. The current React app
> (`frontend/`) is the **design prototype** — every page, colour, spacing and
> control in it should be replicated 1:1 in Power Apps canvas app(s).
>
> **Reference prototype:** `frontend/src/index.css` (design tokens + component styles),
> `frontend/src/layout/AdminLayout.tsx` (shell), `frontend/src/pages/**` (screen layouts).
>
> **Recommended tooling:** Power Apps **canvas app** with a **custom connector** to the
> existing REST API (endpoints listed in section 6). Use **Component Libraries** for
> reusable UI (Header, StatCard, StatusPill, DataTable, EntityForm).

---

## 1. Design Tokens (use exactly these values)

| Token | Hex / Value | Usage |
|---|---|---|
| Background | `#F3F2F1` | App canvas background |
| Surface / Card | `#FFFFFF` | Cards, tables, modals, topbar |
| Surface hover | `#F3F2F1` | Row hover, button hover |
| Border | `#EDEBE9` | Card/table separators |
| Border strong | `#C7C6C4` | Secondary button outline |
| Input border | `#8A8886` | Text input / dropdown border |
| Text primary | `#201F1E` | Headings |
| Text soft | `#323130` | Body text |
| Text muted | `#605E5C` | Labels, hints, subtitles |
| **Primary (brand)** | `#106EBE` | Primary buttons, active nav, focus, accents |
| Primary hover | `#005A9E` | Primary button hover |
| Primary pressed | `#004578` | Primary button pressed |
| Primary soft | `#DEECF9` | Preview boxes, info badges |
| Sidebar top | `#123A63` | Left nav gradient start |
| Sidebar bottom | `#0B2A4A` | Left nav gradient end |
| Success | `#107C10` | Active / Approved / Allowed |
| Warning | `#C24100` | Pending / Renewing |
| Danger | `#D13438` | Expired / Blocked / Rejected |
| Focus ring | `#106EBE` at 25% alpha | Inputs, buttons, keyboard nav |

### Typography

| Style | Value |
|---|---|
| Font family | **Segoe UI** (Power Apps default) |
| Base size | 14 px |
| Page title | 22 px / Semibold |
| Card value | 30 px / Bold |
| Table header | 11.5 px / Semibold / Uppercase / letter-spacing 0.5 px |
| Button / label | 13 px / Semibold |

### Geometry

| Token | Value |
|---|---|
| Corner radius (cards, tables, inputs) | 6 px |
| Corner radius (large cards, modals) | 10 px |
| Card shadow | `0 1.6px 3.6px rgba(0,0,0,0.12), 0 0.3px 0.9px rgba(0,0,0,0.10)` |
| Modal shadow | `0 6.4px 14.4px rgba(0,0,0,0.22), 0 1.2px 3.6px rgba(0,0,0,0.16)` |
| Sidebar width | 232 px |
| Content padding | 28 px sides, 24 px top |

---

## 2. App Shell (replicate on every admin screen)

The shell is the model-driven Power Apps pattern: **dark navy sidebar + white command bar**.

| Zone | Design |
|---|---|
| Left sidebar (232 px) | Vertical gradient `#123A63 → #0B2A4A`. Brand row at top: 30 px white dumbbell icon in a translucent square + "Gym Membership". Nav items: white icon (18 px, stroke 1.8) + 13.5 px label; active item = translucent white pill with 3 px blue left edge (`#4DB3FF`). |
| Nav order | Dashboard, Scanner, Members, Approvals\*, Renewals, Membership Types, Branches, Walk-ins, Promotions, Reports. (\*approvals only visible to Head Office / CEO) |
| Sidebar footer | User block: white avatar circle (34 px, user icon) + name + role·branch. Below it a full-width ghost "Sign out" button with logout icon. |
| Top command bar | White, 10 px padding, card shadow. Left = current page title (17 px semibold). Right = "Signed in as **Name** (Role)". |
| Role visibility | Branch Manager sees: Dashboard, Scanner, Members, Renewals, Promotions. Head Office / CEO see all. |

**Power Apps controls:** Use a `Group` as the sidebar (`Rectangle` with gradient fill,
`Labels` + `Icons` for items, a `Gallery (Vertical)` for nav) and a `Group` for the
command bar. Navigation = `Navigate(ScreenX)` on `OnSelect` of each nav icon.

---

## 3. Screens (control-by-control spec)

### 3.1 Login (Screen: `scrLogin`)

Soft blue-tinted background (`#EEF4FA` fading to `#F3F2F1`, two radial glows).
White card 380 px wide, 10 px radius, modal shadow, thin border.

- Brand row: 40 px rounded square `#106EBE` gradient with white dumbbell icon; heading "Gym Membership"; subtitle "Sign in to the front desk workspace" (muted).
- `TextInput` — Username (label above, semibold 13 px)
- `TextInput` (Password mode) — Password
- `Button` — "Sign in" (primary `#106EBE`, full width, 14 px)
- Demo accounts list at the bottom in a `Label` with small bullets (dev/demo only).
- Footer text: "Powered by Microsoft Power Apps · Fluent UI" (11 px, muted).

### 3.2 Dashboard (Screen: `scrDashboard`)

- Page title "Dashboard" + muted subtitle.
- **5 stat cards** in a responsive row (min 170 px each): Active Members (green, people icon, subtitle "N expiring soon"), Pending Approval (amber, checklist icon), Renewals Today (blue, refresh icon, subtitle "N this month"), Scans Today (purple, chart icon), Expired Members (red, alert icon).
  - Card anatomy: 40 px rounded icon chip (brand colour) → 30 px bold value → 12.5 px muted label → optional muted subtitle.
- **Filters bar**: white card containing `TextSearchBox` (Search name/code) + 2 `Dropdowns` (Branch, Result) with "All" default.
- **Check-ins DataTable**: columns Member, Code, Branch, Result (StatusPill), Scanned At, [Open TV button]. Row hover `#F3F2F1`. Empty state: "No check-ins yet." italic muted, centered.
- Header action: primary button "Go to Scanner" with external-link icon.

**Power Apps:** `Gallery` (or modern `DataTable`) bound to the check-ins collection; StatCard = custom component (`Component Library`) with properties `Value`, `Label`, `Icon`, `Color`, `Subtitle`.

### 3.3 Scanner (Screen: `scrScanner`)

Two-column grid (1.15 : 1), each side a white card:

- **Left — Camera Scan:** heading "Camera Scan"; `Barcode scanner` control (HTML host / camera) inside a dashed-border box (`#C7C6C4` dashed); below it "Start Camera" (primary) / "Stop Camera" toggle button.
- **Right — Manual Check:** heading "Manual Check"; Branch input (disabled for Branch Manager), Member code input (placeholder `PS-0001`); primary "Verify Member" button; secondary "Open Branch TV" (disabled when no branch).
- **Result panel** (below the grid, after scan): full-width card, 5 px left accent border.
  - Allowed → `#DFF6DD` bg, `#107C10` title "ACCESS ALLOWED", message, member mini-card (white inner card: name, code, plan · status, expiry · days left).
  - Blocked / expired / not found → `#FDE7E9` bg, `#D13438` title (status uppercased).

**Power Apps:** `Barcode scanner` control (`Scan` result triggers the verify action); result panel = two overlaid `Groups` whose `Visible` toggles on scan outcome.

### 3.4 Members (Screen: `scrMembers`)

- Page title + subtitle. Header actions: "Export CSV" (secondary), "Member Action" (primary → opens chooser modal).
- **Filters bar**: search box + Branch / Status / Plan dropdowns (same card style as Dashboard).
- **Members DataTable**: Code, Name, Plan, Branch, Expiry (`2026-08-04 (12d)`), Status (StatusPill), Actions (Details / Edit / Renew / Delete-in-danger-style).
- **Modals:**
  - *Member Action chooser*: "New Member" primary button; note text "To renew an existing member, use the Renew action on their row."; Close.
  - *Member form* (New/Edit): Name, Email, Phone, Membership Type (dropdown), Join Date (date), Branch (dropdown, disabled for Branch Manager), Promotion (dropdown), Remarks (multiline), Photo (file upload with 130 px rounded preview). Head Office sees "Approve immediately" checkbox. Footer: Cancel / Save.
  - *Member details* (wide modal, 680 px): left column photo + QR box (white tile, QR + "Scan to check in"); right column Code, Email, Phone, Plan, Branch, Join Date, Expiry (days left), Status pill, Remarks. Action row: Open Card / Print Card / Download PNG. Below: "Renewal History" table + "Promotions Applied" list. Close button.
  - *Renew modal*: member name + current plan/expiry, Promotion dropdown, blue preview line "Estimated new expiry: **date**" (`#DEECF9` bg), buttons Cancel / "Renew & Approve" (Head Office/CEO) or "Request Renewal".

### 3.5 Approvals (Screen: `scrApprovals`) — Head Office / CEO only

- Title + subtitle. Right side: checkbox "Show all".
- **Approvals DataTable**: Name, Type, Plan, Branch, Date, Status (pill), Actions — Approve (primary) / Reject (danger) only when status = "Pending for Approval".

### 3.6 Renewals (Screen: `scrRenewals`)

- Title + subtitle; primary "Add Renewal" button.
- **Renewals DataTable**: Member Code, Plan, Requested, Status (pill), New Expiry, Branch, [Process] (visible when not Approved and user can approve).
- *Add Renewal modal*: Member Code input + "Lookup" button (error text "Member not found" when lookup fails); on success shows member line + buttons Cancel / "Renew & Approve" / "Request Renewal".

### 3.7 Generic entity screens (Membership Types, Branches, Walk-ins, Promotions)

Single generic pattern (`GenericEntityPage`):
- Title + subtitle, primary "Add {Title}" button.
- DataTable from schema columns + Actions (Edit / Delete).
- Entity modal: form fields from schema (text / number / date / dropdown / checkbox / multiline), Cancel / Save.
- Fields per entity:
  - **Membership Types:** Name, Duration (days), Price, Description.
  - **Branches:** Code, Name, Address, Phone.
  - **Walk-ins:** Name, Phone, Time, Purpose, Status, Converted (checkbox).
  - **Promotions:** Code, Name, Base Duration (value + unit dropdown), Bonus Duration (value + unit dropdown), Price, Applicable Membership, Usage Limit, Status (Active/Inactive/Expired), Start Date, End Date.

### 3.8 Reports (Screen: `scrReports`)

- Title + subtitle; "Refresh" secondary button.
- "Daily Report (date)" section: 3 stat cards — Active (`#107C10`), Renewals (`#106EBE`), Expired (`#D13438`) — using the same StatCard component.
- Small table "Membership Type / Count" (daily breakdown).
- "Saved Reports" section: DataTable + "Add Report" primary button (schema: Type, Period Start, Period End, Generated At; form adds a Data textarea).

### 3.9 Public membership card (Screen: `scrCard` — standalone, no sidebar)

- Toolbar card: member dropdown + Print + Download PNG buttons (hidden when printing).
- Membership card 340 px: dark gradient `#2B3A55 → #16202F → #0E1520`, 3 px gold border `#D4AF37`, 18 px radius, modal shadow. Contents: circular photo (92 px, gold ring), name, code (uppercase letterspaced, `#B9C6D8`), plan, joined, expiry, days left, status pill, QR in a white rounded tile.
- Print: card only, white background.

### 3.10 TV Kiosk (Screen: `scrKiosk` — full-screen wall display, dark)

- Background: radial glow `#123A63` + gradient `#0A1E33 → #050D18`.
- Branch name heading. Waiting state: "Waiting for {branch} scan..." + live pulse indicator ("Live · listening for scanner", animated blue ring).
- Result banner: huge bold text, 16 px radius, shadow. Allowed = green gradient `#107C10→#0B5C0B`; Expired/Blocked/Not found = red gradient `#D13438→#A51F23`.
- Member card: translucent white tile (`rgba(255,255,255,0.07)`, 18 px radius), round photo with white ring, name, plan, expiry, days left.
- Timestamp muted at bottom.
- **Note:** updates via Server-Sent Events (`GET /api/tv/:branch/stream`). In Power Apps, poll `GET /api/tv/:branch/latest` every 2–3 s with a `Timer` instead (SSE is not available natively).

---

## 4. Status Pill (StatusBadge) — colour map

| Status (exact string from API) | Pill style |
|---|---|
| `Active`, `Approved`, `allowed` | `#DFF6DD` bg / `#107C10` text / `#B7E0B0` border |
| `Pending for Approval`, `Pending`, `Renewing` | `#FFF4CE` bg / `#C24100` text / `#FFE08A` border |
| `Expire`, `Expired`, `blocked`, `Rejected`, `not_found` | `#FDE7E9` bg / `#D13438` text / `#F1BBBE` border |
| `Inactive`, `Converted`, anything else | `#DEECF9` bg / `#106EBE` text / `#C7E0F4` border |
| Unknown / empty | neutral gray |

Pill geometry: rounded pill, 11.5 px semibold, padding 3 px 10 px, 1 px border.

---

## 5. Reusable components (create as a Component Library)

| Component | Properties | Notes |
|---|---|---|
| `cmpHeader` | `Title`, `Subtitle`, `Actions` (slot) | Page title block |
| `cmpStatCard` | `Value`, `Label`, `Icon`, `Color`, `Subtitle` | Icon chip + number |
| `cmpStatusPill` | `Status` | Auto-maps colour per section 4 |
| `cmpDataTable` | `Columns[]`, `Items`, `OnEdit`, `OnDelete` | Shared table look; hover state |
| `cmpEntityForm` | `Schema`, `Initial`, `OnSave`, `OnCancel` | Label-above-input fields |
| `cmpModal` | `Title`, `Width`, children | Overlay `rgba(32,31,30,0.5)` + white card with 4 px blue top border |
| `cmpPrimaryButton` / `cmpSecondaryButton` / `cmpDangerButton` | `Text`, `OnSelect`, `Disabled` | Fluent button styles |

---

## 6. Data sources (existing REST API — build one custom connector)

Auth: login returns `access_token`; send as `Authorization: Bearer <token>`.

| Method | Path | Purpose | Used by |
|---|---|---|---|
| POST | `/api/auth/login` | Login (username, password) → token + user | Login |
| GET | `/api/reports/summary` | Dashboard + Reports summary (stats, recent_checkins, daily_report) | Dashboard, Reports |
| GET | `/api/checkins` | Check-in history | Dashboard (via summary) |
| GET/POST | `/api/scan` (POST body `{ code, branch }`) | Verify member scan | Scanner |
| GET | `/api/members?branch=&status=&membership_type=&search=` | List/filter members | Members, Card page |
| POST | `/api/members` | Create member (supports `allow_direct_approval`) | Member form |
| GET | `/api/members/:id` | Member detail | Details |
| PUT | `/api/members/:id` | Update member | Member form |
| DELETE | `/api/members/:id` | Delete member | Members |
| GET | `/api/members/:id/renewals`, `/api/members/:id/promotions` | History | Details modal |
| GET | `/api/approvals?all=` | Approval list | Approvals |
| POST | `/api/approvals/:id/approve` / `/reject` | Approve / reject | Approvals |
| GET/POST | `/api/renewals` | List / create renewals | Renewals, renew modal |
| POST | `/api/renewals/:id/process` | Approve & extend expiry | Renewals, renew modal |
| GET/POST/PUT/DELETE | `/api/membership-types`, `/api/branches`, `/api/walkins`, `/api/promotions`, `/api/reports` | CRUD for generic entities | Generic screens |
| GET | `/api/members/by-code/:code` | Lookup by code | Renewal lookup, card page |
| GET | `/api/tv/:branch/latest` | Latest scan for TV | TV kiosk (poll) |
| GET | `/api/members.csv` (or `downloadMembersCsv`) | CSV export | Members |

Recommended: expose these as a **Power Apps custom connector** (OpenAPI import from the
backend `/api-docs` if available) or use HTTP action with the bearer token.

---

## 7. Conventions & notes

- One canvas app for the **front desk** (screens 3.1–3.8) + a second small app or
  standalone screens for **public card** (3.9) and **TV kiosk** (3.10).
- Keep the status strings **exact** (case-sensitive) — the pill colours rely on them.
- Date format used throughout the prototype: ISO `YYYY-MM-DD`; display as `YYYY-MM-DD (Nd)`.
- Empty states: italic muted centered text ("No records yet.").
- Loading states: muted "Loading..." with spinner; keep the same message per screen.
- Use the Segoe UI font stack (Power Apps default) — do not import custom fonts.
- Accessibility: every button has a focus ring (`#106EBE` 2 px, offset 1 px); contrast
  of muted text on white ≥ 4.5:1.
