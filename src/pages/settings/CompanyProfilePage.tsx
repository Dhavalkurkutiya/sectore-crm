/**
 * Company Profile Settings Page
 * Sectore 360 — Admin-only. Edit all company branding & contact info.
 * Path: /settings/company-profile
 */
import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { companyProfileService, type CompanyProfile } from '@/services/companyProfileService';
import { SectoreLogo } from '@/components/brand/SectoreLogo';
import {
  Upload, Trash2, Save, RefreshCw, Eye,
  Phone, MapPin, Globe, Briefcase, Image, CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/* ── Validation ─────────────────────────────────────────────── */
const schema = z.object({
  name:           z.string().min(2, 'Company name required'),
  tagline:        z.string().min(2, 'Tagline required'),
  businessLine:   z.string().min(2, 'Business line required'),
  footerText:     z.string().min(2, 'Footer text required'),
  address:        z.string().min(5, 'Address required'),
  contactPerson:  z.string().min(2, 'Contact person required'),
  primaryPhone:   z.string().min(10, 'Primary phone required'),
  secondaryPhone: z.string().optional().or(z.literal('')),
  supportEmail:   z.string().email('Valid email required'),
  emergencyPhone: z.string().min(10, 'Emergency phone required'),
  website:        z.string().url('Valid URL').optional().or(z.literal('')),
  gst:            z.string().optional().or(z.literal('')),
  workingHours:   z.string().optional().or(z.literal('')),
});
type FormValues = z.infer<typeof schema>;

/* ── Section wrapper ────────────────────────────────────────── */
function Section({ icon: Icon, title, children }: {
  icon: React.ElementType; title: string; children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="pb-2 pt-4">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Icon size={14} className="text-primary" />{title}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 pb-4">{children}</CardContent>
    </Card>
  );
}

/* ── Two-column row ─────────────────────────────────────────── */
function Row({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>;
}

export default function CompanyProfilePage() {
  const [profile, setProfile]         = useState<CompanyProfile>(companyProfileService.get());
  const [logoPreview, setLogoPreview] = useState<string | null>(profile.logoDataUrl);
  const [logoMeta, setLogoMeta]       = useState<{ name: string; sizeKB: number } | null>(null);
  const [faviconPreview, setFaviconPreview] = useState<string | null>(profile.faviconDataUrl ?? null);
  const [faviconMeta, setFaviconMeta] = useState<{ name: string; sizeKB: number } | null>(null);
  const [dragging, setDragging]       = useState(false);
  const [favDragging, setFavDragging] = useState(false);
  const [saving, setSaving]           = useState(false);
  const fileInputRef                  = useRef<HTMLInputElement>(null);
  const favInputRef                   = useRef<HTMLInputElement>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name:           profile.name,
      tagline:        profile.tagline,
      businessLine:   profile.businessLine,
      footerText:     profile.footerText,
      address:        profile.address,
      contactPerson:  profile.contactPerson,
      primaryPhone:   profile.primaryPhone,
      secondaryPhone: profile.secondaryPhone,
      supportEmail:   profile.supportEmail,
      emergencyPhone: profile.emergencyPhone,
      website:        profile.website,
      gst:            profile.gst,
      workingHours:   profile.workingHours,
    },
  });

  useEffect(() => {
    return companyProfileService.subscribe((p) => setProfile(p));
  }, []);

  /* ── Logo upload ─────────────────────────────────────────── */
  function processFile(file: File) {
    const maxMB = 2;
    if (file.size > maxMB * 1024 * 1024) { toast.error(`Logo must be under ${maxMB} MB`); return; }
    if (!['image/svg+xml', 'image/png', 'image/jpeg'].includes(file.type)) {
      toast.error('Supported formats: SVG, PNG, JPEG'); return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setLogoPreview(dataUrl);
      setLogoMeta({ name: file.name, sizeKB: Math.round(file.size / 1024) });
      companyProfileService.update({ logoDataUrl: dataUrl });
      toast.success('Logo uploaded successfully');
    };
    reader.readAsDataURL(file);
  }

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  }

  function handleRemoveLogo() {
    setLogoPreview(null);
    setLogoMeta(null);
    companyProfileService.update({ logoDataUrl: null });
    if (fileInputRef.current) fileInputRef.current.value = '';
    toast.success('Logo removed — default logo restored');
  }

  /* ── Favicon helpers ─────────────────────────────────────── */
  function processFavicon(file: File) {
    const maxKB = 512;
    if (file.size > maxKB * 1024) { toast.error(`Favicon must be under ${maxKB} KB`); return; }
    if (!['image/x-icon', 'image/png', 'image/svg+xml'].includes(file.type)) {
      toast.error('Supported formats: ICO, PNG, SVG'); return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setFaviconPreview(dataUrl);
      setFaviconMeta({ name: file.name, sizeKB: Math.round(file.size / 1024) });
      companyProfileService.update({ faviconDataUrl: dataUrl });
      // Apply favicon to browser tab immediately
      const link = (document.querySelector("link[rel~='icon']") as HTMLLinkElement)
        ?? Object.assign(document.createElement('link'), { rel: 'icon' });
      link.href = dataUrl;
      document.head.appendChild(link);
      toast.success('Favicon uploaded successfully');
    };
    reader.readAsDataURL(file);
  }

  function handleFaviconChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processFavicon(file);
  }

  function handleFaviconDrop(e: React.DragEvent) {
    e.preventDefault();
    setFavDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFavicon(file);
  }

  function handleRemoveFavicon() {
    setFaviconPreview(null);
    setFaviconMeta(null);
    companyProfileService.update({ faviconDataUrl: null });
    if (favInputRef.current) favInputRef.current.value = '';
    toast.success('Favicon removed');
  }

  /* ── Save ────────────────────────────────────────────────── */
  async function onSubmit(values: FormValues) {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 300));
    companyProfileService.update({
      ...values,
      secondaryPhone: values.secondaryPhone ?? '',
      website:        values.website ?? '',
      gst:            values.gst ?? '',
      workingHours:   values.workingHours ?? '',
    });
    setSaving(false);
    toast.success('Company profile saved successfully');
  }

  async function handleReset() {
    const def = await companyProfileService.reset();
    setLogoPreview(def.logoDataUrl);
    setFaviconPreview(def.faviconDataUrl ?? null);
    form.reset({
      name:           def.name,
      tagline:        def.tagline,
      businessLine:   def.businessLine,
      footerText:     def.footerText,
      address:        def.address,
      contactPerson:  def.contactPerson,
      primaryPhone:   def.primaryPhone,
      secondaryPhone: def.secondaryPhone,
      supportEmail:   def.supportEmail,
      emergencyPhone: def.emergencyPhone,
      website:        def.website,
      gst:            def.gst,
      workingHours:   def.workingHours,
    });
    toast.success('Reset to default values');
  }

  return (
    <DashboardLayout>
      <PageHeader
        title="Company Profile"
        description="Manage your company branding, contact info, and footer details used across all portals."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Settings',  href: '/settings' },
          { label: 'Company Profile' },
        ]}
      />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4 max-w-3xl pb-8">

          {/* ── Logo Upload ───────────────────────────────── */}
          <Section icon={Image} title="Company Logo">
            {/* Drag-and-drop zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                'relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed cursor-pointer transition-all min-h-[160px] px-6 py-8',
                dragging
                  ? 'border-primary bg-primary/10 scale-[1.01]'
                  : logoPreview
                    ? 'border-primary/40 bg-primary/5 hover:bg-primary/10'
                    : 'border-border bg-muted/30 hover:border-primary/50 hover:bg-muted/50',
              )}
            >
              {logoPreview ? (
                /* ── Has logo ── */
                <div className="flex flex-col sm:flex-row items-center gap-4 w-full">
                  <div className="w-20 h-20 rounded-lg border border-border bg-white flex items-center justify-center shrink-0 overflow-hidden shadow-sm">
                    <img src={logoPreview} alt="Company logo" className="w-full h-full object-contain p-2" />
                  </div>
                  <div className="flex flex-col gap-1 text-center sm:text-left">
                    <div className="flex items-center gap-1.5 justify-center sm:justify-start">
                      <CheckCircle2 size={14} className="text-primary" />
                      <span className="text-sm font-semibold text-foreground">Logo uploaded</span>
                    </div>
                    {logoMeta && (
                      <p className="text-xs text-muted-foreground">{logoMeta.name} · {logoMeta.sizeKB} KB</p>
                    )}
                    <p className="text-xs text-muted-foreground">Click or drag to replace</p>
                  </div>
                </div>
              ) : (
                /* ── No logo ── */
                <div className="flex flex-col items-center gap-3 text-center pointer-events-none">
                  <div className="w-14 h-14 rounded-full bg-muted border border-border flex items-center justify-center">
                    <Upload size={22} className="text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {dragging ? 'Drop your logo here' : 'Drag & drop or click to upload'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">SVG, PNG, JPEG — max 2 MB</p>
                  </div>
                  {/* Default logo preview */}
                  <div className="mt-1 flex flex-col items-center gap-1 opacity-50">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Current default</p>
                    <SectoreLogo variant="full" size={28} />
                  </div>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              <Button type="button" variant="outline" size="sm" className="gap-2"
                onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                <Upload size={13} />
                {logoPreview ? 'Replace Logo' : 'Upload Logo'}
              </Button>
              {logoPreview && (
                <Button type="button" variant="outline" size="sm"
                  className="gap-2 text-destructive border-destructive/30 hover:bg-destructive/5"
                  onClick={handleRemoveLogo}>
                  <Trash2 size={13} />Remove
                </Button>
              )}
              <span className="text-xs text-muted-foreground">Recommended: horizontal PNG (3993×743 or similar). Aspect ratio preserved.</span>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".svg,.png,.jpg,.jpeg"
              className="hidden"
              onChange={handleLogoChange}
            />
          </Section>

          {/* ── Favicon ───────────────────────────────────── */}
          <Section icon={Image} title="Favicon">
            <div className="md:col-span-2">
              <p className="text-sm text-muted-foreground mb-3">
                Upload a square icon used as the browser tab favicon. Accepted: ICO, PNG, SVG (max 512 KB).
              </p>
              {/* Drag-and-drop zone */}
              <div
                className={cn(
                  'relative w-full rounded-xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center gap-3 py-6 px-4',
                  favDragging ? 'border-primary bg-primary/5 scale-[1.01]' : 'border-border hover:border-primary/60 hover:bg-muted/30',
                )}
                onDrop={handleFaviconDrop}
                onDragOver={(e) => { e.preventDefault(); setFavDragging(true); }}
                onDragLeave={() => setFavDragging(false)}
                onClick={() => favInputRef.current?.click()}
              >
                {faviconPreview ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-16 h-16 rounded-lg border border-border bg-background flex items-center justify-center overflow-hidden shadow">
                      <img src={faviconPreview} alt="Favicon" className="w-full h-full object-contain p-1" />
                    </div>
                    {faviconMeta && (
                      <p className="text-xs text-muted-foreground">{faviconMeta.name} · {faviconMeta.sizeKB} KB</p>
                    )}
                    <div className="flex items-center gap-1.5 text-xs text-success font-medium">
                      <CheckCircle2 size={13} />Favicon uploaded
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <div className="w-14 h-14 rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center bg-muted/20">
                      <Image size={22} className="text-muted-foreground/50" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-foreground">Drop favicon here</p>
                      <p className="text-xs text-muted-foreground">ICO · PNG · SVG — square format recommended</p>
                    </div>
                  </div>
                )}
                {favDragging && (
                  <div className="absolute inset-0 rounded-xl bg-primary/10 flex items-center justify-center">
                    <p className="text-sm font-semibold text-primary">Drop to upload</p>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap mt-3">
                <Button type="button" variant="outline" size="sm" className="gap-2"
                  onClick={(e) => { e.stopPropagation(); favInputRef.current?.click(); }}>
                  <Upload size={13} />
                  {faviconPreview ? 'Replace Favicon' : 'Upload Favicon'}
                </Button>
                {faviconPreview && (
                  <Button type="button" variant="outline" size="sm"
                    className="gap-2 text-destructive border-destructive/30 hover:bg-destructive/5"
                    onClick={handleRemoveFavicon}>
                    <Trash2 size={13} />Remove
                  </Button>
                )}
                <span className="text-xs text-muted-foreground">Used in browser tabs, bookmarks and mobile home screens.</span>
              </div>

              <input
                ref={favInputRef}
                type="file"
                accept=".ico,.png,.svg"
                className="hidden"
                onChange={handleFaviconChange}
              />
            </div>
          </Section>

          {/* ── Branding ──────────────────────────────────── */}
          <Section icon={Briefcase} title="Branding">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel>Company Name <span className="text-destructive">*</span></FormLabel>
                <FormControl><Input {...field} placeholder="Sectore Tecknologies" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="tagline" render={({ field }) => (
              <FormItem>
                <FormLabel>Tagline <span className="text-destructive">*</span></FormLabel>
                <FormControl><Input {...field} placeholder="Securing Today. Powering Tomorrow." /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="businessLine" render={({ field }) => (
              <FormItem>
                <FormLabel>Business Line <span className="text-destructive">*</span></FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Computers • Servers • Storage • CCTV • Networking" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="footerText" render={({ field }) => (
              <FormItem>
                <FormLabel>Footer Text <span className="text-destructive">*</span></FormLabel>
                <FormControl><Input {...field} placeholder="Design • Deploy • Secure • Support" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </Section>

          {/* ── Office Address ────────────────────────────── */}
          <Section icon={MapPin} title="Office Address">
            <FormField control={form.control} name="address" render={({ field }) => (
              <FormItem>
                <FormLabel>Full Address <span className="text-destructive">*</span></FormLabel>
                <FormControl>
                  <Textarea {...field} rows={4} className="resize-none"
                    placeholder="Street, City, State – PIN" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </Section>

          {/* ── Contact ───────────────────────────────────── */}
          <Section icon={Phone} title="Contact Information">
            <FormField control={form.control} name="contactPerson" render={({ field }) => (
              <FormItem>
                <FormLabel>Contact Person <span className="text-destructive">*</span></FormLabel>
                <FormControl><Input {...field} placeholder="Name" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <Row>
              <FormField control={form.control} name="primaryPhone" render={({ field }) => (
                <FormItem>
                  <FormLabel>Primary Number <span className="text-destructive">*</span></FormLabel>
                  <FormControl><Input {...field} placeholder="9019987991" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="secondaryPhone" render={({ field }) => (
                <FormItem>
                  <FormLabel>Secondary Number</FormLabel>
                  <FormControl><Input {...field} placeholder="8490000273" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </Row>
            <Row>
              <FormField control={form.control} name="supportEmail" render={({ field }) => (
                <FormItem>
                  <FormLabel>Support Email <span className="text-destructive">*</span></FormLabel>
                  <FormControl><Input {...field} type="email" placeholder="support@company.com" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="emergencyPhone" render={({ field }) => (
                <FormItem>
                  <FormLabel>Emergency Support <span className="text-destructive">*</span></FormLabel>
                  <FormControl><Input {...field} placeholder="9019987991" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </Row>
          </Section>

          {/* ── Optional ──────────────────────────────────── */}
          <Section icon={Globe} title="Optional Information">
            <Row>
              <FormField control={form.control} name="website" render={({ field }) => (
                <FormItem>
                  <FormLabel>Website</FormLabel>
                  <FormControl><Input {...field} placeholder="https://sectoretecknologies.com" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="gst" render={({ field }) => (
                <FormItem>
                  <FormLabel>GST Number</FormLabel>
                  <FormControl><Input {...field} placeholder="22AAAAA0000A1Z5" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </Row>
            <FormField control={form.control} name="workingHours" render={({ field }) => (
              <FormItem>
                <FormLabel>Working Hours</FormLabel>
                <FormControl><Input {...field} placeholder="Mon–Sat: 9 AM – 7 PM" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </Section>

          {/* ── Live Preview ──────────────────────────────── */}
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Eye size={14} className="text-primary" />Report Footer Preview
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-0.5">
              {logoPreview
                ? <img src={logoPreview} alt="" className="h-10 object-contain mx-auto mb-2" />
                : <SectoreLogo variant="icon" size={32} className="mx-auto mb-2 opacity-60" />}
              <p className="font-semibold text-sm">{form.watch('name') || profile.name}</p>
              <p className="text-xs text-muted-foreground">{form.watch('tagline') || profile.tagline}</p>
              <p className="text-xs text-muted-foreground">{form.watch('businessLine') || profile.businessLine}</p>
              <p className="text-xs text-muted-foreground">{form.watch('footerText') || profile.footerText}</p>
            </CardContent>
          </Card>

          {/* ── Actions ───────────────────────────────────── */}
          <div className="flex items-center gap-3 pt-2">
            <Button type="submit" disabled={saving} className="gap-2 h-10">
              <Save size={15} />{saving ? 'Saving…' : 'Save Profile'}
            </Button>
            <Button type="button" variant="outline" className="gap-2 h-10" onClick={handleReset}>
              <RefreshCw size={15} />Reset to Default
            </Button>
          </div>

        </form>
      </Form>
    </DashboardLayout>
  );
}
