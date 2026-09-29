/**
 * Settings Placeholder Page
 * Sectore 360 — Part 1 placeholder; full settings in later phase
 */
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { RoleBadge } from '@/components/shared/RoleBadge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { AlertBanner } from '@/components/shared/AlertBanner';
import {
  User,
  Palette,
  Bell,
  Shield,
  Globe,
  Building2,
  Lock,
  Sun,
  Moon,
  Laptop,
} from 'lucide-react';

const SETTINGS_SECTIONS = [
  { icon: User, title: 'Profile', description: 'Name, email, avatar, contact info', status: 'coming-soon' },
  { icon: Bell, title: 'Notifications', description: 'Email, push, and in-app notification preferences', status: 'coming-soon' },
  { icon: Shield, title: 'Security', description: 'Password, two-factor authentication, sessions', status: 'coming-soon' },
  { icon: Globe, title: 'Language & Region', description: 'Locale, timezone, date/time format', status: 'coming-soon' },
  { icon: Building2, title: 'Company Settings', description: 'Organization details, logo, branding', status: 'coming-soon' },
  { icon: Lock, title: 'Roles & Permissions', description: 'User role management and access control', status: 'coming-soon' },
];

export default function SettingsPage() {
  const { resolvedTheme, setTheme } = useTheme();
  const { user } = useAuth();

  return (
    <DashboardLayout>
      <PageHeader
        title="Settings"
        description="Manage your account, preferences, and system configuration."
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Settings' }]}
      />

      <div className="flex flex-col gap-6 max-w-3xl">
        {/* Current user card */}
        {user && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <User size={15} className="text-primary" />
                Current Account
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <UserAvatar name={user.name} src={user.avatar} size="lg" />
                <div className="flex flex-col gap-1 min-w-0">
                  <p className="font-semibold text-foreground">{user.name}</p>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                  <RoleBadge role={user.role} className="mt-0.5 self-start" />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Theme settings — functional */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Palette size={15} className="text-primary" />
              Appearance
            </CardTitle>
            <CardDescription className="text-xs">
              Choose your preferred theme for Sectore 360.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: 'light' as const, label: 'Light', icon: Sun },
                { id: 'dark' as const, label: 'Dark', icon: Moon },
                { id: 'system' as const, label: 'System', icon: Laptop },
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setTheme(id)}
                  className={`flex flex-col items-center gap-2 rounded-lg border p-4 transition-colors ${
                    resolvedTheme === id || (id === 'system')
                      ? 'border-primary/50 bg-primary/5'
                      : 'border-border hover:bg-muted'
                  }`}
                >
                  <Icon size={20} className={resolvedTheme === id ? 'text-primary' : 'text-muted-foreground'} />
                  <span className={`text-xs font-medium ${resolvedTheme === id ? 'text-primary' : 'text-muted-foreground'}`}>
                    {label}
                  </span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Coming soon sections */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <p className="text-sm font-semibold text-foreground">All Settings</p>
            <Separator className="flex-1" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {SETTINGS_SECTIONS.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="flex items-start gap-3 rounded-lg border border-border bg-card p-4 opacity-60"
              >
                <div className="p-2 rounded-md bg-muted shrink-0">
                  <Icon size={15} className="text-muted-foreground" />
                </div>
                <div className="flex flex-col gap-0.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground">{title}</p>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">
                      Soon
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground text-pretty">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <AlertBanner
          variant="info"
          title="Settings coming in later phases"
          message="Full profile management, notification preferences, security settings, and role administration will be available in Parts 2–6."
          dismissible
        />

        {/* Sign out */}
        <div className="flex items-center gap-3 pt-2">
          <Button
            variant="outline"
            className="text-destructive border-destructive/30 hover:bg-destructive/10"
            onClick={() => window.dispatchEvent(new CustomEvent('sectore:logout'))}
          >
            Sign Out of Sectore 360
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
