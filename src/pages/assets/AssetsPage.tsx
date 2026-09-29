/**
 * AssetsPage — Asset List
 * Sectore 360 — Enterprise Asset Master
 * Includes: bulk import, recycle bin tab, category filter from master data
 */
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/customer/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuCheckboxItem,
  DropdownMenuTrigger, DropdownMenuItem, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { EmptyState } from '@/components/shared/EmptyState';
import { BulkImportDrawer } from '@/components/asset/BulkImportDrawer';
import { RecycleBinPanel } from '@/components/asset/RecycleBinPanel';
import { assetService } from '@/services/assetService';
import { customerService } from '@/services/customerService';
import { masterDataService } from '@/services/masterDataService';
import type { Asset, Customer } from '@/types/customer';
import { toast } from 'sonner';
import {
  Plus, Search, SlidersHorizontal, Columns3, Download,
  Eye, Pencil, Trash2, RefreshCw, ChevronUp, ChevronDown,
  ChevronsUpDown, Server, MoreHorizontal, Upload,
} from 'lucide-react';

type ColKey = 'code' | 'customer' | 'category' | 'deviceType' | 'brand' | 'model' | 'serialNumber' | 'location' | 'status';
const ALL_COLS: { key: ColKey; label: string }[] = [
  { key: 'code',         label: 'Code' },
  { key: 'customer',     label: 'Customer' },
  { key: 'category',     label: 'Category' },
  { key: 'deviceType',   label: 'Device Type' },
  { key: 'brand',        label: 'Brand' },
  { key: 'model',        label: 'Model' },
  { key: 'serialNumber', label: 'Serial No.' },
  { key: 'location',     label: 'Location' },
  { key: 'status',       label: 'Status' },
];

function SortIcon({ col, sortKey, dir }: { col: string; sortKey: string; dir: 'asc' | 'desc' }) {
  if (col !== sortKey) return <ChevronsUpDown size={13} className="ml-1 opacity-40 inline" />;
  return dir === 'asc'
    ? <ChevronUp size={13} className="ml-1 text-primary inline" />
    : <ChevronDown size={13} className="ml-1 text-primary inline" />;
}

const PAGE_SIZES = [10, 25, 50, 100];

function exportCSV(rows: Asset[], customerMap: Map<string, string>) {
  const headers = ['Code', 'Customer', 'Category', 'Device Type', 'Brand', 'Model', 'Serial Number', 'Location', 'Status'];
  const csv = [headers, ...rows.map((r) => [
    r.code, customerMap.get(r.customerId) ?? r.customerId,
    r.category, r.deviceType, r.brand ?? '', r.model ?? '',
    r.serialNumber, r.location ?? '', r.status,
  ])].map((r) => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = 'assets.csv'; a.click();
}

export default function AssetsPage() {
  const { user }   = useAuth();
  const navigate   = useNavigate();
  const isAdmin    = user?.role === 'superadmin' || user?.role === 'admin' || user?.role === 'manager' || user?.role === 'backoffice';
  const isCustomer = user?.role === 'customer';

  const [assets,        setAssets]        = useState<Asset[]>([]);
  const [customers,     setCustomers]     = useState<Customer[]>([]);
  const [categories,    setCategories]    = useState<string[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [showRetired,   setShowRetired]   = useState(false);
  const [query,         setQuery]         = useState('');
  const [categoryFilter,setCategoryFilter]= useState('all');
  const [statusFilter,  setStatusFilter]  = useState('all');
  const [sortKey,       setSortKey]       = useState<ColKey>('code');
  const [sortDir,       setSortDir]       = useState<'asc' | 'desc'>('asc');
  const [page,          setPage]          = useState(1);
  const [pageSize,      setPageSize]      = useState(25);
  const [visibleCols,   setVisibleCols]   = useState<Set<ColKey>>(new Set(ALL_COLS.map((c) => c.key)));
  const [deleteTarget,  setDeleteTarget]  = useState<Asset | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<Asset | null>(null);
  const [importOpen,    setImportOpen]    = useState(false);

  const customerMap = useMemo(
    () => new Map(customers.map((c) => [c.id, c.companyName])),
    [customers]
  );

  const load = useCallback(async () => {
    setLoading(true);
    // Customer: only their own assets. Admin/Manager/BackOffice/Engineer: all assets.
    const assetLoad = isCustomer && user?.customerId
      ? assetService.getByCustomer(user.customerId)
      : assetService.getAll();
    const [a, c] = await Promise.all([assetLoad, customerService.getAll()]);
    setAssets(a); setCustomers(c); setLoading(false);
  }, [isCustomer, user?.customerId]);

  useEffect(() => {
    load();
    masterDataService.list('asset_category')
      .then((items) => setCategories(items.map((i) => i.value)))
      .catch(() => {});
  }, [load]);

  const filtered = useMemo(() => {
    let list = [...assets];
    if (!showRetired) list = list.filter((a) => a.status !== 'Retired');
    if (statusFilter !== 'all') list = list.filter((a) => a.status === statusFilter);
    if (categoryFilter !== 'all') list = list.filter((a) => a.category === categoryFilter);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((a) =>
        a.serialNumber.toLowerCase().includes(q) ||
        (a.model ?? '').toLowerCase().includes(q) ||
        (a.brand ?? '').toLowerCase().includes(q) ||
        a.code.toLowerCase().includes(q) ||
        (a.serviceTag ?? '').toLowerCase().includes(q) ||
        (customerMap.get(a.customerId) ?? '').toLowerCase().includes(q) ||
        (a.ipAddress ?? '').toLowerCase().includes(q) ||
        (a.location ?? '').toLowerCase().includes(q) ||
        a.deviceType.toLowerCase().includes(q)
      );
    }
    list.sort((a, b) => {
      let av = '', bv = '';
      if (sortKey === 'customer') { av = customerMap.get(a.customerId) ?? ''; bv = customerMap.get(b.customerId) ?? ''; }
      else { av = (a[sortKey as keyof Asset] as string) ?? ''; bv = (b[sortKey as keyof Asset] as string) ?? ''; }
      return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
    });
    return list;
  }, [assets, showRetired, statusFilter, categoryFilter, query, sortKey, sortDir, customerMap]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated  = filtered.slice((page - 1) * pageSize, page * pageSize);

  const handleSort = (key: ColKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
    setPage(1);
  };

  const handleDelete = async () => {
    if (!deleteTarget || !user) return;
    await assetService.softDelete(deleteTarget.id, user.name);
    toast.success(`Asset ${deleteTarget.code} retired`);
    setDeleteTarget(null); load();
  };

  const handleRestore = async () => {
    if (!restoreTarget || !user) return;
    await assetService.restore(restoreTarget.id, user.name);
    toast.success(`Asset ${restoreTarget.code} restored`);
    setRestoreTarget(null); load();
  };

  const toggleCol = (key: ColKey) => {
    setVisibleCols((prev) => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });
  };

  /* ── Asset list tab content ───────────────────────────── */
  const AssetListContent = (
    <>
      <Card className="mb-4">
        <div className="flex flex-wrap items-center gap-2 p-3">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => { setQuery(e.target.value); setPage(1); }}
              placeholder="Search code, serial, brand, model, IP, location…"
              className="pl-8 h-9 text-sm"
            />
          </div>

          <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setPage(1); }}>
            <SelectTrigger className="h-9 w-[160px] text-sm">
              <SlidersHorizontal size={13} className="mr-1 opacity-60 shrink-0" /><SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger className="h-9 w-[140px] text-sm"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Inactive">Inactive</SelectItem>
              <SelectItem value="Under Maintenance">Maintenance</SelectItem>
              <SelectItem value="Retired">Retired</SelectItem>
            </SelectContent>
          </Select>

          <div className="ml-auto flex items-center gap-2 flex-wrap">
            {isAdmin && (
              <Button
                variant={showRetired ? 'default' : 'outline'}
                size="sm"
                onClick={() => setShowRetired((v) => !v)}
                className="h-9 text-xs gap-1.5"
              >
                <Trash2 size={13} /> {showRetired ? 'Hide Retired' : 'Show Retired'}
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs">
                  <Columns3 size={13} /> Columns
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {ALL_COLS.map((col) => (
                  <DropdownMenuCheckboxItem
                    key={col.key}
                    checked={visibleCols.has(col.key)}
                    onCheckedChange={() => toggleCol(col.key)}
                  >
                    {col.label}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant="outline" size="sm" className="h-9 gap-1.5 text-xs"
              onClick={() => exportCSV(filtered, customerMap)}
            >
              <Download size={13} /> Export
            </Button>
          </div>
        </div>
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {ALL_COLS.filter((c) => visibleCols.has(c.key)).map((col) => (
                  <TableHead
                    key={col.key}
                    className="whitespace-nowrap cursor-pointer select-none hover:text-foreground"
                    onClick={() => handleSort(col.key)}
                  >
                    {col.label}<SortIcon col={col.key} sortKey={sortKey} dir={sortDir} />
                  </TableHead>
                ))}
                <TableHead className="whitespace-nowrap text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {[...Array(visibleCols.size + 1)].map((_, j) => (
                      <TableCell key={j}><div className="h-4 rounded bg-muted animate-pulse w-full max-w-[120px]" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : paginated.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={visibleCols.size + 1} className="py-12">
                    <EmptyState
                      icon={Server}
                      title="No assets found"
                      description="Try adjusting your search or filters."
                      action={isAdmin ? { label: 'Add Asset', onClick: () => navigate('/assets/new') } : undefined}
                    />
                  </TableCell>
                </TableRow>
              ) : paginated.map((asset) => (
                <TableRow
                  key={asset.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => navigate(`/assets/${asset.id}`)}
                >
                  {visibleCols.has('code')         && <TableCell className="whitespace-nowrap font-mono text-xs text-muted-foreground">{asset.code}</TableCell>}
                  {visibleCols.has('customer')     && <TableCell className="whitespace-nowrap text-sm font-medium max-w-[140px] truncate">{customerMap.get(asset.customerId) ?? '—'}</TableCell>}
                  {visibleCols.has('category')     && <TableCell className="whitespace-nowrap">{asset.category}</TableCell>}
                  {visibleCols.has('deviceType')   && <TableCell className="whitespace-nowrap">{asset.deviceType}</TableCell>}
                  {visibleCols.has('brand')        && <TableCell className="whitespace-nowrap">{asset.brand ?? '—'}</TableCell>}
                  {visibleCols.has('model')        && <TableCell className="whitespace-nowrap">{asset.model ?? '—'}</TableCell>}
                  {visibleCols.has('serialNumber') && <TableCell className="whitespace-nowrap font-mono text-xs">{asset.serialNumber}</TableCell>}
                  {visibleCols.has('location')     && <TableCell className="whitespace-nowrap">{asset.location ?? '—'}</TableCell>}
                  {visibleCols.has('status')       && <TableCell className="whitespace-nowrap"><StatusBadge status={asset.status} /></TableCell>}
                  <TableCell className="whitespace-nowrap text-right" onClick={(e) => e.stopPropagation()}>
                    {isAdmin ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0"><MoreHorizontal size={14} /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate(`/assets/${asset.id}`)} className="gap-2"><Eye size={13} /> View</DropdownMenuItem>
                          {asset.status !== 'Retired' && (
                            <DropdownMenuItem onClick={() => navigate(`/assets/${asset.id}/edit`)} className="gap-2"><Pencil size={13} /> Edit</DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          {asset.status === 'Retired' ? (
                            <DropdownMenuItem onClick={() => setRestoreTarget(asset)} className="gap-2 text-green-600"><RefreshCw size={13} /> Restore</DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => setDeleteTarget(asset)} className="gap-2 text-destructive focus:text-destructive"><Trash2 size={13} /> Retire</DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : (
                      <Button variant="ghost" size="sm" onClick={() => navigate(`/assets/${asset.id}`)} className="h-7 gap-1 text-xs">
                        <Eye size={12} /> View
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-border">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Rows:</span>
            <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
              <SelectTrigger className="h-7 w-16 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>{PAGE_SIZES.map((s) => <SelectItem key={s} value={String(s)}>{s}</SelectItem>)}</SelectContent>
            </Select>
            <span>{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(1)} className="h-7 px-2 text-xs">«</Button>
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="h-7 px-2 text-xs">‹</Button>
            <Badge variant="outline" className="px-3 h-7 text-xs">{page} / {totalPages}</Badge>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="h-7 px-2 text-xs">›</Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(totalPages)} className="h-7 px-2 text-xs">»</Button>
          </div>
        </div>
      </Card>
    </>
  );

  return (
    <DashboardLayout>
      <PageHeader
        title="Asset Management"
        description="Manage all IT assets across customers."
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Assets' }]}
        actions={
          isAdmin ? (
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setImportOpen(true)} className="gap-2">
                <Upload size={15} /> Bulk Import
              </Button>
              <Button onClick={() => navigate('/assets/new')} className="gap-2">
                <Plus size={15} /> Add Asset
              </Button>
            </div>
          ) : undefined
        }
      />

      <Tabs defaultValue="assets">
        <TabsList className="mb-4">
          <TabsTrigger value="assets">Assets</TabsTrigger>
          {isAdmin && <TabsTrigger value="recycle-bin">Recycle Bin</TabsTrigger>}
        </TabsList>
        <TabsContent value="assets">{AssetListContent}</TabsContent>
        {isAdmin && (
          <TabsContent value="recycle-bin">
            <RecycleBinPanel defaultEntityType="asset" />
          </TabsContent>
        )}
      </Tabs>

      {/* Bulk Import */}
      <BulkImportDrawer
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={load}
      />

      {/* Retire Confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Retire Asset</AlertDialogTitle>
            <AlertDialogDescription>
              Retire <strong>{deleteTarget?.code}</strong>? It will move to the Recycle Bin and can be restored later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Retire</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Restore Confirm */}
      <AlertDialog open={!!restoreTarget} onOpenChange={() => setRestoreTarget(null)}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Restore Asset</AlertDialogTitle>
            <AlertDialogDescription>Restore asset <strong>{restoreTarget?.code}</strong> to Active status?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRestore}>Restore</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
