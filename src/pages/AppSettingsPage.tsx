/**
 * Application Settings Page
 * Sectore 360 — Part 6
 * Company profile, roles & permissions matrix, categories, status/priority, email templates.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { usePermissions } from '@/hooks/usePermissions';
import { rolePermissions } from '@/lib/permissions';
import type { RBACAction, RBACResource, UserRole } from '@/types/auth';
import { useBrandLogo } from '@/hooks/useBrandLogo';
import { companyProfileService } from '@/services/companyProfileService';
import {
  Building2, Shield, ListChecks, Tag, Mail, Image,
  PlusCircle, Pencil, Trash2, CheckCircle2, Layers, ChevronDown, ChevronRight,
} from 'lucide-react';
import { useEffect } from 'react';
import { catalogService } from '@/services/catalogService';
import type { ManagedCategory, ManagedDeviceType } from '@/types/catalog';

/* ── Types ───────────────────────────────────────────── */
interface Category { id: string; name: string; description: string; active: boolean; }
interface StatusOption { id: string; name: string; color: string; type: 'status' | 'priority'; }
interface EmailTemplate { id: string; name: string; subject: string; body: string; }
/* ── Initial data ────────────────────────────────────── */
const INIT_TASK_CATS: Category[] = [
  { id: 'tc1', name: 'Breakdown', description: 'Unplanned equipment failure', active: true },
  { id: 'tc2', name: 'Preventive Maintenance', description: 'Scheduled PM visits', active: true },
  { id: 'tc3', name: 'Installation', description: 'New equipment installation', active: true },
  { id: 'tc4', name: 'Warranty', description: 'Warranty service calls', active: true },
];
const INIT_ASSET_CATS: Category[] = [
  { id: 'ac1', name: 'HVAC', description: 'Heating, Ventilation & Air Conditioning', active: true },
  { id: 'ac2', name: 'Electrical', description: 'Electrical panels and wiring', active: true },
  { id: 'ac3', name: 'Networking', description: 'LAN, WAN, and wireless equipment', active: true },
  { id: 'ac4', name: 'Security', description: 'CCTV, access control, alarms', active: true },
];
const INIT_STATUS_OPTIONS: StatusOption[] = [
  { id: 'so1', name: 'Pending', color: '#F59E0B', type: 'status' },
  { id: 'so2', name: 'Working', color: '#3B82F6', type: 'status' },
  { id: 'so3', name: 'Completed', color: '#10B981', type: 'status' },
  { id: 'so4', name: 'Cancelled', color: '#EF4444', type: 'status' },
  { id: 'so5', name: 'Low', color: '#6B7280', type: 'priority' },
  { id: 'so6', name: 'Medium', color: '#F59E0B', type: 'priority' },
  { id: 'so7', name: 'High', color: '#EF4444', type: 'priority' },
  { id: 'so8', name: 'Emergency', color: '#7C3AED', type: 'priority' },
];
const INIT_TEMPLATES: EmailTemplate[] = [
  { id: 'et1', name: 'Task Assigned', subject: 'New Task Assigned — {{task_number}}', body: 'Dear {{engineer_name}},\n\nYou have been assigned task {{task_number}} for customer {{customer_name}}.\n\nPlease check your dashboard for details.\n\nRegards,\nSectore Tecknologies' },
  { id: 'et2', name: 'AMC Expiry', subject: 'AMC Contract Expiring — {{amc_number}}', body: 'Dear {{customer_name}},\n\nYour AMC contract {{amc_number}} is expiring on {{expiry_date}}.\n\nPlease contact us to renew.\n\nRegards,\nSectore Tecknologies' },
  { id: 'et3', name: 'Ticket Raised', subject: 'Service Request Received — {{ticket_number}}', body: 'Dear {{customer_name}},\n\nWe have received your service request {{ticket_number}}.\n\nOur team will contact you within 24 hours.\n\nRegards,\nSectore Tecknologies' },
  { id: 'et4', name: 'Welcome Email', subject: 'Welcome to Sectore 360', body: 'Dear {{user_name}},\n\nWelcome to Sectore 360!\n\nYour login credentials:\nEmail: {{email}}\nTemporary Password: {{temp_password}}\n\nPlease change your password on first login.\n\nRegards,\nSectore Tecknologies' },
];

/* ── Permission matrix resources/actions ─────────────── */
const MATRIX_ROLES: UserRole[] = ['superadmin','admin','manager','backoffice','engineer','customer'];
const MATRIX_RESOURCES: RBACResource[] = ['customers','assets','tasks','amc','engineers','reports','settings','audit_log','documents','users'];
const MATRIX_ACTIONS: RBACAction[] = ['view','create','edit','delete','export'];

/* ── Logo preview strip for Settings Company tab ─────────── */
function LogoPreviewStrip() {
  const { logoDataUrl, faviconDataUrl, companyName } = useBrandLogo();
  const p = companyProfileService.get();
  if (!logoDataUrl && !faviconDataUrl) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-dashed border-border bg-muted/30 px-4 py-3">
        <div className="w-10 h-10 rounded-md border-2 border-dashed border-muted-foreground/30 flex items-center justify-center shrink-0">
          <Image size={18} className="text-muted-foreground/40" />
        </div>
        <p className="text-xs text-muted-foreground italic">No logo uploaded yet — click the button below to add one.</p>
      </div>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-4 rounded-lg border border-border bg-muted/20 px-4 py-3">
      {logoDataUrl && (
        <div className="flex flex-col items-start gap-1">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Wide Logo</p>
          <div className="h-10 flex items-center bg-background rounded border border-border px-3 py-1">
            <img src={logoDataUrl} alt={p.name} style={{ maxHeight: 32, maxWidth: 180, width: 'auto', height: 'auto' }} className="object-contain" />
          </div>
        </div>
      )}
      {faviconDataUrl && (
        <div className="flex flex-col items-start gap-1">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Favicon / Icon</p>
          <div className="w-10 h-10 bg-background rounded border border-border flex items-center justify-center">
            <img src={faviconDataUrl} alt={companyName} className="w-8 h-8 object-contain" />
          </div>
        </div>
      )}
      <p className="text-xs text-success font-medium flex items-center gap-1 ml-auto">
        <CheckCircle2 size={13} /> Logo active across all portals
      </p>
    </div>
  );
}

function hasMatrixPerm(role: UserRole, resource: RBACResource, action: RBACAction): boolean {
  const permKey = resource === 'audit_log'
    ? (action === 'view' ? 'audit:view' : action === 'export' ? 'audit:export' : null)
    : `${resource}:${action}`;
  if (!permKey) return false;
  return (rolePermissions[role] as string[])?.includes(permKey) ?? false;
}

export default function AppSettingsPage() {
  const { isSuperAdmin } = usePermissions();
  const navigate = useNavigate();

  /* Categories state */
  const [taskCats, setTaskCats] = useState<Category[]>(INIT_TASK_CATS);
  const [assetCats, setAssetCats] = useState<Category[]>(INIT_ASSET_CATS);
  const [statusOptions, setStatusOptions] = useState<StatusOption[]>(INIT_STATUS_OPTIONS);
  const [templates, setTemplates] = useState<EmailTemplate[]>(INIT_TEMPLATES);

  /* ── Managed Asset Catalog state ─────────────────────── */
  const [catalogCats,    setCatalogCats]    = useState<ManagedCategory[]>([]);
  const [catalogDTs,     setCatalogDTs]     = useState<ManagedDeviceType[]>([]);
  const [expandedCatId,  setExpandedCatId]  = useState<string | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(false);

  // Dialogs for catalog
  const [catEditDialog, setCatEditDialog] = useState<{ open: boolean; editing?: ManagedCategory }>({ open: false });
  const [dtEditDialog,  setDtEditDialog]  = useState<{ open: boolean; categoryId?: string; categoryName?: string; editing?: ManagedDeviceType }>({ open: false });
  const [catNameVal, setCatNameVal]   = useState('');
  const [catDescVal, setCatDescVal]   = useState('');
  const [dtNameVal,  setDtNameVal]    = useState('');

  useEffect(() => {
    setCatalogLoading(true);
    Promise.all([
      catalogService.getCategories(false),
      catalogService.getDeviceTypes(undefined, false),
    ]).then(([cats, dts]) => {
      setCatalogCats(cats);
      setCatalogDTs(dts);
      setCatalogLoading(false);
    }).catch(() => setCatalogLoading(false));
  }, []);

  async function saveCatalogCat() {
    if (!catNameVal.trim()) { toast.error('Category name required'); return; }
    if (catEditDialog.editing) {
      const updated = await catalogService.updateCategory(catEditDialog.editing.id, { name: catNameVal, description: catDescVal });
      setCatalogCats((prev) => prev.map((c) => c.id === updated.id ? updated : c));
      toast.success('Category updated');
    } else {
      const created = await catalogService.createCategory({ name: catNameVal, description: catDescVal, sortOrder: catalogCats.length + 1, active: true });
      setCatalogCats((prev) => [...prev, created]);
      toast.success('Category created');
    }
    setCatEditDialog({ open: false });
  }

  async function deleteCatalogCat(id: string) {
    await catalogService.deleteCategory(id);
    setCatalogCats((prev) => prev.map((c) => c.id === id ? { ...c, active: false } : c));
    toast.success('Category deactivated');
  }

  async function saveCatalogDT() {
    if (!dtNameVal.trim() || !dtEditDialog.categoryId) { toast.error('Device type name required'); return; }
    const cat = catalogCats.find((c) => c.id === dtEditDialog.categoryId);
    if (!cat) return;
    if (dtEditDialog.editing) {
      const updated = await catalogService.updateDeviceType(dtEditDialog.editing.id, { name: dtNameVal });
      setCatalogDTs((prev) => prev.map((d) => d.id === updated.id ? updated : d));
      toast.success('Device type updated');
    } else {
      const created = await catalogService.createDeviceType({
        categoryId: dtEditDialog.categoryId, categoryName: cat.name, name: dtNameVal,
        active: true, sortOrder: catalogDTs.filter((d) => d.categoryId === dtEditDialog.categoryId).length + 1,
      });
      setCatalogDTs((prev) => [...prev, created]);
      toast.success('Device type created');
    }
    setDtEditDialog({ open: false });
  }

  async function toggleCatalogDT(id: string) {
    const updated = await catalogService.toggleDeviceType(id);
    setCatalogDTs((prev) => prev.map((d) => d.id === updated.id ? updated : d));
  }

  /* Dialogs */
  const [catDialog, setCatDialog] = useState<{ open: boolean; type: 'task' | 'asset'; editing?: Category } | null>(null);
  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');
  const [tplDialog, setTplDialog] = useState<EmailTemplate | null>(null);
  const [tplSubject, setTplSubject] = useState('');
  const [tplBody, setTplBody] = useState('');

  const openCatDialog = (type: 'task' | 'asset', editing?: Category) => {
    setCatName(editing?.name ?? '');
    setCatDesc(editing?.description ?? '');
    setCatDialog({ open: true, type, editing });
  };

  const saveCat = () => {
    if (!catName.trim()) { toast.error('Category name required'); return; }
    const setter = catDialog?.type === 'task' ? setTaskCats : setAssetCats;
    const list = catDialog?.type === 'task' ? taskCats : assetCats;
    if (catDialog?.editing) {
      setter(list.map((c) => c.id === catDialog.editing!.id ? { ...c, name: catName, description: catDesc } : c));
      toast.success('Category updated');
    } else {
      setter([...list, { id: `cat_${Date.now()}`, name: catName, description: catDesc, active: true }]);
      toast.success('Category created');
    }
    setCatDialog(null);
  };

  const toggleCat = (type: 'task' | 'asset', id: string) => {
    const setter = type === 'task' ? setTaskCats : setAssetCats;
    const list = type === 'task' ? taskCats : assetCats;
    setter(list.map((c) => c.id === id ? { ...c, active: !c.active } : c));
  };

  const deleteCat = (type: 'task' | 'asset', id: string) => {
    const setter = type === 'task' ? setTaskCats : setAssetCats;
    const list = type === 'task' ? taskCats : assetCats;
    setter(list.filter((c) => c.id !== id));
    toast.success('Category deleted');
  };

  const openTplDialog = (t: EmailTemplate) => { setTplDialog(t); setTplSubject(t.subject); setTplBody(t.body); };

  const saveTpl = () => {
    if (!tplDialog) return;
    setTemplates(templates.map((t) => t.id === tplDialog.id ? { ...t, subject: tplSubject, body: tplBody } : t));
    setTplDialog(null);
    toast.success('Template saved');
  };

  const CatList = ({ type, list }: { type: 'task' | 'asset'; list: Category[] }) => (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between mb-1">
        <p className="text-sm text-muted-foreground">{list.length} categories</p>
        <Button size="sm" variant="outline" onClick={() => openCatDialog(type)}>
          <PlusCircle size={13} className="mr-1.5" />Add
        </Button>
      </div>
      {list.map((c) => (
        <div key={c.id} className="flex items-center justify-between gap-3 py-2 border-b border-border last:border-0">
          <div className="flex flex-col gap-0.5 flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-foreground">{c.name}</p>
              {!c.active && <Badge variant="outline" className="text-xs">Inactive</Badge>}
            </div>
            {c.description && <p className="text-xs text-muted-foreground truncate">{c.description}</p>}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Switch checked={c.active} onCheckedChange={() => toggleCat(type, c.id)} />
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openCatDialog(type, c)}><Pencil size={13} /></Button>
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => deleteCat(type, c.id)}><Trash2 size={13} /></Button>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-4 pb-8">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Building2 size={18} className="text-primary" /> Application Settings
          </h1>
          <p className="text-sm text-muted-foreground">Configure company profile, permissions, categories, and email templates</p>
        </div>

        <Tabs defaultValue="company">
          <TabsList className="flex-wrap h-auto gap-0.5 w-full">
            <TabsTrigger value="company" className="gap-1.5 text-xs"><Building2 size={12} />Company</TabsTrigger>
            <TabsTrigger value="permissions" className="gap-1.5 text-xs"><Shield size={12} />Permissions</TabsTrigger>
            <TabsTrigger value="categories" className="gap-1.5 text-xs"><ListChecks size={12} />Categories</TabsTrigger>
            <TabsTrigger value="catalog" className="gap-1.5 text-xs"><Layers size={12} />Asset Catalog</TabsTrigger>
            <TabsTrigger value="status" className="gap-1.5 text-xs"><Tag size={12} />Status & Priority</TabsTrigger>
            <TabsTrigger value="templates" className="gap-1.5 text-xs"><Mail size={12} />Email Templates</TabsTrigger>
          </TabsList>

          {/* Company Profile — redirect to full page */}
          <TabsContent value="company" className="mt-4">
            <Card>
              <CardHeader className="pb-3 pt-4 px-4">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Building2 size={14} className="text-primary" />Company Branding & Profile
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 flex flex-col gap-4">
                {/* Live logo preview */}
                <LogoPreviewStrip />

                <p className="text-sm text-muted-foreground">
                  Upload your company logo and favicon, then set your contact details, address, and footer text used across all portals and PDF reports.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5 text-sm text-muted-foreground">
                  {[
                    'Wide logo (PNG 3993×743 or SVG)',
                    'Square favicon (ICO / PNG / SVG)',
                    'Company name, tagline & business line',
                    'Office address & contact numbers',
                    'Emergency support & support email',
                    'Footer text for reports and PDFs',
                  ].map((item) => (
                    <div key={item} className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                      {item}
                    </div>
                  ))}
                </div>

                <Button className="w-fit gap-2" onClick={() => navigate('/settings/company-profile')}>
                  <Building2 size={14} />Open Company Profile &amp; Upload Logo
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Roles & Permissions Matrix */}
          <TabsContent value="permissions" className="mt-4">
            <Card>
              <CardHeader className="pb-2 pt-4 px-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Roles & Permissions Matrix</CardTitle>
                  {!isSuperAdmin && <Badge variant="outline" className="text-xs">Read-only — SuperAdmin only</Badge>}
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="px-4 py-2 text-left font-medium text-muted-foreground sticky left-0 bg-card">Resource</th>
                        {MATRIX_ROLES.map((r) => (
                          <th key={r} colSpan={MATRIX_ACTIONS.length} className="px-2 py-2 text-center font-medium text-foreground capitalize border-l border-border">{r}</th>
                        ))}
                      </tr>
                      <tr className="border-b border-border bg-muted/30">
                        <th className="px-4 py-1 sticky left-0 bg-muted/30" />
                        {MATRIX_ROLES.map((r) =>
                          MATRIX_ACTIONS.map((a) => (
                            <th key={`${r}-${a}`} className="px-1.5 py-1 text-center text-muted-foreground font-normal capitalize">{a.slice(0, 3)}</th>
                          ))
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {MATRIX_RESOURCES.map((res) => (
                        <tr key={res} className="border-b border-border last:border-0 hover:bg-muted/20">
                          <td className="px-4 py-2 font-medium capitalize sticky left-0 bg-card">{res.replace('_', ' ')}</td>
                          {MATRIX_ROLES.map((role) =>
                            MATRIX_ACTIONS.map((action) => {
                              const has = hasMatrixPerm(role, res, action);
                              return (
                                <td key={`${role}-${action}`} className="px-1.5 py-2 text-center border-l border-border/30 first:border-0">
                                  <span className={`inline-block w-4 h-4 rounded-sm ${has ? 'bg-success/20 text-success' : 'bg-muted text-muted-foreground/30'}`}>
                                    {has ? '✓' : '·'}
                                  </span>
                                </td>
                              );
                            })
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {!isSuperAdmin && (
                  <p className="px-4 py-3 text-xs text-muted-foreground border-t border-border">
                    Only SuperAdmin can modify the permission matrix.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Categories */}
          <TabsContent value="categories" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2 pt-4 px-4"><CardTitle className="text-sm">Task Categories</CardTitle></CardHeader>
                <CardContent className="px-4 pb-4"><CatList type="task" list={taskCats} /></CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2 pt-4 px-4"><CardTitle className="text-sm">Asset Categories</CardTitle></CardHeader>
                <CardContent className="px-4 pb-4"><CatList type="asset" list={assetCats} /></CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Asset Catalog — Categories & Device Types */}
          <TabsContent value="catalog" className="mt-4">
            <div className="flex flex-col gap-4">
              <Card>
                <CardHeader className="pb-2 pt-4 px-4">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Layers size={14} className="text-primary" />
                      Asset Categories &amp; Device Types
                    </CardTitle>
                    <Button
                      size="sm" variant="outline"
                      className="h-7 text-xs gap-1"
                      onClick={() => {
                        setCatNameVal(''); setCatDescVal('');
                        setCatEditDialog({ open: true });
                      }}
                    >
                      <PlusCircle size={12} /> Add Category
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Expand a category to manage its device types. No code changes needed for new additions.
                  </p>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  {catalogLoading ? (
                    <p className="text-xs text-muted-foreground py-4 text-center">Loading catalog…</p>
                  ) : (
                    <div className="flex flex-col gap-1">
                      {catalogCats.map((cat) => {
                        const dts = catalogDTs.filter((d) => d.categoryId === cat.id);
                        const isExpanded = expandedCatId === cat.id;
                        return (
                          <div key={cat.id} className="border border-border rounded-lg overflow-hidden">
                            {/* Category row */}
                            <div className="flex items-center gap-2 px-3 py-2.5 bg-card hover:bg-accent/50 transition-colors">
                              <button
                                type="button"
                                className="flex items-center gap-2 flex-1 min-w-0 text-left"
                                onClick={() => setExpandedCatId(isExpanded ? null : cat.id)}
                              >
                                {isExpanded
                                  ? <ChevronDown size={14} className="shrink-0 text-muted-foreground" />
                                  : <ChevronRight size={14} className="shrink-0 text-muted-foreground" />
                                }
                                <span className="text-sm font-medium text-foreground">{cat.name}</span>
                                <span className="text-xs text-muted-foreground">({dts.filter((d) => d.active).length} types)</span>
                                {!cat.active && <Badge variant="outline" className="text-[10px] ml-1">Inactive</Badge>}
                              </button>
                              <div className="flex items-center gap-1 shrink-0">
                                <Button
                                  size="sm" variant="ghost" className="h-7 w-7 p-0"
                                  onClick={() => {
                                    setCatNameVal(cat.name); setCatDescVal(cat.description ?? '');
                                    setCatEditDialog({ open: true, editing: cat });
                                  }}
                                ><Pencil size={12} /></Button>
                                <Button
                                  size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive"
                                  onClick={() => deleteCatalogCat(cat.id)}
                                ><Trash2 size={12} /></Button>
                              </div>
                            </div>

                            {/* Device types (expanded) */}
                            {isExpanded && (
                              <div className="border-t border-border bg-muted/20 px-3 py-2 flex flex-col gap-1">
                                {dts.length === 0 && (
                                  <p className="text-xs text-muted-foreground py-1">No device types yet.</p>
                                )}
                                {dts.map((dt) => (
                                  <div key={dt.id} className="flex items-center justify-between gap-2 py-1.5 border-b border-border/50 last:border-0">
                                    <div className="flex items-center gap-2">
                                      <span className={`text-xs ${dt.active ? 'text-foreground' : 'text-muted-foreground line-through'}`}>{dt.name}</span>
                                      {!dt.active && <Badge variant="outline" className="text-[10px]">Disabled</Badge>}
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                      <Switch
                                        checked={dt.active}
                                        onCheckedChange={() => toggleCatalogDT(dt.id)}
                                      />
                                      <Button
                                        size="sm" variant="ghost" className="h-6 w-6 p-0"
                                        onClick={() => {
                                          setDtNameVal(dt.name);
                                          setDtEditDialog({ open: true, categoryId: cat.id, categoryName: cat.name, editing: dt });
                                        }}
                                      ><Pencil size={11} /></Button>
                                    </div>
                                  </div>
                                ))}
                                <Button
                                  size="sm" variant="outline" className="h-7 text-xs gap-1 mt-1 w-fit"
                                  onClick={() => {
                                    setDtNameVal('');
                                    setDtEditDialog({ open: true, categoryId: cat.id, categoryName: cat.name });
                                  }}
                                >
                                  <PlusCircle size={11} /> Add Device Type
                                </Button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Status & Priority */}
          <TabsContent value="status" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(['status','priority'] as const).map((t) => (
                <Card key={t}>
                  <CardHeader className="pb-2 pt-4 px-4"><CardTitle className="text-sm capitalize">{t} Options</CardTitle></CardHeader>
                  <CardContent className="px-4 pb-4">
                    <div className="flex flex-col gap-2">
                      {statusOptions.filter((s) => s.type === t).map((s) => (
                        <div key={s.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                          <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                            <span className="text-sm font-medium">{s.name}</span>
                          </div>
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => toast.info('Edit coming soon')}><Pencil size={13} /></Button>
                          </div>
                        </div>
                      ))}
                      <Button size="sm" variant="outline" className="mt-2 w-fit" onClick={() => toast.info('Add status coming soon')}>
                        <PlusCircle size={13} className="mr-1.5" />Add {t}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Email Templates */}
          <TabsContent value="templates" className="mt-4">
            <div className="flex flex-col gap-3">
              {templates.map((t) => (
                <Card key={t.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex flex-col gap-1 flex-1">
                        <div className="flex items-center gap-2">
                          <Mail size={13} className="text-primary shrink-0" />
                          <p className="text-sm font-semibold">{t.name}</p>
                        </div>
                        <p className="text-xs text-muted-foreground font-mono">{t.subject}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{t.body}</p>
                      </div>
                      <Button size="sm" variant="outline" className="shrink-0" onClick={() => openTplDialog(t)}>
                        <Pencil size={13} className="mr-1.5" />Edit
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Category dialog */}
      <Dialog open={!!catDialog?.open} onOpenChange={(v) => { if (!v) setCatDialog(null); }}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-sm">
          <DialogHeader>
            <DialogTitle>{catDialog?.editing ? 'Edit' : 'Add'} {catDialog?.type === 'task' ? 'Task' : 'Asset'} Category</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <Label className="text-xs">Name *</Label>
              <Input value={catName} onChange={(e) => setCatName(e.target.value)} placeholder="Category name" />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs">Description</Label>
              <Input value={catDesc} onChange={(e) => setCatDesc(e.target.value)} placeholder="Brief description" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setCatDialog(null)}>Cancel</Button>
            <Button onClick={saveCat}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Catalog Category dialog */}
      <Dialog open={catEditDialog.open} onOpenChange={(v) => { if (!v) setCatEditDialog({ open: false }); }}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-sm">
          <DialogHeader>
            <DialogTitle>{catEditDialog.editing ? 'Edit' : 'Add'} Asset Category</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <Label className="text-xs">Name *</Label>
              <Input value={catNameVal} onChange={(e) => setCatNameVal(e.target.value)} placeholder="e.g. Computers, CCTV, UPS…" className="px-3" />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs">Description</Label>
              <Input value={catDescVal} onChange={(e) => setCatDescVal(e.target.value)} placeholder="Brief description" className="px-3" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setCatEditDialog({ open: false })}>Cancel</Button>
            <Button onClick={saveCatalogCat}>Save Category</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Catalog Device Type dialog */}
      <Dialog open={dtEditDialog.open} onOpenChange={(v) => { if (!v) setDtEditDialog({ open: false }); }}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-sm">
          <DialogHeader>
            <DialogTitle>{dtEditDialog.editing ? 'Edit' : 'Add'} Device Type</DialogTitle>
            {dtEditDialog.categoryName && (
              <p className="text-xs text-muted-foreground">Category: <span className="font-medium">{dtEditDialog.categoryName}</span></p>
            )}
          </DialogHeader>
          <div className="flex flex-col gap-1">
            <Label className="text-xs">Device Type Name *</Label>
            <Input value={dtNameVal} onChange={(e) => setDtNameVal(e.target.value)} placeholder="e.g. Desktop, NVR, Managed Switch…" className="px-3" />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDtEditDialog({ open: false })}>Cancel</Button>
            <Button onClick={saveCatalogDT}>Save Device Type</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Email template dialog */}
      <Dialog open={!!tplDialog} onOpenChange={(v) => { if (!v) setTplDialog(null); }}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Template — {tplDialog?.name}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <p className="text-xs text-muted-foreground">Available placeholders: {'{{customer_name}}'}, {'{{task_number}}'}, {'{{engineer_name}}'}, {'{{amc_number}}'}, {'{{expiry_date}}'}, {'{{ticket_number}}'}, {'{{user_name}}'}, {'{{email}}'}, {'{{temp_password}}'}</p>
            <div className="flex flex-col gap-1">
              <Label className="text-xs">Subject *</Label>
              <Input value={tplSubject} onChange={(e) => setTplSubject(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs">Body *</Label>
              <Textarea rows={8} value={tplBody} onChange={(e) => setTplBody(e.target.value)} className="font-mono text-xs" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setTplDialog(null)}>Cancel</Button>
            <Button onClick={saveTpl}>Save Template</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
