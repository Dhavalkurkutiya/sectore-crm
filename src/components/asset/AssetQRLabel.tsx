/**
 * AssetQRLabel
 * Generates printable QR code + barcode label for an asset.
 * Sectore 360 — Version 1.0
 */
import { useRef } from 'react';
import QRCodeDataUrl from '@/components/ui/qrcodedataurl';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Printer, Download } from 'lucide-react';
import type { Asset } from '@/types/customer';

interface AssetQRLabelProps {
  asset: Asset;
  companyName?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function BarcodeStripes({ value }: { value: string }) {
  // Simple visual barcode (alternating stripes derived from char codes)
  const chars = value.split('');
  return (
    <div className="flex items-end gap-px h-10 overflow-hidden" aria-hidden>
      {chars.map((c, i) => {
        const h = (c.charCodeAt(0) % 16) + 20;
        const w = (i % 3 === 0) ? 3 : 2;
        return <div key={i} style={{ height: h, width: w, background: '#000' }} className="shrink-0" />;
      })}
    </div>
  );
}

export function AssetQRLabel({ asset, companyName = 'Sectore 360', open, onOpenChange }: AssetQRLabelProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const qrData = JSON.stringify({
    id: asset.id,
    code: asset.code,
    assetNumber: asset.assetNumber,
    category: asset.category,
    brand: asset.brand,
    model: asset.model,
    serial: asset.serialNumber,
  });

  const barcodeValue = asset.assetNumber || asset.code;

  function handlePrint() {
    if (!printRef.current) return;
    const html = printRef.current.innerHTML;
    const win = window.open('', '_blank', 'width=400,height=300');
    if (!win) return;
    win.document.write(`
      <html><head><title>Asset Label - ${asset.code}</title>
      <style>
        body { margin: 0; font-family: monospace; }
        .label { width: 3in; padding: 8px; border: 1px solid #000; page-break-after: always; }
        .qr img { width: 80px; height: 80px; }
        .bar { display: flex; align-items: flex-end; gap: 1px; height: 32px; }
        .bar div { background: #000; }
        .code { font-size: 8px; letter-spacing: 2px; }
        .title { font-size: 11px; font-weight: bold; }
        .sub { font-size: 9px; }
      </style></head><body>${html}</body></html>
    `);
    win.document.close();
    win.focus();
    win.print();
    win.close();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-sm">Asset Label Preview</DialogTitle>
        </DialogHeader>

        {/* Label preview */}
        <div ref={printRef}>
          <div className="border-2 border-border rounded-lg p-3 bg-white dark:bg-white text-black flex flex-col gap-2">
            {/* Header */}
            <div className="text-center border-b border-gray-300 pb-1.5 mb-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600">{companyName}</p>
            </div>

            {/* QR + Info */}
            <div className="flex gap-3 items-start">
              <div className="shrink-0">
                <QRCodeDataUrl text={qrData} width={80} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold tracking-wide">{asset.assetNumber || asset.code}</p>
                <p className="text-[10px] text-gray-500 font-mono">{asset.code}</p>
                <p className="text-[11px] font-semibold mt-1">{[asset.brand, asset.model].filter(Boolean).join(' ')}</p>
                <p className="text-[10px] text-gray-600">{asset.category} · {asset.deviceType}</p>
                {asset.location && <p className="text-[10px] text-gray-500 mt-0.5">{asset.location}</p>}
              </div>
            </div>

            {/* Serial Number */}
            <div className="border-t border-gray-200 pt-1.5">
              <p className="text-[9px] text-gray-500 uppercase">Serial No.</p>
              <p className="font-mono text-[11px] font-semibold">{asset.serialNumber}</p>
            </div>

            {/* Barcode */}
            <div className="border-t border-gray-200 pt-2 flex flex-col items-center gap-1">
              <BarcodeStripes value={barcodeValue} />
              <p className="text-[9px] font-mono tracking-widest">{barcodeValue}</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <Button className="flex-1 gap-2" onClick={handlePrint}>
            <Printer size={14} /> Print Label
          </Button>
          <Button variant="outline" className="gap-2" onClick={() => {
            // Save as image via canvas (simple approach)
            const svg = document.createElement('canvas');
            svg.width = 240; svg.height = 180;
            const ctx = svg.getContext('2d');
            if (ctx) {
              ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 240, 180);
              ctx.fillStyle = '#000'; ctx.font = 'bold 12px monospace';
              ctx.fillText(asset.assetNumber || asset.code, 10, 20);
              ctx.font = '10px monospace';
              ctx.fillText(asset.serialNumber, 10, 40);
            }
            const a = document.createElement('a');
            a.href = svg.toDataURL('image/png');
            a.download = `label-${asset.code}.png`;
            a.click();
          }}>
            <Download size={14} />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
