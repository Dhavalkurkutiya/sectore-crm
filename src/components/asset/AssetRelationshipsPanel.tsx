/**
 * AssetRelationshipsPanel
 * Displays parent and child asset relationships for an asset.
 * Supports adding / removing relationships.
 * Sectore 360 — Version 1.0
 */
import { useState, useEffect, useCallback } from 'react';
import { Link, GitBranch, Plus, Trash2, Loader2, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { SmartAssetSearchCombobox } from '@/components/task/SmartAssetSearchCombobox';
import { assetRelationshipService } from '@/services/assetTemplateService';
import { assetSearchApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { Asset } from '@/types/customer';
import type { AssetRelationship } from '@/services/assetTemplateService';

interface AssetRelationshipsPanelProps {
  assetId: string;
  customerId: string;
  assetCode: string;
}

export function AssetRelationshipsPanel({ assetId, customerId, assetCode }: AssetRelationshipsPanelProps) {
  const { user } = useAuth();
  const [children, setChildren]       = useState<{ rel: AssetRelationship; asset: Asset | null }[]>([]);
  const [parent, setParent]           = useState<{ rel: AssetRelationship; asset: Asset | null } | null>(null);
  const [loading, setLoading]         = useState(true);
  const [addOpen, setAddOpen]         = useState(false);
  const [deleteId, setDeleteId]       = useState<string | null>(null);
  const [selectedChildId, setSelectedChildId] = useState('');
  const [relType, setRelType]         = useState('child');
  const [saving, setSaving]           = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [childRels, parentRel] = await Promise.all([
        assetRelationshipService.getChildren(assetId),
        assetRelationshipService.getParent(assetId),
      ]);

      // Resolve child assets
      const childWithAssets = await Promise.all(
        childRels.map(async (rel) => {
          const res = await assetSearchApi.search({ query: rel.childId, pageSize: 1 });
          const asset = res.assets.find((a) => a.id === rel.childId) ?? null;
          return { rel, asset };
        })
      );
      setChildren(childWithAssets);

      if (parentRel) {
        const res = await assetSearchApi.search({ query: parentRel.parentId, pageSize: 1 });
        const asset = res.assets.find((a) => a.id === parentRel.parentId) ?? null;
        setParent({ rel: parentRel, asset });
      } else {
        setParent(null);
      }
    } catch {
      toast.error('Failed to load relationships');
    } finally {
      setLoading(false);
    }
  }, [assetId]);

  useEffect(() => { load(); }, [load]);

  async function handleAddChild() {
    if (!selectedChildId) return;
    setSaving(true);
    try {
      await assetRelationshipService.addRelationship(assetId, selectedChildId, relType, user?.name ?? 'system');
      toast.success('Child asset linked.');
      setAddOpen(false);
      setSelectedChildId('');
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to link asset');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    try {
      await assetRelationshipService.removeRelationship(deleteId);
      toast.success('Relationship removed.');
      await load();
    } catch {
      toast.error('Failed to remove relationship');
    } finally {
      setDeleteId(null);
    }
  }

  const REL_LABELS: Record<string, string> = {
    child: 'Child', backup: 'Backup', redundant: 'Redundant',
  };

  function AssetLink({ asset, relLabel }: { asset: Asset | null; relLabel?: string }) {
    if (!asset) return <span className="text-xs text-muted-foreground italic">Asset not found</span>;
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-mono text-xs font-semibold">{asset.assetNumber || asset.code}</span>
        <span className="text-xs text-muted-foreground">{[asset.brand, asset.model].filter(Boolean).join(' ')}</span>
        {relLabel && <Badge variant="secondary" className="text-[10px] h-4">{relLabel}</Badge>}
        <Badge variant="outline" className="text-[10px] h-4">{asset.category}</Badge>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <GitBranch size={14} className="text-primary" />
            Related Assets
          </CardTitle>
          <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={() => setAddOpen(true)}>
            <Plus size={12} /> Link Child
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {loading ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground py-3">
            <Loader2 size={13} className="animate-spin" /> Loading…
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {/* Parent */}
            {parent && (
              <div>
                <p className="text-[10px] uppercase font-semibold text-muted-foreground mb-1.5">Parent</p>
                <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50">
                  <ArrowRight size={12} className="text-muted-foreground shrink-0 rotate-180" />
                  <AssetLink asset={parent.asset} relLabel="Parent" />
                </div>
              </div>
            )}

            {/* Children */}
            {children.length > 0 && (
              <div>
                <p className="text-[10px] uppercase font-semibold text-muted-foreground mb-1.5">
                  Children ({children.length})
                </p>
                <div className="flex flex-col gap-1.5">
                  {children.map(({ rel, asset }) => (
                    <div key={rel.id} className="flex items-center gap-2 p-2 rounded-md bg-muted/50">
                      <ArrowRight size={12} className="text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <AssetLink asset={asset} relLabel={REL_LABELS[rel.relationship] ?? rel.relationship} />
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 shrink-0 text-destructive hover:text-destructive"
                        onClick={() => setDeleteId(rel.id)}
                      >
                        <Trash2 size={12} />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!parent && children.length === 0 && (
              <p className="text-xs text-muted-foreground py-2">
                No relationships defined. Link parent–child assets to visualize your infrastructure topology.
              </p>
            )}
          </div>
        )}
      </CardContent>

      {/* Add Child Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm">
              <Link size={14} className="text-primary" />
              Link Child Asset to {assetCode}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-1.5">
              <Label className="text-sm">Child Asset</Label>
              <SmartAssetSearchCombobox
                customerId={customerId}
                value={selectedChildId}
                onChange={(id) => setSelectedChildId(id)}
                placeholder="Search asset to link as child…"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-sm">Relationship Type</Label>
              <Select value={relType} onValueChange={setRelType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="child">Child</SelectItem>
                  <SelectItem value="backup">Backup</SelectItem>
                  <SelectItem value="redundant">Redundant</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="flex-row gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button className="flex-1 gap-2" onClick={handleAddChild} disabled={!selectedChildId || saving}>
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Link size={13} />}
              Link Asset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm delete */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Relationship?</AlertDialogTitle>
            <AlertDialogDescription>
              This will unlink the child asset. The assets themselves will not be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
