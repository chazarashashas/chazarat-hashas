import { useState } from "react";
import { useLearningProgress } from "../../utils/useLearningProgress";
import "./HomeScreen.css";

interface Feature {
  id: string;
  icon: string;
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
    icon: "◷",
    title: "Daily Limmud",
    desc: "Your next portion of Mishnayot, straight through Shas in order.",
    built: true,
  },
  {
    id: "map",
    icon: "⊞",
    title: "Map of Shas",
    desc: "Explore every seder, masechet, perek, and mishnah, with your progress along the way.",
    built: true,
  },
  {
    id: "perek",
    icon: "❖",
    title: "Mishna Notes",
    desc: "Make Shas yours — your own names, notes, and memory cues for every perek.",
    built: true,
  },
  {
    id: "progress",
    icon: "◈",
    title: "Progress",
    desc: "Track your streak and how much of Shas you've learned so far.",
    built: true,
  },
  {
    id: "chevrusa",
    icon: "⚯",
    title: "Chevrusa",
    desc: "Pair up with a study partner or start a chabura to learn together.",
    built: true,
  },
  {
    id: "login",
    icon: "⚿",
    title: "Log In",
    desc: "Sign in to save your notes, progress, and streak to your account.",
    built: true,
  },
];

const LEARNING_TOOLS: Feature[] = [
  {
    id: "sedarim",
    icon: "★",
    title: "Sidrei Hamishna",
    desc: "Drag the six sedarim — or one seder's masechtot — into their correct order.",
    built: true,
  },
  {
    id: "mishna",
    icon: "◆",
    title: "Mishna Quiz",
    desc: "Read a real mishnah and locate it: seder and masechet, with perek as bonus.",
    built: true,
  },
  {
    id: "sort",
    icon: "▧",
    title: "Seder Sort",
    desc: "Sort all 63 masechtot into the seder each one belongs to.",
    built: true,
  },
  {
    id: "recall",
    icon: "✎",
    title: "Mishna Chazara",
    desc: "Type every masechet you can remember, by seder or by all of Shas.",
    built: true,
  },
  {
    id: "dash",
    icon: "↯",
    title: "Shas Dash",
    desc: "Steer each masechet into its seder before it reaches the end of the road.",
    built: true,
  },
  {
    id: "resources",
    icon: "⎙",
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
          className={"home-card" + (f.built ? "" : " home-card--disabled")}
          disabled={!f.built}
          onClick={() => onNavigate(f.id)}
        >
          <span className="home-card__icon">{f.icon}</span>
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

  const myMishnaWithStatus = MY_MISHNA.map((f) => {
    if (f.id === "limmud") {
      return {
        ...f,
        status: progress.finishedShas
          ? "Finished Shas!"
          : `🔥 ${progress.streak.current}-day streak`,
      };
    }
    if (f.id === "progress") {
      return { ...f, status: `${progress.shasPercent()}% of Shas learned` };
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

        <button className="home-how" onClick={() => setShowIntro(true)}>
          How this app works
        </button>

        <h2 className="home-section-title">My Mishna</h2>
        <FeatureGrid features={myMishnaWithStatus} onNavigate={onNavigate} />

        <h2 className="home-section-title">Learning Tools</h2>
        <FeatureGrid features={LEARNING_TOOLS} onNavigate={onNavigate} />
      </div>

      {showIntro && (
        <div className="scrim intro-scrim" onClick={() => setShowIntro(false)}>
          <div className="popup intro-popup" onClick={(e) => e.stopPropagation()}>
            <button className="intro-popup__close" onClick={() => setShowIntro(false)} title="Close">
              ✕
            </button>
            <p className="popup__mark">🗺️</p>
            <h2 className="intro-popup__title">How Chazaras HaShas Works</h2>
            <p className="intro-popup__text">
              You're building a mental map of Shas, one layer at a time: the six Sedarim, then the
              Masechtot in each Seder, then the Perakim in each Masechet, then the Mishnayot in each
              Perek.
            </p>
            <p className="intro-popup__text">
              Just starting out? Start at the top and work down. Already know a lot of Shas? Use Mishna
              Quiz and the other games to see where you need more chazara.
            </p>
            <button className="restart" onClick={() => setShowIntro(false)}>
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
