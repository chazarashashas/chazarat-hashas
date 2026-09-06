import { useState } from "react";
import { useAuth } from "../../utils/useAuth";
import { useSiyumim, type PerekClaim, type Siyum, type Visibility } from "../../utils/useSiyumim";
import { ALL_PEREK_SLOTS } from "../../utils/nishmatMosaic";
import { useLocalStorageState } from "../../utils/useLocalStorageState";
import { useEscapeKey } from "../../utils/useEscapeKey";
import { SiyumDetail } from "./SiyumDetail";
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
  return (
    <div className="siyum-card">
      <button className="siyum-card__open" onClick={onOpen}>
        <div className="siyum-card__head">
          <span className="siyum-card__name">{siyum.dedication}</span>
          <span className={"siyum-card__badge" + (siyum.visibility === "public" ? " siyum-card__badge--public" : "")}>
            {siyum.visibility === "public" ? "Public" : "Private"}
          </span>
        </div>
        {siyum.occasion && <p className="siyum-card__occasion">{siyum.occasion}</p>}

        <MiniMosaic claims={claims} />

        <div className="siyum-card__stats">
          <div className="siyum-card__stat siyum-card__stat--learned">
            <span className="siyum-card__stat-num">{stats.learned}</span>
            <span className="siyum-card__stat-label">learned</span>
          </div>
          <div className="siyum-card__stat siyum-card__stat--taken">
            <span className="siyum-card__stat-num">{stats.taken}</span>
            <span className="siyum-card__stat-label">taken</span>
          </div>
          <div className="siyum-card__stat siyum-card__stat--open">
            <span className="siyum-card__stat-num">{stats.open}</span>
            <span className="siyum-card__stat-label">still open</span>
          </div>
        </div>

        <ProgressBar {...stats} />

        <span className="siyum-card__cta">{mine ? "Open siyum →" : "Take a perek →"}</span>
      </button>

      {onHide && (
        <button
          className="siyum-card__hide"
          title="Hide this siyum from your list"
          onClick={(e) => {
            e.stopPropagation();
            onHide();
          }}
        >
          Hide
        </button>
      )}
    </div>
  );
}

interface LiluyNishmatScreenProps {
  onOpenLogin?: () => void;
  initialSlug?: string | null;
}

export function LiluyNishmatScreen({ onOpenLogin, initialSlug }: LiluyNishmatScreenProps) {
  const { session } = useAuth();
  const siyumim = useSiyumim();
  const [tab, setTab] = useState<Tab>("managing");
  const [openSiyum, setOpenSiyum] = useState<Siyum | null>(null);
  const [deepLinkTried, setDeepLinkTried] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
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

  return (
    <div className="stage">
      <div className="panel nishmat-panel">
        <div className="nishmat-head">
          <div>
            <h1 className="panel__title nishmat-title">L'Iluy Nishmat</h1>
            <p className="panel__subtitle nishmat-subtitle">
              Dedicate a full siyum on Shas to a neshama — others take perakim to help finish it.
            </p>
          </div>
          {session ? (
            <button className="nishmat-start-btn" onClick={() => setCreateOpen(true)}>
              + Start a siyum
            </button>
          ) : (
            onOpenLogin && (
              <button className="nishmat-start-btn" onClick={onOpenLogin}>
                Log in to start one
              </button>
            )
          )}
        </div>

        <div className="pill-row">
          <button
            className={"pill nishmat-tab-pill" + (tab === "managing" ? " pill--active" : "")}
            onClick={() => setTab("managing")}
          >
            Siyumim you're managing
          </button>
          <button
            className={"pill nishmat-tab-pill" + (tab === "helping" ? " pill--active" : "")}
            onClick={() => setTab("helping")}
          >
            Help others finish theirs
          </button>
        </div>

        {tab === "helping" && (
          <p className="nishmat-helping-note">
            Take on a perek and it's yours to learn — every perek someone takes brings their siyum
            closer.
          </p>
        )}

        <div className="nishmat-list">
          {tab === "managing" && !session && (
            <p className="chevrusa-empty">Log in to start or manage a siyum.</p>
          )}
          {list.length === 0 && (session || tab === "helping") && (
            <p className="chevrusa-empty">
              {tab === "managing"
                ? "You haven't started a siyum yet."
                : "No public siyumim need help right now — check back soon."}
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
        <div className="scrim" onClick={() => setCreateOpen(false)}>
          <div className="popup nishmat-modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="intro-popup__title">Start a siyum</h2>

            <label className="login-field">
              <span className="login-field__label">L'iluy nishmat</span>
              <input
                value={dedication}
                onChange={(e) => setDedication(e.target.value)}
                placeholder="e.g. Yosef ben Rivka"
              />
            </label>
            <label className="login-field">
              <span className="login-field__label">Occasion (optional)</span>
              <input
                value={occasion}
                onChange={(e) => setOccasion(e.target.value)}
                placeholder="e.g. shloshim, yahrzeit"
              />
            </label>
            <label className="login-field">
              <span className="login-field__label">Target date (optional)</span>
              <input value={targetDate} onChange={(e) => setTargetDate(e.target.value)} placeholder="e.g. before the yahrzeit" />
            </label>

            <label className="login-field">
              <span className="login-field__label">Visibility</span>
              <div className="pill-row">
                <button
                  type="button"
                  className={"pill" + (visibility === "private" ? " pill--active" : "")}
                  onClick={() => setVisibility("private")}
                >
                  Private
                </button>
                <button
                  type="button"
                  className={"pill" + (visibility === "public" ? " pill--active" : "")}
                  onClick={() => setVisibility("public")}
                >
                  Public
                </button>
              </div>
              <p className="nishmat-visibility-note">
                {visibility === "private"
                  ? "Only reachable by whoever you share the link with."
                  : "Listed in-app for any user to find and help with."}
              </p>
            </label>

            {error && (
              <div className="chevrusa-error" dir="ltr">
                <span className="chevrusa-error__dot" aria-hidden="true" />
                {error}
              </div>
            )}

            <button className="restart" disabled={busy || !dedication.trim()} onClick={handleCreate}>
              {busy ? "Creating…" : "Create siyum"}
            </button>
            <button className="nishmat-modal-cancel" onClick={() => setCreateOpen(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
