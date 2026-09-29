/**
 * AMC List Page
 * Sectore 360 — Phase 1, Part 4
 */
import { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuCheckboxItem, DropdownMenuLabel, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AMCStatusBadge, AMCContractTypeBadge, AMCFrequencyBadge, RemainingDaysBadge } from '@/components/amc/AMCBadges';
import { amcService } from '@/services/amcService';
import type { AMC } from '@/types/amc';
import { remainingDays, AMC_STATUS_OPTIONS, CONTRACT_TYPE_OPTIONS, VISIT_FREQUENCY_OPTIONS } from '@/types/amc';
import { toast } from 'sonner';
import {
  Plus, Search, Filter, MoreVertical, Eye, Pencil, Trash2,
  RefreshCw, Download, Columns, ChevronLeft, ChevronRight,
} from 'lucide-react';

const PAGE_SIZES = [10, 25, 50];

type SortField = 'amcNumber' | 'customerName' | 'contractType' | 'startDate' | 'endDate' | 'status';

interface Filters {
  status: string[];
  contractType: string[];
  visitFrequency: string[];
  expiring: string;    // '', '30', '60'
}

const defaultFilters: Filters = { status: [], contractType: [], visitFrequency: [], expiring: '' };

export default function AMCsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canEdit = user?.role === 'admin';
  const canCreate = user?.role === 'admin';

  const [allAMCs, setAllAMCs] = useState<AMC[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [sortField, setSortField] = useState<SortField>('amcNumber');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [visibleCols, setVisibleCols] = useState({
    amcNumber: true, customer: true, contractType: true,
    startDate: false, endDate: true, status: true,
    remaining: true, frequency: true,
  });

  const load = useCallback(async () => {
    setLoading(true);
    const data = await amcService.list({ includeCancelled: true });
    setAllAMCs(data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    let list = [...allAMCs];
    if (search.trim().length >= 2) {
      const q = search.toLowerCase();
      list = list.filter((a) =>
        a.amcNumber.toLowerCase().includes(q) ||
        a.customerName.toLowerCase().includes(q) ||
        a.contractType.toLowerCase().includes(q) ||
        a.status.toLowerCase().includes(q)
      );
    }
    if (filters.status.length)        list = list.filter((a) => filters.status.includes(a.status));
    if (filters.contractType.length)  list = list.filter((a) => filters.contractType.includes(a.contractType));
    if (filters.visitFrequency.length)list = list.filter((a) => filters.visitFrequency.includes(a.visitFrequency));
    if (filters.expiring === '30')    list = list.filter((a) => a.status === 'Active' && remainingDays(a.endDate) <= 30 && remainingDays(a.endDate) >= 0);
    if (filters.expiring === '60')    list = list.filter((a) => a.status === 'Active' && remainingDays(a.endDate) <= 60 && remainingDays(a.endDate) >= 0);

    list.sort((a, b) => {
      let av = '', bv = '';
      if (sortField === 'amcNumber')    { av = a.amcNumber;    bv = b.amcNumber; }
      if (sortField === 'customerName') { av = a.customerName; bv = b.customerName; }
      if (sortField === 'contractType') { av = a.contractType; bv = b.contractType; }
      if (sortField === 'startDate')    { av = a.startDate;    bv = b.startDate; }
      if (sortField === 'endDate')      { av = a.endDate;      bv = b.endDate; }
      if (sortField === 'status')       { av = a.status;       bv = b.status; }
      return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
    });
    return list;
  }, [allAMCs, search, filters, sortField, sortDir]);

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  function toggleSort(field: SortField) {
    if (sortField === field) setSortDir((d) => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  }

  function toggleFilter<K extends keyof Filters>(key: K, value: string) {
    setFilters((prev) => {
      const arr = prev[key] as string[];
      return {
        ...prev,
        [key]: arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value],
      };
    });
    setPage(1);
  }

  function exportCSV() {
    const cols = ['AMC Number','Customer','Contract Type','Status','Start Date','End Date','Remaining Days','Frequency'];
    const rows = filtered.map((a) => [
      a.amcNumber, a.customerName, a.contractType, a.status, a.startDate, a.endDate,
      remainingDays(a.endDate), a.visitFrequency,
    ]);
    const csv = [cols, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'amc_contracts.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  async function handleDelete() {
    if (!deleteId) return;
    await amcService.softDelete(deleteId, user?.name ?? 'Admin');
    toast.success('AMC cancelled successfully');
    setDeleteId(null);
    load();
  }

  const activeFiltersCount = filters.status.length + filters.contractType.length +
    filters.visitFrequency.length + (filters.expiring ? 1 : 0);

  function ThSort({ field, label }: { field: SortField; label: string }) {
    const active = sortField === field;
    return (
      <th className="py-2 px-3 text-xs font-medium text-muted-foreground text-left whitespace-nowrap cursor-pointer select-none hover:text-foreground"
        onClick={() => toggleSort(field)}>
        {label} {active ? (sortDir === 'asc' ? '↑' : '↓') : ''}
      </th>
    );
  }

  return (
    <DashboardLayout>
      <PageHeader
        title="AMC Contracts"
        description="Manage Annual Maintenance Contracts for customers and assets."
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'AMC' }]}
        actions={canCreate ? (
          <Button size="sm" className="gap-1.5" onClick={() => navigate('/amc/new')}>
            <Plus size={14} /> New AMC
          </Button>
        ) : undefined}
      />

      {/* ── Toolbar ────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search AMC number, customer, type…" className="pl-8 h-8 text-sm" />
        </div>

        {/* Filters dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5 h-8">
              <Filter size={13} />
              Filters
              {activeFiltersCount > 0 && <Badge className="h-4 w-4 p-0 text-[10px] flex items-center justify-center">{activeFiltersCount}</Badge>}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Status</DropdownMenuLabel>
            {AMC_STATUS_OPTIONS.map((s) => (
              <DropdownMenuCheckboxItem key={s} checked={filters.status.includes(s)}
                onCheckedChange={() => toggleFilter('status', s)}>{s}</DropdownMenuCheckboxItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Contract Type</DropdownMenuLabel>
            {CONTRACT_TYPE_OPTIONS.map((s) => (
              <DropdownMenuCheckboxItem key={s} checked={filters.contractType.includes(s)}
                onCheckedChange={() => toggleFilter('contractType', s)}>{s}</DropdownMenuCheckboxItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Visit Frequency</DropdownMenuLabel>
            {VISIT_FREQUENCY_OPTIONS.map((s) => (
              <DropdownMenuCheckboxItem key={s} checked={filters.visitFrequency.includes(s)}
                onCheckedChange={() => toggleFilter('visitFrequency', s)}>{s}</DropdownMenuCheckboxItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Expiry</DropdownMenuLabel>
            {[['30','Expiring in 30 days'],['60','Expiring in 60 days']].map(([v, l]) => (
              <DropdownMenuCheckboxItem key={v} checked={filters.expiring === v}
                onCheckedChange={() => setFilters((p) => ({ ...p, expiring: p.expiring === v ? '' : v }))}>
                {l}
              </DropdownMenuCheckboxItem>
            ))}
            {activeFiltersCount > 0 && <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setFilters(defaultFilters)} className="text-destructive text-xs">
                Clear all filters
              </DropdownMenuItem>
            </>}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Column visibility */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5 h-8"><Columns size={13} /> Columns</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {Object.entries({ amcNumber: 'AMC #', customer: 'Customer', contractType: 'Contract Type',
              startDate: 'Start Date', endDate: 'End Date', status: 'Status',
              remaining: 'Remaining', frequency: 'Frequency' }).map(([k, l]) => (
              <DropdownMenuCheckboxItem key={k}
                checked={visibleCols[k as keyof typeof visibleCols]}
                onCheckedChange={(v) => setVisibleCols((p) => ({ ...p, [k]: v }))}>
                {l}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button variant="outline" size="sm" className="gap-1.5 h-8" onClick={exportCSV}>
          <Download size={13} /> Export
        </Button>

        <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
          <SelectTrigger className="h-8 w-20 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>{PAGE_SIZES.map((s) => <SelectItem key={s} value={String(s)}>{s}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {/* ── Result count ───────────────────────────────────── */}
      <p className="text-xs text-muted-foreground mb-3">
        {loading ? 'Loading…' : `${filtered.length} contract${filtered.length !== 1 ? 's' : ''}`}
      </p>

      {/* ── Table ──────────────────────────────────────────── */}
      <div className="w-full overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              {visibleCols.amcNumber    && <ThSort field="amcNumber"    label="AMC #" />}
              {visibleCols.customer     && <ThSort field="customerName" label="Customer" />}
              {visibleCols.contractType && <ThSort field="contractType" label="Contract Type" />}
              {visibleCols.frequency    && <th className="py-2 px-3 text-xs font-medium text-muted-foreground text-left whitespace-nowrap">Frequency</th>}
              {visibleCols.startDate    && <ThSort field="startDate"    label="Start" />}
              {visibleCols.endDate      && <ThSort field="endDate"      label="End" />}
              {visibleCols.remaining    && <th className="py-2 px-3 text-xs font-medium text-muted-foreground text-left whitespace-nowrap">Remaining</th>}
              {visibleCols.status       && <ThSort field="status"       label="Status" />}
              <th className="py-2 px-3 w-10" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i} className="border-b border-border">
                  <td colSpan={10} className="px-3 py-3">
                    <div className="h-4 bg-muted animate-pulse rounded" />
                  </td>
                </tr>
              ))
            ) : paginated.length === 0 ? (
              <tr><td colSpan={10} className="text-center py-12 text-sm text-muted-foreground">
                No AMC contracts match the selected filters.
              </td></tr>
            ) : paginated.map((amc) => (
              <tr key={amc.id}
                className="border-b border-border hover:bg-muted/30 cursor-pointer transition-colors"
                onClick={() => navigate(`/amc/${amc.id}`)}>
                {visibleCols.amcNumber    && <td className="py-2 px-3 whitespace-nowrap font-mono text-xs text-primary font-medium">{amc.amcNumber}</td>}
                {visibleCols.customer     && <td className="py-2 px-3 whitespace-nowrap text-sm font-medium max-w-48 truncate">{amc.customerName}</td>}
                {visibleCols.contractType && <td className="py-2 px-3 whitespace-nowrap"><AMCContractTypeBadge type={amc.contractType} /></td>}
                {visibleCols.frequency    && <td className="py-2 px-3 whitespace-nowrap"><AMCFrequencyBadge frequency={amc.visitFrequency} /></td>}
                {visibleCols.startDate    && <td className="py-2 px-3 whitespace-nowrap text-xs text-muted-foreground">{amc.startDate}</td>}
                {visibleCols.endDate      && <td className="py-2 px-3 whitespace-nowrap text-xs text-muted-foreground">{amc.endDate}</td>}
                {visibleCols.remaining    && <td className="py-2 px-3 whitespace-nowrap"><RemainingDaysBadge endDate={amc.endDate} /></td>}
                {visibleCols.status       && <td className="py-2 px-3 whitespace-nowrap"><AMCStatusBadge status={amc.status} /></td>}
                <td className="py-2 px-3" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                        <MoreVertical size={13} />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => navigate(`/amc/${amc.id}`)}>
                        <Eye size={13} className="mr-2" /> View
                      </DropdownMenuItem>
                      {canEdit && <>
                        <DropdownMenuItem onClick={() => navigate(`/amc/${amc.id}/edit`)}>
                          <Pencil size={13} className="mr-2" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive" onClick={() => setDeleteId(amc.id)}>
                          <Trash2 size={13} className="mr-2" /> Cancel
                        </DropdownMenuItem>
                      </>}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ─────────────────────────────────────── */}
      <div className="flex items-center justify-between mt-4">
        <p className="text-xs text-muted-foreground">
          Page {page} of {pages} · {filtered.length} total
        </p>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" className="h-7 w-7 p-0" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
            <ChevronLeft size={13} />
          </Button>
          {[...Array(Math.min(pages, 5))].map((_, i) => {
            const n = i + 1;
            return (
              <Button key={n} variant={page === n ? 'default' : 'outline'} size="sm"
                className="h-7 w-7 p-0 text-xs" onClick={() => setPage(n)}>{n}</Button>
            );
          })}
          <Button variant="outline" size="sm" className="h-7 w-7 p-0" disabled={page === pages} onClick={() => setPage((p) => p + 1)}>
            <ChevronRight size={13} />
          </Button>
        </div>
      </div>

      {/* ── Delete Dialog ──────────────────────────────────── */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel AMC Contract?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark the contract as Cancelled. The record remains accessible via filters. This action can be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Cancel Contract
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
