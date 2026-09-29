/**
 * Customer Profile Page (Update Contact + Change Password)
 * Sectore 360 — Part 6 Customer Portal
 */
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User, Lock, CheckCircle2 } from 'lucide-react';

/* ── Contact form ───────────────────────────── */
const contactSchema = z.object({
  contactPerson: z.string().min(2, 'Name required'),
  mobile: z.string().regex(/^[0-9]{10}$/, 'Valid 10-digit mobile required'),
  email: z.string().email('Valid email required'),
  alternateMobile: z.string().regex(/^[0-9]{10}$/, 'Valid 10-digit mobile').or(z.literal('')).optional(),
});
type ContactData = z.infer<typeof contactSchema>;

/* ── Password form ───────────────────────────── */
const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password required'),
  newPassword: z.string().min(8, 'Minimum 8 characters'),
  confirmPassword: z.string(),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: 'Passwords do not match', path: ['confirmPassword'],
});
type PasswordData = z.infer<typeof passwordSchema>;

export default function CustomerProfilePage() {
  const { user, changePassword } = useAuth();
  const [contactSaved, setContactSaved] = useState(false);

  const contactForm = useForm<ContactData>({
    resolver: zodResolver(contactSchema),
    defaultValues: { contactPerson: user?.name ?? '', mobile: '', email: '', alternateMobile: '' },
  });

  const passwordForm = useForm<PasswordData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  const onContactSubmit = (data: ContactData) => {
    console.info('Contact update:', data);
    setContactSaved(true);
    toast.success('Contact information updated');
    setTimeout(() => setContactSaved(false), 3000);
  };

  const onPasswordSubmit = async (data: PasswordData) => {
    if (!user) return;
    const ok = await changePassword(user.id, data.currentPassword, data.newPassword);
    if (ok) passwordForm.reset();
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-4 max-w-lg mx-auto pb-8">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <User size={18} className="text-primary" /> My Profile
          </h1>
          <p className="text-sm text-muted-foreground">Manage your contact information and password</p>
        </div>

        {/* User info summary */}
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <User size={20} className="text-primary" />
            </div>
            <div className="flex flex-col">
              <p className="font-semibold text-foreground">{user?.name}</p>
              <p className="text-xs text-muted-foreground">@{user?.username}</p>
              <p className="text-xs text-muted-foreground capitalize">Role: {user?.role}</p>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="contact">
          <TabsList className="w-full">
            <TabsTrigger value="contact" className="flex-1">
              <User size={13} className="mr-1.5" />Contact Info
            </TabsTrigger>
            <TabsTrigger value="password" className="flex-1">
              <Lock size={13} className="mr-1.5" />Change Password
            </TabsTrigger>
          </TabsList>

          {/* Contact tab */}
          <TabsContent value="contact" className="mt-4">
            <Card>
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm font-semibold">Update Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <Form {...contactForm}>
                  <form onSubmit={contactForm.handleSubmit(onContactSubmit)} className="flex flex-col gap-4">
                    <FormField control={contactForm.control} name="contactPerson" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact Person *</FormLabel>
                        <FormControl><Input placeholder="Full name" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={contactForm.control} name="email" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email *</FormLabel>
                        <FormControl><Input type="email" placeholder="email@example.com" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={contactForm.control} name="mobile" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mobile *</FormLabel>
                        <FormControl><Input placeholder="10-digit mobile" maxLength={10} {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={contactForm.control} name="alternateMobile" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Alternate Mobile</FormLabel>
                        <FormControl><Input placeholder="Optional" maxLength={10} {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <Button type="submit" className="w-full">
                      {contactSaved ? <><CheckCircle2 size={14} className="mr-1.5" />Saved!</> : 'Save Changes'}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Password tab */}
          <TabsContent value="password" className="mt-4">
            <Card>
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm font-semibold">Change Password</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <Form {...passwordForm}>
                  <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="flex flex-col gap-4">
                    <FormField control={passwordForm.control} name="currentPassword" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Current Password *</FormLabel>
                        <FormControl><Input type="password" placeholder="Enter current password" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={passwordForm.control} name="newPassword" render={({ field }) => (
                      <FormItem>
                        <FormLabel>New Password *</FormLabel>
                        <FormControl><Input type="password" placeholder="Min 8 characters" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={passwordForm.control} name="confirmPassword" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm New Password *</FormLabel>
                        <FormControl><Input type="password" placeholder="Re-enter new password" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <p className="text-xs text-muted-foreground">You will be logged out after changing your password.</p>
                    <Button type="submit" className="w-full">Change Password</Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
