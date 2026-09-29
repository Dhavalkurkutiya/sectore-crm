/**
 * CompanyBrand — shared branding components
 * Used in login, dashboards, PDF reports, footers.
 * Logo format: 3993×743 (≈5.37:1 wide horizontal).
 * faviconDataUrl: square icon for collapsed sidebar + small contexts.
 */
import { useBrandLogo } from '@/hooks/useBrandLogo';
import { companyProfileService } from '@/services/companyProfileService';
import { Building2 } from 'lucide-react';

/* ── Compact inline logo (sidebar collapsed / nav icon slot) ── */
export function CompanyLogoMark({ className = '' }: { className?: string }) {
  const { logoDataUrl, faviconDataUrl, companyName } = useBrandLogo();
  const src = faviconDataUrl ?? logoDataUrl;

  if (src) {
    return (
      <img
        src={src}
        alt={companyName}
        className={`object-contain ${className}`}
        style={{ maxHeight: 36, maxWidth: faviconDataUrl ? 36 : 120, width: 'auto' }}
      />
    );
  }
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
        <Building2 size={16} className="text-primary-foreground" />
      </div>
      <span className="font-bold text-sm text-foreground leading-tight">{companyName}</span>
    </div>
  );
}

/* ── Full hero branding block (login left panel, report header) */
export function CompanyHero({
  variant = 'dark',
  showBusinessLine = true,
  showContact = false,
  className = '',
}: {
  variant?: 'dark' | 'light';
  showBusinessLine?: boolean;
  showContact?: boolean;
  className?: string;
}) {
  const { logoDataUrl, companyName } = useBrandLogo();
  const p = companyProfileService.get();
  const textClass = variant === 'dark' ? 'text-white' : 'text-foreground';
  const muteClass = variant === 'dark' ? 'text-white/60' : 'text-muted-foreground';

  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      {logoDataUrl ? (
        <img
          src={logoDataUrl}
          alt={companyName}
          className="object-contain object-left"
          style={{ maxHeight: 56, maxWidth: 280, width: 'auto', height: 'auto' }}
        />
      ) : (
        <div className="w-14 h-14 rounded-xl bg-white/10 flex items-center justify-center">
          <Building2 size={28} className={textClass} />
        </div>
      )}

      <div>
        <h1 className={`text-2xl font-bold ${textClass}`}>{companyName}</h1>
        <p className={`text-sm mt-0.5 ${muteClass}`}>{p.tagline}</p>
      </div>

      {showBusinessLine && (
        <p className={`text-xs leading-relaxed ${muteClass}`}>{p.businessLine}</p>
      )}

      {showContact && (
        <div className={`text-xs space-y-0.5 ${muteClass}`}>
          <p>Emergency Support</p>
          <p className={`text-sm font-semibold ${textClass}`}>+91 {p.emergencyPhone}</p>
          <p>{p.supportEmail}</p>
        </div>
      )}
    </div>
  );
}

/* ── Report / PDF header block ─────────────────────────────── */
export function CompanyReportHeader({ className = '' }: { className?: string }) {
  const { logoDataUrl, companyName } = useBrandLogo();
  const p = companyProfileService.get();
  return (
    <div className={`flex items-start justify-between gap-4 ${className}`}>
      <div className="flex items-center gap-3">
        {logoDataUrl ? (
          <img
            src={logoDataUrl}
            alt={companyName}
            className="object-contain object-left"
            style={{ maxHeight: 48, maxWidth: 220, width: 'auto', height: 'auto' }}
          />
        ) : (
          <div className="w-12 h-12 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <Building2 size={22} className="text-primary-foreground" />
          </div>
        )}
        <div>
          <p className="font-bold text-base text-foreground">{companyName}</p>
          <p className="text-xs text-muted-foreground">{p.tagline}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{p.footerText}</p>
        </div>
      </div>
      <div className="text-right text-xs text-muted-foreground space-y-0.5">
        <p>+91 {p.primaryPhone}</p>
        {p.secondaryPhone && <p>+91 {p.secondaryPhone}</p>}
        <p>{p.supportEmail}</p>
      </div>
    </div>
  );
}

/* ── Report / PDF footer block ─────────────────────────────── */
export function CompanyReportFooter({ className = '' }: { className?: string }) {
  const { companyName } = useBrandLogo();
  const p = companyProfileService.get();
  return (
    <div className={`text-center border-t border-border pt-4 ${className}`}>
      <div className="w-full border-t border-border mb-3" />
      <p className="font-semibold text-sm text-foreground">{companyName}</p>
      <p className="text-xs text-muted-foreground">{p.tagline}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{p.businessLine}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{p.footerText}</p>
      <p className="text-xs text-muted-foreground mt-2 whitespace-pre-line">{p.address}</p>
      <p className="text-xs text-muted-foreground mt-1">
        ☎ +91 {p.primaryPhone}
        {p.secondaryPhone && `  ☎ +91 ${p.secondaryPhone}`}
      </p>
      <p className="text-xs text-muted-foreground">✉ {p.supportEmail}</p>
      <div className="w-full border-t border-border mt-3 mb-2" />
      <p className="text-[10px] text-muted-foreground">
        This report is system generated by Sectore 360 ERP.
        For technical assistance please contact our support team.
        Thank you for choosing {companyName}.
      </p>
    </div>
  );
}
