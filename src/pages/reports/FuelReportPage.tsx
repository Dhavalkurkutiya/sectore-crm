/**
 * Fuel Report Page
 * Sectore 360 — Part 6
 */
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ReportShell } from './ReportShell';
import { Fuel } from 'lucide-react';

interface FuelRow {
  engineer: string; employeeId: string; date: string;
  vehicle: string; liters: number; amount: number; odometer: number; purpose: string;
}

const SEED: FuelRow[] = [
  { engineer: 'Rahul Sharma', employeeId: 'EMP001', date: '2026-07-21', vehicle: 'KA01AB1234', liters: 5.0, amount: 460, odometer: 12500, purpose: 'Customer Visit — Tech Corp' },
  { engineer: 'Priya Nair',   employeeId: 'EMP002', date: '2026-07-21', vehicle: 'KA02CD5678', liters: 4.5, amount: 414, odometer: 8900,  purpose: 'Task TK-2024-045' },
  { engineer: 'Arun Kumar',   employeeId: 'EMP003', date: '2026-07-20', vehicle: 'KA03EF9012', liters: 6.0, amount: 552, odometer: 15200, purpose: 'Customer Visit — Metro Systems' },
  { engineer: 'Sanjay Gupta', employeeId: 'EMP005', date: '2026-07-20', vehicle: 'KA05IJ3456', liters: 7.5, amount: 690, odometer: 22100, purpose: 'Multiple site visits' },
  { engineer: 'Rahul Sharma', employeeId: 'EMP001', date: '2026-07-19', vehicle: 'KA01AB1234', liters: 4.0, amount: 368, odometer: 12350, purpose: 'Task TK-2024-042' },
];

export default function FuelReportPage() {
  const [from, setFrom] = useState('2026-07-01');
  const [to, setTo] = useState('2026-07-21');
  const [engineer, setEngineer] = useState('all');
  const [generated, setGenerated] = useState(false);
  const [rows, setRows] = useState<FuelRow[]>([]);

  const generate = () => {
    const r = engineer === 'all' ? SEED : SEED.filter((x) => x.employeeId === engineer);
    setRows(r);
    setGenerated(true);
  };

  const totalLiters = rows.reduce((sum, r) => sum + r.liters, 0).toFixed(1);
  const totalAmount = rows.reduce((sum, r) => sum + r.amount, 0);

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
            {SEED.filter((e, i, a) => a.findIndex((x) => x.employeeId === e.employeeId) === i).map((e) => (
              <SelectItem key={e.employeeId} value={e.employeeId}>{e.engineer}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  const table = (
    <>
      {generated && rows.length > 0 && (
        <div className="flex gap-6 px-4 py-3 border-b border-border bg-muted/20">
          <div className="text-sm"><span className="text-muted-foreground">Total Litres: </span><span className="font-semibold">{totalLiters} L</span></div>
          <div className="text-sm"><span className="text-muted-foreground">Total Amount: </span><span className="font-semibold">₹{totalAmount.toLocaleString()}</span></div>
        </div>
      )}
      <table className="w-full whitespace-nowrap text-sm">
        <thead>
          <tr className="border-b border-border text-xs text-muted-foreground">
            {['Date','Engineer','Employee ID','Vehicle','Litres','Amount (₹)','Odometer','Purpose'].map((h) => (
              <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/30">
              <td className="px-4 py-3 font-mono text-xs">{r.date}</td>
              <td className="px-4 py-3 font-medium">{r.engineer}</td>
              <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{r.employeeId}</td>
              <td className="px-4 py-3 font-mono text-xs">{r.vehicle}</td>
              <td className="px-4 py-3">{r.liters} L</td>
              <td className="px-4 py-3 font-mono text-xs">₹{r.amount}</td>
              <td className="px-4 py-3 font-mono text-xs">{r.odometer.toLocaleString()}</td>
              <td className="px-4 py-3 text-muted-foreground text-xs max-w-xs truncate">{r.purpose}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );

  return (
    <ReportShell title="Fuel Report" icon={<Fuel size={18} className="text-primary" />} filters={filters} table={table} rowCount={rows.length} onGenerate={generate} generated={generated} />
  );
}
