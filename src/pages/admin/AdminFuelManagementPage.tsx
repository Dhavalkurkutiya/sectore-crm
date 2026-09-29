/**
 * Admin Fuel Management Page — Admin-only fuel entry + history
 */
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { fuelService, type FuelLogEntry, type FuelEntryFormData } from '@/services/fuelService';
import { bikeService } from '@/services/bikeService';
import { usersApi } from '@/lib/api';
import type { Bike } from '@/types/engineer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Fuel, Plus, Receipt, Gauge, Calculator, Trash2 } from 'lucide-react';

const EMPTY_FORM: Omit<FuelEntryFormData, 'addedByAdmin'> = {
  date: new Date().toISOString().slice(0, 10),
  bikeId: '', engineerId: '', engineerName: '',
  odometer: 0, liters: 0, amount: 0,
  fuelStation: '', invoiceNumber: '',
};

export default function AdminFuelManagementPage() {
  const { user }      = useAuth();
  const [logs,  setLogs]  = useState<FuelLogEntry[]>([]);
  const [bikes, setBikes] = useState<Bike[]>([]);
  const [engineers, setEngineers] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading]     = useState(true);
  const [open,    setOpen]        = useState(false);
  const [saving,  setSaving]      = useState(false);
  const [form,    setForm]        = useState({ ...EMPTY_FORM });
  const [billFile, setBillFile]   = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    Promise.all([
      fuelService.getAll(200),
      bikeService.getAll(),
      usersApi.getAll?.().catch(() => []),
    ]).then(([l, b, u]) => {
      setLogs(l);
      setBikes(b.filter((x) => x.status === 'Active'));
      setEngineers(
        (u ?? [])
          .filter((x: { role: string }) => x.role === 'engineer')
          .map((x: { id: string; name: string }) => ({ id: x.id, name: x.name }))
      );
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  function openNew() {
    setForm({ ...EMPTY_FORM });
    setBillFile(null);
    setOpen(true);
  }

  function setF(k: keyof typeof form, v: string | number) {
    setForm((p) => ({ ...p, [k]: v }));
    // Auto-fill engineer from bike assignment
    if (k === 'bikeId') {
      const bike = bikes.find((b) => b.id === v);
      if (bike?.assignedEngineerId) {
        const eng = engineers.find((e) => e.id === bike.assignedEngineerId);
        if (eng) setForm((p) => ({ ...p, bikeId: v as string, engineerId: eng.id, engineerName: eng.name }));
      }
    }
  }

  async function handleSave() {
    if (!form.bikeId)    { toast.error('Select a vehicle'); return; }
    if (!form.date)      { toast.error('Enter date'); return; }
    if (form.liters <= 0){ toast.error('Enter fuel quantity'); return; }
    if (form.amount <= 0){ toast.error('Enter amount'); return; }

    setSaving(true);
    try {
      const entry = await fuelService.create({
        ...form,
        billFile: billFile ?? undefined,
        addedByAdmin: user?.name ?? 'Admin',
      } as FuelEntryFormData);
      setLogs((p) => [entry, ...p]);
      setOpen(false);
      toast.success('Fuel log saved!');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this fuel log?')) return;
    try {
      await fuelService.delete(id);
      setLogs((p) => p.filter((l) => l.id !== id));
      toast.success('Deleted');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Delete failed');
    }
  }

  const totalLiters  = logs.reduce((s, l) => s + l.liters, 0);
  const totalCost    = logs.reduce((s, l) => s + l.amount, 0);
  const monthlyCost  = logs
    .filter((l) => l.date >= new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10))
    .reduce((s, l) => s + l.amount, 0);

  return (
    <DashboardLayout>
    <div className="flex flex-col gap-4 max-w-3xl mx-auto pb-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Fuel size={20} className="text-primary" /> Fuel Management
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">Admin-only fuel entries</p>
        </div>
        <Button onClick={openNew} size="sm" className="h-9">
          <Plus size={15} className="mr-1" /> New Entry
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Fuel',    value: `${totalLiters.toFixed(1)}L` },
          { label: 'Total Cost',    value: `₹${totalCost.toFixed(0)}` },
          { label: 'Monthly Cost',  value: `₹${monthlyCost.toFixed(0)}` },
        ].map((s) => (
          <Card key={s.label} className="text-center">
            <CardContent className="p-3">
              <p className="text-xl font-bold text-foreground">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Log list */}
      {loading ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground text-sm">Loading…</CardContent></Card>
      ) : logs.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground text-sm">No fuel logs yet</CardContent></Card>
      ) : (
        <div className="flex flex-col gap-2">
          {logs.map((l) => (
            <Card key={l.id}>
              <CardContent className="p-4 flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{l.date}</p>
                    <p className="text-xs text-muted-foreground">{l.engineerName} · {l.bikeNumber ?? l.bikeId}</p>
                    {l.fuelStation && <p className="text-xs text-muted-foreground">{l.fuelStation}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <p className="text-sm font-bold text-primary">₹{l.amount.toFixed(0)}</p>
                      {l.mileage && <p className="text-xs text-muted-foreground">{l.mileage.toFixed(1)} KM/L</p>}
                    </div>
                    <button
                      onClick={() => handleDelete(l.id)}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
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

      {/* New entry dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Fuel size={16} className="text-primary" /> New Fuel Entry
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium">Date *</label>
                <Input type="date" value={form.date} onChange={(e) => setF('date', e.target.value)} className="h-9 text-sm" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium">Vehicle *</label>
                <Select value={form.bikeId} onValueChange={(v) => setF('bikeId', v)}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select bike" /></SelectTrigger>
                  <SelectContent>
                    {bikes.map((b) => <SelectItem key={b.id} value={b.id}>{b.bikeNumber}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium">Engineer</label>
              <Select value={form.engineerId} onValueChange={(v) => { const e = engineers.find((x) => x.id === v); setForm((p) => ({ ...p, engineerId: v, engineerName: e?.name ?? '' })); }}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select engineer" /></SelectTrigger>
                <SelectContent>
                  {engineers.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium">Odometer (KM) *</label>
                <Input type="number" min={0} value={form.odometer || ''} onChange={(e) => setF('odometer', parseFloat(e.target.value) || 0)} className="h-9 text-sm" placeholder="0" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium">Fuel (L) *</label>
                <Input type="number" min={0} step="0.1" value={form.liters || ''} onChange={(e) => setF('liters', parseFloat(e.target.value) || 0)} className="h-9 text-sm" placeholder="0.0" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium">Amount (₹) *</label>
                <Input type="number" min={0} step="0.5" value={form.amount || ''} onChange={(e) => setF('amount', parseFloat(e.target.value) || 0)} className="h-9 text-sm" placeholder="0.00" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium">Fuel Station</label>
                <Input value={form.fuelStation} onChange={(e) => setF('fuelStation', e.target.value)} className="h-9 text-sm" placeholder="Station name" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium">Invoice #</label>
                <Input value={form.invoiceNumber} onChange={(e) => setF('invoiceNumber', e.target.value)} className="h-9 text-sm" placeholder="INV-001" />
              </div>
            </div>

            {/* Bill photo */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium">Fuel Bill Photo (optional)</label>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" className="h-9 text-xs" onClick={() => fileRef.current?.click()}>
                  <Receipt size={13} className="mr-1" /> {billFile ? billFile.name : 'Attach Bill'}
                </Button>
                {billFile && <button onClick={() => setBillFile(null)} className="text-xs text-muted-foreground hover:text-destructive">✕</button>}
              </div>
              <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => setBillFile(e.target.files?.[0] ?? null)} />
            </div>

            {form.liters > 0 && form.amount > 0 && (
              <div className="px-3 py-2 bg-muted/50 rounded-lg text-xs text-muted-foreground">
                Rate: ₹{(form.amount / form.liters).toFixed(2)} / L
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save Fuel Entry'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </DashboardLayout>
  );
}
