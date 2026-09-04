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
    desc: "Read a real mishnah and guess its seder, masechet, and perek.",
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
    icon: "⚡",
    title: "Shas Dash",
    desc: "Steer each masechet into its seder before it reaches the end of the road.",
    built: true,
  },
  {
    id: "perek",
    icon: "🔖",
    title: "My Mishna",
    desc: "A notebook — describe each masechet, or nickname every perek, in your own words.",
    built: true,
  },
];

interface HomeScreenProps {
  onNavigate: (id: string) => void;
}

export function HomeScreen({ onNavigate }: HomeScreenProps) {
  return (
    <div className="stage">
      <div className="panel home-panel">
        <p className="app-title">Chazarat Hashas</p>
        <h1 className="home-title" dir="rtl">
          חזרת ש״ס
        </h1>
        <p className="panel__subtitle">Know all of Shas by heart.</p>

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
    </div>
  );
}
