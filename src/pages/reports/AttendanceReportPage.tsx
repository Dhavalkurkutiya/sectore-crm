/**
 * Attendance Report Page
 * Sectore 360 — Part 6 (Fixed: queries real DB via attendanceService)
 */
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ReportShell } from './ReportShell';
import { CalendarCheck } from 'lucide-react';
import { attendanceService } from '@/services/attendanceService';
import type { Attendance } from '@/types/engineer';

const STATUS_COLORS: Record<string, string> = {
  checked_in:   'bg-primary/10 text-primary border-0',
  checked_out:  'bg-success/10 text-success border-0',
  Present:      'bg-success/10 text-success border-0',
  Absent:       'bg-destructive/10 text-destructive border-0',
  'Half Day':   'bg-warning/10 text-warning border-0',
  Leave:        'bg-muted text-muted-foreground border-0',
};

function statusLabel(s: string) {
  if (s === 'checked_in')  return 'Checked In';
  if (s === 'checked_out') return 'Present';
  return s;
}

function fmtTime(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function AttendanceReportPage() {
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = today.slice(0, 8) + '01';
  const [from, setFrom] = useState(monthStart);
  const [to, setTo]     = useState(today);
  const [engineerFilter, setEngineerFilter] = useState('all');
  const [statusFilter, setStatusFilter]     = useState('all');
  const [generated, setGenerated] = useState(false);
  const [rows, setRows] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(false);

  // derive unique engineers from loaded rows for filter dropdown
  const engineerNames = Array.from(new Set(rows.map((r) => r.engineerName).filter(Boolean)));

  const generate = async () => {
    setLoading(true);
    try {
      // Fetch all attendance for the date range (admin view — no engineer filter)
      const days = Math.ceil((new Date(to).getTime() - new Date(from).getTime()) / 86400000) + 1;
      const all  = await attendanceService.getHistory(undefined, Math.max(days, 90));
      // Filter by date range manually since getHistory only accepts days count
      const inRange = all.filter((r) => r.date >= from && r.date <= to);
      let filtered = inRange;
      if (engineerFilter !== 'all') filtered = filtered.filter((r) => r.engineerName === engineerFilter);
      if (statusFilter   !== 'all') filtered = filtered.filter((r) => r.status === statusFilter);
      setRows(filtered);
      setGenerated(true);
    } finally {
      setLoading(false);
    }
  };

  const filters = (
    <div className="flex flex-wrap gap-3 items-end">
      <div className="flex flex-col gap-1">
        <Label className="text-xs">From</Label>
        <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-36" />
      </div>
      <div className="flex flex-col gap-1">
        <Label className="text-xs">To</Label>
        <Input type="date" value={to}   onChange={(e) => setTo(e.target.value)}   className="w-36" />
      </div>
      <div className="flex flex-col gap-1">
        <Label className="text-xs">Engineer</Label>
        <Select value={engineerFilter} onValueChange={setEngineerFilter}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Engineers</SelectItem>
            {engineerNames.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1">
        <Label className="text-xs">Status</Label>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="checked_in">Checked In</SelectItem>
            <SelectItem value="checked_out">Present</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  const table = (
    <table className="w-full whitespace-nowrap text-sm">
      <thead>
        <tr className="border-b border-border text-xs text-muted-foreground">
          {['Date', 'Engineer', 'Check In', 'Check Out', 'Hours', 'Status'].map((h) => (
            <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/30">
            <td className="px-4 py-3 font-mono text-xs">{r.date}</td>
            <td className="px-4 py-3 font-medium">{r.engineerName}</td>
            <td className="px-4 py-3 font-mono text-xs">{fmtTime(r.checkInTime)}</td>
            <td className="px-4 py-3 font-mono text-xs">{fmtTime(r.checkOutTime)}</td>
            <td className="px-4 py-3 font-mono text-xs">
              {r.workingHours != null ? `${r.workingHours.toFixed(1)}h` : '—'}
            </td>
            <td className="px-4 py-3">
              <Badge className={`text-xs ${STATUS_COLORS[r.status] ?? 'bg-muted'}`}>
                {statusLabel(r.status)}
              </Badge>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <ReportShell
      title="Attendance Report"
      icon={<CalendarCheck size={18} className="text-primary" />}
      filters={filters}
      table={table}
      rowCount={rows.length}
      onGenerate={generate}
      generated={generated}
      loading={loading}
    />
  );
}
