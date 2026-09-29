/**
 * AssetForm Component
 * Sectore 360 — Shared form for Add/Edit asset
 * v2: Template selector, Asset Number, SmartCombobox dropdowns, DynamicAssetFields
 */
import { useEffect, useState } from 'react';
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
import { AlertBanner } from '@/components/shared/AlertBanner';
import { Spinner } from '@/components/shared/Spinner';
import { SmartCombobox } from '@/components/master/SmartCombobox';
import { DynamicAssetFields } from '@/components/asset/DynamicAssetFields';
import { AssetTemplateSelector } from '@/components/asset/AssetTemplateSelector';
import { assetService } from '@/services/assetService';
import { customerService } from '@/services/customerService';
import { masterDataService } from '@/services/masterDataService';
import type { AssetTemplate } from '@/services/assetTemplateService';
import type { Asset, AssetFormData, AssetCategory, Customer } from '@/types/customer';
import { cn } from '@/lib/utils';
import { Eye, EyeOff } from 'lucide-react';

/* ── Validation ──────────────────────────────────────────────── */
const schema = z.object({
  customerId:          z.string().min(1, 'Customer is required'),
  category:            z.string().min(1, 'Category is required'),
  deviceType:          z.string().min(1, 'Device type is required'),
  assetNumber:         z.string().optional(),
  brand:               z.string().optional(),
  model:               z.string().optional(),
  serialNumber:        z.string().min(1, 'Serial number is required'),
  serviceTag:          z.string().optional(),
  purchaseDate:        z.string().optional(),
  installationDate:    z.string().optional(),
  warrantyStart:       z.string().optional(),
  warrantyEnd:         z.string().optional(),
  vendor:              z.string().optional(),
  location:            z.string().optional(),
  floor:               z.string().optional(),
  department:          z.string().optional(),
  assignedUser:        z.string().optional(),
  ipAddress:           z.string().optional(),
  macAddress:          z.string().optional(),
  username:            z.string().optional(),
  password:            z.string().optional(),
  configurationNotes:  z.string().optional(),
  remarks:             z.string().optional(),
  status:              z.enum(['Active', 'Inactive', 'Under Maintenance', 'Retired']),
});

type FormValues = z.infer<typeof schema>;

interface AssetFormProps {
  asset?: Asset;
  defaultCustomerId?: string;
  onSubmit: (data: AssetFormData) => Promise<void>;
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

export function AssetForm({ asset, defaultCustomerId, onSubmit, onCancel, isLoading }: AssetFormProps) {
  const [customers,        setCustomers]        = useState<Customer[]>([]);
  const [categories,       setCategories]       = useState<string[]>([]);
  const [dupError,         setDupError]         = useState(false);
  const [showPassword,     setShowPassword]     = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<AssetCategory>(asset?.category ?? 'Computers');
  const [specs,            setSpecs]            = useState<Record<string, unknown>>(
    asset?.specifications ?? {}
  );

  // Load customers + categories from master data
  useEffect(() => {
    customerService.list(false).then(setCustomers);
    masterDataService.list('asset_category').then((items) =>
      setCategories(items.map((i) => i.value))
    ).catch(() => setCategories(['Computers', 'Laptops', 'Servers', 'Networking', 'Firewall', 'CCTV', 'NVR/DVR', 'Printer', 'UPS', 'Storage', 'Switch', 'Others']));
  }, []);

  const {
    register, handleSubmit, watch, setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: asset ? {
      customerId:         asset.customerId,
      category:           asset.category,
      deviceType:         asset.deviceType,
      assetNumber:        asset.assetNumber ?? '',
      brand:              asset.brand ?? '',
      model:              asset.model ?? '',
      serialNumber:       asset.serialNumber,
      serviceTag:         asset.serviceTag ?? '',
      purchaseDate:       asset.purchaseDate ?? '',
      installationDate:   asset.installationDate ?? '',
      warrantyStart:      asset.warrantyStart ?? '',
      warrantyEnd:        asset.warrantyEnd ?? '',
      vendor:             asset.vendor ?? '',
      location:           asset.location ?? '',
      floor:              asset.floor ?? '',
      department:         asset.department ?? '',
      assignedUser:       asset.assignedUser ?? '',
      ipAddress:          asset.ipAddress ?? '',
      macAddress:         asset.macAddress ?? '',
      username:           asset.username ?? '',
      password:           asset.password ?? '',
      configurationNotes: asset.configurationNotes ?? '',
      remarks:            asset.remarks ?? '',
      status:             asset.status,
    } : {
      customerId: defaultCustomerId ?? '',
      category:   'Computers',
      deviceType: 'Desktop',
      status:     'Active',
    },
  });

  const serial = watch('serialNumber');

  useEffect(() => {
    if (!serial || serial.length < 3) { setDupError(false); return; }
    const t = setTimeout(async () => {
      const dup = await assetService.checkDuplicateSerial(serial, asset?.id);
      setDupError(dup);
    }, 500);
    return () => clearTimeout(t);
  }, [serial, asset?.id]);

  const handleCategoryChange = (cat: string) => {
    setSelectedCategory(cat);
    setValue('category', cat);
    setValue('deviceType', cat);
    setSpecs({});
  };

  // Template auto-fill: populate brand/model/specs from selected template
  const handleTemplateSelect = (tpl: AssetTemplate) => {
    if (tpl.brand)    setValue('brand', tpl.brand);
    if (tpl.model)    setValue('model', tpl.model);
    if (tpl.category) {
      setSelectedCategory(tpl.category);
      setValue('category', tpl.category);
      setValue('deviceType', tpl.deviceType ?? tpl.category);
    }
    if (tpl.specifications && Object.keys(tpl.specifications).length > 0) {
      setSpecs(tpl.specifications);
    }
  };

  const onValid = (values: FormValues) => {
    if (dupError) return;
    onSubmit({ ...values, specifications: specs } as AssetFormData & { specifications: Record<string, unknown> });
  };

  return (
    <form onSubmit={handleSubmit(onValid)} className="flex flex-col gap-6" noValidate>
      {dupError && (
        <AlertBanner variant="error" title="Duplicate serial number" message="An asset with this serial number already exists." />
      )}

      {/* ── Template Selector ───────────────────────────────── */}
      {!asset && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Quick Fill from Template</CardTitle>
          </CardHeader>
          <CardContent>
            <AssetTemplateSelector
              onSelect={handleTemplateSelect}
            />
            <p className="text-xs text-muted-foreground mt-2">
              Optional — selecting a template fills Brand, Model and Specifications automatically.
            </p>
          </CardContent>
        </Card>
      )}

      {/* ── Basic Information ───────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Basic Information</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Customer */}
          <Field label="Customer" error={errors.customerId?.message} required className="md:col-span-2">
            <Select
              defaultValue={asset?.customerId ?? defaultCustomerId ?? ''}
              onValueChange={(v) => setValue('customerId', v)}
            >
              <SelectTrigger className={errors.customerId ? 'border-destructive' : ''}>
                <SelectValue placeholder="Select customer…" />
              </SelectTrigger>
              <SelectContent>
                {customers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.companyName} ({c.code})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          {/* Category */}
          <Field label="Asset Category" error={errors.category?.message} required>
            <Select
              defaultValue={selectedCategory}
              onValueChange={handleCategoryChange}
            >
              <SelectTrigger className={errors.category ? 'border-destructive' : ''}>
                <SelectValue placeholder="Select category…" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          {/* Asset Number — e.g. DESK-001, LAP-024 */}
          <Field label="Asset Number" error={errors.assetNumber?.message}>
            <Input placeholder="e.g. DESK-001, LAP-024" {...register('assetNumber')} />
          </Field>

          {/* Brand — SmartCombobox */}
          <Field label="Brand" error={errors.brand?.message}>
            <SmartCombobox
              masterType="brand"
              value={watch('brand') ?? ''}
              onChange={(v) => setValue('brand', v)}
              placeholder="Select or type brand…"
              filterByCategory={selectedCategory}
            />
          </Field>

          {/* Model — SmartCombobox */}
          <Field label="Model" error={errors.model?.message}>
            <SmartCombobox
              masterType="model"
              value={watch('model') ?? ''}
              onChange={(v) => setValue('model', v)}
              placeholder="Select or type model…"
            />
          </Field>

          {/* Serial Number */}
          <Field label="Serial Number" error={errors.serialNumber?.message} required>
            <Input
              placeholder="Manufacturer serial number"
              {...register('serialNumber')}
              className={dupError ? 'border-destructive' : ''}
            />
          </Field>

          {/* Assigned User */}
          <Field label="Assigned User">
            <Input placeholder="Person using this asset" {...register('assignedUser')} />
          </Field>

          {/* Status */}
          <Field label="Status" error={errors.status?.message} required>
            <Select
              defaultValue={asset?.status ?? 'Active'}
              onValueChange={(v) => setValue('status', v as Asset['status'])}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Inactive">Inactive</SelectItem>
                <SelectItem value="Under Maintenance">Under Maintenance</SelectItem>
                <SelectItem value="Retired">Retired</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </CardContent>
      </Card>

      {/* ── Purchase & Warranty ─────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Purchase & Warranty</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Purchase Date"><Input type="date" {...register('purchaseDate')} /></Field>
          <Field label="Installation Date"><Input type="date" {...register('installationDate')} /></Field>
          <Field label="Warranty Start"><Input type="date" {...register('warrantyStart')} /></Field>
          <Field label="Warranty End"><Input type="date" {...register('warrantyEnd')} /></Field>
          {/* Vendor — SmartCombobox */}
          <Field label="Vendor / Supplier" className="md:col-span-2">
            <SmartCombobox
              masterType="vendor"
              value={watch('vendor') ?? ''}
              onChange={(v) => setValue('vendor', v)}
              placeholder="Select or type vendor…"
            />
          </Field>
        </CardContent>
      </Card>

      {/* ── Location ───────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Location</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="Location / Site">
            <SmartCombobox
              masterType="location"
              value={watch('location') ?? ''}
              onChange={(v) => setValue('location', v)}
              placeholder="Select or type location…"
            />
          </Field>
          <Field label="Floor / Area">
            <SmartCombobox
              masterType="floor"
              value={watch('floor') ?? ''}
              onChange={(v) => setValue('floor', v)}
              placeholder="Select or type floor…"
            />
          </Field>
          <Field label="Department">
            <SmartCombobox
              masterType="department"
              value={watch('department') ?? ''}
              onChange={(v) => setValue('department', v)}
              placeholder="Select or type dept…"
            />
          </Field>
        </CardContent>
      </Card>

      {/* ── Network & Access ───────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Network & Access</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="IP Address"><Input placeholder="e.g. 192.168.1.10" {...register('ipAddress')} /></Field>
          <Field label="MAC Address"><Input placeholder="e.g. 00:1A:2B:3C:4D:5E" {...register('macAddress')} /></Field>
          <Field label="Username"><Input placeholder="Admin username" {...register('username')} /></Field>
          <Field label="Password">
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                className="pr-10"
                {...register('password')}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </Field>
        </CardContent>
      </Card>

      {/* ── Dynamic Category-Specific Fields ───────────────── */}
      <DynamicAssetFields
        category={selectedCategory}
        specs={specs}
        onChange={setSpecs}
      />

      {/* ── Notes ─────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Notes & Remarks</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Field label="Configuration Notes">
            <Textarea placeholder="Network settings, software, config details…" rows={3} {...register('configurationNotes')} />
          </Field>
          <Field label="Remarks">
            <Textarea placeholder="Additional remarks" rows={2} {...register('remarks')} />
          </Field>
        </CardContent>
      </Card>

      <Separator />

      <div className="flex items-center gap-3 justify-end">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>Cancel</Button>
        <Button type="submit" disabled={isLoading || dupError} className="min-w-[120px]">
          {isLoading ? <Spinner size="sm" /> : asset ? 'Save Changes' : 'Create Asset'}
        </Button>
      </div>
    </form>
  );
}
