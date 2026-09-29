/**
 * AddCustomerPage
 * Sectore 360 — Phase 1, Part 2
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { CustomerForm } from '@/components/customer/CustomerForm';
import { customerService } from '@/services/customerService';
import type { CustomerFormData } from '@/types/customer';
import { toast } from 'sonner';

export default function AddCustomerPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (data: CustomerFormData) => {
    setSaving(true);
    try {
      const customer = await customerService.create(data, user?.name ?? 'Admin');
      toast.success(`${customer.companyName} created successfully`, {
        description: `Customer code: ${customer.code}`,
      });
      navigate(`/customers/${customer.id}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      toast.error(`Failed to create customer: ${msg}`);
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <PageHeader
        title="Add Customer"
        description="Create a new customer record."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Customers', href: '/customers' },
          { label: 'Add Customer' },
        ]}
      />
      <div className="max-w-3xl">
        <CustomerForm
          onSubmit={handleSubmit}
          onCancel={() => navigate('/customers')}
          isLoading={saving}
        />
      </div>
    </DashboardLayout>
  );
}
