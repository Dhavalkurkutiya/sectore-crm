/**
 * App.tsx — Root application component
 * Sectore 360 — Phase 1, Parts 1–6 (complete)
 */
import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import IntersectObserver from '@/components/common/IntersectObserver';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { SessionTimeoutDialog } from '@/components/common/SessionTimeoutDialog';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { SidebarProvider } from '@/contexts/SidebarContext';
import { EngineerProvider } from '@/contexts/EngineerContext';
import { ChangePasswordDialog } from '@/components/shared/ChangePasswordDialog';
import { companyProfileService } from '@/services/companyProfileService';
import { configApi } from '@/lib/api';
import { routes } from './routes';
import SetupWizard from './pages/SetupWizard';

/** Apply the stored favicon to the browser tab */
function useFaviconSync() {
  useEffect(() => {
    function applyFavicon(dataUrl: string | null) {
      if (!dataUrl) return;
      let link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.href = dataUrl;
    }
    companyProfileService.fetch().then((p) => applyFavicon(p.faviconDataUrl ?? null));
    return companyProfileService.subscribe((p) => applyFavicon(p.faviconDataUrl ?? null));
  }, []);
}

/** Force password change dialog shown immediately after login when flag is set */
function ForceChangePasswordGate() {
  const { user, requirePasswordChange, dismissPasswordChange } = useAuth();
  if (!user || !requirePasswordChange) return null;
  return (
    <ChangePasswordDialog
      open={requirePasswordChange}
      onOpenChange={(v) => { if (!v) dismissPasswordChange(); }}
      userId={user.id}
      userName={user.name}
      forced
    />
  );
}

const App: React.FC = () => {
  useFaviconSync();
  const [setupChecked, setSetupChecked] = useState(false);
  const [needsSetup, setNeedsSetup]     = useState(false);

  useEffect(() => {
    configApi.isSetupCompleted()
      .then((done) => { setNeedsSetup(!done); setSetupChecked(true); })
      .catch(() => { setNeedsSetup(false); setSetupChecked(true); });
  }, []);

  if (!setupChecked) return null; // brief loading state

  if (needsSetup) {
    return (
      <ThemeProvider>
        <Router>
          <SetupWizard />
          <Toaster position="top-right" richColors closeButton />
        </Router>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <AuthProvider>
        <EngineerProvider>
        <SidebarProvider>
          <Router>
            <ErrorBoundary>
              <IntersectObserver />
              <Routes>
                {routes.map((route, index) => (
                  <Route key={index} path={route.path} element={route.element} />
                ))}
              </Routes>
              <ForceChangePasswordGate />
              <SessionTimeoutDialog />
              <Toaster position="top-right" richColors closeButton />
            </ErrorBoundary>
          </Router>
        </SidebarProvider>
        </EngineerProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
