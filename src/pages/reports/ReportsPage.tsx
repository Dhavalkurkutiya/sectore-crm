/**
 * Reports Module — Main Hub
 * Sectore 360 — Part 6
 */
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  BarChart2, ClipboardList, HardHat, FileText, Clock,
  Fuel, Server, TrendingUp, ChevronRight,
} from 'lucide-react';

const REPORTS = [
  { id: 'tasks', label: 'Task Report', desc: 'Task completion, status, and resolution time by date/engineer/customer', icon: ClipboardList, path: '/reports/tasks', color: 'text-primary' },
  { id: 'engineer-performance', label: 'Engineer Performance', desc: 'Tasks completed, attendance rate, avg resolution time, and fuel cost per engineer', icon: HardHat, path: '/reports/engineer-performance', color: 'text-success' },
  { id: 'amc', label: 'AMC Report', desc: 'Active, expiring, and expired AMC contracts with visit compliance', icon: FileText, path: '/reports/amc', color: 'text-warning' },
  { id: 'attendance', label: 'Attendance Report', desc: 'Engineer check-in/out times and daily working hours by date range', icon: Clock, path: '/reports/attendance', color: 'text-info' },
  { id: 'fuel', label: 'Fuel Report', desc: 'Engineer fuel logs — distance, litres filled, and cost by date range', icon: Fuel, path: '/reports/fuel', color: 'text-orange-500' },
  { id: 'assets', label: 'Asset Report', desc: 'All assets by customer, category, status, and warranty', icon: Server, path: '/reports/assets', color: 'text-muted-foreground' },
  { id: 'analytics', label: 'Dashboard Analytics', desc: 'Visual charts — task trends, engineer utilisation, AMC coverage', icon: TrendingUp, path: '/reports/analytics', color: 'text-primary' },
];

export default function ReportsPage() {
  const navigate = useNavigate();
  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6 pb-8">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <BarChart2 size={20} className="text-primary" /> Reports
          </h1>
          <p className="text-sm text-muted-foreground">Generate and export business reports across all modules</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {REPORTS.map((r) => {
            const Icon = r.icon;
            return (
              <Card key={r.id} className="cursor-pointer hover:border-primary/30 transition-colors" onClick={() => navigate(r.path)}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <Icon size={16} className={r.color} />
                        <p className="text-sm font-semibold text-foreground">{r.label}</p>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{r.desc}</p>
                    </div>
                    <ChevronRight size={16} className="text-muted-foreground shrink-0 mt-0.5" />
                  </div>
                  <div className="mt-4 flex gap-1.5 flex-wrap">
                    {['PDF', 'Excel', 'CSV', 'Print'].map((fmt) => (
                      <span key={fmt} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{fmt}</span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
}
