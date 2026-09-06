import { useEffect, useState } from "react";
import { SEDARIM } from "../../data/shas";
import { getPerekName } from "../../data/perekInfo";
import { hebrewNumeral } from "../../utils/hebrewNumeral";
import { getSederHue } from "../../utils/sederHue";
import { useLearningProgress } from "../../utils/useLearningProgress";
import { ALL_PEREK_SLOTS } from "../../utils/nishmatMosaic";
import type { PerekClaim, Siyum, useSiyumim } from "../../utils/useSiyumim";
import "./LiluyNishmat.css";

type Filter = "all" | "open" | "yours";

function shareUrl(shareSlug: string): string {
  return `${window.location.origin}/?siyum=${shareSlug}`;
}

interface Props {
  siyum: Siyum;
  siyumim: ReturnType<typeof useSiyumim>;
  isOwner: boolean;
  onBack: () => void;
  onOpenLogin?: () => void;
}

export function SiyumDetail({ siyum, siyumim, isOwner, onBack, onOpenLogin }: Props) {
  const progress = useLearningProgress();
  const [claims, setClaims] = useState<PerekClaim[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [claimTarget, setClaimTarget] = useState<{ masechetEn: string; perek: number } | null>(null);
  const [manageClaim, setManageClaim] = useState<PerekClaim | null>(null);
  const [justClaimed, setJustClaimed] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const [openSederId, setOpenSederId] = useState<string | null>(null);
  const [openMasechetEn, setOpenMasechetEn] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");

  async function refresh() {
    const rows = await siyumim.getClaims(siyum.id);
    setClaims(rows);
    setLoaded(true);
  }

  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => {
      if (!cancelled) refresh();
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siyum.id]);

  const byKey = new Map(claims.map((c) => [`${c.masechetEn}:${c.perek}`, c]));
  const stats = siyumim.statsFor(claims);
  const firstOpen = ALL_PEREK_SLOTS.find((s) => !byKey.has(`${s.masechetEn}:${s.perek}`));

  function claimAt(masechetEn: string, perek: number): PerekClaim | undefined {
    return byKey.get(`${masechetEn}:${perek}`);
  }

  async function handleClaimSubmit(name: string, email: string, anonymous: boolean) {
    if (!claimTarget) return "Nothing to claim.";
    const { claim, error } = await siyumim.claimPerek(
      siyum.id,
      claimTarget.masechetEn,
      claimTarget.perek,
      name,
      email,
      anonymous,
    );
    if (error) return error;
    await refresh();
    setClaimTarget(null);
    if (claim) {
      setJustClaimed(true);
      setManageClaim(claim);
    }
    return null;
  }

  async function handleMarkLearned(claim: PerekClaim) {
    const err = await siyumim.markLearned(claim);
    if (err) return err;
    progress.logLearning(claim.masechetEn, claim.perek, siyumim.todayStr());
    await refresh();
    setManageClaim(null);
    return null;
  }

  async function handleAddToDailyLimmud(claim: PerekClaim) {
    const err = await siyumim.addToDailyLimmud(claim);
    if (err) return err;
    await refresh();
    setManageClaim((prev) => (prev ? { ...prev, queuedInDailyLimmud: true } : prev));
    return null;
  }

  async function handleRelease(claim: PerekClaim) {
    await siyumim.releaseClaim(claim);
    await refresh();
    setManageClaim(null);
  }

  function tileState(claim: PerekClaim | undefined): "open" | "other" | "anon" | "yours" | "queued" | "learned" {
    if (!claim) return "open";
    if (claim.learned) return "learned";
    const mine = siyumim.isMineLocally(claim);
    if (mine) return claim.queuedInDailyLimmud ? "queued" : "yours";
    return claim.anonymous ? "anon" : "other";
  }

  function handleTileClick(masechetEn: string, perek: number) {
    const claim = claimAt(masechetEn, perek);
    if (!claim) {
      setClaimTarget({ masechetEn, perek });
      return;
    }
    if (siyumim.isMineLocally(claim) && !claim.learned) {
      setJustClaimed(false);
      setManageClaim(claim);
    }
  }

  return (
    <div className="stage">
      <div className="panel nishmat-detail-panel">
        <button className="nishmat-back" onClick={onBack}>
          ← All siyumim
        </button>

        <div className="nishmat-plaque">
          <p className="nishmat-plaque__label">L'iluy nishmat</p>
          <h1 className="nishmat-plaque__name">{siyum.dedication}</h1>
          {(siyum.occasion || siyum.targetDate) && (
            <p className="nishmat-plaque__sub">
              {[siyum.occasion, siyum.targetDate].filter(Boolean).join(" · ")}
            </p>
          )}
          <p className="nishmat-plaque__scope">All of Shas — 524 perakim</p>
        </div>

        <div className="nishmat-stats">
          <div className="nishmat-stat nishmat-stat--learned">
            <span className="nishmat-stat__num">{stats.learned}</span>
            <span className="nishmat-stat__label">learned</span>
          </div>
          <div className="nishmat-stat nishmat-stat--taken">
            <span className="nishmat-stat__num">{stats.taken}</span>
            <span className="nishmat-stat__label">taken, not yet learned</span>
          </div>
          <div className="nishmat-stat nishmat-stat--open">
            <span className="nishmat-stat__num">{stats.open}</span>
            <span className="nishmat-stat__label">still open</span>
          </div>
        </div>

        {loaded && (
          <div className="nishmat-mosaic">
            {SEDARIM.map((seder) => {
              const slots = ALL_PEREK_SLOTS.filter((s) => s.sederId === seder.id);
              const done = slots.filter((s) => claimAt(s.masechetEn, s.perek)?.learned).length;
              return (
                <div className="nishmat-mosaic__row" key={seder.id}>
                  <div className="nishmat-mosaic__row-label">
                    <span className="nishmat-mosaic__he" dir="rtl" style={{ color: getSederHue(seder.id) }}>
                      {seder.he}
                    </span>
                    <span className="nishmat-mosaic__count">
                      {done}/{slots.length}
                    </span>
                  </div>
                  <div className="nishmat-mosaic__squares">
                    {slots.map((s) => {
                      const claim = claimAt(s.masechetEn, s.perek);
                      const state = tileState(claim);
                      const label = claim
                        ? claim.learned
                          ? "learned"
                          : siyumim.isMineLocally(claim)
                            ? "yours"
                            : claim.anonymous
                              ? "taken"
                              : `taken by ${claim.claimedByName}`
                        : "open";
                      return (
                        <button
                          key={`${s.masechetEn}-${s.perek}`}
                          className={`nishmat-sq nishmat-sq--${state}`}
                          title={`${s.masechetEn} · perek ${s.perek} — ${label}`}
                          onClick={() => handleTileClick(s.masechetEn, s.perek)}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
            <div className="nishmat-legend">
              <span>
                <i className="nishmat-legend__sw nishmat-legend__sw--learned" /> Learned
              </span>
              <span>
                <i className="nishmat-legend__sw nishmat-legend__sw--yours" /> Yours
              </span>
              <span>
                <i className="nishmat-legend__sw nishmat-legend__sw--taken" /> Taken
              </span>
              <span>
                <i className="nishmat-legend__sw nishmat-legend__sw--open" /> Open
              </span>
            </div>
          </div>
        )}

        {firstOpen && (
          <div className="nishmat-next-card">
            <div>
              <p className="nishmat-next-card__label">Take whichever comes next</p>
              <p className="nishmat-next-card__value">
                {firstOpen.masechetEn} — Perek {hebrewNumeral(firstOpen.perek)}
              </p>
            </div>
            <button
              className="nishmat-next-card__btn"
              onClick={() => setClaimTarget({ masechetEn: firstOpen.masechetEn, perek: firstOpen.perek })}
            >
              Take it
            </button>
          </div>
        )}

        {isOwner && (
          <div className="nishmat-share-row">
            <span className="nishmat-share-row__label">Share link</span>
            <code className="nishmat-share-row__url">{shareUrl(siyum.shareSlug)}</code>
            <button
              className="nishmat-share-row__btn"
              onClick={() => {
                navigator.clipboard?.writeText(shareUrl(siyum.shareSlug));
                setLinkCopied(true);
                window.setTimeout(() => setLinkCopied(false), 1800);
              }}
            >
              {linkCopied ? "Copied!" : "Copy"}
            </button>
          </div>
        )}

        <div className="nishmat-accordion">
          <div className="nishmat-accordion__head">
            <h2 className="intro-popup__subtitle nishmat-accordion__title">Or pick one yourself</h2>
            <div className="pill-row nishmat-filter-row">
              <button className={"pill" + (filter === "all" ? " pill--active" : "")} onClick={() => setFilter("all")}>
                All perakim
              </button>
              <button
                className={"pill" + (filter === "open" ? " pill--active" : "")}
                onClick={() => setFilter("open")}
              >
                Open only
              </button>
              <button
                className={"pill" + (filter === "yours" ? " pill--active" : "")}
                onClick={() => setFilter("yours")}
              >
                Yours
              </button>
            </div>
          </div>

          {SEDARIM.map((seder) => {
            const sederOpen = openSederId === seder.id;
            return (
              <div className="nishmat-seder-row" key={seder.id}>
                <button
                  className="nishmat-seder-row__head"
                  style={{ ["--row-hue" as string]: getSederHue(seder.id) }}
                  onClick={() => {
                    setOpenSederId(sederOpen ? null : seder.id);
                    setOpenMasechetEn(null);
                  }}
                >
                  <span dir="rtl" className="nishmat-seder-row__he">
                    {seder.he}
                  </span>
                  <span className="nishmat-seder-row__en">{seder.en}</span>
                  <span className="nishmat-seder-row__chevron">{sederOpen ? "▾" : "▸"}</span>
                </button>

                {sederOpen && (
                  <div className="nishmat-masechet-list">
                    {seder.masechtot.map((m) => {
                      const openCount = Array.from({ length: m.perakim }, (_, i) => i + 1).filter(
                        (p) => !claimAt(m.en, p),
                      ).length;
                      const masechetOpen = openMasechetEn === m.en;
                      return (
                        <div key={m.en}>
                          <button
                            className="nishmat-masechet-row"
                            onClick={() => setOpenMasechetEn(masechetOpen ? null : m.en)}
                          >
                            <span>{m.en}</span>
                            <span className="nishmat-masechet-row__meta">{openCount} open</span>
                          </button>

                          {masechetOpen && (
                            <div className="nishmat-perek-grid">
                              {Array.from({ length: m.perakim }, (_, i) => i + 1)
                                .filter((p) => {
                                  const claim = claimAt(m.en, p);
                                  if (filter === "open") return !claim;
                                  if (filter === "yours") return claim && siyumim.isMineLocally(claim);
                                  return true;
                                })
                                .map((p) => {
                                  const claim = claimAt(m.en, p);
                                  const state = tileState(claim);
                                  const name = getPerekName(m.en, p);
                                  return (
                                    <button
                                      key={p}
                                      className={`nishmat-perek-tile nishmat-perek-tile--${state}`}
                                      onClick={() => handleTileClick(m.en, p)}
                                    >
                                      <span className="nishmat-perek-tile__letter" dir="rtl">
                                        {hebrewNumeral(p)}
                                      </span>
                                      <span className="nishmat-perek-tile__status">
                                        {state === "open" && "Open — tap to take"}
                                        {state === "other" && (claim?.claimedByName ?? "Taken")}
                                        {state === "anon" && "Taken"}
                                        {state === "yours" && "Yours — tap"}
                                        {state === "queued" && "In your Limmud"}
                                        {state === "learned" && "Learned ✓"}
                                      </span>
                                      {name && <span className="nishmat-perek-tile__name">{name}</span>}
                                    </button>
                                  );
                                })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {claimTarget && (
        <ClaimModal
          target={claimTarget}
          onCancel={() => setClaimTarget(null)}
          onSubmit={handleClaimSubmit}
        />
      )}

      {manageClaim && (
        <ManageClaimModal
          claim={manageClaim}
          justClaimed={justClaimed}
          onDismiss={() => setManageClaim(null)}
          onMarkLearned={() => handleMarkLearned(manageClaim)}
          onAddToDailyLimmud={() => handleAddToDailyLimmud(manageClaim)}
          onRelease={() => handleRelease(manageClaim)}
          onOpenLogin={onOpenLogin}
        />
      )}
    </div>
  );
}

function ClaimModal({
  target,
  onCancel,
  onSubmit,
}: {
  target: { masechetEn: string; perek: number };
  onCancel: () => void;
  onSubmit: (name: string, email: string, anonymous: boolean) => Promise<string | null>;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  async function submit() {
    if (!name.trim() || !emailValid) {
      setError("Enter your name and a valid email.");
      return;
    }
    setBusy(true);
    setError(null);
    const err = await onSubmit(name.trim(), email.trim(), anonymous);
    setBusy(false);
    if (err) setError(err);
  }

  return (
    <div className="scrim" onClick={onCancel}>
      <div className="popup nishmat-modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="intro-popup__title">
          Take on {target.masechetEn} — Perek {hebrewNumeral(target.perek)}
        </h2>

        <label className="login-field">
          <span className="login-field__label">Name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
        </label>
        <label className="login-field">
          <span className="login-field__label">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </label>

        <button
          type="button"
          className={"nishmat-anon-toggle" + (anonymous ? " nishmat-anon-toggle--on" : "")}
          onClick={() => setAnonymous((v) => !v)}
        >
          <span className="nishmat-anon-toggle__box" aria-hidden="true" />
          Keep my name private — just show "claimed" to others
        </button>

        {error && (
          <div className="chevrusa-error" dir="ltr">
            <span className="chevrusa-error__dot" aria-hidden="true" />
            {error}
          </div>
        )}

        <button className="restart" disabled={busy} onClick={submit}>
          {busy ? "Taking it…" : "Take this perek"}
        </button>
        <button className="nishmat-modal-cancel" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}

function ManageClaimModal({
  claim,
  justClaimed,
  onDismiss,
  onMarkLearned,
  onAddToDailyLimmud,
  onRelease,
}: {
  claim: PerekClaim;
  justClaimed: boolean;
  onDismiss: () => void;
  onMarkLearned: () => Promise<string | null>;
  onAddToDailyLimmud: () => Promise<string | null>;
  onRelease: () => void;
  onOpenLogin?: () => void;
}) {
  const [busy, setBusy] = useState<"learn" | "queue" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleLearn() {
    setBusy("learn");
    const err = await onMarkLearned();
    setBusy(null);
    if (err) setError(err);
  }
  async function handleQueue() {
    setBusy("queue");
    const err = await onAddToDailyLimmud();
    setBusy(null);
    if (err) setError(err);
  }

  return (
    <div className="scrim" onClick={onDismiss}>
      <div className="popup nishmat-modal" onClick={(e) => e.stopPropagation()}>
        <div className="nishmat-manage-head">
          {justClaimed && (
            <span className="nishmat-stamp" dir="rtl">
              {hebrewNumeral(claim.perek)}
            </span>
          )}
          <h2 className="intro-popup__title nishmat-manage-title">
            {claim.masechetEn} — Perek {hebrewNumeral(claim.perek)}
          </h2>
        </div>
        <p className="intro-popup__text">
          {justClaimed ? "This perek is yours. " : ""}
          What would you like to do?
        </p>

        {error && (
          <div className="chevrusa-error" dir="ltr">
            <span className="chevrusa-error__dot" aria-hidden="true" />
            {error}
          </div>
        )}

        <button className="nishmat-manage-btn nishmat-manage-btn--learn" disabled={busy !== null} onClick={handleLearn}>
          {busy === "learn" ? "Marking…" : "Mark as learned now"}
        </button>
        {!claim.queuedInDailyLimmud && (
          <button className="nishmat-manage-btn nishmat-manage-btn--queue" disabled={busy !== null} onClick={handleQueue}>
            {busy === "queue" ? "Adding…" : "Add to my Daily Limmud"}
          </button>
        )}
        <button className="nishmat-manage-btn nishmat-manage-btn--release" disabled={busy !== null} onClick={onRelease}>
          Release this perek
        </button>
        <button className="nishmat-modal-cancel" onClick={onDismiss}>
          I'll decide later
        </button>
      </div>
    </div>
  );
}
