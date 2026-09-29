/**
 * Setup Wizard — First-run admin setup
 * Sectore 360 — Production
 *
 * Shown only when application_config.setup_completed = false.
 * Creates the Super Admin (admin) and optionally an Engineer (hasmukh).
 * No hardcoded passwords — admin sets them here.
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Eye, EyeOff, CheckCircle2, Shield, User, Lock, ArrowRight, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { hashPassword } from '@/services/authService';
import { usersApi, configApi } from '@/lib/api';

// ── password strength ──────────────────────────────────────────────────────
function passwordStrength(p: string): { score: number; label: string; color: string } {
  if (!p) return { score: 0, label: '', color: '' };
  let score = 0;
  if (p.length >= 8)               score++;
  if (/[A-Z]/.test(p))             score++;
  if (/[a-z]/.test(p))             score++;
  if (/[0-9]/.test(p))             score++;
  if (/[^A-Za-z0-9]/.test(p))      score++;
  if (score <= 2) return { score, label: 'Weak',   color: 'bg-destructive' };
  if (score <= 3) return { score, label: 'Medium', color: 'bg-yellow-500' };
  return { score, label: 'Strong', color: 'bg-green-500' };
}

// ── zod schemas ────────────────────────────────────────────────────────────
const pwSchema = z
  .string()
  .min(8, 'Minimum 8 characters')
  .regex(/[A-Z]/, 'Must include uppercase')
  .regex(/[a-z]/, 'Must include lowercase')
  .regex(/[0-9]/, 'Must include number')
  .regex(/[^A-Za-z0-9]/, 'Must include special character');

const adminSchema = z.object({
  password:        pwSchema,
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  path: ['confirmPassword'],
  message: 'Passwords do not match',
});

const engineerSchema = z.object({
  name:            z.string().min(2, 'Name required'),
  username:        z.string().min(2, 'Username required').regex(/^[a-z0-9_]+$/, 'Lowercase, numbers, underscores only'),
  email:           z.string().email('Valid email required'),
  mobile:          z.string().min(10, '10-digit mobile required'),
  password:        pwSchema,
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  path: ['confirmPassword'],
  message: 'Passwords do not match',
});

type AdminForm    = z.infer<typeof adminSchema>;
type EngineerForm = z.infer<typeof engineerSchema>;

type Step = 'admin' | 'engineer' | 'done';

// ── component ──────────────────────────────────────────────────────────────
export default function SetupWizard() {
  const navigate = useNavigate();
  const [step, setStep]       = useState<Step>('admin');
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw]   = useState<Record<string, boolean>>({});
  const toggle = (k: string) => setShowPw((p) => ({ ...p, [k]: !p[k] }));

  // ── Admin form ────────────────────────────────────────────────────────
  const adminForm = useForm<AdminForm>({
    resolver: zodResolver(adminSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });
  const adminPw = adminForm.watch('password');
  const adminStrength = passwordStrength(adminPw);

  const submitAdmin = adminForm.handleSubmit(async (data) => {
    setLoading(true);
    try {
      const hash = await hashPassword(data.password);

      // Check if admin already exists in DB
      const existing = await usersApi.getByUsername('admin');
      if (existing) {
        // Update password hash only
        await usersApi.updatePasswordHash(existing.id, hash);
      } else {
        await usersApi.create({
          id:                     crypto.randomUUID(),
          username:               'admin',
          email:                  'superadmin@sectore.com',
          name:                   'Super Admin',
          role:                   'superadmin',
          employee_code:          'SA-0001',
          password_hash:          hash,
          status:                 'Active',
          department:             null,
          designation:            null,
          mobile:                 '',
          profile_photo:          null,
          avatar_url:             null,
          require_password_change: false,
          last_login:             null,
          company_id:             'sectore-001',
        });
      }
      toast.success('Super Admin account created');
      setStep('engineer');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to create admin');
    } finally {
      setLoading(false);
    }
  });

  // ── Engineer form ─────────────────────────────────────────────────────
  const engForm = useForm<EngineerForm>({
    resolver: zodResolver(engineerSchema),
    defaultValues: { name: 'Hasmukh', username: 'hasmukh', email: '', mobile: '', password: '', confirmPassword: '' },
  });
  const engPw = engForm.watch('password');
  const engStrength = passwordStrength(engPw);

  const submitEngineer = engForm.handleSubmit(async (data) => {
    setLoading(true);
    try {
      const taken = await usersApi.isUsernameTaken(data.username);
      if (taken) {
        engForm.setError('username', { message: 'Username already taken' });
        return;
      }
      const hash = await hashPassword(data.password);
      const code = await usersApi.generateCode('engineer');
      await usersApi.create({
        id:                     crypto.randomUUID(),
        username:               data.username.toLowerCase(),
        email:                  data.email,
        name:                   data.name,
        role:                   'engineer',
        employee_code:          code,
        password_hash:          hash,
        status:                 'Active',
        department:             null,
        designation:            null,
        mobile:                 data.mobile,
        profile_photo:          null,
        avatar_url:             null,
        require_password_change: false,
        last_login:             null,
        company_id:             'sectore-001',
      });
      toast.success(`Engineer ${data.name} created`);
      await finalize();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to create engineer');
    } finally {
      setLoading(false);
    }
  });

  const skipEngineer = async () => {
    setLoading(true);
    await finalize();
    setLoading(false);
  };

  const finalize = async () => {
    await configApi.markSetupCompleted();
    setStep('done');
  };

  const goToLogin = () => navigate('/login', { replace: true });

  // ── render ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold text-foreground">Sectore 360</span>
          </div>
          <p className="text-muted-foreground text-sm">Initial Setup Wizard</p>

          {/* Step indicator */}
          <div className="flex items-center justify-center gap-2 pt-2">
            {(['admin', 'engineer', 'done'] as Step[]).map((s, i) => (
              <React.Fragment key={s}>
                <div className={`h-2 w-2 rounded-full transition-colors ${step === s ? 'bg-primary' : (i < ['admin','engineer','done'].indexOf(step) ? 'bg-primary/40' : 'bg-muted')}`} />
                {i < 2 && <div className="h-px w-8 bg-muted" />}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* ── Step 1: Super Admin ── */}
        {step === 'admin' && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-primary" />
                <CardTitle>Create Super Admin Password</CardTitle>
              </div>
              <CardDescription>
                Set a secure password for <Badge variant="secondary">admin</Badge> — the system Super Admin account.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={submitAdmin} className="space-y-4">
                {/* Password */}
                <div className="space-y-1">
                  <Label htmlFor="a-pw">Password *</Label>
                  <div className="relative">
                    <Input
                      id="a-pw"
                      type={showPw['a-pw'] ? 'text' : 'password'}
                      placeholder="Enter strong password"
                      className="pr-10"
                      {...adminForm.register('password')}
                    />
                    <button type="button" onClick={() => toggle('a-pw')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {showPw['a-pw'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {adminPw && (
                    <div className="space-y-1">
                      <div className="flex gap-1">
                        {[1,2,3,4,5].map((n) => (
                          <div key={n} className={`h-1 flex-1 rounded-full transition-colors ${n <= adminStrength.score ? adminStrength.color : 'bg-muted'}`} />
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">Strength: {adminStrength.label}</p>
                    </div>
                  )}
                  {adminForm.formState.errors.password && (
                    <p className="text-xs text-destructive">{adminForm.formState.errors.password.message}</p>
                  )}
                </div>

                {/* Confirm */}
                <div className="space-y-1">
                  <Label htmlFor="a-cpw">Confirm Password *</Label>
                  <div className="relative">
                    <Input
                      id="a-cpw"
                      type={showPw['a-cpw'] ? 'text' : 'password'}
                      placeholder="Re-enter password"
                      className="pr-10"
                      {...adminForm.register('confirmPassword')}
                    />
                    <button type="button" onClick={() => toggle('a-cpw')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {showPw['a-cpw'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {adminForm.formState.errors.confirmPassword && (
                    <p className="text-xs text-destructive">{adminForm.formState.errors.confirmPassword.message}</p>
                  )}
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ArrowRight className="h-4 w-4 mr-2" />}
                  Set Admin Password
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* ── Step 2: Engineer ── */}
        {step === 'engineer' && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                <CardTitle>Create Engineer Account</CardTitle>
              </div>
              <CardDescription>
                Set up the first engineer account. You can skip and add engineers later from User Management.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={submitEngineer} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="e-name">Full Name *</Label>
                    <Input id="e-name" placeholder="Hasmukh" {...engForm.register('name')} />
                    {engForm.formState.errors.name && (
                      <p className="text-xs text-destructive">{engForm.formState.errors.name.message}</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="e-user">Username *</Label>
                    <Input id="e-user" placeholder="hasmukh" {...engForm.register('username')} />
                    {engForm.formState.errors.username && (
                      <p className="text-xs text-destructive">{engForm.formState.errors.username.message}</p>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="e-email">Email *</Label>
                    <Input id="e-email" type="email" placeholder="eng@company.com" {...engForm.register('email')} />
                    {engForm.formState.errors.email && (
                      <p className="text-xs text-destructive">{engForm.formState.errors.email.message}</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="e-mob">Mobile *</Label>
                    <Input id="e-mob" placeholder="9876543210" {...engForm.register('mobile')} />
                    {engForm.formState.errors.mobile && (
                      <p className="text-xs text-destructive">{engForm.formState.errors.mobile.message}</p>
                    )}
                  </div>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="e-pw">Password *</Label>
                  <div className="relative">
                    <Input id="e-pw" type={showPw['e-pw'] ? 'text' : 'password'} placeholder="Enter password" className="pr-10" {...engForm.register('password')} />
                    <button type="button" onClick={() => toggle('e-pw')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {showPw['e-pw'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {engPw && (
                    <div className="flex gap-1 mt-1">
                      {[1,2,3,4,5].map((n) => (
                        <div key={n} className={`h-1 flex-1 rounded-full transition-colors ${n <= engStrength.score ? engStrength.color : 'bg-muted'}`} />
                      ))}
                    </div>
                  )}
                  {engForm.formState.errors.password && (
                    <p className="text-xs text-destructive">{engForm.formState.errors.password.message}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="e-cpw">Confirm Password *</Label>
                  <div className="relative">
                    <Input id="e-cpw" type={showPw['e-cpw'] ? 'text' : 'password'} placeholder="Re-enter password" className="pr-10" {...engForm.register('confirmPassword')} />
                    <button type="button" onClick={() => toggle('e-cpw')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {showPw['e-cpw'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {engForm.formState.errors.confirmPassword && (
                    <p className="text-xs text-destructive">{engForm.formState.errors.confirmPassword.message}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button type="submit" className="flex-1" disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ArrowRight className="h-4 w-4 mr-2" />}
                    Create Engineer
                  </Button>
                  <Button type="button" variant="outline" onClick={skipEngineer} disabled={loading}>
                    Skip
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* ── Step 3: Done ── */}
        {step === 'done' && (
          <Card>
            <CardContent className="pt-8 pb-8 text-center space-y-4">
              <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
              <div>
                <h3 className="text-lg font-semibold">Setup Complete!</h3>
                <p className="text-muted-foreground text-sm mt-1">
                  Sectore 360 is ready. Log in with your admin credentials to get started.
                </p>
              </div>
              <Button className="w-full" onClick={goToLogin}>
                Go to Login
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
