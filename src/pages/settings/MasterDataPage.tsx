/**
 * Master Data Management Page
 * Settings > Master Data
 * Sectore 360 — Enterprise Asset Master
 * One page, 40+ masters, full CRUD / search / import / export
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { EmptyState } from '@/components/shared/EmptyState';
import { masterDataService } from '@/services/masterDataService';
import { masterDataApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
  Plus, Pencil, Trash2, Search, Download, Upload,
  ToggleLeft, ToggleRight, Database, ChevronRight, Loader2,
} from 'lucide-react';
import type { MasterItem } from '@/types/master';
import { MASTER_TYPE_LABELS, MASTER_TYPE_GROUPS } from '@/types/master';
import { cn } from '@/lib/utils';
import Papa from 'papaparse';

/* ── Sub-component: Master List Panel ───────────────────── */
function MasterSidebar({ selected, onSelect }: { selected: string; onSelect: (t: string) => void }) {
  return (
    <aside className="w-56 shrink-0 border-r border-border flex flex-col">
      <div className="p-3 border-b border-border">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Master Types</p>
      </div>
      <ScrollArea className="flex-1">
        <div className="py-2">
          {MASTER_TYPE_GROUPS.map((group) => (
            <div key={group.group} className="mb-1">
              <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                {group.group}
              </p>
              {group.types.map((type) => (
                <button
                  key={type}
                  onClick={() => onSelect(type)}
                  className={cn(
                    'w-full text-left px-3 py-1.5 text-sm rounded-sm mx-1 flex items-center justify-between transition-colors',
                    selected === type
                      ? 'bg-primary text-primary-foreground font-medium'
                      : 'hover:bg-accent text-foreground'
                  )}
                >
                  <span className="truncate">{MASTER_TYPE_LABELS[type] ?? type}</span>
                  {selected === type && <ChevronRight size={12} className="shrink-0 ml-1" />}
                </button>
              ))}
            </div>
          ))}
        </div>
      </ScrollArea>
    </aside>
  );
}

/* ── Item Dialog ─────────────────────────────────────────── */
interface ItemDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (value: string, code: string) => Promise<void>;
  editItem?: MasterItem;
  masterType: string;
}
function ItemDialog({ open, onClose, onSave, editItem, masterType }: ItemDialogProps) {
  const [value, setValue] = useState('');
  const [code,  setCode]  = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setValue(editItem?.value ?? '');
    setCode(editItem?.code ?? '');
  }, [editItem, open]);

  const handleSave = async () => {
    if (!value.trim()) { toast.error('Value is required'); return; }
    setSaving(true);
    try { await onSave(value.trim(), code.trim()); onClose(); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Failed to save'); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md">
        <DialogHeader>
          <DialogTitle>{editItem ? 'Edit' : 'Add'} {MASTER_TYPE_LABELS[masterType] ?? masterType}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-1.5">
            <Label>Value <span className="text-destructive">*</span></Label>
            <Input value={value} onChange={(e) => setValue(e.target.value)} placeholder="Enter value" autoFocus />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Code <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Short code" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 size={14} className="mr-2 animate-spin" />}
            {editItem ? 'Update' : 'Add'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ── Main Page ───────────────────────────────────────────── */
export default function MasterDataPage() {
  const { user } = useAuth();
  const [selectedType, setSelectedType] = useState(MASTER_TYPE_GROUPS[0].types[0]);
  const [items,        setItems]        = useState<MasterItem[]>([]);
  const [loading,      setLoading]      = useState(false);
  const [search,       setSearch]       = useState('');
  const [showAll,      setShowAll]      = useState(false);
  const [dialogOpen,   setDialogOpen]   = useState(false);
  const [editItem,     setEditItem]     = useState<MasterItem | undefined>();
  const [deleteItem,   setDeleteItem]   = useState<MasterItem | undefined>();
  const importRef                       = useRef<HTMLInputElement>(null);

  const load = useCallback(async (type: string) => {
    setLoading(true);
    try {
      const data = await masterDataService.list(type, true);
      setItems(data);
    } catch { toast.error('Failed to load master data'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    setSearch('');
    setShowAll(false);
    load(selectedType);
  }, [selectedType, load]);

  const filtered = items.filter((i) => {
    const matchSearch = !search || i.value.toLowerCase().includes(search.toLowerCase());
    const matchActive = showAll || i.isActive;
    return matchSearch && matchActive;
  });

  /* ── CRUD handlers ──────────────────────────────────── */
  const handleSave = async (value: string, code: string) => {
    if (editItem) {
      await masterDataService.update(editItem.id, selectedType, { value, code });
      toast.success('Updated successfully');
    } else {
      await masterDataService.create({ masterType: selectedType, value, code }, user?.name ?? 'Admin');
      toast.success(`"${value}" added`);
    }
    setEditItem(undefined);
    load(selectedType);
  };

  const handleToggleActive = async (item: MasterItem) => {
    await masterDataService.setActive(item.id, selectedType, !item.isActive);
    setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, isActive: !i.isActive } : i));
    toast.success(item.isActive ? 'Deactivated' : 'Activated');
  };

  const handleDelete = async () => {
    if (!deleteItem) return;
    await masterDataService.delete(deleteItem.id, selectedType);
    setItems((prev) => prev.filter((i) => i.id !== deleteItem.id));
    toast.success(`"${deleteItem.value}" deleted`);
    setDeleteItem(undefined);
  };

  /* ── Export ──────────────────────────────────────────── */
  const handleExport = () => {
    const exportItems = filtered.length ? filtered : items;
    masterDataService.exportCsv(exportItems);
  };

  /* ── Import CSV/Excel ─────────────────────────────── */
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    const ext = file.name.split('.').pop()?.toLowerCase();

    if (ext === 'csv' || ext === 'txt') {
      Papa.parse<Record<string, string>>(file, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          let count = 0;
          for (const row of results.data) {
            const val = (row['value'] ?? row['Value'] ?? Object.values(row)[0] ?? '').trim();
            if (!val) continue;
            try {
              await masterDataService.create(
                { masterType: selectedType, value: val, code: row['code'] ?? '' },
                user?.name ?? 'Admin'
              );
              count++;
            } catch { /* skip duplicates */ }
          }
          toast.success(`Imported ${count} items`);
          load(selectedType);
        },
        error: () => toast.error('Failed to parse CSV'),
      });
    } else {
      // xlsx — dynamic import
      import('xlsx').then(({ read, utils }) => {
        const reader = new FileReader();
        reader.onload = async (ev) => {
          const wb = read(ev.target?.result, { type: 'array' });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const rows = utils.sheet_to_json<Record<string, string>>(ws);
          let count = 0;
          for (const row of rows) {
            const val = (row['value'] ?? row['Value'] ?? Object.values(row)[0] ?? '').trim();
            if (!val) continue;
            try {
              await masterDataService.create(
                { masterType: selectedType, value: val },
                user?.name ?? 'Admin'
              );
              count++;
            } catch { /* skip duplicates */ }
          }
          toast.success(`Imported ${count} items`);
          load(selectedType);
        };
        reader.readAsArrayBuffer(file);
      });
    }
  };

  const activeCount   = items.filter((i) => i.isActive).length;
  const inactiveCount = items.length - activeCount;

  return (
    <DashboardLayout>
      <PageHeader
        title="Master Data"
        description="Manage all lookup values used across the system — categories, brands, departments, and more."
        breadcrumbs={[
          { label: 'Settings', href: '/settings' },
          { label: 'Master Data' },
        ]}
      />

      <div className="flex h-[calc(100vh-180px)] border border-border rounded-lg overflow-hidden bg-card">
        {/* Left sidebar: master type list */}
        <MasterSidebar selected={selectedType} onSelect={setSelectedType} />

        {/* Right panel: CRUD table */}
        <div className="flex-1 min-w-0 flex flex-col">
          {/* Toolbar */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border shrink-0 flex-wrap">
            <div className="flex-1 min-w-0">
              <h2 className="font-semibold text-base truncate">
                {MASTER_TYPE_LABELS[selectedType] ?? selectedType}
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  ({activeCount} active{inactiveCount > 0 ? `, ${inactiveCount} inactive` : ''})
                </span>
              </h2>
            </div>
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                className="pl-8 h-8 w-44 text-sm"
                placeholder="Search…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Switch checked={showAll} onCheckedChange={setShowAll} className="scale-75" />
              <span className="text-xs">Show inactive</span>
            </div>
            <Separator orientation="vertical" className="h-6" />
            <Button variant="outline" size="sm" onClick={handleExport} className="gap-1.5">
              <Download size={14} /> Export
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => importRef.current?.click()}>
              <Upload size={14} /> Import
            </Button>
            <input ref={importRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleImportFile} />
            <Button size="sm" className="gap-1.5" onClick={() => { setEditItem(undefined); setDialogOpen(true); }}>
              <Plus size={14} /> Add
            </Button>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-auto min-h-0">
            {loading ? (
              <div className="flex items-center justify-center h-32 text-muted-foreground gap-2 text-sm">
                <Loader2 size={16} className="animate-spin" /> Loading…
              </div>
            ) : filtered.length === 0 ? (
              <EmptyState
                icon={Database}
                title="No items found"
                description={search ? 'Try a different search term.' : 'Click Add to create the first item.'}
                action={{ label: 'Add Item', onClick: () => { setEditItem(undefined); setDialogOpen(true); } }}
              />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead className="w-28">Code</TableHead>
                      <TableHead className="w-24">Status</TableHead>
                      <TableHead className="w-32 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((item, idx) => (
                      <TableRow key={item.id} className={!item.isActive ? 'opacity-50' : ''}>
                        <TableCell className="text-muted-foreground text-xs whitespace-nowrap">{idx + 1}</TableCell>
                        <TableCell className="font-medium whitespace-nowrap">{item.value}</TableCell>
                        <TableCell className="text-muted-foreground text-sm whitespace-nowrap">{item.code ?? '—'}</TableCell>
                        <TableCell className="whitespace-nowrap">
                          <Badge variant={item.isActive ? 'default' : 'secondary'} className="text-xs">
                            {item.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost" size="icon" className="h-7 w-7"
                              title={item.isActive ? 'Deactivate' : 'Activate'}
                              onClick={() => handleToggleActive(item)}
                            >
                              {item.isActive
                                ? <ToggleRight size={15} className="text-primary" />
                                : <ToggleLeft size={15} className="text-muted-foreground" />}
                            </Button>
                            <Button
                              variant="ghost" size="icon" className="h-7 w-7"
                              onClick={() => { setEditItem(item); setDialogOpen(true); }}
                            >
                              <Pencil size={13} />
                            </Button>
                            <Button
                              variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => setDeleteItem(item)}
                            >
                              <Trash2 size={13} />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add/Edit Dialog */}
      <ItemDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditItem(undefined); }}
        onSave={handleSave}
        editItem={editItem}
        masterType={selectedType}
      />

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteItem} onOpenChange={(o) => !o && setDeleteItem(undefined)}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteItem?.value}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this item. Assets already using this value will keep it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
