/**
 * TaskForm — shared Add/Edit form
 * Sectore 360 — Phase 1, Part 3
 */
import { useEffect, useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/shared/Spinner';
import { SmartAssetSearchCombobox } from '@/components/task/SmartAssetSearchCombobox';
import { customerService } from '@/services/customerService';
import { usersApi } from '@/lib/api';
import type { Task, TaskFormData } from '@/types/task';
import {
  TASK_TYPES, TASK_PRIORITIES, TASK_STATUSES,
} from '@/types/task';
import type { Customer, Asset } from '@/types/customer';
import { cn } from '@/lib/utils';

/* ── Seed engineers (future: from API) ───────────────────────── */

/* ── Schema ──────────────────────────────────────────────────── */
const schema = z.object({
  customerId:         z.string().min(1, 'Customer is required'),
  assetId:            z.string().min(1, 'Asset is required'),
  taskType:           z.string().min(1, 'Task type is required'),
  priority:           z.string().min(1, 'Priority is required'),
  status:             z.string().min(1, 'Status is required'),
  issueDescription:   z.string().min(1, 'Issue description is required'),
  engineerId:         z.string().optional(),
  engineerName:       z.string().optional(),
  expectedVisitDate:  z.string().optional(),
  expectedVisitTime:  z.string().optional(),
  remarks:            z.string().optional(),
  internalNotes:      z.string().optional(),
  customerNotes:      z.string().optional(),
  createdBy:          z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface TaskFormProps {
  task?: Task;
  defaultCustomerId?: string;
  defaultAssetId?: string;
  onSubmit: (data: TaskFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

function Field({ label, error, required, children, className }: {
  label: string; error?: string; required?: boolean;
  children: React.ReactNode; className?: string;
}) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <Label className="text-sm font-medium">
        {label}{required && <span className="text-destructive ml-1">*</span>}
      </Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

export function TaskForm({
  task, defaultCustomerId, defaultAssetId, onSubmit, onCancel, isLoading,
}: TaskFormProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [engineers, setEngineers] = useState<{ id: string; name: string }[]>([]);
  // Track selectedAsset for display purposes only
  const [, setSelectedAsset] = useState<Asset | null>(null);

  const {
    register, handleSubmit, watch, setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: task ? {
      customerId:        task.customerId,
      assetId:           task.assetId,
      taskType:          task.taskType,
      priority:          task.priority,
      status:            task.status,
      issueDescription:  task.issueDescription,
      engineerId:        task.engineerId ?? '',
      engineerName:      task.engineerName ?? '',
      expectedVisitDate: task.expectedVisitDate ?? '',
      expectedVisitTime: task.expectedVisitTime ?? '',
      remarks:           task.remarks ?? '',
      internalNotes:     task.internalNotes ?? '',
      customerNotes:     task.customerNotes ?? '',
    } : {
      customerId:  defaultCustomerId ?? '',
      assetId:     defaultAssetId ?? '',
      priority:    'Medium',
      status:      'Pending',
    },
  });

  const selectedCustomerId = watch('customerId');
  const selectedEngineerId = watch('engineerId');

  // Load customers + engineers
  useEffect(() => {
    Promise.all([
      customerService.getAll(),
      usersApi.getEngineers(),
    ]).then(([c, eng]) => {
      setCustomers(c.filter((x) => x.status === 'Active'));
      setEngineers(eng.map((u) => ({ id: u.id, name: u.name })));
    }).catch(() => {});
  }, []);

  // Clear assetId when customer changes
  useEffect(() => {
    if (!defaultAssetId) {
      setValue('assetId', '');
      setSelectedAsset(null);
    }
  }, [selectedCustomerId, defaultAssetId, setValue]);

  // Sync engineer name when engineerId changes
  useEffect(() => {
    const eng = engineers.find((e) => e.id === selectedEngineerId);
    setValue('engineerName', eng?.name ?? '');
  }, [selectedEngineerId, engineers, setValue]);

  const handleAssetChange = useCallback((assetId: string, asset: Asset | null) => {
    setValue('assetId', assetId, { shouldValidate: true });
    setSelectedAsset(asset);
  }, [setValue]);

  const onValid = async (values: FormValues) => {
    await onSubmit(values as unknown as TaskFormData);
  };

  return (
    <form onSubmit={handleSubmit(onValid)} className="flex flex-col gap-6" noValidate>

      {/* ── Task Details ───────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Task Details</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Customer */}
          <Field label="Customer" error={errors.customerId?.message} required>
            <Select
              value={watch('customerId')}
              onValueChange={(v) => setValue('customerId', v, { shouldValidate: true })}
              disabled={!!defaultCustomerId}
            >
              <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
              <SelectContent>
                {customers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.companyName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          {/* Asset — Smart Enterprise Search */}
          <Field label="Asset" error={errors.assetId?.message} required>
            <SmartAssetSearchCombobox
              customerId={selectedCustomerId}
              value={watch('assetId')}
              onChange={handleAssetChange}
              disabled={!!defaultAssetId}
              onCreateNew={!defaultAssetId ? () => {
                // Opens new asset form in a new tab for the selected customer
                window.open(`/assets/new?customerId=${selectedCustomerId}`, '_blank');
              } : undefined}
            />
          </Field>

          {/* Task Type */}
          <Field label="Task Type" error={errors.taskType?.message} required>
            <Select
              value={watch('taskType')}
              onValueChange={(v) => setValue('taskType', v, { shouldValidate: true })}
            >
              <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
              <SelectContent>
                {TASK_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>

          {/* Priority */}
          <Field label="Priority" error={errors.priority?.message} required>
            <Select
              value={watch('priority')}
              onValueChange={(v) => setValue('priority', v, { shouldValidate: true })}
            >
              <SelectTrigger><SelectValue placeholder="Select priority" /></SelectTrigger>
              <SelectContent>
                {TASK_PRIORITIES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>

          {/* Status */}
          <Field label="Status" error={errors.status?.message} required>
            <Select
              value={watch('status')}
              onValueChange={(v) => setValue('status', v, { shouldValidate: true })}
            >
              <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
              <SelectContent>
                {TASK_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>

          {/* Engineer */}
          <Field label="Assign Engineer">
            <Select
              value={watch('engineerId') ?? ''}
              onValueChange={(v) => setValue('engineerId', v === 'unassigned' ? '' : v, { shouldValidate: true })}
            >
              <SelectTrigger><SelectValue placeholder="Unassigned (optional)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {engineers.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>

          {/* Expected Visit Date */}
          <Field label="Expected Visit Date">
            <Input type="date" {...register('expectedVisitDate')} className="px-2" />
          </Field>

          {/* Expected Visit Time */}
          <Field label="Expected Visit Time">
            <Input type="time" {...register('expectedVisitTime')} className="px-2" />
          </Field>
        </CardContent>
      </Card>

      {/* ── Issue Description ──────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Issue Description</CardTitle>
        </CardHeader>
        <CardContent>
          <Field label="Describe the issue" error={errors.issueDescription?.message} required>
            <Textarea
              {...register('issueDescription')}
              placeholder="Describe the customer's reported issue in detail…"
              rows={4}
              className="px-2 resize-none"
            />
          </Field>
        </CardContent>
      </Card>

      {/* ── Notes & Remarks ────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Notes &amp; Remarks</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Field label="Remarks">
            <Textarea {...register('remarks')} placeholder="General remarks for this task…" rows={2} className="px-2 resize-none" />
          </Field>
          <Separator />
          <Field label="Internal Notes" className="text-muted-foreground">
            <Textarea {...register('internalNotes')} placeholder="Internal team notes (not visible to customer)…" rows={2} className="px-2 resize-none" />
          </Field>
          <Field label="Customer Notes">
            <Textarea {...register('customerNotes')} placeholder="Notes visible to the customer…" rows={2} className="px-2 resize-none" />
          </Field>
        </CardContent>
      </Card>

      {/* ── Actions ───────────────────────────────── */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading} className="gap-2 min-w-[120px]">
          {isLoading ? <><Spinner size="sm" /><span>Saving…</span></> : task ? 'Save Changes' : 'Create Task'}
        </Button>
      </div>
    </form>
  );
}
