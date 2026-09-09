import { useEffect } from "react";
import { SEDARIM } from "../../data/shas";
import { getSederHue } from "../../utils/sederHue";
import "./GuideScreen.css";

interface GuideScreenProps {
  onNavigate: (id: string) => void;
  /** Which step to scroll to on arrival — from Home's popup link, from
      Resources, or from the first-run "Read the whole guide" card. Null
      just opens at the top. */
  initialAnchor?: string | null;
  /** Skips the outer .stage/.panel page chrome — GuidePopup supplies its
      own popup chrome around this same content instead. */
  bare?: boolean;
}

interface StepNavButton {
  id: string;
  label: string;
}

/** GUIDEBRIEF2.md: "Every step lists the screens it names as real
    <button>s that route there" — this table is that list, verbatim
    from the brief, not derived from parsing the bold text in the copy
    below (several buttons, e.g. Step 4's Resources, aren't the literal
    next word after a bold mention). */
const STEP_BUTTONS: Record<string, StepNavButton[]> = {
  sedarim: [
    { id: "map", label: "Explore Shas" },
    { id: "sedarim", label: "Sidrei Hamishna" },
  ],
  masechtot: [
    { id: "sedarim", label: "Sidrei Hamishna" },
    { id: "recall", label: "Mishna Chazara" },
    { id: "dash", label: "Shas Dash" },
    { id: "sort", label: "Seder Sort" },
  ],
  perakim: [
    { id: "perek", label: "Mishna Notes" },
    { id: "mishna", label: "Mishna Quiz" },
  ],
  concepts: [
    { id: "perek", label: "Mishna Notes" },
    { id: "resources", label: "Resources" },
  ],
  pace: [
    { id: "progress", label: "My Siyumim" },
    { id: "limmud", label: "Daily Limmud" },
  ],
  together: [
    { id: "chevrusa", label: "Chevrusa" },
    { id: "chabura", label: "Chabura" },
  ],
};

function StepNav({ onNavigate, buttons }: { onNavigate: (id: string) => void; buttons: StepNavButton[] }) {
  return (
    <div className="guide-step__nav">
      {buttons.map((b) => (
        <button key={b.id} className="guide-step__nav-btn" onClick={() => onNavigate(b.id)}>
          {b.label} →
        </button>
      ))}
    </div>
  );
}

function SederPills() {
  return (
    <div className="guide-seder-pills" aria-label="The six sedarim">
      {SEDARIM.map((s) => (
        <span
          key={s.id}
          className="guide-seder-pill"
          style={{ ["--pill-hue" as string]: getSederHue(s.id) }}
        >
          <span dir="rtl">{s.he}</span> {s.en}
        </span>
      ))}
    </div>
  );
}

/**
 * GUIDEBRIEF2.md: the canonical, full explanation of how the app is
 * meant to be used — supersedes Home's old "Practice keeps it from
 * slipping" popup block and every other explainer in the app. Copy in
 * this file is verbatim from the brief's appendix; do not rewrite,
 * condense, or re-tone it — see the brief for why (curly quotes, and
 * the specific paragraph/bullets/paragraph order in Step 3 both carry
 * meaning that a rewrite would lose).
 *
 * No router exists yet (see GUIDEBRIEF2.md's own routing note), so
 * "Route: /guide" resolves to the "if not" branch it specifies: `guide`
 * is a section value like every other screen, and the six step anchors
 * are in-page scroll targets, not real URLs. Revisit this the moment a
 * real router lands.
 */
export function GuideScreen({ onNavigate, initialAnchor, bare }: GuideScreenProps) {
  useEffect(() => {
    if (!initialAnchor) return;
    const el = document.getElementById(initialAnchor);
    el?.scrollIntoView({ block: "start" });
    // Only ever on arrival — re-scrolling every time the prop identity
    // happens to change isn't the intent, just the one-time deep link.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={bare ? "guide-bare" : "stage"}>
      <div className={"panel guide-panel" + (bare ? " guide-panel--bare" : "")}>
        <header className="guide-header">
          <h1 className="guide-header__title">How to Use Chazarat Hashas</h1>
          <p className="guide-header__subtitle">A guide for the talmid</p>
          <p className="guide-header__intro">
            The purpose of this app is to help you organize Shas in your mind. Every feature was
            built with that as its first and primary goal. Here is how the app is meant to be
            used, step by step.
          </p>
          <button className="guide-print-btn" onClick={() => window.print()}>
            Print
          </button>
        </header>
        <div className="guide-rule" aria-hidden="true" />

        <ol className="guide-steps">
          <li>
            <section id="sedarim" className="guide-step">
              <span className="guide-step__num" aria-hidden="true">
                1
              </span>
              <div className="guide-step__body">
                <h2 className="guide-step__title">Learn the Sedarim</h2>
                <p>
                  Shas is divided into six sections, each called a Seder. Start by learning their
                  names and their order. The best-known way to remember them is the mnemonic{" "}
                  <strong>Zman Nakat</strong>: <strong>Z</strong>eraim, <strong>M</strong>oed,{" "}
                  <strong>N</strong>ashim, <strong>N</strong>ezikin, <strong>K</strong>odashim,{" "}
                  <strong>T</strong>aharot. Use <strong>Explore Shas</strong> to see the six
                  Sedarim laid out and get familiar with them.
                </p>
                <SederPills />
                <p>
                  Once you know the Sedarim, go to the games to review them. <strong>Sidrei
                  Hamishna</strong> tests you on the order of the six Sedarim. When you can put
                  them in order without hesitating, you are ready to move on to the Masechtot.
                </p>
                <StepNav onNavigate={onNavigate} buttons={STEP_BUTTONS.sedarim} />
              </div>
            </section>
          </li>

          <li>
            <section id="masechtot" className="guide-step">
              <span className="guide-step__num" aria-hidden="true">
                2
              </span>
              <div className="guide-step__body">
                <h2 className="guide-step__title">Learn the Masechtot</h2>
                <p>
                  Each Seder is divided into Masechtot. Make up your own mnemonic, story, song, or
                  any other method that helps you commit the Masechtot of each Seder to memory.
                  For example, a cute one I use for Moed:{" "}
                  <em>
                    “On Shabbos we can use Eruvin because they have a tzuras hapesach (Pesachim).”
                  </em>{" "}
                  Every talmid will find his own way.
                </p>
                <p>
                  At this point there are two paths, and both are fine. After you know the names
                  and order of the Masechtot in Seder Zeraim, you can either continue to the
                  Masechtot of the other five Sedarim, or go one level deeper in Zeraim and start
                  learning Masechet Berachot (Step 3).
                </p>
                <p>To review the Masechtot, use the games:</p>
                <ul>
                  <li>
                    <strong>Sidrei Hamishna</strong> — select a Seder at the bottom to test
                    yourself on the order of its Masechtot.
                  </li>
                  <li>
                    <strong>Mishna Chazara</strong> — once you feel confident, see whether you can
                    put them in order <em>by heart</em>, with nothing in front of you.
                  </li>
                  <li>
                    <strong>Shas Dash</strong> — this one is meant to test you. Keep track of your
                    score and compare how you actually did with how you thought you would. Try it
                    once a day, and before you know it you will be getting a perfect score every
                    time.
                  </li>
                  <li>
                    <strong>Seder Sort</strong> — in between Shas Dash attempts, practice here to
                    bring your score up.
                  </li>
                </ul>
                <div className="guide-callout">
                  <p className="guide-callout__title">Away from a screen</p>
                  <p>
                    On the <strong>Resources</strong> page you can download worksheets and print
                    them, so you can review in the beis medrash without a phone or a computer.
                  </p>
                </div>
                <StepNav onNavigate={onNavigate} buttons={STEP_BUTTONS.masechtot} />
              </div>
            </section>
          </li>

          <li>
            <section id="perakim" className="guide-step">
              <span className="guide-step__num" aria-hidden="true">
                3
              </span>
              <div className="guide-step__body">
                <h2 className="guide-step__title">Name the Perakim</h2>
                <p>
                  After you have mastered the structure of the Sedarim and Masechtot, it is time
                  to structure the Perakim. This is by far the most personal and exciting part,
                  because this is where you make Shas <em>yours</em>.
                </p>
                <p>
                  Take the fourth Perek of Peah, for example. The Masechet is about the laws of
                  Peah, but nearly every Mishna in that Perek contains the word <em>ne'eman</em>.
                  You might choose to call that Perek “Ne’emanus” or “trustworthiness”. Giving a
                  Perek a name does several things at once:
                </p>
                <ul>
                  <li>It defines the value Chazal are teaching through that Perek.</li>
                  <li>
                    It creates order. Once I know the fourth Perek of Peah is about not only Peah
                    but also Ne'emanus, I can place the Mishnayot of that chapter in my mind, and
                    when a Mishna is quoted somewhere in Shas, I know where to find it.
                  </li>
                  <li>
                    It connects concepts for later learning. The first Perek of Gittin and the
                    sixth Perek of Shviis both discuss the borders and geography of Eretz
                    Yisrael. Someone who later wants to study the halachic boundaries of the land
                    can go back and see which Perakim treat the same idea in different areas of
                    halacha.
                  </li>
                </ul>
                <p>
                  Go through a Masechet and give each of its Perakim a name in{" "}
                  <strong>Mishna Notes</strong>. There you can also view all of the names you have
                  given in one place and print them, for a single Masechet, a whole Seder, or all
                  of Shas.
                </p>
                <p>
                  Then head to the <strong>Mishna Quiz</strong>. You will be surprised: sooner or
                  later you will be able to place any Mishna in the correct Seder, Masechet, and
                  even the right Perek.
                </p>
                <StepNav onNavigate={onNavigate} buttons={STEP_BUTTONS.perakim} />
              </div>
            </section>
          </li>

          <li>
            <section id="concepts" className="guide-step">
              <span className="guide-step__num" aria-hidden="true">
                4
              </span>
              <div className="guide-step__body">
                <h2 className="guide-step__title">Note the concepts</h2>
                <p>
                  There is a second kind of note built into the app. On each Mishna, write down
                  every concept that appears in it. If you already know the concepts, amazing,
                  now you are building a map of which concepts appear where in Shas. If you do
                  not know what a concept means, do not get stuck. Make a note and keep going.
                </p>
                <p>
                  In the <strong>Mishna Notes</strong> section you can view all of your notes in
                  one place and print them. You can view them for a single Masechet, a whole
                  Seder, or all of Shas, and the app records for you which Mishna each note came
                  from. Now is the time to head to the beis medrash, find time with your rebbe or
                  chevrusa, learn each concept properly, and review your learning together.
                </p>
                <StepNav onNavigate={onNavigate} buttons={STEP_BUTTONS.concepts} />
              </div>
            </section>
          </li>

          <li>
            <section id="pace" className="guide-step">
              <span className="guide-step__num" aria-hidden="true">
                5
              </span>
              <div className="guide-step__body">
                <h2 className="guide-step__title">Set your pace</h2>
                <p>
                  As you explore the app you will find more features that encourage you to keep
                  learning. In <strong>My Siyumim</strong> you can play with how much you need to
                  learn each day to finish Shas in a year, or in two, and then set that pace in{" "}
                  <strong>Daily Limmud</strong>. Some prefer to go slower and know each Mishna
                  really well before moving on. Others prefer to go faster and gain a wider view
                  of each Seder first, then review it the following year. Both work, choose the
                  one you will actually keep to.
                </p>
                <StepNav onNavigate={onNavigate} buttons={STEP_BUTTONS.pace} />
              </div>
            </section>
          </li>

          <li>
            <section id="together" className="guide-step">
              <span className="guide-step__num" aria-hidden="true">
                6
              </span>
              <div className="guide-step__body">
                <h2 className="guide-step__title">Learn with others</h2>
                <p>
                  Use the <strong>Chevrusa</strong> feature to learn together with a friend, or
                  the <strong>Chabura</strong> feature to learn with a group.
                </p>
                <StepNav onNavigate={onNavigate} buttons={STEP_BUTTONS.together} />
              </div>
            </section>
          </li>
        </ol>

        <div className="guide-rule" aria-hidden="true" />
        <p className="guide-closing">Stay consistent, and keep on learning!</p>
        <p className="guide-revisit">You can always find this guide again from the navigation.</p>
      </div>
    </div>
  );
}
