/**
 * AMC Report Page
 * Sectore 360 — Part 6
 */
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ReportShell } from './ReportShell';
import { AMCStatusBadge } from '@/components/amc/AMCBadges';
import { FileText } from 'lucide-react';

interface AMCRow {
  amcNumber: string; customer: string; contractType: string;
  startDate: string; endDate: string; totalVisits: number;
  completedVisits: number; pendingVisits: number; status: string; amount: string;
}

const SEED: AMCRow[] = [
  { amcNumber: 'AMC2024-001', customer: 'Tech Corp India', contractType: 'Comprehensive', startDate: '2024-01-01', endDate: '2024-12-31', totalVisits: 12, completedVisits: 7, pendingVisits: 5, status: 'Active', amount: '₹1,20,000' },
  { amcNumber: 'AMC2024-002', customer: 'Global Solutions', contractType: 'Basic', startDate: '2024-03-01', endDate: '2025-02-28', totalVisits: 4, completedVisits: 2, pendingVisits: 2, status: 'Active', amount: '₹45,000' },
  { amcNumber: 'AMC2023-008', customer: 'Metro Systems', contractType: 'Labour Only', startDate: '2023-06-01', endDate: '2024-05-31', totalVisits: 6, completedVisits: 6, pendingVisits: 0, status: 'Expired', amount: '₹60,000' },
  { amcNumber: 'AMC2024-005', customer: 'Sunrise Enterprises', contractType: 'Comprehensive', startDate: '2024-04-01', endDate: '2025-03-31', totalVisits: 8, completedVisits: 3, pendingVisits: 5, status: 'Active', amount: '₹95,000' },
  { amcNumber: 'AMC2024-007', customer: 'City Municipal Corp', contractType: 'Breakdown Only', startDate: '2024-02-15', endDate: '2025-02-14', totalVisits: 0, completedVisits: 0, pendingVisits: 0, status: 'Active', amount: '₹30,000' },
];

export default function AMCReportPage() {
  const [from, setFrom] = useState('2024-01-01');
  const [to, setTo] = useState('2026-07-21');
  const [status, setStatus] = useState('all');
  const [contractType, setContractType] = useState('all');
  const [generated, setGenerated] = useState(false);
  const [rows, setRows] = useState<AMCRow[]>([]);

  const generate = () => {
    let r = SEED;
    if (status !== 'all') r = r.filter((x) => x.status === status);
    if (contractType !== 'all') r = r.filter((x) => x.contractType === contractType);
    setRows(r);
    setGenerated(true);
  };

  const filters = (
    <div className="flex flex-wrap gap-3 items-end">
      <div className="flex flex-col gap-1"><Label className="text-xs">From</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-36" /></div>
      <div className="flex flex-col gap-1"><Label className="text-xs">To</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-36" /></div>
      <div className="flex flex-col gap-1">
        <Label className="text-xs">Status</Label>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="Active">Active</SelectItem>
            <SelectItem value="Expired">Expired</SelectItem>
            <SelectItem value="Suspended">Suspended</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1">
        <Label className="text-xs">Contract Type</Label>
        <Select value={contractType} onValueChange={setContractType}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="Comprehensive">Comprehensive</SelectItem>
            <SelectItem value="Basic">Basic</SelectItem>
            <SelectItem value="Labour Only">Labour Only</SelectItem>
            <SelectItem value="Breakdown Only">Breakdown Only</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  const table = (
    <table className="w-full whitespace-nowrap text-sm">
      <thead>
        <tr className="border-b border-border text-xs text-muted-foreground">
          {['AMC Number','Customer','Contract Type','Start Date','End Date','Total Visits','Completed','Pending','Status','Amount'].map((h) => (
            <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.amcNumber} className="border-b border-border last:border-0 hover:bg-muted/30">
            <td className="px-4 py-3 font-mono text-xs font-medium">{r.amcNumber}</td>
            <td className="px-4 py-3 font-medium">{r.customer}</td>
            <td className="px-4 py-3"><Badge variant="outline" className="text-xs">{r.contractType}</Badge></td>
            <td className="px-4 py-3 text-xs text-muted-foreground">{r.startDate}</td>
            <td className="px-4 py-3 text-xs text-muted-foreground">{r.endDate}</td>
            <td className="px-4 py-3">{r.totalVisits}</td>
            <td className="px-4 py-3 text-success">{r.completedVisits}</td>
            <td className="px-4 py-3 text-warning">{r.pendingVisits}</td>
            <td className="px-4 py-3"><AMCStatusBadge status={r.status as never} /></td>
            <td className="px-4 py-3 font-mono text-xs font-medium">{r.amount}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <ReportShell title="AMC Report" icon={<FileText size={18} className="text-primary" />} filters={filters} table={table} rowCount={rows.length} onGenerate={generate} generated={generated} />
  );
}
