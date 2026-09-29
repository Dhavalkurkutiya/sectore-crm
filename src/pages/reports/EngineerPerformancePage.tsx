/**
 * Engineer Performance Report
 * Sectore 360 — Part 6
 */
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ReportShell } from './ReportShell';
import { TrendingUp } from 'lucide-react';

interface EngRow {
  engineer: string; employeeId: string; assigned: number; completed: number;
  pending: number; cancelled: number; avgResolution: string; onTime: number; rating: number;
}

const SEED: EngRow[] = [
  { engineer: 'Rahul Sharma', employeeId: 'EMP001', assigned: 45, completed: 40, pending: 4, cancelled: 1, avgResolution: '3.2 hrs', onTime: 88, rating: 4.5 },
  { engineer: 'Priya Nair', employeeId: 'EMP002', assigned: 38, completed: 36, pending: 2, cancelled: 0, avgResolution: '2.8 hrs', onTime: 94, rating: 4.8 },
  { engineer: 'Arun Kumar', employeeId: 'EMP003', assigned: 52, completed: 45, pending: 5, cancelled: 2, avgResolution: '4.1 hrs', onTime: 82, rating: 4.1 },
  { engineer: 'Deepa Menon', employeeId: 'EMP004', assigned: 29, completed: 27, pending: 2, cancelled: 0, avgResolution: '2.5 hrs', onTime: 96, rating: 4.9 },
  { engineer: 'Sanjay Gupta', employeeId: 'EMP005', assigned: 61, completed: 55, pending: 4, cancelled: 2, avgResolution: '3.7 hrs', onTime: 79, rating: 3.9 },
];

const ratingColor = (r: number) =>
  r >= 4.5 ? 'bg-success/10 text-success border-0' :
  r >= 4.0 ? 'bg-primary/10 text-primary border-0' :
  'bg-warning/10 text-warning border-0';

export default function EngineerPerformancePage() {
  const [from, setFrom] = useState('2026-07-01');
  const [to, setTo] = useState('2026-07-21');
  const [engineer, setEngineer] = useState('all');
  const [generated, setGenerated] = useState(false);
  const [rows, setRows] = useState<EngRow[]>([]);

  const generate = () => {
    const filtered = engineer === 'all' ? SEED : SEED.filter((r) => r.employeeId === engineer);
    setRows(filtered);
    setGenerated(true);
  };

  const filters = (
    <div className="flex flex-wrap gap-3 items-end">
      <div className="flex flex-col gap-1"><Label className="text-xs">From</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-36" /></div>
      <div className="flex flex-col gap-1"><Label className="text-xs">To</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-36" /></div>
      <div className="flex flex-col gap-1">
        <Label className="text-xs">Engineer</Label>
        <Select value={engineer} onValueChange={setEngineer}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Engineers</SelectItem>
            {SEED.map((e) => <SelectItem key={e.employeeId} value={e.employeeId}>{e.engineer}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  const table = (
    <table className="w-full whitespace-nowrap text-sm">
      <thead>
        <tr className="border-b border-border text-xs text-muted-foreground">
          {['Engineer','ID','Assigned','Completed','Pending','Cancelled','Avg Resolution','On-Time %','Rating'].map((h) => (
            <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.employeeId} className="border-b border-border last:border-0 hover:bg-muted/30">
            <td className="px-4 py-3 font-medium">{r.engineer}</td>
            <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{r.employeeId}</td>
            <td className="px-4 py-3">{r.assigned}</td>
            <td className="px-4 py-3 text-success">{r.completed}</td>
            <td className="px-4 py-3 text-warning">{r.pending}</td>
            <td className="px-4 py-3 text-destructive">{r.cancelled}</td>
            <td className="px-4 py-3 font-mono text-xs">{r.avgResolution}</td>
            <td className="px-4 py-3">
              <span className={r.onTime >= 90 ? 'text-success font-medium' : r.onTime >= 80 ? 'text-warning font-medium' : 'text-destructive font-medium'}>{r.onTime}%</span>
            </td>
            <td className="px-4 py-3"><Badge className={`text-xs ${ratingColor(r.rating)}`}>{r.rating} ★</Badge></td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <ReportShell title="Engineer Performance" icon={<TrendingUp size={18} className="text-primary" />} filters={filters} table={table} rowCount={rows.length} onGenerate={generate} generated={generated} />
  );
}
