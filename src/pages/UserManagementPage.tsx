/**
 * User Management Page
 * Sectore 360 — Production
 * Full user lifecycle: create, edit, reset password, deactivate, delete.
 * Auto-generated employee codes, SHA-256 password hashing, profile photos.
 */
import { useState, useMemo, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { userManagementService, type ManagedUser } from '@/services/userManagementService';
import { hashPassword } from '@/services/authService';
import { usePermissions } from '@/hooks/usePermissions';
import { useAuth } from '@/contexts/AuthContext';
import type { UserRole } from '@/types/auth';
import {
  Users, Search, PlusCircle, UserCheck, UserX, KeyRound,
  ChevronLeft, ChevronRight, Edit2, Trash2, Eye, EyeOff, Upload, X,
} from 'lucide-react';

/* ── Password strength ───────────────────────────────────────── */
function getPasswordStrength(pw: string): { score: number; label: string; color: string } {
  if (!pw) return { score: 0, label: '', color: '' };
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[a-z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 2) return { score, label: 'Weak', color: 'bg-destructive' };
  if (score === 3) return { score, label: 'Medium', color: 'bg-warning' };
  return { score, label: 'Strong', color: 'bg-success' };
}

/* ── Validation schema ───────────────────────────────────────── */
const pwRules = z.string()
  .min(8, 'Min 8 characters')
  .regex(/[A-Z]/, 'One uppercase required')
  .regex(/[a-z]/, 'One lowercase required')
  .regex(/[0-9]/, 'One number required')
  .regex(/[^A-Za-z0-9]/, 'One special character required');

const createSchema = z.object({
  name:                  z.string().min(2, 'Full name required'),
  username:              z.string().min(2, 'Username required').regex(/^[a-zA-Z0-9._]+$/, 'Letters, numbers, dot, underscore only'),
  email:                 z.string().email('Valid email required'),
  mobile:                z.string().min(7, 'Mobile required'),
  role:                  z.enum(['superadmin','admin','manager','backoffice','engineer','customer'] as const),
  department:            z.string().optional(),
  designation:           z.string().optional(),
  status:                z.enum(['Active','Inactive'] as const),
  requirePasswordChange: z.boolean(),
  password:              pwRules,
  confirmPassword:       z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Passwords do not match', path: ['confirmPassword'],
});

const editSchema = z.object({
  name:                  z.string().min(2, 'Full name required'),
  email:                 z.string().email('Valid email required'),
  mobile:                z.string().min(7, 'Mobile required'),
  role:                  z.enum(['superadmin','admin','manager','backoffice','engineer','customer'] as const),
  department:            z.string().optional(),
  designation:           z.string().optional(),
  status:                z.enum(['Active','Inactive'] as const),
  requirePasswordChange: z.boolean(),
});

const resetSchema = z.object({
  newPassword:     pwRules,
  confirmPassword: z.string(),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: 'Passwords do not match', path: ['confirmPassword'],
});

type CreateForm = z.infer<typeof createSchema>;
type EditForm   = z.infer<typeof editSchema>;
type ResetForm  = z.infer<typeof resetSchema>;

/* ── Constants ───────────────────────────────────────────────── */
const ROLE_OPTS: { value: UserRole; label: string }[] = [
  { value: 'superadmin', label: 'Super Admin' },
  { value: 'admin',      label: 'Admin' },
  { value: 'manager',    label: 'Manager' },
  { value: 'backoffice', label: 'Back Office' },
  { value: 'engineer',   label: 'Engineer' },
  { value: 'customer',   label: 'Customer' },
];

const ROLE_COLORS: Record<string, string> = {
  superadmin: 'bg-purple-500/10 text-purple-600 border-0',
  admin:      'bg-destructive/10 text-destructive border-0',
  manager:    'bg-primary/10 text-primary border-0',
  backoffice: 'bg-info/10 text-info border-0',
  engineer:   'bg-success/10 text-success border-0',
  customer:   'bg-muted text-muted-foreground border-0',
};

const PAGE_SIZE = 10;

/* ── Profile photo upload helper ─────────────────────────────── */
function PhotoUpload({ value, onChange }: { value?: string; onChange: (v: string | undefined) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/png','image/jpeg','image/webp'].includes(file.type)) {
      toast.error('Only PNG, JPEG, WEBP allowed'); return;
    }
    if (file.size > 2 * 1024 * 1024) { toast.error('Max 2 MB'); return; }
    const reader = new FileReader();
    reader.onload = () => onChange(reader.result as string);
    reader.readAsDataURL(file);
  };
  return (
    <div className="flex items-center gap-3">
      {value ? (
        <div className="relative">
          <img src={value} alt="Profile" className="w-16 h-16 rounded-full object-cover border border-border" />
          <button type="button" onClick={() => onChange(undefined)}
            className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-destructive text-white flex items-center justify-center">
            <X size={10} />
          </button>
        </div>
      ) : (
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center border border-dashed border-border cursor-pointer"
          onClick={() => ref.current?.click()}>
          <Upload size={18} className="text-muted-foreground" />
        </div>
      )}
      <div className="flex flex-col gap-1">
        <Button type="button" variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => ref.current?.click()}>
          <Upload size={12} />{value ? 'Replace Photo' : 'Upload Photo'}
        </Button>
        <p className="text-[10px] text-muted-foreground">PNG, JPEG, WEBP · Max 2 MB</p>
      </div>
      <input ref={ref} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleFile} />
    </div>
  );
}

/* ── Password field with show/hide + strength ─────────────────── */
function PasswordField({ label, placeholder, value, error, onChange, showStrength = false }:
  { label: string; placeholder?: string; value: string; error?: string; onChange: (v: string) => void; showStrength?: boolean }) {
  const [show, setShow] = useState(false);
  const strength = getPasswordStrength(value);
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-sm font-medium">{label}</Label>
      <div className="relative">
        <Input type={show ? 'text' : 'password'} placeholder={placeholder ?? '••••••••'}
          value={value} onChange={(e) => onChange(e.target.value)} className="pr-10" />
        <button type="button" onClick={() => setShow((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" tabIndex={-1}>
          {show ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      </div>
      {showStrength && value && (
        <div className="flex items-center gap-2 mt-0.5">
          <div className="flex gap-0.5 flex-1">
            {[1,2,3,4,5].map((i) => (
              <div key={i} className={`h-1 flex-1 rounded-full ${i <= strength.score ? strength.color : 'bg-muted'}`} />
            ))}
          </div>
          <span className="text-[10px] font-semibold text-muted-foreground">{strength.label}</span>
        </div>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

/* ── Avatar cell ─────────────────────────────────────────────── */
function UserAvatar({ user }: { user: ManagedUser }) {
  const initials = user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  return user.profilePhoto ? (
    <img src={user.profilePhoto} alt={user.name} className="w-8 h-8 rounded-full object-cover border border-border" />
  ) : (
    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary border border-border">
      {initials}
    </div>
  );
}

/* ── Main page ───────────────────────────────────────────────── */
export default function UserManagementPage() {
  const { isSuperAdmin } = usePermissions();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);

  const refresh = () => { userManagementService.getAll().then(setUsers).catch(() => setUsers([])); };
  useEffect(() => { refresh(); }, []);

  const actor = { name: currentUser?.name ?? 'Admin', id: currentUser?.id ?? 'admin' };

  // Dialog states
  const [createOpen, setCreateOpen]       = useState(false);
  const [editUser, setEditUser]           = useState<ManagedUser | null>(null);
  const [resetUser, setResetUser]         = useState<ManagedUser | null>(null);
  const [deleteUser, setDeleteUser]       = useState<ManagedUser | null>(null);
  const [confirmToggle, setConfirmToggle] = useState<ManagedUser | null>(null);
  const [photoVal, setPhotoVal]           = useState<string | undefined>(undefined);
  const createForm = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      name: '', username: '', email: '', mobile: '', role: 'engineer',
      department: '', designation: '', status: 'Active',
      requirePasswordChange: false, password: '', confirmPassword: '',
    },
  });
  const pwWatch = createForm.watch('password');

  // ── Edit form
  const editForm = useForm<EditForm>({
    resolver: zodResolver(editSchema),
  });

  // ── Reset password form
  const resetForm = useForm<ResetForm>({
    resolver: zodResolver(resetSchema),
    defaultValues: { newPassword: '', confirmPassword: '' },
  });
  const resetPwWatch = resetForm.watch('newPassword');

  /* ── Filtered & paginated rows */
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return users.filter((u) => {
      if (roleFilter !== 'all' && u.role !== roleFilter) return false;
      if (statusFilter !== 'all' && u.status !== statusFilter) return false;
      if (q && !u.name.toLowerCase().includes(q) && !u.username.toLowerCase().includes(q)
            && !u.email.toLowerCase().includes(q) && !u.employeeCode.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [users, search, roleFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  /* ── Create submit */
  const onCreateSubmit = async (data: CreateForm) => {
    const [uTaken, eTaken] = await Promise.all([
      userManagementService.isUsernameTaken(data.username),
      userManagementService.isEmailTaken(data.email),
    ]);
    if (uTaken) { createForm.setError('username', { message: 'Username already taken' }); return; }
    if (eTaken) { createForm.setError('email', { message: 'Email already in use' }); return; }
    const passwordHash = await hashPassword(data.password);
    await userManagementService.create({
      username: data.username, name: data.name, email: data.email, mobile: data.mobile,
      role: data.role, department: data.department, designation: data.designation,
      status: data.status, profilePhoto: photoVal,
      requirePasswordChange: data.requirePasswordChange, passwordHash,
    }, actor.name, actor.id);
    toast.success(`User ${data.name} created successfully.`);
    createForm.reset();
    setPhotoVal(undefined);
    setCreateOpen(false);
    refresh();
  };

  /* ── Edit submit */
  const onEditSubmit = async (data: EditForm) => {
    if (!editUser) return;
    try {
      const updated = await userManagementService.update(editUser.id, { ...data, profilePhoto: photoVal }, actor.name, actor.id);
      if (!updated || updated.role !== data.role) {
        toast.error('Role update failed — database did not persist the change. Please try again.');
        return;
      }
      toast.success('User updated successfully.');
      setEditUser(null);
      refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      toast.error(`Failed to update user: ${msg}`);
    }
  };

  /* ── Open edit */
  const openEdit = (u: ManagedUser) => {
    setEditUser(u);
    setPhotoVal(u.profilePhoto);
    editForm.reset({
      name: u.name, email: u.email, mobile: u.mobile, role: u.role,
      department: u.department ?? '', designation: u.designation ?? '',
      status: u.status, requirePasswordChange: u.requirePasswordChange,
    });
  };

  /* ── Toggle status */
  const handleToggleStatus = async () => {
    if (!confirmToggle) return;
    const newStatus = confirmToggle.status === 'Active' ? 'Inactive' : 'Active';
    await userManagementService.setStatus(confirmToggle.id, newStatus, actor.name, actor.id);
    toast.success(`User ${newStatus === 'Active' ? 'activated' : 'deactivated'}.`);
    setConfirmToggle(null);
    refresh();
  };

  /* ── Reset password submit */
  const onResetSubmit = async (data: ResetForm) => {
    if (!resetUser) return;
    // hashPassword() here produces the final hash — use resetPasswordHash() which
    // stores it directly WITHOUT re-hashing. resetPassword() hashes internally and
    // would produce SHA256(SHA256(plain)), breaking subsequent logins.
    const hash = await hashPassword(data.newPassword);
    await userManagementService.resetPasswordHash(resetUser.id, hash, actor.name, actor.id);
    toast.success(`Password reset for ${resetUser.name}.`);
    resetForm.reset();
    setResetUser(null);
  };

  /* ── Delete */
  const handleDelete = async () => {
    if (!deleteUser) return;
    // Prevent self-deletion
    if (deleteUser.id === currentUser?.id) {
      toast.error('You cannot delete your own account.');
      setDeleteUser(null);
      return;
    }
    // Prevent deleting a superadmin unless actor is superadmin
    if (deleteUser.role === 'superadmin' && !isSuperAdmin) {
      toast.error('Only a Super Admin can delete another Super Admin.');
      setDeleteUser(null);
      return;
    }
    try {
      await userManagementService.delete(deleteUser.id, actor.name, actor.id);
      toast.success(`User ${deleteUser.name} has been deactivated and removed from active users.`);
      setDeleteUser(null);
      refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Delete failed';
      toast.error(msg);
      setDeleteUser(null);
    }
  };

  const fmtDate = (iso?: string) =>
    iso ? new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : 'Never';

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-4 pb-8">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Users size={18} className="text-primary" />User Management
            </h1>
            <p className="text-sm text-muted-foreground">Manage users, roles, passwords and access</p>
          </div>
          {isSuperAdmin && (
            <Button size="sm" onClick={() => { createForm.reset(); setPhotoVal(undefined); setCreateOpen(true); }}>
              <PlusCircle size={14} className="mr-1.5" />Create User
            </Button>
          )}
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex gap-3 flex-wrap items-end">
              <div className="relative flex-1 min-w-48">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <Input placeholder="Search name, username, email, code…" className="pl-8" value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs">Role</Label>
                <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v); setPage(1); }}>
                  <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    {ROLE_OPTS.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs">Status</Label>
                <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
                  <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-sm font-semibold">{filtered.length} user{filtered.length !== 1 ? 's' : ''}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full whitespace-nowrap text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground">
                    <th className="px-4 py-3 text-left font-medium">Photo</th>
                    <th className="px-4 py-3 text-left font-medium">Code</th>
                    <th className="px-4 py-3 text-left font-medium">Name</th>
                    <th className="px-4 py-3 text-left font-medium">Username</th>
                    <th className="px-4 py-3 text-left font-medium">Role</th>
                    <th className="px-4 py-3 text-left font-medium">Department</th>
                    <th className="px-4 py-3 text-left font-medium">Status</th>
                    <th className="px-4 py-3 text-left font-medium">Last Login</th>
                    <th className="px-4 py-3 text-left font-medium">Created</th>
                    <th className="px-4 py-3 text-left font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((u) => (
                    <tr key={u.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3"><UserAvatar user={u} /></td>
                      <td className="px-4 py-3 font-mono text-xs text-primary font-semibold">{u.employeeCode}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{u.name}</div>
                        <div className="text-xs text-muted-foreground">{u.email}</div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{u.username}</td>
                      <td className="px-4 py-3">
                        <Badge className={`text-xs capitalize ${ROLE_COLORS[u.role] ?? ''}`}>{u.role}</Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{u.department ?? '—'}</td>
                      <td className="px-4 py-3">
                        <Badge className={`text-xs ${u.status === 'Active' ? 'bg-success/10 text-success border-0' : 'bg-destructive/10 text-destructive border-0'}`}>
                          {u.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{fmtDate(u.lastLogin)}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{fmtDate(u.createdAt)}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Edit" onClick={() => openEdit(u)}>
                            <Edit2 size={13} />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Reset Password" onClick={() => { setResetUser(u); resetForm.reset(); }}>
                            <KeyRound size={13} />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title={u.status === 'Active' ? 'Deactivate' : 'Activate'} onClick={() => setConfirmToggle(u)}>
                            {u.status === 'Active' ? <UserX size={13} /> : <UserCheck size={13} />}
                          </Button>
                          {isSuperAdmin && (
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:text-destructive" title="Delete" onClick={() => setDeleteUser(u)}>
                              <Trash2 size={13} />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filtered.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <Users size={32} className="mx-auto mb-3 opacity-20" />
                  <p className="text-sm">No users found</p>
                </div>
              )}
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                <span className="text-xs text-muted-foreground">Page {page} of {totalPages}</span>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" className="h-7 w-7 p-0" disabled={page === 1} onClick={() => setPage((p) => p - 1)}><ChevronLeft size={13} /></Button>
                  <Button size="sm" variant="outline" className="h-7 w-7 p-0" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}><ChevronRight size={13} /></Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Create User Dialog ─────────────────────────────── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-2xl max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create User</DialogTitle>
            <DialogDescription>Fill in the details to create a new system user.</DialogDescription>
          </DialogHeader>
          <Form {...createForm}>
            <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="flex flex-col gap-4">
              {/* Photo */}
              <div>
                <Label className="text-sm font-medium mb-2 block">Profile Photo <span className="text-muted-foreground font-normal">(Optional)</span></Label>
                <PhotoUpload value={photoVal} onChange={setPhotoVal} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={createForm.control} name="name" render={({ field }) => (
                  <FormItem><FormLabel>Full Name *</FormLabel>
                    <FormControl><Input placeholder="e.g. John Smith" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={createForm.control} name="username" render={({ field }) => (
                  <FormItem><FormLabel>Username *</FormLabel>
                    <FormControl><Input placeholder="e.g. eng01, john.smith" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={createForm.control} name="email" render={({ field }) => (
                  <FormItem><FormLabel>Email *</FormLabel>
                    <FormControl><Input type="email" placeholder="user@company.com" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={createForm.control} name="mobile" render={({ field }) => (
                  <FormItem><FormLabel>Mobile *</FormLabel>
                    <FormControl><Input placeholder="+971 50 000 0000" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={createForm.control} name="role" render={({ field }) => (
                  <FormItem><FormLabel>Role *</FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {ROLE_OPTS.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={createForm.control} name="status" render={({ field }) => (
                  <FormItem><FormLabel>Status *</FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Active">Active</SelectItem>
                          <SelectItem value="Inactive">Inactive</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={createForm.control} name="department" render={({ field }) => (
                  <FormItem><FormLabel>Department</FormLabel>
                    <FormControl><Input placeholder="e.g. Operations" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={createForm.control} name="designation" render={({ field }) => (
                  <FormItem><FormLabel>Designation</FormLabel>
                    <FormControl><Input placeholder="e.g. Field Engineer" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              {/* Passwords */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={createForm.control} name="password" render={({ field }) => (
                  <FormItem>
                    <PasswordField label="Password *" value={field.value} onChange={field.onChange}
                      showStrength error={createForm.formState.errors.password?.message} />
                  </FormItem>
                )} />
                <FormField control={createForm.control} name="confirmPassword" render={({ field }) => (
                  <FormItem>
                    <PasswordField label="Confirm Password *" value={field.value} onChange={field.onChange}
                      error={createForm.formState.errors.confirmPassword?.message} />
                  </FormItem>
                )} />
              </div>

              {/* Password strength bar (full width) */}
              {pwWatch && (
                <div className="flex items-center gap-2">
                  <div className="flex gap-0.5 flex-1">
                    {[1,2,3,4,5].map((i) => {
                      const s = getPasswordStrength(pwWatch);
                      return <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= s.score ? s.color : 'bg-muted'}`} />;
                    })}
                  </div>
                  <span className="text-xs font-semibold text-muted-foreground w-12 text-right">
                    {getPasswordStrength(pwWatch).label}
                  </span>
                </div>
              )}

              <FormField control={createForm.control} name="requirePasswordChange" render={({ field }) => (
                <FormItem className="flex items-center gap-2 space-y-0">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormLabel className="font-normal cursor-pointer">Require password change on first login</FormLabel>
                </FormItem>
              )} />

              <DialogFooter className="gap-2">
                <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createForm.formState.isSubmitting}>
                  {createForm.formState.isSubmitting ? 'Creating…' : 'Create User'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* ── Edit User Dialog ───────────────────────────────── */}
      <Dialog open={!!editUser} onOpenChange={(v) => { if (!v) setEditUser(null); }}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-2xl max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit User — {editUser?.name}</DialogTitle>
            <DialogDescription>Employee Code: <span className="font-mono font-semibold text-primary">{editUser?.employeeCode}</span> · Username: <span className="font-mono">{editUser?.username}</span></DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="flex flex-col gap-4">
              <div>
                <Label className="text-sm font-medium mb-2 block">Profile Photo</Label>
                <PhotoUpload value={photoVal} onChange={setPhotoVal} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={editForm.control} name="name" render={({ field }) => (
                  <FormItem><FormLabel>Full Name *</FormLabel>
                    <FormControl><Input {...field} /></FormControl><FormMessage />
                  </FormItem>
                )} />
                <FormField control={editForm.control} name="mobile" render={({ field }) => (
                  <FormItem><FormLabel>Mobile *</FormLabel>
                    <FormControl><Input {...field} /></FormControl><FormMessage />
                  </FormItem>
                )} />
                <FormField control={editForm.control} name="email" render={({ field }) => (
                  <FormItem><FormLabel>Email *</FormLabel>
                    <FormControl><Input type="email" {...field} /></FormControl><FormMessage />
                  </FormItem>
                )} />
                <FormField control={editForm.control} name="role" render={({ field }) => (
                  <FormItem><FormLabel>Role *</FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange} disabled={!isSuperAdmin}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {ROLE_OPTS.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </FormControl><FormMessage />
                  </FormItem>
                )} />
                <FormField control={editForm.control} name="department" render={({ field }) => (
                  <FormItem><FormLabel>Department</FormLabel>
                    <FormControl><Input placeholder="e.g. Operations" {...field} /></FormControl><FormMessage />
                  </FormItem>
                )} />
                <FormField control={editForm.control} name="designation" render={({ field }) => (
                  <FormItem><FormLabel>Designation</FormLabel>
                    <FormControl><Input placeholder="e.g. Field Engineer" {...field} /></FormControl><FormMessage />
                  </FormItem>
                )} />
                <FormField control={editForm.control} name="status" render={({ field }) => (
                  <FormItem><FormLabel>Status *</FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Active">Active</SelectItem>
                          <SelectItem value="Inactive">Inactive</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl><FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField control={editForm.control} name="requirePasswordChange" render={({ field }) => (
                <FormItem className="flex items-center gap-2 space-y-0">
                  <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  <FormLabel className="font-normal cursor-pointer">Require password change on next login</FormLabel>
                </FormItem>
              )} />
              <DialogFooter className="gap-2">
                <Button type="button" variant="outline" onClick={() => setEditUser(null)}>Cancel</Button>
                <Button type="submit">Save Changes</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* ── Reset Password Dialog ──────────────────────────── */}
      <Dialog open={!!resetUser} onOpenChange={(v) => { if (!v) { setResetUser(null); resetForm.reset(); } }}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md">
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>Set a new password for <strong>{resetUser?.name}</strong> ({resetUser?.username})</DialogDescription>
          </DialogHeader>
          <Form {...resetForm}>
            <form onSubmit={resetForm.handleSubmit(onResetSubmit)} className="flex flex-col gap-4">
              <FormField control={resetForm.control} name="newPassword" render={({ field }) => (
                <FormItem>
                  <PasswordField label="New Password *" value={field.value} onChange={field.onChange}
                    showStrength error={resetForm.formState.errors.newPassword?.message} />
                </FormItem>
              )} />
              {resetPwWatch && (
                <div className="flex items-center gap-2">
                  {[1,2,3,4,5].map((i) => {
                    const s = getPasswordStrength(resetPwWatch);
                    return <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= s.score ? s.color : 'bg-muted'}`} />;
                  })}
                  <span className="text-xs font-semibold text-muted-foreground w-12 text-right">
                    {getPasswordStrength(resetPwWatch).label}
                  </span>
                </div>
              )}
              <FormField control={resetForm.control} name="confirmPassword" render={({ field }) => (
                <FormItem>
                  <PasswordField label="Confirm Password *" value={field.value} onChange={field.onChange}
                    error={resetForm.formState.errors.confirmPassword?.message} />
                </FormItem>
              )} />
              <DialogFooter className="gap-2">
                <Button type="button" variant="outline" onClick={() => { setResetUser(null); resetForm.reset(); }}>Cancel</Button>
                <Button type="submit" disabled={resetForm.formState.isSubmitting}>
                  <KeyRound size={14} className="mr-1.5" />Save Password
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* ── Toggle status confirm ──────────────────────────── */}
      <AlertDialog open={!!confirmToggle} onOpenChange={(v) => { if (!v) setConfirmToggle(null); }}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmToggle?.status === 'Active' ? 'Deactivate' : 'Activate'} User</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmToggle?.status === 'Active'
                ? `${confirmToggle?.name} will no longer be able to log in.`
                : `${confirmToggle?.name} will be able to log in again.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleToggleStatus}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Delete confirm ─────────────────────────────────── */}
      <AlertDialog open={!!deleteUser} onOpenChange={(v) => { if (!v) setDeleteUser(null); }}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{deleteUser?.name}</strong> ({deleteUser?.employeeCode}) will be deactivated and removed from active users.
              Their tasks, reports, and audit history will be preserved. This action can be reversed by reactivating the user.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
