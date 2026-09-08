import { useState } from "react";
import { PrintNotesView } from "../PrintNotes/PrintNotesView";
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
    title: "Sedarim Order Worksheet",
    desc: "Practice writing the six Sedarim in order, with the Zman Nakat mnemonic and a word bank.",
  },
  {
    id: "masechtot",
    file: "/resources/masechtot-order-worksheet.pdf",
    title: "Masechtot Order Worksheet",
    desc: "Practice writing a seder's masechtot in order, from memory — two columns, so it works for one seder or two side by side.",
  },
  {
    id: "perakim",
    file: "/resources/masechta-perek-worksheet.pdf",
    title: "Masechet & Perek Worksheet",
    desc: "Fill in a seder and masechet, then number and name every perek in your own words.",
  },
];

export function ResourcesScreen() {
  const [printOpen, setPrintOpen] = useState(false);

  return (
    <div className="stage">
      <div className="panel">
        <h1 className="panel__title">Resources</h1>
        <p className="panel__subtitle">
          Study away from the screen. Print these and fill them in from memory, then check yourself
          against the app.
        </p>

        <div className="resources-list">
          {RESOURCES.map((r) => (
            <div key={r.id} className="resource-card">
              <div className="resource-card__body">
                <p className="resource-card__title">{r.title}</p>
                <p className="resource-card__desc">{r.desc}</p>
              </div>
              <a className="resource-card__download" href={r.file} download>
                Download
              </a>
            </div>
          ))}

          <div className="resource-card">
            <div className="resource-card__body">
              <p className="resource-card__title">Mishna Notes (printable)</p>
              <p className="resource-card__desc">
                Print your own notes and concepts — pick one masechet, one seder, or all of Shas.
              </p>
            </div>
            <button className="resource-card__download" onClick={() => setPrintOpen(true)}>
              Print
            </button>
          </div>

          <div className="resource-card">
            <div className="resource-card__body">
              <p className="resource-card__title">Support &amp; Feedback</p>
              <p className="resource-card__desc">
                Found a bug, or have an idea for the app? We'd love to hear from you.
              </p>
            </div>
            <a className="resource-card__download" href="mailto:chazarashashas@gmail.com">
              Email us
            </a>
          </div>
        </div>
      </div>

      {printOpen && <PrintNotesView onClose={() => setPrintOpen(false)} />}
    </div>
  );
}
