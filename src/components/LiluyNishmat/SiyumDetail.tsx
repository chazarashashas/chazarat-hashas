import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import i18n, { useDirection, useName } from "../../i18n";
import { SEDARIM, findMasechet } from "../../data/shas";
import { getPerekName, getMishnayotCount } from "../../data/perekInfo";
import { hebrewNumeral } from "../../utils/hebrewNumeral";
import { getSederHue } from "../../utils/sederHue";
import { useLearningProgress } from "../../utils/useLearningProgress";
import { useEscapeKey } from "../../utils/useEscapeKey";
import { ALL_PEREK_SLOTS } from "../../utils/nishmatMosaic";
import type { PerekClaim, Siyum, useSiyumim } from "../../utils/useSiyumim";
import { useRunShare } from "../Share/useRunShare";
import { boardMoment } from "../Share/shareMoments";
import "./LiluyNishmat.css";

type Filter = "all" | "open" | "yours";

/** A claim carries only the masechet's English name — this finds its
    Hebrew one for the Hebrew interface. */
function useMasechetName(): (masechetEn: string) => string {
  const name = useName();
  return (masechetEn) => {
    const m = findMasechet(masechetEn);
    return m ? name(m) : masechetEn;
  };
}

function shareUrl(shareSlug: string): string {
  return `${window.location.origin}/?siyum=${shareSlug}`;
}

function timeAgo(iso: string): string {
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return i18n.t("siyumim:detail.time.justNow");
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return i18n.t("siyumim:detail.time.minutes", { count: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return i18n.t("siyumim:detail.time.hours", { count: hours });
  const days = Math.floor(hours / 24);
  return i18n.t("siyumim:detail.time.days", { count: days });
}

interface ActivityEvent {
  key: string;
  at: string;
  text: string;
}

/** Owner-only — a plain "who's doing what" list built straight from the
    claimed_at/learned_at timestamps already on each claim, so it costs
    nothing new server-side. Covers the low end of the "notifications"
    ask without needing email/push infrastructure. */
function ActivityFeed({ claims }: { claims: PerekClaim[] }) {
  const { t } = useTranslation(["siyumim", "common"]);
  const masechetName = useMasechetName();
  const events: ActivityEvent[] = [];
  for (const c of claims) {
    const who = c.anonymous ? t("detail.someone") : (c.claimedByName ?? t("detail.someone"));
    const where = { who, masechet: masechetName(c.masechetEn), numeral: hebrewNumeral(c.perek) };
    events.push({ key: `${c.id}-claim`, at: c.claimedAt, text: t("detail.activityTook", where) });
    if (c.learned && c.learnedAt) {
      events.push({ key: `${c.id}-learn`, at: c.learnedAt, text: t("detail.activityFinished", where) });
    }
  }
  events.sort((a, b) => b.at.localeCompare(a.at));
  const recent = events.slice(0, 8);

  if (recent.length === 0) return null;

  return (
    <div className="nishmat-activity">
      <p className="nishmat-activity__title">{t("detail.recentActivity")}</p>
      {recent.map((e) => (
        <div className="nishmat-activity__row" key={e.key}>
          <span className="nishmat-activity__dot" aria-hidden="true" />
          <span className="nishmat-activity__text">{e.text}</span>
          <span className="nishmat-activity__time">{timeAgo(e.at)}</span>
        </div>
      ))}
    </div>
  );
}

interface Props {
  siyum: Siyum;
  siyumim: ReturnType<typeof useSiyumim>;
  isOwner: boolean;
  onBack: () => void;
  onOpenLogin?: () => void;
}

export function SiyumDetail({ siyum, siyumim, isOwner, onBack, onOpenLogin }: Props) {
  const { t, i18n: instance } = useTranslation(["siyumim", "common"]);
  const name = useName();
  const masechetName = useMasechetName();
  const collapsedChevron = useDirection() === "rtl" ? "◂" : "▸";
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

  // The board filling — every one of the 524 perakim taken — is one of the
  // moments worth a prompt (SHARE-BRIEF.md), offered to its owner once.
  const share = useRunShare();
  const boardFull = isOwner && claims.length > 0 && stats.open === 0;
  const [boardShared, setBoardShared] = useState(false);
  useEffect(() => {
    if (!boardFull || boardShared) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBoardShared(true);
    const moment = boardMoment(siyum.dedication, siyum.shareSlug);
    share.finish(moment, [moment]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardFull]);
  const firstOpen = ALL_PEREK_SLOTS.find((s) => !byKey.has(`${s.masechetEn}:${s.perek}`));

  function claimAt(masechetEn: string, perek: number): PerekClaim | undefined {
    return byKey.get(`${masechetEn}:${perek}`);
  }

  async function handleClaimSubmit(name: string, email: string, anonymous: boolean) {
    if (!claimTarget) return t("detail.nothingToClaim");
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
          {t("detail.back")}
        </button>

        <div className="nishmat-plaque">
          <p className="nishmat-plaque__label">{t("detail.plaqueLabel")}</p>
          <h1 className="nishmat-plaque__name">{siyum.dedication}</h1>
          {(siyum.occasion || siyum.targetDate) && (
            <p className="nishmat-plaque__sub">
              {[siyum.occasion, siyum.targetDate].filter(Boolean).join(" · ")}
            </p>
          )}
          <p className="nishmat-plaque__scope">{t("detail.scope")}</p>
        </div>

        <div className="nishmat-stats">
          <div className="nishmat-stat nishmat-stat--learned">
            <span className="nishmat-stat__num">{stats.learned}</span>
            <span className="nishmat-stat__label">{t("detail.stat.learned")}</span>
          </div>
          <div className="nishmat-stat nishmat-stat--taken">
            <span className="nishmat-stat__num">{stats.taken}</span>
            <span className="nishmat-stat__label">{t("detail.stat.taken")}</span>
          </div>
          <div className="nishmat-stat nishmat-stat--open">
            <span className="nishmat-stat__num">{stats.open}</span>
            <span className="nishmat-stat__label">{t("detail.stat.open")}</span>
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
                          ? t("detail.tileStatus.learned")
                          : siyumim.isMineLocally(claim)
                            ? t("detail.tileStatus.yours")
                            : claim.anonymous
                              ? t("detail.tileStatus.taken")
                              : t("detail.tileStatus.takenBy", { name: claim.claimedByName })
                        : t("detail.tileStatus.open");
                      return (
                        <button
                          key={`${s.masechetEn}-${s.perek}`}
                          className={`nishmat-sq nishmat-sq--${state}`}
                          title={t("detail.tileTitle", { masechet: masechetName(s.masechetEn), perek: s.perek, status: label })}
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
                <i className="nishmat-legend__sw nishmat-legend__sw--learned" /> {t("detail.legend.learned")}
              </span>
              <span>
                <i className="nishmat-legend__sw nishmat-legend__sw--yours" /> {t("detail.legend.yours")}
              </span>
              <span>
                <i className="nishmat-legend__sw nishmat-legend__sw--taken" /> {t("detail.legend.taken")}
              </span>
              <span>
                <i className="nishmat-legend__sw nishmat-legend__sw--open" /> {t("detail.legend.open")}
              </span>
            </div>
          </div>
        )}

        {firstOpen && (
          <div className="nishmat-next-card">
            <p className="nishmat-next-card__label">{t("detail.next.label")}</p>
            <p className="nishmat-next-card__value">
              {t("detail.next.value", { masechet: masechetName(firstOpen.masechetEn), numeral: hebrewNumeral(firstOpen.perek) })}
            </p>
            <p className="nishmat-next-card__desc">
              {t("detail.next.desc", { n: getMishnayotCount(firstOpen.masechetEn, firstOpen.perek) })}
            </p>
            <button
              className="nishmat-next-card__btn"
              onClick={() => setClaimTarget({ masechetEn: firstOpen.masechetEn, perek: firstOpen.perek })}
            >
              {t("detail.next.take")}
            </button>
            <p className="nishmat-next-card__promise">{t("detail.promise")}</p>
          </div>
        )}

        {boardFull && share.prompt("cream")}
        {boardFull && share.link()}

        {isOwner && (
          <div className="nishmat-share-row">
            <span className="nishmat-share-row__label">{t("detail.shareLink")}</span>
            <code className="nishmat-share-row__url">{shareUrl(siyum.shareSlug)}</code>
            <button
              className="nishmat-share-row__btn"
              onClick={() => {
                navigator.clipboard?.writeText(shareUrl(siyum.shareSlug));
                setLinkCopied(true);
                window.setTimeout(() => setLinkCopied(false), 1800);
              }}
            >
              {linkCopied ? t("detail.copied") : t("detail.copy")}
            </button>
          </div>
        )}

        {isOwner && <ActivityFeed claims={claims} />}
        {share.sheet}

        <div className="nishmat-accordion">
          <div className="nishmat-accordion__head">
            <h2 className="intro-popup__subtitle nishmat-accordion__title">{t("detail.pickYourself")}</h2>
            <div className="pill-row nishmat-filter-row">
              <button className={"pill" + (filter === "all" ? " pill--active" : "")} onClick={() => setFilter("all")}>
                {t("detail.filter.all")}
              </button>
              <button
                className={"pill" + (filter === "open" ? " pill--active" : "")}
                onClick={() => setFilter("open")}
              >
                {t("detail.filter.open")}
              </button>
              <button
                className={"pill" + (filter === "yours" ? " pill--active" : "")}
                onClick={() => setFilter("yours")}
              >
                {t("detail.filter.yours")}
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
                  {/* Hebrew beside its transliteration — the Hebrew interface shows it once. */}
                  {instance.language !== "he" && <span className="nishmat-seder-row__en">{seder.en}</span>}
                  <span className="nishmat-seder-row__chevron">{sederOpen ? "▾" : collapsedChevron}</span>
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
                            <span>{name(m)}</span>
                            <span className="nishmat-masechet-row__meta">{t("detail.openCount", { n: openCount })}</span>
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
                                  const perekName = getPerekName(m.en, p);
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
                                        {state === "open" && t("detail.tile.open")}
                                        {state === "other" && (claim?.claimedByName ?? t("detail.tile.taken"))}
                                        {state === "anon" && t("detail.tile.taken")}
                                        {state === "yours" && t("detail.tile.yours")}
                                        {state === "queued" && t("detail.tile.queued")}
                                        {state === "learned" && t("detail.tile.learned")}
                                      </span>
                                      {perekName && <span className="nishmat-perek-tile__name">{perekName}</span>}
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
  const { t } = useTranslation(["siyumim", "common"]);
  const direction = useDirection();
  const masechetName = useMasechetName();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEscapeKey(onCancel);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  async function submit() {
    if (!name.trim() || !emailValid) {
      setError(t("detail.claim.invalid"));
      return;
    }
    setBusy(true);
    setError(null);
    const err = await onSubmit(name.trim(), email.trim(), anonymous);
    setBusy(false);
    if (err) setError(err);
  }

  return (
    <div className="modal-scrim" onClick={onCancel}>
      <div className="modal modal--md nishmat-modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal__title">
          {t("detail.claim.title", { masechet: masechetName(target.masechetEn), numeral: hebrewNumeral(target.perek) })}
        </h2>

        <label className="login-field">
          <span className="login-field__label">{t("detail.claim.nameLabel")}</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("detail.claim.namePlaceholder")} />
        </label>
        <label className="login-field">
          <span className="login-field__label">{t("detail.claim.emailLabel")}</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("detail.claim.emailPlaceholder")}
          />
        </label>

        <button
          type="button"
          className={"nishmat-anon-toggle" + (anonymous ? " nishmat-anon-toggle--on" : "")}
          onClick={() => setAnonymous((v) => !v)}
        >
          <span className="nishmat-anon-toggle__box" aria-hidden="true" />
          {t("detail.claim.anonymous")}
        </button>

        {error && (
          <div className="chevrusa-error" dir={direction}>
            <span className="chevrusa-error__dot" aria-hidden="true" />
            {error}
          </div>
        )}

        <button className="restart" disabled={busy} onClick={submit}>
          {busy ? t("detail.claim.taking") : t("detail.next.take")}
        </button>
        <p className="nishmat-next-card__promise">{t("detail.promise")}</p>
        <button className="nishmat-modal-cancel" onClick={onCancel}>
          {t("common:cancel")}
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
  const { t } = useTranslation(["siyumim", "common"]);
  const direction = useDirection();
  const masechetName = useMasechetName();
  const [busy, setBusy] = useState<"learn" | "queue" | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEscapeKey(onDismiss);

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
    <div className="modal-scrim" onClick={onDismiss}>
      <div className="modal modal--md nishmat-modal" onClick={(e) => e.stopPropagation()}>
        <div className="nishmat-manage-head">
          {justClaimed && (
            <span className="nishmat-stamp" dir="rtl">
              {hebrewNumeral(claim.perek)}
            </span>
          )}
          <h2 className="modal__title nishmat-manage-title">
            {t("perek.ofMasechet", { masechet: masechetName(claim.masechetEn), numeral: hebrewNumeral(claim.perek) })}
          </h2>
        </div>
        <p className="intro-popup__text">{justClaimed ? t("detail.manage.justClaimed") : t("detail.manage.prompt")}</p>

        {error && (
          <div className="chevrusa-error" dir={direction}>
            <span className="chevrusa-error__dot" aria-hidden="true" />
            {error}
          </div>
        )}

        <button className="nishmat-manage-btn nishmat-manage-btn--learn" disabled={busy !== null} onClick={handleLearn}>
          {busy === "learn" ? t("detail.manage.marking") : t("detail.manage.markLearned")}
        </button>
        {!claim.queuedInDailyLimmud && (
          <button className="nishmat-manage-btn nishmat-manage-btn--queue" disabled={busy !== null} onClick={handleQueue}>
            {busy === "queue" ? t("detail.manage.adding") : t("detail.manage.addToLimmud")}
          </button>
        )}
        <button className="nishmat-manage-btn nishmat-manage-btn--release" disabled={busy !== null} onClick={onRelease}>
          {t("detail.manage.release")}
        </button>
        <button className="nishmat-modal-cancel" onClick={onDismiss}>
          {t("detail.manage.later")}
        </button>
      </div>
    </div>
  );
}
