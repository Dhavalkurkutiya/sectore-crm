/**
 * AMC Form — shared Add/Edit form
 * Sectore 360 — Phase 1, Part 4
 */
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, X } from 'lucide-react';
import { customerService } from '@/services/customerService';
import { assetService } from '@/services/assetService';
import type { Customer, Asset } from '@/types/customer';
import type { AMC, AMCFormData } from '@/types/amc';
import {
  CONTRACT_TYPE_OPTIONS, VISIT_FREQUENCY_OPTIONS, AMC_STATUS_OPTIONS,
} from '@/types/amc';

/* ── Schema ───────────────────────────────────────────────────── */
const schema = z.object({
  customerId:             z.string().min(1, 'Customer is required'),
  customerName:           z.string().optional(),
  contractType:           z.enum(['Comprehensive','Non-Comprehensive','Preventive Maintenance','Labour Only','Custom']),
  startDate:              z.string().min(1, 'Start date is required'),
  endDate:                z.string().min(1, 'End date is required'),
  status:                 z.enum(['Draft','Active','Expired','Cancelled','Renewed']),
  visitFrequency:         z.enum(['Monthly','Quarterly','Half-Yearly','Yearly','Custom']),
  numberOfIncludedVisits: z.coerce.number().int().min(1, 'Must be at least 1'),
  slaResponseTime:        z.string().min(1, 'SLA response time is required'),
  slaResolutionTime:      z.string().min(1, 'SLA resolution time is required'),
  workingHours:           z.string().optional(),
  holidayRules:           z.string().optional(),
  labourIncluded:         z.boolean(),
  travelIncluded:         z.boolean(),
  emergencySupportIncluded: z.boolean(),
  remoteSupportIncluded:  z.boolean(),
  includedServices:       z.string().optional(),
  excludedServices:       z.string().optional(),
  coveredParts:           z.string().optional(),
  excludedParts:          z.string().optional(),
  coveredAssetIds:        z.array(z.string()).min(1, 'At least one asset must be selected'),
  remarks:                z.string().optional(),
}).refine((d) => new Date(d.endDate) > new Date(d.startDate), {
  message: 'End date must be after start date', path: ['endDate'],
});

type FormValues = z.infer<typeof schema>;

interface Props {
  initial?: AMC;
  preCustomerId?: string;
  onSubmit: (data: AMCFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export function AMCForm({ initial, preCustomerId, onSubmit, onCancel, isLoading }: Props) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [filteredAssets, setFilteredAssets] = useState<Asset[]>([]);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      customerId:             initial?.customerId ?? preCustomerId ?? '',
      customerName:           initial?.customerName ?? '',
      contractType:           initial?.contractType ?? 'Comprehensive',
      startDate:              initial?.startDate ?? '',
      endDate:                initial?.endDate ?? '',
      status:                 initial?.status ?? 'Draft',
      visitFrequency:         initial?.visitFrequency ?? 'Quarterly',
      numberOfIncludedVisits: initial?.numberOfIncludedVisits ?? 4,
      slaResponseTime:        initial?.slaResponseTime ?? '4 hours',
      slaResolutionTime:      initial?.slaResolutionTime ?? '24 hours',
      workingHours:           initial?.workingHours ?? '',
      holidayRules:           initial?.holidayRules ?? '',
      labourIncluded:         initial?.labourIncluded ?? true,
      travelIncluded:         initial?.travelIncluded ?? true,
      emergencySupportIncluded: initial?.emergencySupportIncluded ?? false,
      remoteSupportIncluded:  initial?.remoteSupportIncluded ?? false,
      includedServices:       initial?.includedServices ?? '',
      excludedServices:       initial?.excludedServices ?? '',
      coveredParts:           initial?.coveredParts ?? '',
      excludedParts:          initial?.excludedParts ?? '',
      coveredAssetIds:        initial?.coveredAssetIds ?? [],
      remarks:                initial?.remarks ?? '',
    },
  });

  const watchCustomerId = form.watch('customerId');

  useEffect(() => {
    Promise.all([customerService.getAll(), assetService.getAll()])
      .then(([c, a]) => { setCustomers(c); setAssets(a); });
  }, []);

  useEffect(() => {
    if (watchCustomerId) {
      const filtered = assets.filter((a) => a.customerId === watchCustomerId && a.status === 'Active');
      setFilteredAssets(filtered);
      // Remove selected assets that don't belong to this customer
      const current = form.getValues('coveredAssetIds');
      const valid = current.filter((id) => filtered.some((a) => a.id === id));
      if (valid.length !== current.length) form.setValue('coveredAssetIds', valid);
    } else {
      setFilteredAssets([]);
    }
  }, [watchCustomerId, assets, form]);

  const coveredAssetIds = form.watch('coveredAssetIds');

  function toggleAsset(assetId: string) {
    const current = form.getValues('coveredAssetIds');
    if (current.includes(assetId)) {
      form.setValue('coveredAssetIds', current.filter((id) => id !== assetId), { shouldValidate: true });
    } else {
      form.setValue('coveredAssetIds', [...current, assetId], { shouldValidate: true });
    }
  }

  async function handleSubmit(values: FormValues) {
    const customer = customers.find((c) => c.id === values.customerId);
    await onSubmit({
      ...values,
      contractType: values.contractType,
      status: values.status,
      visitFrequency: values.visitFrequency,
      createdBy: '',
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col gap-6">

        {/* ── Basic Information ──────────────────────────────── */}
        <Card>
          <CardHeader><CardTitle className="text-sm font-semibold">Contract Information</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Customer */}
            <FormField control={form.control} name="customerId" render={({ field }) => (
              <FormItem>
                <FormLabel>Customer <span className="text-destructive">*</span></FormLabel>
                <Select value={field.value} onValueChange={(v) => { field.onChange(v); form.setValue('coveredAssetIds', []); }}
                  disabled={!!preCustomerId && !initial}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger></FormControl>
                  <SelectContent>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.companyName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            {/* Contract Type */}
            <FormField control={form.control} name="contractType" render={({ field }) => (
              <FormItem>
                <FormLabel>Contract Type <span className="text-destructive">*</span></FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>{CONTRACT_TYPE_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            {/* Start Date */}
            <FormField control={form.control} name="startDate" render={({ field }) => (
              <FormItem>
                <FormLabel>Start Date <span className="text-destructive">*</span></FormLabel>
                <FormControl><Input type="date" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            {/* End Date */}
            <FormField control={form.control} name="endDate" render={({ field }) => (
              <FormItem>
                <FormLabel>End Date <span className="text-destructive">*</span></FormLabel>
                <FormControl><Input type="date" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            {/* Status */}
            <FormField control={form.control} name="status" render={({ field }) => (
              <FormItem>
                <FormLabel>Status <span className="text-destructive">*</span></FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    {AMC_STATUS_OPTIONS.filter((s) => s === 'Draft' || s === 'Active').map((o) => (
                      <SelectItem key={o} value={o}>{o}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
          </CardContent>
        </Card>

        {/* ── Visit Configuration ────────────────────────────── */}
        <Card>
          <CardHeader><CardTitle className="text-sm font-semibold">Visit Configuration & SLA</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField control={form.control} name="visitFrequency" render={({ field }) => (
              <FormItem>
                <FormLabel>Visit Frequency <span className="text-destructive">*</span></FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>{VISIT_FREQUENCY_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="numberOfIncludedVisits" render={({ field }) => (
              <FormItem>
                <FormLabel>Number of Included Visits <span className="text-destructive">*</span></FormLabel>
                <FormControl><Input type="number" min={1} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="slaResponseTime" render={({ field }) => (
              <FormItem>
                <FormLabel>SLA Response Time <span className="text-destructive">*</span></FormLabel>
                <FormControl><Input placeholder="e.g. 4 hours" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="slaResolutionTime" render={({ field }) => (
              <FormItem>
                <FormLabel>SLA Resolution Time <span className="text-destructive">*</span></FormLabel>
                <FormControl><Input placeholder="e.g. 24 hours" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="workingHours" render={({ field }) => (
              <FormItem>
                <FormLabel>Working Hours</FormLabel>
                <FormControl><Input placeholder="e.g. 9 AM – 6 PM, Mon–Sat" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="holidayRules" render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Holiday Rules</FormLabel>
                <FormControl><Textarea placeholder="e.g. No service on public holidays…" rows={2} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </CardContent>
        </Card>

        {/* ── Coverage Flags ─────────────────────────────────── */}
        <Card>
          <CardHeader><CardTitle className="text-sm font-semibold">Coverage Options</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {([ ['labourIncluded','Labour Included'],['travelIncluded','Travel Included'],
                ['emergencySupportIncluded','Emergency Support'],['remoteSupportIncluded','Remote Support'],
              ] as [keyof FormValues, string][]).map(([name, label]) => (
              <FormField key={name} control={form.control} name={name} render={({ field }) => (
                <FormItem className="flex items-center gap-2 space-y-0">
                  <FormControl>
                    <Checkbox checked={field.value as boolean} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormLabel className="text-sm font-normal cursor-pointer">{label}</FormLabel>
                </FormItem>
              )} />
            ))}
          </CardContent>
        </Card>

        {/* ── Service & Parts Coverage ───────────────────────── */}
        <Card>
          <CardHeader><CardTitle className="text-sm font-semibold">Service & Parts Coverage</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {([
              ['includedServices','Included Services','e.g. Hardware repair, Network troubleshooting'],
              ['excludedServices','Excluded Services','e.g. Data recovery, Custom development'],
              ['coveredParts','Covered Parts','e.g. Hard drives, RAM'],
              ['excludedParts','Excluded Parts','e.g. Monitors, Keyboards'],
            ] as [keyof FormValues, string, string][]).map(([name, label, ph]) => (
              <FormField key={name} control={form.control} name={name} render={({ field }) => (
                <FormItem>
                  <FormLabel>{label}</FormLabel>
                  <FormControl><Textarea placeholder={ph} rows={3} value={field.value as string} onChange={field.onChange} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            ))}
          </CardContent>
        </Card>

        {/* ── Covered Assets ─────────────────────────────────── */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Covered Assets <span className="text-destructive">*</span></CardTitle>
              {coveredAssetIds.length > 0 && (
                <Badge variant="outline" className="text-xs">{coveredAssetIds.length} selected</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!watchCustomerId ? (
              <p className="text-sm text-muted-foreground">Select a customer to see their assets.</p>
            ) : filteredAssets.length === 0 ? (
              <p className="text-sm text-muted-foreground">No active assets found for this customer.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {filteredAssets.map((asset) => {
                  const checked = coveredAssetIds.includes(asset.id);
                  return (
                    <button key={asset.id} type="button" onClick={() => toggleAsset(asset.id)}
                      className={`flex items-start gap-3 p-3 rounded-lg border text-left transition-colors
                        ${checked ? 'border-primary/50 bg-primary/5' : 'border-border hover:bg-muted/40'}`}>
                      <Checkbox checked={checked} className="mt-0.5 pointer-events-none" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {asset.brand} {asset.model ?? asset.deviceType}
                        </p>
                        <p className="text-xs text-muted-foreground">{asset.code} · SN: {asset.serialNumber}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
            {form.formState.errors.coveredAssetIds && (
              <p className="text-xs text-destructive mt-1">{form.formState.errors.coveredAssetIds.message}</p>
            )}
          </CardContent>
        </Card>

        {/* ── Remarks ───────────────────────────────────────── */}
        <Card>
          <CardHeader><CardTitle className="text-sm font-semibold">Remarks</CardTitle></CardHeader>
          <CardContent>
            <FormField control={form.control} name="remarks" render={({ field }) => (
              <FormItem>
                <FormControl><Textarea placeholder="Additional notes or remarks…" rows={3} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </CardContent>
        </Card>

        {/* ── Actions ───────────────────────────────────────── */}
        <div className="flex items-center justify-end gap-3">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>Cancel</Button>
          <Button type="submit" disabled={isLoading} className="gap-2 min-w-32">
            {isLoading && <Loader2 size={14} className="animate-spin" />}
            {initial ? 'Save Changes' : 'Create AMC'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
