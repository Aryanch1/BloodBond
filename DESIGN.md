# BloodBond — Design Spec

**App:** BloodBond — a community blood-donor and request board. See open requests, find matching donors, pledge a donation, and write a clear shareable request message.
**Purpose:** Someone nearby needs blood today. BloodBond puts the open requests on one board — urgency first, blood group and hospital on every card — and lets anyone pledge a donation or write a clear message to share. For neighbours, families, donor groups and anyone who has ever been asked "do you know someone with O-?"

**Figma:** https://www.figma.com/design/jZfZzwT8vcwH1w3ZKvkK62 — "BloodBond — Daily App"
(File created 2026-11-21. Canvas population was NOT completed: the Figma MCP Starter-plan tool-call limit was reached on the first `use_figma` write, the same limit that stopped ElderEase's last edit. The file holds the name and link; this DESIGN.md is the source of truth.)

## Identity

A "lifeline board" — urgent, warm, and respectful, never alarming. The
visual identity is **typographic and board-first, not photo-first**: the
hero is a poster headline, the imagery layer is a designed graphic
system (blood-group badges, urgency ribbons, the compatibility matrix,
the droplet), and there is no photo anywhere in the app.

- **Palette:** deep crimson primary `#B42318` (disciplined, used on
  primary CTAs, badges, active chips, the FAB), bright red `#C8102E`
  for urgency ribbons and the droplet fill, warm white background
  `#FFF9F7`, ink `#221A18`, soft rose tints `#FBE3E0` / `#FDF0EE`.
  Available/done reads calm green `#2E7D32`; urgent reads amber
  `#B87A1F`. Critical is always solid crimson.
- **Display font:** Bebas Neue 400 (bundled via
  `@expo-google-fonts/bebas-neue`). Previous apps used Sora
  (FridgeToMeal/MediGuide), Fraunces (SplitEase), Bricolage Grotesque
  (PlantDoctor), Archivo (CivicHelper), Space Grotesk (BudgetBuddy) and
  DM Serif Display (ElderEase) — Bebas Neue is new here, and its
  condensed poster voice fits a community notice board.
- **Navigation:** a feed with a board-switcher chip row under the
  header (Requests / Donors / My Pledges / Chart) plus a crimson
  floating action button (+) that opens the message writer. On ≥840dp
  the chip row stays on top and the content splits two-pane (board
  left, selected request right). This is a sixth distinct navigation
  chrome after the floating glass pill (FridgeToMeal/MediGuide), top
  segmented tabs (SplitEase), flat labeled bar (PlantDoctor), dark ink
  bar with raised + (CivicHelper), flat white tab bar (BudgetBuddy) and
  big-button dock (ElderEase).
- **Hero:** typographic poster — "EVERY DROP COUNTS." in Bebas Neue,
  a dark ink stat strip (open requests / units still needed / your
  pledges), then a compatibility strip of eight blood-group pills that
  filter the board. NO photo hero.
- **Refresh motif:** a blood droplet filling — the droplet drops in and
  fills with crimson as the user pulls; past the threshold, the fill
  loop plays while data returns. On web the same animation is wired to
  a header refresh button. Never the stock spinner.
- **Buttons:** crimson gradient primary with soft glow, frosted-glass
  ghost pills; Reanimated spring press to ~0.95 with overshoot settle;
  light haptic on primary actions (mobile only); bouncing-dot loading
  states; chips POP (scale bounce) when selected.
- **Glass:** every frosted surface uses the two-layer structure (outer
  view background + shadow, inner overflow-hidden view clipping the
  blur) so Android never paints a hard white plate.

## Tokens (lib/theme.ts)

- Colors: see palette above; `primarySoft #FBE3E0`, `primaryPale
  #FDF0EE`, `aurora [#FFF9F7, #FCECEA, #F9E3E0]`.
- Urgency colors: Critical `#B42318`, Urgent `#B87A1F`, Routine
  `#2E7D32` (with matching soft tints).
- Type: display 48/50 Bebas Neue 400 (60/62 wide), title 30/34,
  subtitle 17, body 15/22, caption 12, label 11. Spacing 8-point grid.
  Radii: cards 30, sheets 38, pills fully round, inputs 24.
- Breakpoints: <600 phones (single column), 600–840 large phone /
  foldable folded, 840–1280 two-pane (board left, detail right),
  ≥1280 centred shell (max 1120).

## Screen inventory (full flow)

1. **Splash** — warm white background, crimson droplet mark, "BLOODBOND"
   in Bebas Neue, tagline "Every drop counts."
2. **Welcome** — droplet graphic (crimson panel, white droplet circle,
   GIVE A DROP stamp), four options: Continue with Google / Create
   account / Log in (+ Forgot password) / Continue without an account.
3. **Board (home)** — poster hero, dark stat strip, board-switcher
   chips, then the active view: Requests (group filter pills + urgency
   sorted cards), Donors (group filter + donor cards), My Pledges
   (active + past), Chart (compatibility matrix). Crimson FAB opens
   the writer. Two-pane on ≥840dp: board left, selected request right.
4. **Request detail** — big blood badge, urgency ribbon, units bar,
   deadline line, who-can-donate line, contact, "I can donate" pledge
   flow with in-place confirmation and reminder, share, write-a-message.
5. **Write a request (AI message writer)** — details form (name, group
   chips, units stepper, hospital, city, urgency chips, deadline,
   contact, notes), message result card with DEMO/LIVE badge, save to
   history, post as a request; past messages with one-tap re-use.
6. **Settings** — profile editor (photo, display name, email, sign-in
   method, password reset, sign out), message history with inline view
   + clear, services status, pledge counts, version (reads app.json),
   clear demo data.
7. **Help** — four steps, "what this is not" (not medical advice),
   demo vs live explainer, privacy, about.
8. **Empty/error states** — no requests match the filter, no donors in
   a group, no pledges yet, no messages yet, request not found, form
   validation with a next step.

## Transition & animation plan

- Splash → Welcome → Board: slide from right (expo-router stack).
- Board view changes: content fades/slides with `FadeInDown` spring,
  staggered 0/60/120ms on hero sections; request/donor cards stagger
  60ms each.
- Chips pop on select; the FAB and primary buttons spring to 0.95 on
  press with haptic; the units bar springs to its value on every
  pledge change.
- Cards: staggered `FadeInDown` rises; detail screens slide in from
  the right; the pledge confirmation appears in place on the detail
  screen (never off-screen).
- Pull-to-refresh: droplet drops in scrubbed by finger distance,
  fills crimson past the threshold, content settles with a spring and
  cards re-enter staggered.
- State-changing taps show feedback where the user is looking: pledge
  confirms in place with the reminder time; board selection shows the
  request on the right pane (two-pane) and a visible notice; message
  save confirms under the result card; history View expands the
  message inline in Settings.

## Self-check scores (quality / distinctness)

Honest per-screen scores against the 8 shared premium rules and the
question "could this be mistaken for a previous app?":

| Screen | Quality | Distinctness | Notes |
|---|---|---|---|
| Board (poster hero + stat strip + group pills) | 90% | 95% | No previous app has a poster headline hero, a blood-group filter strip, or a dark stat strip on warm white. Bebas Neue is new. The chip switcher is a row of pills, not SplitEase's segmented control. |
| Request detail | 90% | 92% | Big crimson blood badge + urgency ribbon + units bar; no equivalent screen in any earlier app. |
| Write a request | 88% | 90% | Form + message result card with DEMO/LIVE badge; closest relative is ElderEase's Ask, but the crimson tokens, Bebas Neue titles and the post-as-request flow read differently. |
| Donors | 88% | 90% | Donor cards with availability states; the 56-day eligibility line is new content. |
| My Pledges | 88% | 88% | Pledge cards with reminder lines; simple by design. |
| Chart | 90% | 95% | The 8x8 compatibility matrix is a designed data visual with no equivalent in any earlier app. |
| Welcome | 88% | 90% | Droplet graphic on a crimson panel; nothing like the piggy art of BudgetBuddy or the stamp art of CivicHelper. |
| Settings / Help | 85% | 85% | Standard account screens by design; crimson tokens, Bebas Neue titles and the message-history viewer keep them on-identity. |

No screen shares a home structure, navigation chrome or display font
with ElderEase (sunrise amber, DM Serif Display, day timeline,
big-button dock), BudgetBuddy (violet + lime, Space Grotesk, budget
ring, flat white tab bar), CivicHelper (stamp red/blue paper trail,
Archivo, document timeline, dark ink bar), PlantDoctor (terracotta /
sage dashboard grid, Bricolage Grotesque) or SplitEase (navy/gold
ledger, Fraunces, segmented tabs).

## Accounts

Standard system from day one (lib/store.tsx, lib/firebase.ts,
lib/firebase.native.ts): Welcome gate, Google + Email/Password
(email-link OFF), persistence via the platform-split Firebase module
(scoped @firebase/* on native, verified in the Android export bundle),
profile editor, per-user data under users/{uid} with owner-only rules,
history one-tap re-use + clear-history. No Firebase project exists yet
— TODO-BLOODBOND placeholders, firebaseConfigured=false.

## Backend

Java Spring Boot 3.3.5 (backend/): POST /api/message, GET /api/health.
Gemini gemini-3.5-flash-lite via the OpenAI-compatible endpoint, key
from GEMINI_API_KEY server-side only. Demo fallback (rule-based writer,
same rules as lib/blood.ts) when no key is set. 13 tests, all passing.
Build-verified locally; NOT hosted.
