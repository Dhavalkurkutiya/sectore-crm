/**
 * Edit Task Page
 * Sectore 360 — Phase 1, Part 3
 */
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { PageLoader } from '@/components/shared/Spinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { TaskForm } from '@/components/task/TaskForm';
import { taskService } from '@/services/taskService';
import type { Task, TaskFormData } from '@/types/task';
import { toast } from 'sonner';
import { ClipboardList } from 'lucide-react';

export default function EditTaskPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [task, setTask]       = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);

  useEffect(() => {
    if (!id) return;
    taskService.getById(id).then((t) => { setTask(t); setLoading(false); }).catch(() => setLoading(false));
  }, [id]);

  const handleSubmit = async (data: TaskFormData) => {
    if (!task) return;
    setSaving(true);
    try {
      await taskService.update(task.id, data, user?.name ?? 'System');
      toast.success('Task updated successfully.');
      navigate(`/tasks/${task.id}`);
    } catch {
      toast.error('Failed to update task.');
      setSaving(false);
    }
  };

  if (loading) return <DashboardLayout><PageLoader /></DashboardLayout>;
  if (!task) return (
    <DashboardLayout>
      <EmptyState icon={ClipboardList} title="Task not found" description="The task you are looking for does not exist." />
    </DashboardLayout>
  );

  return (
    <DashboardLayout>
      <PageHeader
        title={`Edit ${task.taskNumber}`}
        description="Update service task details."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Tasks', href: '/tasks' },
          { label: task.taskNumber, href: `/tasks/${task.id}` },
          { label: 'Edit' },
        ]}
      />
      <div className="max-w-4xl">
        <TaskForm
          task={task}
          onSubmit={handleSubmit}
          onCancel={() => navigate(`/tasks/${task.id}`)}
          isLoading={saving}
        />
      </div>
    </DashboardLayout>
  );
}
