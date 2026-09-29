/**
 * Raise Service Request Page
 * Sectore 360 — Part 6 Customer Portal
 */
import { useState, useEffect, useMemo } from 'react';
import type { Asset } from '@/types/customer';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { assetService } from '@/services/assetService';
import { taskService } from '@/services/taskService';
import { useAuth } from '@/contexts/AuthContext';
import { PlusCircle, ArrowLeft } from 'lucide-react';

const schema = z.object({
  assetId: z.string().min(1, 'Please select an asset'),
  issueDescription: z.string().min(10, 'Please describe the issue (min 10 characters)'),
  priority: z.enum(['Low', 'Medium', 'High'], { required_error: 'Select a priority' }),
  expectedVisitDate: z.string().optional(),
  contactPerson: z.string().min(2, 'Contact person required'),
  contactMobile: z.string().regex(/^[0-9]{10}$/, 'Enter valid 10-digit mobile'),
});
type FormData = z.infer<typeof schema>;

export default function RaiseRequestPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [assets, setAssets] = useState<Asset[]>([]);

  useEffect(() => {
    // Load only this customer's assets — never the full table
    if (!user?.customerId) { setAssets([]); return; }
    assetService.getByCustomer(user.customerId).then(setAssets).catch(() => setAssets([]));
  }, [user?.customerId]);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { contactPerson: user?.name ?? '', contactMobile: '' },
  });

  const onSubmit = async (data: FormData) => {
    try {
      const task = await taskService.create({
        customerId: user?.customerId ?? '',
        assetId: data.assetId,
        taskType: 'Breakdown Support',
        priority: data.priority as 'Low' | 'Medium' | 'High',
        issueDescription: data.issueDescription,
        expectedVisitDate: data.expectedVisitDate,
        status: 'Pending',
        engineerId: undefined,
        engineerName: undefined,
        amcId: undefined,
        internalNotes: '',
        contactPerson: data.contactPerson,
        contactMobile: data.contactMobile,
        createdBy: user?.name ?? 'Customer',
      }, user?.name ?? 'Customer');
      toast.success(`Service request created! Ticket: ${task.taskNumber}`);
      navigate('/customer/tickets');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      console.error('Ticket creation failed:', msg);
      toast.error(`Failed to submit request: ${msg}`);
    }
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-4 max-w-lg mx-auto pb-8">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" className="p-2" onClick={() => navigate('/customer/dashboard')}>
            <ArrowLeft size={16} />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <PlusCircle size={18} className="text-primary" /> Raise Service Request
            </h1>
            <p className="text-sm text-muted-foreground">Describe your issue and we'll send a technician</p>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm">Request Details</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
                <FormField control={form.control} name="assetId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Asset *</FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger><SelectValue placeholder="Select your asset" /></SelectTrigger>
                        <SelectContent>
                          {assets.map((a) => (
                            <SelectItem key={a.id} value={a.id}>
                              {a.code} — {a.deviceType}{a.brand ? ` · ${a.brand}` : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="issueDescription" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Issue Description *</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Describe the problem in detail…" rows={4} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="priority" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority *</FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger><SelectValue placeholder="Select priority" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Low">🟢 Low</SelectItem>
                          <SelectItem value="Medium">🟡 Medium</SelectItem>
                          <SelectItem value="High">🔴 High</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="expectedVisitDate" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preferred Visit Date (optional)</FormLabel>
                    <FormControl>
                      <Input type="date" min={new Date().toISOString().split('T')[0]} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="contactPerson" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Person *</FormLabel>
                      <FormControl><Input placeholder="Your name" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="contactMobile" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Mobile *</FormLabel>
                      <FormControl><Input placeholder="10-digit mobile" maxLength={10} {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <div className="flex gap-3 pt-2">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => navigate('/customer/dashboard')}>Cancel</Button>
                  <Button type="submit" className="flex-1" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? 'Submitting…' : 'Submit Request'}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
