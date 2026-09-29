/**
 * BulkImportDrawer
 * Excel / CSV bulk asset import with column mapping + preview
 * Sectore 360 — Enterprise Asset Master
 */
import { useState, useRef, useCallback } from 'react';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { customerService } from '@/services/customerService';
import { assetService } from '@/services/assetService';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, ChevronRight, Loader2, X } from 'lucide-react';
import type { Customer } from '@/types/customer';
import { useEffect } from 'react';
import Papa from 'papaparse';

/* ── Column mapping: import column → AssetFormData field ── */
const ASSET_COLUMNS = [
  { key: 'skip',             label: '— Skip —' },
  { key: 'category',         label: 'Category' },
  { key: 'brand',            label: 'Brand' },
  { key: 'model',            label: 'Model' },
  { key: 'serialNumber',     label: 'Serial Number' },
  { key: 'serviceTag',       label: 'Asset Tag / Number' },
  { key: 'purchaseDate',     label: 'Purchase Date' },
  { key: 'warrantyEnd',      label: 'Warranty Expiry' },
  { key: 'location',         label: 'Location' },
  { key: 'floor',            label: 'Floor' },
  { key: 'department',       label: 'Department' },
  { key: 'ipAddress',        label: 'IP Address' },
  { key: 'macAddress',       label: 'MAC Address' },
  { key: 'vendor',           label: 'Vendor' },
  { key: 'status',           label: 'Status' },
  { key: 'remarks',          label: 'Remarks' },
];

type Step = 'select-customer' | 'upload' | 'map' | 'preview' | 'importing' | 'done';

interface ImportResult { success: number; failed: number; errors: string[]; }

interface BulkImportDrawerProps {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
}

/** Auto-detect best matching asset field for a given column header */
function autoMap(header: string): string {
  const h = header.toLowerCase().replace(/[\s_-]/g, '');
  if (h.includes('serial'))    return 'serialNumber';
  if (h.includes('category'))  return 'category';
  if (h.includes('brand') || h.includes('make')) return 'brand';
  if (h.includes('model'))     return 'model';
  if (h.includes('tag') || h.includes('asset') || h.includes('number')) return 'serviceTag';
  if (h.includes('purchase') || h.includes('buydate')) return 'purchaseDate';
  if (h.includes('warranty') || h.includes('expiry')) return 'warrantyEnd';
  if (h.includes('location') || h.includes('site'))  return 'location';
  if (h.includes('floor'))     return 'floor';
  if (h.includes('dept') || h.includes('department')) return 'department';
  if (h.includes('ip'))        return 'ipAddress';
  if (h.includes('mac'))       return 'macAddress';
  if (h.includes('vendor') || h.includes('supplier')) return 'vendor';
  if (h.includes('status'))    return 'status';
  if (h.includes('remark') || h.includes('note')) return 'remarks';
  return 'skip';
}

export function BulkImportDrawer({ open, onClose, onImported }: BulkImportDrawerProps) {
  const { user }                     = useAuth();
  const [step,         setStep]      = useState<Step>('select-customer');
  const [customers,    setCustomers] = useState<Customer[]>([]);
  const [customerId,   setCustomerId] = useState('');
  const [headers,      setHeaders]   = useState<string[]>([]);
  const [rows,         setRows]      = useState<Record<string, string>[]>([]);
  const [mapping,      setMapping]   = useState<Record<string, string>>({});
  const [result,       setResult]    = useState<ImportResult | null>(null);
  const [progress,     setProgress]  = useState(0);
  const [fileName,     setFileName]  = useState('');
  const fileRef                      = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) customerService.list(false).then(setCustomers);
  }, [open]);

  const reset = () => {
    setStep('select-customer');
    setCustomerId('');
    setHeaders([]);
    setRows([]);
    setMapping({});
    setResult(null);
    setProgress(0);
    setFileName('');
  };

  const handleClose = () => { reset(); onClose(); };

  /* ── File parsing ─────────────────────────────────────── */
  const parseFile = useCallback((file: File) => {
    setFileName(file.name);
    const ext = file.name.split('.').pop()?.toLowerCase();

    const processRows = (rawRows: Record<string, string>[]) => {
      if (!rawRows.length) { toast.error('No data rows found'); return; }
      const cols = Object.keys(rawRows[0]);
      setHeaders(cols);
      setRows(rawRows.slice(0, 10000)); // cap preview
      const autoMapping: Record<string, string> = {};
      cols.forEach((c) => { autoMapping[c] = autoMap(c); });
      setMapping(autoMapping);
      setStep('map');
    };

    if (ext === 'csv') {
      Papa.parse<Record<string, string>>(file, {
        header: true,
        skipEmptyLines: true,
        complete: (r) => processRows(r.data),
        error: () => toast.error('Failed to parse CSV'),
      });
    } else {
      import('xlsx').then(({ read, utils }) => {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const wb = read(ev.target?.result, { type: 'array' });
          const ws = wb.Sheets[wb.SheetNames[0]];
          processRows(utils.sheet_to_json<Record<string, string>>(ws));
        };
        reader.readAsArrayBuffer(file);
      });
    }
  }, []);

  /* ── Import ───────────────────────────────────────────── */
  const handleImport = async () => {
    if (!customerId) { toast.error('Please select a customer'); return; }
    setStep('importing');
    setProgress(0);

    const total   = rows.length;
    let success   = 0;
    let failed    = 0;
    const errors: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const mapped: Record<string, string> = {};
      for (const [col, field] of Object.entries(mapping)) {
        if (field !== 'skip') mapped[field] = row[col] ?? '';
      }

      const serial = (mapped.serialNumber ?? '').trim();
      if (!serial) { failed++; errors.push(`Row ${i + 2}: Missing serial number`); continue; }

      try {
        await assetService.create({
          customerId,
          category:        mapped.category   || 'Others',
          deviceType:      mapped.category   || 'Others',
          brand:           mapped.brand      || undefined,
          model:           mapped.model      || undefined,
          serialNumber:    serial,
          serviceTag:      mapped.serviceTag || undefined,
          purchaseDate:    mapped.purchaseDate || undefined,
          warrantyEnd:     mapped.warrantyEnd  || undefined,
          location:        mapped.location   || undefined,
          floor:           mapped.floor      || undefined,
          department:      mapped.department || undefined,
          ipAddress:       mapped.ipAddress  || undefined,
          macAddress:      mapped.macAddress || undefined,
          vendor:          mapped.vendor     || undefined,
          status:          (mapped.status as 'Active' | 'Inactive' | 'Under Maintenance' | 'Retired') || 'Active',
          remarks:         mapped.remarks    || undefined,
        }, user?.name ?? 'Import');
        success++;
      } catch (e) {
        failed++;
        errors.push(`Row ${i + 2}: ${e instanceof Error ? e.message : 'Error'}`);
      }

      setProgress(Math.round(((i + 1) / total) * 100));
    }

    setResult({ success, failed, errors });
    setStep('done');
    if (success > 0) { onImported(); toast.success(`Imported ${success} assets`); }
  };

  const previewRows = rows.slice(0, 5);
  const selectedCustomer = customers.find((c) => c.id === customerId);

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent side="right" className="w-full md:max-w-2xl flex flex-col p-0">
        <SheetHeader className="px-6 py-4 border-b border-border shrink-0">
          <SheetTitle className="flex items-center gap-2">
            <FileSpreadsheet size={18} />
            Bulk Asset Import
          </SheetTitle>
          <SheetDescription>
            Import up to 10,000 assets from Excel or CSV
          </SheetDescription>
        </SheetHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-1 px-6 py-3 border-b border-border shrink-0 text-xs">
          {(['select-customer', 'upload', 'map', 'preview', 'done'] as const).map((s, i, arr) => (
            <div key={s} className="flex items-center gap-1">
              <span className={`font-medium ${step === s ? 'text-primary' : 'text-muted-foreground'}`}>
                {s.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
              </span>
              {i < arr.length - 1 && <ChevronRight size={12} className="text-muted-foreground" />}
            </div>
          ))}
        </div>

        <ScrollArea className="flex-1 min-h-0">
          <div className="px-6 py-4 flex flex-col gap-4">

            {/* Step 1: Select Customer */}
            {step === 'select-customer' && (
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label>Select Customer <span className="text-destructive">*</span></Label>
                  <Select value={customerId} onValueChange={setCustomerId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select customer to assign assets to…" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.companyName} ({c.code})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">All imported assets will be assigned to this customer.</p>
                </div>
                <Button disabled={!customerId} onClick={() => setStep('upload')}>
                  Continue <ChevronRight size={14} className="ml-1" />
                </Button>
              </div>
            )}

            {/* Step 2: Upload */}
            {step === 'upload' && (
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2 text-sm">
                  <Badge variant="outline">{selectedCustomer?.companyName}</Badge>
                </div>
                <div
                  className="border-2 border-dashed border-border rounded-lg p-10 text-center cursor-pointer hover:border-primary hover:bg-accent/20 transition-colors"
                  onClick={() => fileRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const f = e.dataTransfer.files[0];
                    if (f) parseFile(f);
                  }}
                >
                  <Upload size={32} className="mx-auto mb-3 text-muted-foreground" />
                  <p className="font-medium">Drop Excel or CSV here</p>
                  <p className="text-xs text-muted-foreground mt-1">Supports .xlsx, .xls, .csv — up to 10,000 rows</p>
                  <Button variant="outline" className="mt-4" type="button" onClick={() => fileRef.current?.click()}>Browse File</Button>
                </div>
                <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) parseFile(f); }} />
                <p className="text-xs text-muted-foreground">
                  <strong>Required column:</strong> Serial Number &nbsp;|&nbsp;
                  Supported: Category, Brand, Model, Asset Tag, Purchase Date, Warranty Expiry, Location, Department, IP, MAC, Vendor, Status, Remarks
                </p>
              </div>
            )}

            {/* Step 3: Map Columns */}
            {step === 'map' && (
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Map columns from <span className="text-primary">{fileName}</span> ({rows.length} rows)</p>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="whitespace-nowrap">File Column</TableHead>
                        <TableHead className="whitespace-nowrap">Sample Value</TableHead>
                        <TableHead className="whitespace-nowrap">Map To</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {headers.map((h) => (
                        <TableRow key={h}>
                          <TableCell className="font-medium whitespace-nowrap">{h}</TableCell>
                          <TableCell className="text-muted-foreground text-xs whitespace-nowrap max-w-[120px] truncate">
                            {rows[0]?.[h] ?? '—'}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            <Select value={mapping[h] ?? 'skip'} onValueChange={(v) => setMapping((m) => ({ ...m, [h]: v }))}>
                              <SelectTrigger className="h-8 text-xs w-44">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {ASSET_COLUMNS.map((c) => (
                                  <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep('upload')}>Back</Button>
                  <Button onClick={() => setStep('preview')}>
                    Preview <ChevronRight size={14} className="ml-1" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 4: Preview */}
            {step === 'preview' && (
              <div className="flex flex-col gap-4">
                <p className="text-sm font-medium">Preview (first 5 of {rows.length} rows)</p>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {Object.entries(mapping).filter(([, f]) => f !== 'skip').map(([col, field]) => (
                          <TableHead key={col} className="whitespace-nowrap text-xs">
                            {ASSET_COLUMNS.find((c) => c.key === field)?.label ?? field}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewRows.map((row, idx) => (
                        <TableRow key={idx}>
                          {Object.entries(mapping).filter(([, f]) => f !== 'skip').map(([col]) => (
                            <TableCell key={col} className="text-xs whitespace-nowrap max-w-[120px] truncate">
                              {row[col] ?? '—'}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep('map')}>Back</Button>
                  <Button onClick={handleImport}>
                    Import {rows.length} Assets
                  </Button>
                </div>
              </div>
            )}

            {/* Step 5: Importing */}
            {step === 'importing' && (
              <div className="flex flex-col items-center gap-4 py-10">
                <Loader2 size={40} className="animate-spin text-primary" />
                <p className="font-medium">Importing assets…</p>
                <div className="w-full max-w-xs flex flex-col gap-1.5">
                  <Progress value={progress} />
                  <p className="text-xs text-center text-muted-foreground">{progress}% complete</p>
                </div>
              </div>
            )}

            {/* Step 6: Done */}
            {step === 'done' && result && (
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3 p-4 rounded-lg bg-muted">
                  {result.failed === 0
                    ? <CheckCircle2 size={24} className="text-green-500 shrink-0" />
                    : <AlertCircle size={24} className="text-yellow-500 shrink-0" />}
                  <div>
                    <p className="font-semibold">Import Complete</p>
                    <p className="text-sm text-muted-foreground">
                      {result.success} succeeded &nbsp;·&nbsp; {result.failed} failed
                    </p>
                  </div>
                </div>
                {result.errors.length > 0 && (
                  <div className="flex flex-col gap-1 text-xs text-destructive bg-destructive/10 rounded p-3 max-h-40 overflow-y-auto">
                    {result.errors.slice(0, 20).map((e, i) => <p key={i}>{e}</p>)}
                    {result.errors.length > 20 && <p>…and {result.errors.length - 20} more</p>}
                  </div>
                )}
                <div className="flex gap-2">
                  <Button onClick={handleClose}>Close</Button>
                  <Button variant="outline" onClick={reset}>Import More</Button>
                </div>
              </div>
            )}

          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
