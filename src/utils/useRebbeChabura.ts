import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabase";
import type { SubmissionActivity } from "./useDailySubmission";
import { localDateStr } from "./localDate";

export interface ChaburaStudent {
  userId: string;
  firstName: string | null;
  username: string | null;
}

export interface Submission {
  userId: string;
  date: string;
  sentAt: string;
  activities: SubmissionActivity[];
}

function todayStr(): string {
  return localDateStr();
}

function daysAgo(dateStr: string): number {
  const then = new Date(dateStr + "T00:00:00");
  const now = new Date(todayStr() + "T00:00:00");
  return Math.round((now.getTime() - then.getTime()) / 86_400_000);
}

/**
 * Raw student list + submission history for one chabura, fetched once
 * and shaped client-side into whatever a given view needs (see
 * summarize/gridFigures/historyFor below) — the three rebbe views are
 * all reading the same data, not three separate queries.
 */
export function useRebbeChabura(groupId: string | null) {
  const [students, setStudents] = useState<ChaburaStudent[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!supabase || !groupId) return;
    setLoading(true);
    const { data: memberRows } = await supabase
      .from("group_members")
      .select("user_id, role")
      .eq("group_id", groupId);
    const studentIds = (memberRows ?? []).filter((m) => m.role !== "teacher").map((m) => m.user_id as string);

    const { data: profiles } = studentIds.length
      ? await supabase.from("profiles").select("id, username, first_name").in("id", studentIds)
      : { data: [] as { id: string; username: string | null; first_name: string | null }[] };
    setStudents((profiles ?? []).map((p) => ({ userId: p.id, firstName: p.first_name, username: p.username })));

    const since = new Date();
    since.setDate(since.getDate() - 30);
    const { data: subRows } = await supabase
      .from("group_submissions")
      .select("user_id, submission_date, sent_at, payload")
      .eq("group_id", groupId)
      .gte("submission_date", localDateStr(since))
      .order("submission_date", { ascending: false });

    setSubmissions(
      (subRows ?? []).map((r) => ({
        userId: r.user_id as string,
        date: r.submission_date as string,
        sentAt: r.sent_at as string,
        activities: ((r.payload as { activities?: SubmissionActivity[] } | null)?.activities ?? []) as SubmissionActivity[],
      })),
    );
    setLoading(false);
  }, [groupId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { students, submissions, loading, refresh };
}

export interface StudentStanding {
  student: ChaburaStudent;
  lastSentDate: string | null;
  lastSentAt: string | null;
  daysQuiet: number | null; // null = sent today; Infinity-like large number = never
  todayActivities: SubmissionActivity[];
}

/** Quiet-longest-first — a rebbe scanning eighteen names is looking for
    who's gone quiet, not the best grade (REBBE-DASHBOARD-BRIEF.md §0). A
    student who has never sent anything sorts as the most quiet of all. */
export function standingsBySilence(students: ChaburaStudent[], submissions: Submission[]): StudentStanding[] {
  const today = todayStr();
  const byStudent = new Map<string, Submission[]>();
  for (const s of submissions) byStudent.set(s.userId, [...(byStudent.get(s.userId) ?? []), s]);

  const standings: StudentStanding[] = students.map((student) => {
    const mine = (byStudent.get(student.userId) ?? []).slice().sort((a, b) => b.date.localeCompare(a.date));
    const latest = mine[0] ?? null;
    const sentToday = latest?.date === today;
    return {
      student,
      lastSentDate: latest?.date ?? null,
      lastSentAt: latest?.sentAt ?? null,
      daysQuiet: latest ? (sentToday ? null : daysAgo(latest.date)) : Number.POSITIVE_INFINITY,
      todayActivities: sentToday ? latest.activities : [],
    };
  });

  return standings.sort((a, b) => {
    const aq = a.daysQuiet ?? -1;
    const bq = b.daysQuiet ?? -1;
    return bq - aq;
  });
}

export function historyFor(submissions: Submission[], userId: string): Submission[] {
  return submissions.filter((s) => s.userId === userId).sort((a, b) => b.date.localeCompare(a.date));
}
