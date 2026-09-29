/**
 * Fuel History Page — Admin-Only model (engineers read-only)
 * Sectore 360
 */
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useEngineerContext } from '@/contexts/EngineerContext';
import { fuelService, type FuelLogEntry } from '@/services/fuelService';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, Fuel, Gauge, Calculator, Receipt } from 'lucide-react';

type Range = '7' | '30' | '90';

export default function FuelHistoryPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { engineerId } = useEngineerContext();
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';
  const [range, setRange] = useState<Range>('30');
  const [logs, setLogs] = useState<FuelLogEntry[]>([]);

  useEffect(() => {
    const days = parseInt(range);
    const load = isAdmin
      ? fuelService.getAll(200)
      : engineerId
        ? fuelService.getByEngineer(engineerId, days)
        : Promise.resolve([]);
    load.then(setLogs).catch(() => setLogs([]));
  }, [range, isAdmin, engineerId]);

  const totalLiters = logs.reduce((s, l) => s + l.liters, 0);
  const totalCost   = logs.reduce((s, l) => s + l.amount, 0);
  const avgMileage  = (() => {
    const valid = logs.filter((l) => l.mileage);
    return valid.length > 0 ? valid.reduce((s, l) => s + (l.mileage ?? 0), 0) / valid.length : 0;
  })();

  return (
    <DashboardLayout>
    <div className="flex flex-col gap-4 max-w-2xl mx-auto pb-8">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" className="h-9 w-9 p-0" onClick={() => navigate(-1)}>
          <ChevronLeft size={18} />
        </Button>
        <h1 className="text-lg font-bold text-foreground flex-1 min-w-0 truncate flex items-center gap-2">
          <Fuel size={16} className="text-primary" /> Fuel History
        </h1>
        <Select value={range} onValueChange={(v) => setRange(v as Range)}>
          <SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Fuel', value: `${totalLiters.toFixed(1)}L` },
          { label: 'Total Cost', value: `₹${totalCost.toFixed(0)}` },
          { label: 'Avg KM/L',   value: avgMileage > 0 ? avgMileage.toFixed(1) : '—' },
        ].map((s) => (
          <Card key={s.label} className="text-center">
            <CardContent className="p-3">
              <p className="text-xl font-bold text-foreground">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {logs.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground text-sm">No fuel logs found</CardContent></Card>
      ) : (
        <div className="flex flex-col gap-2">
          {logs.map((l) => (
            <Card key={l.id}>
              <CardContent className="p-4 flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{l.date}</p>
                    {isAdmin && <p className="text-xs text-muted-foreground">{l.engineerName}</p>}
                    {l.fuelStation && <p className="text-xs text-muted-foreground">{l.fuelStation}</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-primary">₹{l.amount.toFixed(0)}</p>
                    {l.mileage && <p className="text-xs text-muted-foreground">{l.mileage.toFixed(1)} KM/L</p>}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Gauge size={11} />{l.odometer} KM</span>
                  <span className="flex items-center gap-1"><Fuel size={11} />{l.liters}L</span>
                  {l.fuelCostPerKm && <span className="flex items-center gap-1"><Calculator size={11} />{l.fuelCostPerKm.toFixed(2)} ₹/KM</span>}
                  {l.invoiceNumber && <Badge variant="outline" className="text-xs px-1 py-0">#{l.invoiceNumber}</Badge>}
                </div>
                {l.billUrl && (
                  <a href={l.billUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-primary">
                    <Receipt size={11} /> View Bill
                  </a>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
    </DashboardLayout>
  );
}
