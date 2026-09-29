/**
 * useBrandLogo
 * Reactive hook — re-renders caller whenever the company profile is updated.
 * Returns the three logo variants needed throughout the app:
 *   logoDataUrl    — full-width horizontal logo (3993×743 or similar)
 *   faviconDataUrl — small square icon (ICO/PNG, for favicon + collapsed sidebar)
 *   companyName    — text fallback
 */
import { useEffect, useState } from 'react';
import { companyProfileService } from '@/services/companyProfileService';

export interface BrandLogo {
  logoDataUrl: string | null;
  faviconDataUrl: string | null;
  companyName: string;
}

export function useBrandLogo(): BrandLogo {
  const [brand, setBrand] = useState<BrandLogo>(() => {
    const p = companyProfileService.get();
    return {
      logoDataUrl: p.logoDataUrl,
      faviconDataUrl: p.faviconDataUrl ?? null,
      companyName: p.name,
    };
  });

  useEffect(() => {
    return companyProfileService.subscribe((p) => {
      setBrand({
        logoDataUrl: p.logoDataUrl,
        faviconDataUrl: p.faviconDataUrl ?? null,
        companyName: p.name,
      });
    });
  }, []);

  return brand;
}
