/**
 * Bike Service — Supabase-backed
 * Admin: full CRUD + assignment. Engineer: read-only.
 */
import type { Bike } from '@/types/engineer';
import { supabase } from '@/lib/supabase';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToBike(r: any): Bike {
  return {
    id:                   r.id,
    bikeNumber:           r.registration_number,
    make:                 r.make ?? '',
    model:                r.model ?? '',
    fuelType:             r.fuel_type ?? 'Petrol',
    averageMileage:       Number(r.average_mileage ?? 0),
    initialOdometer:      Number(r.initial_odometer ?? 0),
    currentOdometer:      Number(r.current_odometer ?? r.initial_odometer ?? 0),
    serviceDueDate:       r.service_due_date      ?? undefined,
    pucExpiryDate:        r.puc_expiry_date        ?? undefined,
    insuranceExpiryDate:  r.insurance_expiry_date  ?? undefined,
    assignedEngineerId:   r.assigned_engineer_id   ?? undefined,
    assignedEngineerName: r.assigned_engineer_name ?? undefined,
    status:               r.status ?? 'Active',
    notes:                r.notes ?? undefined,
  };
}

export interface BikeFormData {
  bikeNumber: string;
  make: string;
  model: string;
  fuelType: string;
  averageMileage: number;
  initialOdometer: number;
  serviceDueDate?: string;
  pucExpiryDate?: string;
  insuranceExpiryDate?: string;
  notes?: string;
}

export const bikeService = {
  async getAll(): Promise<Bike[]> {
    const { data, error } = await supabase
      .from('bikes')
      .select('*')
      .order('registration_number');
    if (error) throw new Error(error.message);
    return (data ?? []).map(rowToBike);
  },

  async getById(id: string): Promise<Bike | null> {
    const { data, error } = await supabase
      .from('bikes')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? rowToBike(data) : null;
  },

  async getAssignedBike(engineerId: string): Promise<Bike | null> {
    const { data, error } = await supabase
      .from('bikes')
      .select('*')
      .eq('assigned_engineer_id', engineerId)
      .eq('status', 'Active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? rowToBike(data) : null;
  },

  async create(form: BikeFormData): Promise<Bike> {
    const now = new Date().toISOString();
    const row = {
      registration_number: form.bikeNumber,
      make:                form.make,
      model:               form.model,
      fuel_type:           form.fuelType,
      average_mileage:     form.averageMileage,
      initial_odometer:    form.initialOdometer,
      current_odometer:    form.initialOdometer,
      service_due_date:    form.serviceDueDate    || null,
      puc_expiry_date:     form.pucExpiryDate     || null,
      insurance_expiry_date: form.insuranceExpiryDate || null,
      notes:               form.notes             || null,
      status:              'Active',
      updated_at:          now,
    };
    const { data, error } = await supabase.from('bikes').insert(row).select().single();
    if (error) throw new Error(error.message);
    return rowToBike(data);
  },

  async update(id: string, form: Partial<BikeFormData>): Promise<Bike> {
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (form.make              !== undefined) patch.make               = form.make;
    if (form.model             !== undefined) patch.model              = form.model;
    if (form.fuelType          !== undefined) patch.fuel_type          = form.fuelType;
    if (form.averageMileage    !== undefined) patch.average_mileage    = form.averageMileage;
    if (form.initialOdometer   !== undefined) patch.initial_odometer   = form.initialOdometer;
    if (form.serviceDueDate    !== undefined) patch.service_due_date   = form.serviceDueDate    || null;
    if (form.pucExpiryDate     !== undefined) patch.puc_expiry_date    = form.pucExpiryDate     || null;
    if (form.insuranceExpiryDate !== undefined) patch.insurance_expiry_date = form.insuranceExpiryDate || null;
    if (form.notes             !== undefined) patch.notes              = form.notes             || null;

    const { data, error } = await supabase.from('bikes').update(patch).eq('id', id).select().single();
    if (error) throw new Error(error.message);
    return rowToBike(data);
  },

  async assignEngineer(bikeId: string, engineerId: string, engineerName: string): Promise<Bike> {
    const { data, error } = await supabase
      .from('bikes')
      .update({
        assigned_engineer_id:   engineerId,
        assigned_engineer_name: engineerName,
        updated_at:             new Date().toISOString(),
      })
      .eq('id', bikeId)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return rowToBike(data);
  },

  async unassignEngineer(bikeId: string): Promise<Bike> {
    const { data, error } = await supabase
      .from('bikes')
      .update({
        assigned_engineer_id:   null,
        assigned_engineer_name: null,
        updated_at:             new Date().toISOString(),
      })
      .eq('id', bikeId)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return rowToBike(data);
  },

  async updateOdometer(bikeId: string, newReading: number): Promise<void> {
    const { error } = await supabase
      .from('bikes')
      .update({ current_odometer: newReading, updated_at: new Date().toISOString() })
      .eq('id', bikeId);
    if (error) throw new Error(error.message);
  },

  async softDelete(id: string): Promise<void> {
    const { error } = await supabase
      .from('bikes')
      .update({ status: 'Inactive', updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw new Error(error.message);
  },

  isBikeServiceDueSoon(bike: Bike): boolean {
    if (!bike.serviceDueDate) return false;
    const daysLeft = Math.ceil((new Date(bike.serviceDueDate).getTime() - Date.now()) / 86_400_000);
    return daysLeft <= 7 && daysLeft >= 0;
  },

  isInsuranceExpiringSoon(bike: Bike): boolean {
    if (!bike.insuranceExpiryDate) return false;
    const daysLeft = Math.ceil((new Date(bike.insuranceExpiryDate).getTime() - Date.now()) / 86_400_000);
    return daysLeft <= 30 && daysLeft >= 0;
  },

  isPucExpiringSoon(bike: Bike): boolean {
    if (!bike.pucExpiryDate) return false;
    const daysLeft = Math.ceil((new Date(bike.pucExpiryDate).getTime() - Date.now()) / 86_400_000);
    return daysLeft <= 30 && daysLeft >= 0;
  },
};
