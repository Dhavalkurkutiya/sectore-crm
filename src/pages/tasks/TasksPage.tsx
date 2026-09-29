/**
 * Tasks List Page
 * Sectore 360 — Phase 1, Part 3
 */
import { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Card, CardContent } from '@/components/ui/card';
import { TaskStatusBadge, TaskPriorityBadge, TaskTypeBadge } from '@/components/task/TaskBadges';
import { taskService } from '@/services/taskService';
import { customerService } from '@/services/customerService';
import { assetService } from '@/services/assetService';
import { usersApi } from '@/lib/api';
import type { Task } from '@/types/task';
import { TASK_STATUSES, TASK_PRIORITIES, TASK_TYPES } from '@/types/task';
import type { Customer, Asset } from '@/types/customer';
import { toast } from 'sonner';
import {
  Plus, Search, SlidersHorizontal, Columns3, Download,
  Eye, Pencil, Trash2, MoreHorizontal, ClipboardList,
  ChevronLeft, ChevronRight, UserCheck, RefreshCw,
} from 'lucide-react';

const PAGE_SIZE_OPTIONS = [10, 25, 50];

const ALL_COLUMNS = [
  { key: 'taskNumber', label: 'Task #' },
  { key: 'customer',   label: 'Customer' },
  { key: 'asset',      label: 'Asset' },
  { key: 'taskType',   label: 'Type' },
  { key: 'priority',   label: 'Priority' },
  { key: 'status',     label: 'Status' },
  { key: 'engineer',   label: 'Engineer' },
  { key: 'visitDate',  label: 'Visit Date' },
  { key: 'createdAt',  label: 'Created' },
];

function exportCSV(tasks: Task[], customers: Customer[], assets: Asset[]) {
  const custMap = Object.fromEntries(customers.map((c) => [c.id, c.companyName]));
  const assetMap = Object.fromEntries(assets.map((a) => [a.id, `${a.code} ${a.deviceType}`]));
  const header = 'Task Number,Customer,Asset,Type,Priority,Status,Engineer,Visit Date,Created\n';
  const rows = tasks.map((t) =>
    [
      t.taskNumber,
      `"${custMap[t.customerId] ?? t.customerId}"`,
      `"${assetMap[t.assetId] ?? t.assetId}"`,
      `"${t.taskType}"`,
      t.priority,
      t.status,
      t.engineerName ?? '',
      t.expectedVisitDate ?? '',
      t.createdAt.slice(0, 10),
    ].join(',')
  ).join('\n');
  const blob = new Blob([header + rows], { type: 'text/csv' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = `tasks_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
}

export default function TasksPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const byName = user?.name ?? 'System';
  const [tasks, setTasks]         = useState<Task[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [assets, setAssets]       = useState<Asset[]>([]);
  const [loading, setLoading]     = useState(true);

  // Filters
  const [search, setSearch]           = useState('');
  const [filterStatus, setFilterStatus]     = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterType, setFilterType]         = useState('all');
  const [filterEngineer, setFilterEngineer] = useState('all');
  const [showCancelled, setShowCancelled]   = useState(false);

  // Pagination
  const [page, setPage]         = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Sort
  const [sortKey, setSortKey]     = useState<string>('createdAt');
  const [sortDir, setSortDir]     = useState<'asc' | 'desc'>('desc');

  // Column visibility
  const [visibleCols, setVisibleCols] = useState<Set<string>>(
    new Set(ALL_COLUMNS.map((c) => c.key))
  );

  // Selection
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Bulk dialogs
  const [bulkAssignOpen, setBulkAssignOpen]   = useState(false);
  const [bulkStatusOpen, setBulkStatusOpen]   = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen]   = useState(false);
  const [bulkEngineer, setBulkEngineer]       = useState('');
  const [bulkStatus, setBulkStatus]           = useState('');
  const [deleteTarget, setDeleteTarget]       = useState<Task | null>(null);
  const [engineerList, setEngineerList]       = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    usersApi.getEngineers()
      .then((list) => setEngineerList(list.map((u) => ({ id: u.id, name: u.name }))))
      .catch(() => {});
  }, []);

  const isEngineer = user?.role === 'engineer';
  const isCustomer = user?.role === 'customer';

  const load = useCallback(async () => {
    setLoading(true);
    // Engineer: only their assigned tasks. Customer: only their own tickets. Admin: all.
    const taskOpts = isEngineer && user?.id
      ? { includeCancelled: showCancelled, engineerId: user.id }
      : isCustomer && user?.customerId
        ? { includeCancelled: showCancelled, customerId: user.customerId }
        : { includeCancelled: showCancelled };

    const [t, c, a] = await Promise.all([
      taskService.list(taskOpts),
      customerService.getAll(),
      assetService.getAll(),
    ]);
    setTasks(t); setCustomers(c); setAssets(a);
    setLoading(false);
  }, [showCancelled, isEngineer, isCustomer, user?.id, user?.customerId]);

  useEffect(() => { load(); }, [load]);

  const custMap  = useMemo(() => Object.fromEntries(customers.map((c) => [c.id, c])), [customers]);
  const assetMap = useMemo(() => Object.fromEntries(assets.map((a) => [a.id, a])), [assets]);

  const engineers = useMemo(() => {
    const names = new Set(tasks.map((t) => t.engineerName).filter(Boolean));
    return [...names] as string[];
  }, [tasks]);

  const filtered = useMemo(() => {
    let list = [...tasks];
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((t) =>
        t.taskNumber.toLowerCase().includes(q) ||
        (custMap[t.customerId]?.companyName ?? '').toLowerCase().includes(q) ||
        (assetMap[t.assetId]?.serialNumber ?? '').toLowerCase().includes(q) ||
        (t.engineerName ?? '').toLowerCase().includes(q) ||
        t.status.toLowerCase().includes(q) ||
        t.priority.toLowerCase().includes(q)
      );
    }
    if (filterStatus !== 'all')   list = list.filter((t) => t.status === filterStatus);
    if (filterPriority !== 'all') list = list.filter((t) => t.priority === filterPriority);
    if (filterType !== 'all')     list = list.filter((t) => t.taskType === filterType);
    if (filterEngineer !== 'all') list = list.filter((t) => (t.engineerName ?? 'Unassigned') === filterEngineer);

    // Sort
    list.sort((a, b) => {
      let av = '', bv = '';
      if (sortKey === 'taskNumber')  { av = a.taskNumber; bv = b.taskNumber; }
      else if (sortKey === 'customer') { av = custMap[a.customerId]?.companyName ?? ''; bv = custMap[b.customerId]?.companyName ?? ''; }
      else if (sortKey === 'status')   { av = a.status; bv = b.status; }
      else if (sortKey === 'priority') { av = a.priority; bv = b.priority; }
      else if (sortKey === 'visitDate') { av = a.expectedVisitDate ?? ''; bv = b.expectedVisitDate ?? ''; }
      else if (sortKey === 'createdAt') { av = a.createdAt; bv = b.createdAt; }
      const cmp = av.localeCompare(bv);
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [tasks, search, filterStatus, filterPriority, filterType, filterEngineer, sortKey, sortDir, custMap, assetMap]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated  = filtered.slice((page - 1) * pageSize, page * pageSize);

  const toggleSort = (key: string) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
    setPage(1);
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const toggleAll = () => {
    if (selected.size === paginated.length) setSelected(new Set());
    else setSelected(new Set(paginated.map((t) => t.id)));
  };

  const handleDelete = async (task: Task) => {
    await taskService.softDelete(task.id, byName);
    toast.success(`Task ${task.taskNumber} cancelled.`);
    load();
    setDeleteTarget(null);
  };

  const handleBulkAssign = async () => {
    if (!bulkEngineer) return;
    const eng = engineerList.find((e) => e.id === bulkEngineer);
    if (!eng) return;
    await Promise.all([...selected].map((id) =>
      taskService.assignEngineer(id, eng.id, eng.name, byName)
    ));
    toast.success(`Engineer assigned to ${selected.size} task(s).`);
    setSelected(new Set()); setBulkAssignOpen(false); load();
  };

  const handleBulkStatus = async () => {
    if (!bulkStatus) return;
    await Promise.all([...selected].map((id) =>
      taskService.updateStatus(id, bulkStatus as Task['status'], byName)
    ));
    toast.success(`Status updated for ${selected.size} task(s).`);
    setSelected(new Set()); setBulkStatusOpen(false); load();
  };

  const handleBulkDelete = async () => {
    await Promise.all([...selected].map((id) => taskService.softDelete(id, byName)));
    toast.success(`${selected.size} task(s) cancelled.`);
    setSelected(new Set()); setBulkDeleteOpen(false); load();
  };

  const SortIcon = ({ col }: { col: string }) => (
    <span className="ml-1 text-muted-foreground text-xs">
      {sortKey === col ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
    </span>
  );

  return (
    <DashboardLayout>
      <PageHeader
        title="Service Tasks"
        description="Manage and track all customer service tasks."
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Tasks' }]}
        actions={
          <Button onClick={() => navigate('/tasks/new')} className="gap-2">
            <Plus size={16} />
            New Task
          </Button>
        }
      />

      {/* ── Filters bar ─────────────────────────────────────── */}
      <Card className="mb-4">
        <CardContent className="pt-4 pb-3">
          <div className="flex flex-col gap-3">
            {/* Row 1: Search + column toggle + export */}
            <div className="flex flex-col md:flex-row gap-2">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <Input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  placeholder="Search by task #, company, engineer, serial, status…"
                  className="pl-8 h-9 text-sm" />
              </div>
              <div className="flex gap-2 shrink-0">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1.5 h-9">
                      <Columns3 size={14} /><span className="hidden sm:inline">Columns</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    <DropdownMenuLabel className="text-xs">Toggle Columns</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {ALL_COLUMNS.map((col) => (
                      <DropdownMenuCheckboxItem
                        key={col.key}
                        checked={visibleCols.has(col.key)}
                        onCheckedChange={(v) => setVisibleCols((prev) => {
                          const next = new Set(prev);
                          v ? next.add(col.key) : next.delete(col.key);
                          return next;
                        })}
                      >{col.label}</DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button variant="outline" size="sm" className="gap-1.5 h-9"
                  onClick={() => exportCSV(filtered, customers, assets)}>
                  <Download size={14} /><span className="hidden sm:inline">Export</span>
                </Button>
              </div>
            </div>

            {/* Row 2: Filters */}
            <div className="flex flex-wrap gap-2">
              <Select value={filterStatus} onValueChange={(v) => { setFilterStatus(v); setPage(1); }}>
                <SelectTrigger className="h-8 text-xs w-36"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {TASK_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterPriority} onValueChange={(v) => { setFilterPriority(v); setPage(1); }}>
                <SelectTrigger className="h-8 text-xs w-32"><SelectValue placeholder="Priority" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  {TASK_PRIORITIES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterType} onValueChange={(v) => { setFilterType(v); setPage(1); }}>
                <SelectTrigger className="h-8 text-xs w-40"><SelectValue placeholder="Task Type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {TASK_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterEngineer} onValueChange={(v) => { setFilterEngineer(v); setPage(1); }}>
                <SelectTrigger className="h-8 text-xs w-36"><SelectValue placeholder="Engineer" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Engineers</SelectItem>
                  <SelectItem value="Unassigned">Unassigned</SelectItem>
                  {engineers.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button variant={showCancelled ? 'default' : 'outline'} size="sm"
                className="h-8 text-xs gap-1"
                onClick={() => { setShowCancelled((v) => !v); setPage(1); }}>
                <SlidersHorizontal size={12} />
                {showCancelled ? 'Hide Cancelled' : 'Show Cancelled'}
              </Button>
              {(filterStatus !== 'all' || filterPriority !== 'all' || filterType !== 'all' || filterEngineer !== 'all' || search) && (
                <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground"
                  onClick={() => { setFilterStatus('all'); setFilterPriority('all'); setFilterType('all'); setFilterEngineer('all'); setSearch(''); setPage(1); }}>
                  Clear filters
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Bulk action bar ────────────────────────────────── */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 bg-primary/5 border border-primary/20 rounded-lg px-4 py-2 mb-3">
          <span className="text-sm font-medium text-primary">{selected.size} selected</span>
          <div className="flex gap-2 ml-auto">
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
              onClick={() => setBulkAssignOpen(true)}>
              <UserCheck size={12} /> Assign Engineer
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
              onClick={() => setBulkStatusOpen(true)}>
              <RefreshCw size={12} /> Change Status
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-destructive hover:text-destructive"
              onClick={() => setBulkDeleteOpen(true)}>
              <Trash2 size={12} /> Cancel Tasks
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
              onClick={() => exportCSV(tasks.filter((t) => selected.has(t.id)), customers, assets)}>
              <Download size={12} /> Export
            </Button>
          </div>
        </div>
      )}

      {/* ── Table ──────────────────────────────────────────── */}
      <div className="w-full overflow-x-auto rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10 px-3">
                <Checkbox
                  checked={paginated.length > 0 && selected.size === paginated.length}
                  onCheckedChange={toggleAll}
                />
              </TableHead>
              {visibleCols.has('taskNumber') && (
                <TableHead className="whitespace-nowrap cursor-pointer" onClick={() => toggleSort('taskNumber')}>
                  Task # <SortIcon col="taskNumber" />
                </TableHead>
              )}
              {visibleCols.has('customer') && (
                <TableHead className="whitespace-nowrap cursor-pointer" onClick={() => toggleSort('customer')}>
                  Customer <SortIcon col="customer" />
                </TableHead>
              )}
              {visibleCols.has('asset') && <TableHead className="whitespace-nowrap">Asset</TableHead>}
              {visibleCols.has('taskType') && <TableHead className="whitespace-nowrap">Type</TableHead>}
              {visibleCols.has('priority') && (
                <TableHead className="whitespace-nowrap cursor-pointer" onClick={() => toggleSort('priority')}>
                  Priority <SortIcon col="priority" />
                </TableHead>
              )}
              {visibleCols.has('status') && (
                <TableHead className="whitespace-nowrap cursor-pointer" onClick={() => toggleSort('status')}>
                  Status <SortIcon col="status" />
                </TableHead>
              )}
              {visibleCols.has('engineer') && <TableHead className="whitespace-nowrap">Engineer</TableHead>}
              {visibleCols.has('visitDate') && (
                <TableHead className="whitespace-nowrap cursor-pointer" onClick={() => toggleSort('visitDate')}>
                  Visit Date <SortIcon col="visitDate" />
                </TableHead>
              )}
              {visibleCols.has('createdAt') && (
                <TableHead className="whitespace-nowrap cursor-pointer" onClick={() => toggleSort('createdAt')}>
                  Created <SortIcon col="createdAt" />
                </TableHead>
              )}
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: visibleCols.size + 2 }).map((_, j) => (
                    <TableCell key={j}><div className="h-4 rounded bg-muted animate-pulse w-full max-w-[120px]" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : paginated.length === 0 ? (
              <TableRow>
                <TableCell colSpan={visibleCols.size + 2}>
                  <EmptyState icon={ClipboardList} title="No tasks found"
                    description="Try adjusting your search or filters, or create a new task." />
                </TableCell>
              </TableRow>
            ) : paginated.map((task) => {
              const cust  = custMap[task.customerId];
              const asset = assetMap[task.assetId];
              const today = new Date().toISOString().slice(0, 10);
              const overdue = task.expectedVisitDate && task.expectedVisitDate < today &&
                !['Completed', 'Closed', 'Cancelled'].includes(task.status);
              return (
                <TableRow
                  key={task.id}
                  className={`cursor-pointer hover:bg-muted/50 ${overdue ? 'bg-destructive/5' : ''}`}
                  onClick={() => navigate(`/tasks/${task.id}`)}
                >
                  <TableCell className="px-3" onClick={(e) => e.stopPropagation()}>
                    <Checkbox checked={selected.has(task.id)} onCheckedChange={() => toggleSelect(task.id)} />
                  </TableCell>
                  {visibleCols.has('taskNumber') && (
                    <TableCell className="whitespace-nowrap font-mono text-xs font-medium text-primary">
                      {task.taskNumber}
                      {overdue && <span className="ml-1 text-destructive text-xs">⚠</span>}
                    </TableCell>
                  )}
                  {visibleCols.has('customer') && (
                    <TableCell className="whitespace-nowrap max-w-[160px] truncate text-sm">
                      {cust?.companyName ?? task.customerId}
                    </TableCell>
                  )}
                  {visibleCols.has('asset') && (
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {asset ? `${asset.code}` : task.assetId}
                    </TableCell>
                  )}
                  {visibleCols.has('taskType') && (
                    <TableCell className="whitespace-nowrap"><TaskTypeBadge type={task.taskType} /></TableCell>
                  )}
                  {visibleCols.has('priority') && (
                    <TableCell className="whitespace-nowrap"><TaskPriorityBadge priority={task.priority} /></TableCell>
                  )}
                  {visibleCols.has('status') && (
                    <TableCell className="whitespace-nowrap"><TaskStatusBadge status={task.status} /></TableCell>
                  )}
                  {visibleCols.has('engineer') && (
                    <TableCell className="whitespace-nowrap text-sm">
                      {task.engineerName ?? <span className="text-muted-foreground text-xs">Unassigned</span>}
                    </TableCell>
                  )}
                  {visibleCols.has('visitDate') && (
                    <TableCell className={`whitespace-nowrap text-sm ${overdue ? 'text-destructive font-medium' : ''}`}>
                      {task.expectedVisitDate ?? '—'}
                    </TableCell>
                  )}
                  {visibleCols.has('createdAt') && (
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {task.createdAt.slice(0, 10)}
                    </TableCell>
                  )}
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                          <MoreHorizontal size={14} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem onClick={() => navigate(`/tasks/${task.id}`)} className="gap-2">
                          <Eye size={13} /> View
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate(`/tasks/${task.id}/edit`)} className="gap-2">
                          <Pencil size={13} /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="gap-2 text-destructive focus:text-destructive"
                          onClick={() => setDeleteTarget(task)}>
                          <Trash2 size={13} /> Cancel
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* ── Pagination ─────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 mt-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Rows per page:</span>
          <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
            <SelectTrigger className="h-7 w-16 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
            </SelectContent>
          </Select>
          <span>| {filtered.length} total</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
            <ChevronLeft size={14} />
          </Button>
          <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>
            <ChevronRight size={14} />
          </Button>
        </div>
      </div>

      {/* ── Delete confirmation ─────────────────────────────── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Task?</AlertDialogTitle>
            <AlertDialogDescription>
              Task <strong>{deleteTarget?.taskNumber}</strong> will be marked as Cancelled. This can be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget && handleDelete(deleteTarget)}>
              Cancel Task
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Bulk Assign Engineer ─────────────────────────────── */}
      <AlertDialog open={bulkAssignOpen} onOpenChange={setBulkAssignOpen}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Assign Engineer</AlertDialogTitle>
            <AlertDialogDescription>Assign an engineer to {selected.size} selected task(s).</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="px-1 py-2">
            <Select value={bulkEngineer} onValueChange={setBulkEngineer}>
              <SelectTrigger><SelectValue placeholder="Select engineer" /></SelectTrigger>
              <SelectContent>
                {engineerList.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkAssign} disabled={!bulkEngineer}>Assign</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Bulk Change Status ───────────────────────────────── */}
      <AlertDialog open={bulkStatusOpen} onOpenChange={setBulkStatusOpen}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Change Status</AlertDialogTitle>
            <AlertDialogDescription>Change status for {selected.size} selected task(s).</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="px-1 py-2">
            <Select value={bulkStatus} onValueChange={setBulkStatus}>
              <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
              <SelectContent>
                {TASK_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkStatus} disabled={!bulkStatus}>Update</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Bulk Delete ──────────────────────────────────────── */}
      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel {selected.size} Tasks?</AlertDialogTitle>
            <AlertDialogDescription>All selected tasks will be marked as Cancelled.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleBulkDelete}>
              Cancel Tasks
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
