import { useState } from "react";
import type { AdminUserRow } from "../../utils/useAdmin";
import type { GameStats } from "../../utils/useGameStats";
import { localDateStr } from "../../utils/localDate";
import { GAMES, fullName, type GameId } from "./adminShared";

export function GamesSection({
  users,
  byUser,
  loading,
  error,
  onOpenUser,
}: {
  users: AdminUserRow[];
  byUser: Map<string, GameStats>;
  loading: boolean;
  error: string | null;
  onOpenUser: (id: string) => void;
}) {
  const [game, setGame] = useState<GameId>("quiz");
  const today = localDateStr();
  const selected = GAMES.find((g) => g.id === game) ?? GAMES[0];
  const rows = users
    .flatMap((u) => {
      const s = byUser.get(u.id);
      const line = s && selected.line(s, today);
      return line?.played ? [{ user: u, line }] : [];
    })
    .sort((a, b) => b.line.rank - a.line.rank || b.line.count - a.line.count);

  return (
    <>
      <label className="field">
        <span className="field__label">Game</span>
        <select className="field__input" value={game} onChange={(e) => setGame(e.target.value as GameId)}>
          {GAMES.map((g) => (
            <option key={g.id} value={g.id}>
              {g.label}
            </option>
          ))}
        </select>
        <span className="field__hint">Only games played while signed in are counted.</span>
      </label>
      {error ? (
        <p className="state state--error callout callout--bad">{error}</p>
      ) : loading && byUser.size === 0 ? (
        <p className="state state--loading">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="state state--empty">Nobody has played {selected.label} while signed in yet.</p>
      ) : (
        <div className="admin-rows">
          {rows.map(({ user: u, line }) => (
            <button key={u.id} className="card admin-row" onClick={() => onOpenUser(u.id)}>
              <span className="admin-row__main">
                <span className="admin-row__name">{fullName(u) || u.username || "—"}</span>
                <span className="admin-row__sub">
                  {u.email}
                  {line.today ? ` · today ${line.today}` : ""}
                </span>
              </span>
              <span className="admin-row__meta">
                <span className="admin-row__figure">{line.best ?? line.count}</span>
                <span className="admin-row__figure-label">
                  {line.best !== null ? `best · ${line.countLabel}` : line.countLabel}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}
    </>
  );
}
