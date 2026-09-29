/**
 * EditAssetPage
 * Sectore 360 — Phase 1, Part 2
 */
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { AssetForm } from '@/components/asset/AssetForm';
import { PageLoader } from '@/components/shared/Spinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { assetService } from '@/services/assetService';
import type { Asset, AssetFormData } from '@/types/customer';
import { toast } from 'sonner';
import { AlertTriangle } from 'lucide-react';

export default function EditAssetPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [asset, setAsset] = useState<Asset | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    assetService.getById(id).then((a) => { setAsset(a); setLoading(false); }).catch(() => setLoading(false));
  }, [id]);

  const handleSubmit = async (data: AssetFormData) => {
    if (!id) return;
    setSaving(true);
    try {
      await assetService.update(id, data, user?.name ?? 'Admin');
      toast.success('Asset updated successfully');
      navigate(`/assets/${id}`);
    } catch {
      toast.error('Failed to update asset.');
      setSaving(false);
    }
  };

  if (loading) return <DashboardLayout><PageLoader /></DashboardLayout>;
  if (!asset) return <DashboardLayout><EmptyState icon={AlertTriangle} title="Asset not found" /></DashboardLayout>;

  return (
    <DashboardLayout>
      <PageHeader
        title={`Edit — ${asset.code}`}
        description={`${asset.brand ?? ''} ${asset.model ?? ''}`.trim() || 'Edit asset details'}
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Assets', href: '/assets' },
          { label: asset.code, href: `/assets/${id}` },
          { label: 'Edit' },
        ]}
      />
      <div className="max-w-3xl">
        <AssetForm
          asset={asset}
          onSubmit={handleSubmit}
          onCancel={() => navigate(`/assets/${id}`)}
          isLoading={saving}
        />
      </div>
    </DashboardLayout>
  );
}
