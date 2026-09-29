/**
 * Add AMC Page
 * Sectore 360 — Phase 1, Part 4
 */
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { AMCForm } from '@/components/amc/AMCForm';
import { amcService } from '@/services/amcService';
import type { AMCFormData } from '@/types/amc';
import { toast } from 'sonner';

export default function AddAMCPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const preCustomerId = searchParams.get('customerId') ?? undefined;
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(data: AMCFormData) {
    setIsLoading(true);
    try {
      const amc = await amcService.create(data, user?.name ?? 'Admin');
      toast.success(`AMC ${amc.amcNumber} created successfully`);
      navigate(`/amc/${amc.id}`);
    } catch {
      toast.error('Failed to create AMC contract');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <DashboardLayout>
      <PageHeader
        title="Create AMC Contract"
        description="Define a new Annual Maintenance Contract for a customer."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'AMC', href: '/amc' },
          { label: 'New Contract' },
        ]}
      />
      <AMCForm
        preCustomerId={preCustomerId}
        onSubmit={handleSubmit}
        onCancel={() => navigate('/amc')}
        isLoading={isLoading}
      />
    </DashboardLayout>
  );
}
