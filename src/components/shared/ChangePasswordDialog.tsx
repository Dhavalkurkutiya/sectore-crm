/**
 * Change Password Dialog
 * Sectore 360 — available to every logged-in user via the TopNav menu.
 * Validates current password, enforces strength rules, hashes with SHA-256.
 */
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Eye, EyeOff, KeyRound } from 'lucide-react';

/* ── Password strength ───────────────────────────────────────── */
function getStrength(pw: string) {
  if (!pw) return { score: 0, label: '', color: '' };
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/[a-z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  if (s <= 2) return { score: s, label: 'Weak',   color: 'bg-destructive' };
  if (s === 3) return { score: s, label: 'Medium', color: 'bg-warning' };
  return { score: s, label: 'Strong', color: 'bg-success' };
}

const pwRules = z.string()
  .min(8, 'Min 8 characters')
  .regex(/[A-Z]/, 'One uppercase required')
  .regex(/[a-z]/, 'One lowercase required')
  .regex(/[0-9]/, 'One number required')
  .regex(/[^A-Za-z0-9]/, 'One special character required');

const schema = z.object({
  currentPassword: z.string().min(1, 'Current password required'),
  newPassword:     pwRules,
  confirmPassword: z.string(),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: 'Passwords do not match', path: ['confirmPassword'],
}).refine((d) => d.currentPassword !== d.newPassword, {
  message: 'New password must differ from current', path: ['newPassword'],
});

type FormData = z.infer<typeof schema>;

/* ── Show/hide password input ────────────────────────────────── */
function PwInput({ id, placeholder, value, onChange, error }:
  { id: string; placeholder?: string; value: string; onChange: (v: string) => void; error?: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="flex flex-col gap-1.5">
      <div className="relative">
        <Input id={id} type={show ? 'text' : 'password'} placeholder={placeholder ?? '••••••••'}
          value={value} onChange={(e) => onChange(e.target.value)} className="pr-10" />
        <button type="button" tabIndex={-1} onClick={() => setShow((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
          {show ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

/* ── Dialog ──────────────────────────────────────────────────── */
interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  userId: string;
  userName: string;
  /** When true, the dialog cannot be dismissed — user must change password first */
  forced?: boolean;
}

export function ChangePasswordDialog({ open, onOpenChange, userId, userName, forced = false }: Props) {
  const { changePassword } = useAuth();

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  const newPw = form.watch('newPassword');
  const strength = getStrength(newPw);

  const onSubmit = async (data: FormData) => {
    const ok = await changePassword(userId, data.currentPassword, data.newPassword);
    if (ok) {
      form.reset();
      onOpenChange(false);
    }
  };

  const handleClose = (v: boolean) => {
    if (forced) return; // cannot dismiss when forced
    if (!v) form.reset();
    onOpenChange(v);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound size={16} className="text-primary" />Change Password
          </DialogTitle>
          <DialogDescription>
            {forced
              ? <span className="text-warning font-medium">You must change your password before continuing.</span>
              : <>Changing password for <strong>{userName}</strong></>}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            {/* Current password */}
            <FormField control={form.control} name="currentPassword" render={({ field }) => (
              <FormItem>
                <FormLabel>Current Password *</FormLabel>
                <FormControl>
                  <PwInput id="current-pw" value={field.value} onChange={field.onChange}
                    error={form.formState.errors.currentPassword?.message} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            {/* New password */}
            <FormField control={form.control} name="newPassword" render={({ field }) => (
              <FormItem>
                <FormLabel>New Password *</FormLabel>
                <FormControl>
                  <PwInput id="new-pw" value={field.value} onChange={field.onChange}
                    error={form.formState.errors.newPassword?.message} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            {/* Strength bar */}
            {newPw && (
              <div className="flex items-center gap-2">
                <div className="flex gap-0.5 flex-1">
                  {[1,2,3,4,5].map((i) => (
                    <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i <= strength.score ? strength.color : 'bg-muted'}`} />
                  ))}
                </div>
                <Label className="text-[10px] font-semibold text-muted-foreground w-12 text-right">{strength.label}</Label>
              </div>
            )}

            {/* Confirm password */}
            <FormField control={form.control} name="confirmPassword" render={({ field }) => (
              <FormItem>
                <FormLabel>Confirm New Password *</FormLabel>
                <FormControl>
                  <PwInput id="confirm-pw" value={field.value} onChange={field.onChange}
                    error={form.formState.errors.confirmPassword?.message} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Min 8 characters · One uppercase · One lowercase · One number · One special character
            </p>

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => handleClose(false)}>Cancel</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Saving…' : 'Save Password'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
