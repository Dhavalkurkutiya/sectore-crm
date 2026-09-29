/**
 * CustomerSearchCombobox
 * Sectore 360 — Service Request Workflow
 *
 * Searches active customers by name / contact / mobile / code / email.
 * Shows "No customer found" with a "+ Create New Customer" CTA.
 * Also exposes a persistent "+ New Customer" button always visible
 * below the search so the user never has to hunt for it.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, UserPlus, CheckCircle2, X, Building2, Phone, Mail } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/shared/Spinner';
import { customerService } from '@/services/customerService';
import type { Customer } from '@/types/customer';
import { cn } from '@/lib/utils';

interface CustomerSearchComboboxProps {
  value?: Customer | null;
  onChange: (customer: Customer | null) => void;
  onCreateNew: () => void;
  disabled?: boolean;
  error?: string;
}

export function CustomerSearchCombobox({
  value, onChange, onCreateNew, disabled, error,
}: CustomerSearchComboboxProps) {
  const [query, setQuery]         = useState('');
  const [results, setResults]     = useState<Customer[]>([]);
  const [open, setOpen]           = useState(false);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched]   = useState(false);
  const [focusIdx, setFocusIdx]   = useState(-1);

  const inputRef     = useRef<HTMLInputElement>(null);
  const listRef      = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  /* Debounced search */
  useEffect(() => {
    if (value) { setOpen(false); return; }
    if (!query.trim()) {
      setResults([]); setOpen(false); setSearched(false); setFocusIdx(-1); return;
    }
    setSearching(true);
    const timer = setTimeout(async () => {
      const found = await customerService.search(query, 10);
      setResults(found);
      setOpen(true);
      setSearched(true);
      setSearching(false);
      setFocusIdx(-1);
    }, 280);
    return () => clearTimeout(timer);
  }, [query, value]);

  /* Close on outside click */
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSelect = useCallback((c: Customer) => {
    onChange(c);
    setQuery(''); setOpen(false); setSearched(false); setFocusIdx(-1);
  }, [onChange]);

  function handleClear() {
    onChange(null);
    setQuery(''); setResults([]); setSearched(false); setFocusIdx(-1);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  /* Keyboard navigation */
  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open) return;
    const total = results.length + (searched && results.length === 0 ? 0 : 0);
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusIdx((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusIdx((i) => Math.max(i - 1, -1));
    } else if (e.key === 'Enter' && focusIdx >= 0 && results[focusIdx]) {
      e.preventDefault();
      handleSelect(results[focusIdx]);
    } else if (e.key === 'Escape') {
      setOpen(false);
      void total;
    }
  }

  /* ── Selected chip ──────────────────────────────────────────── */
  if (value) {
    return (
      <div className={cn(
        'flex items-start gap-3 p-3 rounded-xl border bg-card transition-colors',
        error ? 'border-destructive' : 'border-border',
      )}>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <Building2 size={17} className="text-primary" />
        </div>
        <div className="flex-1 min-w-0 py-0.5">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-foreground">{value.companyName}</p>
            <Badge variant="outline" className="text-[10px] h-4 px-1.5 shrink-0">{value.code}</Badge>
            <Badge
              variant="outline"
              className={cn(
                'text-[10px] h-4 px-1.5 shrink-0',
                value.customerType === 'AMC'
                  ? 'bg-primary/10 text-primary border-primary/30'
                  : 'bg-muted text-muted-foreground',
              )}
            >
              {value.customerType}
            </Badge>
          </div>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            {value.contactPerson && (
              <span className="text-xs text-muted-foreground">{value.contactPerson}</span>
            )}
            {value.primaryMobile && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Phone size={10} />{value.primaryMobile}
              </span>
            )}
            {value.email && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Mail size={10} />{value.email}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0 mt-0.5">
          <CheckCircle2 size={15} className="text-success" />
          {!disabled && (
            <Button
              type="button" variant="ghost" size="sm"
              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
              onClick={handleClear}
              title="Change customer"
            >
              <X size={14} />
            </Button>
          )}
        </div>
      </div>
    );
  }

  /* ── Search input + dropdown ─────────────────────────────────── */
  return (
    <div ref={containerRef} className="flex flex-col gap-2">
      <div className="relative">
        {/* Search box */}
        <div className={cn(
          'flex items-center gap-2 pl-3 pr-1.5 rounded-xl border bg-background transition-all',
          error ? 'border-destructive ring-1 ring-destructive/30' : 'border-input',
          open ? 'border-primary ring-1 ring-primary/20' : 'hover:border-primary/50',
          disabled ? 'opacity-50 pointer-events-none' : '',
        )}>
          {searching
            ? <Spinner size="sm" className="shrink-0 text-muted-foreground" />
            : <Search size={15} className="shrink-0 text-muted-foreground" />
          }
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => { if (results.length) setOpen(true); }}
            onKeyDown={handleKeyDown}
            placeholder="Search by company, contact, mobile, email or code…"
            className="border-0 shadow-none px-0 focus-visible:ring-0 h-11 bg-transparent text-sm"
            autoComplete="off"
          />
          {query && (
            <Button
              type="button" variant="ghost" size="sm"
              className="h-7 w-7 p-0 shrink-0 text-muted-foreground"
              onClick={() => { setQuery(''); setOpen(false); setSearched(false); }}
            >
              <X size={13} />
            </Button>
          )}
        </div>

        {/* Dropdown */}
        {open && (
          <div
            ref={listRef}
            className="absolute z-[60] top-full mt-1.5 w-full rounded-xl border border-border bg-popover shadow-xl overflow-hidden animate-in fade-in-0 zoom-in-95 duration-100"
          >
            {results.length > 0 ? (
              <>
                <p className="px-3 pt-2.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {results.length} customer{results.length !== 1 ? 's' : ''} found
                </p>
                <ul className="py-1 max-h-64 overflow-y-auto">
                  {results.map((c, i) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        className={cn(
                          'w-full text-left px-3 py-2.5 flex items-start gap-2.5 transition-colors',
                          focusIdx === i ? 'bg-accent' : 'hover:bg-accent',
                        )}
                        onClick={() => handleSelect(c)}
                        onMouseEnter={() => setFocusIdx(i)}
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 mt-0.5">
                          <Building2 size={13} className="text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-sm font-medium text-foreground">{c.companyName}</span>
                            <span className="text-[10px] text-muted-foreground/70">{c.code}</span>
                          </div>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {c.contactPerson} · {c.primaryMobile}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[10px] shrink-0 mt-0.5',
                            c.customerType === 'AMC' ? 'border-primary/30 text-primary' : '',
                          )}
                        >
                          {c.customerType}
                        </Badge>
                      </button>
                    </li>
                  ))}
                </ul>
                {/* Always show "create new" even when results exist */}
                <div className="px-3 py-2.5 border-t border-border bg-muted/30">
                  <button
                    type="button"
                    className="flex items-center gap-2 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                    onClick={() => { setOpen(false); onCreateNew(); }}
                  >
                    <UserPlus size={12} />
                    Can't find the customer? Create new
                  </button>
                </div>
              </>
            ) : searched ? (
              <div className="px-4 py-5 flex flex-col items-center gap-3 text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                  <Building2 size={18} className="text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">No customer found</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    No results for <span className="font-semibold">"{query}"</span>
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  className="gap-1.5 h-9 text-sm"
                  onClick={() => { setOpen(false); onCreateNew(); }}
                >
                  <UserPlus size={13} />
                  Create New Customer
                </Button>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      {/* Always-visible "New Customer" fallback — never hidden */}
      {!disabled && (
        <button
          type="button"
          onClick={onCreateNew}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors self-start py-0.5"
        >
          <UserPlus size={12} />
          <span>New customer? <span className="font-medium text-primary underline underline-offset-2">Create here</span></span>
        </button>
      )}
    </div>
  );
}
