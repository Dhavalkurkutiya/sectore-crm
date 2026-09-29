/**
 * RecycleBinPanel
 * View / restore / permanently delete soft-deleted entities
 * Sectore 360 — Enterprise Asset Master
 */
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { EmptyState } from '@/components/shared/EmptyState';
import { recycleBinApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Trash2, RotateCcw, Search, Loader2 } from 'lucide-react';
import type { RecycleBinItem } from '@/types/master';
import { format } from 'date-fns';

interface RecycleBinPanelProps {
  defaultEntityType?: string;
}

export function RecycleBinPanel({ defaultEntityType = 'asset' }: RecycleBinPanelProps) {
  const { user }                     = useAuth();
  const [items,       setItems]      = useState<RecycleBinItem[]>([]);
  const [loading,     setLoading]    = useState(false);
  const [entityType,  setEntityType] = useState(defaultEntityType);
  const [search,      setSearch]     = useState('');
  const [restoreItem, setRestoreItem]= useState<RecycleBinItem | undefined>();
  const [deleteItem,  setDeleteItem] = useState<RecycleBinItem | undefined>();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await recycleBinApi.list(entityType === 'all' ? undefined : entityType);
      setItems(data);
    } catch { toast.error('Failed to load recycle bin'); }
    finally { setLoading(false); }
  }, [entityType]);

  useEffect(() => { load(); }, [load]);

  const filtered = items.filter((i) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (i.entityCode ?? '').toLowerCase().includes(q) ||
      (i.entityName ?? '').toLowerCase().includes(q) ||
      (i.deletedBy ?? '').toLowerCase().includes(q) ||
      (i.deleteReason ?? '').toLowerCase().includes(q)
    );
  });

  const handleRestore = async () => {
    if (!restoreItem) return;
    try {
      await recycleBinApi.restore(restoreItem.id, user?.name ?? 'Admin');
      toast.success(`${restoreItem.entityCode ?? restoreItem.entityName} restored`);
      setItems((prev) => prev.filter((i) => i.id !== restoreItem.id));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Restore failed');
    } finally {
      setRestoreItem(undefined);
    }
  };

  const handlePermanentDelete = async () => {
    if (!deleteItem) return;
    try {
      await recycleBinApi.permanentDelete(deleteItem.id);
      toast.success('Permanently deleted');
      setItems((prev) => prev.filter((i) => i.id !== deleteItem.id));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Delete failed');
    } finally {
      setDeleteItem(undefined);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-0 max-w-xs">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            className="pl-8 h-8 text-sm"
            placeholder="Search recycle bin…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={entityType} onValueChange={setEntityType}>
          <SelectTrigger className="h-8 text-sm w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="asset">Assets</SelectItem>
            <SelectItem value="customer">Customers</SelectItem>
            <SelectItem value="task">Tasks</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={load}>
          <RotateCcw size={14} className="mr-1.5" /> Refresh
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32 text-muted-foreground gap-2 text-sm">
          <Loader2 size={16} className="animate-spin" /> Loading…
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Trash2}
          title="Recycle bin is empty"
          description="Deleted assets, customers, and tasks will appear here."
        />
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="whitespace-nowrap">Code</TableHead>
                <TableHead className="whitespace-nowrap">Name</TableHead>
                <TableHead className="whitespace-nowrap">Type</TableHead>
                <TableHead className="whitespace-nowrap">Deleted By</TableHead>
                <TableHead className="whitespace-nowrap">Deleted On</TableHead>
                <TableHead className="whitespace-nowrap">Reason</TableHead>
                <TableHead className="whitespace-nowrap text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono text-xs whitespace-nowrap">{item.entityCode ?? '—'}</TableCell>
                  <TableCell className="whitespace-nowrap max-w-[140px] truncate">{item.entityName ?? '—'}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    <Badge variant="outline" className="text-xs capitalize">{item.entityType}</Badge>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm">{item.deletedBy}</TableCell>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                    {format(new Date(item.deletedAt), 'dd MMM yyyy HH:mm')}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground max-w-[120px] truncate">
                    {item.deleteReason ?? '—'}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost" size="sm" className="h-7 text-xs gap-1"
                        onClick={() => setRestoreItem(item)}
                      >
                        <RotateCcw size={12} /> Restore
                      </Button>
                      <Button
                        variant="ghost" size="sm" className="h-7 text-xs text-destructive hover:text-destructive"
                        onClick={() => setDeleteItem(item)}
                      >
                        <Trash2 size={12} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Restore Confirm */}
      <AlertDialog open={!!restoreItem} onOpenChange={(o) => !o && setRestoreItem(undefined)}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Restore "{restoreItem?.entityCode ?? restoreItem?.entityName}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This item will be restored and available in its original module.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRestore}>Restore</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Permanent Delete Confirm */}
      <AlertDialog open={!!deleteItem} onOpenChange={(o) => !o && setDeleteItem(undefined)}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently delete?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone. The record will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handlePermanentDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Forever
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
