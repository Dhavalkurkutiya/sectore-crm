/**
 * Fuel Service — Supabase-backed (Admin-Only Model)
 * Admin enters fuel logs. Engineers cannot add entries.
 * Calculates mileage, fuel cost per KM, monthly totals.
 */
import { supabase, uploadFile } from '@/lib/supabase';

const todayStr = () => new Date().toISOString().slice(0, 10);

export interface FuelLogEntry {
  id: string;
  engineerId: string;
  engineerName: string;
  bikeId?: string;
  bikeNumber?: string;
  date: string;
  odometer: number;
  liters: number;
  amount: number;
  fuelStation?: string;
  invoiceNumber?: string;
  billUrl?: string;
  mileage?: number;           // KM/L — calculated
  fuelCostPerKm?: number;     // ₹/KM — calculated
  notes?: string;
  addedByAdmin?: string;
  createdAt: string;
  updatedAt: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToEntry(r: any): FuelLogEntry {
  return {
    id:            r.id,
    engineerId:    r.engineer_id,
    engineerName:  r.engineer_name ?? '',
    bikeId:        r.bike_id       ?? r.bike_id_ref ?? undefined,
    bikeNumber:    r.registration_number ?? undefined,
    date:          typeof r.date === 'string' ? r.date.slice(0, 10) : (r.entry_date ?? r.date ?? ''),
    odometer:      Number(r.odometer ?? r.closing_km ?? 0),
    liters:        Number(r.liters   ?? r.fuel_filled ?? 0),
    amount:        Number(r.amount   ?? r.fuel_cost   ?? 0),
    fuelStation:   r.fuel_station   ?? undefined,
    invoiceNumber: r.invoice_number ?? undefined,
    billUrl:       r.bill_url       ?? undefined,
    mileage:       r.mileage        != null ? Number(r.mileage)          : undefined,
    fuelCostPerKm: r.fuel_cost_per_km != null ? Number(r.fuel_cost_per_km) : undefined,
    notes:         r.notes          ?? undefined,
    addedByAdmin:  r.added_by_admin ?? undefined,
    createdAt:     r.created_at,
    updatedAt:     r.updated_at ?? r.created_at,
  };
}

export interface FuelEntryFormData {
  date: string;
  bikeId: string;
  engineerId: string;
  engineerName: string;
  odometer: number;
  liters: number;
  amount: number;
  fuelStation: string;
  invoiceNumber: string;
  billFile?: File;
  notes?: string;
  addedByAdmin: string;
  kmTravelled?: number;       // from odometer verification
}

export const fuelService = {
  async getAll(limit = 100): Promise<FuelLogEntry[]> {
    const { data, error } = await supabase
      .from('fuel_logs')
      .select('*')
      .order('date', { ascending: false })
      .limit(limit);
    if (error) throw new Error(error.message);
    return (data ?? []).map(rowToEntry);
  },

  async getByEngineer(engineerId: string, days = 30): Promise<FuelLogEntry[]> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const { data, error } = await supabase
      .from('fuel_logs')
      .select('*')
      .eq('engineer_id', engineerId)
      .gte('date', cutoff.toISOString().slice(0, 10))
      .order('date', { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return (data ?? []).map(rowToEntry);
  },

  async getByDateRange(from: string, to: string, engineerId?: string): Promise<FuelLogEntry[]> {
    let q = supabase.from('fuel_logs').select('*').gte('date', from).lte('date', to);
    if (engineerId) q = q.eq('engineer_id', engineerId);
    const { data, error } = await q.order('date', { ascending: false }).limit(500);
    if (error) throw new Error(error.message);
    return (data ?? []).map(rowToEntry);
  },

  async create(form: FuelEntryFormData): Promise<FuelLogEntry> {
    const now = new Date().toISOString();

    let billUrl: string | null = null;
    if (form.billFile) {
      const safeName = form.billFile.name.replace(/[^a-zA-Z0-9.]/g, '_');
      const path = `${form.engineerId}/${form.date}/fuel_${Date.now()}_${safeName}`;
      billUrl = await uploadFile('fuel-bills', path, form.billFile, form.billFile.type);
    }

    // Calculate mileage using KM travelled if provided
    const mileage     = form.kmTravelled && form.liters > 0 ? parseFloat((form.kmTravelled / form.liters).toFixed(2)) : null;
    const costPerKm   = form.kmTravelled && form.kmTravelled > 0 ? parseFloat((form.amount / form.kmTravelled).toFixed(2)) : null;

    const row = {
      engineer_id:      form.engineerId,
      engineer_name:    form.engineerName,
      bike_id:          form.bikeId,
      bike_id_ref:      form.bikeId,
      date:             form.date,
      entry_date:       form.date,
      odometer:         form.odometer,
      closing_km:       form.odometer,
      liters:           form.liters,
      fuel_filled:      form.liters,
      amount:           form.amount,
      fuel_cost:        form.amount,
      fuel_station:     form.fuelStation,
      invoice_number:   form.invoiceNumber,
      bill_url:         billUrl,
      mileage:          mileage,
      fuel_cost_per_km: costPerKm,
      notes:            form.notes || null,
      added_by_admin:   form.addedByAdmin,
      created_at:       now,
      updated_at:       now,
    };
    const { data, error } = await supabase.from('fuel_logs').insert(row).select().single();
    if (error) throw new Error(error.message);
    return rowToEntry(data);
  },

  async update(id: string, form: Partial<FuelEntryFormData>): Promise<FuelLogEntry> {
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (form.date          !== undefined) { patch.date         = form.date; patch.entry_date = form.date; }
    if (form.bikeId        !== undefined) { patch.bike_id      = form.bikeId; patch.bike_id_ref = form.bikeId; }
    if (form.odometer      !== undefined) { patch.odometer     = form.odometer; patch.closing_km = form.odometer; }
    if (form.liters        !== undefined) { patch.liters       = form.liters; patch.fuel_filled = form.liters; }
    if (form.amount        !== undefined) { patch.amount       = form.amount; patch.fuel_cost   = form.amount; }
    if (form.fuelStation   !== undefined) patch.fuel_station   = form.fuelStation;
    if (form.invoiceNumber !== undefined) patch.invoice_number = form.invoiceNumber;
    if (form.notes         !== undefined) patch.notes          = form.notes || null;
    const { data, error } = await supabase.from('fuel_logs').update(patch).eq('id', id).select().single();
    if (error) throw new Error(error.message);
    return rowToEntry(data);
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('fuel_logs').delete().eq('id', id);
    if (error) throw new Error(error.message);
  },

  /** Monthly fuel cost total for a bike or engineer */
  async getMonthlyCost(engineerId?: string, bikeId?: string): Promise<number> {
    const start = new Date();
    start.setDate(1);
    let q = supabase
      .from('fuel_logs')
      .select('amount')
      .gte('date', start.toISOString().slice(0, 10));
    if (engineerId) q = q.eq('engineer_id', engineerId);
    if (bikeId)     q = q.eq('bike_id', bikeId);
    const { data } = await q;
    return (data ?? []).reduce((s, r) => s + Number(r.amount ?? 0), 0);
  },

  /** Today stats for engineer dashboard */
  async getTodayStats(engineerId: string): Promise<{ km: number; fuelCost: number; fuelLiters: number }> {
    const { data } = await supabase
      .from('fuel_logs')
      .select('amount, liters')
      .eq('engineer_id', engineerId)
      .eq('date', todayStr())
      .limit(10);
    const rows = data ?? [];
    return {
      km:         0,
      fuelCost:   rows.reduce((s, r) => s + Number(r.amount  ?? 0), 0),
      fuelLiters: rows.reduce((s, r) => s + Number(r.liters  ?? 0), 0),
    };
  },
};
