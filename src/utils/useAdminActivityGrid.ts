import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import type { ChaburaStudent, Submission } from "./useRebbeChabura";
import type { SubmissionActivity } from "./useDailySubmission";

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function activity(
  key: SubmissionActivity["key"],
  label: string,
  value: number | null,
  outOf: number | null,
  figure: (v: number, o: number | null) => string,
): SubmissionActivity | null {
  if (value === null) return null;
  return { key, label, detail: "", figure: figure(value, outOf), value, outOf: outOf ?? undefined };
}

/**
 * Same shape as the rebbe dashboard's grid, but live and app-wide — the
 * superadmin doesn't need anything "sent" first, so this reads straight
 * from admin_activity_today() instead of group_submissions. Reusing
 * RebbeGrid's own Submission/ChaburaStudent types means the exact same
 * component renders both.
 */
export function useAdminActivityGrid(isAdmin: boolean) {
  const [students, setStudents] = useState<ChaburaStudent[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin || !supabase) return;
    let cancelled = false;
    setLoading(true);
    supabase.rpc("admin_activity_today").then(({ data, error: err }) => {
      if (cancelled) return;
      if (err) {
        setError(err.message);
        setLoading(false);
        return;
      }
      const rows = (data as Record<string, unknown>[]) ?? [];
      const date = todayStr();
      setStudents(rows.map((r) => ({ userId: r.id as string, firstName: r.first_name as string | null, username: r.username as string | null })));
      setSubmissions(
        rows.map((r) => {
          const activities = [
            activity("limmud", "Daily Limmud", Number(r.limmud_count) || null, null, (v) => `${v} mishnah${v === 1 ? "" : "yot"}`),
            activity(
              "quiz",
              "Mishna Quiz",
              r.quiz_score === null ? null : Number(r.quiz_score),
              r.quiz_out_of === null ? null : Number(r.quiz_out_of),
              (v, o) => {
                const pct = o ? (v / o) * 100 : 0;
                return pct >= 90 ? "A" : pct >= 80 ? "B" : pct >= 70 ? "C" : pct >= 60 ? "D" : "F";
              },
            ),
            activity(
              "sidrei",
              "Sidrei Hamishna",
              r.sidrei_placed === null ? null : Number(r.sidrei_placed),
              r.sidrei_total === null ? null : Number(r.sidrei_total),
              (v, o) => `${v}/${o ?? v}`,
            ),
            activity(
              "sort",
              "Seder Sort",
              r.sort_placed === null ? null : Number(r.sort_placed),
              r.sort_total === null ? null : Number(r.sort_total),
              (v, o) => `${v}/${o ?? v}`,
            ),
            activity("dash", "Shas Dash", r.dash_score === null ? null : Number(r.dash_score), null, (v) => String(v)),
            activity(
              "chazara",
              "Mishna Chazara",
              r.chazara_count === null ? null : Number(r.chazara_count),
              null,
              (v) => `${v} masechet${v === 1 ? "" : "ot"}`,
            ),
          ].filter((a): a is SubmissionActivity => a !== null);
          return { userId: r.id as string, date, sentAt: new Date().toISOString(), activities };
        }),
      );
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  return { students, submissions, loading, error };
}
