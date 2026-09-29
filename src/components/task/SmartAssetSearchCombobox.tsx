/**
 * SmartAssetSearchCombobox
 * Enterprise search dropdown for selecting an asset under a customer.
 * Replaces the basic Select in TaskForm.
 *
 * Searches across: Asset Number, Serial, Brand, Model, Assigned User,
 * Department, Location, IP Address, MAC Address, Remarks
 *
 * Shows "➕ Create New Asset" if no match found.
 * Sectore 360 — Version 1.0
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Monitor, Laptop, Server, Shield, Wifi, Video,
  Printer, Battery, HardDrive, Search, Plus, ChevronDown, X, Loader2
} from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { assetSearchApi } from '@/lib/api';
import type { Asset } from '@/types/customer';

/* ── Category icon + color ─────────────────────────────────────── */
function getCategoryMeta(category: string): { icon: React.ReactNode; colorClass: string; dot: string } {
  const c = category.toLowerCase();
  if (c.includes('laptop'))  return { icon: <Laptop    size={13} />, colorClass: 'text-blue-500',   dot: 'bg-blue-400' };
  if (c.includes('computer') || c.includes('desktop'))
                              return { icon: <Monitor   size={13} />, colorClass: 'text-sky-500',    dot: 'bg-sky-400' };
  if (c.includes('server'))  return { icon: <Server    size={13} />, colorClass: 'text-violet-500', dot: 'bg-violet-400' };
  if (c.includes('firewall') || c.includes('router'))
                              return { icon: <Shield    size={13} />, colorClass: 'text-orange-500', dot: 'bg-orange-400' };
  if (c.includes('switch') || c.includes('network'))
                              return { icon: <Wifi      size={13} />, colorClass: 'text-green-500',  dot: 'bg-green-400' };
  if (c.includes('cctv') || c.includes('camera') || c.includes('nvr') || c.includes('dvr'))
                              return { icon: <Video     size={13} />, colorClass: 'text-yellow-600', dot: 'bg-yellow-400' };
  if (c.includes('printer')) return { icon: <Printer   size={13} />, colorClass: 'text-pink-500',   dot: 'bg-pink-400' };
  if (c.includes('ups'))     return { icon: <Battery   size={13} />, colorClass: 'text-red-500',    dot: 'bg-red-400' };
  if (c.includes('storage') || c.includes('nas'))
                              return { icon: <HardDrive size={13} />, colorClass: 'text-teal-500',   dot: 'bg-teal-400' };
  return { icon: <Server size={13} />, colorClass: 'text-muted-foreground', dot: 'bg-muted-foreground' };
}

/* ── Asset row in dropdown ──────────────────────────────────────── */
function AssetOption({ asset, isSelected }: { asset: Asset; isSelected: boolean }) {
  const meta = getCategoryMeta(asset.category);
  const subtitle = [
    asset.assignedUser || asset.department,
    asset.location,
  ].filter(Boolean).join(' · ');

  return (
    <div className={cn(
      'flex items-center gap-2.5 py-0.5',
      isSelected && 'text-primary',
    )}>
      <span className={cn('shrink-0', meta.colorClass)}>{meta.icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-xs font-semibold shrink-0">
            {asset.assetNumber || asset.code}
          </span>
          {asset.brand && <span className="text-xs text-foreground truncate">{asset.brand}</span>}
          {asset.model && <span className="text-xs text-muted-foreground truncate">{asset.model}</span>}
        </div>
        {subtitle && (
          <p className="text-[11px] text-muted-foreground truncate">{subtitle}</p>
        )}
      </div>
      <Badge
        variant="outline"
        className={cn(
          'text-[10px] h-4 px-1.5 shrink-0 border-0',
          asset.status === 'Active' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
          asset.status === 'Under Maintenance' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
          'bg-muted text-muted-foreground',
        )}
      >
        {asset.status}
      </Badge>
    </div>
  );
}

/* ── Main component ─────────────────────────────────────────────── */
interface SmartAssetSearchComboboxProps {
  customerId: string;
  value?: string;          // selected asset id
  onChange: (assetId: string, asset: Asset | null) => void;
  onCreateNew?: () => void;
  disabled?: boolean;
  placeholder?: string;
}

export function SmartAssetSearchCombobox({
  customerId,
  value,
  onChange,
  onCreateNew,
  disabled,
  placeholder = 'Search by asset no., serial, brand, model…',
}: SmartAssetSearchComboboxProps) {
  const [open, setOpen]               = useState(false);
  const [query, setQuery]             = useState('');
  const [assets, setAssets]           = useState<Asset[]>([]);
  const [selectedAsset, setSelected]  = useState<Asset | null>(null);
  const [loading, setLoading]         = useState(false);
  const debounceRef                   = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Load initial / customer-filtered list on open
  useEffect(() => {
    if (!open || !customerId) return;
    setLoading(true);
    assetSearchApi.search({ customerId, status: 'Active', pageSize: 50 })
      .then((r) => setAssets(r.assets))
      .catch(() => setAssets([]))
      .finally(() => setLoading(false));
  }, [open, customerId]);

  // Debounced server-side search
  useEffect(() => {
    if (!open) return;
    clearTimeout(debounceRef.current);
    if (!query) {
      assetSearchApi.search({ customerId, status: 'Active', pageSize: 50 })
        .then((r) => setAssets(r.assets)).catch(() => {});
      return;
    }
    debounceRef.current = setTimeout(() => {
      setLoading(true);
      assetSearchApi.search({ customerId, query, pageSize: 50 })
        .then((r) => setAssets(r.assets))
        .catch(() => {})
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(debounceRef.current);
  }, [query, customerId, open]);

  // Resolve value → label
  useEffect(() => {
    if (!value) { setSelected(null); return; }
    if (assets.find((a) => a.id === value)) {
      setSelected(assets.find((a) => a.id === value) ?? null);
    }
  }, [value, assets]);

  const handleSelect = useCallback((asset: Asset) => {
    setSelected(asset);
    setOpen(false);
    setQuery('');
    onChange(asset.id, asset);
  }, [onChange]);

  const handleClear = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setSelected(null);
    setQuery('');
    onChange('', null);
  }, [onChange]);

  const meta = selectedAsset ? getCategoryMeta(selectedAsset.category) : null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled || !customerId}
          role="combobox"
          aria-expanded={open}
          className={cn(
            'w-full justify-between font-normal text-sm h-auto min-h-[36px] py-1.5 px-3',
            !selectedAsset && 'text-muted-foreground',
          )}
        >
          {selectedAsset ? (
            <span className="flex items-center gap-2 flex-1 min-w-0">
              <span className={cn('shrink-0', meta?.colorClass)}>{meta?.icon}</span>
              <span className="font-mono text-xs font-semibold shrink-0">
                {selectedAsset.assetNumber || selectedAsset.code}
              </span>
              <span className="text-xs truncate text-foreground">
                {[selectedAsset.brand, selectedAsset.model, selectedAsset.deviceType].filter(Boolean).join(' ')}
              </span>
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Search size={13} className="shrink-0 opacity-50" />
              {!customerId ? 'Select customer first' : placeholder}
            </span>
          )}
          <span className="flex items-center gap-1 ml-2 shrink-0">
            {selectedAsset && (
              <X
                size={13}
                className="opacity-50 hover:opacity-100"
                onClick={handleClear}
              />
            )}
            <ChevronDown size={13} className="opacity-50" />
          </span>
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[420px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search asset no., serial, brand, model, IP, user…"
            value={query}
            onValueChange={setQuery}
          />
          <CommandList className="max-h-[320px]">
            {loading && (
              <div className="flex items-center justify-center gap-2 py-4 text-xs text-muted-foreground">
                <Loader2 size={13} className="animate-spin" /> Searching…
              </div>
            )}

            {!loading && assets.length > 0 && (
              <CommandGroup heading={`Assets (${assets.length})`}>
                {assets.map((asset) => (
                  <CommandItem
                    key={asset.id}
                    value={asset.id}
                    onSelect={() => handleSelect(asset)}
                    className="py-1.5"
                  >
                    <AssetOption asset={asset} isSelected={value === asset.id} />
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {!loading && assets.length === 0 && !onCreateNew && (
              <CommandEmpty>No assets found for this customer.</CommandEmpty>
            )}

            {!loading && onCreateNew && (
              <>
                {assets.length > 0 && <CommandSeparator />}
                <CommandGroup>
                  <CommandItem
                    value="__create_new__"
                    onSelect={() => { setOpen(false); onCreateNew(); }}
                    className="text-primary font-medium gap-2"
                  >
                    <Plus size={14} />
                    Create New Asset
                    {query && <span className="text-xs text-muted-foreground ml-1">"{query}"</span>}
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
