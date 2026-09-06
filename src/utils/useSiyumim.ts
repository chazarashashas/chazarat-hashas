import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabase";
import { useAuth } from "./useAuth";
import { useLocalStorageState } from "./useLocalStorageState";

export type Visibility = "public" | "private";

export interface Siyum {
  id: string;
  ownerId: string;
  dedication: string;
  occasion: string | null;
  targetDate: string | null;
  visibility: Visibility;
  shareSlug: string;
  createdAt: string;
}

export interface PerekClaim {
  id: string;
  siyumId: string;
  masechetEn: string;
  perek: number;
  claimedByUserId: string | null;
  claimedByName: string | null;
  anonymous: boolean;
  learned: boolean;
  queuedInDailyLimmud: boolean;
}

/** A claim this browser made — the local, device-level proof of
    ownership over a claim that doesn't require an account (spec: claim
    just needs a name + email). Doubles as the source Daily Limmud reads
    "my queued siyum perakim" from, so it works identically whether or
    not the claimer is logged in. */
interface MyClaimRef {
  id: string;
  claimToken: string;
  siyumId: string;
  masechetEn: string;
  perek: number;
}

const TOTAL_PERAKIM = 524;

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function slug(): string {
  return Math.random().toString(36).slice(2, 8) + Math.random().toString(36).slice(2, 6);
}

function friendlyError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("duplicate key")) return "Someone just took this perek — pick another.";
  if (lower.includes("row-level security") || lower.includes("permission denied")) {
    return "You don't have permission to do that.";
  }
  if (lower.includes("failed to fetch") || lower.includes("network")) {
    return "Couldn't reach the server — check your connection and try again.";
  }
  return "Something went wrong. Please try again.";
}

function mapSiyum(row: Record<string, unknown>): Siyum {
  return {
    id: row.id as string,
    ownerId: row.owner_id as string,
    dedication: row.dedication as string,
    occasion: (row.occasion as string | null) ?? null,
    targetDate: (row.target_date as string | null) ?? null,
    visibility: row.visibility as Visibility,
    shareSlug: row.share_slug as string,
    createdAt: row.created_at as string,
  };
}

function mapClaim(row: Record<string, unknown>): PerekClaim {
  return {
    id: row.id as string,
    siyumId: row.siyum_id as string,
    masechetEn: row.masechet_en as string,
    perek: row.perek as number,
    claimedByUserId: (row.claimed_by_user_id as string | null) ?? null,
    claimedByName: (row.claimed_by_name as string | null) ?? null,
    anonymous: Boolean(row.anonymous),
    learned: Boolean(row.learned),
    queuedInDailyLimmud: Boolean(row.queued_in_daily_limmud),
  };
}

/** Real L'Iluy Nishmat data, backed by nishmat_siyumim / nishmat_perakim
    (see the SQL handed alongside this). Claiming a perek needs no
    account — this app's usual local-first pattern extends here too:
    "my claims" is tracked in this browser (see MyClaimRef) rather than
    requiring login, though a logged-in claim is also tagged with the
    user id for the owner-facing "who's helping" view. */
export function useSiyumim() {
  const { session } = useAuth();
  const [mine, setMine] = useState<Siyum[]>([]);
  const [publicList, setPublicList] = useState<Siyum[]>([]);
  const [myClaimRefs, setMyClaimRefs] = useLocalStorageState<MyClaimRef[]>("nishmatMyClaims", []);
  const [myQueuedPerakim, setMyQueuedPerakim] = useState<(PerekClaim & { dedication: string })[]>([]);

  const refreshMine = useCallback(async () => {
    if (!supabase || !session) {
      setMine([]);
      return;
    }
    const { data } = await supabase
      .from("nishmat_siyumim")
      .select("*")
      .eq("owner_id", session.user.id)
      .order("created_at", { ascending: false });
    setMine((data ?? []).map(mapSiyum));
  }, [session]);

  const refreshPublic = useCallback(async () => {
    if (!supabase) return;
    const { data } = await supabase
      .from("nishmat_siyumim")
      .select("*")
      .eq("visibility", "public")
      .order("created_at", { ascending: false });
    const rows = (data ?? []).map(mapSiyum);
    setPublicList(session ? rows.filter((s) => s.ownerId !== session.user.id) : rows);
  }, [session]);

  const refreshMyQueued = useCallback(async () => {
    if (!supabase || myClaimRefs.length === 0) {
      setMyQueuedPerakim([]);
      return;
    }
    const ids = myClaimRefs.map((c) => c.id);
    const { data } = await supabase
      .from("nishmat_perakim")
      .select("*, nishmat_siyumim(dedication)")
      .in("id", ids)
      .eq("learned", false)
      .eq("queued_in_daily_limmud", true);
    setMyQueuedPerakim(
      (data ?? []).map((row) => ({
        ...mapClaim(row),
        dedication: (row.nishmat_siyumim as { dedication?: string } | null)?.dedication ?? "a siyum",
      })),
    );
  }, [myClaimRefs]);

  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => {
      if (!cancelled) refreshMine();
    });
    return () => {
      cancelled = true;
    };
  }, [refreshMine]);
  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => {
      if (!cancelled) refreshPublic();
    });
    return () => {
      cancelled = true;
    };
  }, [refreshPublic]);
  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => {
      if (!cancelled) refreshMyQueued();
    });
    return () => {
      cancelled = true;
    };
  }, [refreshMyQueued]);

  async function createSiyum(
    dedication: string,
    occasion: string,
    targetDate: string,
    visibility: Visibility,
  ): Promise<{ siyum: Siyum | null; error: string | null }> {
    if (!supabase || !session) return { siyum: null, error: "Log in first to start a siyum." };
    const { data, error } = await supabase
      .from("nishmat_siyumim")
      .insert({
        owner_id: session.user.id,
        dedication: dedication.trim(),
        occasion: occasion.trim() || null,
        target_date: targetDate.trim() || null,
        visibility,
        share_slug: slug(),
      })
      .select("*")
      .single();
    if (error || !data) return { siyum: null, error: error ? friendlyError(error.message) : "Couldn't create it." };
    await refreshMine();
    return { siyum: mapSiyum(data), error: null };
  }

  async function getSiyumBySlug(shareSlug: string): Promise<Siyum | null> {
    if (!supabase) return null;
    const { data } = await supabase.from("nishmat_siyumim").select("*").eq("share_slug", shareSlug).maybeSingle();
    return data ? mapSiyum(data) : null;
  }

  async function getClaims(siyumId: string): Promise<PerekClaim[]> {
    if (!supabase) return [];
    const { data } = await supabase.from("nishmat_perakim").select("*").eq("siyum_id", siyumId);
    return (data ?? []).map(mapClaim);
  }

  function isMineLocally(claim: PerekClaim): boolean {
    if (session && claim.claimedByUserId === session.user.id) return true;
    return myClaimRefs.some((c) => c.id === claim.id);
  }

  function tokenFor(claimId: string): string | null {
    return myClaimRefs.find((c) => c.id === claimId)?.claimToken ?? null;
  }

  async function claimPerek(
    siyumId: string,
    masechetEn: string,
    perek: number,
    name: string,
    email: string,
    anonymous: boolean,
  ): Promise<{ claim: PerekClaim | null; error: string | null }> {
    if (!supabase) return { claim: null, error: "Accounts aren't connected yet." };
    const { data, error } = await supabase
      .from("nishmat_perakim")
      .insert({
        siyum_id: siyumId,
        masechet_en: masechetEn,
        perek,
        claimed_by_user_id: session?.user.id ?? null,
        claimed_by_name: name.trim(),
        claimed_by_email: email.trim(),
        anonymous,
      })
      .select("*")
      .single();
    if (error || !data) return { claim: null, error: error ? friendlyError(error.message) : "Couldn't claim it." };
    const claim = mapClaim(data);
    setMyClaimRefs((prev) => [
      ...prev,
      { id: claim.id, claimToken: data.claim_token as string, siyumId, masechetEn, perek },
    ]);
    return { claim, error: null };
  }

  /** Marks a claimed perek learned. Callers are also responsible for
      calling progress.logLearning(masechetEn, perek, date) on the same
      action — this only updates the siyum's own rollup; the personal
      completion record it's tagged against lives in the usual place. */
  async function markLearned(claim: PerekClaim): Promise<string | null> {
    if (!supabase) return "Accounts aren't connected yet.";
    const { error } = await supabase
      .from("nishmat_perakim")
      .update({ learned: true, learned_at: new Date().toISOString(), queued_in_daily_limmud: false })
      .eq("id", claim.id);
    if (error) return friendlyError(error.message);
    setMyClaimRefs((prev) => prev.filter((c) => c.id !== claim.id));
    await refreshMyQueued();
    return null;
  }

  async function addToDailyLimmud(claim: PerekClaim): Promise<string | null> {
    if (!supabase) return "Accounts aren't connected yet.";
    const { error } = await supabase.from("nishmat_perakim").update({ queued_in_daily_limmud: true }).eq("id", claim.id);
    if (error) return friendlyError(error.message);
    await refreshMyQueued();
    return null;
  }

  /** Releases a claim you can't get to — back to open for someone else.
      Matches by claim_token (or your user id) rather than trusting the
      caller blindly, same trust model as the rest of this feature. */
  async function releaseClaim(claim: PerekClaim): Promise<string | null> {
    if (!supabase) return "Accounts aren't connected yet.";
    const token = tokenFor(claim.id);
    let query = supabase.from("nishmat_perakim").delete().eq("id", claim.id);
    if (token) query = query.eq("claim_token", token);
    else if (session) query = query.eq("claimed_by_user_id", session.user.id);
    const { error } = await query;
    if (error) return friendlyError(error.message);
    setMyClaimRefs((prev) => prev.filter((c) => c.id !== claim.id));
    await refreshMyQueued();
    return null;
  }

  /** Called from Daily Limmud when a queued siyum perek is marked
      learned there — same "mark learned" fact, just triggered from the
      other side. */
  async function markLearnedById(claimId: string): Promise<void> {
    if (!supabase) return;
    await supabase
      .from("nishmat_perakim")
      .update({ learned: true, learned_at: new Date().toISOString() })
      .eq("id", claimId);
    setMyClaimRefs((prev) => prev.filter((c) => c.id !== claimId));
    await refreshMyQueued();
  }

  function statsFor(claims: PerekClaim[]) {
    const learned = claims.filter((c) => c.learned).length;
    const taken = claims.length - learned;
    const open = TOTAL_PERAKIM - claims.length;
    return { learned, taken, open };
  }

  return {
    mine,
    publicList,
    myQueuedPerakim,
    createSiyum,
    getSiyumBySlug,
    getClaims,
    claimPerek,
    markLearned,
    markLearnedById,
    addToDailyLimmud,
    releaseClaim,
    isMineLocally,
    statsFor,
    refreshMine,
    refreshPublic,
    TOTAL_PERAKIM,
    todayStr,
  };
}
