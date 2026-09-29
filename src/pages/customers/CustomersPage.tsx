/**
 * CustomersPage — Customer List
 * Sectore 360 — Phase 1, Part 2
 * Search, filter, sort, paginate, export, add/edit inline dialog, delete/restore.
 */
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge, CustomerTypeBadge } from '@/components/customer/StatusBadge';
import { CustomerForm } from '@/components/customer/CustomerForm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuCheckboxItem,
  DropdownMenuTrigger, DropdownMenuItem, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/shared/EmptyState';
import { customerService } from '@/services/customerService';
import type { Customer, CustomerFormData } from '@/types/customer';
import { toast } from 'sonner';
import {
  Plus, Search, SlidersHorizontal, Columns3,
  Eye, Pencil, Trash2, RefreshCw, Download,
  ChevronUp, ChevronDown, ChevronsUpDown, Users,
  MoreHorizontal,
} from 'lucide-react';

/* ── Column definition ───────────────────────────────────────── */
type ColKey = 'code' | 'companyName' | 'customerType' | 'contactPerson' | 'primaryMobile' | 'email' | 'city' | 'status';
const ALL_COLS: { key: ColKey; label: string }[] = [
  { key: 'code', label: 'Code' },
  { key: 'companyName', label: 'Company' },
  { key: 'customerType', label: 'Category' },
  { key: 'contactPerson', label: 'Contact' },
  { key: 'primaryMobile', label: 'Mobile' },
  { key: 'email', label: 'Email' },
  { key: 'city', label: 'City' },
  { key: 'status', label: 'Status' },
];

/* ── Sort indicator ──────────────────────────────────────────── */
function SortIcon({ col, sortKey, dir }: { col: string; sortKey: string; dir: 'asc' | 'desc' }) {
  if (col !== sortKey) return <ChevronsUpDown size={13} className="ml-1 opacity-40 inline" />;
  return dir === 'asc'
    ? <ChevronUp size={13} className="ml-1 text-primary inline" />
    : <ChevronDown size={13} className="ml-1 text-primary inline" />;
}

const PAGE_SIZES = [10, 25, 50];

/* ── CSV export ──────────────────────────────────────────────── */
function exportCSV(rows: Customer[]) {
  const headers = ['Code', 'Company Name', 'Category', 'Contact Person', 'Mobile', 'Email', 'City', 'State', 'Status'];
  const csv = [headers, ...rows.map((r) => [
    r.code, r.companyName, r.customerType, r.contactPerson,
    r.primaryMobile, r.email, r.city, r.state, r.status,
  ])].map((r) => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = 'customers.csv'; a.click();
}

export default function CustomersPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Roles that can add/edit customers
  const canManage = user?.role === 'superadmin' || user?.role === 'admin' || user?.role === 'manager';

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDeleted, setShowDeleted] = useState(false);
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [sortKey, setSortKey] = useState<ColKey>('code');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [visibleCols, setVisibleCols] = useState<Set<ColKey>>(new Set(ALL_COLS.map((c) => c.key)));
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<Customer | null>(null);

  // ── Add / Edit dialog state ───────────────────────────────────
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Customer | null>(null);
  const [dialogSaving, setDialogSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await customerService.getAll();
      setCustomers(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  /* ── Filter + sort ───────────────────────────────────────────── */
  const filtered = useMemo(() => {
    let list = [...customers];
    if (!showDeleted) list = list.filter((c) => c.status !== 'Inactive');
    if (statusFilter === 'active') list = list.filter((c) => c.status === 'Active');
    else if (statusFilter === 'inactive') list = list.filter((c) => c.status === 'Inactive');
    if (typeFilter !== 'all') list = list.filter((c) => c.customerType === typeFilter);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((c) =>
        c.companyName.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.primaryMobile.includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.contactPerson.toLowerCase().includes(q)
      );
    }
    list.sort((a, b) => {
      const av = (a[sortKey] ?? '') as string;
      const bv = (b[sortKey] ?? '') as string;
      return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
    });
    return list;
  }, [customers, showDeleted, statusFilter, typeFilter, query, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const handleSort = (key: ColKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
    setPage(1);
  };

  /* ── Add customer ─────────────────────────────────────────────── */
  const openAdd = () => { setEditTarget(null); setDialogOpen(true); };
  const openEdit = (customer: Customer) => { setEditTarget(customer); setDialogOpen(true); };

  const handleDialogSubmit = async (data: CustomerFormData) => {
    if (!user) return;
    setDialogSaving(true);
    try {
      if (editTarget) {
        // Edit existing
        await customerService.update(editTarget.id, data, user.name ?? 'Admin');
        toast.success(`${data.companyName} updated successfully`);
      } else {
        // Create new
        const created = await customerService.create(data, user.name ?? 'Admin');
        toast.success(`${created.companyName} created successfully`, {
          description: `Customer code: ${created.code}`,
        });
      }
      setDialogOpen(false);
      setEditTarget(null);
      // Refresh list so new/edited customer appears immediately
      await load();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      toast.error(editTarget ? `Failed to update: ${msg}` : `Failed to create: ${msg}`);
    } finally {
      setDialogSaving(false);
    }
  };

  /* ── Delete / Restore ─────────────────────────────────────────── */
  const handleDelete = async () => {
    if (!deleteTarget || !user) return;
    await customerService.softDelete(deleteTarget.id, user.name);
    toast.success(`${deleteTarget.companyName} deactivated`);
    setDeleteTarget(null);
    load();
  };

  const handleRestore = async () => {
    if (!restoreTarget || !user) return;
    await customerService.restore(restoreTarget.id, user.name);
    toast.success(`${restoreTarget.companyName} restored`);
    setRestoreTarget(null);
    load();
  };

  const toggleCol = (key: ColKey) => {
    setVisibleCols((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  return (
    <DashboardLayout>
      <PageHeader
        title="Customer Management"
        description="Manage all customers, contacts, and company information."
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Customers' }]}
      />

      {/* ── Toolbar ──────────────────────────────────────────── */}
      <Card className="mb-4">
        <div className="flex flex-wrap items-center gap-2 p-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => { setQuery(e.target.value); setPage(1); }}
              placeholder="Search customers…"
              className="pl-8 h-9 text-sm"
            />
          </div>

          {/* Status filter */}
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger className="h-9 w-[130px] text-sm">
              <SlidersHorizontal size={13} className="mr-1 opacity-60" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>

          {/* Category filter */}
          <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(1); }}>
            <SelectTrigger className="h-9 w-[160px] text-sm">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="AMC Customer">AMC Customer</SelectItem>
              <SelectItem value="Non-AMC Customer">Non-AMC Customer</SelectItem>
              <SelectItem value="Prospect">Prospect</SelectItem>
              <SelectItem value="One-Time Customer">One-Time Customer</SelectItem>
              <SelectItem value="Dealer / Partner">Dealer / Partner</SelectItem>
              <SelectItem value="Internal">Internal</SelectItem>
              <SelectItem value="AMC">AMC (legacy)</SelectItem>
              <SelectItem value="Call Based">Call Based (legacy)</SelectItem>
            </SelectContent>
          </Select>

          <div className="ml-auto flex items-center gap-2">
            {/* Show deleted toggle */}
            {canManage && (
              <Button
                variant={showDeleted ? 'default' : 'outline'}
                size="sm"
                onClick={() => setShowDeleted((v) => !v)}
                className="h-9 text-xs gap-1.5"
              >
                <Trash2 size={13} /> {showDeleted ? 'Hide Deleted' : 'Show Deleted'}
              </Button>
            )}

            {/* Column visibility */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs">
                  <Columns3 size={13} /> Columns
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
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

            {/* Export */}
            <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs" onClick={() => exportCSV(filtered)}>
              <Download size={13} /> Export
            </Button>

            {/* ── Add Customer (primary action) ── */}
            {canManage && (
              <Button size="sm" className="h-9 gap-1.5 text-sm font-medium" onClick={openAdd}>
                <Plus size={15} /> Add Customer
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* ── Table ─────────────────────────────────────────────── */}
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
                    {col.label}
                    <SortIcon col={col.key} sortKey={sortKey} dir={sortDir} />
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
                    <EmptyState icon={Users} title="No customers found" description="Try adjusting your search or filters." />
                  </TableCell>
                </TableRow>
              ) : paginated.map((customer) => (
                <TableRow
                  key={customer.id}
                  className="cursor-pointer hover:bg-muted/50 group"
                  onClick={() => navigate(`/customers/${customer.id}`)}
                >
                  {visibleCols.has('code') && (
                    <TableCell className="whitespace-nowrap font-mono text-xs text-muted-foreground">
                      {customer.code}
                    </TableCell>
                  )}
                  {visibleCols.has('companyName') && (
                    <TableCell className="whitespace-nowrap font-medium text-foreground max-w-[180px] truncate">
                      {customer.companyName}
                    </TableCell>
                  )}
                  {visibleCols.has('customerType') && (
                    <TableCell className="whitespace-nowrap">
                      <CustomerTypeBadge type={customer.customerType} />
                    </TableCell>
                  )}
                  {visibleCols.has('contactPerson') && (
                    <TableCell className="whitespace-nowrap">{customer.contactPerson}</TableCell>
                  )}
                  {visibleCols.has('primaryMobile') && (
                    <TableCell className="whitespace-nowrap">{customer.primaryMobile}</TableCell>
                  )}
                  {visibleCols.has('email') && (
                    <TableCell className="whitespace-nowrap max-w-[160px] truncate text-sm text-muted-foreground">
                      {customer.email}
                    </TableCell>
                  )}
                  {visibleCols.has('city') && (
                    <TableCell className="whitespace-nowrap">{customer.city}</TableCell>
                  )}
                  {visibleCols.has('status') && (
                    <TableCell className="whitespace-nowrap">
                      <StatusBadge status={customer.status} />
                    </TableCell>
                  )}
                  <TableCell className="whitespace-nowrap text-right" onClick={(e) => e.stopPropagation()}>
                    {canManage ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                            <MoreHorizontal size={14} />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate(`/customers/${customer.id}`)} className="gap-2">
                            <Eye size={13} /> View
                          </DropdownMenuItem>
                          {customer.status !== 'Inactive' && (
                            <DropdownMenuItem onClick={() => openEdit(customer)} className="gap-2">
                              <Pencil size={13} /> Edit
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          {customer.status === 'Inactive' ? (
                            <DropdownMenuItem onClick={() => setRestoreTarget(customer)} className="gap-2 text-success">
                              <RefreshCw size={13} /> Restore
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => setDeleteTarget(customer)} className="gap-2 text-destructive focus:text-destructive">
                              <Trash2 size={13} /> Delete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : (
                      <Button variant="ghost" size="sm" onClick={() => navigate(`/customers/${customer.id}`)} className="h-7 gap-1 text-xs">
                        <Eye size={12} /> View
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* ── Pagination ──────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-border">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Rows per page:</span>
            <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
              <SelectTrigger className="h-7 w-16 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PAGE_SIZES.map((s) => <SelectItem key={s} value={String(s)}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <span>{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(1)} className="h-7 px-2 text-xs">«</Button>
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="h-7 px-2 text-xs">‹</Button>
            <Badge variant="outline" className="px-3 h-7 text-xs">
              {page} / {totalPages}
            </Badge>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="h-7 px-2 text-xs">›</Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(totalPages)} className="h-7 px-2 text-xs">»</Button>
          </div>
        </div>
      </Card>

      {/* ── Add / Edit Customer Dialog ──────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open && !dialogSaving) { setDialogOpen(false); setEditTarget(null); } }}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-3xl max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editTarget ? `Edit — ${editTarget.companyName}` : 'Add New Customer'}</DialogTitle>
          </DialogHeader>
          <CustomerForm
            customer={editTarget ?? undefined}
            onSubmit={handleDialogSubmit}
            onCancel={() => { setDialogOpen(false); setEditTarget(null); }}
            isLoading={dialogSaving}
          />
        </DialogContent>
      </Dialog>

      {/* ── Delete dialog ─────────────────────────────────────── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Customer</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteTarget?.companyName}</strong>?
              This action can be undone from the deleted records view.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Restore dialog ────────────────────────────────────── */}
      <AlertDialog open={!!restoreTarget} onOpenChange={() => setRestoreTarget(null)}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Restore Customer</AlertDialogTitle>
            <AlertDialogDescription>
              Restore <strong>{restoreTarget?.companyName}</strong> and make them active again?
            </AlertDialogDescription>
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
