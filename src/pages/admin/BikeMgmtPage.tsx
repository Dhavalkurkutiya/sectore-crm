/**
 * Bike Management Page — Admin / Super Admin only
 * Register, Edit, Delete, Assign bikes to engineers.
 */
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { bikeService, type BikeFormData } from '@/services/bikeService';
import { usersApi } from '@/lib/api';
import type { Bike } from '@/types/engineer';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import {
  Plus, Pencil, Trash2, User, AlertTriangle,
  Bike as BikeIcon, ShieldAlert, Wrench,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const FUEL_TYPES = ['Petrol', 'Diesel', 'Electric', 'CNG'];
const EMPTY_FORM: BikeFormData = {
  bikeNumber: '', make: '', model: '', fuelType: 'Petrol',
  averageMileage: 0, initialOdometer: 0,
  serviceDueDate: '', pucExpiryDate: '', insuranceExpiryDate: '', notes: '',
};

export default function BikeMgmtPage() {
  const { user }     = useAuth();
  const navigate     = useNavigate();
  const isAdmin      = user?.role === 'admin' || user?.role === 'superadmin';

  const [bikes,     setBikes]     = useState<Bike[]>([]);
  const [engineers, setEngineers] = useState<{ id: string; name: string }[]>([]);
  const [loading,   setLoading]   = useState(true);

  // Form dialog
  const [formOpen,  setFormOpen]  = useState(false);
  const [editId,    setEditId]    = useState<string | null>(null);
  const [form,      setForm]      = useState<BikeFormData>({ ...EMPTY_FORM });
  const [saving,    setSaving]    = useState(false);

  // Assign dialog
  const [assignOpen,  setAssignOpen]  = useState(false);
  const [assignBikeId, setAssignBikeId] = useState('');
  const [assignEngId,  setAssignEngId]  = useState('');
  const [assigning,    setAssigning]    = useState(false);

  // Delete confirmation
  const [deleteId,   setDeleteId]   = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) { navigate('/dashboard'); return; }
    Promise.all([
      bikeService.getAll(),
      usersApi.getAll?.().catch(() => []),
    ]).then(([b, u]) => {
      setBikes(b);
      setEngineers(
        (u ?? [])
          .filter((x: { role: string }) => x.role === 'engineer' || x.role === 'Engineer')
          .map((x: { id: string; name: string }) => ({ id: x.id, name: x.name }))
      );
    }).catch(console.error).finally(() => setLoading(false));
  }, [isAdmin, navigate]);

  function openCreate() {
    setEditId(null);
    setForm({ ...EMPTY_FORM });
    setFormOpen(true);
  }

  function openEdit(bike: Bike) {
    setEditId(bike.id);
    setForm({
      bikeNumber:          bike.bikeNumber,
      make:                bike.make,
      model:               bike.model,
      fuelType:            bike.fuelType,
      averageMileage:      bike.averageMileage,
      initialOdometer:     bike.initialOdometer,
      serviceDueDate:      bike.serviceDueDate      ?? '',
      pucExpiryDate:       bike.pucExpiryDate       ?? '',
      insuranceExpiryDate: bike.insuranceExpiryDate ?? '',
      notes:               bike.notes               ?? '',
    });
    setFormOpen(true);
  }

  function setF(k: keyof BikeFormData, v: string | number) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  async function handleSave() {
    if (!form.bikeNumber.trim()) { toast.error('Vehicle number is required'); return; }
    if (!form.make.trim())       { toast.error('Brand is required'); return; }
    if (!form.model.trim())      { toast.error('Model is required'); return; }
    setSaving(true);
    try {
      if (editId) {
        const updated = await bikeService.update(editId, form);
        setBikes((p) => p.map((b) => b.id === editId ? updated : b));
        toast.success('Bike updated');
      } else {
        const created = await bikeService.create(form);
        setBikes((p) => [created, ...p]);
        toast.success('Bike registered');
      }
      setFormOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  function openAssign(bikeId: string) {
    const bike = bikes.find((b) => b.id === bikeId);
    setAssignBikeId(bikeId);
    setAssignEngId(bike?.assignedEngineerId ?? '');
    setAssignOpen(true);
  }

  async function handleAssign() {
    if (!assignEngId) { toast.error('Select an engineer'); return; }
    setAssigning(true);
    try {
      const eng = engineers.find((e) => e.id === assignEngId);
      const updated = await bikeService.assignEngineer(assignBikeId, assignEngId, eng?.name ?? '');
      setBikes((p) => p.map((b) => b.id === assignBikeId ? updated : b));
      toast.success(`Bike assigned to ${eng?.name}`);
      setAssignOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Assign failed');
    } finally {
      setAssigning(false);
    }
  }

  async function handleUnassign(bikeId: string) {
    try {
      const updated = await bikeService.unassignEngineer(bikeId);
      setBikes((p) => p.map((b) => b.id === bikeId ? updated : b));
      toast.success('Bike unassigned');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Unassign failed');
    }
  }

  async function handleDelete(bikeId: string) {
    try {
      await bikeService.softDelete(bikeId);
      setBikes((p) => p.filter((b) => b.id !== bikeId));
      toast.success('Bike deactivated');
      setDeleteId(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Delete failed');
    }
  }

  const activeBikes = bikes.filter((b) => b.status === 'Active');
  const assigned    = activeBikes.filter((b) => b.assignedEngineerId);
  const unassigned  = activeBikes.filter((b) => !b.assignedEngineerId);

  return (
    <DashboardLayout>
    <div className="flex flex-col gap-4 max-w-3xl mx-auto pb-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <BikeIcon size={20} className="text-primary" /> Bike Management
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">Register, assign and manage fleet vehicles</p>
        </div>
        <Button onClick={openCreate} size="sm" className="h-9">
          <Plus size={15} className="mr-1" /> Register Bike
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Active', value: activeBikes.length },
          { label: 'Assigned',     value: assigned.length },
          { label: 'Unassigned',   value: unassigned.length },
        ].map((s) => (
          <Card key={s.label} className="text-center">
            <CardContent className="p-3">
              <p className="text-2xl font-bold text-foreground">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground text-sm">Loading…</CardContent></Card>
      ) : activeBikes.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground text-sm">No bikes registered yet</CardContent></Card>
      ) : (
        <div className="flex flex-col gap-3">
          {activeBikes.map((bike) => {
            const assignedEng  = engineers.find((e) => e.id === bike.assignedEngineerId);
            const serviceSoon  = bikeService.isBikeServiceDueSoon(bike);
            const insureSoon   = bikeService.isInsuranceExpiringSoon(bike);
            const pucSoon      = bikeService.isPucExpiringSoon(bike);

            return (
              <Card key={bike.id} className={serviceSoon || insureSoon || pucSoon ? 'border-amber-400/50' : ''}>
                <CardContent className="p-4 flex flex-col gap-3">
                  {/* Top row */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-bold text-foreground">{bike.bikeNumber}</p>
                        <Badge variant="secondary" className="text-xs">{bike.fuelType}</Badge>
                        {(serviceSoon || insureSoon || pucSoon) && (
                          <Badge variant="outline" className="text-xs text-amber-600 border-amber-400">
                            <AlertTriangle size={10} className="mr-0.5" /> Expiring Soon
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{bike.make} {bike.model}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => openEdit(bike)} className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => setDeleteId(bike.id)} className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                    <div><p className="text-foreground font-medium">{bike.currentOdometer.toLocaleString()} KM</p><p>Odometer</p></div>
                    <div><p className="text-foreground font-medium">{bike.averageMileage} KM/L</p><p>Avg Mileage</p></div>
                    <div>
                      <p className={`font-medium ${serviceSoon ? 'text-amber-600' : 'text-foreground'}`}>
                        {bike.serviceDueDate ?? '—'}
                      </p>
                      <p className="flex items-center gap-0.5"><Wrench size={9} /> Service Due</p>
                    </div>
                  </div>

                  {/* Expiry dates */}
                  {(bike.insuranceExpiryDate || bike.pucExpiryDate) && (
                    <div className="flex gap-3 text-xs flex-wrap">
                      {bike.insuranceExpiryDate && (
                        <span className={`flex items-center gap-1 ${insureSoon ? 'text-amber-600' : 'text-muted-foreground'}`}>
                          <ShieldAlert size={10} /> Insurance: {bike.insuranceExpiryDate}
                        </span>
                      )}
                      {bike.pucExpiryDate && (
                        <span className={`flex items-center gap-1 ${pucSoon ? 'text-amber-600' : 'text-muted-foreground'}`}>
                          <ShieldAlert size={10} /> PUC: {bike.pucExpiryDate}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Assignment */}
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-border">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <User size={12} />
                      {assignedEng
                        ? <span className="text-foreground font-medium">{assignedEng.name}</span>
                        : <span className="italic">Unassigned</span>
                      }
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" className="h-7 text-xs px-2" onClick={() => openAssign(bike.id)}>
                        {bike.assignedEngineerId ? 'Reassign' : 'Assign'}
                      </Button>
                      {bike.assignedEngineerId && (
                        <Button size="sm" variant="outline" className="h-7 text-xs px-2 text-destructive hover:text-destructive" onClick={() => handleUnassign(bike.id)}>
                          Unassign
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? 'Edit Bike' : 'Register New Bike'}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1 col-span-2">
                <label className="text-xs font-medium">Vehicle Number *</label>
                <Input value={form.bikeNumber} onChange={(e) => setF('bikeNumber', e.target.value)} placeholder="MH12AB1234" className="h-10" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium">Brand *</label>
                <Input value={form.make} onChange={(e) => setF('make', e.target.value)} placeholder="Honda" className="h-10" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium">Model *</label>
                <Input value={form.model} onChange={(e) => setF('model', e.target.value)} placeholder="Activa" className="h-10" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium">Fuel Type</label>
                <Select value={form.fuelType} onValueChange={(v) => setF('fuelType', v)}>
                  <SelectTrigger className="h-10 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>{FUEL_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium">Avg Mileage (KM/L)</label>
                <Input type="number" min={0} step="0.1" value={form.averageMileage || ''} onChange={(e) => setF('averageMileage', parseFloat(e.target.value) || 0)} placeholder="40.0" className="h-10" />
              </div>
              <div className="flex flex-col gap-1 col-span-2">
                <label className="text-xs font-medium">Initial Odometer (KM)</label>
                <Input type="number" min={0} value={form.initialOdometer || ''} onChange={(e) => setF('initialOdometer', parseFloat(e.target.value) || 0)} placeholder="0" className="h-10" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium">Service Due Date</label>
                <Input type="date" value={form.serviceDueDate} onChange={(e) => setF('serviceDueDate', e.target.value)} className="h-10" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium">Insurance Expiry</label>
                <Input type="date" value={form.insuranceExpiryDate} onChange={(e) => setF('insuranceExpiryDate', e.target.value)} className="h-10" />
              </div>
              <div className="flex flex-col gap-1 col-span-2">
                <label className="text-xs font-medium">PUC Expiry</label>
                <Input type="date" value={form.pucExpiryDate} onChange={(e) => setF('pucExpiryDate', e.target.value)} className="h-10" />
              </div>
              <div className="flex flex-col gap-1 col-span-2">
                <label className="text-xs font-medium">Notes</label>
                <Input value={form.notes} onChange={(e) => setF('notes', e.target.value)} placeholder="Optional notes" className="h-10" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : editId ? 'Update' : 'Register'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign dialog */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-sm">
          <DialogHeader>
            <DialogTitle>Assign Bike</DialogTitle>
          </DialogHeader>
          <div className="py-2 flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium">Select Engineer *</label>
              <Select value={assignEngId} onValueChange={setAssignEngId}>
                <SelectTrigger className="h-10 text-sm"><SelectValue placeholder="Select engineer" /></SelectTrigger>
                <SelectContent>
                  {engineers.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignOpen(false)}>Cancel</Button>
            <Button onClick={handleAssign} disabled={assigning || !assignEngId}>
              {assigning ? 'Assigning…' : 'Assign Bike'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Bike?</AlertDialogTitle>
            <AlertDialogDescription>This bike will be marked Inactive and removed from fleet view.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && handleDelete(deleteId)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
    </DashboardLayout>
  );
}
