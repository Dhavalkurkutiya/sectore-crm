import { DashboardLayout } from '@/components/layouts/DashboardLayout';
/**
 * Fuel Entry Page — redirects to history (fuel is admin-only in this model)
 */
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export default function FuelEntryPage() {
  const navigate = useNavigate();
  useEffect(() => {
    toast.info('Fuel entries are managed by Admin. Showing your fuel history.');
    navigate('/engineer/fuel/history', { replace: true });
  }, [navigate]);
  return <DashboardLayout><div /></DashboardLayout>;
}
