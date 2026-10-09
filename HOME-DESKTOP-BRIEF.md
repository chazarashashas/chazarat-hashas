# Home on a desktop — audit and plan

The phone layout is currently served to every screen size. This is the
audit behind changing that, and the design it leads to. Phone stays as it
is; nothing here changes a single word of copy.

## 1. What a desktop visitor gets today

Measured at 1440 × 900, signed out, English:

| | |
|---|---|
| Sidebar | 108px |
| Content column | 520px, starting at x=507 |
| Empty space | 399px left of the column, 413px right — **56% of the width unused** |
| Page height | 1453px against a 900px viewport — **61% below the fold** |
| Above the fold | language link, logo (57px), title (50px), subtitle, progress block (295px), chag card (245px) |
| "My Mishna" heading | y=802 — at the very edge of the fold |
| "Practice" section | y=1139 — entirely below it |
| Cards | 149 × 142px each, icon + title + description + status |

So on first load a desktop visitor sees the app's identity and their
status, and **not one of the twelve places they can go**. The answer to
"what is this, and what do I do now?" costs a scroll.

## 2. What's wrong, and why it matters

1. **A phone column on a desk.** 520px fixed. Desktop reading sweeps
   horizontally; a narrow ribbon forces every relationship into a vertical
   list and throws away half the screen. Width isn't decoration — it's
   what lets related things sit side by side instead of one after another.
2. **The primary action is buried.** The app exists for daily limmud, yet
   "Go to Daily Limmud" sits inside a 295px status block, and everything
   else is below the fold. The first screen should make the next action
   obvious and single.
3. **Identity outranks the job.** The logo and title take the strongest
   position on every visit. That's right for a first visit and wrong for
   the hundredth: a returning learner wants today's mishnayot, not the
   masthead. Desktop has room to serve both — identity small and constant,
   the day's work prominent.
4. **The tiles duplicate the sidebar.** On a phone the tiles are the
   navigation (the bottom bar holds four). On a desktop the sidebar
   already lists all twelve, so the tiles only earn their place by
   carrying what the sidebar cannot: streak, percentage of Shas, personal
   bests, how many notes. They should read as status, with the name as
   the handle — not as a second menu.
5. **Touch density on a pointer device.** 142px tall cards with
   three-line descriptions are sized for thumbs. A pointer is precise; the
   same information can sit in a tighter grid, which is what lets all
   twelve fit on one screen.
6. **Seasonal content outranks permanent content.** The chag card (245px)
   currently pushes navigation further down. It deserves a place, not the
   second-best place on the page.

## 3. Principles for the redesign

- **One obvious next action**, visible without scrolling: today's learning.
- **Everything reachable on one screen** at 1440 × 900 — no scrolling to
  find a destination.
- **Status earns the space.** A tile without status is a link; a tile with
  it is a reason to look.
- **Identity stays, quietly.** Small, top-left, permanent.
- **The phone layout does not change.** Verified by measuring every
  element at 375px before and after.
- **No new copy, no new features, no comparisons** (the standing copy
  rule applies here as everywhere: name the learning, never the miss).

## 4. The design

Three layouts, one markup.

**≤ 599px (phone) — unchanged.** Single column, two-across tiles.

**600–1023px (tablet, small laptop).** Single column at 760px, tiles
three across. Today's behaviour, slightly wider.

**≥ 1024px (desktop) — new.** The stage widens to 1120px and Home becomes
two columns:

```
┌──────────────────────┬─────────────────────────────────────┐
│ ‹logo› חזרת הש״ס     │  My Mishna                          │
│ Let's learn Shas…    │  ┌──────┐ ┌──────┐ ┌──────┐         │
│                      │  │Daily │ │Explr │ │Notes │  …      │
│ TODAY                │  └──────┘ └──────┘ └──────┘         │
│ Up next: Berachot 1:1│                                     │
│ ▸ Go to Daily Limmud │  Practice                           │
│ streak · % of Shas   │  ┌──────┐ ┌──────┐ ┌──────┐         │
│                      │  │Sidrei│ │Quiz  │ │Sort  │  …      │
│ ‹chag card›          │  └──────┘ └──────┘ └──────┘         │
│ ‹shiur cards›        │                                     │
└──────────────────────┴─────────────────────────────────────┘
   360px, sticky              the rest, 3 tiles across
```

- **Left rail, 360px, sticky** so the day's action stays in view while the
  right column scrolls: compact identity, then the day's learning as the
  one accented button, then streak and percentage, then anything seasonal
  or group-related.
- **Right column:** both sections, three tiles across, all twelve visible
  in the first screen.
- **Tiles on desktop:** shorter, with the description de-emphasised
  (kept — a first-time visitor needs it) and the status line promoted.

## 5. How it will be checked

- Every element on the phone layout measured before and after; identical.
- At 1440 × 900: all twelve destinations and the primary action above the
  fold; no horizontal scroll; no element narrower than its content.
- Hebrew: the whole layout mirrors, the rail sits on the right.
- Keyboard: tab order follows the visual order (rail, then tiles).
