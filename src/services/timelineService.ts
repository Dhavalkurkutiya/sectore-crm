/**
 * Timeline Service — Supabase-backed
 * Sectore 360 — Phase 1, Part 2
 */
import type { TimelineEvent, TimelineEventType } from '@/types/customer';
import { supabase } from '@/lib/supabase';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToEvent(r: any): TimelineEvent {
  return {
    id:          r.id,
    entityId:    r.entity_id,
    entityType:  r.entity_type,
    eventType:   r.event_type as TimelineEventType,
    title:       r.title,
    description: r.description ?? undefined,
    performedBy: r.performed_by,
    createdAt:   r.created_at,
  };
}

export const timelineService = {
  async getByEntity(entityId: string): Promise<TimelineEvent[]> {
    const { data } = await supabase
      .from('entity_timeline')
      .select('*')
      .eq('entity_id', entityId)
      .order('created_at', { ascending: false });
    return (data ?? []).map(rowToEvent);
  },

  async getByEntityAndType(entityId: string, types: TimelineEventType[]): Promise<TimelineEvent[]> {
    const { data } = await supabase
      .from('entity_timeline')
      .select('*')
      .eq('entity_id', entityId)
      .in('event_type', types)
      .order('created_at', { ascending: false });
    return (data ?? []).map(rowToEvent);
  },

  async add(event: Omit<TimelineEvent, 'id' | 'createdAt'>): Promise<void> {
    await supabase.from('entity_timeline').insert({
      id:           `evt_${Date.now()}`,
      entity_id:    event.entityId,
      entity_type:  event.entityType,
      event_type:   event.eventType,
      title:        event.title,
      description:  event.description ?? null,
      performed_by: event.performedBy,
    });
  },
};
