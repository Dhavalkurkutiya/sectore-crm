/**
 * QuickAssetModal
 * Sectore 360 — Service Request Workflow
 *
 * Dialog for quick asset creation under an already-selected customer,
 * without leaving the Service Request page.
 * Categories and device types are loaded from catalogService.
 */
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  Form, FormField, FormItem, FormLabel, FormControl, FormMessage,
} from '@/components/ui/form';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/shared/Spinner';
import { catalogService } from '@/services/catalogService';
import { assetService } from '@/services/assetService';
import type { ManagedCategory, ManagedDeviceType } from '@/types/catalog';
import type { Asset } from '@/types/customer';
import { Server } from 'lucide-react';

const schema = z.object({
  categoryId:       z.string().min(1, 'Category is required'),
  deviceTypeId:     z.string().min(1, 'Device type is required'),
  brand:            z.string().optional(),
  model:            z.string().optional(),
  serialNumber:     z.string().min(1, 'Serial number is required'),
  location:         z.string().optional(),
  department:       z.string().optional(),
  remarks:          z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface QuickAssetModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
  customerName: string;
  onCreated: (asset: Asset) => void;
  createdBy: string;
}

export function QuickAssetModal({
  open, onOpenChange, customerId, customerName, onCreated, createdBy,
}: QuickAssetModalProps) {
  const [saving, setSaving]           = useState(false);
  const [categories, setCategories]   = useState<ManagedCategory[]>([]);
  const [deviceTypes, setDeviceTypes] = useState<ManagedDeviceType[]>([]);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      categoryId: '', deviceTypeId: '', brand: '', model: '',
      serialNumber: '', location: '', department: '', remarks: '',
    },
  });

  const selectedCategoryId = form.watch('categoryId');

  // Load categories once
  useEffect(() => {
    catalogService.getCategories(true).then(setCategories);
  }, []);

  // Load device types when category changes
  useEffect(() => {
    if (!selectedCategoryId) { setDeviceTypes([]); return; }
    catalogService.getDeviceTypes(selectedCategoryId, true).then(setDeviceTypes);
    form.setValue('deviceTypeId', '');
  }, [selectedCategoryId, form]);

  async function handleSave(values: FormValues) {
    setSaving(true);
    try {
      // Resolve names from IDs
      const category   = categories.find((c) => c.id === values.categoryId);
      const deviceType = deviceTypes.find((d) => d.id === values.deviceTypeId);
      if (!category || !deviceType) {
        toast.error('Invalid category or device type selection.');
        setSaving(false);
        return;
      }

      const asset = await assetService.create(
        {
          customerId:   customerId,
          category:     category.name,
          deviceType:   deviceType.name,
          brand:        values.brand || undefined,
          model:        values.model || undefined,
          serialNumber: values.serialNumber,
          location:     values.location || undefined,
          department:   values.department || undefined,
          remarks:      values.remarks || undefined,
          status:       'Active',
        },
        createdBy,
      );
      toast.success(`Asset "${asset.code}" created and linked to ${customerName}.`);
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
    <Dialog
      open={open}
      onOpenChange={(v) => { if (!saving) { form.reset(); onOpenChange(v); } }}
    >
      <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Server size={16} className="text-primary" />
            Quick Asset Creation
          </DialogTitle>
          <DialogDescription className="text-xs">
            Adding asset under <span className="font-medium">{customerName}</span>.
            You can add full details from the Asset module later.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSave)} className="flex flex-col gap-4 py-2">

            {/* Category + Device Type */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                        <SelectValue placeholder={!selectedCategoryId ? 'Select category first' : 'Select device type'} />
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

            {/* Brand + Model */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField control={form.control} name="brand" render={({ field }) => (
                <FormItem>
                  <FormLabel>Brand</FormLabel>
                  <FormControl><Input {...field} placeholder="e.g. Dell, HP, Cisco" className="px-3" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="model" render={({ field }) => (
                <FormItem>
                  <FormLabel>Model</FormLabel>
                  <FormControl><Input {...field} placeholder="e.g. OptiPlex 7090" className="px-3" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            {/* Serial Number */}
            <FormField control={form.control} name="serialNumber" render={({ field }) => (
              <FormItem>
                <FormLabel>Serial Number <span className="text-destructive">*</span></FormLabel>
                <FormControl><Input {...field} placeholder="e.g. DELL-OPT-SN-12345" className="px-3 font-mono" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            {/* Location + Department */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField control={form.control} name="location" render={({ field }) => (
                <FormItem>
                  <FormLabel>Installed Location</FormLabel>
                  <FormControl><Input {...field} placeholder="e.g. Server Room, 2nd Floor" className="px-3" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="department" render={({ field }) => (
                <FormItem>
                  <FormLabel>Department</FormLabel>
                  <FormControl><Input {...field} placeholder="e.g. IT, Admin, Finance" className="px-3" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            {/* Remarks */}
            <FormField control={form.control} name="remarks" render={({ field }) => (
              <FormItem>
                <FormLabel>Remarks</FormLabel>
                <FormControl>
                  <Textarea {...field} placeholder="Any additional notes…" rows={2} className="px-3 resize-none" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <DialogFooter className="flex-row gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                disabled={saving}
                onClick={() => { form.reset(); onOpenChange(false); }}
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1 gap-2" disabled={saving}>
                {saving ? <><Spinner size="sm" /><span>Saving…</span></> : 'Save & Continue'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
