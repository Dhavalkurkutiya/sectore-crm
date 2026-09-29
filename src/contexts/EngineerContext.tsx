/**
 * EngineerContext — Single global resolution of engineer_profiles.id
 *
 * Architecture:
 *   Auth User (app_users.id)
 *       ↓  engineerProfileService.resolveByUserId()
 *   engineer_profiles.id  ← stored here
 *       ↓  consumed by every Engineer page via useEngineerContext()
 *
 * Rules:
 * - Resolves ONCE when the auth user changes (login / logout).
 * - All engineer pages MUST use this context — never raw user.id.
 * - If no profile exists yet, auto-creates one via createProfileForUser().
 * - Non-engineer roles get null (context is safely ignored).
 */
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { engineerProfileService, type ResolvedEngineer } from '@/services/engineerProfileService';

interface EngineerContextValue {
  /** engineer_profiles.id — the FK used by attendance, fuel, odometer, bike, etc. */
  engineerId: string;
  engineerName: string;
  /** Full resolved profile (includes email). Null while loading or if not an engineer. */
  resolved: ResolvedEngineer | null;
  /** True while the first resolution is in-flight */
  loading: boolean;
  /** Non-null if resolution failed after all fallbacks */
  error: string | null;
}

const EngineerContext = createContext<EngineerContextValue>({
  engineerId:   '',
  engineerName: '',
  resolved:     null,
  loading:      false,
  error:        null,
});

export function EngineerProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const isEngineer = user?.role === 'engineer';

  const [resolved,  setResolved]  = useState<ResolvedEngineer | null>(null);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  useEffect(() => {
    // Clear on logout or non-engineer role
    if (!user?.id || !isEngineer) {
      setResolved(null);
      setError(null);
      engineerProfileService.clearCache();
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    engineerProfileService
      .resolveByUserId(user.id)
      .then(async (r) => {
        if (cancelled) return;

        if (r) {
          setResolved(r);
          return;
        }

        // No profile found — auto-create one so new engineers work immediately
        try {
          const created = await engineerProfileService.createProfileForUser(
            user.id,
            user.name ?? user.email ?? 'Engineer',
            user.email ?? '',
          );
          if (!cancelled) setResolved(created);
        } catch (createErr) {
          if (!cancelled) {
            setError('Could not create engineer profile. Contact your admin.');
            console.error('[EngineerContext] createProfileForUser failed:', createErr);
          }
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError('Failed to load engineer profile. Please reload.');
          console.error('[EngineerContext] resolveByUserId failed:', err);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [user?.id, isEngineer]);

  return (
    <EngineerContext.Provider value={{
      engineerId:   resolved?.engineerId   ?? '',
      engineerName: resolved?.engineerName ?? '',
      resolved,
      loading,
      error,
    }}>
      {children}
    </EngineerContext.Provider>
  );
}

/** Use inside any Engineer page to get the resolved engineer_profiles.id */
export function useEngineerContext(): EngineerContextValue {
  return useContext(EngineerContext);
}
