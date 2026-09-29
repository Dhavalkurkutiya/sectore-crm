/**
 * SmartAssetSelector
 * Reusable enterprise asset search + selection component.
 * Sectore 360 — v2
 *
 * Features
 * ─────────
 * • Server-side search via search_assets() RPC (2-char min, 300ms debounce)
 * • Searches: asset number, name, serial, brand, model, assigned user,
 *   department, location, IP address, MAC address, barcode, QR code, remarks
 * • Status indicator dots: Active, AMC Covered, Under Repair, Retired, Warranty Expiring
 * • Selected asset info panel: asset no., brand, model, dept, user, warranty, AMC, last service, open tickets, health
 * • "No match → ➕ Create New Asset" triggers onCreateNew callback
 * • Pagination (pageSize=25, load-more)
 * • Works with 10 000+ assets — zero upfront load
 *
 * Props
 * ─────
 * customerId   – filter assets to this customer (required for scoped search)
 * value        – currently selected asset id
 * onChange     – (assetId, asset|null) => void
 * onCreateNew  – () => void  — opens Quick Create flow
 * disabled     – lock the control
 * placeholder  – override hint text
 *
 * Reuse in: Task Creation · AMC Service · PM · Engineer Mobile App · Customer Portal
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Monitor, Laptop, Server, Shield, Wifi, Video,
  Printer, Battery, HardDrive, Search, Plus,
  ChevronDown, X, Loader2, CheckCircle2, Activity,
  Wrench, Ban, AlertTriangle, ShieldCheck, User,
  MapPin, Tag, Clock, FileText, Heart,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Command, CommandEmpty, CommandGroup, CommandInput,
  CommandItem, CommandList, CommandSeparator,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { assetSearchApi } from '@/lib/api';
import type { Asset } from '@/types/customer';

/* ── constants ──────────────────────────────────────────────────── */
const PAGE_SIZE  = 25;
const DEBOUNCE   = 300;
const MIN_CHARS  = 2;

/* ── status config ──────────────────────────────────────────────── */
type AssetStatus = 'Active' | 'AMC Covered' | 'Under Repair' | 'Retired' | 'Warranty Expiring' | string;

interface StatusCfg { dot: string; badge: string; icon: React.ReactNode; label: string }

function getStatusCfg(status: AssetStatus): StatusCfg {
  switch (status) {
    case 'Active':
      return {
        dot:   'bg-green-500',
        badge: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
        icon:  <CheckCircle2 size={10} />,
        label: 'Active',
      };
    case 'AMC Covered':
      return {
        dot:   'bg-blue-500',
        badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
        icon:  <ShieldCheck size={10} />,
        label: 'AMC',
      };
    case 'Under Maintenance':
    case 'Under Repair':
      return {
        dot:   'bg-yellow-500',
        badge: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
        icon:  <Wrench size={10} />,
        label: 'Repair',
      };
    case 'Retired':
    case 'Disposed':
      return {
        dot:   'bg-red-500',
        badge: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
        icon:  <Ban size={10} />,
        label: 'Retired',
      };
    case 'Warranty Expiring':
      return {
        dot:   'bg-amber-500',
        badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
        icon:  <AlertTriangle size={10} />,
        label: 'Warranty',
      };
    default:
      return {
        dot:   'bg-muted-foreground',
        badge: 'bg-muted text-muted-foreground',
        icon:  <Activity size={10} />,
        label: status || 'Unknown',
      };
  }
}

/* ── category icon ───────────────────────────────────────────────── */
function getCategoryIcon(category: string): { icon: React.ReactNode; color: string } {
  const c = (category ?? '').toLowerCase();
  if (c.includes('laptop'))                          return { icon: <Laptop    size={14} />, color: 'text-blue-500' };
  if (c.includes('computer') || c.includes('desktop')) return { icon: <Monitor size={14} />, color: 'text-sky-500' };
  if (c.includes('server'))                          return { icon: <Server    size={14} />, color: 'text-violet-500' };
  if (c.includes('firewall') || c.includes('router')) return { icon: <Shield   size={14} />, color: 'text-orange-500' };
  if (c.includes('switch') || c.includes('network')) return { icon: <Wifi     size={14} />, color: 'text-green-500' };
  if (c.includes('cctv') || c.includes('camera') || c.includes('nvr') || c.includes('dvr'))
    return { icon: <Video size={14} />, color: 'text-yellow-600' };
  if (c.includes('printer'))                         return { icon: <Printer   size={14} />, color: 'text-pink-500' };
  if (c.includes('ups'))                             return { icon: <Battery   size={14} />, color: 'text-red-500' };
  if (c.includes('storage') || c.includes('nas'))    return { icon: <HardDrive size={14} />, color: 'text-teal-500' };
  return { icon: <Server size={14} />, color: 'text-muted-foreground' };
}

/* ── Dropdown row ────────────────────────────────────────────────── */
function AssetDropdownRow({ asset, selected }: { asset: Asset; selected: boolean }) {
  const cat    = getCategoryIcon(asset.category);
  const status = getStatusCfg(asset.status);
  const line2  = [asset.department, asset.location, asset.assignedUser].filter(Boolean).join(' · ');

  return (
    <div className={cn('flex items-center gap-2.5 py-0.5 w-full', selected && 'text-primary')}>
      {/* status dot */}
      <span className={cn('w-2 h-2 rounded-full shrink-0 mt-0.5', status.dot)} />
      {/* category icon */}
      <span className={cn('shrink-0', cat.color)}>{cat.icon}</span>
      {/* text */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          {(asset.assetNumber || asset.code) && (
            <span className="font-mono text-xs font-bold shrink-0">
              {asset.assetNumber || asset.code}
            </span>
          )}
          {asset.deviceType && (
            <span className="text-xs font-medium text-foreground truncate">{asset.deviceType}</span>
          )}
          {asset.brand && (
            <span className="text-xs text-muted-foreground truncate">{asset.brand}</span>
          )}
          {asset.model && (
            <span className="text-xs text-muted-foreground truncate">{asset.model}</span>
          )}
        </div>
        {line2 && (
          <p className="text-[11px] text-muted-foreground truncate mt-0.5">{line2}</p>
        )}
      </div>
      {/* status badge */}
      <Badge
        variant="outline"
        className={cn(
          'text-[10px] h-4 px-1.5 shrink-0 border-0 flex items-center gap-0.5',
          status.badge,
        )}
      >
        {status.icon} {status.label}
      </Badge>
    </div>
  );
}

/* ── Info panel (shown below dropdown after selection) ───────────── */
interface InfoPanelProps { asset: Asset }

function AssetInfoPanel({ asset }: InfoPanelProps) {
  const status = getStatusCfg(asset.status);
  const cat    = getCategoryIcon(asset.category);

  const rows: Array<{ icon: React.ElementType; label: string; value?: string; node?: React.ReactNode }> = [
    { icon: Tag,       label: 'Asset Number',  value: asset.assetNumber || asset.code },
    { icon: cat.icon as React.ElementType, label: 'Device',       value: [asset.deviceType, asset.brand, asset.model].filter(Boolean).join(' ') },
    { icon: MapPin,    label: 'Department',    value: asset.department || '—' },
    { icon: MapPin,    label: 'Location',      value: asset.location   || '—' },
    { icon: User,      label: 'Assigned User', value: asset.assignedUser || '—' },
    { icon: FileText,  label: 'Serial No.',    value: asset.serialNumber || '—' },
    { icon: Clock,     label: 'Warranty End',  value: asset.warrantyEnd  || '—' },
    { icon: ShieldCheck, label: 'Status', value: asset.status ?? '—' },
  ].filter((r) => (r.value && r.value !== '—'));

  return (
    <div className="mt-2 rounded-xl border border-border bg-muted/30 overflow-hidden">
      {/* header */}
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border bg-card">
        <span className={cn('shrink-0', cat.color)}>{cat.icon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold truncate">
            {asset.assetNumber || asset.code}
            {asset.deviceType && (
              <span className="font-normal text-muted-foreground ml-1.5">— {asset.deviceType}</span>
            )}
          </p>
          {(asset.brand || asset.model) && (
            <p className="text-xs text-muted-foreground truncate">
              {[asset.brand, asset.model].filter(Boolean).join(' ')}
            </p>
          )}
        </div>
        <Badge
          variant="outline"
          className={cn('text-[10px] h-5 px-2 border-0 flex items-center gap-1 shrink-0', status.badge)}
        >
          {status.icon} {status.label}
        </Badge>
      </div>

      {/* detail grid */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 px-4 py-3">
        {rows.map(({ icon: Icon, label, value }) => (
          <div key={label} className="flex flex-col gap-0.5 min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {label}
            </p>
            <p className="text-xs font-medium text-foreground truncate">{value}</p>
          </div>
        ))}
      </div>

      {/* Health row if available */}
      {(asset as Asset & { healthScore?: number }).healthScore !== undefined && (
        <>
          <Separator />
          <div className="flex items-center gap-2 px-4 py-2.5">
            <Heart size={12} className="text-primary shrink-0" />
            <span className="text-xs text-muted-foreground">Health Score</span>
            <span className={cn(
              'ml-auto text-xs font-bold',
              (asset as Asset & { healthScore?: number }).healthScore! >= 80 ? 'text-green-600' :
              (asset as Asset & { healthScore?: number }).healthScore! >= 50 ? 'text-amber-600' : 'text-destructive',
            )}>
              {(asset as Asset & { healthScore?: number }).healthScore}%
            </span>
          </div>
        </>
      )}
    </div>
  );
}

/* ── Trigger button ──────────────────────────────────────────────── */
function SelectorTrigger({
  asset, open, disabled, placeholder,
  onClear,
}: {
  asset: Asset | null; open: boolean; disabled: boolean; placeholder: string;
  onClear: (e: React.MouseEvent) => void;
}) {
  const cat    = asset ? getCategoryIcon(asset.category) : null;
  const status = asset ? getStatusCfg(asset.status) : null;

  return (
    <button
      type="button"
      disabled={disabled}
      role="combobox"
      aria-expanded={open}
      className={cn(
        'flex w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm font-normal min-h-[44px] text-left ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-accent hover:text-accent-foreground transition-colors',
        !asset && 'text-muted-foreground',
      )}
    >
      {asset ? (
        <span className="flex items-center gap-2 flex-1 min-w-0">
          <span className={cn('w-2 h-2 rounded-full shrink-0', status?.dot)} />
          <span className={cn('shrink-0', cat?.color)}>{cat?.icon}</span>
          <span className="flex flex-col min-w-0">
            <span className="flex items-center gap-1.5">
              <span className="font-mono text-xs font-bold shrink-0">
                {asset.assetNumber || asset.code}
              </span>
              <span className="text-xs font-medium truncate">
                {[asset.deviceType, asset.brand, asset.model].filter(Boolean).join(' ')}
              </span>
            </span>
            {(asset.department || asset.location) && (
              <span className="text-[11px] text-muted-foreground truncate">
                {[asset.department, asset.location].filter(Boolean).join(' · ')}
              </span>
            )}
          </span>
        </span>
      ) : (
        <span className="flex items-center gap-2">
          <Search size={14} className="shrink-0 opacity-50" />
          <span>{placeholder}</span>
        </span>
      )}
      <span className="flex items-center gap-1 ml-2 shrink-0">
        {asset && (
          <X
            size={14}
            className="opacity-40 hover:opacity-100 transition-opacity"
            onClick={onClear}
          />
        )}
        <ChevronDown size={14} className={cn('opacity-40 transition-transform', open && 'rotate-180')} />
      </span>
    </button>
  );
}

/* ══════════════════════════════════════════════════════════════════ */
/*  Main component                                                    */
/* ══════════════════════════════════════════════════════════════════ */
export interface SmartAssetSelectorProps {
  customerId: string;
  value?: string;
  onChange: (assetId: string, asset: Asset | null) => void;
  onCreateNew?: () => void;
  disabled?: boolean;
  placeholder?: string;
  showInfoPanel?: boolean;   // default true
}

export function SmartAssetSelector({
  customerId,
  value,
  onChange,
  onCreateNew,
  disabled = false,
  placeholder = 'Search Asset Number, Serial Number, User, Location, Brand, Model…',
  showInfoPanel = true,
}: SmartAssetSelectorProps) {
  const [open,          setOpen]    = useState(false);
  const [query,         setQuery]   = useState('');
  const [assets,        setAssets]  = useState<Asset[]>([]);
  const [totalCount,    setTotal]   = useState(0);
  const [page,          setPage]    = useState(1);
  const [loading,       setLoading] = useState(false);
  const [selected,      setSelected] = useState<Asset | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const isDisabled = disabled || !customerId;

  /* ── Fetch ── */
  const fetchAssets = useCallback(async (q: string, pg: number, append: boolean) => {
    if (!customerId) return;
    setLoading(true);
    try {
      const params = {
        customerId,
        query:    q.length >= MIN_CHARS ? q : undefined,
        page:     pg,
        pageSize: PAGE_SIZE,
      };
      const res = await assetSearchApi.search(params);
      setTotal(res.totalCount);
      setAssets((prev) => append ? [...prev, ...res.assets] : res.assets);
    } catch {
      if (!append) setAssets([]);
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  /* ── Open: initial load ── */
  useEffect(() => {
    if (!open || !customerId) return;
    setQuery('');
    setPage(1);
    fetchAssets('', 1, false);
  }, [open, customerId, fetchAssets]);

  /* ── Debounced search ── */
  useEffect(() => {
    if (!open) return;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      fetchAssets(query, 1, false);
    }, query.length >= MIN_CHARS ? DEBOUNCE : 0);
    return () => clearTimeout(debounceRef.current);
  }, [query, open, fetchAssets]);

  /* ── Resolve value → asset object ── */
  useEffect(() => {
    if (!value) { setSelected(null); return; }
    const found = assets.find((a) => a.id === value);
    if (found) { setSelected(found); return; }
    // If not in current list (e.g. pre-filled from URL), fetch it
    if (value && !selected) {
      import('@/lib/api').then(({ assetSearchApi: api }) => {
        api.search({ customerId, query: value, pageSize: 1 })
          .then((r) => { if (r.assets[0]) setSelected(r.assets[0]); })
          .catch(() => {});
      }).catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const loadMore = useCallback(() => {
    const next = page + 1;
    setPage(next);
    fetchAssets(query, next, true);
  }, [page, query, fetchAssets]);

  const hasMore = useMemo(() => assets.length < totalCount, [assets.length, totalCount]);

  return (
    <div className="flex flex-col gap-1">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <span> {/* span wrapper to allow asChild + custom button logic */}
            <SelectorTrigger
              asset={selected}
              open={open}
              disabled={isDisabled}
              placeholder={!customerId ? 'Select a customer first' : placeholder}
              onClear={handleClear}
            />
          </span>
        </PopoverTrigger>

        <PopoverContent
          className="w-[min(560px,calc(100vw-2rem))] p-0 shadow-xl"
          align="start"
          sideOffset={4}
        >
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Search by asset no., serial, brand, model, user, location, IP…"
              value={query}
              onValueChange={setQuery}
              className="text-sm"
            />
            {query.length > 0 && query.length < MIN_CHARS && (
              <p className="px-3 py-2 text-[11px] text-muted-foreground">
                Type {MIN_CHARS - query.length} more character{MIN_CHARS - query.length > 1 ? 's' : ''} to search…
              </p>
            )}
            <CommandList className="max-h-[340px]">
              {loading && (
                <div className="flex items-center justify-center gap-2 py-6 text-xs text-muted-foreground">
                  <Loader2 size={13} className="animate-spin" /> Searching…
                </div>
              )}

              {!loading && assets.length > 0 && (
                <CommandGroup heading={`${totalCount > PAGE_SIZE ? `${assets.length} of ${totalCount}` : assets.length} asset${assets.length !== 1 ? 's' : ''}`}>
                  {assets.map((asset) => (
                    <CommandItem
                      key={asset.id}
                      value={asset.id}
                      onSelect={() => handleSelect(asset)}
                      className="py-1.5 cursor-pointer"
                    >
                      <AssetDropdownRow asset={asset} selected={value === asset.id} />
                    </CommandItem>
                  ))}

                  {/* Load more */}
                  {hasMore && !loading && (
                    <div className="px-3 py-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full h-8 text-xs text-muted-foreground"
                        onClick={(e) => { e.preventDefault(); loadMore(); }}
                      >
                        Load more ({totalCount - assets.length} remaining)
                      </Button>
                    </div>
                  )}
                </CommandGroup>
              )}

              {!loading && assets.length === 0 && query.length >= MIN_CHARS && (
                <CommandEmpty>
                  <div className="flex flex-col items-center gap-2 py-4">
                    <Search size={20} className="text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">No matching asset found.</p>
                    <p className="text-xs text-muted-foreground/60">
                      Try different keywords or create a new asset.
                    </p>
                  </div>
                </CommandEmpty>
              )}

              {!loading && assets.length === 0 && query.length < MIN_CHARS && (
                <div className="flex flex-col items-center gap-2 py-6 text-center">
                  <Search size={18} className="text-muted-foreground/30" />
                  <p className="text-xs text-muted-foreground">Start typing to search assets…</p>
                </div>
              )}

              {/* Create new */}
              {onCreateNew && !loading && (
                <>
                  {assets.length > 0 && <CommandSeparator />}
                  <CommandGroup>
                    <CommandItem
                      value="__create_new__"
                      onSelect={() => { setOpen(false); onCreateNew(); }}
                      className="text-primary font-semibold gap-2 py-2.5 cursor-pointer"
                    >
                      <Plus size={14} className="shrink-0" />
                      <span>Create New Asset</span>
                      {query.length >= MIN_CHARS && (
                        <span className="text-xs font-normal text-muted-foreground ml-1">
                          "{query}"
                        </span>
                      )}
                    </CommandItem>
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* ── Selected asset info panel ── */}
      {showInfoPanel && selected && (
        <AssetInfoPanel asset={selected} />
      )}
    </div>
  );
}
