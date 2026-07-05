# Hobo Enterprise Staff App — Complete Stitch Design Prompt

Paste **Part 1 (Global Style)** into Stitch first to lock the design system, then generate each screen from **Part 2** (each screen prompt already restates the essentials, so they also work standalone). Screens are grouped by area. Generate in the order given for the most consistent results.

> How to use: In Stitch, choose **Mobile app**. Paste the Global Style block. Then, one at a time, paste a screen block (they start with `### SCREEN:`). To batch, you can paste a whole section header + its screens.

---

## PART 1 — GLOBAL STYLE (paste first)

```
Design a modern, professional mobile app (iOS + Android) called "Hobo Enterprise" — a field-operations app for hotel staff and managers. The mood is clean, calm, spacious, high-contrast and trustworthy — an enterprise product that still feels friendly. Support BOTH light and dark mode.

BRAND & COLOR
- Brand navy #0B2A5B, primary action blue #2A68D3. Hero headers use a smooth navy→blue gradient (#0B2A5B → #2A68D3).
- Semantic colors: success/clean/on-shift green #10B981, in-progress/dirty/warning amber #F59E0B, escalated/critical/error red #EF4444, occupied/departures violet #8B5CF6, info teal #06B6D4.
- Light mode: background #F4F6FB, surface/cards #FFFFFF, hairline border #E2E8F0, text #0F172A, muted text #64748B.
- Dark mode: background #0B1220, surface/cards #131C2E, border #22304A, text #E7ECF5, muted #94A3B8.

TYPOGRAPHY
- Clean geometric sans (Inter / SF Pro). Bold display section titles, large tabular numerals for stats/money, medium 600 labels, calm regular body. Generous line-height.

SHAPE, DEPTH & SPACING
- Cards: 16px radius, hairline border + one soft navy-tinted shadow. Pills/chips: fully rounded (999). Buttons: 12–14px radius. Roomy 16–20px padding, comfortable 12–16px gaps.
- Status/priority shown as tinted "pills": pale colored background + saturated colored text (e.g. green pill = #10B98122 bg, #10B981 text).

COMPONENTS (reuse everywhere)
- Sticky top header: left = hotel switcher pill "Hotel name ▾", right = search icon, notification bell with red unread dot, and a round user avatar. On Home the header is the navy→blue gradient; on inner screens it's a solid surface with a back chevron + title.
- Bottom tab bar with 5 items and a raised circular blue "+" action button in the center: Home, Tasks, (+), Ops, Inbox. Active tab = blue icon + label; inactive = muted.
- Cards, list rows with a leading rounded icon/avatar chip, stat tiles (icon chip + big number + label), KPI cards (label + big value + up/down delta pill + tiny sparkline), segmented tab controls, horizontal filter chips, section headers with an optional trailing action, bottom-sheet drawers, floating action button with speed-dial, empty states with a simple line illustration, skeleton shimmer loaders, toast/snackbar, avatars with online dot.
- Icons: thin line icons, ~2px stroke.

MOTION (imply in states)
- Subtle press-scale on cards, slide-up bottom sheets, shimmer while loading, a gentle pulse on live/unread badges and on the escalation alert.

Every screen: mobile portrait, safe-area aware, bottom tab bar visible unless it's a full-screen flow/sheet. Show realistic hotel data (room numbers, guest names, ₹ INR amounts, times).
```

---

## PART 2 — SCREENS

### AUTH & SHELL

### SCREEN: Splash
```
Splash screen for the Hobo Enterprise staff app. Full-bleed navy→blue gradient (#0B2A5B → #2A68D3). Centered white app logo mark inside a soft rounded square, the wordmark "Hobo Enterprise" below in white bold, and a small subtitle "Staff & Operations". A subtle thin progress indicator near the bottom. Minimal, premium.
```

### SCREEN: Login
```
Login screen. Top third is a navy→blue gradient with the centered logo, "Welcome back" heading and "Sign in to your hotel" subtitle. Below, a white rounded card floating over the background containing: Email field (with mail icon), Password field (with lock icon + show/hide eye), a "Forgot password?" link aligned right, and a full-width blue "Sign in" button. Under the button a subtle "Unlock with Face ID / fingerprint" secondary option with a biometric icon. Support dark mode. Clean, no debug text.
```

### SCREEN: Forgot Password
```
Forgot password screen. Solid surface header with back chevron and title "Reset password". Body: a friendly line illustration of an envelope/lock, a short helper sentence "Enter your email and we'll send a reset link.", an Email field, and a full-width blue "Send reset link" button. A success state variant shows a green check illustration and "Check your inbox" message.
```

### SCREEN: Hotel Switcher (bottom sheet)
```
A bottom-sheet drawer titled "Switch hotel" with a grab handle. A search field at top, then a scrollable list of hotel rows: each row has a rounded hotel icon chip, hotel name (bold), city + role subtitle (e.g. "Mumbai · Manager"), and a blue check on the currently active hotel. A small "Chain / Portfolio" section header separates parent hotels. Tapping a row selects it. Clean, generous row height.
```

---

### HOME

### SCREEN: Home — Manager
```
Home dashboard for a hotel MANAGER. Sticky navy→blue gradient header: left hotel switcher pill "Sea Pearl Resort ▾", right search icon + notification bell (red dot) + avatar. Below the header inside the gradient: greeting "Hi, Aarav 👋" and role line "Manager · Mumbai".

Scroll body on #F4F6FB:
1) SHIFT CARD — a prominent white card: left a green pulse dot + "You're On shift · until 6:00 PM", right a pill toggle "On shift" (green, switched on). Tapping toggles.
2) "My work" section — 3 stat tiles in a row: New/Assigned (blue), In Progress (amber), Escalated (red) with counts.
3) "Today at the hotel" — 2×3 grid of small stat tiles with icon chips: Arrivals (12), In-house (48), Departures (9), Arriving · 7 days (37), Open tickets (5), To collect ₹1.2L (teal).
4) "Performance · last 7 days" — 2×2 KPI cards each with big value, up/down green/red delta pill and a tiny sparkline: Occupancy 82%, ADR ₹4,850, RevPAR ₹3,977, Revenue ₹8.4L.
5) "In-house now" card — a short list (4 rows): room chip (e.g. "204"), guest name, "Deluxe · 2 nights", right-aligned balance ₹.
6) "Quick actions" — 2-column grid of tappable tiles with icon + label: Front Desk, Housekeeping, New Task, Collect Payment, Reservations, Scan Room.
Bottom tab bar with center + button. Support dark mode.
```

### SCREEN: Home — Attendant (staff)
```
Home dashboard for a field ATTENDANT (housekeeping/room-service). Same gradient header (hotel pill, search, bell, avatar) and greeting "Hi, Priya 👋 · Housekeeping".
Body:
1) Large SHIFT CARD — green "On shift" toggle with "Go on shift to receive tasks" helper when off; when on shows "You're On shift".
2) "My tasks" — 3 stat tiles: To do, In progress, Done today.
3) "Up next" card — the single highest-priority assigned ticket as a rich card: code TKT-1043, a red "critical" pill, subject "AC not cooling – Room 305", SLA countdown "12m left", and two buttons "Start" and "Open".
4) "My rooms today" (if housekeeping) — horizontal scroll of room chips colored by status (dirty amber, cleaning blue, clean green).
5) "Quick actions" grid: My Tasks, Housekeeping, Scan Room, Chat.
No financial/KPI cards for this role. Clean, focused, large tap targets.
```

---

### TASKS / SERVICE TICKETS

### SCREEN: Tasks — List
```
Service tickets list screen ("Tasks"). Header: title "Tasks", right side a QR-scan icon and a "+" icon (managers). Under the header a segmented control with counts: "New 6 · In progress 3 · Done 12". Below it a horizontal row of filter chips: Priority, Department, Assignee (Me/Unassigned), Channel, and a "Sort: SLA due" chip.
Scrolling list of ticket cards, each: top row = ticket code (TKT-1043) + a colored status pill (Escalated red / Assigned blue / In progress amber). Subject line bold ("Extra towels – Room 214"). Meta row = priority pill, category tag, guest name, and an SLA countdown pill ("08m left", turns red when overdue). Inline action button at the right depending on state: "Start" or "Complete". A red left border accent on escalated tickets. Empty state variant with illustration "No tasks here — you're all caught up". Skeleton shimmer loading variant.
```

### SCREEN: Task Detail
```
Service ticket detail screen. Solid header with back chevron, title "TKT-1043", and a status pill. 
Body cards:
1) HEADER card: subject bold, a row of pills (priority "critical" red, category "Maintenance"), workflow step indicator, and a small "re-attempt ×1" chip if any.
2) GUEST card: avatar, guest name, room chip "305", phone with a call icon.
3) DESCRIPTION card: the request text.
4) PHOTOS card: a 3-up grid of thumbnails + an "Add photo" dashed tile (camera).
5) ACTION card: a big primary button that changes by state — "Start" → "En route" → "Arrived" → "Complete task"; plus a subtle "Couldn't complete" link. For managers on a done task: green "Approve" + outline "Reject" buttons; also "Reassign" and "Transfer to department" text buttons.
6) TIMELINE card: a vertical assignment log — dots connected by a line, each entry "Assigned to Priya · 2:14 PM", "En route · 2:20 PM", with actor + reason.
Support dark mode.
```

### SCREEN: Task — Complete / Not-completed sheet
```
Bottom sheet for finishing a task. Two tabs: "Delivered" and "Couldn't complete". Delivered tab: a big green check illustration, an optional note field, a photo thumbnail strip with camera add, and a green "Mark completed" button. Couldn't-complete tab: a reason dropdown (Guest not in room / Item unavailable / Access denied / Other), a note field, and an amber "Mark not completed (re-attempt)" button.
```

### SCREEN: Create Task
```
Create service task screen (manager). Header "New Task" with back chevron. If launched from a QR scan, a blue banner at top "For Room 204". Form card: Subject field (required), a horizontal chip selector for Category (Request, Complaint, Urgent, Maintenance, F&B, Lost & Found), a chip selector for Priority (Low, Normal, High, Critical — active chip colored), a Department picker row (opens a sheet), two side-by-side numeric fields "Completion timer (min)" and "SLA / escalate (min)" with a small helper caption, a Guest search row (optional), and a multiline Description. Sticky bottom "Create task" blue button.
```

### SCREEN: QR Scan
```
Full-screen room QR scanner. Live camera view dimmed at the edges with a bright rounded square scan frame in the center and animated scan line. Top overlay: back chevron + title "Scan room". Helper text under the frame "Point at the room QR to create a task". A subtle "Enter room number manually" text button at the bottom. On success, a small toast "Room 204 detected".
```

### SCREEN: Task History
```
Task history screen. Header "History" with a filter icon. Filter chips: Date range, Category, Status (Resolved/Closed). A list of completed ticket cards (muted styling): code, green "Resolved" or grey "Closed" pill, subject, "Maintenance · 3 Jul, 4:12 PM". Grouped by day with sticky date headers. Empty state "No history yet".
```

### SCREEN: Reassign / Transfer (bottom sheet)
```
A bottom sheet with two segmented tabs "Reassign" and "Transfer". Reassign tab: a search field then a list of staff rows — avatar, name, role, a green on-shift dot, and a small "3 open" workload badge; least-busy sorted, a radio select. Transfer tab: a list of departments with icons (Housekeeping, Maintenance, F&B, Front Desk) as selectable rows. Sticky bottom blue "Confirm" button.
```

---

### OPS HUB

### SCREEN: Ops Hub
```
Operations hub landing (the "Ops" tab). Header "Operations". A 2-column grid of large module cards, each with a colored icon chip, title, and a one-line status/count: Front Desk ("12 arrivals today"), Housekeeping ("8 dirty rooms"), Reservations ("37 upcoming"), Banquet ("2 events today"), Guests, Inventory & Linen ("3 low stock"), Blocked Rooms, Approvals ("2 pending" red badge), Reports. Cards are gated by role/modules (hidden if not permitted). Clean, tappable, spacious.
```

---

### FRONT DESK

### SCREEN: Front Desk — Board
```
Front Desk board. Header "Front Desk". A summary strip of 4 mini stats: In-house 48, Arrivals 12, Departures 9, To collect ₹1.2L (teal). Below, a horizontal segmented pill tab bar with counts: Arrivals · In-house · Departures · Upcoming · Balance due. 
List of guest cards for the active tab: left a room chip ("204") or "unassigned" ghost chip, guest name bold, "Deluxe · 2 nights · Booking BK-9921", and a right-side action: for Arrivals a blue "Check in" button + a "Collect" link; for Departures a "Check out" button; for In-house a status pill and balance; for Day-use rows a live "1h 12m left" countdown pill (amber, red when overtime) with an "Extend +1h" chip. A floating "+" speed-dial (Walk-in, Check-in, Scan). Skeleton + empty states.
```

### SCREEN: Check-In flow
```
Check-in screen (multi-section, scrollable, sticky bottom bar). Header "Check in · BK-9921".
Sections as cards:
1) STAY: arrival/departure dates, nights, room type, and a "Assign room" row that opens a picker of vacant+clean rooms as selectable chips grouped by type.
2) PRIMARY GUEST: name, phone, ID type dropdown + ID number, an "ID photo" capture tile, adults/children steppers, purpose of stay.
3) ADDITIONAL GUESTS: a compact repeatable list "+ Add guest".
4) CHARGES: early check-in fee toggle (flat / per-hour), miscellaneous charge add rows, and a live total with GST breakdown.
5) PAYMENT: method selector (Cash / UPI / Card / Split / Send link), amount, and toggles "WhatsApp receipt" + "Email receipt".
Sticky bottom: total on the left, big green "Check in" button on the right.
```

### SCREEN: Check-Out flow
```
Check-out screen. Header "Check out · Room 204". 
1) FOLIO SUMMARY card: guest, nights, a line-item list (Room, F&B, Misc) with amounts, taxes, and a bold Balance due ₹ figure (green if zero).
2) LATE CHECK-OUT card: auto-detected late fee with a toggle to waive.
3) ADD CHARGES: quick add incidental charges (Minibar, Laundry, Damages…) with amount fields.
4) PAYMENT: settle balance — method selector + "Collect ₹X" button, or "Send payment link".
5) DOCUMENTS: toggles "Generate GST invoice", "Send receipt", "Request review".
Sticky bottom: "Post charges only" outline button + green "Check out" button.
```

### SCREEN: Walk-in / Day-use
```
New walk-in booking screen. Header "Walk-in". A segmented control at top "Overnight / Day-use / Hourly". Form: room type + room picker, arrival now (with editable date/time for backdated — shown only if permitted), nights or hours stepper, guest details (name, phone, ID), adults/children, rate preview card with GST, and a payment section. For Day-use/Hourly show an auto "checkout by 4:30 PM" chip. Sticky bottom green "Create & check in".
```

### SCREEN: Room Peek (bottom sheet)
```
A bottom sheet that appears when tapping a room on the board or floor plan. Header: big room number "305", room type "Deluxe", and an occupancy/HK status pill row (Occupied violet, Clean green). If occupied: guest name, nights, balance. A grid of quick action buttons with icons: Check out, Extend stay, Upgrade / Move, Open folio, Collect payment, Block room, and housekeeping transitions (Start cleaning / Mark done / Approve / Reject) depending on state. Vacant rooms show Walk-in here + Block. Clean, tap-friendly.
```

### SCREEN: Upgrade / Move Room
```
Upgrade or move room screen. Header "Upgrade / Move · Room 204". Shows current room and a target room picker grouped by type (same type = "Move", higher type = "Upgrade" with a supplement amount shown). A supplement charge summary card with GST, a toggle "Collect now / Add to folio", and a "Notify guest on WhatsApp" toggle. Sticky bottom "Confirm move / upgrade" button.
```

### SCREEN: Extend Stay (sheet)
```
Extend stay bottom sheet. Current checkout date, a stepper "+ nights" (or "+ hours" for day-use), an editable extension charge with GST preview, a new checkout date chip, and a "Collect now / Settle later" toggle. Green "Extend stay" button.
```

---

### HOUSEKEEPING

### SCREEN: Housekeeping — Board
```
Housekeeping board. Header "Housekeeping" with a day selector chip (Today / Tomorrow / date) and a segmented toggle "List / Floor plan". A row of 8 small stat cards (horizontal scroll): Vacant Clean, Occupied, Dirty Vacant, Cleaning, Awaiting approval, Out of service, Out of order, Back-to-back ⚡. Filter chips: All, Dirty, Cleaning, Inspected, Out of service, DND.
LIST view: 2-column grid of room cards — room number bold, a status dot, room type + floor, two small pills (HK status + occupancy), and a context action button ("Start cleaning" / "Mark done" / "Approve" / "Restore"). 
Provide a FLOOR PLAN variant too: rooms grouped by room type into labeled sections, each room a compact square tile colored by HK status with the number and tiny DND / B2B badges.
```

### SCREEN: Room Status (bottom sheet)
```
Housekeeping room action sheet. Big room number "312", room type + floor, current HK status pill and occupancy pill. A vertical stack of action buttons matching the state machine: "Start cleaning", "Mark done (send for inspection)", manager-only "Approve" (green) / "Reject (re-clean)" (red), a "Do Not Disturb" toggle for occupied rooms, and "Mark out of service" / "Restore to service". Below, an optional note field and an assignee row. Clean.
```

### SCREEN: Housekeeping — Assign Task
```
Assign housekeeping task screen. Header "Assign cleaning". Fields: Room picker, Task type chips (from setup: Full clean, Touch-up, Turndown, Deep clean, Linen change), Assignee picker (staff list with on-shift dots), Priority chips (Low/Normal/High), and a Notes field. Sticky bottom "Assign task" button. A secondary "My HK tasks" list variant showing assigned rooms with status dropdowns (Pending / In progress / Awaiting approval / Approved / Rejected).
```

---

### RESERVATIONS

### SCREEN: Reservations — List
```
Reservations list. Header "Reservations" with a search icon and a "+" (new booking). A segmented status tab bar with counts: All · Confirmed · In-house · Departed · Cancelled. Filter chips: Date, Source, Room type. A toggle "Bookings / Groups". 
List of booking cards: code BK-9921, guest name bold, a status pill, "Deluxe · 12–14 Jul · 2 nights", source chip (OTA/Direct), and right-aligned balance. Swipe or a "⋯" reveals row actions: Mark no-show, Cancel / Request cancel, Request delete, Open. Skeleton + empty states.
```

### SCREEN: Booking Detail
```
Booking detail screen. Header with code "BK-9921" + status pill. 
Cards: STAY (dates, nights, room type + assigned room, source, rate plan), GUEST (name, phone, VIP badge, ID), PARTY (adults/children + additional guests), FOLIO SUMMARY (charges, payments, balance) with an "Open folio" button, and an ACTIONS row: Check in / Check out, Extend, Upgrade/Move, Collect payment, Cancel/Request, Delete/Request. Managerial money shown only to managers.
```

### SCREEN: Booking Calendar
```
Booking calendar (month glance). Header "Calendar" with month navigation. A month grid where each day cell shows small colored bars/dots for arrivals (green), departures (violet) and occupancy load. Tapping a day opens a bottom list of that day's arrivals/departures. A compact legend. Optional week strip view.
```

### SCREEN: Create Booking
```
Create reservation screen. Header "New booking". Sections: dates (check-in → check-out with an auto next-day default), room type + rate plan pickers, occupancy steppers (adults/children), guest details (search existing or new: name, phone, ID), source dropdown (Direct default / OTA), optional bill-to company row, a live price quote card with GST breakdown, and an advance payment section. Sticky bottom "Create booking".
```

---

### BANQUET

### SCREEN: Banquet — Events
```
Banquet events screen. Header "Banquet". Segmented tabs "Today / Upcoming / Calendar". A list of event cards: event name bold ("Sharma Wedding"), a status pill (Confirmed / Checked-in / Tentative), hall + slot ("Grand Ballroom · 6–11 PM"), guaranteed pax, and a balance-due chip. Right-side action "Check in" / "Check out" by state. A calendar variant shows a date grid of events. Floating "+ New enquiry".
```

### SCREEN: Banquet Event Detail
```
Banquet event detail. Header event name + status pill + a lifecycle stepper (Enquiry → Confirmed → Checked-in → Checked-out). 
Cards: EVENT (type, hall, slots, date/time, guaranteed vs actual pax, setup style), CONTACT (name, phone), MENU (thumbnail of menu image/PDF), LINE ITEMS (catering/decor/AV rows with qty × price), PAYMENTS (advance + balance with a "Collect balance" button), and lifecycle action buttons "Check in" / "Check out" with WhatsApp/Email receipt toggles.
```

---

### GUESTS

### SCREEN: Guests — List / Search
```
Guests directory. Header "Guests" with a prominent search bar (name / phone / booking). Filter chips: VIP, In-house, Repeat. List rows: avatar with initial, guest name bold, phone, and small badges (VIP gold, verified-ID green check, repeat). Alphabetical section headers. Empty + skeleton states.
```

### SCREEN: Guest Profile
```
Guest profile screen. Header with the guest's name + a VIP pill. Top: avatar, name, phone, email, and status badges (VIP, Blacklisted, Verified ID). 
Cards: ID & DOCUMENTS (ID type/number, photo thumbnail, a "Scan / capture ID" button, verified toggle), STAY HISTORY (list of past stays: dates, room, amount, rating), CURRENT BOOKING (if any, tappable), PREFERENCES / TAGS chips, and INTERACTIONS timeline. Actions: Edit, Merge duplicate, New booking.
```

### SCREEN: ID Scan / Capture
```
ID capture screen. Full-screen camera with a document-shaped guide frame and helper "Fit the ID inside the frame". Capture button, gallery pick, and a flip-camera control. After capture: a review screen showing the cropped ID image, auto-filled fields (name, ID number, type) to confirm/edit, and a green "Save & verify" button.
```

---

### PAYMENTS

### SCREEN: Collect Payment (bottom sheet / screen)
```
Collect payment screen. Header "Collect payment" with the context ("Room 204 · Balance ₹3,540"). A large amount field prefilled with the balance (editable), a method selector as big tappable tiles: Cash, UPI, Card, Split, Send link. 
- Split shows two+ method rows that sum to the total.
- Send link shows a preview of a Razorpay link with "Copy", "WhatsApp", "Email" buttons and, after sending, a live status card "Waiting for payment…" with a spinner and a countdown that flips to a green "Paid ✓" state.
Purpose chip (Advance / Checkout / Upgrade). Sticky bottom green "Record payment".
```

### SCREEN: Folio
```
Folio screen for a booking. Header "Folio · BK-9921". A running statement: grouped charge rows (Room, F&B, Minibar, Misc, Discount) with dates and amounts, a taxes line, a bold Balance figure, and a payments section listing received payments with method + time. Buttons: "Add charge", "Collect payment", "Generate invoice". Voided charges show struck-through. Clean tabular layout with tabular numerals.
```

---

### INVENTORY & LINEN

### SCREEN: Inventory — List
```
Inventory screen. Header "Inventory" with search. Filter chips by category. List rows: item name bold, a category pill, "Unit: pcs · Reorder at 20", and a right-side stock number that turns red with a "Low" badge when below reorder level. A "+" to record a stock movement. Empty + skeleton states.
```

### SCREEN: Inventory — Item / Stock Movement (sheet)
```
Stock movement bottom sheet for an item. Item name + current stock big number. Segmented movement type (Receive / Issue / Adjust / Write-off), a quantity stepper, an optional store/location picker, a note field, and a "Record" button. Shows PAR / reorder level and a mini recent-movements list.
```

### SCREEN: Linen Register
```
Daily linen register. Header "Linen" with a date chip (business day, 6 AM boundary). A list of linen items, each a card with four bucket counts shown as colored stat chips: In Stock (green), In Use (blue), In Laundry (amber), Damaged/Lost (red), plus PAR level. Each card has quick action buttons: "Issue", "To laundry", "From laundry". A summary header shows totals. Clean, count-focused.
```

### SCREEN: Blocked / Out-of-order Rooms
```
Blocked rooms screen. Header "Blocked rooms". List of cards: room chip + number, a block-type pill (Maintenance / Out of order / VIP hold / Deep cleaning / Owner use — amber), reason text, reported-by, and a date range "12 Jul → 15 Jul". A "Restore to service" button per card and a "+ Block a room" FAB.
```

---

### APPROVALS

### SCREEN: Approvals Inbox
```
Approvals inbox for managers. Header "Approvals" with a red count badge. Segmented tabs "Deletions / Cancellations". List of request cards: a warning icon chip, the request type ("Booking deletion request"), the target (BK-9921 · guest name), the requesting staff + reason quote, and time. Two buttons per card: green "Approve" and outline "Reject" (reject opens a reason field). Empty state "Nothing to approve". Applies to both bookings and banquet events.
```

---

### INBOX & MESSAGING

### SCREEN: Inbox — Landing
```
Inbox landing (the "Inbox" tab). Header "Inbox" with a search icon. A segmented control "Team · Guests". 
TEAM view: list of staff chat threads — circular avatar with initial + online dot, name bold, last message preview (bold if unread), relative time, and an unread count badge.
GUESTS view: list of guest conversation threads with a channel badge (WhatsApp green, Airbnb, Booking.com, MMT, Direct), guest name, last message, unread badge, and a small "24h window" amber clock icon when the WhatsApp session is closing. Empty + skeleton states.
```

### SCREEN: Staff Chat Room
```
1:1 staff chat screen. Header: counterpart avatar + name + on-shift dot, a call icon. Message list: inbound bubbles left (surface, bordered), outbound bubbles right (blue), timestamps, day separators, read receipts. Sticky composer: multiline text field, attach icon, and a circular blue send button. Typing indicator. Dark mode supported.
```

### SCREEN: Guest Conversation
```
Guest conversation screen (WhatsApp/OTA). Header: guest name + a channel badge (WhatsApp) + a "24h window: 3h left" amber pill. Right side an info icon that opens a guest context panel. Message list with inbound/outbound bubbles, message-kind tags (menu / template / tapped-option), and images. A row of canned quick-reply chips above the composer. Composer with attach + send. When the 24h window is closed, the composer is replaced by a "Send template message" button.
```

### SCREEN: Guest Context (side panel / sheet)
```
Guest context panel that slides from the right on a guest conversation. Cards: GUEST (avatar, name, phone, VIP badge), CURRENT BOOKING (room, dates, tappable), HISTORY (stays count, total spend, last visit, avg rating), TAGS chips (VIP, Repeat, Verified ID), and quick actions "Create task", "Open profile".
```

---

### NOTIFICATIONS & ALERTS

### SCREEN: Notifications Center
```
Notifications center (opened from the header bell). Header "Notifications" with a "Mark all read" text button. Grouped sections "Today" and "Earlier" with sticky headers. Rows: a category-colored round icon chip (tickets blue, escalations red, housekeeping green, bookings violet, payments teal, chat blue, approvals amber), a bold title, a 2-line body, and relative time. Unread rows have a tinted background + a blue dot and a subtle left accent. Tapping deep-links to the relevant screen; swipe to delete. A category filter chip row at top (All, Tickets, Rooms, Bookings, Payments, Messages). Empty state "You're all caught up 🎉".
```

### SCREEN: Escalation Alert (full-screen overlay)
```
A full-screen urgent alert overlay that appears when a ticket escalates to the user. Pulsing red (or navy for a manager tier) radial background, a large warning/siren icon, big text "Escalated to you", the ticket code + subject "TKT-1043 · AC not cooling – Room 305", a priority pill, and a countdown. Two large buttons: white "Open task" and an outline "Stop alert" (silences the looping sound/vibration). Feels urgent but not tacky. Provide both the red (critical) and navy (manager) variants.
```

---

### TEAM, PROFILE & SETTINGS

### SCREEN: Profile / Menu
```
Profile & menu screen (opened from the header avatar). Top: a card with large avatar (tap to change, camera badge), name, email, and role pill. Below, a "On shift" toggle row with an "until" time. Then a settings-style list of navigation rows with leading icons: Switch hotel (shows current), Team, Notifications & sounds, Appearance (Light/Dark/System), Language, Help & support, About. A "More modules" grid (Reports, Approvals, Inventory, Banquet…) gated by role. A red "Sign out" row at the bottom. Role/level footer.
```

### SCREEN: Team Roster
```
Team roster screen. Header "Team" with a search + filter (role, department, on-shift). List rows grouped by role: avatar with initial + online dot, name bold, "Manager · Front Desk", and for managers a shift toggle switch per member (with a small "3 tasks" workload chip); non-managers see just a green/grey status dot. A summary header "8 on shift · 14 total". Tapping a member opens a mini profile sheet (call, chat, view tasks).
```

### SCREEN: Settings
```
Settings screen. Header "Settings". Grouped sections:
- NOTIFICATIONS: toggles for Push, Task assignments, Escalations, Chat messages, Approvals; and a "Sound" picker with an escalation ringtone preview.
- APPEARANCE: segmented Light / Dark / System; a compact/comfortable density toggle.
- GENERAL: Language, Currency (₹ default), Default hotel.
- ACCOUNT: Change password, Biometric unlock toggle, Connected devices.
- ABOUT: version, terms, privacy.
Clean iOS/Android settings styling with grouped inset cards.
```

### SCREEN: Reports Glance (manager)
```
Manager reports glance. Header "Reports" with a date-range chip (Today / 7d / 30d / custom). A 2×2 grid of KPI cards with big values, delta pills and sparklines: Occupancy, ADR, RevPAR, Total revenue. Below: a small bar chart "Occupancy by day", a donut "Revenue split (Rooms / F&B / Banquet)", a "Booking source mix" horizontal bar (Direct vs OTA), and a "Payment status" row. Read-only, glanceable, no heavy tables.
```

### SCREEN: Global Search
```
Global search screen (from the header search icon). A search field with recent searches below. As the user types, results are grouped into sections with counts: Guests, Bookings, Rooms, Tasks, Invoices. Each result row has a type icon, primary text, and secondary context. Fast, clean, keyboard-first. Empty state "Search guests, bookings, rooms, tasks".
```

### SCREEN: Offline / Error states (set)
```
A small set of system states in the app's style:
1) Offline banner — a thin red top strip "No internet connection" that pushes content down.
2) Empty state template — centered line illustration, a title and a one-line hint, optional action button.
3) Error state — a broken-link illustration, "Something went wrong", and a "Try again" button.
4) Skeleton loading — shimmer placeholders shaped like the list cards.
5) Toast/snackbar — a floating rounded dark pill "Payment recorded ✓" with an undo action.
```

---

## PART 3 — ONE-PASS "WHOLE APP" PROMPT (optional)

If you prefer to hand Stitch a single overview prompt to seed the whole app before refining screens, paste this after the Global Style block:

```
Generate a complete hotel staff field-operations mobile app named "Hobo Enterprise" using the design system above. It has 5 bottom tabs — Home, Tasks, a center "+" quick-action button, Ops, and Inbox — plus a header with a hotel switcher, search, a notification bell, and a profile avatar.

Include these screens, consistent with each other:
Auth: Splash, Login (with biometric + forgot password), Forgot password, Hotel switcher.
Home: role-aware dashboard with a prominent on-shift toggle, my-work stats, today-at-hotel tiles, manager KPI cards (occupancy/ADR/RevPAR/revenue), in-house preview and a quick-actions grid.
Tasks: service-ticket list (New/In-progress/Done tabs, SLA countdowns, filters), ticket detail (workflow steps, photos, assignment timeline, approve/reject/reassign/transfer), create task, QR scan, task history.
Ops hub → Front Desk board (arrivals/departures/in-house/upcoming/balance) with check-in, check-out, walk-in, room-peek actions, upgrade/move, extend; Housekeeping board (list + floor plan, room state machine: start/clean/inspect/approve, DND, out-of-order) and HK task assign; Reservations list + booking detail + calendar + create; Banquet events + event detail with check-in/out and collect balance; Guests directory + guest profile + ID scan; Collect Payment (cash/UPI/split/link with live status) + Folio; Inventory + stock movement + Linen register; Blocked rooms; Approvals inbox.
Inbox: staff chat list + chat room, guest conversation list (WhatsApp/OTA) + guest conversation with quick replies and 24h-window warning + guest context panel.
Notifications center + full-screen escalation alert overlay.
Profile/menu, Team roster with presence, Settings, manager Reports glance, Global search, and system states (offline, empty, error, skeleton, toast).

Make every screen support light and dark mode, use tinted status pills, rounded 16px cards, the navy→blue gradient on primary headers, and large tap targets. Show realistic hotel data.
```

---

### Notes for whoever builds from these designs
- **Role-gating**: managers (`role.level ≤ 3`) see KPIs, approvals, team toggles, create/assign; attendants (`≤ 4`) see their own tasks, chat, shift; visitors (`5`) get a read-only Home + Profile. Hide tabs/cards by role and by the hotel's `enabledModules`.
- **Reuse the backend as-is**: Expo push (`PushDevice{kind:"expo"}`), the `?token=` SSE realtime stream, and `notifications/links.ts` deep-link mapping already exist. Wire the full realtime event set (`ticket.*`, `chat.message`, `presence.changed`, `housekeeping.approval`, `notification`, …).
- **Ticket workflow contract**: `PENDING → ACCEPTED → EN_ROUTE → AT_LOCATION → DONE → APPROVED`; statuses `OPEN/ASSIGNED/IN_PROGRESS/ESCALATED/RESOLVED/CLOSED`; priorities `low/normal/high/critical`.
- **Housekeeping contract**: HK status `CLEAN/DIRTY/CLEANING/INSPECTED/OUT_OF_SERVICE`; actions `start_cleaning/mark_done/approve/reject/restore/set_dnd/clear_dnd/out_of_service`.
