import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import * as Sentry from "@sentry/react";
import "./styles/global.css";
import App from "./App.tsx";
import { AuthProvider } from "./utils/useAuth";
import { initMonitoring } from "./utils/monitoring";
import { ErrorFallback } from "./components/ErrorFallback/ErrorFallback";

initMonitoring();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Sentry.ErrorBoundary fallback={<ErrorFallback />}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </Sentry.ErrorBoundary>
  </StrictMode>,
);
