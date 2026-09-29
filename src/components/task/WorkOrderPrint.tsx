/**
 * WorkOrderPrint — Sectore 360
 * Official Service Report PDF Engine
 *
 * HOW IT WORKS
 * ────────────
 * 1. Builds a complete self-contained HTML string (inline CSS, base64 images).
 * 2. Creates a hidden <iframe> and writes that HTML into it.
 * 3. Calls iframe.contentWindow.print() — the browser print dialog receives
 *    ONLY the iframe content, never the host web page.
 * 4. Removes the iframe on afterprint / timeout.
 *
 * This means the PDF is ALWAYS the official Service Report regardless of:
 *   - which role triggers it (Admin / Engineer / Customer)
 *   - which tab/page the user is currently viewing
 *   - mobile vs desktop browser
 *
 * There is NO window.print() call on the host page.
 * There is NO React portal on document.body.
 * There is NO hidden/print:block CSS toggle.
 */
import { useEffect } from 'react';
import type { Task } from '@/types/task';
import type { Customer, Asset } from '@/types/customer';
import type { TaskTemplateData } from '@/types/template';
import type { WorkCompletion, CustomerSignature, EngineerTaskPhoto, EngineerProfile } from '@/types/engineer';
import type { CompanyProfile } from '@/services/companyProfileService';

// ─── design tokens (used only inside buildReportHtml) ────────────────────────
const NAVY   = '#0B1F4B';
const BLUE   = '#1d4ed8';
const GRAY   = '#4b5563';
const LGRAY  = '#9ca3af';
const BORDER = '#e2e8f0';
const BG     = '#f8fafc';
const GREEN  = '#16a34a';

// Fixed letterhead constants — always printed regardless of CompanyProfile
const FIXED_ADDRESS = 'F/29, 1st Floor, KSB Olympia\nOpp. Kailash Nagar BRTS Station\nBamroli Althan Road, Pandesara\nSurat \u2013 394221';
const FIXED_PHONES  = '+91\u00a09019987991\u2003\u00b7\u2003+91\u00a08490000273';
const FIXED_EMAIL   = 'support@sectoretecknologies.com';
const FIXED_WEBSITE = 'www.sectoretecknologies.com';
const FIXED_TAGLINE = 'Securing Today. Powering Tomorrow.';

// ─── prop types ───────────────────────────────────────────────────────────────
export interface WorkOrderPrintProps {
  task:             Task;
  customer:         Customer | null;
  asset:            Asset    | null;
  templateData:     TaskTemplateData | null;
  completion?:      WorkCompletion   | null;
  signature?:       CustomerSignature | null;
  photos?:          EngineerTaskPhoto[];
  engineerProfile?: EngineerProfile | null;
  company:          CompanyProfile;
  onClose:          () => void;
}

// ─── pure helpers (no React) ─────────────────────────────────────────────────
function fmtDate(iso?: string | null) {
  if (!iso) return '\u2014';
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
function fmtTime(iso?: string | null) {
  if (!iso) return '\u2014';
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
function fmtDT(iso?: string | null) {
  if (!iso) return '\u2014';
  return new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}
function fmtDuration(min?: number | null) {
  if (min == null) return null;
  if (min >= 60) return `${Math.floor(min / 60)} hr ${min % 60} min`;
  return `${min} min`;
}
function esc(s?: string | null) {
  if (!s) return '';
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ─── HTML builder — returns a complete standalone HTML document ───────────────
function buildReportHtml(props: Omit<WorkOrderPrintProps, 'onClose'>): string {
  const { task, customer, asset, templateData, completion, signature, photos = [], engineerProfile, company } = props;

  // ── derived data ────────────────────────────────────────────────────────────
  const completedItems = templateData?.checklist.filter((c) => c.checked) ?? [];
  const materials      = (templateData?.materials ?? []).filter((m) => (m.usedQty ?? 0) > 0);
  const beforePhotos   = photos.filter((p) => p.category === 'before');
  const duringPhotos   = photos.filter((p) => p.category === 'work_in_progress');
  const afterPhotos    = photos.filter((p) => p.category === 'after');

  const now           = new Date();
  const reportDate    = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
  const duration      = fmtDuration(task.siteTimeMinutes);
  const engineerName  = engineerProfile?.name ?? task.engineerName ?? '\u2014';
  const completedDate = task.serviceEndTime ? fmtDT(task.serviceEndTime) : fmtDate(task.completedAt);

  // Contact mobile: prefer task-level field, fall back to customer record
  const contactMobile = task.contactMobile ?? customer?.primaryMobile;
  const contactPerson = task.contactPerson ?? customer?.contactPerson;

  // AMC status label
  const amcLabel = task.amcId
    ? `Active \u2014 ${task.amcNumber ?? task.amcId}`
    : (customer?.amcStatus ?? undefined);

  // Findings — only include rows that have a value
  const findings = [
    { label: 'Problem Reported', value: task.issueDescription },
    ...(completion ? [
      { label: 'Fault Found',      value: completion.problemFound },
      { label: 'Root Cause',       value: completion.rootCause },
      { label: 'Work Performed',   value: completion.workPerformed },
      { label: 'Resolution',       value: completion.resolution !== completion.workPerformed ? completion.resolution : undefined },
      { label: 'Recommendations',  value: completion.recommendations },
    ] : []),
  ].filter((f) => !!f.value);

  // ── inline HTML helpers ──────────────────────────────────────────────────────
  const sec = (title: string, body: string) => `
    <div class="sec">
      <div class="sec-title">${esc(title)}</div>
      <div class="sec-body">${body}</div>
    </div>`;

  /** A label-value row; omitted entirely when value is empty/null/undefined */
  const row = (label: string, value?: string | null) =>
    value ? `<div class="row"><span class="rl">${esc(label)}</span><span class="rv">${esc(value)}</span></div>` : '';

  /** Service-detail chip (small card with label + bold value) */
  const chip = (label: string, value: string) => `
    <div class="chip">
      <p class="chip-label">${esc(label)}</p>
      <p class="chip-value">${esc(value)}</p>
    </div>`;

  /** Photo grid section — skipped if no photos */
  const photoSec = (items: EngineerTaskPhoto[], sectionTitle: string) => {
    if (!items.length) return '';
    const imgs = items.map((p) => `
      <div class="photo-cell">
        <img src="${esc(p.dataUrl)}" alt="${esc(sectionTitle)}" class="photo-img"/>
        <p class="photo-cap">${esc(sectionTitle)}</p>
      </div>`).join('');
    return sec(sectionTitle, `<div class="photo-grid">${imgs}</div>`);
  };

  // ── logo ─────────────────────────────────────────────────────────────────────
  const logoHtml = company.logoDataUrl
    ? `<img src="${esc(company.logoDataUrl)}" alt="${esc(company.name)}" class="logo"/>`
    : `<p class="company-name">${esc(company.name || 'Sectore Tecknologies')}</p>`;

  // ── SECTION: Customer Information ────────────────────────────────────────────
  const customerBlock = sec('Customer Information', [
    row('Customer Name', contactPerson),
    row('Company',       customer?.companyName),
    row('Contact',       customer?.contactPerson !== contactPerson ? customer?.contactPerson : undefined),
    row('Mobile',        contactMobile),
    row('Address',       customer?.address),
    row('Site Name',     customer?.address),   // site = address field
    row('City / State',  [customer?.city, customer?.state, customer?.pincode].filter(Boolean).join(', ') || undefined),
    row('Department',    asset?.department),
    row('Floor',         asset?.floor),
  ].join(''));

  // ── SECTION: Asset Information ────────────────────────────────────────────────
  const assetBlock = sec('Asset Information', [
    row('Asset Category', asset?.category),
    row('Asset Name',     asset?.deviceType),
    row('Brand',          asset?.brand),
    row('Model',          asset?.model),
    row('Serial Number',  asset?.serialNumber),
    row('Asset Number',   asset?.assetNumber),
    row('Location',       asset?.location),
    row('AMC Status',     amcLabel),
    row('Warranty',       asset?.warrantyEnd ? `Valid until ${fmtDate(asset.warrantyEnd)}` : undefined),
  ].join(''));

  // ── SECTION: Service Details ──────────────────────────────────────────────────
  const serviceChips = [
    ['Service Type',      task.taskType],
    ['Priority',          task.priority],
    ['Engineer',          engineerName],
    ['Created',           fmtDT(task.createdAt)],
    ['Reached Site',      fmtTime(task.serviceStartTime)],
    ['Completed',         fmtTime(task.serviceEndTime)],
  ].map(([l, v]) => chip(l, v ?? '\u2014')).join('');

  const durationBadge = duration ? `
    <div class="duration-badge">
      <div class="duration-dot"></div>
      <div>
        <p class="duration-label">Total Service Duration</p>
        <p class="duration-val">${esc(duration)}</p>
      </div>
    </div>` : '';

  const serviceBlock = sec('Service Details',
    `<div class="chip-grid">${serviceChips}</div>${durationBadge}`);

  // ── SECTION: Engineer Findings ────────────────────────────────────────────────
  const findingsBlock = findings.length ? sec('Engineer Findings',
    `<div class="findings-grid">${findings.map(({ label, value }) => `
      <div class="finding">
        <p class="finding-label">${esc(label)}</p>
        <p class="finding-value">${esc(value)}</p>
      </div>`).join('')}</div>`
  ) : '';

  // ── SECTION: Completed Checklist (checked items only) ────────────────────────
  const checklistBlock = completedItems.length ? sec(
    `Completed Checklist \u2014 ${completedItems.length} Item${completedItems.length !== 1 ? 's' : ''}`,
    `<div class="check-grid">${completedItems.map((item) =>
      `<div class="check-item">
        <span class="check-icon">\u2713</span>
        <span class="check-text">${esc(item.label)}</span>
      </div>`
    ).join('')}</div>`
  ) : '';

  // ── SECTION: Materials Used ───────────────────────────────────────────────────
  const materialsBlock = materials.length ? sec('Materials Used', `
    <table class="mat-table">
      <thead>
        <tr>
          <th class="th tl">Item</th>
          <th class="th tc">Planned</th>
          <th class="th tc">Used</th>
          <th class="th tc">Extra</th>
          <th class="th tc">Returned</th>
          <th class="th tl">Unit</th>
          <th class="th tl">Remarks</th>
        </tr>
      </thead>
      <tbody>
        ${materials.map((m, i) => `
          <tr style="background:${i % 2 === 0 ? '#fff' : BG}">
            <td class="td tl fw">${esc(m.itemName)}</td>
            <td class="td tc gc">${m.plannedQty ?? 0}</td>
            <td class="td tc bc">${m.usedQty ?? 0}</td>
            <td class="td tc gc">${m.extraQty ?? 0}</td>
            <td class="td tc gc">${m.returnedQty ?? 0}</td>
            <td class="td tl gc">${esc(m.unit)}</td>
            <td class="td tl gc${m.remarks ? '' : ' it'}">${esc(m.remarks) || '\u2014'}</td>
          </tr>`).join('')}
      </tbody>
    </table>`) : '';

  // ── SECTION: Photos ───────────────────────────────────────────────────────────
  const photosHtml = [
    photoSec(beforePhotos, 'Before Work'),
    photoSec(duringPhotos, 'During Work'),
    photoSec(afterPhotos,  'After Work'),
  ].join('');

  // ── SECTION: Signatures ───────────────────────────────────────────────────────
  const custSigContent = signature?.signatureDataUrl
    ? `<div class="sig-box"><img src="${esc(signature.signatureDataUrl)}" alt="Customer Signature" class="sig-img"/></div>
       ${signature.signatoryName ? `<p class="sig-name">${esc(signature.signatoryName)}</p>` : ''}
       ${signature.signedAt      ? `<p class="sig-date">${esc(fmtDT(signature.signedAt))}</p>` : ''}`
    : '<div class="sig-line"></div>';

  const engSigContent = `
    <div class="sig-line"></div>
    <p class="sig-name">${esc(engineerName)}</p>
    ${engineerProfile?.designation ? `<p class="sig-sub">${esc(engineerProfile.designation)}</p>` : ''}
    ${engineerProfile?.employeeId  ? `<p class="sig-sub">ID: ${esc(engineerProfile.employeeId)}</p>`  : ''}
    <p class="sig-date">Completion: ${esc(completedDate)}</p>`;

  const signaturesBlock = `
    <div class="sig-grid">
      ${sec('Customer Signature',
        custSigContent +
        `<p class="sig-auth">Authorised Signatory \u2014 ${esc(customer?.companyName ?? 'Customer')}</p>`
      )}
      ${sec('Engineer Signature', engSigContent)}
    </div>`;

  // ── SECTION: Customer Remarks ────────────────────────────────────────────────
  const remarksText = task.customerRemarks || completion?.customerRemarks;
  const remarksBlock = remarksText
    ? sec('Customer Remarks', `<p class="remarks">\u201c${esc(remarksText)}\u201d</p>`)
    : '';

  // ── FULL HTML DOCUMENT ────────────────────────────────────────────────────────
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Service Work Report \u2014 ${esc(task.taskNumber)}</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; font-size: 11px; color: #1a202c; background: #fff; }

  /* A4 page settings */
  @page {
    size: A4 portrait;
    margin: 14mm 14mm 18mm 14mm;
    @bottom-center {
      content: "Page " counter(page) " of " counter(pages);
      font-size: 8px;
      color: #9ca3af;
    }
  }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .no-break { page-break-inside: avoid; break-inside: avoid; }
  }

  /* ── Letterhead ── */
  .header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; padding-bottom: 14px; border-bottom: 3px solid ${NAVY}; margin-bottom: 16px; page-break-inside: avoid; break-inside: avoid; }
  .logo { height: 52px; max-width: 200px; object-fit: contain; display: block; margin-bottom: 8px; }
  .company-name { font-size: 18px; font-weight: 800; color: ${NAVY}; margin-bottom: 6px; letter-spacing: -0.3px; }
  .tagline { font-size: 9px; color: ${BLUE}; font-style: italic; font-weight: 600; margin-bottom: 6px; }
  .addr { font-size: 8px; color: ${GRAY}; white-space: pre-line; line-height: 1.65; margin-bottom: 4px; }
  .contact-line { font-size: 8px; color: ${GRAY}; margin: 2px 0; }
  .website-line { font-size: 8px; color: ${BLUE}; margin: 2px 0; }
  .hdr-divider { width: 1px; background: ${BORDER}; align-self: stretch; flex-shrink: 0; margin: 0 4px; }
  .hdr-right { text-align: right; flex-shrink: 0; min-width: 190px; }
  .report-type { font-size: 10px; font-weight: 700; color: ${LGRAY}; letter-spacing: 2.5px; text-transform: uppercase; margin-bottom: 4px; }
  .ticket-num { font-size: 24px; font-weight: 900; color: ${NAVY}; font-family: "Courier New", monospace; margin-bottom: 12px; letter-spacing: -0.5px; }
  .meta-table { margin-left: auto; border-collapse: collapse; }
  .meta-table td { padding-bottom: 4px; }
  .mk { font-size: 8px; color: ${LGRAY}; padding-right: 8px; text-align: right; white-space: nowrap; }
  .mv { font-size: 10px; font-weight: 700; text-align: left; }

  /* ── Two-column grid ── */
  .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 0; }
  .two-col .sec { margin-bottom: 0; }

  /* ── Section card ── */
  .sec { border: 1px solid ${BORDER}; border-radius: 6px; overflow: hidden; margin-bottom: 12px; break-inside: avoid; page-break-inside: avoid; }
  .sec-title { background: ${NAVY}; color: #fff; padding: 6px 12px; font-weight: 700; font-size: 9px; letter-spacing: 1px; text-transform: uppercase; }
  .sec-body { padding: 10px 12px; background: #fff; }

  /* ── Row (label : value) ── */
  .row { display: flex; gap: 8px; padding-bottom: 4px; border-bottom: 1px solid ${BORDER}; margin-bottom: 4px; line-height: 1.4; }
  .row:last-child { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }
  .rl { font-size: 8.5px; color: ${LGRAY}; width: 105px; flex-shrink: 0; padding-top: 1px; text-transform: uppercase; letter-spacing: 0.3px; }
  .rv { font-size: 10.5px; font-weight: 500; flex: 1; word-break: break-word; }

  /* ── Service-detail chips ── */
  .chip-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 10px; }
  .chip { background: ${BG}; border: 1px solid ${BORDER}; border-radius: 5px; padding: 7px 10px; }
  .chip-label { font-size: 7px; color: ${LGRAY}; text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 3px; }
  .chip-value { font-size: 11px; font-weight: 700; }

  /* ── Duration badge ── */
  .duration-badge { display: inline-flex; align-items: center; gap: 10px; background: #eff6ff; border: 1.5px solid #bfdbfe; border-radius: 6px; padding: 7px 14px; margin-top: 2px; }
  .duration-dot { width: 8px; height: 8px; border-radius: 50%; background: ${BLUE}; flex-shrink: 0; }
  .duration-label { font-size: 7px; color: ${BLUE}; text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 2px; }
  .duration-val { font-size: 17px; font-weight: 900; color: ${BLUE}; }

  /* ── Engineer Findings ── */
  .findings-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .finding { border-left: 3px solid ${BLUE}; padding-left: 9px; }
  .finding-label { font-size: 7px; color: ${LGRAY}; text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 3px; }
  .finding-value { font-size: 10.5px; line-height: 1.65; word-break: break-word; }

  /* ── Checklist ── */
  .check-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 3px 12px; }
  .check-item { display: flex; align-items: flex-start; gap: 6px; padding: 3px 0; }
  .check-icon { display: inline-flex; align-items: center; justify-content: center; width: 14px; height: 14px; border-radius: 3px; background: #dcfce7; border: 1.5px solid ${GREEN}; color: ${GREEN}; font-size: 9px; flex-shrink: 0; margin-top: 1px; font-weight: 700; }
  .check-text { font-size: 10px; line-height: 1.45; }

  /* ── Materials table ── */
  .mat-table { width: 100%; border-collapse: collapse; font-size: 10px; }
  .th { padding: 5px 10px; border: 1px solid #1e3a8a; background: ${NAVY}; color: #fff; font-weight: 600; font-size: 9px; }
  .td { padding: 5px 10px; border: 1px solid ${BORDER}; vertical-align: middle; }
  .tl { text-align: left; } .tc { text-align: center; }
  .fw { font-weight: 600; }
  .gc { color: ${GRAY}; }
  .bc { font-weight: 700; color: ${BLUE}; }
  .it { font-style: italic; }

  /* ── Photos ── */
  .photo-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .photo-cell { text-align: center; break-inside: avoid; page-break-inside: avoid; }
  .photo-img { width: 100%; max-height: 140px; object-fit: cover; border-radius: 4px; border: 1px solid ${BORDER}; display: block; }
  .photo-cap { font-size: 8px; color: ${LGRAY}; margin-top: 3px; }

  /* ── Signatures ── */
  .sig-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px; break-inside: avoid; page-break-inside: avoid; }
  .sig-box { border: 1px solid ${BORDER}; border-radius: 4px; padding: 6px; display: inline-block; margin-bottom: 6px; background: #fff; }
  .sig-img { max-height: 60px; max-width: 170px; object-fit: contain; display: block; }
  .sig-line { height: 52px; border-bottom: 1.5px solid #374151; margin-bottom: 8px; }
  .sig-name { font-size: 10.5px; font-weight: 700; margin: 4px 0 1px; }
  .sig-sub { font-size: 8.5px; color: ${GRAY}; margin: 0 0 1px; }
  .sig-date { font-size: 8px; color: ${LGRAY}; margin: 0 0 3px; }
  .sig-auth { font-size: 8px; color: ${LGRAY}; margin: 0; border-top: 1px solid ${BORDER}; padding-top: 4px; }

  /* ── Customer Remarks ── */
  .remarks { font-size: 11px; font-style: italic; line-height: 1.75; color: ${GRAY}; word-break: break-word; }

  /* ── Footer (printed at bottom of every page via @page when supported; fallback below) ── */
  .footer {
    border-top: 1px solid ${BORDER};
    margin-top: 20px;
    padding-top: 8px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 4px;
  }
  .footer-brand { font-size: 8px; color: ${LGRAY}; }
  .footer-page { font-size: 8px; color: ${LGRAY}; }

  /* Gap between two-col and the next section */
  .section-gap { margin-top: 12px; }
</style>
</head>
<body>

  <!-- ═══════════════════════════════════════════════════════════ -->
  <!-- LETTERHEAD                                                  -->
  <!-- ═══════════════════════════════════════════════════════════ -->
  <div class="header no-break">
    <!-- Left: Logo + contact details -->
    <div style="flex:0 0 auto;max-width:230px">
      ${logoHtml}
      <p class="tagline">${esc(FIXED_TAGLINE)}</p>
      <p class="addr">${esc(FIXED_ADDRESS)}</p>
      <p class="contact-line">${FIXED_PHONES}</p>
      <p class="contact-line">${esc(FIXED_EMAIL)}</p>
      <p class="website-line">${esc(FIXED_WEBSITE)}</p>
    </div>

    <div class="hdr-divider"></div>

    <!-- Right: Report type + ticket meta -->
    <div class="hdr-right">
      <p class="report-type">Service Work Report</p>
      <p class="ticket-num">${esc(task.taskNumber)}</p>
      <table class="meta-table">
        <tr><td class="mk">Generated</td><td class="mv">${esc(reportDate)}</td></tr>
        <tr><td class="mk">Engineer</td><td class="mv">${esc(engineerName)}</td></tr>
        <tr><td class="mk">Priority</td><td class="mv">${esc(task.priority)}</td></tr>
        <tr><td class="mk">Status</td><td class="mv">${esc(task.status)}</td></tr>
      </table>
    </div>
  </div>

  <!-- ═══════════════════════════════════════════════════════════ -->
  <!-- CUSTOMER + ASSET (side by side)                            -->
  <!-- ═══════════════════════════════════════════════════════════ -->
  <div class="two-col no-break">
    ${customerBlock}
    ${assetBlock}
  </div>

  <!-- ═══════════════════════════════════════════════════════════ -->
  <!-- SERVICE DETAILS                                            -->
  <!-- ═══════════════════════════════════════════════════════════ -->
  <div class="section-gap">
    ${serviceBlock}
  </div>

  <!-- ═══════════════════════════════════════════════════════════ -->
  <!-- ENGINEER FINDINGS                                          -->
  <!-- ═══════════════════════════════════════════════════════════ -->
  ${findingsBlock}

  <!-- ═══════════════════════════════════════════════════════════ -->
  <!-- COMPLETED CHECKLIST                                        -->
  <!-- ═══════════════════════════════════════════════════════════ -->
  ${checklistBlock}

  <!-- ═══════════════════════════════════════════════════════════ -->
  <!-- MATERIALS USED                                             -->
  <!-- ═══════════════════════════════════════════════════════════ -->
  ${materialsBlock}

  <!-- ═══════════════════════════════════════════════════════════ -->
  <!-- PHOTOS (Before / During / After)                          -->
  <!-- ═══════════════════════════════════════════════════════════ -->
  ${photosHtml}

  <!-- ═══════════════════════════════════════════════════════════ -->
  <!-- SIGNATURES                                                 -->
  <!-- ═══════════════════════════════════════════════════════════ -->
  ${signaturesBlock}

  <!-- ═══════════════════════════════════════════════════════════ -->
  <!-- CUSTOMER REMARKS                                           -->
  <!-- ═══════════════════════════════════════════════════════════ -->
  ${remarksBlock}

  <!-- ═══════════════════════════════════════════════════════════ -->
  <!-- FOOTER                                                     -->
  <!-- ═══════════════════════════════════════════════════════════ -->
  <div class="footer">
    <span class="footer-brand">This report was digitally generated by Sectore Technologies.</span>
    <span class="footer-page">Page 1</span>
  </div>

</body>
</html>`;
}

// ─── main component ───────────────────────────────────────────────────────────
/**
 * WorkOrderPrint
 *
 * Mounts once, injects the full service-report HTML into a hidden <iframe>,
 * then calls iframe.contentWindow.print().  The browser's print dialog receives
 * ONLY the iframe document — never the host web page.
 *
 * Works identically for Admin / Engineer / Customer roles on any browser or device.
 */
export function WorkOrderPrint({
  task, customer, asset, templateData, completion,
  signature, photos = [], engineerProfile, company, onClose,
}: WorkOrderPrintProps) {
  useEffect(() => {
    // Build the complete report HTML string (inline CSS, base64 images)
    const html = buildReportHtml({ task, customer, asset, templateData, completion, signature, photos, engineerProfile, company });

    // Create a hidden iframe
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;border:none;opacity:0;pointer-events:none;';
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument ?? iframe.contentWindow?.document;
    if (!doc) { document.body.removeChild(iframe); onClose(); return; }

    // Write the report into the iframe
    doc.open();
    doc.write(html);
    doc.close();

    let cleaned = false;
    const cleanup = () => {
      if (cleaned) return;
      cleaned = true;
      try { document.body.removeChild(iframe); } catch { /* already removed */ }
      onClose();
    };

    // Wait for all resources (images) inside the iframe to load, then print
    const printWhenReady = () => {
      try {
        iframe.contentWindow?.print();
      } catch {
        // Safari may block synchronous print — retry after a tick
        setTimeout(() => { try { iframe.contentWindow?.print(); } catch { /* ignore */ } }, 100);
      }
      // afterprint fires when the dialog closes (Chrome/Edge/Firefox)
      iframe.contentWindow?.addEventListener('afterprint', cleanup, { once: true });
      // Fallback cleanup after 60 s in case afterprint never fires (Safari)
      setTimeout(cleanup, 60_000);
    };

    // Give images inside the iframe time to decode
    const images = Array.from(doc.images);
    if (images.length === 0) {
      setTimeout(printWhenReady, 300);
    } else {
      let loaded = 0;
      const onLoad = () => { if (++loaded >= images.length) setTimeout(printWhenReady, 250); };
      images.forEach((img) => {
        if (img.complete) { onLoad(); }
        else { img.addEventListener('load', onLoad, { once: true }); img.addEventListener('error', onLoad, { once: true }); }
      });
      // Hard fallback — print even if some images fail
      setTimeout(printWhenReady, 6_000);
    }

    // If component unmounts before printing (user navigates away), clean up
    return cleanup;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // This component renders nothing into the React tree — all output is via the iframe
  return null;
}
