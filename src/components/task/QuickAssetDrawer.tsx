/**
 * QuickAssetDrawer
 * Side Sheet for rapid asset creation during Service Request flow.
 * Sectore 360 — v2
 *
 * Fields: Category · Asset Number · Brand · Model · Serial Number ·
 *         Department · Location · Assigned User
 *
 * On save → auto-assigns to current customer → auto-selects in SmartAssetSelector
 */
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';
import {
  Form, FormField, FormItem, FormLabel, FormControl, FormMessage,
} from '@/components/ui/form';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/shared/Spinner';
import { catalogService } from '@/services/catalogService';
import { assetService } from '@/services/assetService';
import type { ManagedCategory, ManagedDeviceType } from '@/types/catalog';
import type { Asset } from '@/types/customer';
import { Server, PlusCircle } from 'lucide-react';

/* ── schema ────────────────────────────────────────────────────── */
const schema = z.object({
  categoryId:   z.string().min(1, 'Category is required'),
  deviceTypeId: z.string().min(1, 'Device type is required'),
  assetNumber:  z.string().optional(),
  brand:        z.string().optional(),
  model:        z.string().optional(),
  serialNumber: z.string().optional(),
  department:   z.string().optional(),
  location:     z.string().optional(),
  assignedUser: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

/* ── props ─────────────────────────────────────────────────────── */
export interface QuickAssetDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
  customerName: string;
  onCreated: (asset: Asset) => void;
  createdBy: string;
  /** optional pre-fill hint from search query */
  searchHint?: string;
}

export function QuickAssetDrawer({
  open, onOpenChange, customerId, customerName, onCreated, createdBy, searchHint,
}: QuickAssetDrawerProps) {
  const [saving,      setSaving]      = useState(false);
  const [categories,  setCategories]  = useState<ManagedCategory[]>([]);
  const [deviceTypes, setDeviceTypes] = useState<ManagedDeviceType[]>([]);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      categoryId: '', deviceTypeId: '', assetNumber: '',
      brand: '', model: '', serialNumber: '',
      department: '', location: '', assignedUser: '',
    },
  });

  const selectedCategoryId = form.watch('categoryId');

  /* Load categories once */
  useEffect(() => {
    catalogService.getCategories(true).then(setCategories).catch(() => {});
  }, []);

  /* Load device types on category change */
  useEffect(() => {
    if (!selectedCategoryId) { setDeviceTypes([]); return; }
    catalogService.getDeviceTypes(selectedCategoryId, true)
      .then(setDeviceTypes).catch(() => {});
    form.setValue('deviceTypeId', '');
  }, [selectedCategoryId, form]);

  /* Auto-fill brand/model hint from search query */
  useEffect(() => {
    if (open && searchHint && !form.getValues('brand')) {
      // best-effort: if hint looks like "Brand Model", split on first space
      const parts = searchHint.trim().split(' ');
      if (parts.length >= 2) {
        form.setValue('brand', parts[0]);
        form.setValue('model', parts.slice(1).join(' '));
      } else {
        form.setValue('brand', searchHint.trim());
      }
    }
  }, [open, searchHint, form]);

  async function handleSave(values: FormValues) {
    setSaving(true);
    try {
      const category   = categories.find((c) => c.id === values.categoryId);
      const deviceType = deviceTypes.find((d) => d.id === values.deviceTypeId);
      if (!category || !deviceType) {
        toast.error('Invalid category or device type.');
        setSaving(false);
        return;
      }
      const asset = await assetService.create(
        {
          customerId,
          category:     category.name,
          deviceType:   deviceType.name,
          assetNumber:  values.assetNumber  || undefined,
          brand:        values.brand        || undefined,
          model:        values.model        || undefined,
          serialNumber: values.serialNumber || '',
          department:   values.department   || undefined,
          location:     values.location     || undefined,
          assignedUser: values.assignedUser || undefined,
          status:       'Active',
        },
        createdBy,
      );
      toast.success(`Asset "${asset.assetNumber || asset.code}" created and linked to ${customerName}.`);
      form.reset();
      onCreated(asset);
      onOpenChange(false);
    } catch {
      toast.error('Failed to create asset. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(v) => { if (!saving) { form.reset(); onOpenChange(v); } }}
    >
      <SheetContent
        side="right"
        className="w-full max-w-md flex flex-col p-0 gap-0"
      >
        <SheetHeader className="px-6 py-5 border-b border-border bg-muted/30 shrink-0">
          <SheetTitle className="flex items-center gap-2 text-base">
            <PlusCircle size={16} className="text-primary" />
            Quick Asset Creation
          </SheetTitle>
          <SheetDescription className="text-xs">
            Creating asset under{' '}
            <span className="font-semibold text-foreground">{customerName}</span>.
            Full details can be added later from the Asset module.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <Form {...form}>
            <form
              id="quick-asset-form"
              onSubmit={form.handleSubmit(handleSave)}
              className="flex flex-col gap-5"
            >
              {/* ── Category + Device Type ── */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                  <Server size={11} /> Asset Classification
                </p>
                <div className="grid grid-cols-1 gap-4">
                  <FormField control={form.control} name="categoryId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category <span className="text-destructive">*</span></FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories.map((c) => (
                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="deviceTypeId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Device Type <span className="text-destructive">*</span></FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={!selectedCategoryId || deviceTypes.length === 0}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={
                              !selectedCategoryId ? 'Select category first' :
                              deviceTypes.length === 0 ? 'Loading…' : 'Select device type'
                            } />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {deviceTypes.map((d) => (
                            <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </div>

              <Separator />

              {/* ── Identity ── */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                  Asset Identity
                </p>
                <div className="grid grid-cols-1 gap-4">
                  <FormField control={form.control} name="assetNumber" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Asset Number</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="e.g. DESK-001, LAP-024, SRV-003"
                          className="px-3 font-mono"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <div className="grid grid-cols-2 gap-3">
                    <FormField control={form.control} name="brand" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Brand</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Dell, HP, Cisco…" className="px-3" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="model" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Model</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="OptiPlex 7090" className="px-3" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>

                  <FormField control={form.control} name="serialNumber" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Serial Number</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="e.g. SN-ABC123456"
                          className="px-3 font-mono"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </div>

              <Separator />

              {/* ── Location & Assignment ── */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                  Location &amp; Assignment
                </p>
                <div className="grid grid-cols-1 gap-4">
                  <div className="grid grid-cols-2 gap-3">
                    <FormField control={form.control} name="department" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Department</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="IT, Finance…" className="px-3" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="location" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Server Room, 2F" className="px-3" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                  <FormField control={form.control} name="assignedUser" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assigned User</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Person currently using this asset" className="px-3" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </div>
            </form>
          </Form>
        </div>

        {/* ── Footer actions ── */}
        <div className="shrink-0 border-t border-border px-6 py-4 bg-background flex gap-3">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            disabled={saving}
            onClick={() => { form.reset(); onOpenChange(false); }}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="quick-asset-form"
            className="flex-1 gap-2"
            disabled={saving}
          >
            {saving
              ? <><Spinner size="sm" /><span>Saving…</span></>
              : <><PlusCircle size={14} /> Save &amp; Select</>
            }
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
