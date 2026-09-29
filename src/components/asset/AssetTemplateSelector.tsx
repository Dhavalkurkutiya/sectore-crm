/**
 * AssetTemplateSelector
 * Dropdown to pick a pre-built asset template (auto-fills Brand/Model/Specs)
 * Sectore 360 — Version 1.0
 */
import { useState, useEffect, useCallback } from 'react';
import { Check, ChevronDown, LayoutTemplate, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { assetTemplateService } from '@/services/assetTemplateService';
import type { AssetTemplate } from '@/services/assetTemplateService';

interface AssetTemplateSelectorProps {
  category?: string;
  onSelect: (template: AssetTemplate) => void;
  onClear?: () => void;
  selectedId?: string;
  disabled?: boolean;
}

export function AssetTemplateSelector({
  category,
  onSelect,
  onClear,
  selectedId,
  disabled,
}: AssetTemplateSelectorProps) {
  const [open, setOpen]               = useState(false);
  const [templates, setTemplates]     = useState<AssetTemplate[]>([]);
  const [selected, setSelected]       = useState<AssetTemplate | null>(null);
  const [loading, setLoading]         = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    assetTemplateService.list(category)
      .then(setTemplates)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open, category]);

  // Resolve selectedId to label
  useEffect(() => {
    if (!selectedId) { setSelected(null); return; }
    assetTemplateService.list(category)
      .then((items) => setSelected(items.find((t) => t.id === selectedId) ?? null))
      .catch(() => {});
  }, [selectedId, category]);

  const handleSelect = useCallback((tpl: AssetTemplate) => {
    setSelected(tpl);
    setOpen(false);
    onSelect(tpl);
  }, [onSelect]);

  const handleClear = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setSelected(null);
    onClear?.();
  }, [onClear]);

  // Group by category
  const grouped = templates.reduce<Record<string, AssetTemplate[]>>((acc, t) => {
    (acc[t.category] ??= []).push(t);
    return acc;
  }, {});

  return (
    <div className="flex items-center gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            disabled={disabled}
            className={cn(
              'flex-1 justify-between font-normal text-sm h-9',
              !selected && 'text-muted-foreground',
            )}
          >
            <span className="flex items-center gap-2 truncate">
              <LayoutTemplate size={14} className="shrink-0 text-primary" />
              {selected ? (
                <span className="truncate">{selected.name}</span>
              ) : (
                'Select template (optional)…'
              )}
            </span>
            {selected
              ? <X size={14} className="shrink-0 ml-1 opacity-60 hover:opacity-100" onClick={handleClear} />
              : <ChevronDown size={14} className="shrink-0 ml-1 opacity-50" />
            }
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[340px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search templates…" />
            <CommandList className="max-h-[260px]">
              {loading && (
                <div className="py-4 text-center text-xs text-muted-foreground">Loading templates…</div>
              )}
              {!loading && Object.keys(grouped).length === 0 && (
                <CommandEmpty className="py-4 text-center text-xs text-muted-foreground">
                  No templates found.
                </CommandEmpty>
              )}
              {!loading && Object.entries(grouped).map(([cat, items]) => (
                <CommandGroup key={cat} heading={cat}>
                  {items.map((tpl) => (
                    <CommandItem
                      key={tpl.id}
                      value={tpl.name}
                      onSelect={() => handleSelect(tpl)}
                      className="flex items-start gap-2 py-2"
                    >
                      <Check
                        size={14}
                        className={cn('mt-0.5 shrink-0', selected?.id === tpl.id ? 'opacity-100 text-primary' : 'opacity-0')}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{tpl.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {[tpl.brand, tpl.deviceType].filter(Boolean).join(' · ')}
                        </p>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selected && (
        <Badge variant="secondary" className="text-xs shrink-0">
          <Plus size={10} className="mr-1" />Template
        </Badge>
      )}
    </div>
  );
}
