import { useEffect, useRef, useState } from "react";
import { Sidebar } from "./components/Sidebar/Sidebar";
import { BottomBar } from "./components/BottomBar/BottomBar";
import { MATCH_VIEWS } from "./data/matchViews";
import { MatchBoard } from "./components/MatchBoard/MatchBoard";
import { TabBar } from "./components/TabBar/TabBar";
import { MishnaIdScreen } from "./components/MishnaId/MishnaIdScreen";
import { PerekNamesScreen } from "./components/PerekNames/PerekNamesScreen";
import { HomeScreen } from "./components/Home/HomeScreen";
import { SederSortScreen } from "./components/SederSort/SederSortScreen";
import { ShasDashScreen } from "./components/ShasDash/ShasDashScreen";
import { RecallScreen } from "./components/Recall/RecallScreen";
import { ResourcesScreen } from "./components/Resources/ResourcesScreen";
import { DailyLimmudScreen } from "./components/DailyLimmud/DailyLimmudScreen";
import { ProgressScreen } from "./components/Progress/ProgressScreen";
import { LoginScreen } from "./components/Login/LoginScreen";
import { ChevrusaScreen } from "./components/Chevrusa/ChevrusaScreen";
import { ChaburaScreen } from "./components/Chabura/ChaburaScreen";
import { MapOfShasScreen } from "./components/MapOfShas/MapOfShasScreen";
import { LiluyNishmatScreen } from "./components/LiluyNishmat/LiluyNishmatScreen";
import { AdminScreen } from "./components/Admin/AdminScreen";
import { ReviewScreen } from "./components/Review/ReviewScreen";
import { FirstOpenPrompt } from "./components/FirstOpenPrompt/FirstOpenPrompt";
import { RebbeDashboardScreen } from "./components/RebbeDashboard/RebbeDashboardScreen";
import { GuideScreen } from "./components/Guide/GuideScreen";
import { useAuth, OAUTH_PENDING_KEY } from "./utils/useAuth";
import { reportSilentSignInFailure } from "./utils/monitoring";
import { useChevrusa, isRebbe } from "./utils/useChevrusa";
import { SyncStatusProvider } from "./utils/useCloudSync";
import { useLearningProgress } from "./utils/useLearningProgress";
import { usePerekNotes } from "./utils/usePerekNotes";
import { useFirstOpenPrompt } from "./utils/useFirstOpenPrompt";
import { useNativeApp } from "./utils/useNativeApp";
import { useLocalStorageState } from "./utils/useLocalStorageState";
import { DEFAULT_BOTTOM_BAR_IDS } from "./utils/navItems";
import { useGameStats } from "./utils/useGameStats";
import { countCompletedMasechtot } from "./utils/shasJourney";
import { shuffle } from "./utils/shuffle";
import type { ViewState } from "./types/viewState";
import "./App.css";

function initViewState(items: string[]): ViewState {
  return { placed: new Array(items.length).fill(null), pool: shuffle(items) };
}

function SedarimSection() {
  const { recordSidreiCompletion, recordSidreiProgress } = useGameStats();
  const [activeId, setActiveId] = useState(MATCH_VIEWS[0].id);
  const [viewStates, setViewStates] = useState<Record<string, ViewState>>(() =>
    Object.fromEntries(MATCH_VIEWS.map((v) => [v.id, initViewState(v.items)])),
  );

  const activeView = MATCH_VIEWS.find((v) => v.id === activeId)!;
  const activeState = viewStates[activeId];
  const activePlacedCount = activeView.items.length - activeState.pool.length;

  const clearedSederIds = new Set(
    MATCH_VIEWS.filter((v) => viewStates[v.id]?.placed.every((p) => p !== null)).map((v) => v.id),
  );

  // Today's best placed-count across whichever view is active, plus one
  // completion tick the first time a view is newly cleared this session
  // — the rebbe dashboard's daily figure for this game.
  const recordedClearsRef = useRef(new Set<string>());
  useEffect(() => {
    if (activePlacedCount > 0) recordSidreiProgress(activePlacedCount, activeView.items.length);
    if (activePlacedCount === activeView.items.length && !recordedClearsRef.current.has(activeId)) {
      recordedClearsRef.current.add(activeId);
      recordSidreiCompletion();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, activePlacedCount]);

  function handlePlace(itemId: string, slotIndex: number) {
    setViewStates((prev) => {
      const s = prev[activeId];
      const placed = [...s.placed];
      placed[slotIndex] = itemId;
      const pool = s.pool.filter((id) => id !== itemId);
      return { ...prev, [activeId]: { placed, pool } };
    });
  }

  function handleReset() {
    setViewStates((prev) => ({ ...prev, [activeId]: initViewState(activeView.items) }));
  }

  return (
    <>
      <MatchBoard
        view={activeView}
        state={activeState}
        onPlace={handlePlace}
        onReset={handleReset}
        clearedSederIds={clearedSederIds}
      />
      <TabBar
        tabs={MATCH_VIEWS.map((v) => ({ id: v.id, label: v.label }))}
        activeId={activeId}
        onSelect={setActiveId}
      />
    </>
  );
}

/** A ?siyum=<slug> link is the only way to reach a private L'Iluy
    Nishmat siyum, so it has to work as a straight deep link, not just
    in-app navigation — this app has no router, so it's read once from
    the URL at startup rather than through normal section state. */
function initialNishmatSlug(): string | null {
  return new URLSearchParams(window.location.search).get("siyum");
}

/** Google's consent screen can finish successfully while the handoff
    back to Supabase still fails (a redirect-URL mismatch between Google
    Cloud Console and Supabase's Auth settings is the usual cause) — with
    nothing checking for it, that failure was completely invisible: no
    session gets created, but nothing said why, so a tester glancing at
    the screen could believe it worked. Supabase appends the failure as
    #error=...&error_description=... (or ?error=... under some flows) to
    the redirect it sends back, so this reads it once at startup — same
    pattern as initialNishmatSlug — and the URL is cleaned up right after
    so a refresh doesn't keep re-showing a stale error. */
function initialOAuthError(): string | null {
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const search = new URLSearchParams(window.location.search);
  const description = hash.get("error_description") ?? search.get("error_description");
  const code = hash.get("error") ?? search.get("error");
  if (!description && !code) return null;
  const message = description
    ? description.replace(/\+/g, " ")
    : `Google sign-in failed (${code}).`;
  window.history.replaceState(
    null,
    "",
    window.location.pathname + window.location.search.replace(/[?&]error[^&]*/g, ""),
  );
  return message;
}

function App() {
  const deepLinkSlug = useState(initialNishmatSlug)[0];
  const oauthError = useState(initialOAuthError)[0];
  const [section, setSection] = useState(() =>
    deepLinkSlug ? "liluy" : oauthError ? "login" : "home",
  );
  // Where to send the user back to once they log in — set by any screen
  // that gates an action behind an account (see requestLogin), so "Log
  // in first" never dead-ends: it returns you to what you were doing.
  const [loginReturnTo, setLoginReturnTo] = useState<string | null>(null);
  // Which pill the login screen opens on — set only when a gate card
  // sends the user here, so "Create an account" and "I already have
  // one" don't both dead-end on the same default pill.
  const [loginMode, setLoginMode] = useState<"signIn" | "signUp" | undefined>(undefined);
  // Set only when the first-open prompt's "Use an email address" sent the
  // user here, so that choice lands on the email form, not the
  // Google-first default.
  const [loginEmailOpen, setLoginEmailOpen] = useState(false);
  // Which step the Guide opens scrolled to — set only when something
  // links to a specific step (Home's popup, Resources); a plain visit
  // via the sidebar/bottom bar opens at the top instead.
  const [guideAnchor, setGuideAnchor] = useState<string | null>(null);
  const { session, isAdmin, isLoggedIn, isPasswordRecovery, loading: authLoading, signInWithGoogle } = useAuth();

  function openGuide(anchor?: string) {
    setGuideAnchor(anchor ?? null);
    setSection("guide");
  }

  // A password-reset email link lands here already signed in (Supabase
  // sets the session before this app code ever runs) — without this,
  // that session would just silently open on whatever "home" happens to
  // be instead of the one screen that can actually do anything with a
  // recovery session: My Account's set-new-password form.
  useEffect(() => {
    // Reacting to an external event (Supabase's auth listener flipping
    // this flag once the recovery link's session lands), not deriving
    // it from props/state available at render time — a route change
    // like this belongs in an effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (isPasswordRecovery) setSection("login");
  }, [isPasswordRecovery]);

  // The one case initialOAuthError doesn't cover: a Google redirect
  // that comes back with no error param (a clean redirect) but the
  // client-side token exchange itself then fails, so no session ever
  // materializes either. Previously indistinguishable from never having
  // tried — see OAUTH_PENDING_KEY's own doc comment.
  const [silentSignInError, setSilentSignInError] = useState<string | null>(null);
  useEffect(() => {
    if (authLoading) return;
    if (!sessionStorage.getItem(OAUTH_PENDING_KEY)) return;
    sessionStorage.removeItem(OAUTH_PENDING_KEY);
    if (session || oauthError) return; // either it worked, or the other handler already has this covered
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSilentSignInError("Sign-in didn't complete. Try again or use email.");
    reportSilentSignInFailure();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSection("login");
  }, [authLoading, session]);

  const { groups } = useChevrusa();
  const myShiurimToTeach = groups.filter(
    (g) =>
      g.isClass && g.members.some((m) => m.userId === session?.user.id && m.role === "teacher"),
  );
  const amRebbe = isRebbe(groups, session?.user.id);

  // "Your bottom bar" in My Account — synced like every other
  // per-person setting via SyncStatusProvider. Drop a conditional item
  // (rebbe/admin) this account no longer holds rather than showing a
  // dead tab.
  const [bottomBarIds, setBottomBarIds] = useLocalStorageState<string[]>(
    "bottomBarIds",
    DEFAULT_BOTTOM_BAR_IDS,
  );
  const effectiveBottomBarIds = bottomBarIds.filter(
    (id) => (id !== "rebbe" || amRebbe) && (id !== "admin" || isAdmin),
  );

  const progress = useLearningProgress();
  const { perekNotes } = usePerekNotes();
  const noteCount = Object.values(perekNotes).reduce(
    (total, notes) => total + notes.filter((n) => n && n.trim()).length,
    0,
  );
  const firstOpen = useFirstOpenPrompt({
    // A ?siyum= deep link means someone was sent here for one specific
    // siyum — that content should never be greeted with an unrelated
    // sign-in card on top of it, so this treats it like "don't show"
    // without touching the ask-count/retirement bookkeeping.
    isLoggedIn: isLoggedIn || !!deepLinkSlug,
    streakCurrent: progress.streak.current,
    mishnayotCount: progress.completions.length,
    noteCount,
    masechtotCompleted: countCompletedMasechtot(progress),
  });

  function requestLogin(from: string, mode?: "signIn" | "signUp", emailOpen?: boolean) {
    setLoginReturnTo(from);
    setLoginMode(mode);
    setLoginEmailOpen(!!emailOpen);
    setSection("login");
  }

  async function handlePromptGoogle() {
    firstOpen.dismiss();
    await signInWithGoogle();
  }

  function handlePromptEmail() {
    firstOpen.dismiss();
    requestLogin(section, undefined, true);
  }

  function handleSelect(next: string) {
    if (next !== "login") setLoginReturnTo(null);
    setSection(next);
  }

  useNativeApp("home", section, () => handleSelect("home"));

  return (
    <SyncStatusProvider session={session}>
      <div className="app">
        <Sidebar activeId={section} onSelect={handleSelect} isAdmin={isAdmin} isRebbe={amRebbe} />
        <BottomBar
          activeId={section}
          onSelect={handleSelect}
          barIds={effectiveBottomBarIds}
          isAdmin={isAdmin}
          isRebbe={amRebbe}
        />
        <main className="main">
          <div
            className={
              "main__content" +
              (section === "dash" ||
              section === "limmud" ||
              section === "map" ||
              section === "liluy" ||
              section === "perek"
                ? " main__content--wide"
                : "")
            }
          >
            {section === "home" ? (
              <HomeScreen onNavigate={setSection} />
            ) : section === "map" ? (
              <MapOfShasScreen onOpenNotes={() => setSection("perek")} />
            ) : section === "sedarim" ? (
              <SedarimSection />
            ) : section === "mishna" ? (
              <MishnaIdScreen onOpenNotes={() => setSection("perek")} />
            ) : section === "perek" ? (
              <PerekNamesScreen onOpenText={() => setSection("map")} />
            ) : section === "sort" ? (
              <SederSortScreen />
            ) : section === "dash" ? (
              <ShasDashScreen />
            ) : section === "resources" ? (
              <ResourcesScreen onOpenGuide={openGuide} />
            ) : section === "limmud" ? (
              <DailyLimmudScreen
                onOpenNotes={() => setSection("perek")}
                onOpenLogin={() => requestLogin("limmud")}
              />
            ) : section === "review" ? (
              <ReviewScreen onOpenLimmud={() => handleSelect("limmud")} />
            ) : section === "progress" ? (
              <ProgressScreen onOpenNishmat={() => handleSelect("liluy")} />

            ) : section === "login" ? (
              <LoginScreen
                initialMode={loginMode}
                initialEmailOpen={loginEmailOpen}
                initialError={oauthError ?? silentSignInError}
                onLoggedIn={() => {
                  setSection(loginReturnTo ?? "home");
                  setLoginReturnTo(null);
                }}
                onNavigate={setSection}
                bottomBarIds={bottomBarIds}
                onBottomBarIdsChange={setBottomBarIds}
                isAdmin={isAdmin}
                isRebbe={amRebbe}
              />
            ) : section === "chevrusa" ? (
              <ChevrusaScreen onOpenLogin={(mode) => requestLogin("chevrusa", mode)} />
            ) : section === "chabura" ? (
              <ChaburaScreen onOpenLogin={(mode) => requestLogin("chabura", mode)} />
            ) : section === "liluy" ? (
              <LiluyNishmatScreen
                onOpenLogin={(mode) => requestLogin("liluy", mode)}
                initialSlug={deepLinkSlug}
              />
            ) : section === "admin" ? (
              isAdmin ? (
                <AdminScreen />
              ) : (
                <HomeScreen onNavigate={setSection} />
              )
            ) : section === "rebbe" ? (
              amRebbe ? (
                <RebbeDashboardScreen shiurim={myShiurimToTeach} />
              ) : (
                <HomeScreen onNavigate={setSection} />
              )
            ) : section === "guide" ? (
              <GuideScreen onNavigate={setSection} initialAnchor={guideAnchor} />
            ) : (
              <RecallScreen />
            )}
          </div>
        </main>
        {firstOpen.variant && (
          <FirstOpenPrompt
            variant={firstOpen.variant}
            streakCurrent={progress.streak.current}
            mishnayotCount={progress.completions.length}
            noteCount={noteCount}
            onGoogle={handlePromptGoogle}
            onEmail={handlePromptEmail}
            onDismiss={firstOpen.dismiss}
          />
        )}
      </div>
    </SyncStatusProvider>
  );
}

export default App;
