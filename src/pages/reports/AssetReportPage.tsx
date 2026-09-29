/**
 * Asset Report Page
 * Sectore 360 — Part 6
 */
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ReportShell } from './ReportShell';
import { StatusBadge } from '@/components/customer/StatusBadge';
import { Server } from 'lucide-react';

interface AssetRow {
  code: string; brand: string; model: string; serialNumber: string;
  category: string; customer: string; installDate: string;
  warrantyExpiry: string; totalServices: number; lastService: string; status: string;
}

const SEED: AssetRow[] = [
  { code: 'AST-001', brand: 'LG', model: 'LT1836CXS', serialNumber: 'SN10293847', category: 'HVAC', customer: 'Tech Corp India', installDate: '2022-03-15', warrantyExpiry: '2025-03-15', totalServices: 8, lastService: '2026-06-10', status: 'Active' },
  { code: 'AST-002', brand: 'Daikin', model: 'FT50JXV1', serialNumber: 'SN20394857', category: 'HVAC', customer: 'Global Solutions', installDate: '2021-08-20', warrantyExpiry: '2024-08-20', totalServices: 12, lastService: '2026-07-01', status: 'Active' },
  { code: 'AST-003', brand: 'Cisco', model: 'RV340', serialNumber: 'SN30495867', category: 'Networking', customer: 'Metro Systems', installDate: '2023-01-10', warrantyExpiry: '2026-01-10', totalServices: 3, lastService: '2026-05-20', status: 'Active' },
  { code: 'AST-004', brand: 'Hikvision', model: 'DS-7608', serialNumber: 'SN40596877', category: 'Security', customer: 'Sunrise Enterprises', installDate: '2020-11-05', warrantyExpiry: '2023-11-05', totalServices: 15, lastService: '2026-04-15', status: 'Under Maintenance' },
  { code: 'AST-005', brand: 'ABB', model: 'ACS880', serialNumber: 'SN50697887', category: 'Electrical', customer: 'City Municipal Corp', installDate: '2019-07-22', warrantyExpiry: '2022-07-22', totalServices: 20, lastService: '2026-03-01', status: 'Inactive' },
];

export default function AssetReportPage() {
  const [category, setCategory] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [generated, setGenerated] = useState(false);
  const [rows, setRows] = useState<AssetRow[]>([]);

  const generate = () => {
    let r = SEED;
    if (category !== 'all') r = r.filter((x) => x.category === category);
    if (statusFilter !== 'all') r = r.filter((x) => x.status === statusFilter);
    setRows(r);
    setGenerated(true);
  };

  const filters = (
    <div className="flex flex-wrap gap-3 items-end">
      <div className="flex flex-col gap-1">
        <Label className="text-xs">Category</Label>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="HVAC">HVAC</SelectItem>
            <SelectItem value="Networking">Networking</SelectItem>
            <SelectItem value="Security">Security</SelectItem>
            <SelectItem value="Electrical">Electrical</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1">
        <Label className="text-xs">Status</Label>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="Active">Active</SelectItem>
            <SelectItem value="Inactive">Inactive</SelectItem>
            <SelectItem value="Under Maintenance">Under Maintenance</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  const table = (
    <table className="w-full whitespace-nowrap text-sm">
      <thead>
        <tr className="border-b border-border text-xs text-muted-foreground">
          {['Code','Brand / Model','Serial Number','Category','Customer','Install Date','Warranty Expiry','Services','Last Service','Status'].map((h) => (
            <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => {
          const expired = r.warrantyExpiry < new Date().toISOString().split('T')[0];
          return (
            <tr key={r.code} className="border-b border-border last:border-0 hover:bg-muted/30">
              <td className="px-4 py-3 font-mono text-xs font-medium">{r.code}</td>
              <td className="px-4 py-3"><div className="font-medium">{r.brand}</div><div className="text-xs text-muted-foreground">{r.model}</div></td>
              <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{r.serialNumber}</td>
              <td className="px-4 py-3"><Badge variant="outline" className="text-xs">{r.category}</Badge></td>
              <td className="px-4 py-3 text-muted-foreground">{r.customer}</td>
              <td className="px-4 py-3 font-mono text-xs">{r.installDate}</td>
              <td className="px-4 py-3 font-mono text-xs">
                <span className={expired ? 'text-destructive' : 'text-foreground'}>{r.warrantyExpiry}</span>
              </td>
              <td className="px-4 py-3">{r.totalServices}</td>
              <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{r.lastService}</td>
              <td className="px-4 py-3"><StatusBadge status={r.status as never} /></td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );

  return (
    <ReportShell title="Asset Report" icon={<Server size={18} className="text-primary" />} filters={filters} table={table} rowCount={rows.length} onGenerate={generate} generated={generated} />
  );
}
