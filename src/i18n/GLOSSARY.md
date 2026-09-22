# Hebrew interface — glossary and conventions

For anyone moving strings into `src/i18n/locales` or drafting Hebrew. Not
shipped to users.

## Register

Torah-world Hebrew: the vocabulary of a yeshiva bulletin, warm and plain.
Not government Hebrew, not marketing Hebrew. Short sentences. Address the
learner in the second person masculine singular, as Torah-world Hebrew
does (לַמֵּד, סַיֵּם, חֲזוֹר) — without nikud in the interface.

## The app-wide copy rule (applies to Hebrew too)

Name what was learned, never what was missed. "שלושים יום של לימוד יומי"
— not "בלי הפסקה". "41 נכונים" — not "2 שגיאות". "עוד לא נמצאו:" — not
"פספסת:". Nothing comparative (no rankings, no "עקפת"), streak copy never
threatens ("אל תאבד את הרצף" is out), and every share line invites someone
to join.

## Terms

| English in the app | Hebrew |
|---|---|
| Chazarat Hashas (the app) | חזרת הש״ס |
| Shas | ש״ס |
| mishna / mishnah, mishnayot | משנה, משניות |
| masechet, masechtot | מסכת, מסכתות |
| perek, perakim | פרק, פרקים |
| seder, sedarim | סדר, סדרים |
| siyum, siyumim | סיום, סיומים |
| chazara | חזרה |
| limmud | לימוד |
| Daily Limmud | לימוד יומי |
| Explore Shas | מפת הש״ס |
| Mishna Notes | סימנים והערות |
| My Siyumim | הסיומים שלי |
| My Mishna (nav group) | המשנה שלי |
| Chevrusa | חברותא |
| Chabura | חבורה |
| rebbe | ר״מ (the person); "הר״מ שלך" |
| Rebbe dashboard | לוח הר״מ |
| streak | רצף |
| liluy nishmat | לעילוי נשמת |
| Practice (nav group) | תרגול |
| Sidrei Hamishna | סדרי המשנה |
| Mishna Quiz | חידון משנה |
| Seder Sort | מיון לסדרים |
| Mishna Chazara | זיכרון מסכתות |
| Shas Dash | מרוץ הש״ס |
| Resources | חומרי עזר |
| Guide / How to use this app | מדריך / איך משתמשים |
| My Account | החשבון שלי |
| Sign in / Sign out | כניסה / יציאה |
| Continue with Google | המשך עם Google |
| Share | שיתוף |
| Print | הדפסה |
| Save | שמירה |
| Cancel | ביטול |
| Reset | איפוס |

Seder, masechet and perek names are never translated in a string — use
the data's own `he` field through `useName()`. Where a screen shows both
names side by side ("זרעים Zeraim"), the Hebrew interface shows the Hebrew
once.

## Mechanics

- **One namespace per area.** Strings for `src/components/Home` go in
  `locales/en/home.json` and `locales/he/home.json`, registered in both
  `locales/*/index.ts`. Keys are camelCase and describe the job, not the
  words: `goToDailyLimmud`, not `goToDailyLimmudArrow`.
- **Components:** `const { t } = useTranslation("home");` then
  `t("goToDailyLimmud")`. Shared words (Cancel, Save, Close…) live in
  `common`: `t("common:cancel")`.
- **Code outside components** (copy builders like `shareMoments.ts`):
  `import i18n from "../../i18n";` then `i18n.t("share:…")`. Call it where
  the string is built, not at module load, or it freezes in one language.
- **Whole sentences with blanks**, never pieces glued together:
  `"learnedCount": "You learned {{count}} mishnayot"` — word order differs
  in Hebrew. Never `t("youLearned") + count + t("mishnayot")`.
- **Plurals:** English `key_one` / `key_other`. Hebrew `key_one`,
  `key_two`, `key_other` (i18next picks by count).
- **Markup inside a sentence** (a bold word, a link): `<Trans>` from
  react-i18next with numbered tags, not string splicing.
- **Arrows in text** point along the reading direction: "Go to Daily Limmud
  →" in English, "ללימוד היומי ←" in Hebrew.
- **English content stays English**: the mishna's English translation and
  its credit keep `lang="en" dir="ltr"`; Hebrew text keeps
  `lang="he" dir="rtl"` as it already does.
- **English must not change.** Every English string moves into the JSON
  exactly as it was — tests (e.g. share.test.ts) compare it.
- Dates: `toLocaleDateString(useLocale(), …)`.
