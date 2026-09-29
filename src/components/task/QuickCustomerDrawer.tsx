/**
 * QuickCustomerDrawer
 * Sectore 360 — Service Request Workflow
 *
 * Right-side Sheet for quick customer creation without leaving the
 * Service Request page. On "Save & Continue" it creates the customer
 * and passes it back via onCreated().
 *
 * Fields: Company, Contact, Mobile, Email, Address, Google Maps Link,
 *         Lead Source (replaces Customer Type), AMC Status, Notes
 */
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter,
} from '@/components/ui/sheet';
import {
  Form, FormField, FormItem, FormLabel, FormControl, FormMessage,
} from '@/components/ui/form';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/shared/Spinner';
import { customerService } from '@/services/customerService';
import { LEAD_SOURCES, AMC_STATUSES } from '@/types/customer';
import type { Customer } from '@/types/customer';
import { UserPlus } from 'lucide-react';

const schema = z.object({
  companyName:   z.string().min(2, 'Company name is required'),
  contactPerson: z.string().min(2, 'Contact person is required'),
  primaryMobile: z.string().min(10, 'Valid mobile number required').max(15),
  email:         z.string().email('Valid email required').or(z.literal('')).optional(),
  address:       z.string().min(5, 'Address is required'),
  googleMapLink: z.string().url('Enter a valid URL').or(z.literal('')).optional(),
  leadSource:    z.string().min(1, 'Lead source is required'),
  amcStatus:     z.string().optional(),
  notes:         z.string().optional(),
  // Optional extended fields
  secondaryMobile: z.string().optional(),
  city:            z.string().optional(),
  state:           z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface QuickCustomerDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (customer: Customer) => void;
  createdBy: string;
}

export function QuickCustomerDrawer({
  open, onOpenChange, onCreated, createdBy,
}: QuickCustomerDrawerProps) {
  const [saving, setSaving] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      companyName: '', contactPerson: '', primaryMobile: '',
      email: '', address: '', googleMapLink: '',
      leadSource: '', amcStatus: 'No AMC', notes: '',
      secondaryMobile: '', city: '', state: '',
    },
  });

  async function handleSave(values: FormValues) {
    setSaving(true);
    try {
      const isDup = await customerService.checkDuplicateName(values.companyName);
      if (isDup) {
        form.setError('companyName', { message: 'A customer with this name already exists.' });
        setSaving(false);
        return;
      }
      const customer = await customerService.create(
        {
          companyName:     values.companyName,
          contactPerson:   values.contactPerson,
          primaryMobile:   values.primaryMobile,
          secondaryMobile: values.secondaryMobile || undefined,
          email:           values.email || '',
          address:         values.address,
          city:            values.city || '',
          state:           values.state || '',
          country:         'India',
          pincode:         '',
          googleMapLink:   values.googleMapLink || undefined,
          // backward-compat: derive customerType from amcStatus
          customerType:    values.amcStatus === 'Active AMC' ? 'AMC' : 'Call Based',
          leadSource:      values.leadSource as Customer['leadSource'],
          amcStatus:       (values.amcStatus || 'No AMC') as Customer['amcStatus'],
          notes:           values.notes || undefined,
          status:          'Active',
        },
        createdBy,
      );
      toast.success(`Customer "${customer.companyName}" created successfully.`);
      form.reset();
      onCreated(customer);
      onOpenChange(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      toast.error(`Failed to create customer: ${msg}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!saving) { form.reset(); onOpenChange(v); } }}>
      <SheetContent side="right" className="w-full sm:max-w-lg flex flex-col p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border shrink-0">
          <SheetTitle className="flex items-center gap-2 text-base">
            <UserPlus size={16} className="text-primary" />
            New Customer
          </SheetTitle>
          <SheetDescription className="text-sm">
            Fill in the essentials. Full profile can be completed later from the Customers module.
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSave)}
            className="flex flex-col flex-1 overflow-hidden"
          >
            <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-5">

              {/* Core identity */}
              <div className="flex flex-col gap-4">
                <FormField control={form.control} name="companyName" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">
                      Company Name <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g. TechCorp Solutions Pvt Ltd" className="px-3 h-11 text-sm" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="contactPerson" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">
                        Contact Person <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g. Rajesh Sharma" className="px-3 h-11 text-sm" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="primaryMobile" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">
                        Mobile <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input {...field} type="tel" placeholder="10-digit mobile" className="px-3 h-11 text-sm" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Email</FormLabel>
                    <FormControl>
                      <Input {...field} type="email" placeholder="contact@company.com" className="px-3 h-11 text-sm" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="address" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">
                      Address <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Full address" rows={2} className="px-3 text-sm resize-none" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="googleMapLink" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Google Maps Link</FormLabel>
                    <FormControl>
                      <Input {...field} type="url" placeholder="https://maps.google.com/…" className="px-3 h-11 text-sm" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <Separator />

              {/* Lead Source + AMC Status */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="leadSource" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">
                      Lead Source <span className="text-destructive">*</span>
                    </FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="h-11 text-sm">
                          <SelectValue placeholder="How did they find us?" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {LEAD_SOURCES.map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="amcStatus" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">AMC Status</FormLabel>
                    <Select value={field.value ?? 'No AMC'} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="h-11 text-sm">
                          <SelectValue placeholder="AMC status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {AMC_STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <Separator />

              {/* Optional extras */}
              <div className="flex flex-col gap-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Optional
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <FormField control={form.control} name="city" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">City</FormLabel>
                      <FormControl><Input {...field} placeholder="City" className="px-3 h-11 text-sm" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="state" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">State</FormLabel>
                      <FormControl><Input {...field} placeholder="State" className="px-3 h-11 text-sm" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <FormField control={form.control} name="secondaryMobile" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Alternate Mobile</FormLabel>
                    <FormControl>
                      <Input {...field} type="tel" placeholder="Alternate number" className="px-3 h-11 text-sm" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="notes" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Notes</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Any notes about this customer…" rows={3} className="px-3 text-sm resize-none" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            </div>

            <SheetFooter className="px-6 py-4 border-t border-border shrink-0 flex-row gap-3">
              <Button
                type="button"
                variant="outline"
                className="flex-1 h-11"
                disabled={saving}
                onClick={() => { form.reset(); onOpenChange(false); }}
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1 h-11 gap-2" disabled={saving}>
                {saving ? <><Spinner size="sm" /><span>Saving…</span></> : 'Save & Continue'}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
