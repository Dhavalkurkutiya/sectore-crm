/**
 * Shared Report Layout + Export helpers
 * Sectore 360 — Part 6
 */
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { ArrowLeft, Download, Printer, FileSpreadsheet, FileText } from 'lucide-react';

interface ReportShellProps {
  title: string;
  icon: ReactNode;
  filters: ReactNode;
  table: ReactNode;
  rowCount: number;
  onGenerate: () => void;
  generated: boolean;
  loading?: boolean;
}

export function ReportShell({ title, icon, filters, table, rowCount, onGenerate, generated, loading }: ReportShellProps) {
  const navigate = useNavigate();

  const handleExport = (fmt: string) => {
    if (!generated) { toast.warning('Generate the report first'); return; }
    toast.success(`Exporting ${rowCount} rows as ${fmt}…`);
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-4 pb-8">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" className="p-2" onClick={() => navigate('/reports')}>
            <ArrowLeft size={16} />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2 truncate">
              {icon} {title}
            </h1>
            <p className="text-sm text-muted-foreground">Filter, generate and export</p>
          </div>
          {generated && (
            <div className="flex gap-2 shrink-0">
              <Button size="sm" variant="outline" onClick={() => handleExport('PDF')}>
                <FileText size={13} className="mr-1.5" />PDF
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleExport('Excel')}>
                <FileSpreadsheet size={13} className="mr-1.5" />Excel
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleExport('CSV')}>
                <Download size={13} className="mr-1.5" />CSV
              </Button>
              <Button size="sm" variant="outline" onClick={() => { if (!generated) { toast.warning('Generate first'); return; } window.print(); }}>
                <Printer size={13} className="mr-1.5" />Print
              </Button>
            </div>
          )}
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4 items-end">
              {filters}
              <Button onClick={onGenerate} disabled={loading} className="shrink-0">
                {loading ? 'Loading…' : 'Generate Report'}
              </Button>
              {generated && <span className="text-xs text-muted-foreground self-end pb-0.5">{rowCount} rows</span>}
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        {generated && (
          <Card>
            <CardContent className="p-0">
              {table}
            </CardContent>
          </Card>
        )}

        {!generated && (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <FileText size={40} className="opacity-20 mb-3" />
            <p className="text-sm">Set filters and click Generate Report</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

/* ── Date filter pair ─────────────────────────────────────────── */
interface DateRangeProps {
  from: string; to: string;
  onFrom: (v: string) => void; onTo: (v: string) => void;
}
export function DateRangeFilter({ from, to, onFrom, onTo }: DateRangeProps) {
  return (
    <>
      <div className="flex flex-col gap-1">
        <Label className="text-xs">From Date *</Label>
        <Input type="date" value={from} onChange={(e) => onFrom(e.target.value)} className="w-40" />
      </div>
      <div className="flex flex-col gap-1">
        <Label className="text-xs">To Date *</Label>
        <Input type="date" value={to} onChange={(e) => onTo(e.target.value)} className="w-40" />
      </div>
    </>
  );
}
