import { useState } from "react";
import { supabase } from "./supabase";
import { useAuth } from "./useAuth";
import { useLearningProgress } from "./useLearningProgress";
import { useGameStats } from "./useGameStats";
import { hebrewNumeral } from "./hebrewNumeral";

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export interface SubmissionActivity {
  key: "limmud" | "quiz" | "sidrei" | "sort" | "dash" | "chazara";
  label: string;
  /** One line, e.g. "Berachot 3:1–3:4" or "12/15 — B" — shown in the
      activity row and, verbatim, in the rebbe's per-student history. */
  detail: string;
  /** The short right-aligned figure — "4 mishnayot", "B", "12/15",
      "47", "5 masechtot". Same source the grid's column reads. */
  figure: string;
}

export interface TodaySnapshot {
  date: string;
  activities: SubmissionActivity[];
}

/**
 * What the app already knows the student did today — see
 * REBBE-DASHBOARD-BRIEF.md §0: one send a day, collected from existing
 * data, never a self-report. Notes, concepts, and siyumim are never
 * included here, full stop (§5) — there is no path in this file that
 * reads them.
 */
export function useTodaySnapshot(): TodaySnapshot {
  const progress = useLearningProgress();
  const { stats } = useGameStats();
  const date = todayStr();

  const activities: SubmissionActivity[] = [];

  const todaysCompletions = progress.completions.filter((c) => c.date === date);
  if (todaysCompletions.length > 0) {
    const byMasechet = new Map<string, { perek: number; mishnah: number }[]>();
    for (const c of todaysCompletions) {
      byMasechet.set(c.masechetEn, [...(byMasechet.get(c.masechetEn) ?? []), { perek: c.perek, mishnah: c.mishnah }]);
    }
    const parts = Array.from(byMasechet.entries()).map(([masechetEn, items]) => {
      const perekim = Array.from(new Set(items.map((i) => i.perek))).sort((a, b) => a - b);
      const perekLabel = perekim.map((p) => hebrewNumeral(p)).join(", ");
      return `${masechetEn} — Perek ${perekLabel}`;
    });
    activities.push({
      key: "limmud",
      label: "Daily Limmud",
      detail: parts.join("; "),
      figure: `${todaysCompletions.length} mishnah${todaysCompletions.length === 1 ? "" : "yot"}`,
    });
  }

  if (stats.quiz.today?.date === date) {
    const { bestScore, bestOutOf } = stats.quiz.today;
    const pct = bestOutOf > 0 ? (bestScore / bestOutOf) * 100 : 0;
    const grade = pct >= 90 ? "A" : pct >= 80 ? "B" : pct >= 70 ? "C" : pct >= 60 ? "D" : "F";
    activities.push({
      key: "quiz",
      label: "Mishna Quiz",
      detail: `${bestScore}/${bestOutOf} — ${grade}`,
      figure: grade,
    });
  }

  if (stats.sidrei.today?.date === date) {
    const { placed, total } = stats.sidrei.today;
    activities.push({
      key: "sidrei",
      label: "Sidrei Hamishna",
      detail: `${placed} of ${total} placed`,
      figure: `${placed}/${total}`,
    });
  }

  if (stats.sort.today?.date === date) {
    const { placed, total } = stats.sort.today;
    activities.push({
      key: "sort",
      label: "Seder Sort",
      detail: `${placed} of ${total} placed`,
      figure: `${placed}/${total}`,
    });
  }

  if (stats.dash.today?.date === date) {
    activities.push({
      key: "dash",
      label: "Shas Dash",
      detail: `Best score ${stats.dash.today.bestScore}`,
      figure: String(stats.dash.today.bestScore),
    });
  }

  if (stats.chazara.today?.date === date) {
    const { bestCount, scope } = stats.chazara.today;
    activities.push({
      key: "chazara",
      label: "Mishna Chazara",
      detail: `${bestCount} recalled — ${scope}`,
      figure: `${bestCount} masechet${bestCount === 1 ? "" : "ot"}`,
    });
  }

  return { date, activities };
}

export type SentState = "idle" | "sending" | "sent" | "error";

/** Sends (or resends — a resend overwrites, never appends) today's
    snapshot for one chabura. A student in more than one chabura sends
    to each independently, since a Wednesday shiur and a Sunday shiur
    are two different rebbeim who each need their own copy. */
export function useSendDailySubmission(groupId: string) {
  const { session } = useAuth();
  const [state, setState] = useState<SentState>("idle");
  const [error, setError] = useState<string | null>(null);

  async function send(snapshot: TodaySnapshot) {
    if (!supabase || !session) {
      setState("error");
      setError("Accounts aren't connected yet.");
      return;
    }
    setState("sending");
    setError(null);
    const { error: err } = await supabase.from("group_submissions").upsert(
      {
        group_id: groupId,
        user_id: session.user.id,
        submission_date: snapshot.date,
        payload: snapshot,
        sent_at: new Date().toISOString(),
      },
      { onConflict: "group_id,user_id,submission_date" },
    );
    if (err) {
      setState("error");
      setError("Couldn't send right now — check your connection and try again.");
      return;
    }
    setState("sent");
  }

  return { state, error, send };
}

export interface WeekDay {
  date: string;
  sent: boolean;
}

/** This device's own last-7-days record for one chabura, for the week
    strip — the only place a student's own submission history is shown
    to them (§1). Reads back only dates, never the payload content. */
export async function fetchMyWeek(groupId: string, userId: string): Promise<WeekDay[]> {
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  if (!supabase) return days.map((date) => ({ date, sent: false }));
  const { data } = await supabase
    .from("group_submissions")
    .select("submission_date")
    .eq("group_id", groupId)
    .eq("user_id", userId)
    .in("submission_date", days);
  const sentDates = new Set((data ?? []).map((r) => r.submission_date as string));
  return days.map((date) => ({ date, sent: sentDates.has(date) }));
}
