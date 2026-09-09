import "./ErrorFallback.css";

/** The screen shown when something crashes hard enough that the app
    itself can no longer render — Fable audit #6's "know when something
    is wrong" applies to the student's own screen too, not just to
    monitoring: a blank white page with no explanation is worse than an
    honest "something broke, reloading should fix it." */
export function ErrorFallback() {
  return (
    <div className="error-fallback">
      <div className="error-fallback__card">
        <h1 className="error-fallback__title">Something went wrong</h1>
        <p className="error-fallback__body">
          The app hit a problem it couldn't recover from. Your progress is safe — reloading
          usually fixes this.
        </p>
        <button className="restart" onClick={() => window.location.reload()}>
          Reload
        </button>
      </div>
    </div>
  );
}
