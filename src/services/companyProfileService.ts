/**
 * Company Profile Service — Supabase-backed
 * Sectore 360 — Production
 * All portals (Admin, Engineer, Customer, Reports, PDF) read from this service.
 */
import { companyApi } from '@/lib/api';

export interface CompanyProfile {
  name: string;
  tagline: string;
  businessLine: string;
  footerText: string;
  logoDataUrl: string | null;
  faviconDataUrl: string | null;
  address: string;
  contactPerson: string;
  primaryPhone: string;
  secondaryPhone: string;
  supportEmail: string;
  emergencyPhone: string;
  website: string;
  gst: string;
  workingHours: string;
  updatedAt: string;
}

const DEFAULT_PROFILE: CompanyProfile = {
  name:           'Sectore Tecknologies',
  tagline:        'Securing Today. Powering Tomorrow.',
  businessLine:   'Computers • Servers • Storage • CCTV • Networking • Firewalls • Cloud • AMC',
  footerText:     'Design • Deploy • Secure • Support',
  logoDataUrl:    null,
  faviconDataUrl: null,
  address:        'F/29, 1st Floor, KSB Olympia,\nOpp. Kailash Nagar BRTS Station,\nBamroli Althan Road, Pandesara,\nSurat, Gujarat – 394221',
  contactPerson:  'Manoharlal L Seervi',
  primaryPhone:   '9019987991',
  secondaryPhone: '8490000273',
  supportEmail:   'support@sectoretecknologies.com',
  emergencyPhone: '9019987991',
  website:        '',
  gst:            '',
  workingHours:   '',
  updatedAt:      new Date().toISOString(),
};

class CompanyProfileService {
  private cached: CompanyProfile | null = null;
  private listeners: ((p: CompanyProfile) => void)[] = [];

  /** Load from Supabase; falls back to defaults if empty */
  async fetch(): Promise<CompanyProfile> {
    const db = await companyApi.get();
    this.cached = db ? { ...DEFAULT_PROFILE, ...db } : { ...DEFAULT_PROFILE };
    return { ...this.cached };
  }

  /** Synchronous read from cache (populated after first fetch) */
  get(): CompanyProfile {
    return this.cached ? { ...this.cached } : { ...DEFAULT_PROFILE };
  }

  async update(patch: Partial<CompanyProfile>, updatedBy?: string): Promise<CompanyProfile> {
    const saved = await companyApi.update(patch, updatedBy);
    this.cached = { ...DEFAULT_PROFILE, ...saved };
    this.listeners.forEach((fn) => fn({ ...this.cached! }));
    return { ...this.cached };
  }

  async reset(): Promise<CompanyProfile> {
    const saved = await companyApi.update(DEFAULT_PROFILE);
    this.cached = { ...DEFAULT_PROFILE, ...saved };
    this.listeners.forEach((fn) => fn({ ...this.cached! }));
    return { ...this.cached };
  }

  subscribe(fn: (p: CompanyProfile) => void): () => void {
    this.listeners.push(fn);
    return () => { this.listeners = this.listeners.filter((l) => l !== fn); };
  }
}

export const companyProfileService = new CompanyProfileService();
