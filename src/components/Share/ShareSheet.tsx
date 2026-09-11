import { useEffect, useRef, useState } from "react";
import { toBlob } from "html-to-image";
import { useAuth } from "../../utils/useAuth";
import { useEscapeKey } from "../../utils/useEscapeKey";
import { ShareCard } from "./ShareCard";
import type { ShareMoment } from "./shareMoments";
import "./Share.css";

const CARD_PX = 340;
const EXPORT_PX = 1080;

/** 1080 × 1080 PNG of the card exactly as previewed — fonts first, or the
    Hebrew falls back mid-render. */
async function cardPng(node: HTMLElement): Promise<File> {
  await document.fonts?.ready;
  const blob = await toBlob(node, { pixelRatio: EXPORT_PX / CARD_PX, cacheBust: true });
  if (!blob) throw new Error("Couldn't draw the card.");
  return new File([blob], "chazarat-hashas.png", { type: "image/png" });
}

function saveFile(file: File) {
  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}

interface Props {
  moment: ShareMoment;
  onClose: () => void;
}

/**
 * The share sheet (SHARE-BRIEF.md + REVISED-SHARE-BRIEF.md): heading, the
 * card itself at full size, the status text — already on the clipboard
 * the moment this opens, so there is no Copy button — the two toggles,
 * then WhatsApp, Save the image, More… and Copy link.
 */
export function ShareSheet({ moment, onClose }: Props) {
  useEscapeKey(onClose);
  const { firstName } = useAuth();
  const cardRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [withName, setWithName] = useState(false);
  const [withFigure, setWithFigure] = useState(true);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const text = moment.status.join("\n");
  const hasFigure = !!(moment.card.fig || moment.card.stepDone);

  useEffect(() => {
    navigator.clipboard?.writeText(text).then(
      () => setCopied(true),
      () => setCopied(false),
    );
  }, [text]);

  async function withCard(run: (file: File) => Promise<void> | void) {
    if (!cardRef.current || busy) return;
    setBusy(true);
    setNote(null);
    try {
      await run(await cardPng(cardRef.current));
    } catch (err) {
      // A cancelled share sheet is not a failure.
      if (!(err instanceof DOMException && err.name === "AbortError")) setNote("Couldn't make the image — try Save the image.");
    } finally {
      setBusy(false);
    }
  }

  function whatsapp() {
    withCard(async (file) => {
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text });
        return;
      }
      // No file sharing here (desktop, some browsers): the image is saved
      // for attaching, and WhatsApp opens with the text ready.
      saveFile(file);
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener");
    });
  }

  function more() {
    withCard(async (file) => {
      if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], text });
      else if (navigator.share) await navigator.share({ text, url: moment.link });
      else {
        saveFile(file);
        setNote("Image saved — the text is already copied.");
      }
    });
  }

  function copyLink() {
    navigator.clipboard?.writeText(moment.link).then(
      () => setNote("Link copied."),
      () => setNote(moment.link),
    );
  }

  return (
    <div className="modal-scrim modal-scrim--top" onClick={onClose}>
      <div className="modal modal--md share-sheet" role="dialog" aria-label={moment.sheetHead} onClick={(e) => e.stopPropagation()}>
        <button className="icon-btn modal__close" onClick={onClose} title="Close" aria-label="Close">
          ✕
        </button>
        <h2 className="modal__title">{moment.sheetHead}</h2>
        <p className="share-sheet__sub">This is what goes out. Your name is not on it unless you add it.</p>

        <div className="share-sheet__card">
          <ShareCard ref={cardRef} moment={moment} name={withName ? firstName : null} withFigure={withFigure} />
        </div>

        <div className="share-sheet__status">
          <p className="share-sheet__status-label">{copied ? "✓ STATUS TEXT · COPIED" : "STATUS TEXT"}</p>
          <p className="share-sheet__status-he" lang="he" dir="rtl">
            {moment.status[0]}
          </p>
          <p className="share-sheet__status-line">{moment.status[1]}</p>
          <p className="share-sheet__status-line share-sheet__status-line--link">{moment.status[2]}</p>
        </div>

        <div className="share-sheet__toggles">
          {firstName && (
            <button role="checkbox" aria-checked={withName} className="share-toggle" onClick={() => setWithName((v) => !v)}>
              <span className="share-toggle__box" aria-hidden="true">
                {withName ? "✓" : ""}
              </span>
              Include my name
            </button>
          )}
          {hasFigure && (
            <button role="checkbox" aria-checked={withFigure} className="share-toggle" onClick={() => setWithFigure((v) => !v)}>
              <span className="share-toggle__box" aria-hidden="true">
                {withFigure ? "✓" : ""}
              </span>
              Include the figure
            </button>
          )}
        </div>

        <div className="share-sheet__targets">
          <button className="share-target share-target--primary" disabled={busy} onClick={whatsapp}>
            <span className="share-target__dot" aria-hidden="true" />
            <span className="share-target__label">WhatsApp</span>
            <span className="share-target__meta">image + text</span>
          </button>
          <button className="share-target" disabled={busy} onClick={() => withCard(saveFile)}>
            <span className="share-target__dot" aria-hidden="true" />
            <span className="share-target__label">Save the image</span>
            <span className="share-target__meta">1080 × 1080</span>
          </button>
          <button className="share-target" disabled={busy} onClick={more}>
            <span className="share-target__dot" aria-hidden="true" />
            <span className="share-target__label">More…</span>
            <span className="share-target__meta">native sheet</span>
          </button>
          <button className="share-target" onClick={copyLink}>
            <span className="share-target__dot" aria-hidden="true" />
            <span className="share-target__label">Copy link</span>
            <span className="share-target__meta">chazarashashas.org</span>
          </button>
        </div>
        {note && <p className="share-sheet__note">{note}</p>}
      </div>
    </div>
  );
}
