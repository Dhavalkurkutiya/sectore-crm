/**
 * CustomerForm Component
 * Sectore 360 — Shared form for Add/Edit customer
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
import { customerService } from '@/services/customerService';
import type { Customer, CustomerFormData } from '@/types/customer';
import { CUSTOMER_CATEGORIES } from '@/types/customer';
import { cn } from '@/lib/utils';

/* ── Validation ──────────────────────────────────────────────── */
const schema = z.object({
  // Required
  companyName:   z.string().min(1, 'Company name is required'),
  customerType:  z.enum([
    'AMC', 'Call Based',
    'AMC Customer', 'Non-AMC Customer', 'Prospect',
    'One-Time Customer', 'Dealer / Partner', 'Internal',
  ]),
  primaryMobile: z.string().min(10, 'Valid mobile number required'),
  status:        z.enum(['Active', 'Inactive']),

  // Optional — validate only when provided
  contactPerson:   z.string().optional().or(z.literal('')),
  designation:     z.string().optional().or(z.literal('')),
  secondaryMobile: z.string().optional().or(z.literal('')),
  whatsappNumber:  z.string().optional().or(z.literal('')),
  email:           z.union([z.literal(''), z.string().email('Invalid email format')]).optional(),
  website:         z.union([z.literal(''), z.string().url('Invalid URL')]).optional(),
  gstNumber:       z.string().optional().or(z.literal('')),
  address:         z.string().optional().or(z.literal('')),
  city:            z.string().optional().or(z.literal('')),
  state:           z.string().optional().or(z.literal('')),
  country:         z.string().optional().or(z.literal('')),
  pincode:         z.string().optional().or(z.literal('')),
  googleMapLink:   z.union([z.literal(''), z.string().url('Invalid URL')]).optional(),
  latitude:        z.string().optional().or(z.literal('')),
  longitude:       z.string().optional().or(z.literal('')),
  notes:           z.string().optional().or(z.literal('')),
});

type FormValues = z.infer<typeof schema>;

interface CustomerFormProps {
  customer?: Customer;
  onSubmit: (data: CustomerFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

/* ── Reusable field wrapper ──────────────────────────────────── */
function Field({
  label, error, required, children, className,
}: {
  label: string; error?: string; required?: boolean;
  children: React.ReactNode; className?: string;
}) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <Label className="text-sm font-medium">
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

export function CustomerForm({ customer, onSubmit, onCancel, isLoading }: CustomerFormProps) {
  const [dupWarning, setDupWarning] = useState(false);

  const {
    register, handleSubmit, watch, setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: customer
      ? {
          companyName: customer.companyName,
          customerType: customer.customerType,
          contactPerson: customer.contactPerson,
          designation: customer.designation ?? '',
          primaryMobile: customer.primaryMobile,
          secondaryMobile: customer.secondaryMobile ?? '',
          whatsappNumber: customer.whatsappNumber ?? '',
          email: customer.email,
          website: customer.website ?? '',
          gstNumber: customer.gstNumber ?? '',
          address: customer.address,
          city: customer.city,
          state: customer.state,
          country: customer.country ?? 'India',
          pincode: customer.pincode,
          googleMapLink: customer.googleMapLink ?? '',
          latitude: customer.latitude != null ? String(customer.latitude) : '',
          longitude: customer.longitude != null ? String(customer.longitude) : '',
          notes: customer.notes ?? '',
          status: customer.status,
        }
      : { customerType: 'Non-AMC Customer' as const, status: 'Active' as const, country: 'India' },
  });

  const companyName = watch('companyName');

  // Duplicate check on blur
  useEffect(() => {
    if (!companyName || companyName.length < 2) { setDupWarning(false); return; }
    const t = setTimeout(async () => {
      const dup = await customerService.checkDuplicateName(companyName, customer?.id);
      setDupWarning(dup);
    }, 500);
    return () => clearTimeout(t);
  }, [companyName, customer?.id]);

  const onValid = (values: FormValues) => {
    const data: CustomerFormData = {
      ...values,
      latitude: values.latitude !== '' && values.latitude !== undefined ? parseFloat(values.latitude) : undefined,
      longitude: values.longitude !== '' && values.longitude !== undefined ? parseFloat(values.longitude) : undefined,
    } as CustomerFormData;
    return onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit(onValid)} className="flex flex-col gap-6" noValidate>
      {dupWarning && (
        <AlertBanner
          variant="warning"
          title="Duplicate company name"
          message="A customer with this company name already exists. You may still proceed."
          dismissible
        />
      )}

      {/* ── Basic Information ──────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Company Name" error={errors.companyName?.message} required className="md:col-span-2">
            <Input placeholder="e.g. Acme Corp Ltd" {...register('companyName')} />
          </Field>

          <Field label="Customer Category" error={errors.customerType?.message} required>
            <Select
              defaultValue={customer?.customerType ?? 'Non-AMC Customer'}
              onValueChange={(v) => setValue('customerType', v as FormValues['customerType'])}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CUSTOMER_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Status" error={errors.status?.message} required>
            <Select defaultValue={customer?.status ?? 'Active'} onValueChange={(v) => setValue('status', v as 'Active' | 'Inactive')}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <Field label="GST Number" error={errors.gstNumber?.message}>
            <Input placeholder="Optional" {...register('gstNumber')} />
          </Field>

          <Field label="Website" error={errors.website?.message}>
            <Input placeholder="https://example.com" {...register('website')} />
          </Field>
        </CardContent>
      </Card>

      {/* ── Contact ───────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Contact Information</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Contact Person" error={errors.contactPerson?.message}>
            <Input placeholder="Full name" {...register('contactPerson')} />
          </Field>
          <Field label="Designation" error={errors.designation?.message}>
            <Input placeholder="e.g. IT Manager" {...register('designation')} />
          </Field>
          <Field label="Primary Mobile" error={errors.primaryMobile?.message} required>
            <Input placeholder="10-digit mobile" {...register('primaryMobile')} />
          </Field>
          <Field label="Secondary Mobile" error={errors.secondaryMobile?.message}>
            <Input placeholder="Optional" {...register('secondaryMobile')} />
          </Field>
          <Field label="WhatsApp Number" error={errors.whatsappNumber?.message}>
            <Input placeholder="Optional" {...register('whatsappNumber')} />
          </Field>
          <Field label="Email" error={errors.email?.message}>
            <Input type="email" placeholder="contact@company.com (optional)" {...register('email')} />
          </Field>
        </CardContent>
      </Card>

      {/* ── Address ───────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Address & Location</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Address" error={errors.address?.message} className="md:col-span-2">
            <Textarea placeholder="Street address, area… (optional)" rows={2} {...register('address')} />
          </Field>
          <Field label="City" error={errors.city?.message}>
            <Input placeholder="e.g. Bangalore (optional)" {...register('city')} />
          </Field>
          <Field label="State" error={errors.state?.message}>
            <Input placeholder="e.g. Karnataka (optional)" {...register('state')} />
          </Field>
          <Field label="Country" error={errors.country?.message}>
            <Input placeholder="e.g. India" {...register('country')} />
          </Field>
          <Field label="Pincode" error={errors.pincode?.message}>
            <Input placeholder="6-digit pincode (optional)" {...register('pincode')} />
          </Field>
          <Field label="Google Map Link" error={errors.googleMapLink?.message} className="md:col-span-2">
            <Input placeholder="https://maps.google.com/..." {...register('googleMapLink')} />
          </Field>
          <Field label="Latitude" error={errors.latitude?.message}>
            <Input type="number" step="any" placeholder="e.g. 12.9716" {...register('latitude')} />
          </Field>
          <Field label="Longitude" error={errors.longitude?.message}>
            <Input type="number" step="any" placeholder="e.g. 77.5946" {...register('longitude')} />
          </Field>
        </CardContent>
      </Card>

      {/* ── Notes ─────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea placeholder="Internal notes about this customer…" rows={3} {...register('notes')} />
        </CardContent>
      </Card>

      <Separator />

      {/* ── Actions ───────────────────────────────────── */}
      <div className="flex items-center gap-3 justify-end">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading} className="min-w-[120px]">
          {isLoading ? <Spinner size="sm" /> : customer ? 'Save Changes' : 'Create Customer'}
        </Button>
      </div>
    </form>
  );
}
