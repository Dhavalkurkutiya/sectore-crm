import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { AppWrapper } from "./components/common/PageMeta.tsx";
import "./index.css";

const rootElement = document.getElementById("root");
const root = createRoot(rootElement!);

// Lazy load Sentry to avoid blocking initial render
const initSentry = async () => {
  try {
    const Sentry = await import("@sentry/react");
    Sentry.init({
      dsn: import.meta.env['VITE_SENTRY_DSN'] as string | undefined,
      environment: import.meta.env.MODE,
    });
    return Sentry;
  } catch (error) {
    console.warn("Failed to load Sentry:", error);
    return null;
  }
};

initSentry().then((Sentry) => {
  if (Sentry) {
    root.render(
      <Sentry.ErrorBoundary fallback={<p>应用发生错误，请刷新页面重试</p>}>
        <AppWrapper>
          <App />
        </AppWrapper>
      </Sentry.ErrorBoundary>
    );
  } else {
    root.render(
      <AppWrapper>
        <App />
      </AppWrapper>
    );
  }
});
