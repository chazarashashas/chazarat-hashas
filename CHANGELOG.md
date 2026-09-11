# Changelog

One entry per PR, newest first.

## A link for every page

- Every page now has its own link, like /shasdash:
  - /daily-limmud, /explore-shas, /mishna-notes, /my-siyumim
  - /chevrusa, /chabura
  - /sidrei-hamishna, /mishna-quiz, /seder-sort, /mishna-chazara, /shasdash
  - /liluy-nishmat, /resources, /guide, /my-account, /rebbe
- Home stays the site root.
- The admin panel has no link. It is reached only from inside the app, and
  /admin is a 404.
- A test checks that every menu page has a link, that every link has its
  Vercel rewrite, and that admin never gets one.

## Daily Limmud: perakim for siyumim read as their own group

- When perakim taken on for siyumim were waiting, they ran on below the
  day's learning as bare text: no card, a small centred tag, and a
  full-width navy "Mark as learned" under each one. Several in a row
  looked like one long page with four identical buttons.
- They now sit under a "For siyumim" heading with a count. Each perek has
  its own card, laid out like the day's card (seder ▸ masechet ▸ perek
  and its name, then the dedication), and a quieter "Mark perek learned"
  button. The navy button now belongs only to the day's learning.

## Admin: game scores

- A new Games tab. Pick a game (Mishna Quiz, Shas Dash, Mishna Chazara,
  Seder Sort or Sidrei Hamishna) and see everyone who has played it,
  best score first, with how many times they played and today's best.
  Tapping a row opens that user.
- The user drawer has a Games section with that account's record for
  every game.
- Needs admin_game_stats_schema.sql run once in Supabase. It returns only
  the game stats part of each account's synced data, and only to an admin.
  Games played while signed out stay on that device and aren't counted.

## Shas Dash: the controls never sit under the bottom bar

- On short phones, where the browser toolbar takes height (an iPhone SE in
  Safari, or 360×560), Lock in and the arrows were under the bottom bar.
- The six lanes now share whatever height is left once everything else is
  placed: 40px on a tall phone, down to 30px on a short one. On phones
  700px tall or less, the spacing tightens too.
- The whole game fits above the bar on any screen 545px tall or more.
  Tall phones look as before.

## The sign-in card shows on every page, not just Home

- A signed-out visitor now gets the same sign-in card on whatever page
  they open, including /shasdash and ?siyum= links. Those two used to
  skip it. How often it asks is unchanged.
- The card now waits until sign-in status is known. Before, it decided
  before the saved session loaded, so someone already signed in could
  still see it.

## Shas Dash: pause is a thinking break again

- Pausing freezes the crossing only. You can still steer while paused and
  the card eases to the new lane; it just does not move forward. This is
  how it worked before the feel pass, which had blocked steering.
- ← pauses again, alongside Space. → is still Lock in, and pressing it
  while paused resumes and commits.

## chazarashashas.org/shasdash

- A short link that opens Shas Dash directly. The app reads the path on
  load (it has no router), and a new vercel.json rewrites only /shasdash to
  the app, so every other unknown URL still 404s as before.
- Like a ?siyum= link, it skips the first-open sign-in prompt: someone sent
  to play the game lands on the game.
- The URL stays /shasdash while the game is open, so a refresh reopens it,
  and goes back to / once they move to another screen.

## Shas Dash: visual and feel pass (SHAS-DASH-BRIEF2.md)

Same game, same mechanic — six lanes, one masechet crossing, land it in
its own seder.

- **The card no longer teleports.** It is one absolutely positioned
  element moved by `translate(x, y)`, easing to a new lane in about 130ms,
  instead of being unmounted from one lane and remounted in the next.
- **Frame-rate independent.** Lane easing is scaled by frame time, so a
  120Hz Galaxy steers at the same speed as a 60Hz laptop (checked in the
  running component: 102.2px vs 102.1px at 133ms). Crossing progress and
  the lock-in bonus come from wall-clock time minus pauses, never from
  summed frame deltas.
- **The catch is the gate box**: whichever box contains the card's centre
  on arrival. No separate catch line.
- New layout: near-black stage, 44px score with best, crossing time with
  five speed pips, three drawn hearts (no ♥ text), a combo pill from ×2, a
  63-cell ledger, six seder tallies, a 276px board with an 88px gate
  column, a dashed road that streams at the card's pace, and a three-tone
  message row. A miss names both ends: "Landed in Nezikin — Chullin is
  Kodashim".
- Lock in (→) scores the whole seconds left, up to 8. The crossing eases
  9.0s → 3.6s at 0.945^score.
- Phone: full-bleed, 40px lanes, the 88px gates kept, the ledger wrapped to
  two rows, tallies as counts, controls 50px with `touch-action: none` and
  `:active` states. The back gesture and backgrounding the app both pause.
- The keyboard legend, the story subtitle and the "Steer with ↑ / ↓"
  message are gone; keys are in the buttons' tooltips.
- The stage colours and 44px score are theme tokens, so the colour and type
  guards still pass.
- The physics is in `dashPhysics.ts` with 12 tests.

## CI: run tests on Node 24

The test job had never once passed. The cause was not our tests: jsdom
loads undici, undici destructures markAsUncloneable out of
node:worker_threads, and that only exists from Node 20.19 / 22.10 on. The
workflow pinned node-version 20 and got an older 20.x, so every vitest
worker died before loading a test file and the run reported
"Test Files: 0 total" with exit code 1.

CI now runs Node 24, which is what the project is developed on.

## Consistency pass: keyframe consolidation

- The eight keyframes still defined in screen stylesheets were each
  panel-pop, screen-fade-up or panel-wobble written again with different
  numbers. They map onto the shared three and their definitions are
  deleted, so components.css owns all five and only five.
- The only keyframes left outside it are dash-catch-pop and
  dash-miss-fade, which the brief keeps as Shas Dash own.

## Admin dashboard

Built per `ADMIN-PROPOSAL.md`'s scope and sequencing, on the audit's
design layer. **Needs two SQL files run in Supabase before it works:**
`admin_audit_log_schema.sql` and `admin_chaburot_schema.sql`.

- **Audit log** (the proposal's step 2, the one item it calls
  non-optional). Append-only table, no update or delete policy, writes go
  through a security-definer function that takes the actor from
  `auth.uid()` so it can't be forged. Every reset and every deletion now
  writes an entry, and the panel lists them.
- **Users with a drawer** (step 3): search, then one row per account
  opening a drawer with the whole record and both privileged actions in
  it, rather than two controls per table row.
- **Chaburos with the rebbe view** (step 4): every group, and a roster
  drawer, so "why is my talmid missing" is answerable.
- The raw Postgres error the proposal opens with is gone — every admin
  RPC failure goes through `friendlyError`, and Admin no longer borrows
  `.login-error` from another screen.
- Everything is a shared part: `.card` rows, `.field` inputs, `.pill`
  section tabs, `.state` for all three states, the shared `ConfirmModal`.
- **Not built, deliberately:** role management (the proposal assumes rebbe
  is a database flag; it is derived from teaching a class, so there is
  nothing to grant), admin-created chaburot, impersonation, support inbox
  and system health.

## Consistency pass PR 12 — Android (Phase 4)

- **Behavioural:** the keyboard resize mode goes `Body` → `Native`, so the
  fixed bottom bar stops being dragged up when the keyboard opens. This is
  the only behaviour change in the entire pass and it needs verifying on a
  real device — I can't test it here.
- The 13 `drawable-*-night-*` splash variants are deleted so the light
  splash is used at every density, as the brief allows.
- `androidScaleType` `CENTER_CROP` → `CENTER_INSIDE`.
- `ic_launcher_background` white → navy; new `colors.xml` with
  `colorPrimary`/`colorPrimaryDark` navy and `colorAccent` gold.
- `npx cap sync android` run; the generated `capacitor.config.json`
  matches.

## Consistency pass PR 11 - the copy sweep

- Text only, five lines. Most of the glossary was already applied by the
  screen PRs as each screen was touched; this is what was left.
- "Mishnah" to "Mishna" in Daily Limmud's breadcrumb and the group-note
  placeholder; "Print notes" to "Print"; a comment saying "chavrusa" and
  "Mishnayos".
- Every other hit in src is an identifier (setMishnah, openMishnah,
  record fields) or data, and is left alone.

## Consistency pass PR 10 — My Account, Rebbe, Admin, Resources, Guide, print

- **Both CI guards are clean and now blocking.** No colour literal outside
  `theme.css` (bar the four Google-logo fills) and no off-scale font-size
  anywhere in `src`.
- Every remaining modal is a `.modal` on a `.modal-scrim`: confirm,
  concept, perek note, first-open (`--top`), About Chaburos, the two
  nishmat modals and both game end blocks.
- The wide list in `App.tsx` is the brief's eight, as a named set.
- Guide: 640px cap gone, title on the scale at 700 weight, print button
  and step buttons on the shared vocabulary, callout shared, popup is
  `.modal--lg`.
- Resources cards are `.card.card--rule` with the button vocabulary and
  sentence-case titles; `masechta-perek-worksheet.pdf` is renamed to
  `masechet-`.
- Certificate and Print Notes drop their local `@media print` blocks —
  `global.css` owns printing.
- `BrandMark` takes its colours from tokens instead of three literals.
- The two `!important`s are replaced with specificity.

## Consistency pass PR 9 — Chevrusa, Chabura, the gate, L'Iluy Nishmat

- Every literal in the cluster is a token. The cream-on-navy alphas (a
  dozen slightly different opacities) collapse onto the five on-navy
  tokens by band; gold/ink/red tints become `color-mix`.
- `GroupCreateCard` stops killing its focus outlines, so the global
  keyboard ring works in its fields.
- L'Iluy Nishmat's accent moves off `--hue-chevrusa` onto `--hue-siyumim`
  — it is a siyum feature, not a group feature (17 uses).
- Create card, gate facts/CTA and the nishmat board are `.hero-card`;
  siyum cards are `.card`; gate facts and nishmat facts are `.callout`;
  kind tabs are `.pill`; errors are `.callout--bad`; empties are
  `.state--empty`; section labels are `.section-title`.
- `ChaburaScreen` stops importing `ChevrusaScreen.css` and its inline
  style becomes a class.
- Copy: pace strings standardised across both screens; "About Chaburas" →
  "About Chaburos"; "Your chaburot/chevrusot" → "chaburos/chevrusos";
  "L'iluy nishmat" → "L'Iluy Nishmat".

## Consistency pass PR 8 — the five games

- Every literal across all five games plus `GameHud` and
  `TranslationReveal` is a token; the three drag/chip shadows are the
  shared ones.
- `board-wobble` and `dash-shake` are deleted — both were `panel-wobble`
  under another name. `dash-catch-pop` and `dash-miss-fade` stay, as the
  brief says: they are Shas Dash's own.
- Mishna Quiz and Shas Dash stop defining their own `.icon-btn`.
- The quiz's narrow selects are `.field__input`, and its load failure goes
  through `friendlyError`.
- Per-screen stage widths on Shas Dash are gone.
- Copy: "New quiz" → "Play again"; "Start chazara" and "Start the
  journey" → "Start".

## Consistency pass PR 7 — My Siyumim

- All 24 literals to tokens; `LogLearningModal` stops killing its focus
  outline.
- Title in a `.screen-head`; the countdown is a `.hero-card`; stat tiles
  and the L'Iluy Nishmat link are `.card`; pace tabs and pills are
  `.pill--compact`; the three actions use the button vocabulary.
- "Siyumim ahead" and "Where each level stands" are both `.section-title`;
  `.siyumim-next-label` is gone.
- Perek rows and the log modal's options use Hebrew numerals.
- `LogLearningModal` is a `.modal.modal--sm` with `.field` rows and the
  shared close button. Copy: "a chavrusa, your own Mishnayos" → "a
  chevrusa, your own Mishnayot".

## Consistency pass PR 6 — Mishna Notes

- Literals and sizes to tokens; the three `outline: none` rules are gone,
  so the global keyboard ring works in every field on this screen.
- Title is "Mishna Notes" in a `.screen-head`, not "Notes."; the subtitle
  becomes `__sub` and the print link plus view toggle move into `__aside`.
- View toggle, seder pills and masechet chips are all `.pill`; the notes
  page and concept cards are `.card`; the concepts band is a `.callout`;
  text links are `.btn--quiet`.
- The two 599px blocks are one, and the traditional name now shrinks on a
  phone rather than disappearing — it is content, not decoration.
- Copy: "Read the mishnayos →" → "Read the Mishnayot →"; "Concepts to
  Review" → "Concepts to review".

## Consistency pass PR 5 — Explore Shas

- Literals and sizes to tokens; the per-screen focus ring becomes the
  shared gold keyboard ring.
- Grids move from `auto-fill` to fixed counts — 6 columns for masechtot
  and perakim, 10 for mishnayot, 2/2/6 on a phone — so a tile is exactly
  the same width in every seder. Masechet tiles still span by perek
  count, which is the deliberate signal, not an inconsistency.
- Hebrew reading text goes 15px → 17px, matching every other reading
  surface.
- Crumbs are `.pill--compact`, the note link is `.btn--quiet`, the text
  block is a `.card`.
- Loading/error use the shared states via `friendlyError`, and a search
  that matches nothing now says so instead of showing an empty box.

## Consistency pass PR 4 — Daily Limmud

- Every literal is a token; every font-size is on the scale.
- New `--fs-hebrew-read: 17px` token so rule 7 (Hebrew reading text at
  17px/2.0) and rule 4 (closed Latin scale) can both hold.
- Header is a `.screen-head` with the streak in `__aside`; the settings
  summary is a `.btn--secondary.btn--block`; the reader is a `.card`.
- `.limmud-stage`'s 640px cap is gone — the wide slot is the width.
- The mishna's Hebrew label goes from 12px `--gold` to 14px
  `--brass-text`, which actually holds contrast at that size.
- Loading and error use the shared states, and the error runs through
  `friendlyError` so Sefaria's raw text never renders.
- Copy: pace options are "1 Mishna a day / 2 Mishnayot a day / 1 Perek a
  day"; "L'iluy nishmat:" → "L'Iluy Nishmat:".

## Consistency pass PR 3 — Home

- Every literal in Home, `ProgressHeaderBar`, `ProgressTracks`,
  `NudgeStrip` and `TodayLearningCard` is now a token, and every
  font-size is on the scale.
- All twelve Home cards are cream. Daily Limmud's navy treatment made it
  read as a different kind of thing from its neighbours; its hue rule is
  enough.
- `NudgeStrip` is a `.callout`; `ProgressTracks`' standalone block is a
  `.hero-card`; `.home-section-title` becomes the shared `.section-title`;
  the unused `.home-hero__btn` and the ruleless `.home-panel` are gone.
- "Sent" on `TodayLearningCard` uses `--good` rather than Seder Zeraim's
  green, and the card sits on `--surface-hi` like every other card.
- Copy: "let's learn shas, together" → "Let's learn Shas, together";
  "Go to My Limmud" → "Go to Daily Limmud".

## Consistency pass PR 2 — the shell

- Sidebar and bottom bar drop their white/cream literals for the on-navy
  tokens; both label sizes go from 9.5px to 12px, and the sidebar tightens
  to the brief's item padding and group-label margins.
- `TabBar` renders `.pill.pill--compact` — `.tab-bar__tab` is gone and
  TabBar.css is layout only.
- The More sheet uses the shared `.modal-scrim`, keeping only its
  bottom-anchored layout, and its grid is fixed at four columns. Its own
  rise keyframe is deleted in favour of `panel-pop`.
- The More tile is now active whenever the open screen is not on the bar.
- `navItems.ts` gains the third group, More: L'Iluy Nishmat, Resources,
  Guide, My Account. Guide and My Account stop being rendered separately
  at the foot of the rail.
- Known gap: the brief's sidebar metrics do not fit 17 items in 800px
  (~1119px with the icon-above-label item), so the rail still scrolls.

## Consistency pass PR 1 — tokens and the shared layer

- `theme.css` gains the tokens the pass is built from: the five on-navy
  values, `--gold-bright`, `--tint`, `--good-bg`, `--bad-hover`,
  `--bad-soft`, three navy shadows, `--scrim`, the closed type scale
  (`--fs-12` … `--fs-36`) and `--stage-width-wide`.
- Two token values change, both deliberate: `--good` is its own green
  (`#3d7c5c`) instead of Seder Zeraim's, and `--stage-width` goes 480px →
  520px. These are the only visible changes in this PR.
- `panel.css` becomes `components.css` and now owns the whole shared
  layer: buttons, pills, the screen header, cards, callouts, fields,
  modals, the three states, the game frame and every keyframe. The old
  vocabulary stays at the bottom as clearly-marked migration aliases,
  deleted screen by screen as the later PRs land.
- The 14 duplicate `.stage` blocks are gone; `.stage` is defined once.
- Printing moves to one rule in `global.css` — app chrome and the screen
  behind the overlay never reach paper.
- New `friendlyError(err, context)` maps any thrown value to one of three
  sentences and sends the real message to monitoring, so raw errors never
  render. Five unit tests cover it.
- `scripts/check-colors.sh` and `scripts/check-type.sh` run in CI. They
  report today (310 colour literals, 343 off-scale sizes) and flip to
  blocking in the last PR of the pass.

## Guide: finish GUIDE-BRIEF.md

- The Guide's Print button now goes through Mishna Notes' print path — the
  same `.print-overlay` shell, `.no-print` controls and `window.print()` —
  instead of the separate `@media print` block it had, which the brief
  called out as "a new one". The printed copy drops the per-step navigation,
  the Print button and the "find this again" note.
- The closing line "Stay consistent, and keep on learning!" now sits above
  the 2px rule that ends the document, as the brief specifies. It was below
  it.
- The six seder pills are a real `role="list"` with `role="listitem"` on
  each pill and `lang="he"` on the Hebrew, so they have accessible names —
  the `aria-label` on the bare container was being ignored.
