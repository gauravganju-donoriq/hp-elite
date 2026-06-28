# Product Requirements Document — HP Elite Staff Scheduler UI Revamp

## 1. Product Overview

**HP Elite — Staff Scheduler** is a web app for a football (soccer) academy to manage
coaching-session schedules, collect staff availability, assign staff to session slots,
visualize the published schedule, and generate hours-logged payroll reports.

There are two primary product surfaces driven by role:

- **Admin** — builds schedules, configures sessions, assigns staff, manages the roster,
  configures class types & auto-assign profiles, and generates reports.
- **Staff (Coach)** — submits availability per session, sees their personal dashboard,
  and views the published schedule.

A **Shared Schedule View** is reachable by both roles. Authentication has **Login** and
**Sign up** surfaces.

### 1.1 Current tech & design foundation (to preserve in revamp)
- Next.js 16 App Router (React Server Components by default), React 19.
- Tailwind CSS v4 with **semantic theme tokens** (oklch CSS vars) supporting light/dark.
- shadcn-style primitives built on Radix UI; `lucide-react` icons; `sonner` toasts; `next-themes`.
- Route groups: `(admin)`, `(staff)`, `(shared)`, `(auth)`, each with its own `layout.tsx`
  doing auth-gating + navbar + `<main>`.

### 1.2 Revamp goals (recommended, non-breaking)
- Keep the role-gated route structure and data model intact (see §10) so backend/API
  contracts don't change.
- Modernize visual language while preserving the dense, information-rich grids that power
  the admin assignment workflow.
- Improve mobile ergonomics (staff are mobile-first; admins are desktop-first).
- Replace the few raw HTML patterns (e.g., `confirm()` in Reports delete, ad-hoc color
  tints) with consistent primitives.

---

## 2. Personas & Roles

| Persona | Primary device | Core jobs |
|---|---|---|
| **Admin** | Desktop | Create/edit schedules, configure sessions, assign & auto-assign staff, manage roster + logins, configure class types & auto-assign profiles, generate/download reports |
| **Staff/Coach** | Mobile | Submit availability per session, see assigned shifts, view full schedule |
| **Unlinked user** | Any | A signed-in account not yet linked to a staff profile — sees a blocking "link your account" state |

### 2.1 Routing & gating rules (must preserve)
- `(admin)/*` — server-side: redirect to `/login` if no session; redirect to `/dashboard`
  if session is not admin.
- `(staff)/*` — client-side: if identity is admin → redirect to `/admin`; if `loading` →
  centered "Loading..."; if `unlinked` → show navbar + `UnlinkedAccount` panel; else render page.
- `(shared)/*` — renders `AdminNavbar` if admin, else `StaffNavbar`; shows "Loading..."
  while identity resolves.
- `(auth)/*` — centered card on `bg-muted/30`, no navbar.
- Login success routes admin → `/admin`, everyone else → `/dashboard`. `(staff)/` index
  immediately redirects to `/dashboard`.

---

## 3. Global Design System

### 3.1 Layout shell
- Root: `min-h-dvh flex flex-col`, Geist Sans + Geist Mono fonts. Global `Toaster` (sonner)
  mounted once.
- Page content wrapper inside `<main>`: `px-4 py-6 sm:px-6 lg:px-8`.
- Standard page shell: top-level `div.space-y-6`; header row is `flex items-center justify-between`
  with `h1.text-3xl.font-bold.tracking-tight` + a `text-muted-foreground` subtitle, and a
  primary action button on the right.

### 3.2 Navigation chrome
Both navbars: `sticky top-0 z-50`, bottom border, translucent blurred background
(`bg-background/95 backdrop-blur`), height `h-14`, horizontal padding `px-4 sm:px-6 lg:px-8`.

**Admin navbar** (`admin-navbar.tsx`):
- Left: HP Elite logo (`/hp-elite.png`, `dark:invert`) linking to `/admin`, with a secondary
  `Badge` "Admin" + shield icon.
- Right: text links — **Schedules** (`/admin`), **Schedule View** (`/schedule`),
  **Staff Roster** (`/admin/staff`), **Reports** (`/admin/reports`), **Settings**
  (`/admin/settings`). Active link is `text-foreground font-medium`; inactive is
  `text-muted-foreground` with hover. Then the user name (`text-xs muted`) and a ghost
  **sign-out** icon button (LogOut).
- No mobile hamburger today (admin is desktop-first) — *revamp opportunity: add a responsive menu*.

**Staff navbar** (`staff-navbar.tsx`):
- Left: logo linking to `/dashboard`.
- Desktop (`hidden sm:flex`): **Dashboard**, **My Availability** (only if linked identity;
  CalendarCheck icon), **Schedule** (CalendarDays icon), display name, ghost sign-out icon.
- Mobile (`sm:hidden`): hamburger toggles a `Menu`/`X`. Opened menu is a bordered panel
  showing the name header, then full-width rows for Dashboard / My Availability / Schedule
  (each with icon + active highlight `bg-accent`) and a Sign Out row.
- Sign out: `authClient.signOut()` → push `/login` → refresh.

### 3.3 Core UI primitives (`src/components/ui/`)
Button, Card (+ Header/Title/Description/Content/Footer), Dialog, Popover, Select, Input,
Textarea, Label, Badge, Table, Tabs, Separator, Accordion, PasswordInput, Sonner Toaster.
- Conventions: function components typed `React.ComponentProps<"el">`, `data-slot` attributes,
  `cn()` class merging, `cva` variants exposed as `xxxVariants`, `asChild` via Radix `Slot.Root`.

### 3.4 Color & status semantics (domain data-viz)
- **Chrome** uses only semantic tokens (`bg-background`, `bg-card`, `text-muted-foreground`,
  `border`, `bg-primary`, `destructive`, `ring`, etc.).
- **Availability status** colors: Available = green, Unavailable = red, Maybe = yellow/amber,
  Pending/Not set = gray. (Defined centrally in `STATUS_CONFIG` on the availability page;
  revamp should hoist this to a shared module.)
- **Assignment state**: assigned full = green tint, assigned partial/adjusted-hours = amber
  tint, empty = dashed muted.
- **Coverage thresholds**: ≥80% green, ≥50% yellow, else red.
- **Class-type tags**: must come from `CLASS_TYPE_PALETTE` (18 named colors, each
  `{label, color, swatch}`), never ad-hoc. Default key is `gray`.
- **Role badges**: lead=`default`, experience=`secondary`, junior/trial=`outline`.
  Role abbreviations: L / E / J / T.

### 3.5 Cross-cutting states
- **Loading**: centered `text-muted-foreground` "Loading..." (full-screen `min-h-dvh` in
  layouts, `py-20` in pages).
- **Empty**: `border border-dashed` panel, centered, with a heading, muted helper text, and
  a primary CTA.
- **Feedback**: `toast` (success/error/info) for all mutations; never `alert()`.
  *(Note: Reports delete currently uses native `confirm()` — revamp should replace with a Dialog.)*
- **Icons**: lucide, `h-4 w-4` (or `h-3 w-3` in badges).
- **Focus**: `focus-visible:ring-ring/50 focus-visible:ring-[3px]`; invalid
  `aria-invalid:border-destructive`.

---

## 4. Authentication

### 4.1 Login (`/login`)
- Centered `Card` (`max-w-sm`). Header: title **"HP Elite"** (`text-2xl font-bold`),
  description "Sign in to Staff Scheduler".
- Form fields: **Email** (`type=email`, required), **Password** (PasswordInput with reveal
  toggle, required, placeholder `••••••••`).
- Footer: full-width **Sign In** button (shows "Signing in..." while `loading`), and a link
  "Don't have an account? Sign up".
- On error: toast with message. On success: route by role.

### 4.2 Sign up (`/signup`)
- Same card pattern. Fields: **Full Name**, **Email**, **Password** (`minLength=8`).
- Footer: **Sign Up** button ("Creating account..." while loading) + "Already have an
  account? Sign in".
- On success: toast "Account created! Redirecting..." → `/dashboard`.

> Revamp note: New signups are unlinked by default → they'll hit the UnlinkedAccount state
> until an admin links them. Consider clarifying this on the signup screen.

---

## 5. Admin Experience

### 5.1 Schedules list — `/admin` (landing)
- **Header**: `h1` "Schedules" + subtitle "Manage coaching session schedules and staff
  availability." Right: primary **New Schedule** button (Plus icon) → `/admin/schedules/create`.
- **Empty state**: dashed panel "No schedules yet" + helper + **New Schedule** CTA.
- **Populated**: responsive grid `gap-4 sm:grid-cols-2 lg:grid-cols-3` of **ScheduleCard**s.

**ScheduleCard** (clickable, whole card links to `/admin/schedules/{id}`; hover raises shadow/border):
- Title (schedule name) + optional `destructive` badge "N short" (AlertTriangle) when any
  session is understaffed by *confirmed-available* count.
- Optional 2-line clamped description.
- Meta row: date range (CalendarDays) + locations (MapPin, deduped, joined).
- Stats row: "N sessions" + "X% staffed" (color-thresholded) with Users icon.
- Coverage progress bar (`h-2`), color by threshold. (Coverage = total confirmed-available ÷
  total required across sessions.)

### 5.2 Create Schedule — `/admin/schedules/create`
Constrained width `max-w-3xl`. Header "Create Schedule" + subtitle. A `<form>` of stacked cards:

1. **Details card**: Schedule Name* (Input), Description (Textarea, 2 rows), and a 2-col grid
   of Start Date* / End Date* (`type=date`).
2. **Recurring Session Patterns card**: description text, then a list of pattern rows. Each
   pattern row (`flex flex-wrap items-end gap-3 rounded-lg border p-3`):
   - **Day** (Select, Sunday–Saturday), **Start** (text input, e.g. "5:00 PM"), **End**
     (text input), **Location** (text input), **Staff Needed** (number, min 1), and a ghost
     **destructive trash** button to remove the pattern.
   - Below the list: outline **Add Pattern** button (defaults to Tuesday 5–8 PM, Field House,
     8 staff).
3. **Preview card** (only when ≥1 session generated): "{N} sessions will be generated." A
   scrollable (`max-h-48`) list of the first 20 generated sessions (day, date, time range,
   location, staff count) + "... and N more".
4. **Footer actions**: **Create Schedule** (submit) + outline **Cancel** (→ `/admin`).

**Generation logic**: For each date in [start,end], for each pattern whose `dayOfWeek`
matches, create a session. Validations (toasts): required fields present; ≥1 pattern; ≥1
session generated. On success: toast "Schedule created with N sessions." → `/admin`.

### 5.3 Schedule Detail — `/admin/schedules/[id]`
The admin command center for a single schedule.

- **Top bar**: ghost **Back** button (ArrowLeft → `/admin`).
- **Title block**: schedule name `h1`, optional description, meta row (date range with
  CalendarDays; locations with MapPin). Right side: **Edit** (outline, opens Edit dialog) and
  **Delete Schedule** (destructive, opens Delete dialog).
- **Stats grid** (`grid-cols-2 lg:grid-cols-4`), four cards:
  1. **Total Sessions** — count.
  2. **Slots Filled** — green `assigned/required` (CheckCircle2).
  3. **Responses Complete** — blue `respondedStaff/totalStaff` (staff who answered *every*
     session) (Users).
  4. **Understaffed Sessions** — red `count/total` (AlertTriangle).
- **SessionSlotsPanel** (assignment grid — see §5.3.3).
- **AvailabilityResponsePanel** (chase list — see §5.3.4).

#### 5.3.1 Edit Schedule dialog
Dialog "Edit Schedule": Name*, Description (Textarea), Start/End Date (2-col). Footer: outline
Cancel + **Save Changes** (validates non-empty name; toast on save).

#### 5.3.2 Delete Schedule dialog (type-to-confirm)
Dialog with AlertTriangle title "Delete this schedule?", a bullet list of what's destroyed
(N sessions, all availability responses, all slot assignments, **all reports generated from
this schedule**). A confirmation Input requiring the user to **type the exact schedule name**;
the **Delete Schedule** button stays disabled until it matches. On confirm: delete → toast →
`/admin`.

#### 5.3.3 SessionSlotsPanel — the assignment grid
This is the densest, most important admin surface.

**Toolbar (row 1)**: section title "Staff Assignments"; right cluster: a **Day/Week toggle**
(segmented control, active = `bg-primary text-primary-foreground`), prev/today/next navigation
(`ChevronLeft`, "Today", `ChevronRight`), and an outline **Add Session** button (CalendarPlus,
opens dialog).

**Scope bar (row 2)** (`rounded-lg border bg-muted/30 p-3`): left shows the current range
label (full date for day view, range for week). Right cluster:
- **Auto-assign profile Select** (`w-[180px]`, disabled if no profiles).
- Primary **Auto-assign {day|week}** button (Sparkles; spinner while busy). Fills empty slots
  across the visible scope using the selected profile.
- Outline **Clear {day|week}** button (Eraser) → opens a destructive confirm dialog ("Clear
  this {scope}?") that removes ALL assignments (including manual) in scope.

**The grid** (horizontal-scroll table):
- Sticky left **Time** column. Each row = a unique `start–end` time window (sorted by start
  time); shows start (bold) and end (muted) lines.
- Column headers = each date in scope (day abbr + month/day). Empty scope → dashed empty panel.
- **Cells**: contain one or more session blocks (`buildSessionGrid` keys by `date|timeWindow`).
  Each session block:
  - **Session header button** (opens **SessionConfigPopover**): a class-type tag
    (palette-colored) or italic "Set class…" placeholder; an abbreviated location
    (Field House→FH, K Sport→KS, else raw); the `assigned/required` count (green if full, red
    if not); and a Settings2 gear that fades in on hover.
  - A tiny **Auto-assign icon button** (Sparkles) next to the header — opens
    **AutoAssignPopover** to pick a profile and fill *just this session* (shows a spinner
    while running).
  - A vertical stack of **SlotChip**s, one per required slot.

**SlotChip**: full-width small button.
- Assigned (full hours): green tint, shows "F. LastName".
- Assigned (adjusted hours / partial): amber tint, shows initial+lastname plus a small clock
  with the worked window (compact times).
- Empty: dashed muted "+ assign".
- Opens **SlotAssignmentPopover** on click.

**SlotAssignmentPopover** (`w-72`):
- Header "Assign Staff"; if filled, a ghost destructive **Remove** (X) button.
- If filled: a "Worked: start–end" row (Clock) with "(adjusted)" marker when custom; an
  **Adjust** button toggles inline time editing (start/end inputs, helper text referencing
  the session window "for payroll", **Save** / **Reset to full** / **Cancel**).
- **Staff list** (`max-h-64` scroll), grouped & sorted by experience→role→fewest current
  assignments:
  - **Available** group (green label) — staff who marked available.
  - **Maybe** group (yellow label).
  - **Schedule anyway (N)** collapsible group (AlertTriangle) — unavailable/pending/no-reply
    staff; expanding shows a warning that assigning overrides their availability.
  - Each staff row: check/user icon, full name, role badge (L/E/J/T), years exp, a status pill
    (Yes/Maybe/Unavailable/No reply), and a parenthetical current-assignment count.
  - Hard constraints (excluded entirely): already assigned in this session; double-booked on
    an overlapping session same date. Empty → "No assignable staff…".

**SessionConfigPopover** (`w-80`, opened from the session header):
- **Class Type** picker: 2-col grid of palette-colored buttons (selected has `ring-2 ring-ring`);
  selecting updates immediately. Empty → "No class types yet. Add some in Settings."
- **Staff Needed** stepper: minus/value/plus (min 1).
- Separator.
- **Session Details**: Start Time / End Time (text inputs), Location (text input), **Save
  Details** button (artificial 0.5s spinner then toast). Changing staff count re-initializes
  slot rows.
- Separator. Outline **Clear Assignments** (Eraser, this session). Destructive **Delete
  Session** (Trash2).

**AddSessionDialog**: Date* (constrained to schedule range), Start/End Time, Location, Staff
Needed. Cancel / **Add Session**.

**ConflictResolutionDialog** (after auto-assign that can't fully fill): AlertTriangle title
"N Sessions Need Attention", scrollable list of amber conflict cards (date/time, `unfilled`
destructive badge, location/class/staffed, available/maybe counts, human-readable reason).
Footer **Got it**.

**Self-healing behavior**: the panel reconciles any session whose slot-row count drifted from
`requiredStaff` (re-initializes once per target count). Preserve this in revamp.

#### 5.3.4 AvailabilityResponsePanel — the "chase" list
- Card header "Response Status" + summary "X of Y staff have submitted availability for all N
  sessions." Toggle button **Show all / Show only incomplete** (defaults to incomplete-only).
- Table columns: expand chevron, Staff (name + role abbr), Responded (`x/total`, color by
  status), Status pill (Complete green / Partial yellow / No response red), Email (or "No
  email" badge), **Chase** (outline **Email** button using a prefilled `mailto:` — stops
  row-click propagation).
- Rows with missing sessions are expandable → reveals a wrapped list of "Missing responses (N)"
  badges (day + date + time).
- Sorting: none → partial → complete, then by name.
- Footer note when incomplete staff lack emails: "N incomplete staff … cannot be chased by email."

### 5.4 Staff Roster — `/admin/staff`
- Header "Staff Roster" + subtitle; primary **Add Staff** button (opens add/edit dialog).
- **Stat cards** (`grid-cols-2 lg:grid-cols-4`): Total Staff (Users), then one per role
  (Leads / Experiences / Juniors / Trials) with counts.
- **Roster table** (inside a Card, `p-0`): columns Name (`Last, First`), Role (badge),
  Experience ("N yrs"), **Account**, **Actions**. Sorted by last then first name.
  - **Account** cell: if linked → secondary "Linked" badge (KeyRound) + email; if not →
    outline **Link Account** button (UserPlus).
  - **Actions** cell: ghost **Reset password** (KeyRound, only if linked), ghost **Edit**
    (Pencil), ghost destructive **Delete** (Trash2, removes immediately + toast).

**Add/Edit Staff dialog**:
- First/Last name (2-col).
- For **new** staff: Email + Password required (creates a login account via `/api/admin/create-user`).
- For **editing linked** staff: editable Email (updates login email via `/api/admin/update-email`)
  with helper text.
- Role (Select) + Years of Experience (number).
- Footer Cancel + **Create Staff / Save Changes** (shows "Saving...").

**Link Login Account dialog**: explains it creates credentials for {name}; Email + Password;
Cancel / **Create Account** ("Creating...").

**Reset Password dialog**: shows {name} (+email); New Password + Confirm Password (min 8, must
match); Cancel / **Reset Password** ("Resetting..."). Helper: share the new password with them.

### 5.5 Reports — `/admin/reports`
- Header "Reports" + subtitle "Generate hours-logged reports from assigned session slots."
- **Generate card** (BarChart3 title): a `grid sm:grid-cols-2 lg:grid-cols-4`:
  - **Schedule** Select (spans 2). Picking a schedule sets the period anchor to its start date.
  - **Period type** Select: Weekly / Monthly.
  - **Scope** Select: "Full breakdown across schedule" / "Single {week|month}".
  - If scope=single: **Date inside target {week|month}** date input (clamped to schedule range)
    + helper describing the covered period (Mon–Sun week, or calendar month).
  - Footer-right primary **Generate report** button (Sparkles; "Generating..." with spinner).
- **Previously generated reports card** (FileText title): table with Name, Schedule, Type
  (badge), Scope (badge), Range, Generated (datetime), and right-aligned actions: outline
  **PDF** download (Download icon; spinner while downloading; lazy-loads `report-pdf`), ghost
  destructive **delete** (Trash2; spinner while deleting).
  - Loading state: spinner row. Empty state: FileText icon + "No reports yet."
- *Revamp note*: delete currently uses native `confirm()` — replace with a confirm Dialog for
  consistency.

### 5.6 Settings — `/admin/settings`
- Header "Settings" + subtitle "Manage class types and auto-assign profiles…"; primary
  **Add Class Type** button.
- **Class Types card** (Tag title): table — Preview (palette-colored tag), Label, Id (`code`),
  Color (swatch + name), Sort, Actions (ghost Edit / ghost destructive Delete). Empty row CTA
  when none.
- **AutoAssignProfilesPanel** (see below).
- **Add/Edit Class Type dialog**: Label (auto-slugs the Id when creating), Id/slug (disabled
  when editing), Color Select (swatches), Sort Order, and a live **Preview** tag. Validations:
  label required, unique id. Cancel / Create / Save Changes.
- **Delete Class Type dialog**: warns sessions using it will have their class type cleared.
  Cancel / Delete.

**AutoAssignProfilesPanel** (Sparkles title): describes profiles as "ordered set of steps
(which roles, how many, seniority order)." Right: **Add Profile**. Table: Name (+ "Built-in"
badge for built-ins), Rules (human summary via `describePlan`), Sort, Actions (Edit / Delete).
- **Add/Edit Profile dialog** (scrollable): Name (auto-slug), Sort Order, Id/slug (create only),
  then **Steps** list. Each **RuleEditor** step (`rounded-lg border p-3`): step number, move
  up/down + remove controls; **Roles to pull from** = toggle chips (Lead/Experience/Junior/Trial,
  ≥1 required, active = primary fill); **Max to fill** (number, optional "Any"); **Order**
  segmented toggle "Most exp." / "Least exp.". A live **Summary** of the plan. Footer Cancel /
  Create / Save.
- **Delete Profile dialog**: must keep ≥1 profile; assigned sessions keep their staff.

---

## 6. Staff Experience

### 6.1 Unlinked account state
When a signed-in user isn't linked to a staff profile: centered amber card "Account not linked
yet" (AlertCircle), explains they're signed in as {email} but need an admin to link them in
*Staff Roster*, with an outline **Sign out** button.

### 6.2 Staff Dashboard — `/dashboard`
Mobile-first, responsive (`space-y-4 sm:space-y-6`).
- **Header**: "Welcome, {firstName}" (`text-2xl sm:text-3xl`) + "Here's your scheduling overview."
- **Stat cards** (`grid-cols-2 lg:grid-cols-4`, condensed paddings on mobile):
  1. **Confirmed Available** (green, CheckCircle2) — sessions marked available.
  2. **Responded** (`responded/total`, MessageSquare).
  3. **Awaiting Response** (yellow, AlertCircle) — sessions still needing a response.
  4. **Active Schedules** (LayoutGrid) — count.
- **Action banner** (only if pending > 0): amber card "N sessions need your response." +
  **Update Availability** button → `/availability` (full-width on mobile).
- **My Schedule card** (only when linked): list of slots the staff is actually assigned to
  (upcoming, max 10), each row shows date, worked time window (amber+bold if adjusted),
  location, and a "Scheduled"/"Partial" badge. Header has a **Full schedule** outline button
  → `/schedule`. Empty: "You're not scheduled for any upcoming sessions yet."
- **Upcoming Sessions card**: next 10 sessions across all schedules with date/time/location
  and the staff's status icon+label, or a "No response" badge. Empty: "No upcoming sessions."

### 6.3 My Availability — `/availability`
The core staff workflow; has distinct **mobile (list)** and **desktop (calendar)** layouts.

- **Header**: "My Availability" + "Hi {firstName} -- let your admin know when you can work."
  If >1 schedule, a **Pick Schedule** Select appears.
- **How-it-works banner** (blue Info) — only when nothing is responded yet: 3-step instructions.
- **Stats card**: "X of N sessions" + percent; an animated progress bar; a legend row of
  status dots with counts (Available/Unavailable/Maybe/Not set).
- **Quick Actions card** (only if pending > 0): Zap icon + "Set all N remaining sessions at
  once" + three outline buttons **Mark All Available/Unavailable/Maybe** (only affect
  unanswered sessions; toast count).
- **Month navigation**: prev/Today/next; centered month label + schedule name. Prev/next
  disabled when no sessions exist in that adjacent month.

**Status model** (`STATUS_CONFIG`): Available (green), Unavailable (red), Maybe (yellow/amber),
Pending = "Not Set" (gray). Each has icon, button tints, cell background, dot, and badge styles.

**Mobile (`md:hidden`)** — vertical list of session cards for the month. Each collapsed card
shows the date (with "Today" pill if applicable), time, location, and a status badge ("Tap to
set" when pending) + chevron. Tapping expands an inline editor: "Can you work this session?"
with 3 large status buttons; a "You selected: X" confirmation; **optional custom time** inputs
(only when Available) "Available for a different time?"; and a **Done** button. Selecting a
non-available status auto-collapses.

**Desktop (`hidden md:block`)** — a 7-column calendar grid. Day-of-week header row; week rows;
each day cell shows the day number (Today = filled primary circle), days with no sessions are
dimmed. Each session renders as a small button (tinted by status) showing time, location, and
a status badge ("Tap to set" if pending), plus a "Custom: …" line when a custom window is set.
Clicking opens a **Popover** with the full date/time/location, the 3 status buttons, optional
custom-time inputs (when Available), and a **Done** button.
- **Legend** (desktop only): status dots + descriptions.

> Behavior to preserve: changing status is optimistic (writes immediately via `setAvailability`);
> choosing Available reveals custom-time inputs that override the session's default window.

### 6.4 Staff index — `/`
Immediately redirects to `/dashboard` (no UI).

---

## 7. Shared Schedule View — `/schedule`
Reachable by both roles (admin sees AdminNavbar, staff sees StaffNavbar). This is the
"published board."

- **Header**: "Schedule" + "Who is scheduled and who is available, at a glance." Right:
  outline **Print** (window.print, disabled until board loads) and primary **Export image**
  (Download; exports the board as PNG via `html-to-image`, "Exporting..." while busy; filename
  derives from schedule+view+date; toast on success).
- **Controls row** (`print:hidden`): a **Schedule** Select; a **Day/Week** segmented toggle;
  prev/Today/next navigation. Default schedule = one whose range contains today, else the first;
  anchor clamped to range.
- **Board** (`captureRef`, `rounded-xl border bg-card p-5`): header with CalendarDays, schedule
  name, range label, and a "{view} view" badge. Body:
  - Loading → "Loading..."; no sessions in scope → "No sessions in this {view}."
  - Otherwise **DaySection**s (week view shows a day heading) each containing a `sm:grid-cols-2`
    of **SessionCard**s.

**SessionCard**: time (Clock); class-type tag (palette) + location (MapPin); a staffing pill
`filled/required` (green if met, yellow if understaffed, Users icon).
- **Scheduled** sub-section: list of assigned staff; the current user's row is highlighted
  "(you)"; adjusted-hours rows show an amber time-window pill. Empty → "No one assigned yet."
- **Also available** sub-section (when present): comma-separated names of available/maybe staff
  (maybe annotated), current user highlighted.

Data comes from `/api/schedules/{id}/board` (a composed `ScheduleBoard`).

---

## 8. Interaction & Feedback Conventions (apply everywhere)

- **All mutations** show a `sonner` toast (success/error/info). Async buttons show inline
  spinner + "...ing" label and disable while pending.
- **Destructive actions** use a confirm Dialog; schedule deletion additionally requires
  type-to-match.
- **Optimistic updates** for availability and slot assignment (state writes immediately;
  errors toast and the context handles rollback).
- **Disabled logic**: auto-assign/clear disabled when no profiles or no sessions in scope;
  month nav disabled at data edges; type-to-confirm gates destructive buttons.
- **Hover affordances**: cards raise shadow; the session gear icon fades in on hover; slot
  chips change tint on hover.
- **Keyboard/focus**: maintain visible focus rings on all custom buttons (many use
  `focus:ring-2 focus:ring-ring`).

---

## 9. Responsive Behavior Summary

| Surface | Mobile | Desktop |
|---|---|---|
| Admin navbar | (currently no hamburger — add one) | full link row |
| Staff navbar | hamburger drawer | inline links |
| Staff availability | stacked session list w/ expand | 7-col calendar + popovers |
| Staff dashboard | 2-col stat cards, condensed paddings, full-width CTAs | 4-col |
| Admin assignment grid | horizontal scroll table | wide table |
| Schedule board | single-column day sections | 2-col session cards |

---

## 10. Data Model Reference (for UI binding — keep stable)

Key entities (`src/lib/types.ts`):
- **Staff**: id, userId?, email?, firstName, lastName, role (`lead|experience|junior|trial`),
  yearsExperience.
- **Session**: id, scheduleId, date, dayOfWeek, startTime, endTime, location, requiredStaff,
  classType?.
- **Schedule**: id, name, description?, startDate, endDate, sessions[].
- **Availability**: staffId, sessionId, status (`available|unavailable|maybe|pending`),
  customStartTime?, customEndTime?, notes?.
- **SessionSlot**: id, sessionId, slotIndex, assignedStaffId?, assignedStartTime?/assignedEndTime?
  (per-assignment worked window for payroll).
- **ClassType**: id, label, colorKey, sortOrder.
- **AutoAssignProfile**: id, name, plan (`AutoAssignRule[]`), sortOrder, isBuiltin?;
  **AutoAssignRule**: roles[], max?, preferSeniorFirst.
- **AutoAssignConflict / AutoAssignResult**: drive the conflict dialog.
- **Report / ReportSummary / ReportPayload / ReportRow / ReportBucket**: drive the reports
  table + PDF.
- **ScheduleBoard / BoardSession / BoardScheduledStaff / BoardAvailableStaff**: drive the
  shared schedule view.

State is provided via React context (`SchedulingProvider` + `StaffIdentityProvider` in root
layout). Most pages are client components consuming `useScheduling()` / `useStaffIdentity()`.

---

## 11. Screen Inventory (acceptance checklist for the revamp)

1. `/login`, `/signup` — auth cards.
2. `/admin` — schedules grid + ScheduleCard + empty state.
3. `/admin/schedules/create` — details + recurring patterns + preview.
4. `/admin/schedules/[id]` — stats, SessionSlotsPanel (config/assign/auto-assign/conflict/
   add-session/clear dialogs), AvailabilityResponsePanel; Edit + type-to-confirm Delete.
5. `/admin/staff` — roster table, stat cards, Add/Edit/Link/Reset dialogs.
6. `/admin/reports` — generate card + reports table + PDF/delete.
7. `/admin/settings` — class types table + dialogs + AutoAssignProfilesPanel + dialogs.
8. `/dashboard` — staff stats, action banner, my schedule, upcoming.
9. `/availability` — mobile list + desktop calendar, quick actions, stats, month nav.
10. `/schedule` — shared board, day/week, print/export.
11. Unlinked-account blocking state.
12. Global navbars (admin/staff), toasts, loading/empty states.