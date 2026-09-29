/**
 * TopNav Component
 * Sectore 360 — top navigation bar with search, notifications, user menu
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useSidebar } from '@/contexts/SidebarContext';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { RoleBadge } from '@/components/shared/RoleBadge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChangePasswordDialog } from '@/components/shared/ChangePasswordDialog';
import {
  Menu,
  Search,
  Bell,
  Sun,
  Moon,
  LogOut,
  Settings,
  User,
  Command,
  KeyRound,
} from 'lucide-react';

export function TopNav() {
  const { user, logout } = useAuth();
  const { resolvedTheme, toggleTheme } = useTheme();
  const { toggleMobile } = useSidebar();
  const navigate = useNavigate();
  const [changePwOpen, setChangePwOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <header className="h-16 border-b border-border bg-background/95 backdrop-blur-sm sticky top-0 z-30 flex items-center px-4 gap-3">
      {/* Mobile hamburger */}
      <Button
        variant="ghost"
        size="sm"
        className="lg:hidden p-2 text-muted-foreground"
        onClick={toggleMobile}
        aria-label="Open navigation"
      >
        <Menu size={20} />
      </Button>

      {/* Global search bar placeholder */}
      <button
        onClick={() => navigate('/search')}
        className="flex items-center gap-2 h-9 px-3 rounded-md border border-border bg-muted/40 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors w-full max-w-xs md:max-w-sm"
        aria-label="Open global search"
      >
        <Search size={14} />
        <span className="flex-1 text-left truncate">Search anything…</span>
        <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
          <Command size={9} />K
        </kbd>
      </button>

      {/* Right section */}
      <div className="ml-auto flex items-center gap-1 shrink-0">
        {/* Notifications bell — placeholder */}
        <button
          type="button"
          className="relative p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label="Notifications"
        >
          <Bell size={18} />
          {/* Unread badge placeholder */}
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-primary" />
        </button>

        {/* Theme toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleTheme}
          className="p-2 text-muted-foreground hover:text-foreground"
          aria-label={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {resolvedTheme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </Button>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="flex items-center gap-2 rounded-md p-1.5 hover:bg-muted transition-colors"
              aria-label="User menu"
            >
              {user && (
                <UserAvatar
                  name={user.name}
                  src={user.avatar}
                  size="sm"
                />
              )}
              <div className="hidden sm:flex flex-col items-start leading-none">
                <span className="text-sm font-medium text-foreground truncate max-w-[100px]">
                  {user?.name ?? 'User'}
                </span>
              </div>
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col gap-1">
                <span className="font-semibold text-foreground">{user?.name}</span>
                <span className="text-xs text-muted-foreground font-mono">@{user?.username}</span>
                <span className="text-xs text-muted-foreground">{user?.employeeCode}</span>
                {user?.role && <RoleBadge role={user.role} className="mt-1 self-start" />}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => navigate('/settings')}
              className="gap-2 cursor-pointer"
            >
              <User size={14} />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setChangePwOpen(true)}
              className="gap-2 cursor-pointer"
            >
              <KeyRound size={14} />
              Change Password
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => navigate('/settings')}
              className="gap-2 cursor-pointer"
            >
              <Settings size={14} />
              Settings
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={toggleTheme}
              className="gap-2 cursor-pointer"
            >
              {resolvedTheme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
              {resolvedTheme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              className="gap-2 cursor-pointer text-destructive focus:text-destructive"
            >
              <LogOut size={14} />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Change Password Dialog */}
      {user && (
        <ChangePasswordDialog
          open={changePwOpen}
          onOpenChange={setChangePwOpen}
          userId={user.id}
          userName={user.name}
        />
      )}
    </header>
  );
}
