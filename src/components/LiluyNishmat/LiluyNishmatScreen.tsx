import { useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { useDirection } from "../../i18n";
import { useAuth } from "../../utils/useAuth";
import { useSiyumim, type PerekClaim, type Siyum, type Visibility } from "../../utils/useSiyumim";
import { ALL_PEREK_SLOTS } from "../../utils/nishmatMosaic";
import { useLocalStorageState } from "../../utils/useLocalStorageState";
import { useEscapeKey } from "../../utils/useEscapeKey";
import { SiyumDetail } from "./SiyumDetail";
import { GateCTATwoButton } from "../SignedOutGate/SignedOutGate";
import "./LiluyNishmat.css";

type Tab = "managing" | "helping";

function ProgressBar({ learned, taken, open }: { learned: number; taken: number; open: number }) {
  const total = learned + taken + open || 1;
  return (
    <div className="siyum-card__bar">
      <div className="siyum-card__bar-seg siyum-card__bar-seg--learned" style={{ width: `${(learned / total) * 100}%` }} />
      <div className="siyum-card__bar-seg siyum-card__bar-seg--taken" style={{ width: `${(taken / total) * 100}%` }} />
    </div>
  );
}

/** A compact preview of the full mosaic — the point is that you see the
    shape of the siyum before you ever click in, not just numbers. Same
    Shas order and seder rows as the real mosaic, just smaller and with
    the labels/legend dropped. */
function MiniMosaic({ claims }: { claims: PerekClaim[] }) {
  const byKey = new Map(claims.map((c) => [`${c.masechetEn}:${c.perek}`, c]));
  const rows: { sederId: string; slots: (PerekClaim | undefined)[] }[] = [];
  for (const slot of ALL_PEREK_SLOTS) {
    let row = rows[rows.length - 1];
    if (!row || row.sederId !== slot.sederId) {
      row = { sederId: slot.sederId, slots: [] };
      rows.push(row);
    }
    row.slots.push(byKey.get(`${slot.masechetEn}:${slot.perek}`));
  }
  return (
    <div className="siyum-card__mosaic">
      {rows.map((row) => (
        <div className="siyum-card__mosaic-row" key={row.sederId}>
          {row.slots.map((claim, i) => (
            <span
              key={i}
              className={
                "siyum-card__mosaic-sq" +
                (claim?.learned
                  ? " siyum-card__mosaic-sq--learned"
                  : claim
                    ? " siyum-card__mosaic-sq--taken"
                    : "")
              }
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function SiyumCard({
  siyum,
  stats,
  claims,
  mine,
  onOpen,
  onHide,
}: {
  siyum: Siyum;
  stats: { learned: number; taken: number; open: number };
  claims: PerekClaim[];
  mine: boolean;
  onOpen: () => void;
  onHide?: () => void;
}) {
  const { t } = useTranslation(["siyumim", "common"]);
  return (
    <div className="card siyum-card">
      <button className="siyum-card__open" onClick={onOpen}>
        <div className="siyum-card__head">
          <span className="siyum-card__name">{siyum.dedication}</span>
          <span className={"siyum-card__badge" + (siyum.visibility === "public" ? " siyum-card__badge--public" : "")}>
            {siyum.visibility === "public" ? t("nishmat.public") : t("nishmat.private")}
          </span>
        </div>
        {siyum.occasion && <p className="siyum-card__occasion">{siyum.occasion}</p>}

        <MiniMosaic claims={claims} />

        <div className="siyum-card__stats">
          <div className="siyum-card__stat siyum-card__stat--learned">
            <span className="siyum-card__stat-num">{stats.learned}</span>
            <span className="siyum-card__stat-label">{t("nishmat.stat.learned")}</span>
          </div>
          <div className="siyum-card__stat siyum-card__stat--taken">
            <span className="siyum-card__stat-num">{stats.taken}</span>
            <span className="siyum-card__stat-label">{t("nishmat.stat.taken")}</span>
          </div>
          <div className="siyum-card__stat siyum-card__stat--open">
            <span className="siyum-card__stat-num">{stats.open}</span>
            <span className="siyum-card__stat-label">{t("nishmat.stat.open")}</span>
          </div>
        </div>

        <ProgressBar {...stats} />

        <span className="siyum-card__cta">{mine ? t("nishmat.openSiyum") : t("nishmat.takePerek")}</span>
      </button>

      {onHide && (
        <button
          className="siyum-card__hide"
          title={t("nishmat.hideTitle")}
          onClick={(e) => {
            e.stopPropagation();
            onHide();
          }}
        >
          {t("nishmat.hide")}
        </button>
      )}
    </div>
  );
}

interface LiluyNishmatScreenProps {
  onOpenLogin?: (mode?: "signIn" | "signUp") => void;
  initialSlug?: string | null;
}

export function LiluyNishmatScreen({ onOpenLogin, initialSlug }: LiluyNishmatScreenProps) {
  const { session } = useAuth();
  const { t } = useTranslation(["siyumim", "common"]);
  const direction = useDirection();
  const siyumim = useSiyumim();
  const [tab, setTab] = useState<Tab>("managing");
  const [openSiyum, setOpenSiyum] = useState<Siyum | null>(null);
  const [deepLinkTried, setDeepLinkTried] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  // Signed-out visitors land on a dedicated gate (see the !session return
  // below) rather than the tabbed view — "look through the open siyumim"
  // switches them into it, same as if they'd always had an account.
  const [browsing, setBrowsing] = useState(false);
  useEscapeKey(() => setCreateOpen(false));

  const [dedication, setDedication] = useState("");
  const [occasion, setOccasion] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("private");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Resolve a ?siyum=<slug> link straight to that siyum's detail view,
  // once, regardless of which tab would otherwise show — a private link
  // is the ONLY way to reach that siyum, so it must work standalone.
  if (initialSlug && !deepLinkTried && !openSiyum) {
    setDeepLinkTried(true);
    siyumim.getSiyumBySlug(initialSlug).then((s) => {
      if (s) setOpenSiyum(s);
    });
  }

  const [allStats, setAllStats] = useState<Record<string, { learned: number; taken: number; open: number }>>({});
  const [allClaims, setAllClaims] = useState<Record<string, PerekClaim[]>>({});

  async function loadStats(list: Siyum[]) {
    const entries = await Promise.all(
      list.map(async (s) => {
        const claims = await siyumim.getClaims(s.id);
        return [s.id, claims] as const;
      }),
    );
    setAllClaims((prev) => ({ ...prev, ...Object.fromEntries(entries) }));
    setAllStats((prev) => ({
      ...prev,
      ...Object.fromEntries(entries.map(([id, claims]) => [id, siyumim.statsFor(claims)])),
    }));
  }

  const [hiddenIds, setHiddenIds] = useLocalStorageState<string[]>("nishmatHiddenSiyumim", []);

  const list =
    tab === "managing" ? siyumim.mine : siyumim.publicList.filter((s) => !hiddenIds.includes(s.id));
  const [statsLoadedFor, setStatsLoadedFor] = useState("");
  const listKey = list.map((s) => s.id).join(",");
  if (listKey !== statsLoadedFor && list.length > 0) {
    setStatsLoadedFor(listKey);
    loadStats(list);
  }

  // The gate below previews two real public siyumim regardless of tab —
  // load their stats independently of the tab-driven loading above.
  const featured = siyumim.publicList.slice(0, 2);
  const featuredKey = featured.map((s) => s.id).join(",");
  const [featuredLoadedFor, setFeaturedLoadedFor] = useState("");
  if (!session && featuredKey !== featuredLoadedFor && featured.length > 0) {
    setFeaturedLoadedFor(featuredKey);
    loadStats(featured);
  }
  const statsFor = (id: string) => allStats[id] ?? { learned: 0, taken: 0, open: siyumim.TOTAL_PERAKIM };
  const claimsFor = (id: string) => allClaims[id] ?? [];

  async function handleCreate() {
    setError(null);
    setBusy(true);
    const { siyum, error: err } = await siyumim.createSiyum(dedication, occasion, targetDate, visibility);
    setBusy(false);
    if (err) {
      setError(err);
      return;
    }
    setCreateOpen(false);
    setDedication("");
    setOccasion("");
    setTargetDate("");
    setVisibility("private");
    if (siyum) setOpenSiyum(siyum);
  }

  if (openSiyum) {
    return (
      <SiyumDetail
        siyum={openSiyum}
        siyumim={siyumim}
        isOwner={session?.user.id === openSiyum.ownerId}
        onBack={() => setOpenSiyum(null)}
        onOpenLogin={onOpenLogin}
      />
    );
  }

  if (!session && !browsing && onOpenLogin) {
    const boardSiyum = featured[0];
    const boardStats = boardSiyum ? statsFor(boardSiyum.id) : null;
    const boardTaken = boardStats ? boardStats.learned + boardStats.taken : 0;

    return (
      <div className="stage">
        <div className="panel nishmat-gate">
          <h1 className="screen-head__title">{t("nishmat.title")}</h1>
          <p className="screen-head__sub">{t("nishmat.gate.sub", { total: siyumim.TOTAL_PERAKIM })}</p>

          {boardSiyum && boardStats && (
            <div className="hero-card nishmat-gate-board">
              <p className="nishmat-gate-board__head">{t("nishmat.gate.boardHead")}</p>
              <p className="nishmat-gate-board__body">{t("nishmat.gate.boardBody")}</p>
              <MiniMosaic claims={claimsFor(boardSiyum.id)} />
              <p className="nishmat-gate-board__stat">
                {t("nishmat.gate.boardStat", { taken: boardTaken, total: siyumim.TOTAL_PERAKIM })}
              </p>
            </div>
          )}

          {featured.length > 0 && (
            <>
              <p className="nishmat-gate-lead">
                {featured.length === 1 ? t("nishmat.gate.leadOne") : t("nishmat.gate.leadTwo")}
              </p>
              <div className="nishmat-list">
                {featured.map((s) => (
                  <SiyumCard
                    key={s.id}
                    siyum={s}
                    stats={statsFor(s.id)}
                    claims={claimsFor(s.id)}
                    mine={false}
                    onOpen={() => setOpenSiyum(s)}
                  />
                ))}
              </div>
            </>
          )}

          <div className="gate2-facts">
            <div className="callout nishmat-gate-fact">
              <span className="nishmat-gate-fact__rule" style={{ background: "var(--gold)" }} />
              <div>
                <p className="nishmat-gate-fact__head">{t("nishmat.gate.factAskHead")}</p>
                <p className="nishmat-gate-fact__body">
                  {t("nishmat.gate.factAskBody", { total: siyumim.TOTAL_PERAKIM })}
                </p>
              </div>
            </div>
            <div className="callout nishmat-gate-fact">
              <span className="nishmat-gate-fact__rule" style={{ background: "var(--good)" }} />
              <div>
                <p className="nishmat-gate-fact__head">{t("nishmat.gate.factLimmudHead")}</p>
                <p className="nishmat-gate-fact__body">{t("nishmat.gate.factLimmudBody")}</p>
              </div>
            </div>
            <div className="callout nishmat-gate-fact">
              <span className="nishmat-gate-fact__rule" style={{ background: "var(--ink-2)" }} />
              <div>
                <p className="nishmat-gate-fact__head">{t("nishmat.gate.factReleaseHead")}</p>
                <p className="nishmat-gate-fact__body">{t("nishmat.gate.factReleaseBody")}</p>
              </div>
            </div>
          </div>

          <GateCTATwoButton
            heading={t("nishmat.gate.accountHeading")}
            body={t("nishmat.gate.accountBody")}
            onCreateAccount={() => onOpenLogin("signUp")}
            onSignIn={() => onOpenLogin("signIn")}
          />

          <p className="gate2-footer">
            <Trans
              t={t}
              i18nKey="nishmat.gate.footer"
              components={[
                <button
                  key="browse"
                  onClick={() => {
                    setTab("helping");
                    setBrowsing(true);
                  }}
                />,
              ]}
            />
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="stage">
      <div className="panel nishmat-panel">
        <div className="nishmat-head">
          <div>
            <h1 className="panel__title nishmat-title">{t("nishmat.title")}</h1>
          </div>
          {session && (
            <button className="nishmat-start-btn" onClick={() => setCreateOpen(true)}>
              {t("nishmat.startButton")}
            </button>
          )}
        </div>

        {!session && onOpenLogin && tab === "managing" && (
          <GateCTATwoButton
            heading={t("nishmat.startAccountHeading")}
            body={t("nishmat.startAccountBody")}
            onCreateAccount={() => onOpenLogin("signUp")}
            onSignIn={() => onOpenLogin("signIn")}
          />
        )}

        <div className="pill-row">
          <button
            className={"pill nishmat-tab-pill" + (tab === "managing" ? " pill--active" : "")}
            onClick={() => setTab("managing")}
          >
            {t("nishmat.tabManaging")}
          </button>
          <button
            className={"pill nishmat-tab-pill" + (tab === "helping" ? " pill--active" : "")}
            onClick={() => setTab("helping")}
          >
            {t("nishmat.tabHelping")}
          </button>
        </div>

        {tab === "helping" && <p className="nishmat-helping-note">{t("nishmat.helpingNote")}</p>}

        <div className="nishmat-list">
          {list.length === 0 && (session || tab === "helping") && (
            <p className="chevrusa-empty">
              {tab === "managing" ? t("nishmat.emptyManaging") : t("nishmat.emptyHelping")}
            </p>
          )}
          {list.map((s) => (
            <SiyumCard
              key={s.id}
              siyum={s}
              stats={allStats[s.id] ?? { learned: 0, taken: 0, open: siyumim.TOTAL_PERAKIM }}
              claims={allClaims[s.id] ?? []}
              mine={session?.user.id === s.ownerId}
              onOpen={() => setOpenSiyum(s)}
              onHide={tab === "helping" ? () => setHiddenIds((prev) => [...prev, s.id]) : undefined}
            />
          ))}
        </div>
      </div>

      {createOpen && (
        <div className="modal-scrim" onClick={() => setCreateOpen(false)}>
          <div className="modal modal--md nishmat-modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal__title">{t("nishmat.create.title")}</h2>

            <label className="login-field">
              <span className="login-field__label">{t("nishmat.create.dedicationLabel")}</span>
              <input
                value={dedication}
                onChange={(e) => setDedication(e.target.value)}
                placeholder={t("nishmat.create.dedicationPlaceholder")}
              />
            </label>
            <label className="login-field">
              <span className="login-field__label">{t("nishmat.create.occasionLabel")}</span>
              <input
                value={occasion}
                onChange={(e) => setOccasion(e.target.value)}
                placeholder={t("nishmat.create.occasionPlaceholder")}
              />
            </label>
            <label className="login-field">
              <span className="login-field__label">{t("nishmat.create.targetDateLabel")}</span>
              <input
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                placeholder={t("nishmat.create.targetDatePlaceholder")}
              />
            </label>

            <label className="login-field">
              <span className="login-field__label">{t("nishmat.create.visibilityLabel")}</span>
              <div className="pill-row">
                <button
                  type="button"
                  className={"pill" + (visibility === "private" ? " pill--active" : "")}
                  onClick={() => setVisibility("private")}
                >
                  {t("nishmat.private")}
                </button>
                <button
                  type="button"
                  className={"pill" + (visibility === "public" ? " pill--active" : "")}
                  onClick={() => setVisibility("public")}
                >
                  {t("nishmat.public")}
                </button>
              </div>
              <p className="nishmat-visibility-note">
                {visibility === "private" ? t("nishmat.create.privateNote") : t("nishmat.create.publicNote")}
              </p>
            </label>

            {error && (
              <div className="chevrusa-error" dir={direction}>
                <span className="chevrusa-error__dot" aria-hidden="true" />
                {error}
              </div>
            )}

            <button className="restart" disabled={busy || !dedication.trim()} onClick={handleCreate}>
              {busy ? t("nishmat.create.creating") : t("nishmat.create.submit")}
            </button>
            <button className="nishmat-modal-cancel" onClick={() => setCreateOpen(false)}>
              {t("common:cancel")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
