/**
 * Login Page
 * Sectore 360 — Authentication entry point
 * Username / Password only — no Google OAuth
 */
import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { companyProfileService } from '@/services/companyProfileService';
import { useBrandLogo } from '@/hooks/useBrandLogo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertBanner } from '@/components/shared/AlertBanner';
import { Spinner } from '@/components/shared/Spinner';
import { Shield, Eye, EyeOff, ArrowRight, Phone, Mail, HeartHandshake } from 'lucide-react';
import { SectoreLogo } from '@/components/brand/SectoreLogo';
import { cn } from '@/lib/utils';

const loginSchema = z.object({
  username: z.string().min(2, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
});
type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { login, isLoading, error } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const { logoDataUrl, faviconDataUrl, companyName } = useBrandLogo();

  const company = companyProfileService.get();
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/dashboard';

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: '', password: '', rememberMe: false },
  });

  const onSubmit = async (data: LoginForm) => {
    await login({ username: data.username.trim(), password: data.password, rememberMe: data.rememberMe });
    navigate(from, { replace: true });
  };

  const businessItems = company.businessLine.split('•').map((s) => s.trim()).filter(Boolean);

  return (
    <div className="min-h-screen w-full flex bg-background">
      {/* ── Left panel ───────────────────────────────────── */}
      <div className="hidden lg:flex flex-col justify-between w-[460px] shrink-0 bg-gradient-to-br from-[#0B1229] via-[#0F1B3D] to-[#0B0F19] p-10 border-r border-border relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: `linear-gradient(rgba(59,130,246,0.3) 1px,transparent 1px),linear-gradient(90deg,rgba(59,130,246,0.3) 1px,transparent 1px)`,
          backgroundSize: '40px 40px',
        }} />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full bg-primary/10 blur-3xl pointer-events-none" />

        <div className="relative z-10">
          {logoDataUrl ? (
            <img src={logoDataUrl} alt={companyName} className="object-contain object-left"
              style={{ maxWidth: 240, maxHeight: 48, width: 'auto', height: 'auto' }} />
          ) : (
            <SectoreLogo variant="full" size={36} />
          )}
        </div>

        <div className="relative z-10 flex flex-col gap-5">
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 rounded-lg bg-primary/20 border border-primary/30">
              <Shield size={16} className="text-primary" />
            </div>
            <span className="text-xs font-semibold tracking-widest text-primary/80 uppercase">Enterprise ERP</span>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white leading-snug">{company.name}</h1>
            <p className="text-sm text-white/60 mt-1">{company.tagline}</p>
          </div>
          <div className="flex flex-wrap gap-2 mt-1">
            {businessItems.map((item) => (
              <span key={item} className="text-[11px] px-2.5 py-1 rounded-full bg-white/10 text-white/70 border border-white/10">{item}</span>
            ))}
          </div>
          <p className="text-xs text-white/40 font-medium tracking-widest uppercase mt-1">{company.footerText}</p>
        </div>

        <div className="relative z-10 border-t border-white/10 pt-5 flex flex-col gap-2">
          <div className="flex items-center gap-1.5 mb-1">
            <HeartHandshake size={13} className="text-white/50" />
            <span className="text-xs text-white/50 font-medium">Need Technical Support?</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-white/70">
            <Phone size={11} className="shrink-0 text-primary/70" />
            <span>Emergency: <span className="font-semibold text-white">+91 {company.emergencyPhone}</span></span>
          </div>
          <div className="flex items-center gap-2 text-xs text-white/70">
            <Phone size={11} className="shrink-0 text-primary/70" />
            <span>Office: <span className="font-semibold text-white">+91 {company.secondaryPhone || company.primaryPhone}</span></span>
          </div>
          <div className="flex items-center gap-2 text-xs text-white/70">
            <Mail size={11} className="shrink-0 text-primary/70" />
            <span>{company.supportEmail}</span>
          </div>
        </div>
      </div>

      {/* ── Right panel — login form ──────────────────────── */}
      <div className="flex flex-1 items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-md flex flex-col gap-6 animate-fade-in">

          {/* Mobile branding */}
          <div className="lg:hidden flex flex-col items-center gap-2 mb-2 text-center">
            {logoDataUrl ? (
              <img src={logoDataUrl} alt={companyName} className="object-contain"
                style={{ maxWidth: 200, maxHeight: 40, width: 'auto', height: 'auto' }} />
            ) : faviconDataUrl ? (
              <img src={faviconDataUrl} alt={companyName} className="w-10 h-10 object-contain" />
            ) : (
              <SectoreLogo variant="icon" size={40} />
            )}
            <p className="font-bold text-foreground">{companyName}</p>
            <p className="text-xs text-muted-foreground">{company.tagline}</p>
          </div>

          <div className="flex flex-col gap-1">
            <h2 className="text-2xl font-bold text-foreground tracking-tight">Sign in</h2>
            <p className="text-sm text-muted-foreground">Access your Sectore 360 workspace</p>
          </div>

          {error && <AlertBanner variant="error" message={error} dismissible />}

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
            {/* Username */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="username" className="text-sm font-medium">Username</Label>
              <Input id="username" type="text" autoComplete="username" placeholder="Enter your username"
                className={cn(errors.username && 'border-destructive focus-visible:ring-destructive')}
                {...register('username')} />
              {errors.username && <p className="text-xs text-destructive">{errors.username.message}</p>}
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password" className="text-sm font-medium">Password</Label>
              <div className="relative">
                <Input id="password" type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password" placeholder="••••••••"
                  className={cn('pr-10', errors.password && 'border-destructive focus-visible:ring-destructive')}
                  {...register('password')} />
                <button type="button" onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
            </div>

            <div className="flex items-center gap-2">
              <Checkbox id="rememberMe" onCheckedChange={(checked) => setValue('rememberMe', !!checked)} />
              <Label htmlFor="rememberMe" className="text-sm text-muted-foreground cursor-pointer">Keep me signed in</Label>
            </div>

            <Button type="submit" className="w-full gap-2 font-semibold" disabled={isLoading}>
              {isLoading ? <Spinner size="sm" /> : <><span>Sign In</span><ArrowRight size={16} /></>}
            </Button>
          </form>

          {/* Mobile emergency support */}
          <div className="lg:hidden rounded-lg border border-border bg-muted/20 p-3 flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5">
              <HeartHandshake size={13} className="text-muted-foreground" />
              <span className="text-xs font-semibold text-muted-foreground">Need Technical Support?</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Phone size={11} />Emergency: <span className="font-semibold text-foreground">+91 {company.emergencyPhone}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Mail size={11} />{company.supportEmail}
            </div>
          </div>

          <p className="text-center text-[11px] text-muted-foreground">
            Powered by <span className="font-semibold text-foreground">{company.name}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
