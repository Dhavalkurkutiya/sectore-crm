/**
 * AddAssetPage
 * Sectore 360 — Phase 1, Part 2
 */
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { AssetForm } from '@/components/asset/AssetForm';
import { assetService } from '@/services/assetService';
import type { AssetFormData } from '@/types/customer';
import { toast } from 'sonner';

export default function AddAssetPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const defaultCustomerId = searchParams.get('customerId') ?? undefined;
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (data: AssetFormData) => {
    setSaving(true);
    try {
      const asset = await assetService.create(data, user?.name ?? 'Admin');
      toast.success(`Asset ${asset.code} created`, { description: `Serial: ${asset.serialNumber}` });
      navigate(`/assets/${asset.id}`);
    } catch {
      toast.error('Failed to create asset. Please try again.');
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <PageHeader
        title="Add Asset"
        description="Register a new asset."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Assets', href: '/assets' },
          { label: 'Add Asset' },
        ]}
      />
      <div className="max-w-3xl">
        <AssetForm
          defaultCustomerId={defaultCustomerId}
          onSubmit={handleSubmit}
          onCancel={() => navigate('/assets')}
          isLoading={saving}
        />
      </div>
    </DashboardLayout>
  );
}
