/**
 * Task Report Page
 * Sectore 360 — Part 6
 */
import { useState, useMemo } from 'react';
import { ClipboardList } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { taskService } from '@/services/taskService';
import { ReportShell, DateRangeFilter } from './ReportShell';
import { toast } from 'sonner';

export default function TaskReportPage() {
  const today = new Date().toISOString().split('T')[0];
  const [from, setFrom] = useState('2026-07-01');
  const [to, setTo] = useState(today);
  const [status, setStatus] = useState('all');
  const [priority, setPriority] = useState('all');
  const [generated, setGenerated] = useState(false);
  const [rows, setRows] = useState<Awaited<ReturnType<typeof taskService.getAll>>>([]);

  const generate = async () => {
    if (from > to) { toast.error('From date must be before To date'); return; }
    const all = await taskService.getAll();
    const filtered = all.filter((t) => {
      const d = t.createdAt.split('T')[0];
      if (d < from || d > to) return false;
      if (status !== 'all' && t.status !== status) return false;
      if (priority !== 'all' && t.priority !== priority) return false;
      return true;
    });
    setRows(filtered);
    setGenerated(true);
    toast.success(`${filtered.length} tasks found`);
  };

  const resolutionTime = (t: (typeof rows)[0]) => {
    if (!t.completedAt) return '—';
    const diff = new Date(t.completedAt).getTime() - new Date(t.createdAt).getTime();
    const hours = Math.floor(diff / 3600000);
    return `${hours}h`;
  };

  const table = (
    <div className="overflow-x-auto">
      <table className="w-full whitespace-nowrap text-sm">
        <thead>
          <tr className="border-b border-border text-xs text-muted-foreground">
            <th className="px-4 py-3 text-left font-medium">Task #</th>
            <th className="px-4 py-3 text-left font-medium">Type</th>
            <th className="px-4 py-3 text-left font-medium">Engineer</th>
            <th className="px-4 py-3 text-left font-medium">Status</th>
            <th className="px-4 py-3 text-left font-medium">Priority</th>
            <th className="px-4 py-3 text-left font-medium">Created</th>
            <th className="px-4 py-3 text-left font-medium">Resolution</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((t) => (
            <tr key={t.id} className="border-b border-border last:border-0 hover:bg-muted/30">
              <td className="px-4 py-3 font-mono font-medium text-primary">{t.taskNumber}</td>
              <td className="px-4 py-3 text-muted-foreground">{t.taskType}</td>
              <td className="px-4 py-3">{t.engineerName ?? '—'}</td>
              <td className="px-4 py-3"><Badge variant="outline" className="text-xs">{t.status}</Badge></td>
              <td className="px-4 py-3"><Badge variant="outline" className="text-xs">{t.priority}</Badge></td>
              <td className="px-4 py-3 text-muted-foreground">{t.createdAt.split('T')[0]}</td>
              <td className="px-4 py-3 text-muted-foreground">{resolutionTime(t)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && <p className="text-center py-8 text-sm text-muted-foreground">No tasks found for selected filters</p>}
    </div>
  );

  return (
    <ReportShell
      title="Task Report"
      icon={<ClipboardList size={18} className="text-primary" />}
      rowCount={rows.length}
      generated={generated}
      onGenerate={generate}
      table={table}
      filters={
        <>
          <DateRangeFilter from={from} to={to} onFrom={setFrom} onTo={setTo} />
          <div className="flex flex-col gap-1">
            <Label className="text-xs">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {['Pending','Assigned','Accepted','Working','Completed','Closed','Cancelled'].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs">Priority</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                {['Low','Medium','High','Critical','Emergency'].map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </>
      }
    />
  );
}
