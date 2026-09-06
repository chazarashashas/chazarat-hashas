import { useState } from "react";
import { SEDARIM } from "../../data/shas";
import { useLearningProgress } from "../../utils/useLearningProgress";
import { usePerekNotes } from "../../utils/usePerekNotes";
import { useAuth } from "../../utils/useAuth";
import { useChevrusa } from "../../utils/useChevrusa";
import { getSederHue } from "../../utils/sederHue";
import { buildJourneyScopes } from "../../utils/shasJourney";
import { NavIcon } from "../Sidebar/NavIcon";
import { FlipCounter } from "../FlipCounter/FlipCounter";
import { hebrewNumeral } from "../../utils/hebrewNumeral";
import "./HomeScreen.css";

interface Feature {
  id: string;
  title: string;
  desc: string;
  built: boolean;
  status?: string;
}

/** My Mishna: personal, tracked things — tied to your notes, progress, or
    account. Learning Tools: the games/drills that don't track anything
    personal, just practice. */
const MY_MISHNA: Feature[] = [
  {
    id: "limmud",
    title: "Daily Limmud",
    desc: "Your next portion of Mishnayot, straight through Shas in order.",
    built: true,
  },
  {
    id: "map",
    title: "Explore Shas",
    desc: "Explore every seder, masechet, perek, and mishnah, with your progress along the way.",
    built: true,
  },
  {
    id: "perek",
    title: "Mishna Notes",
    desc: "Make Shas yours — your own names, notes, and memory cues for every perek.",
    built: true,
  },
  {
    id: "progress",
    title: "My Siyumim",
    desc: "Track your streak and how much of Shas you've learned so far.",
    built: true,
  },
  {
    id: "chevrusa",
    title: "Chevrusa",
    desc: "Pair up with a study partner or start a chabura to learn together.",
    built: true,
  },
  {
    id: "login",
    title: "Log In",
    desc: "Sign in to save your notes, progress, and streak to your account.",
    built: true,
  },
];

const LEARNING_TOOLS: Feature[] = [
  {
    id: "sedarim",
    title: "Sidrei Hamishna",
    desc: "Drag the six sedarim — or one seder's masechtot — into their correct order.",
    built: true,
  },
  {
    id: "mishna",
    title: "Mishna Quiz",
    desc: "Read a real mishnah and locate it: seder and masechet, with perek as bonus.",
    built: true,
  },
  {
    id: "sort",
    title: "Seder Sort",
    desc: "Sort all 63 masechtot into the seder each one belongs to.",
    built: true,
  },
  {
    id: "recall",
    title: "Mishna Chazara",
    desc: "Type every masechet you can remember, by seder or by all of Shas.",
    built: true,
  },
  {
    id: "dash",
    title: "Shas Dash",
    desc: "Steer each masechet into its seder before it reaches the end of the road.",
    built: true,
  },
  {
    id: "resources",
    title: "Resources",
    desc: "Printable worksheets for practicing Shas structure away from the screen.",
    built: true,
  },
];

function FeatureGrid({ features, onNavigate }: { features: Feature[]; onNavigate: (id: string) => void }) {
  return (
    <div className="home-grid">
      {features.map((f) => (
        <button
          key={f.id}
          className={`home-card home-card--${f.id}` + (f.built ? "" : " home-card--disabled")}
          disabled={!f.built}
          onClick={() => onNavigate(f.id)}
        >
          <span className="home-card__icon">
            <NavIcon id={f.id} />
          </span>
          <span className="home-card__title">{f.title}</span>
          <span className="home-card__desc">{f.desc}</span>
          {f.status && <span className="home-card__status">{f.status}</span>}
          {!f.built && <span className="home-card__soon">Coming soon</span>}
        </button>
      ))}
    </div>
  );
}

interface HomeScreenProps {
  onNavigate: (id: string) => void;
}

export function HomeScreen({ onNavigate }: HomeScreenProps) {
  const [showIntro, setShowIntro] = useState(false);
  const progress = useLearningProgress();
  const { perekNotes } = usePerekNotes();
  const { isLoggedIn } = useAuth();
  const { groups } = useChevrusa();

  const upNext = progress.todaysItems[0];
  const upNextSeder = upNext ? SEDARIM.find((s) => s.id === upNext.sederId) : undefined;
  const ringPct = progress.shasPercent();
  const journeyScopes = buildJourneyScopes(progress);

  const noteCount = Object.values(perekNotes).reduce(
    (total, notes) => total + notes.filter((n) => n && n.trim()).length,
    0,
  );

  const myMishnaWithStatus = MY_MISHNA.map((f) => {
    if (f.id === "limmud" && (progress.finishedShas || progress.streak.current > 0)) {
      return {
        ...f,
        status: progress.finishedShas ? "Finished Shas!" : `${progress.streak.current}-day streak`,
      };
    }
    if (f.id === "progress" && progress.shasPercent() > 0) {
      return { ...f, status: `${progress.shasPercent()}% of Shas learned` };
    }
    if (f.id === "perek" && noteCount > 0) {
      return { ...f, status: `${noteCount} note${noteCount === 1 ? "" : "s"} saved` };
    }
    if (f.id === "chevrusa" && isLoggedIn && groups.length > 0) {
      return { ...f, status: groups.length === 1 ? "1 active chevrusa" : `${groups.length} active chevrusot` };
    }
    return f;
  });

  return (
    <div className="stage">
      <div className="panel home-panel">
        <p className="app-title">Chazarat Hashas</p>
        <h1 className="home-title" dir="rtl">
          חזרת הש״ס
        </h1>
        <p className="panel__subtitle">let's learn shas, together</p>

        <blockquote className="home-quote" dir="rtl">
          <p className="home-quote__text">
            "רֵישׁ לָקִישׁ אָמַר: אִם רָאִיתָ תַּלְמִיד שֶׁתַּלְמוּדוֹ קָשֶׁה עָלָיו כַּבַּרְזֶל — בִּשְׁבִיל מִשְׁנָתוֹ
            שֶׁאֵינָהּ סְדוּרָה עָלָיו"
          </p>
          <cite className="home-quote__source">— תענית ז׳ ב׳–ח׳ א׳</cite>
        </blockquote>

        <div className="home-hero">
          <div className="home-hero__ring" style={{ ["--ring-pct" as string]: `${ringPct}%` }}>
            <span className="home-hero__ring-num">{ringPct}%</span>
          </div>
          <div className="home-hero__body">
            {progress.finishedShas ? (
              <p className="home-hero__title">You've finished all of Shas!</p>
            ) : upNext ? (
              <>
                <p className="home-hero__label">Up next</p>
                <p className="home-hero__title">
                  {upNextSeder ? `${upNextSeder.en} · ` : ""}
                  {upNext.masechetEn} {hebrewNumeral(upNext.perek)}:{upNext.mishnah}
                </p>
              </>
            ) : (
              <p className="home-hero__title">Ready when you are</p>
            )}
            <div className="home-hero__row">
              {progress.streak.current > 0 ? (
                <>
                  <span className="home-hero__streak-dot" aria-hidden="true" />
                  <span className="home-hero__streak">{progress.streak.current}-day streak</span>
                </>
              ) : (
                <span className="home-hero__streak">Learn today to start a streak</span>
              )}
              <button className="home-hero__btn" onClick={() => onNavigate("limmud")}>
                Continue learning
              </button>
            </div>
          </div>
        </div>

        <FlipCounter scopes={journeyScopes} />

        <h2 className="home-section-title">Explore Shas</h2>
        <div className="home-seder-grid">
          {SEDARIM.map((seder) => (
            <button
              key={seder.id}
              className="home-seder-tile"
              style={{ ["--tile-hue" as string]: getSederHue(seder.id) }}
              onClick={() => onNavigate("map")}
            >
              <span className="home-seder-tile__he" dir="rtl">
                {seder.he}
              </span>
              <div className="home-seder-tile__bar">
                <div
                  className="home-seder-tile__bar-fill"
                  style={{ width: `${progress.sederPercent(seder.id)}%` }}
                />
              </div>
            </button>
          ))}
        </div>

        <h2 className="home-section-title">My Mishna</h2>
        <FeatureGrid features={myMishnaWithStatus} onNavigate={onNavigate} />

        <h2 className="home-section-title">Practice</h2>
        <FeatureGrid features={LEARNING_TOOLS} onNavigate={onNavigate} />

        <button className="home-new-here" onClick={() => setShowIntro(true)}>
          <span className="home-new-here__title">New here?</span>
          <span className="home-new-here__sub">See how Shas is put together, and how this app tracks it.</span>
        </button>
      </div>

      {showIntro && (
        <div className="scrim intro-scrim" onClick={() => setShowIntro(false)}>
          <div className="popup intro-popup" onClick={(e) => e.stopPropagation()}>
            <button className="intro-popup__close" onClick={() => setShowIntro(false)} title="Close">
              ✕
            </button>
            <h2 className="intro-popup__title">How this app works</h2>
            <p className="intro-popup__lead">
              Shas has a shape. Once you know the shape, every mishnah you learn has somewhere to sit.
            </p>

            <div className="intro-levels">
              <div className="intro-level intro-level--zeraim">
                <span className="intro-level__he" dir="rtl">
                  סדר
                </span>
                <span className="intro-level__text">Six sedarim divide the whole</span>
              </div>
              <div className="intro-level">
                <span className="intro-level__he" dir="rtl">
                  מסכת
                </span>
                <span className="intro-level__text">63 masechtot sit inside them</span>
              </div>
              <div className="intro-level">
                <span className="intro-level__he" dir="rtl">
                  פרק
                </span>
                <span className="intro-level__text">524 perakim, each with a name you can learn</span>
              </div>
              <div className="intro-level">
                <span className="intro-level__he" dir="rtl">
                  משנה
                </span>
                <span className="intro-level__text">One mishnah a day is the whole habit</span>
              </div>
            </div>

            <h3 className="intro-popup__subtitle">Learning and remembering are two jobs</h3>
            <div className="intro-job">
              <p className="intro-job__title">Daily Limmud moves you forward</p>
              <p className="intro-job__text">
                Your next mishnah, in order, from Berachot to Uktzin. Marking it learned is the only
                thing that moves your progress.
              </p>
            </div>
            <div className="intro-job intro-job--gold">
              <p className="intro-job__title">Practice keeps it from slipping</p>
              <p className="intro-job__text">
                Six drills for remembering the shape of Shas — the order of the sedarim, which masechet
                belongs where, and recalling every masechet from nothing, whether you're doing chazara
                on one seder or on all of Shas.
              </p>
            </div>

            <button className="restart" onClick={() => setShowIntro(false)}>
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
