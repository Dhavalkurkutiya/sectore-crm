/**
 * Edit AMC Page
 * Sectore 360 — Phase 1, Part 4
 */
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { PageLoader } from '@/components/shared/Spinner';
import { AMCForm } from '@/components/amc/AMCForm';
import { amcService } from '@/services/amcService';
import type { AMC, AMCFormData } from '@/types/amc';
import { toast } from 'sonner';

export default function EditAMCPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [amc, setAMC] = useState<AMC | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    amcService.getById(id).then((data) => { setAMC(data); setLoading(false); }).catch(() => setLoading(false));
  }, [id]);

  async function handleSubmit(data: AMCFormData) {
    if (!id) return;
    setIsLoading(true);
    try {
      await amcService.update(id, data, user?.name ?? 'Admin');
      toast.success('AMC contract updated successfully');
      navigate(`/amc/${id}`);
    } catch {
      toast.error('Failed to update AMC contract');
    } finally {
      setIsLoading(false);
    }
  }

  if (loading) return <DashboardLayout><PageLoader /></DashboardLayout>;
  if (!amc) return <DashboardLayout><p className="text-center py-16 text-muted-foreground">AMC not found.</p></DashboardLayout>;

  return (
    <DashboardLayout>
      <PageHeader
        title={`Edit ${amc.amcNumber}`}
        description="Modify contract details, coverage, and visit configuration."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'AMC', href: '/amc' },
          { label: amc.amcNumber, href: `/amc/${id}` },
          { label: 'Edit' },
        ]}
      />
      <AMCForm
        initial={amc}
        onSubmit={handleSubmit}
        onCancel={() => navigate(`/amc/${id}`)}
        isLoading={isLoading}
      />
    </DashboardLayout>
  );
}
