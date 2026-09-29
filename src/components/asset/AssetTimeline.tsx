/**
 * AssetTimeline
 * Permanent, append-only history of everything that happened to an asset.
 * Sectore 360 — Version 1.0
 */
import { useState, useEffect, useCallback } from 'react';
import {
  Clock, Wrench, FileText, ShieldCheck, Zap, Camera,
  Package, Star, Plus, Trash2, Loader2, Bolt,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { assetTimelineService } from '@/services/assetTemplateService';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { AssetTimelineEvent } from '@/services/assetTemplateService';
import { format } from 'date-fns';

/* ── Event type config ─────────────────────────────────────────── */
const EVENT_CONFIG: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  installation:     { icon: <Zap size={12} />,        color: 'bg-green-500',   label: 'Installation' },
  ticket:           { icon: <Wrench size={12} />,     color: 'bg-orange-500',  label: 'Ticket / Service' },
  engineer_visit:   { icon: <Wrench size={12} />,     color: 'bg-blue-500',    label: 'Engineer Visit' },
  amc:              { icon: <ShieldCheck size={12} />, color: 'bg-violet-500', label: 'AMC' },
  warranty:         { icon: <ShieldCheck size={12} />, color: 'bg-teal-500',   label: 'Warranty' },
  part_replaced:    { icon: <Package size={12} />,    color: 'bg-yellow-600',  label: 'Part Replaced' },
  photo:            { icon: <Camera size={12} />,     color: 'bg-pink-500',    label: 'Photo' },
  document:         { icon: <FileText size={12} />,   color: 'bg-slate-500',   label: 'Document' },
  recommendation:   { icon: <Star size={12} />,       color: 'bg-amber-500',   label: 'Recommendation' },
  note:             { icon: <FileText size={12} />,   color: 'bg-gray-500',    label: 'Note' },
};

const EVENT_TYPES = Object.entries(EVENT_CONFIG).map(([value, cfg]) => ({ value, label: cfg.label }));

function getConfig(type: string) {
  return EVENT_CONFIG[type] ?? { icon: <Bolt size={12} />, color: 'bg-muted-foreground', label: type };
}

function formatDate(dateStr: string) {
  try {
    return format(new Date(dateStr), 'dd MMM yyyy, hh:mm a');
  } catch { return dateStr; }
}

/* ── Main component ─────────────────────────────────────────────── */
interface AssetTimelineProps {
  assetId: string;
}

export function AssetTimeline({ assetId }: AssetTimelineProps) {
  const { user } = useAuth();
  const [events, setEvents]     = useState<AssetTimelineEvent[]>([]);
  const [loading, setLoading]   = useState(true);
  const [addOpen, setAddOpen]   = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving]     = useState(false);

  // Form state
  const [eventType, setEventType]         = useState('note');
  const [title, setTitle]                 = useState('');
  const [description, setDescription]     = useState('');
  const [performedBy, setPerformedBy]     = useState('');
  const [eventDate, setEventDate]         = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await assetTimelineService.list(assetId);
      setEvents(data);
    } catch {
      toast.error('Failed to load timeline');
    } finally {
      setLoading(false);
    }
  }, [assetId]);

  useEffect(() => { load(); }, [load]);

  async function handleAdd() {
    if (!title.trim()) { toast.error('Title is required'); return; }
    setSaving(true);
    try {
      await assetTimelineService.addEvent({
        assetId,
        eventType,
        title: title.trim(),
        description: description.trim() || undefined,
        performedBy: performedBy.trim() || user?.name,
        eventDate: eventDate ? new Date(eventDate).toISOString() : undefined,
      }, user?.name ?? 'system');
      toast.success('Event added to timeline');
      setAddOpen(false);
      setTitle(''); setDescription(''); setPerformedBy(''); setEventDate('');
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to add event');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    try {
      await assetTimelineService.deleteEvent(deleteId);
      toast.success('Event removed');
      await load();
    } catch {
      toast.error('Failed to delete event');
    } finally {
      setDeleteId(null);
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Clock size={14} className="text-primary" />
            Asset Timeline
          </CardTitle>
          <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={() => setAddOpen(true)}>
            <Plus size={12} /> Add Event
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {loading ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground py-4">
            <Loader2 size={13} className="animate-spin" /> Loading timeline…
          </div>
        ) : events.length === 0 ? (
          <p className="text-xs text-muted-foreground py-3">
            No timeline events yet. Installation, tickets, and engineer visits will appear here automatically.
          </p>
        ) : (
          <div className="relative flex flex-col gap-0">
            {/* Vertical line */}
            <div className="absolute left-4 top-2 bottom-2 w-px bg-border" aria-hidden />

            {events.map((event, idx) => {
              const cfg = getConfig(event.eventType);
              return (
                <div key={event.id} className={cn('relative flex gap-3 group', idx < events.length - 1 && 'pb-4')}>
                  {/* Dot */}
                  <div className={cn('relative z-10 flex items-center justify-center w-8 h-8 rounded-full shrink-0 text-white', cfg.color)}>
                    {cfg.icon}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 pt-1">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium">{event.title}</p>
                          <Badge variant="secondary" className="text-[10px] h-4 shrink-0">{cfg.label}</Badge>
                        </div>
                        {event.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{event.description}</p>
                        )}
                        <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground flex-wrap">
                          <span>{formatDate(event.eventDate)}</span>
                          {event.performedBy && <span>By: {event.performedBy}</span>}
                        </div>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive"
                        onClick={() => setDeleteId(event.id)}
                      >
                        <Trash2 size={11} />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      {/* Add Event Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm">Add Timeline Event</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-1.5">
              <Label className="text-sm">Event Type</Label>
              <Select value={eventType} onValueChange={setEventType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EVENT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-sm">Title <span className="text-destructive">*</span></Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. HDD replaced, AMC renewed…"
                className="px-3"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-sm">Description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Additional details…"
                rows={2}
                className="px-3 resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label className="text-sm">Performed By</Label>
                <Input
                  value={performedBy}
                  onChange={(e) => setPerformedBy(e.target.value)}
                  placeholder={user?.name ?? 'Engineer name'}
                  className="px-3"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-sm">Event Date</Label>
                <Input
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="px-2"
                />
              </div>
            </div>
          </div>
          <DialogFooter className="flex-row gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button className="flex-1 gap-2" onClick={handleAdd} disabled={!title.trim() || saving}>
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
              Add Event
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm delete */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Timeline Event?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
