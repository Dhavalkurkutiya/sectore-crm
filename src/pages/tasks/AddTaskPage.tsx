/**
 * AddTaskPage — Service Request Creation
 * Sectore 360 — v12 Workflow Redesign
 *
 * Objective: Back-office executive creates a complete service request in < 45 seconds.
 *
 * Desktop (lg+): 2-column — left: 4 linear step cards (all visible, step-gated),
 *                            right: sticky always-visible summary panel
 * Mobile:        True 4-step wizard — one step at a time, Next / Back navigation
 *
 * Steps:
 *   1  Who is calling?   — Customer search + Quick Create
 *   2  What is the issue? — Issue title, description, priority, service type, photos
 *   3  Which device?      — Search existing asset OR Quick Add new asset
 *   4  Assignment         — Engineer, visit date/time, internal notes
 *
 * Summary panel shows: Customer · Issue · Device · Priority · Engineer · AMC Status · Warranty
 *
 * All business logic from v11 is preserved (taskService.create, assetService, customerService).
 */
import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { CustomerSearchCombobox } from '@/components/task/CustomerSearchCombobox';
import { QuickCustomerDrawer } from '@/components/task/QuickCustomerDrawer';
import { SmartAssetSelector } from '@/components/task/SmartAssetSelector';
import { QuickAssetDrawer } from '@/components/task/QuickAssetDrawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Form, FormField, FormItem, FormLabel, FormControl, FormMessage,
} from '@/components/ui/form';
import { Spinner } from '@/components/shared/Spinner';
import { assetService } from '@/services/assetService';
import { taskService } from '@/services/taskService';
import { useAuth } from '@/contexts/AuthContext';
import { useSidebar } from '@/contexts/SidebarContext';
import type { Customer, Asset } from '@/types/customer';
import type { TaskType, TaskPriority } from '@/types/task';
import { TASK_TYPES, TASK_PRIORITIES } from '@/types/task';
import { templateService } from '@/services/templateService';
import {
  Building2, Server, ClipboardList, UserCheck, Calendar,
  CheckCircle2, PlusCircle, MapPin, Phone, Mail,
  AlertTriangle, User, Tag, Clock, FileText, ShieldCheck,
  ArrowLeft, ArrowRight, ChevronRight, Image,
} from 'lucide-react';

/* ─── Engineers list — loaded from DB ──────────────────────────── */
function useEngineers() {
  const [engineers, setEngineers] = useState<{ id: string; name: string }[]>([]);
  useEffect(() => {
    import('@/lib/api').then(({ usersApi }) => {
      usersApi.getEngineers().then((list) =>
        setEngineers(list.map((u) => ({ id: u.id, name: u.name })))
      ).catch(() => setEngineers([]));
    }).catch(() => setEngineers([]));
  }, []);
  return engineers;
}

/* ─── Priority colors ──────────────────────────────────────────── */
const PRIORITY_COLORS: Record<string, string> = {
  Low:       'bg-muted text-muted-foreground',
  Medium:    'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  High:      'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  Critical:  'bg-destructive/10 text-destructive',
  Emergency: 'bg-destructive text-destructive-foreground',
};

/* ─── AMC status colors ────────────────────────────────────────── */
const AMC_COLORS: Record<string, string> = {
  'Active AMC':   'bg-success/10 text-success border-success/20',
  'No AMC':       'bg-muted text-muted-foreground border-border',
  'Expired AMC':  'bg-destructive/10 text-destructive border-destructive/20',
  'Renewal Due':  'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400',
};

/* ─── Form schema ──────────────────────────────────────────────── */
const schema = z.object({
  issueTitle:        z.string().min(2, 'Issue title is required'),
  issueDescription:  z.string().min(5, 'Describe the issue'),
  taskType:          z.string().min(1, 'Service type is required'),
  priority:          z.string().min(1, 'Priority is required'),
  engineerId:        z.string().optional(),
  expectedVisitDate: z.string().optional(),
  expectedVisitTime: z.string().optional(),
  internalNotes:     z.string().optional(),
  remarks:           z.string().optional(),
  customerNotes:     z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

/* ─── Step definitions ─────────────────────────────────────────── */
const STEPS = [
  { id: 1, label: 'Who is calling?',    icon: Building2,     short: 'Customer' },
  { id: 2, label: 'What is the issue?', icon: ClipboardList, short: 'Issue'    },
  { id: 3, label: 'Which device?',      icon: Server,        short: 'Device'   },
  { id: 4, label: 'Assignment',         icon: UserCheck,     short: 'Assign'   },
] as const;

/* ─── Sub-components ───────────────────────────────────────────── */

/** Large step card used for each section */
function StepCard({
  step, title, icon: Icon, isActive, isDone, isLocked, children,
}: {
  step: number; title: string; icon: React.ElementType;
  isActive: boolean; isDone: boolean; isLocked: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={cn(
      'rounded-2xl border bg-card shadow-sm transition-all duration-200',
      isActive  ? 'border-primary/40 ring-2 ring-primary/20 shadow-md' : 'border-border',
      isLocked  ? 'opacity-50 pointer-events-none select-none' : '',
    )}>
      {/* Header */}
      <div className={cn(
        'flex items-center gap-3 px-6 py-4 border-b',
        isActive ? 'border-primary/20 bg-primary/5' : 'border-border',
      )}>
        <div className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold',
          isDone   ? 'bg-success/15 text-success' : '',
          isActive && !isDone ? 'bg-primary/15 text-primary' : '',
          !isActive && !isDone ? 'bg-muted text-muted-foreground' : '',
        )}>
          {isDone
            ? <CheckCircle2 size={18} />
            : <Icon size={18} />
          }
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Step {step}
          </p>
          <h2 className={cn(
            'text-base font-bold leading-tight',
            isActive ? 'text-primary' : 'text-foreground',
          )}>
            {title}
          </h2>
        </div>
        {isDone && !isActive && (
          <CheckCircle2 size={18} className="text-success shrink-0" />
        )}
      </div>
      {/* Body */}
      <div className="px-6 py-5">
        {children}
      </div>
    </div>
  );
}

/** Summary row for the right panel */
function SRow({ icon: Icon, label, value, children, className }: {
  icon: React.ElementType; label: string; value?: string;
  children?: React.ReactNode; className?: string;
}) {
  return (
    <div className={cn('flex items-start gap-3', className)}>
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted">
        <Icon size={13} className="text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0 py-0.5">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-0.5">{label}</p>
        {children ?? (
          <p className={cn('text-sm font-medium truncate', value ? 'text-foreground' : 'text-muted-foreground/40')}>
            {value || '—'}
          </p>
        )}
      </div>
    </div>
  );
}

/** Asset row button — REMOVED: replaced by SmartAssetSelector */

/* ══════════════════════════════════════════════════════════════ */
/*  Main Page Component                                           */
/* ══════════════════════════════════════════════════════════════ */
export default function AddTaskPage() {
  const navigate       = useNavigate();
  const [searchParams] = useSearchParams();
  const { user }       = useAuth();
  const { isCollapsed } = useSidebar();
  const createdBy      = user?.name ?? 'System Admin';

  /* ── Live engineers list ── */
  const ENGINEERS = useEngineers();

  /* ── Core state ── */
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedAsset,    setSelectedAsset]    = useState<Asset | null>(null);
  const [templateHint,     setTemplateHint]     = useState<string | null>(null);
  const [photoFiles,       setPhotoFiles]       = useState<File[]>([]);

  /* ── Sub-flow drawers ── */
  const [showQuickCustomer, setShowQuickCustomer] = useState(false);
  const [showQuickAsset,    setShowQuickAsset]    = useState(false);
  const [quickAssetHint,    setQuickAssetHint]    = useState('');

  /* ── Submission ── */
  const [submitting, setSubmitting] = useState(false);

  /* ── Mobile wizard: current visible step (1–4) ── */
  const [mobileStep, setMobileStep] = useState(1);

  /* Photo input ref */
  const photoInputRef = useRef<HTMLInputElement>(null);

  /* ── Form ── */
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      taskType: 'Breakdown', priority: 'Medium',
      issueTitle: '', issueDescription: '',
      engineerId: '', expectedVisitDate: '', expectedVisitTime: '',
      internalNotes: '', remarks: '', customerNotes: '',
    },
  });
  const wv = form.watch();

  /* ── Pre-fill from URL params ── */
  useEffect(() => {
    const custId  = searchParams.get('customerId');
    const assetId = searchParams.get('assetId');
    if (custId) {
      import('@/services/customerService').then(({ customerService }) => {
        customerService.getById(custId).then((c) => {
          if (c) { setSelectedCustomer(c); setMobileStep(2); }
        }).catch(() => {});
      }).catch(() => {});
    }
    if (assetId) {
      assetService.getById(assetId).then((a) => {
        if (a) { setSelectedAsset(a); setMobileStep(2); }
      }).catch(() => {});
    }
  }, [searchParams]);

  /* ── Load assets when customer selected ── */
  useEffect(() => {
    if (!selectedCustomer) { setSelectedAsset(null); return; }
  }, [selectedCustomer]);

  /* ── Handlers ── */
  function handleCustomerChange(c: Customer | null) {
    setSelectedCustomer(c);
    setSelectedAsset(null);
  }
  function handleCustomerCreated(c: Customer) {
    setSelectedCustomer(c);
    setShowQuickCustomer(false);
    setMobileStep(2);
  }
  function handleAssetCreated(a: Asset) {
    setSelectedAsset(a);
    setShowQuickAsset(false);
    setMobileStep(3);
  }
  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) setPhotoFiles(Array.from(e.target.files));
  }

  /* ── Submit — optimistic: disable immediately, navigate on success ── */
  async function doSubmit(values: FormValues) {
    if (!selectedCustomer) { toast.error('Please select a customer.'); setMobileStep(1); return; }
    if (!selectedAsset)    { toast.error('Please select an asset.');   setMobileStep(3); return; }
    setSubmitting(true);   // disable button immediately — no blocking spinner
    const eng = ENGINEERS.find((e) => e.id === values.engineerId);
    taskService.create({
      customerId:        selectedCustomer.id,
      assetId:           selectedAsset.id,
      taskType:          values.taskType as TaskType,
      priority:          values.priority as TaskPriority,
      status:            'Pending',
      issueDescription:  `${values.issueTitle}: ${values.issueDescription}`,
      engineerId:        values.engineerId || undefined,
      engineerName:      eng?.name,
      expectedVisitDate: values.expectedVisitDate || undefined,
      expectedVisitTime: values.expectedVisitTime || undefined,
      remarks:           values.remarks || undefined,
      internalNotes:     values.internalNotes || undefined,
      customerNotes:     values.customerNotes || undefined,
      createdBy,
    }, createdBy).then((task) => {
      toast.success(`Service request ${task.taskNumber} created successfully.`);
      navigate(`/tasks/${task.id}`);
    }).catch(() => {
      toast.error('Failed to create request. Please try again.');
      setSubmitting(false);
    });
  }

  /* ── Derived ── */
  const selectedEngineer  = ENGINEERS.find((e) => e.id === wv.engineerId);
  const amcLabel          = selectedCustomer?.amcStatus ?? 'No AMC';
  const warranty          = selectedAsset?.warrantyEnd;
  const isStepDone = {
    1: !!selectedCustomer,
    2: !!(wv.issueTitle && wv.issueDescription && wv.taskType && wv.priority),
    3: !!selectedAsset,
    4: !!(wv.engineerId || wv.expectedVisitDate),
  };
  const isStepLocked = {
    1: false,
    2: !selectedCustomer,
    3: !selectedCustomer,
    4: !selectedCustomer,
  };
  const canSubmit = isStepDone[1] && isStepDone[2] && isStepDone[3];

  /* ── Mobile: next/back helpers ── */
  function mobileNext() { setMobileStep((s) => Math.min(4, s + 1)); }
  function mobileBack() { setMobileStep((s) => Math.max(1, s - 1)); }

  /* ════════════════════════════════════════════════════════════ */
  return (
    <DashboardLayout>

      {/* ── Page header ─────────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-6 min-w-0">
        <Button
          type="button" variant="ghost" size="sm"
          className="h-9 w-9 p-0 shrink-0 text-muted-foreground hover:text-foreground"
          onClick={() => navigate('/tasks')}
        >
          <ArrowLeft size={17} />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold leading-tight">New Service Request</h1>
          <p className="text-sm text-muted-foreground hidden md:block mt-0.5">
            Search customer → describe issue → select device → assign engineer
          </p>
        </div>
      </div>

      {/* ── Mobile step indicator ───────────────────────────── */}
      <div className="flex lg:hidden items-center gap-0 mb-5 bg-card border border-border rounded-xl overflow-hidden">
        {STEPS.map((s, idx) => {
          const done   = isStepDone[s.id as keyof typeof isStepDone];
          const active = mobileStep === s.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => !isStepLocked[s.id as keyof typeof isStepLocked] && setMobileStep(s.id)}
              className={cn(
                'flex-1 flex flex-col items-center gap-1 py-3 px-1 text-center transition-colors min-h-[56px] justify-center',
                active ? 'bg-primary text-primary-foreground' : '',
                done && !active ? 'text-success' : '',
                !active && !done ? 'text-muted-foreground' : '',
                isStepLocked[s.id as keyof typeof isStepLocked] ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer',
                idx < STEPS.length - 1 ? 'border-r border-border' : '',
              )}
            >
              {done && !active
                ? <CheckCircle2 size={15} className="text-success" />
                : <s.icon size={15} />
              }
              <span className="text-[10px] font-semibold leading-none">{s.short}</span>
            </button>
          );
        })}
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(doSubmit)}>

          {/* ── Two-column layout ─────────────────────────────── */}
          <div className="flex gap-6 items-start">

            {/* ════ LEFT: step cards ════════════════════════════ */}
            <div className="flex-1 min-w-0 pb-24 flex flex-col gap-5">

              {STEPS.map((s) => {
                const done   = isStepDone[s.id as keyof typeof isStepDone];
                const locked = isStepLocked[s.id as keyof typeof isStepLocked];
                /* Mobile: only show current step */
                const visibleOnMobile = mobileStep === s.id;
                /* Desktop: always show all steps */
                return (
                  <div
                    key={s.id}
                    className={cn(
                      'lg:block',
                      visibleOnMobile ? 'block' : 'hidden',
                    )}
                  >
                    <StepCard
                      step={s.id} title={s.label} icon={s.icon}
                      isActive={mobileStep === s.id && !locked}
                      isDone={done}
                      isLocked={locked}
                    >

                      {/* ── STEP 1: Who is calling? ──────────── */}
                      {s.id === 1 && (
                        <div className="flex flex-col gap-5">
                          {/* Search box — intentionally large */}
                          <div>
                            <label className="block text-sm font-semibold mb-2">
                              Search by company, phone, contact or email
                            </label>
                            <CustomerSearchCombobox
                              value={selectedCustomer}
                              onChange={handleCustomerChange}
                              onCreateNew={() => setShowQuickCustomer(true)}
                            />
                          </div>

                          {/* Customer not found CTA */}
                          {!selectedCustomer && (
                            <button
                              type="button"
                              onClick={() => setShowQuickCustomer(true)}
                              className="flex items-center gap-3 w-full p-4 rounded-xl border-2 border-dashed border-primary/30 hover:border-primary/60 hover:bg-primary/5 transition-colors text-left group"
                            >
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
                                <PlusCircle size={18} className="text-primary" />
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-primary">+ Create New Customer</p>
                                <p className="text-xs text-muted-foreground">Customer not in system? Add them in 30 seconds.</p>
                              </div>
                              <ChevronRight size={16} className="text-primary ml-auto shrink-0" />
                            </button>
                          )}

                          {/* Selected customer card */}
                          {selectedCustomer && (
                            <div className="rounded-xl border border-success/30 bg-success/5 p-4 flex flex-col gap-3">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-success/15">
                                    <Building2 size={17} className="text-success" />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="font-bold text-base truncate">{selectedCustomer.companyName}</p>
                                    <p className="text-sm text-muted-foreground">{selectedCustomer.contactPerson}</p>
                                  </div>
                                </div>
                                <Badge variant="outline" className="shrink-0 text-xs">{selectedCustomer.code}</Badge>
                              </div>
                              <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm">
                                {selectedCustomer.primaryMobile && (
                                  <a href={`tel:${selectedCustomer.primaryMobile}`}
                                    className="flex items-center gap-1.5 text-primary hover:underline">
                                    <Phone size={12} /> {selectedCustomer.primaryMobile}
                                  </a>
                                )}
                                {selectedCustomer.email && (
                                  <span className="flex items-center gap-1.5 text-muted-foreground">
                                    <Mail size={12} /> {selectedCustomer.email}
                                  </span>
                                )}
                                {selectedCustomer.city && (
                                  <span className="flex items-center gap-1.5 text-muted-foreground">
                                    <MapPin size={12} /> {selectedCustomer.city}
                                    {selectedCustomer.googleMapLink && (
                                      <a href={selectedCustomer.googleMapLink} target="_blank" rel="noreferrer"
                                        className="text-primary underline ml-1 text-xs">Map</a>
                                    )}
                                  </span>
                                )}
                              </div>
                              {/* AMC badge */}
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={cn(
                                  'inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border',
                                  AMC_COLORS[amcLabel] ?? AMC_COLORS['No AMC'],
                                )}>
                                  <ShieldCheck size={11} />
                                  {amcLabel}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setSelectedCustomer(null)}
                                  className="text-xs text-muted-foreground hover:text-destructive underline ml-auto"
                                >
                                  Change customer
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Mobile Next */}
                          <div className="flex lg:hidden justify-end">
                            <Button
                              type="button"
                              onClick={mobileNext}
                              disabled={!isStepDone[1]}
                              className="gap-2 h-11 px-6"
                            >
                              Next: Issue <ArrowRight size={15} />
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* ── STEP 2: What is the issue? ───────── */}
                      {s.id === 2 && (
                        <div className="flex flex-col gap-5">
                          <FormField control={form.control} name="issueTitle" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-semibold">
                                Issue Title <span className="text-destructive">*</span>
                              </FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  placeholder="e.g. PC not booting, Network down, Printer offline…"
                                  className="px-4 h-12 text-base"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />

                          <FormField control={form.control} name="issueDescription" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-semibold">
                                Description <span className="text-destructive">*</span>
                              </FormLabel>
                              <FormControl>
                                <Textarea
                                  {...field}
                                  placeholder="Describe the symptoms, frequency, and impact…"
                                  rows={4}
                                  className="px-4 resize-none text-sm"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField control={form.control} name="priority" render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-sm font-semibold">
                                  Priority <span className="text-destructive">*</span>
                                </FormLabel>
                                <Select value={field.value} onValueChange={field.onChange}>
                                  <FormControl>
                                    <SelectTrigger className="h-12 text-sm">
                                      <SelectValue placeholder="Select priority" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {TASK_PRIORITIES.map((p) => (
                                      <SelectItem key={p} value={p}>
                                        <span className="flex items-center gap-2">
                                          <span className={cn(
                                            'inline-block h-2 w-2 rounded-full',
                                            p === 'Low' ? 'bg-muted-foreground' : '',
                                            p === 'Medium' ? 'bg-amber-500' : '',
                                            p === 'High' ? 'bg-orange-500' : '',
                                            p === 'Critical' || p === 'Emergency' ? 'bg-destructive' : '',
                                          )} />
                                          {p}
                                        </span>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )} />

                            <FormField control={form.control} name="taskType" render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-sm font-semibold">
                                  Service Type <span className="text-destructive">*</span>
                                </FormLabel>
                                <Select value={field.value} onValueChange={field.onChange}>
                                  <FormControl>
                                    <SelectTrigger className="h-12 text-sm">
                                      <SelectValue placeholder="Select service type" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {TASK_TYPES.map((t) => (
                                      <SelectItem key={t} value={t}>{t}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>

                                <FormMessage />
                              </FormItem>
                            )} />
                          </div>

                          {/* Photo upload */}
                          <div>
                            <label className="block text-sm font-semibold mb-2">
                              Photos <span className="text-muted-foreground font-normal text-xs">(optional)</span>
                            </label>
                            <button
                              type="button"
                              onClick={() => photoInputRef.current?.click()}
                              className="flex items-center gap-3 w-full p-4 rounded-xl border-2 border-dashed border-border hover:border-primary/40 hover:bg-accent transition-colors text-left"
                            >
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                                <Image size={16} className="text-muted-foreground" />
                              </div>
                              <div>
                                {photoFiles.length > 0 ? (
                                  <p className="text-sm font-medium text-foreground">
                                    {photoFiles.length} photo{photoFiles.length > 1 ? 's' : ''} selected
                                  </p>
                                ) : (
                                  <p className="text-sm font-medium text-muted-foreground">
                                    Tap to attach issue photos
                                  </p>
                                )}
                                <p className="text-xs text-muted-foreground mt-0.5">JPG, PNG, WebP up to 10 MB each</p>
                              </div>
                            </button>
                            <input
                              ref={photoInputRef}
                              type="file"
                              accept="image/*"
                              multiple
                              className="hidden"
                              onChange={handlePhotoChange}
                            />
                          </div>

                          {/* Mobile Next/Back */}
                          <div className="flex lg:hidden items-center justify-between gap-3">
                            <Button type="button" variant="outline" onClick={mobileBack} className="gap-2 h-11 px-5">
                              <ArrowLeft size={15} /> Back
                            </Button>
                            <Button type="button" onClick={mobileNext} disabled={!isStepDone[2]} className="gap-2 h-11 px-6">
                              Next: Device <ArrowRight size={15} />
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* ── STEP 3: Which device? ────────────── */}
                      {s.id === 3 && (
                        <div className="flex flex-col gap-4">
                          <SmartAssetSelector
                            customerId={selectedCustomer?.id ?? ''}
                            value={selectedAsset?.id}
                            onChange={(assetId, asset) => {
                              setSelectedAsset(asset);
                              if (asset) {
                                const sv = form.getValues('taskType');
                                const tmpl = sv
                                  ? templateService.findByServiceTypeAndCategory(sv, asset.category)
                                  : null;
                                setTemplateHint(tmpl
                                  ? `✓ Template: ${tmpl.name} · ${tmpl.checklist.length} checklist items${tmpl.config.materialsEnabled ? ' · Materials' : ''}${tmpl.config.requireCustomerSignature ? ' · Signature required' : ''}`
                                  : null);
                              } else {
                                setTemplateHint(null);
                              }
                            }}
                            onCreateNew={() => {
                              setQuickAssetHint('');
                              setShowQuickAsset(true);
                            }}
                            disabled={!selectedCustomer}
                          />

                          {/* Template hint */}
                          {templateHint && selectedAsset && (
                            <div className="flex items-center gap-2 rounded-md border border-green-500/30 bg-green-50 dark:bg-green-950/20 px-3 py-2">
                              <span className="text-xs text-green-700 dark:text-green-400">{templateHint}</span>
                            </div>
                          )}

                          {/* Mobile Next/Back */}
                          <div className="flex lg:hidden items-center justify-between gap-3 mt-2">
                            <Button type="button" variant="outline" onClick={mobileBack} className="gap-2 h-11 px-5">
                              <ArrowLeft size={15} /> Back
                            </Button>
                            <Button type="button" onClick={mobileNext} disabled={!isStepDone[3]} className="gap-2 h-11 px-6">
                              Next: Assign <ArrowRight size={15} />
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* ── STEP 4: Assignment ───────────────── */}
                      {s.id === 4 && (
                        <div className="flex flex-col gap-5">
                          <FormField control={form.control} name="engineerId" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-semibold">Assign Engineer</FormLabel>
                              <Select value={field.value ?? ''} onValueChange={(v) => field.onChange(v === 'unassigned' ? '' : v)}>
                                <FormControl>
                                  <SelectTrigger className="h-12 text-sm">
                                    <SelectValue placeholder="Unassigned — assign later" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="unassigned">Unassigned</SelectItem>
                                  {ENGINEERS.map((e) => (
                                    <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )} />

                          {selectedEngineer && (
                            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-success/10 border border-success/20 text-sm text-success font-medium">
                              <CheckCircle2 size={14} className="shrink-0" />
                              Assigned to <strong>{selectedEngineer.name}</strong>
                            </div>
                          )}

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField control={form.control} name="expectedVisitDate" render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-sm font-semibold flex items-center gap-1.5">
                                  <Calendar size={13} /> Visit Date
                                </FormLabel>
                                <FormControl>
                                  <Input type="date" {...field} className="px-4 h-12 text-sm" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )} />
                            <FormField control={form.control} name="expectedVisitTime" render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-sm font-semibold flex items-center gap-1.5">
                                  <Clock size={13} /> Visit Time
                                </FormLabel>
                                <FormControl>
                                  <Input type="time" {...field} className="px-4 h-12 text-sm" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )} />
                          </div>

                          <Separator />

                          <FormField control={form.control} name="internalNotes" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-semibold">Internal Notes</FormLabel>
                              <FormControl>
                                <Textarea
                                  {...field}
                                  placeholder="Notes visible only to staff — not shown to customer…"
                                  rows={3}
                                  className="px-4 resize-none text-sm"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />

                          {/* Mobile Back + Submit */}
                          <div className="flex lg:hidden items-center justify-between gap-3 mt-2">
                            <Button type="button" variant="outline" onClick={mobileBack} className="gap-2 h-11 px-5">
                              <ArrowLeft size={15} /> Back
                            </Button>
                            <Button
                              type="submit"
                              disabled={submitting || !canSubmit}
                              className="gap-2 h-11 px-6 flex-1"
                            >
                              {submitting
                                ? <><Spinner size="sm" /> Creating…</>
                                : <><CheckCircle2 size={15} /> Create Request</>
                              }
                            </Button>
                          </div>
                        </div>
                      )}

                    </StepCard>
                  </div>
                );
              })}
            </div>{/* /left column */}

            {/* ════ RIGHT: sticky summary panel ════════════════ */}
            <div className="hidden lg:flex flex-col gap-4 w-72 xl:w-80 shrink-0 sticky top-4 self-start pb-24">
              <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-border bg-muted/30">
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    Request Summary
                  </p>
                </div>
                <div className="px-5 py-4 flex flex-col gap-4">
                  <SRow icon={Building2} label="Customer" value={selectedCustomer?.companyName} />
                  {selectedCustomer && (
                    <>
                      {selectedCustomer.primaryMobile && (
                        <SRow icon={Phone} label="Mobile" value={selectedCustomer.primaryMobile} />
                      )}
                      {selectedCustomer.email && (
                        <SRow icon={Mail} label="Email">
                          <p className="text-sm font-medium text-foreground truncate">{selectedCustomer.email}</p>
                        </SRow>
                      )}
                    </>
                  )}

                  <Separator />

                  <SRow icon={ShieldCheck} label="AMC Status">
                    <span className={cn(
                      'inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border mt-0.5',
                      AMC_COLORS[amcLabel] ?? AMC_COLORS['No AMC'],
                    )}>
                      {amcLabel}
                    </span>
                  </SRow>

                  {warranty && (
                    <SRow icon={FileText} label="Warranty End" value={warranty} />
                  )}

                  <Separator />

                  <SRow icon={ClipboardList} label="Issue" value={wv.issueTitle || undefined} />
                  <SRow icon={Tag} label="Service Type" value={wv.taskType || undefined} />
                  <SRow icon={AlertTriangle} label="Priority">
                    {wv.priority ? (
                      <span className={cn(
                        'inline-block mt-0.5 text-xs font-semibold px-2.5 py-0.5 rounded-full',
                        PRIORITY_COLORS[wv.priority] ?? 'bg-muted text-muted-foreground',
                      )}>
                        {wv.priority}
                      </span>
                    ) : <span className="text-sm text-muted-foreground/40 mt-0.5 block">—</span>}
                  </SRow>

                  <Separator />

                  <SRow icon={Server} label="Device"
                    value={selectedAsset
                      ? `${selectedAsset.deviceType}${selectedAsset.brand ? ` · ${selectedAsset.brand}` : ''}`
                      : undefined}
                  />
                  {selectedAsset?.serialNumber && (
                    <SRow icon={FileText} label="Serial No." value={selectedAsset.serialNumber} />
                  )}

                  <Separator />

                  <SRow icon={User}     label="Engineer"   value={selectedEngineer?.name} />
                  <SRow icon={Calendar} label="Visit Date" value={wv.expectedVisitDate || undefined} />
                  {wv.expectedVisitTime && (
                    <SRow icon={Clock} label="Visit Time" value={wv.expectedVisitTime} />
                  )}
                </div>
              </div>

              {/* Completion checklist */}
              <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-border bg-muted/30">
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    Checklist
                  </p>
                </div>
                <div className="px-5 py-4 flex flex-col gap-2.5">
                  {[
                    { step: 1, label: 'Customer selected',   required: true },
                    { step: 2, label: 'Issue described',     required: true },
                    { step: 3, label: 'Device selected',     required: true },
                    { step: 4, label: 'Engineer assigned',   required: false },
                    { step: 4, label: 'Visit date set',      required: false },
                  ].map((item, i) => {
                    const done = item.step === 1 ? isStepDone[1]
                               : item.step === 2 ? isStepDone[2]
                               : item.step === 3 ? isStepDone[3]
                               : item.label === 'Engineer assigned' ? !!wv.engineerId
                               : !!wv.expectedVisitDate;
                    return (
                      <div key={i} className="flex items-center gap-2.5">
                        <CheckCircle2
                          size={14}
                          className={done ? 'text-success' : 'text-muted-foreground/25'}
                        />
                        <span className={cn(
                          'text-sm',
                          done ? 'text-foreground font-medium' : 'text-muted-foreground/50',
                        )}>
                          {item.label}
                          {!item.required && (
                            <span className="text-xs text-muted-foreground/40 ml-1">(optional)</span>
                          )}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>{/* /right */}

          </div>{/* /two-col */}

          {/* ════ Desktop sticky action bar ══════════════════════ */}
          <div className={cn(
            'fixed bottom-0 right-0 z-40 border-t border-border bg-background/96 backdrop-blur-sm transition-all duration-200',
            isCollapsed ? 'left-0 lg:left-16' : 'left-0 lg:left-60',
          )}>
            <div className="max-w-screen-2xl mx-auto flex items-center gap-4 px-4 py-3 md:px-6">
              {/* Status hint */}
              <div className="flex-1 min-w-0 hidden md:block">
                {!selectedCustomer ? (
                  <p className="text-sm text-muted-foreground">Search for or create a customer to begin</p>
                ) : !isStepDone[2] ? (
                  <p className="text-sm text-muted-foreground">
                    <span className="font-semibold text-foreground">{selectedCustomer.companyName}</span>
                    {' '}— describe the issue next
                  </p>
                ) : !selectedAsset ? (
                  <p className="text-sm text-muted-foreground">
                    <span className="font-semibold text-foreground">{selectedCustomer.companyName}</span>
                    {' · '}{wv.issueTitle} — now select a device
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    <span className="font-semibold text-foreground">{selectedCustomer.companyName}</span>
                    {' · '}<span className="font-semibold text-foreground">{selectedAsset.deviceType}</span>
                    {wv.issueTitle && <>{' · '}{wv.issueTitle}</>}
                  </p>
                )}
              </div>

              {/* Buttons */}
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  type="button" variant="ghost" size="sm"
                  className="h-11 px-4 hidden md:flex gap-1.5 text-muted-foreground"
                  disabled={submitting}
                  onClick={() => navigate('/tasks')}
                >
                  <ArrowLeft size={14} /> Cancel
                </Button>

                <Button
                  type="submit"
                  size="sm"
                  className="h-11 px-6 gap-2 min-w-[160px] hidden lg:flex"
                  disabled={submitting || !canSubmit}
                >
                  {submitting
                    ? <><Spinner size="sm" /> Creating…</>
                    : <><CheckCircle2 size={15} /> Create Request</>
                  }
                </Button>
              </div>
            </div>
          </div>

        </form>
      </Form>

      {/* ── Quick Customer Drawer ──────────────────────────── */}
      <QuickCustomerDrawer
        open={showQuickCustomer}
        onOpenChange={setShowQuickCustomer}
        onCreated={handleCustomerCreated}
        createdBy={createdBy}
      />

      {/* ── Quick Asset Drawer ─────────────────────────────── */}
      {selectedCustomer && (
        <QuickAssetDrawer
          open={showQuickAsset}
          onOpenChange={setShowQuickAsset}
          customerId={selectedCustomer.id}
          customerName={selectedCustomer.companyName}
          onCreated={handleAssetCreated}
          createdBy={createdBy}
          searchHint={quickAssetHint}
        />
      )}
    </DashboardLayout>
  );
}
