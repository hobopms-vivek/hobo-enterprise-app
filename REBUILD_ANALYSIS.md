# Hobo Enterprise — Mobile App Rebuild: Analysis, Gaps & Scope

**Companion staff app for the Hobo Enterprise hotel PMS.**
This document is the strategic brief behind the full Stitch design prompt (`STITCH_PROMPT.md`). It covers: (1) what the current app is, (2) what the web PMS can do, (3) every gap, (4) exactly what the rebuilt app should and should **not** include, and (5) the new information architecture + design system.

---

## 1. The two products at a glance

| | **hobo-enterprise (web PMS)** | **hobo-enterprise-app (mobile)** |
|---|---|---|
| Stack | Next.js 16, Prisma 7, Postgres, Redis, SSE | Expo SDK 54, RN 0.81, React 19, Zustand |
| Scope | Full property-management system | Field / on-the-ground staff operations |
| Surface | ~74 pages, 358 API routes, 14 modules | 17 screens, ~11 API modules |
| State | Feature-complete, heavily evolved | First-cut, development paused, unpolished |
| Users | Owners, admins, managers, back office + field | Field staff + managers on the move |

The web app grew a **huge** amount after the mobile app was paused: banquet, channel manager, GST engine, document-template engine, city ledger, night audit, WhatsApp bot + workflow builder, escalation engine, notification center, approval flows (delete/cancel), backdated bookings, linen register, day-use/hourly, group bookings, inventory-by-type, activity history, and more. **The mobile app knows about almost none of it.**

The good news: the backend was built *anticipating* a React Native app. Push already fans out to Expo tokens (`PushDevice{kind:"expo"}`), the SSE realtime stream accepts `?token=` for EventSource, and `notifications/links.ts` is a pure module meant to be shared. **The rebuild is a UI/UX + feature-coverage project, not a backend project.**

---

## 2. What the current app has (baseline)

**17 screens**, navy/blue theme, 5 bottom tabs (Dashboard · Tasks · Chats · Alerts · Profile), role-gated by `role.level` (1 SSA → 5 Visitor) and the `whatsapp` module.

- **Auth:** Login only (prints raw API base on screen; no forgot-password/biometric).
- **Dashboard:** shift-less home — my-work stats, today-at-hotel, manager KPIs, in-house preview, quick-action grid.
- **Tasks (service tickets):** the strongest area — New/In-Progress/Done tabs, SLA countdown, the field workflow (Start → Complete → manager Approve/Reject), create task, QR-scan-to-create, ticket detail with photos + assignment timeline, reassign/transfer.
- **Chats:** 1:1 staff DM (polls every 5s, no SSE).
- **Alerts:** notification list (manager-only, no realtime — only the badge count polls).
- **Profile:** avatar upload, on-shift toggle, hotel switch, sign out.
- **Team:** roster + per-member shift toggle (N+1 presence fetches).
- **Front Desk:** **read-only** board (arrivals/departures/in-house/upcoming/balance) — no actions.
- **Housekeeping:** simplified status cycle (Dirty→Clean→Inspected) — **not** the real state machine.
- **Inventory / Blocked Rooms:** read-only stubs.

### Structural weaknesses to fix in the rebuild
- ~10 screens re-declare their own inline styles instead of a shared component library.
- No skeleton loaders, no empty-state art, no dark mode, no i18n, no accessibility labels.
- No offline queue (only an "offline" banner), no global search, no in-app settings.
- Realtime is under-used: Chat polls, Alerts has no live updates, several SSE events are declared but never handled.
- Hotel switching only lives in Profile; no header-level switcher.
- Login ships a debug affordance; config placeholders (`REPLACE-WITH-YOUR-PROD-DOMAIN`) still present.

---

## 3. What the web PMS does that the app is missing

Ranked by field relevance. **This is the gap list.**

### A. Big functional gaps (staff genuinely need these on a phone)
1. **Front Desk is view-only.** Missing: check-in, check-out, walk-in / day-use, room move & upgrade, extend stay, the Room-Peek action drawer, collect-at-desk payment. This is the single biggest gap.
2. **Housekeeping is a toy version.** The real board is a state machine: Start cleaning → Cleaning → Mark done → **Inspected (awaiting approval)** → manager **Approve/Reject**, plus manual **DND** toggle, **Out-of-order** block/restore, HK **task assignment** + task list, back-to-back (B2B) flags, and a per-day occupancy overlay.
3. **No Guest Inbox.** The web has a unified guest conversation inbox (WhatsApp + OTA: Airbnb/Booking/MMT/Agoda/Direct) with quick replies, the 24-hour WhatsApp-window warning, guest context (booking, history, VIP). App only has staff chat.
4. **No Reservations.** Can't search/browse bookings, open a booking detail, create a booking, glance the calendar, or run row actions (no-show, cancel / request-cancel, request-delete).
5. **No Collect Payment / Folio.** The universal Collect-Payment drawer (cash / UPI / split tender / **Razorpay link → WhatsApp/Email → live poll**) and the folio view are absent.
6. **No Banquet.** Today's events, event check-in/check-out, collect balance, event detail.
7. **No Guest profiles.** Lookup, VIP flags, ID scan/verify, stay history, merge.
8. **No Approvals inbox.** Managers can't approve/reject the booking/banquet **deletion & cancellation requests** that the web routes to them.

### B. Notification & realtime gaps
9. **Notifications center is thin & manager-only.** The web emits **60+ notification types** across 16 categories with deep-links (all in the shared `links.ts`). The app should have a first-class, all-roles notification center: grouped Today/Earlier, category color accents, mark-read/mark-all/clear, deep-link to the right screen.
10. **Escalation siren exists but is under-built.** Keep and elevate it to a full-screen ringing overlay (it already routes `escalation.mp3` for L≤2 and `talktomanager.mp3` for L3).
11. **Live updates missing** on Chat (poll→SSE) and Alerts (no SSE at all). Wire the full event set: `ticket.assigned/escalated/updated/overdue/cancelled`, `chat.message`, `presence.changed`, `housekeeping.approval`, `feedback.created`, `lead.updated`, `booking/banquet.*_request`, generic `notification`.

### C. Field-useful secondary gaps
12. **Inventory / Linen** are read-only. Add stock movement + low-stock alerts; the **linen daily register** (In Stock / In Use / In Laundry / Damaged, ISSUE / TO_LAUNDRY / FROM_LAUNDRY, PAR levels).
13. **No Cashier shift** open/close.
14. **No Reports glance** for managers (occupancy / ADR / RevPAR / revenue mini-dashboard beyond the home KPIs).
15. **No Leads** (assigned-to-me), **no Reviews/Feedback** triage.
16. **No global search** (guests, bookings, rooms, tickets, invoices).

### D. Platform / UX gaps
17. Forgot-password + **biometric unlock** (Face ID / fingerprint).
18. **Dark mode**, skeleton loaders, empty-state illustrations, toasts, haptics.
19. **Header hotel-switcher**, in-app **Settings** (notification prefs, sound, appearance), and an **offline queue** for actions taken with no signal.
20. Deep-linking from push straight into the target screen (partially there for tickets).

---

## 4. Recommended app scope — include only what belongs on a phone

The user's instruction: *don't shove the whole web app into the phone — include what field staff actually need, not too much, not too little.* Here is the decision matrix.

### ✅ INCLUDE (the rebuilt app)
**Core (every build):**
- Auth: Login, Forgot password, Biometric unlock, Hotel switcher
- Home dashboard (role-aware: attendant "my work" vs. manager "ops + KPIs") with **shift status front and center**
- **On-shift clock in/out** (precondition for receiving tasks — must be one tap from anywhere)
- **Service Tickets** (the centerpiece): list (New/In-Progress/Done + filters + SLA), detail (workflow steps, photos, timeline), create, QR-scan-to-create, history, manager approve/reject/reassign/transfer
- **Housekeeping** full board: floor plan + list, room state machine, DND, out-of-order, inspect/approve, HK task assign + list
- **Front Desk** actions: arrivals/departures/in-house/upcoming, check-in, check-out, walk-in/day-use, room move/upgrade, extend, Room-Peek drawer
- **Collect Payment** drawer + Folio view
- **Notifications center** (all roles) + **Escalation overlay**
- **Inbox**: Staff chat (SSE) + Guest inbox (WhatsApp/OTA) with quick replies
- **Profile / Menu**: avatar, shift, hotel switch, settings, team, sign out

**Should-have (field-relevant):**
- **Reservations**: list/search, booking detail, quick actions, calendar glance, create booking
- **Banquet**: today's events, event detail, check-in/out, collect balance
- **Guests**: lookup, profile, VIP, ID scan/verify, history
- **Approvals inbox**: deletion/cancellation requests (manager one-tap)
- **Team & Presence**: roster, live on-shift dots, manager toggle
- **Inventory & Linen**: quick counts, stock movement, low-stock, linen register
- **Blocked / out-of-order rooms**
- **Reports glance** (manager): occupancy/ADR/RevPAR/revenue mini
- **Global search**

**Nice-to-have:**
- Cashier shift open/close, Leads (mine), Reviews/Feedback triage, light owner/portfolio glance

### ❌ LEAVE ON WEB (back-office desktop work — do NOT port)
- Night audit run, journal, GST/CA/tax reports, city-ledger management, invoice batches
- Channel manager configuration, rate plans, seasons, time-pricing, promotions
- All `setup/*` config: rooms, room-types, floors, departments, amenities, tax slabs, payment methods/gateways, booking policies/sources, custom fields, document types, composite rooms
- WhatsApp **bot menu builder**, template manager, broadcasts, escalation **workflow builder**
- Document-template engine, email templates
- User / role / permission administration
- Chain analytics / multi-property command center (a light read-only glance is optional)
- Bulk operations (bulk reservation / bulk check-in / bulk check-out multi-room grids)

**Principle:** the phone is for *doing the job on the floor* (tasks, rooms, guests, payments, messages) and *staying informed* (alerts, KPIs). It is not for *configuring the property* or *closing the books*.

---

## 5. New information architecture (the rebuild)

**5 bottom tabs + a floating center action button + a header menu.**

```
┌───────────────────────────────────────────────┐
│  Header: [Hotel ▾]        [🔍]  [🔔•]  [avatar] │  ← sticky, gradient on Home
├───────────────────────────────────────────────┤
│                                                 │
│                 (screen content)                │
│                                                 │
├───────────────────────────────────────────────┤
│   ⌂ Home   ✔ Tasks   (＋)   ⌘ Ops   ✉ Inbox    │  ← center FAB = quick actions
└───────────────────────────────────────────────┘
```

- **Home** — role-aware dashboard; shift card; my work / today / KPIs; alerts preview; quick-action grid.
- **Tasks** — service tickets (list, detail, create, scan, history).
- **＋ (center FAB)** — context sheet: New Task · Walk-in · Check-in · Collect Payment · Scan QR.
- **Ops** — operations hub → Front Desk, Housekeeping, Reservations, Banquet, Guests, Inventory/Linen, Blocked Rooms, Approvals, Reports.
- **Inbox** — segmented: **Team** (staff chat) / **Guests** (WhatsApp+OTA) / and a badge that also surfaces **Alerts** (or keep Alerts on the bell in the header).
- **Header bell 🔔** — Notifications center (all roles). **Header avatar** — Profile / Menu (hotel switch, shift, team, settings, sign out).
- **Escalation overlay** — global, above everything, when a ticket escalates to me.

Role gating (unchanged model): `level ≤ 3` = manager (KPIs, approvals, team toggle, create/assign), `level ≤ 4` = working staff (own tasks, chat, shift), `level 5` = read-only. Screens/tabs hide by role + `enabledModules`.

---

## 6. Design system direction (professional rebuild)

Keep the navy/blue brand equity, but modernize to a clean, spacious, high-contrast system with **light + dark** support.

- **Color** — Brand navy `#0B2A5B`, primary blue `#2A68D3`; semantic green/amber/red/violet/teal; neutral bg `#F4F6FB` (dark `#0B1220`), surface white (dark `#131C2E`), border `#E2E8F0` (dark `#22304A`), text `#0F172A` (dark `#E7ECF5`), muted `#64748B`. Hero headers use a navy→blue gradient.
- **Type** — Inter / SF Pro. Display-bold section titles, big tabular numerals for stats, medium labels, calm body. Generous line-height.
- **Shape & depth** — cards radius 16, pills 999, buttons 12–14; hairline borders + one soft navy-tinted shadow; roomy 16–20px padding.
- **Components (shared library, no more inline dup):** Card, ListRow (leading icon/avatar chip), StatTile, KpiCard (with delta), Pill/StatusBadge (tinted), SegmentedTabs, FilterChips, SectionHeader, BottomSheet/Drawer, FAB + speed-dial, EmptyState (illustration), Skeleton shimmer, Toast/Snackbar, SearchBar, Avatar, ShiftToggle, PaymentSheet, PhotoGrid, Timeline, Countdown/SLA pill, RoomCell, FloorPlan grid.
- **Motion** — subtle: card press-scale, sheet slide-up, shimmer load, badge pulse for live/escalation, haptics on key actions.
- **Iconography** — line icons, 2px stroke (Lucide/Ionicons).

The complete, copy-paste **Stitch prompt** (global style block + every screen) is in **`STITCH_PROMPT.md`**.
