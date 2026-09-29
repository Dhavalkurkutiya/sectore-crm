/**
 * Bike Info Page — Engineer (Read-Only)
 * Shows assigned bike details. No editing allowed.
 */
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEngineerContext } from '@/contexts/EngineerContext';
import { bikeService } from '@/services/bikeService';
import type { Bike } from '@/types/engineer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, Bike as BikeIcon, AlertTriangle, Calendar, Gauge, Shield, ShieldAlert, Wrench } from 'lucide-react';

function daysUntil(date?: string): number | null {
  if (!date) return null;
  return Math.ceil((new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

export default function BikeInfoPage() {
  const navigate = useNavigate();
  const { engineerId } = useEngineerContext();
  const [bike, setBike] = useState<Bike | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!engineerId) { setLoading(false); return; }
    bikeService.getAssignedBike(engineerId)
      .then(setBike).catch(() => {}).finally(() => setLoading(false));
  }, [engineerId]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-64">
          <p className="text-muted-foreground text-sm">Loading…</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!bike) {
    return (
      <DashboardLayout>
        <div className="flex flex-col gap-4 max-w-lg mx-auto pb-8">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" className="h-9 w-9 p-0" onClick={() => navigate(-1)}>
              <ChevronLeft size={18} />
            </Button>
            <h1 className="text-lg font-bold text-foreground">My Bike</h1>
          </div>
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground text-sm">
              No bike assigned to you yet. Contact your admin.
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  const serviceSoon   = bikeService.isBikeServiceDueSoon(bike);
  const insureSoon    = bikeService.isInsuranceExpiringSoon(bike);
  const pucSoon       = bikeService.isPucExpiringSoon(bike);
  const serviceDays   = daysUntil(bike.serviceDueDate);
  const insuranceDays = daysUntil(bike.insuranceExpiryDate);
  const pucDays       = daysUntil(bike.pucExpiryDate);

  return (
    <DashboardLayout>
    <div className="flex flex-col gap-4 max-w-lg mx-auto pb-8">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" className="h-9 w-9 p-0" onClick={() => navigate(-1)}>
          <ChevronLeft size={18} />
        </Button>
        <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
          <BikeIcon size={18} className="text-primary" /> My Bike
        </h1>
        <Badge variant={bike.status === 'Active' ? 'secondary' : 'outline'} className="ml-auto text-xs">
          {bike.status}
        </Badge>
      </div>

      {/* Alerts */}
      {(serviceSoon || insureSoon || pucSoon) && (
        <div className="flex flex-col gap-2">
          {serviceSoon && (
            <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-300 rounded-lg dark:bg-amber-950/20 dark:border-amber-700">
              <AlertTriangle size={15} className="text-amber-600 shrink-0" />
              <p className="text-sm text-amber-700 dark:text-amber-300 font-medium">
                Service due in {serviceDays} day{serviceDays !== 1 ? 's' : ''}
              </p>
            </div>
          )}
          {insureSoon && (
            <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-300 rounded-lg dark:bg-red-950/20 dark:border-red-700">
              <AlertTriangle size={15} className="text-red-600 shrink-0" />
              <p className="text-sm text-red-700 dark:text-red-300 font-medium">
                Insurance expires in {insuranceDays} day{insuranceDays !== 1 ? 's' : ''}
              </p>
            </div>
          )}
          {pucSoon && (
            <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-300 rounded-lg dark:bg-red-950/20 dark:border-red-700">
              <AlertTriangle size={15} className="text-red-600 shrink-0" />
              <p className="text-sm text-red-700 dark:text-red-300 font-medium">
                PUC expires in {pucDays} day{pucDays !== 1 ? 's' : ''}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Main Card */}
      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-semibold">Vehicle Information</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 flex flex-col gap-4">
          {/* Identity */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <BikeIcon size={22} className="text-primary" />
            </div>
            <div>
              <p className="text-base font-bold text-foreground">{bike.make} {bike.model}</p>
              <p className="text-sm font-mono text-muted-foreground">{bike.bikeNumber}</p>
              <Badge variant="outline" className="text-xs mt-0.5">{bike.fuelType}</Badge>
            </div>
          </div>

          {/* Odometer */}
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border">
            <div className="flex flex-col gap-0.5">
              <p className="text-xs text-muted-foreground flex items-center gap-1"><Gauge size={11} /> Current Odometer</p>
              <p className="text-sm font-semibold text-foreground">{bike.currentOdometer.toLocaleString()} KM</p>
            </div>
            <div className="flex flex-col gap-0.5">
              <p className="text-xs text-muted-foreground flex items-center gap-1"><Gauge size={11} /> Avg Mileage</p>
              <p className="text-sm font-semibold text-foreground">{bike.averageMileage} KM/L</p>
            </div>
          </div>

          {/* Dates */}
          <div className="flex flex-col gap-2 pt-2 border-t border-border">
            {[
              { label: 'Service Due',       icon: Wrench,      date: bike.serviceDueDate,      warn: serviceSoon },
              { label: 'Insurance Expiry',  icon: Shield,      date: bike.insuranceExpiryDate, warn: insureSoon },
              { label: 'PUC Expiry',        icon: ShieldAlert, date: bike.pucExpiryDate,        warn: pucSoon },
            ].map(({ label, icon: Icon, date, warn }) => date ? (
              <div key={label} className="flex items-center justify-between py-1.5">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Icon size={14} /> {label}
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-foreground">{date}</p>
                  {warn && (
                    <Badge variant="outline" className="text-xs bg-amber-50 text-amber-600 border-amber-300 dark:bg-amber-950 dark:text-amber-300">
                      Soon
                    </Badge>
                  )}
                </div>
              </div>
            ) : null)}
          </div>

          {bike.notes && (
            <div className="pt-2 border-t border-border">
              <p className="text-xs text-muted-foreground mb-1">Notes</p>
              <p className="text-sm text-foreground">{bike.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Read-only notice */}
      <Card className="bg-muted/30 border-dashed">
        <CardContent className="p-3 flex items-center gap-2">
          <Calendar size={14} className="text-muted-foreground shrink-0" />
          <p className="text-xs text-muted-foreground">
            Bike details are managed by admin. Contact your manager for changes.
          </p>
        </CardContent>
      </Card>
    </div>
    </DashboardLayout>
  );
}
