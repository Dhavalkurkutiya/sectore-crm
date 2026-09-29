/**
 * EditCustomerPage
 * Sectore 360 — Phase 1, Part 2
 */
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { CustomerForm } from '@/components/customer/CustomerForm';
import { PageLoader } from '@/components/shared/Spinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { customerService } from '@/services/customerService';
import type { Customer, CustomerFormData } from '@/types/customer';
import { toast } from 'sonner';
import { AlertTriangle } from 'lucide-react';

export default function EditCustomerPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    customerService.getById(id).then((c) => {
      setCustomer(c);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id]);

  const handleSubmit = async (data: CustomerFormData) => {
    if (!id) return;
    setSaving(true);
    try {
      await customerService.update(id, data, user?.name ?? 'Admin');
      toast.success('Customer updated successfully');
      navigate(`/customers/${id}`);
    } catch {
      toast.error('Failed to update customer. Please try again.');
      setSaving(false);
    }
  };

  if (loading) return <DashboardLayout><PageLoader /></DashboardLayout>;
  if (!customer) {
    return (
      <DashboardLayout>
        <EmptyState icon={AlertTriangle} title="Customer not found" description="The requested customer does not exist." />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <PageHeader
        title={`Edit — ${customer.companyName}`}
        description="Update customer information."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Customers', href: '/customers' },
          { label: customer.companyName, href: `/customers/${id}` },
          { label: 'Edit' },
        ]}
      />
      <div className="max-w-3xl">
        <CustomerForm
          customer={customer}
          onSubmit={handleSubmit}
          onCancel={() => navigate(`/customers/${id}`)}
          isLoading={saving}
        />
      </div>
    </DashboardLayout>
  );
}
