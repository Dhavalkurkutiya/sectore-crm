/**
 * Customer Reports Page
 * Sectore 360 — Part 6 Customer Portal
 */
import { useState } from 'react';
import { toast } from 'sonner';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { FileText, Download, Calendar } from 'lucide-react';

const REPORT_TYPES = [
  {
    id: 'service-history',
    name: 'Service History Report',
    desc: 'Complete history of all service visits and task completions for your assets.',
    lastGenerated: '2026-07-20',
  },
  {
    id: 'amc-summary',
    name: 'AMC Summary Report',
    desc: 'Summary of your AMC contracts, visit schedule, and compliance status.',
    lastGenerated: '2026-07-15',
  },
  {
    id: 'asset-warranty',
    name: 'Asset & Warranty Report',
    desc: 'Current status of all registered assets including warranty information.',
    lastGenerated: '2026-07-10',
  },
];

export default function CustomerReportsPage() {
  const [generating, setGenerating] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<typeof REPORT_TYPES[0] | null>(null);
  const [fromDate, setFromDate] = useState('2026-07-01');
  const [toDate, setToDate] = useState('2026-07-21');

  const openDialog = (report: typeof REPORT_TYPES[0]) => {
    setSelectedReport(report);
    setDialogOpen(true);
  };

  const handleGenerate = () => {
    if (!selectedReport) return;
    if (fromDate > toDate) { toast.error('From date must be before To date'); return; }
    setGenerating(selectedReport.id);
    setDialogOpen(false);
    setTimeout(() => {
      toast.success(`${selectedReport.name} generated and downloaded`);
      setGenerating(null);
    }, 1500);
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-4 max-w-2xl mx-auto pb-8">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <FileText size={18} className="text-primary" /> My Reports
          </h1>
          <p className="text-sm text-muted-foreground">Download service and asset reports for your account</p>
        </div>

        <div className="flex flex-col gap-3">
          {REPORT_TYPES.map((r) => (
            <Card key={r.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-col gap-1 flex-1">
                    <div className="flex items-center gap-2">
                      <FileText size={14} className="text-primary shrink-0" />
                      <p className="text-sm font-semibold text-foreground">{r.name}</p>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{r.desc}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                      <Calendar size={11} /> Last generated: {r.lastGenerated}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0"
                    disabled={generating === r.id}
                    onClick={() => openDialog(r)}
                  >
                    {generating === r.id ? 'Generating…' : <><Download size={14} className="mr-1.5" />Generate</>}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Past reports */}
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-semibold">Recent Downloads</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 flex flex-col gap-2">
            {REPORT_TYPES.map((r) => (
              <div key={r.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div className="flex flex-col gap-0.5">
                  <p className="text-sm text-foreground">{r.name}</p>
                  <p className="text-xs text-muted-foreground">{r.lastGenerated}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">PDF</Badge>
                  <Button variant="ghost" size="sm" className="p-1.5 h-auto" onClick={() => toast.info('Re-downloading report…')}>
                    <Download size={13} />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Generate dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-sm">
          <DialogHeader>
            <DialogTitle>Generate Report</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-2">
            <p className="text-sm text-muted-foreground">{selectedReport?.name}</p>
            <div className="flex flex-col gap-1">
              <Label className="text-xs">From Date</Label>
              <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs">To Date</Label>
              <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleGenerate}><Download size={14} className="mr-1.5" />Generate PDF</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
