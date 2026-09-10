import { useState } from "react";
import { PrintNotesView } from "../PrintNotes/PrintNotesView";
import { NavIcon } from "../Icon/NavIcon";
import "./ResourcesScreen.css";

interface Resource {
  id: string;
  file: string;
  title: string;
  desc: string;
}

const RESOURCES: Resource[] = [
  {
    id: "sedarim",
    file: "/resources/sedarim-order-worksheet.pdf",
    title: "Sedarim order worksheet",
    desc: "Practice writing the six Sedarim in order, with the Zman Nakat mnemonic and a word bank.",
  },
  {
    id: "masechtot",
    file: "/resources/masechtot-order-worksheet.pdf",
    title: "Masechtot order worksheet",
    desc: "Practice writing a seder's masechtot in order, from memory — two columns, so it works for one seder or two side by side.",
  },
  {
    id: "perakim",
    file: "/resources/masechet-perek-worksheet.pdf",
    title: "Masechet and perek worksheet",
    desc: "Fill in a seder and masechet, then number and name every perek in your own words.",
  },
];

interface ResourcesScreenProps {
  onOpenGuide?: (anchor?: string) => void;
}

export function ResourcesScreen({ onOpenGuide }: ResourcesScreenProps) {
  const [printOpen, setPrintOpen] = useState(false);

  return (
    <div className="stage">
      <div className="panel">
        <div className="screen-head">
          <h1 className="screen-head__title">Resources</h1>
        </div>

        <div className="resources-list">
          {onOpenGuide && (
            <div className="card card--rule resource-card">
              <div className="resource-card__body">
                <p className="resource-card__title">How to use Chazarat Hashas</p>
                <p className="resource-card__desc">
                  The full guide to the method behind the app, step by step.
                </p>
              </div>
              <button className="btn btn--secondary btn--compact resource-card__download" onClick={() => onOpenGuide()}>
                Read
              </button>
            </div>
          )}

          {RESOURCES.map((r) => (
            <div key={r.id} className="card card--rule resource-card">
              <div className="resource-card__body">
                <p className="resource-card__title">{r.title}</p>
                <p className="resource-card__desc">{r.desc}</p>
              </div>
              <a className="btn btn--primary btn--compact resource-card__download" href={r.file} download>
                <NavIcon id="download" size={15} weight={2.2} />
                Download
              </a>
            </div>
          ))}

          <div className="card card--rule resource-card">
            <div className="resource-card__body">
              <p className="resource-card__title">Mishna notes (printable)</p>
              <p className="resource-card__desc">
                Print your own notes and concepts — pick one masechet, one seder, or all of Shas.
              </p>
            </div>
            <button className="btn btn--secondary btn--compact resource-card__download" onClick={() => setPrintOpen(true)}>
              <NavIcon id="print" size={15} weight={2} />
              Print
            </button>
          </div>

          <div className="card card--rule resource-card">
            <div className="resource-card__body">
              <p className="resource-card__title">Support and feedback</p>
              <p className="resource-card__desc">
                Found a bug, or have an idea for the app? We'd love to hear from you.
              </p>
            </div>
            <a className="btn btn--secondary btn--compact resource-card__download" href="mailto:chazarashashas@gmail.com">
              <NavIcon id="mail" size={15} weight={2} />
              Email us
            </a>
          </div>
        </div>
      </div>

      {printOpen && <PrintNotesView onClose={() => setPrintOpen(false)} />}
    </div>
  );
}
