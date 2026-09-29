/**
 * DashboardLayout Component
 * Sectore 360 — main application shell
 *
 * Structure: Sidebar (desktop) | Main content
 *            Mobile: overlay sidebar via Sheet
 */
import { type ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { TopNav } from './TopNav';
import { useSidebar } from '@/contexts/SidebarContext';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { companyProfileService } from '@/services/companyProfileService';
import { cn } from '@/lib/utils';

/** Footer reads live from companyProfileService so it always reflects saved branding */
function FooterTagline() {
  const p = companyProfileService.get();
  return (
    <p className="text-[11px] text-muted-foreground text-center">
      Sectore 360 — Powered by{' '}
      <span className="font-semibold text-foreground">{p.name}</span>
      {' '}·{' '}
      <span className="italic">{p.tagline}</span>
    </p>
  );
}

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { isMobileOpen, closeMobile } = useSidebar();

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* ── Desktop sidebar ──────────────────────────────── */}
      <div className="hidden lg:flex flex-col shrink-0">
        <Sidebar mode="desktop" />
      </div>

      {/* ── Mobile sidebar overlay ────────────────────────── */}
      <Sheet open={isMobileOpen} onOpenChange={closeMobile}>
        <SheetContent side="left" className="p-0 w-60 bg-sidebar border-r border-sidebar-border">
          <Sidebar mode="mobile" />
        </SheetContent>
      </Sheet>

      {/* ── Main area ─────────────────────────────────────── */}
      <div className={cn('flex flex-col flex-1 min-w-0 overflow-x-hidden')}>
        <TopNav />
        <main className="flex-1 p-4 md:p-6">
          {children}
        </main>
        {/* Footer tagline — reads from company profile */}
        <footer className="px-6 py-3 border-t border-border">
          <FooterTagline />
        </footer>
      </div>
    </div>
  );
}
