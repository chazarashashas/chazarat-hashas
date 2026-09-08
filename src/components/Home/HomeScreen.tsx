import { useState } from "react";
import { useLearningProgress } from "../../utils/useLearningProgress";
import { usePerekNotes } from "../../utils/usePerekNotes";
import { useAuth } from "../../utils/useAuth";
import { useChevrusa } from "../../utils/useChevrusa";
import { useGameStats } from "../../utils/useGameStats";
import { NavIcon } from "../Icon/NavIcon";
import { BrandMark } from "../BrandMark";
import { ProgressHeaderBar } from "../ProgressHeaderBar/ProgressHeaderBar";
import { useEscapeKey } from "../../utils/useEscapeKey";
import { readVersionsSeen, licenseDeedUrl } from "../../utils/translation";
import { useTodaySnapshot } from "../../utils/useDailySubmission";
import { TodayLearningCard } from "../TodayLearning/TodayLearningCard";
import { ReceivedNudges } from "../GroupCard/ReceivedNudges";
import "./HomeScreen.css";

interface Feature {
  id: string;
  title: string;
  desc: string;
  status?: string;
}

/** My Mishna: personal, tracked things — tied to your notes, progress, or
    account. Practice: the games/drills that don't track anything
    personal, just practice. */
const MY_MISHNA: Feature[] = [
  {
    id: "limmud",
    title: "Daily Limmud",
    desc: "Your next portion of Mishnayot, straight through Shas in order.",
  },
  {
    id: "map",
    title: "Explore Shas",
    desc: "Explore every seder, masechet, perek, and mishnah, with your progress along the way.",
  },
  {
    id: "perek",
    title: "Mishna Notes",
    desc: "Make Shas yours — your own names, notes, and memory cues for every perek.",
  },
  {
    id: "progress",
    title: "My Siyumim",
    desc: "Track your streak and how much of Shas you've learned so far.",
  },
  {
    id: "chevrusa",
    title: "Chevrusa",
    desc: "Pair up one-on-one with a study partner.",
  },
  {
    id: "chabura",
    title: "Chabura",
    desc: "Start or join a group learning together, with or without a rebbe.",
  },
];

const LEARNING_TOOLS: Feature[] = [
  {
    id: "sedarim",
    title: "Sidrei Hamishna",
    desc: "Drag the six sedarim — or one seder's masechtot — into their correct order.",
  },
  {
    id: "mishna",
    title: "Mishna Quiz",
    desc: "Read a real mishnah and locate it: seder and masechet, with perek as bonus.",
  },
  {
    id: "sort",
    title: "Seder Sort",
    desc: "Sort all 63 masechtot into the seder each one belongs to.",
  },
  {
    id: "recall",
    title: "Mishna Chazara",
    desc: "Type every masechet you can remember, by seder or by all of Shas.",
  },
  {
    id: "dash",
    title: "Shas Dash",
    desc: "Steer each masechet into its seder before it reaches the end of the road.",
  },
  {
    id: "resources",
    title: "Resources",
    desc: "Printable worksheets for practicing Shas structure away from the screen.",
  },
];

function letterGrade(percent: number): string {
  if (percent >= 90) return "A";
  if (percent >= 80) return "B";
  if (percent >= 70) return "C";
  if (percent >= 60) return "D";
  return "F";
}

function FeatureGrid({ features, onNavigate }: { features: Feature[]; onNavigate: (id: string) => void }) {
  return (
    <div className="home-grid">
      {features.map((f) => (
        <button key={f.id} className={`home-card home-card--${f.id}`} onClick={() => onNavigate(f.id)}>
          <span className="home-card__icon">
            <NavIcon id={f.id} />
          </span>
          <span className="home-card__title">{f.title}</span>
          <span className="home-card__desc">{f.desc}</span>
          {f.status && <span className="home-card__status">{f.status}</span>}
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
  useEscapeKey(() => setShowIntro(false));
  // Read fresh each time the popup opens rather than kept in state — this
  // list only ever grows while the popup is closed (a translation fetched
  // elsewhere in the app), so there's nothing to react to while it's shut.
  const versionsInUse = showIntro ? readVersionsSeen() : [];
  const progress = useLearningProgress();
  const { perekNotes } = usePerekNotes();
  const { isLoggedIn, session } = useAuth();
  const { groups } = useChevrusa();
  const { stats } = useGameStats();
  const todaySnapshot = useTodaySnapshot();
  // Only chaburot where *this* account is a student — the teacher of a
  // class has no business seeing a card offering to send activity to
  // themselves. Whoever creates a Rebbe & Class chabura is automatically
  // its teacher, so that same account never sees this card for it.
  const myShiurim = groups.filter(
    (g) => g.isClass && g.members.some((m) => m.userId === session?.user.id && m.role !== "teacher"),
  );

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
    if (f.id === "chevrusa" && isLoggedIn) {
      const count = groups.filter((g) => !g.isChabura).length;
      if (count > 0) return { ...f, status: count === 1 ? "1 active chevrusa" : `${count} active chevrusot` };
    }
    if (f.id === "chabura" && isLoggedIn) {
      const count = groups.filter((g) => g.isChabura).length;
      if (count > 0) return { ...f, status: count === 1 ? "1 active chabura" : `${count} active chaburot` };
    }
    return f;
  });

  const learningToolsWithStatus = LEARNING_TOOLS.map((f) => {
    if (f.id === "sedarim" && stats.sidrei.timesCompleted > 0) {
      return { ...f, status: `${stats.sidrei.timesCompleted} completed` };
    }
    if (f.id === "mishna" && stats.quiz.timesPlayed > 0) {
      return {
        ...f,
        status: `${stats.quiz.bestScore}/${stats.quiz.bestOutOf} best (${letterGrade((stats.quiz.bestScore / stats.quiz.bestOutOf) * 100)})`,
      };
    }
    if (f.id === "sort" && stats.sort.timesCompleted > 0) {
      return { ...f, status: `${stats.sort.timesCompleted} completed` };
    }
    if (f.id === "recall" && stats.chazara.timesPlayed > 0) {
      return { ...f, status: `${stats.chazara.bestCount} best` };
    }
    if (f.id === "dash" && stats.dash.timesPlayed > 0) {
      return { ...f, status: `${stats.dash.bestScore} best` };
    }
    return f;
  });

  return (
    <div className="stage">
      <div className="panel home-panel">
        <BrandMark variant="outline" className="home-brand-mark" />
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

        <ProgressHeaderBar progress={progress} onGoToLimmud={() => onNavigate("limmud")} />

        <ReceivedNudges />

        <button className="home-new-here" onClick={() => setShowIntro(true)}>
          <span className="home-new-here__title">How this app works</span>
          <span className="home-new-here__sub">See how Shas is put together, and how this app tracks it.</span>
        </button>

        {myShiurim.map((g) => (
          <TodayLearningCard key={g.id} group={g} snapshot={todaySnapshot} />
        ))}

        <h2 className="home-section-title">My Mishna</h2>
        <FeatureGrid features={myMishnaWithStatus} onNavigate={onNavigate} />

        <h2 className="home-section-title">Practice</h2>
        <FeatureGrid features={learningToolsWithStatus} onNavigate={onNavigate} />
      </div>

      {showIntro && (
        <div className="scrim intro-scrim" onClick={() => setShowIntro(false)}>
          <div className="popup intro-popup" onClick={(e) => e.stopPropagation()}>
            <button
              className="intro-popup__close"
              onClick={() => setShowIntro(false)}
              title="Close"
              aria-label="Close"
            >
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
              <p className="intro-job__text">Your next mishnah, in order, from Berachot to Uktzin.</p>
            </div>
            <div className="intro-job intro-job--gold">
              <p className="intro-job__title">Practice keeps it from slipping</p>
              <p className="intro-job__text">
                Six drills for remembering the shape of Shas — the order of the sedarim, which masechet
                belongs where, and recalling every masechet from nothing, whether you're doing chazara
                on one seder or on all of Shas.
              </p>
            </div>

            {versionsInUse.length > 0 && (
              <p className="translation-notice">
                English translations, where shown, are pulled live from{" "}
                <a href="https://www.sefaria.org" target="_blank" rel="noopener noreferrer">
                  Sefaria
                </a>{" "}
                and belong to their own translators, each under their own license — English is
                always optional and off by default. So far on this device:{" "}
                {versionsInUse.map((v, i) => (
                  <span key={v.versionTitle}>
                    {i > 0 && ", "}
                    {v.versionTitle} (
                    {licenseDeedUrl(v.license) ? (
                      <a href={licenseDeedUrl(v.license)!} target="_blank" rel="noopener noreferrer">
                        {v.license}
                      </a>
                    ) : (
                      v.license
                    )}
                    )
                  </span>
                ))}
                .
              </p>
            )}

            <button className="restart" onClick={() => setShowIntro(false)}>
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
