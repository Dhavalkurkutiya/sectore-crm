/**
 * Dashboard Analytics Report
 * Sectore 360 — Part 6
 * KPI cards + recharts bar/pie
 */
import { useState } from 'react';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, PieChart, Pie, Cell, Tooltip, Legend,
  ResponsiveContainer, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import {
  ArrowLeft, BarChart2, Download, FileText, FileSpreadsheet, Printer,
  ClipboardList, Users, Server, FileCheck,
} from 'lucide-react';

/* ── Mock data ───────────────────────────────────────────── */
const MONTHLY_TASKS = [
  { month: 'Jan', completed: 38, pending: 5, cancelled: 2 },
  { month: 'Feb', completed: 42, pending: 4, cancelled: 1 },
  { month: 'Mar', completed: 51, pending: 7, cancelled: 3 },
  { month: 'Apr', completed: 45, pending: 6, cancelled: 1 },
  { month: 'May', completed: 60, pending: 8, cancelled: 2 },
  { month: 'Jun', completed: 55, pending: 5, cancelled: 1 },
  { month: 'Jul', completed: 33, pending: 4, cancelled: 0 },
];

const AMC_DIST = [
  { name: 'Comprehensive', value: 12 },
  { name: 'Basic', value: 8 },
  { name: 'Labour Only', value: 5 },
  { name: 'Breakdown Only', value: 4 },
];

const ENG_PERF = [
  { name: 'Rahul', onTime: 88, completed: 40 },
  { name: 'Priya', onTime: 94, completed: 36 },
  { name: 'Arun', onTime: 82, completed: 45 },
  { name: 'Deepa', onTime: 96, completed: 27 },
  { name: 'Sanjay', onTime: 79, completed: 55 },
];

const PIE_COLORS = ['hsl(var(--primary))', 'hsl(var(--info))', 'hsl(var(--success))', 'hsl(var(--warning))'];

const KPI = [
  { label: 'Total Customers', value: '124', icon: <Users size={16} />, delta: '+8 this month' },
  { label: 'Active AMCs', value: '29', icon: <FileCheck size={16} />, delta: '+2 this month' },
  { label: 'Total Assets', value: '387', icon: <Server size={16} />, delta: '+12 this month' },
  { label: 'Tasks (Month)', value: '33', icon: <ClipboardList size={16} />, delta: '4 pending' },
];

export default function DashboardAnalyticsPage() {
  const navigate = useNavigate();
  const [from, setFrom] = useState('2026-01-01');
  const [to, setTo] = useState('2026-07-21');
  const [generated, setGenerated] = useState(false);

  const handleExport = (fmt: string) => {
    if (!generated) { toast.warning('Generate the report first'); return; }
    toast.success(`Exporting analytics as ${fmt}…`);
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-4 pb-8">
        {/* Header */}
        <div className="flex items-center gap-3 flex-wrap">
          <Button variant="ghost" size="sm" className="p-2" onClick={() => navigate('/reports')}>
            <ArrowLeft size={16} />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <BarChart2 size={18} className="text-primary" /> Dashboard Analytics
            </h1>
            <p className="text-sm text-muted-foreground">Overall system KPIs, trends, and distribution charts</p>
          </div>
          {generated && (
            <div className="flex gap-2 shrink-0 flex-wrap">
              <Button size="sm" variant="outline" onClick={() => handleExport('PDF')}><FileText size={13} className="mr-1.5" />PDF</Button>
              <Button size="sm" variant="outline" onClick={() => handleExport('Excel')}><FileSpreadsheet size={13} className="mr-1.5" />Excel</Button>
              <Button size="sm" variant="outline" onClick={() => handleExport('CSV')}><Download size={13} className="mr-1.5" />CSV</Button>
              <Button size="sm" variant="outline" onClick={() => window.print()}><Printer size={13} className="mr-1.5" />Print</Button>
            </div>
          )}
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex flex-col gap-1"><Label className="text-xs">From</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-36" /></div>
              <div className="flex flex-col gap-1"><Label className="text-xs">To</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-36" /></div>
              <Button size="sm" onClick={() => setGenerated(true)}>Generate</Button>
            </div>
          </CardContent>
        </Card>

        {!generated && (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
            <BarChart2 size={40} className="opacity-20" />
            <p className="text-sm">Set date range and click Generate</p>
          </div>
        )}

        {generated && (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {KPI.map((k) => (
                <Card key={k.label}>
                  <CardContent className="p-4 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground text-xs">{k.label}</span>
                      <span className="text-primary">{k.icon}</span>
                    </div>
                    <p className="text-2xl font-bold text-foreground">{k.value}</p>
                    <Badge variant="outline" className="text-xs w-fit">{k.delta}</Badge>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Charts row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Monthly tasks */}
              <Card>
                <CardHeader className="pb-1 pt-3 px-4"><CardTitle className="text-sm">Monthly Tasks (2026)</CardTitle></CardHeader>
                <CardContent className="px-2 pb-4">
                  <div className="w-full min-w-0 overflow-hidden">
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={MONTHLY_TASKS} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip contentStyle={{ fontSize: 12 }} />
                        <Legend layout="horizontal" wrapperStyle={{ paddingTop: 8, fontSize: 11 }} />
                        <Bar dataKey="completed" name="Completed" fill="hsl(var(--success))" radius={[2,2,0,0]} />
                        <Bar dataKey="pending" name="Pending" fill="hsl(var(--warning))" radius={[2,2,0,0]} />
                        <Bar dataKey="cancelled" name="Cancelled" fill="hsl(var(--destructive))" radius={[2,2,0,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* AMC distribution */}
              <Card>
                <CardHeader className="pb-1 pt-3 px-4"><CardTitle className="text-sm">AMC Contract Distribution</CardTitle></CardHeader>
                <CardContent className="pb-4">
                  <div className="w-full min-w-0 overflow-hidden">
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie data={AMC_DIST} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                          {AMC_DIST.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                        </Pie>
                        <Tooltip contentStyle={{ fontSize: 12 }} />
                        <Legend layout="horizontal" wrapperStyle={{ paddingTop: 8, fontSize: 11 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Engineer on-time performance */}
            <Card>
              <CardHeader className="pb-1 pt-3 px-4"><CardTitle className="text-sm">Engineer On-Time % vs Completed Tasks</CardTitle></CardHeader>
              <CardContent className="px-2 pb-4">
                <div className="w-full min-w-0 overflow-hidden">
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={ENG_PERF} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip contentStyle={{ fontSize: 12 }} />
                      <Legend layout="horizontal" wrapperStyle={{ paddingTop: 8, fontSize: 11 }} />
                      <Bar dataKey="completed" name="Completed Tasks" fill="hsl(var(--primary))" radius={[2,2,0,0]} />
                      <Bar dataKey="onTime" name="On-Time %" fill="hsl(var(--info))" radius={[2,2,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
