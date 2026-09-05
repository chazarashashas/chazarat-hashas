import { useState } from "react";
import "./HomeScreen.css";

interface Feature {
  id: string;
  icon: string;
  title: string;
  desc: string;
  built: boolean;
}

const FEATURES: Feature[] = [
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
    id: "perek",
    icon: "❖",
    title: "My Mishna",
    desc: "Make Shas yours — your own names, notes, and memory cues for every perek.",
    built: true,
  },
];

interface HomeScreenProps {
  onNavigate: (id: string) => void;
}

export function HomeScreen({ onNavigate }: HomeScreenProps) {
  const [showIntro, setShowIntro] = useState(false);

  return (
    <div className="stage">
      <div className="panel home-panel">
        <p className="app-title">Chazarat Hashas</p>
        <h1 className="home-title" dir="rtl">
          חזרת הש״ס
        </h1>
        <p className="panel__subtitle">let's learn shas, together</p>
        <button className="home-how" onClick={() => setShowIntro(true)}>
          How this app works
        </button>

        <blockquote className="home-quote" dir="rtl">
          <p className="home-quote__text">
            "רֵישׁ לָקִישׁ אָמַר: אִם רָאִיתָ תַּלְמִיד שֶׁתַּלְמוּדוֹ קָשֶׁה עָלָיו כַּבַּרְזֶל — בִּשְׁבִיל מִשְׁנָתוֹ
            שֶׁאֵינָהּ סְדוּרָה עָלָיו"
          </p>
          <cite className="home-quote__source">— תענית ז׳ ב׳–ח׳ א׳</cite>
        </blockquote>

        <div className="home-grid">
          {FEATURES.map((f) => (
            <button
              key={f.id}
              className={"home-card" + (f.built ? "" : " home-card--disabled")}
              disabled={!f.built}
              onClick={() => onNavigate(f.id)}
            >
              <span className="home-card__icon">{f.icon}</span>
              <span className="home-card__title">{f.title}</span>
              <span className="home-card__desc">{f.desc}</span>
              {!f.built && <span className="home-card__soon">Coming soon</span>}
            </button>
          ))}
        </div>
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
