# User feedback log

Running log of feedback as it comes in. Not shipped to users — internal tracking only.

| Date | Feedback | Status | Notes |
|---|---|---|---|
| 2026-09-06 | Percentage bar on Home looks weird on mobile | On hold — waiting on screenshot | Reporter clarified: happens in incognito mode. Tested mobile width (375px), narrow width (320px), and a fully cleared/fresh localStorage state (simulating incognito's zero-progress state) — all rendered correctly, couldn't reproduce. User will send a screenshot another time. |
| 2026-09-06 | Request for English translation of mishnah text | Not started | Sefaria's API has the William Davidson Edition (Koren/Steinsaltz, CC-BY-NC, free) available for Mishnah text — confirmed via their versions endpoint. Pulling that specific version needs a slightly different API call than the app currently makes. Awaiting approval to build. |
| 2026-09-06 | "Add my recordings" | Needs clarification | Unclear what this refers to (audio of shiurim? voice notes on a perek?) — need to ask what they mean before scoping. |
| 2026-09-06 | Google sign-in not showing up | Resolved | Was already live — turned out to be the PWA's cached version being served; fixed by a hard refresh / app relaunch. |
| 2026-09-07 | Mishna Notes: unclear that perek field is for a memorable name; wants a separate place for other notes | Shipped (commit 2a43915) | Clarified subtitle copy; added a separate per-perek notebook (open via a small icon button, not shown inline) distinct from the short name field. |
| 2026-09-07 | Sign-in touchpoint design/placement across the app | Shipped | Full SIGNIN-BRIEF.md implemented: nudge strip / gate card components, retired the old "Log in first" banner, My Account restructured Google-first with email collapsed, first-open prompt with A/B copy + frequency rules, brand-safe text colors on all six seder hues. Not yet committed. |
| 2026-09-07 | Google sign-in redirecting to "localhost refused to connect" | Resolved | Supabase's Site URL was still the default localhost:3000; walked user through setting it to the production domain in Supabase's URL Configuration. |
| 2026-09-07 | Google consent screen shows the Supabase project URL instead of the app name | Partially resolved | Free fix (set App name/logo in Google Cloud Console's OAuth consent screen) given to user. The `<project-ref>.supabase.co` sub-line can only be removed with Supabase's paid Custom Domains add-on — flagged as a real limitation, not something buildable for free. |
