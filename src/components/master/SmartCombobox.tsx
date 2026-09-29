/**
 * SmartCombobox
 * Search + autocomplete + recently-used + inline "Add New"
 * Sectore 360 — Enterprise Asset Master
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { Check, ChevronsUpDown, Plus, Clock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { masterDataService } from '@/services/masterDataService';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { MasterItem } from '@/types/master';

const RECENTLY_USED_KEY = (masterType: string) => `sectore360_ru_${masterType}`;
const MAX_RECENT = 5;

function getRecent(masterType: string): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENTLY_USED_KEY(masterType)) ?? '[]') as string[];
  } catch { return []; }
}

function addRecent(masterType: string, value: string): void {
  const prev = getRecent(masterType).filter((v) => v !== value);
  localStorage.setItem(RECENTLY_USED_KEY(masterType), JSON.stringify([value, ...prev].slice(0, MAX_RECENT)));
}

interface SmartComboboxProps {
  masterType: string;
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  allowAddNew?: boolean;
  /** If provided, filter items to those whose metadata.category includes this */
  filterByCategory?: string;
}

export function SmartCombobox({
  masterType,
  value,
  onChange,
  placeholder = 'Select or type…',
  disabled,
  className,
  allowAddNew = true,
  filterByCategory,
}: SmartComboboxProps) {
  const { user } = useAuth();
  const [open, setOpen]       = useState(false);
  const [items, setItems]     = useState<MasterItem[]>([]);
  const [query, setQuery]     = useState('');
  const [recent, setRecent]   = useState<string[]>([]);
  const [adding, setAdding]   = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef           = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Load items on open
  useEffect(() => {
    if (!open) return;
    setRecent(getRecent(masterType));
    setLoading(true);
    masterDataService.list(masterType)
      .then((data) => {
        let filtered = data;
        if (filterByCategory) {
          filtered = data.filter((item) => {
            const cats = (item.metadata?.category as string[] | undefined);
            return !cats || cats.includes(filterByCategory);
          });
        }
        setItems(filtered);
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [open, masterType, filterByCategory]);

  // Debounced search on query change
  useEffect(() => {
    if (!open) return;
    clearTimeout(debounceRef.current);
    if (!query) {
      masterDataService.list(masterType).then(setItems).catch(() => {});
      return;
    }
    debounceRef.current = setTimeout(() => {
      masterDataService.search(masterType, query).then(setItems).catch(() => {});
    }, 220);
    return () => clearTimeout(debounceRef.current);
  }, [query, masterType, open]);

  const select = useCallback((val: string) => {
    onChange(val);
    addRecent(masterType, val);
    setOpen(false);
    setQuery('');
  }, [onChange, masterType]);

  const handleAddNew = useCallback(async () => {
    const trimmed = query.trim();
    if (!trimmed) return;
    setAdding(true);
    try {
      const item = await masterDataService.quickAdd(masterType, trimmed, user?.name ?? 'System');
      setItems((prev) => [...prev, item]);
      select(item.value);
      toast.success(`"${item.value}" added to ${masterType.replace(/_/g, ' ')}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to add item');
    } finally {
      setAdding(false);
    }
  }, [query, masterType, user, select]);

  const recentItems  = recent.filter((r) => items.some((i) => i.value === r));
  const regularItems = items.filter((i) => !recentItems.includes(i.value));
  const showAddNew   = allowAddNew && query.trim() && !items.some((i) => i.value.toLowerCase() === query.trim().toLowerCase());

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            'w-full justify-between font-normal text-sm h-9',
            !value && 'text-muted-foreground',
            className
          )}
        >
          <span className="truncate">{value || placeholder}</span>
          <ChevronsUpDown size={14} className="ml-2 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={`Search ${masterType.replace(/_/g, ' ')}…`}
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            {loading && (
              <div className="flex items-center justify-center py-4 text-muted-foreground text-xs gap-2">
                <Loader2 size={14} className="animate-spin" /> Loading…
              </div>
            )}

            {!loading && recentItems.length > 0 && (
              <CommandGroup heading={<span className="flex items-center gap-1 text-[10px]"><Clock size={10} />Recently Used</span>}>
                {recentItems.map((r) => (
                  <CommandItem key={`r:${r}`} value={r} onSelect={() => select(r)}>
                    <Check size={14} className={cn('mr-2 shrink-0', value === r ? 'opacity-100' : 'opacity-0')} />
                    {r}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {!loading && recentItems.length > 0 && regularItems.length > 0 && <CommandSeparator />}

            {!loading && regularItems.length > 0 && (
              <CommandGroup heading={recentItems.length > 0 ? 'All' : undefined}>
                {regularItems.map((item) => (
                  <CommandItem key={item.id} value={item.value} onSelect={() => select(item.value)}>
                    <Check size={14} className={cn('mr-2 shrink-0', value === item.value ? 'opacity-100' : 'opacity-0')} />
                    {item.value}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {!loading && items.length === 0 && !showAddNew && (
              <CommandEmpty>No results found.</CommandEmpty>
            )}

            {showAddNew && (
              <>
                {items.length > 0 && <CommandSeparator />}
                <CommandGroup>
                  <CommandItem
                    value={`__add__${query}`}
                    onSelect={handleAddNew}
                    className="text-primary font-medium"
                    disabled={adding}
                  >
                    {adding
                      ? <Loader2 size={14} className="mr-2 animate-spin" />
                      : <Plus size={14} className="mr-2" />}
                    Add "{query.trim()}"
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
