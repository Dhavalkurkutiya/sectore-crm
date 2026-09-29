/**
 * Audit Log Page
 * Sectore 360 — Part 6
 */
import { useState, useMemo, useEffect, useCallback } from 'react';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { auditService, type AuditLog, type AuditEventType } from '@/services/auditService';
import { toast } from 'sonner';
import { ScrollText, Search, Download, ChevronLeft, ChevronRight } from 'lucide-react';

const EVENT_TYPES: AuditEventType[] = [
  'Login','Logout','FailedLogin',
  'PasswordReset','PasswordChanged',
  'UserCreated','UserEdited','UserDeleted','UserActivated','UserDeactivated',
  'Create','Update','Delete','Restore','Assignment','StatusChange',
];

const EVENT_COLORS: Record<AuditEventType, string> = {
  Login:            'bg-success/10 text-success border-0',
  Logout:           'bg-muted text-muted-foreground border-0',
  FailedLogin:      'bg-destructive/10 text-destructive border-0',
  PasswordReset:    'bg-warning/10 text-warning border-0',
  PasswordChanged:  'bg-info/10 text-info border-0',
  UserCreated:      'bg-primary/10 text-primary border-0',
  UserEdited:       'bg-info/10 text-info border-0',
  UserDeleted:      'bg-destructive/10 text-destructive border-0',
  UserActivated:    'bg-success/10 text-success border-0',
  UserDeactivated:  'bg-orange-500/10 text-orange-600 border-0',
  Create:           'bg-primary/10 text-primary border-0',
  Update:           'bg-info/10 text-info border-0',
  Delete:           'bg-destructive/10 text-destructive border-0',
  Restore:          'bg-warning/10 text-warning border-0',
  Assignment:       'bg-purple-500/10 text-purple-600 border-0',
  StatusChange:     'bg-orange-500/10 text-orange-600 border-0',
};

const PAGE_SIZE = 15;

export default function AuditLogPage() {
  const today = new Date().toISOString().split('T')[0];
  const [from, setFrom] = useState('2026-07-01');
  const [to, setTo] = useState(today);
  const [eventType, setEventType] = useState<'all' | AuditEventType>('all');
  const [userId, setUserId] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<AuditLog | null>(null);

  const [rows, setRows] = useState<AuditLog[]>([]);
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);

  // Load users once
  useEffect(() => {
    auditService.getUniqueUsers().then(setUsers).catch(() => setUsers([]));
  }, []);

  // Reload rows whenever filters change
  useEffect(() => {
    setPage(1);
    auditService.getFiltered({
      fromDate: from,
      toDate: to,
      eventType: eventType === 'all' ? undefined : eventType,
      userId: userId === 'all' ? undefined : userId,
      search: search || undefined,
    }).then(setRows).catch(() => setRows([]));
  }, [from, to, eventType, userId, search]);

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const pageRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleExport = () => {
    if (rows.length === 0) { toast.warning('No data to export'); return; }
    toast.success(`Exporting ${rows.length} audit log records as CSV`);
  };

  const fmtTime = (iso: string) =>
    new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-4 pb-8">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <ScrollText size={18} className="text-primary" /> Audit Log
            </h1>
            <p className="text-sm text-muted-foreground">System-wide event tracking for compliance and security</p>
          </div>
          <Button size="sm" variant="outline" onClick={handleExport}>
            <Download size={13} className="mr-1.5" /> Export CSV
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex flex-col gap-1">
                <Label className="text-xs">From Date</Label>
                <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-36" />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs">To Date</Label>
                <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-36" />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs">Event Type</Label>
                <Select value={eventType} onValueChange={(v) => setEventType(v as typeof eventType)}>
                  <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Events</SelectItem>
                    {EVENT_TYPES.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs">User</Label>
                <Select value={userId} onValueChange={setUserId}>
                  <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Users</SelectItem>
                    {users.map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="relative flex-1 min-w-48">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <Input placeholder="Search resource, description…" className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <Card>
          <CardHeader className="pb-2 pt-3 px-4 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold">{rows.length} records</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full whitespace-nowrap text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground">
                    <th className="px-4 py-3 text-left font-medium">Event</th>
                    <th className="px-4 py-3 text-left font-medium">User</th>
                    <th className="px-4 py-3 text-left font-medium">Role</th>
                    <th className="px-4 py-3 text-left font-medium">Resource</th>
                    <th className="px-4 py-3 text-left font-medium">Description</th>
                    <th className="px-4 py-3 text-left font-medium">IP Address</th>
                    <th className="px-4 py-3 text-left font-medium">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((log) => (
                    <tr
                      key={log.id}
                      className="border-b border-border last:border-0 hover:bg-muted/30 cursor-pointer"
                      onClick={() => setSelected(log)}
                    >
                      <td className="px-4 py-3">
                        <Badge className={`text-xs ${EVENT_COLORS[log.eventType]}`}>{log.eventType}</Badge>
                      </td>
                      <td className="px-4 py-3 font-medium">{log.userName}</td>
                      <td className="px-4 py-3 text-muted-foreground capitalize">{log.userRole}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs bg-muted px-2 py-0.5 rounded font-mono">{log.resource}</span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground max-w-xs truncate">{log.description}</td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{log.ipAddress}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{fmtTime(log.timestamp)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {rows.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <ScrollText size={32} className="mx-auto mb-3 opacity-20" />
                  <p className="text-sm">No audit records match the selected filters</p>
                </div>
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                <span className="text-xs text-muted-foreground">Page {page} of {totalPages}</span>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" className="h-7 w-7 p-0" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                    <ChevronLeft size={13} />
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 w-7 p-0" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>
                    <ChevronRight size={13} />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!selected} onOpenChange={(v) => { if (!v) setSelected(null); }}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selected && <Badge className={`text-xs ${EVENT_COLORS[selected.eventType]}`}>{selected.eventType}</Badge>}
              Audit Detail
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="flex flex-col gap-3 text-sm">
              {([
                ['Event', selected.eventType],
                ['User', selected.userName],
                ['Role', selected.userRole],
                ['Time', fmtTime(selected.timestamp)],
                ['IP Address', selected.ipAddress],
                ['Resource', selected.resource],
                ['Resource ID', selected.resourceId ?? '—'],
                ['Description', selected.description],
                ['Old Value', selected.oldValue ?? '—'],
                ['New Value', selected.newValue ?? '—'],
              ] as [string, string][]).map(([label, value]) => (
                <div key={label} className="flex gap-3">
                  <span className="text-muted-foreground w-28 shrink-0 text-xs font-medium">{label}</span>
                  <span className="text-foreground flex-1 break-words">{value}</span>
                </div>
              ))}
              <Button variant="outline" className="mt-2" onClick={() => setSelected(null)}>Close</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
