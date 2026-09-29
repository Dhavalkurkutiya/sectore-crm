/**
 * Sidebar Component
 * Sectore 360 — role-aware, collapsible navigation sidebar
 */
import { cn } from '@/lib/utils';
import { NavLink } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSidebar } from '@/contexts/SidebarContext';
import { useBrandLogo } from '@/hooks/useBrandLogo';
import { navItems } from '@/lib/navItems';
import { SectoreLogo, SectoreLogoCompact } from '@/components/brand/SectoreLogo';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ChevronLeft, ChevronRight, X, Building2 } from 'lucide-react';
import type { UserRole } from '@/types/auth';

interface SidebarProps {
  /** desktop sidebar */
  mode?: 'desktop' | 'mobile';
}

function isVisible(roles?: UserRole[], userRole?: UserRole): boolean {
  if (!roles || roles.length === 0) return true;
  if (!userRole) return false;
  return roles.includes(userRole);
}

export function Sidebar({ mode = 'desktop' }: SidebarProps) {
  const { user } = useAuth();
  const { isCollapsed, toggleCollapsed, closeMobile } = useSidebar();
  const brand = useBrandLogo();

  const collapsed = mode === 'desktop' && isCollapsed;

  // Group nav items by their 'group' field
  const grouped: Record<string, typeof navItems> = {};
  for (const item of navItems) {
    const g = item.group ?? 'Other';
    if (!grouped[g]) grouped[g] = [];
    if (isVisible(item.roles, user?.role)) {
      grouped[g].push(item);
    }
  }

  return (
    <TooltipProvider delayDuration={300}>
      <aside
        className={cn(
          'flex flex-col h-full bg-sidebar border-r border-sidebar-border transition-all duration-300 ease-in-out',
          collapsed ? 'w-16' : 'w-60'
        )}
      >
        {/* ── Logo area ──────────────────────────────────── */}
        <div
          className={cn(
            'flex items-center h-16 px-3 border-b border-sidebar-border shrink-0',
            collapsed ? 'justify-center' : 'justify-between'
          )}
        >
          {collapsed ? (
            /* Collapsed: prefer square favicon icon; fall back to compact SVG */
            brand.faviconDataUrl ? (
              <img
                src={brand.faviconDataUrl}
                alt={brand.companyName}
                className="object-contain"
                style={{ width: 32, height: 32 }}
              />
            ) : brand.logoDataUrl ? (
              <img
                src={brand.logoDataUrl}
                alt={brand.companyName}
                className="object-contain"
                style={{ maxWidth: 40, maxHeight: 32, width: 'auto', height: 'auto' }}
              />
            ) : (
              <SectoreLogoCompact size={32} />
            )
          ) : (
            /* Expanded: show full wide logo (3993×743); fall back to SVG */
            brand.logoDataUrl ? (
              <img
                src={brand.logoDataUrl}
                alt={brand.companyName}
                className="object-contain object-left"
                style={{ maxWidth: 180, maxHeight: 36, width: 'auto', height: 'auto' }}
              />
            ) : (
              <SectoreLogo size={30} />
            )
          )}

          {/* Close button — mobile overlay only */}
          {mode === 'mobile' && (
            <button
              onClick={closeMobile}
              className="p-1.5 rounded-md text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
              aria-label="Close sidebar"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* ── Navigation ─────────────────────────────────── */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 flex flex-col gap-1">
          {Object.entries(grouped).map(([groupName, items]) => (
            <div key={groupName} className="mb-2">
              {/* Group label — hidden when collapsed */}
              {!collapsed && (
                <p className="text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40 px-2 mb-1">
                  {groupName}
                </p>
              )}
              {items.map((item) => {
                const Icon = item.icon;
                const linkEl = (
                  <NavLink
                    to={item.path}
                    onClick={mode === 'mobile' ? closeMobile : undefined}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 rounded-md transition-colors duration-150',
                        'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent',
                        collapsed ? 'justify-center p-2.5' : 'px-2.5 py-2',
                        isActive && 'bg-sidebar-accent text-sidebar-primary font-semibold hover:bg-sidebar-accent'
                      )
                    }
                  >
                    <Icon
                      size={18}
                      className="shrink-0"
                      aria-hidden="true"
                    />
                    {!collapsed && (
                      <span className="text-sm truncate">{item.label}</span>
                    )}
                    {!collapsed && item.badge !== undefined && item.badge > 0 && (
                      <span className="ml-auto text-[10px] font-bold bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 leading-none">
                        {item.badge}
                      </span>
                    )}
                  </NavLink>
                );

                if (collapsed) {
                  return (
                    <Tooltip key={item.id}>
                      <TooltipTrigger asChild>{linkEl}</TooltipTrigger>
                      <TooltipContent side="right" className="text-xs">
                        {item.label}
                      </TooltipContent>
                    </Tooltip>
                  );
                }
                return <div key={item.id}>{linkEl}</div>;
              })}
            </div>
          ))}
        </nav>

        {/* ── Collapse toggle — desktop only ─────────────── */}
        {mode === 'desktop' && (
          <div className="p-2 border-t border-sidebar-border shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleCollapsed}
              className={cn(
                'w-full text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent',
                collapsed ? 'justify-center px-0' : 'justify-start'
              )}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? <ChevronRight size={16} /> : (
                <>
                  <ChevronLeft size={16} className="mr-2" />
                  <span className="text-xs">Collapse</span>
                </>
              )}
            </Button>
          </div>
        )}
      </aside>
    </TooltipProvider>
  );
}
