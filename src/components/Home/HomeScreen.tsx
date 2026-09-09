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
import { NudgeStrip } from "../NudgeStrip/NudgeStrip";
import { nudgeCopy, pluralize } from "../../utils/nudgeCopy";
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

const GUIDE_TEASER_SEEN_KEY = "chazarat-hashas:hasSeenGuideTeaser";

/** GUIDEBRIEF2.md's "cheapest onboarding": a single strip naming Step 1,
    on a true first visit only — reuses NudgeStrip rather than a new
    component, and reads/marks its own localStorage flag directly
    (deliberately not one of the synced SYNC_KEYS: whether a specific
    device has already seen this onboarding hint isn't meaningful data
    to carry to another device). Marked seen the moment it mounts, not
    only when clicked — it's "shown once," not "shown until acted on". */
function useGuideTeaserVisible(): boolean {
  const [visible] = useState(() => {
    try {
      if (localStorage.getItem(GUIDE_TEASER_SEEN_KEY)) return false;
      localStorage.setItem(GUIDE_TEASER_SEEN_KEY, "1");
      return true;
    } catch {
      return false;
    }
  });
  return visible;
}

interface HomeScreenProps {
  onNavigate: (id: string) => void;
}

export function HomeScreen({ onNavigate }: HomeScreenProps) {
  const showGuideTeaser = useGuideTeaserVisible();
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

        {!isLoggedIn && (
          <NudgeStrip
            text={nudgeCopy(
              [
                progress.streak.current > 0 ? pluralize(progress.streak.current, "day streak", "day streak") : null,
                progress.completions.length > 0 ? pluralize(progress.completions.length, "mishnah", "mishnayot") : null,
              ],
              "Sign in to keep your progress.",
            )}
            actionLabel="Keep them →"
            onAction={() => onNavigate("login")}
          />
        )}

        {showGuideTeaser && (
          <NudgeStrip
            text="New here? Start with Step 1 — Learn the Sedarim."
            actionLabel="Read the whole guide →"
            onAction={() => onNavigate("guide")}
            accentColor="var(--hue-guide)"
          />
        )}

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

            <button
              className="intro-popup__guide-link"
              onClick={() => {
                setShowIntro(false);
                onNavigate("guide");
              }}
            >
              Read the full guide to using this app →
            </button>

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
