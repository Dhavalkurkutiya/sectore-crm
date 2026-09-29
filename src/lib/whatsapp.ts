/**
 * WhatsApp Click-to-Chat Message Generator
 * Sectore 360 — No API required, generates wa.me links
 *
 * Generates pre-filled WhatsApp messages for each task lifecycle event.
 * The user just taps Send — no backend calls needed.
 */

interface WAMessageInput {
  taskNumber: string;
  customerName: string;
  contactMobile: string;
  engineerName?: string;
  visitDate?: string;
  visitTime?: string;
  serviceType?: string;
  issueTitle?: string;
  reportUrl?: string;
  companyName?: string;
}

export type WAMessageType =
  | 'task_created'
  | 'engineer_assigned'
  | 'on_the_way'
  | 'engineer_arrived'
  | 'task_completed'
  | 'report_ready';

const LABEL: Record<WAMessageType, string> = {
  task_created:      'Task Created',
  engineer_assigned: 'Engineer Assigned',
  on_the_way:        'Engineer On The Way',
  engineer_arrived:  'Engineer Arrived',
  task_completed:    'Task Completed',
  report_ready:      'Service Report Ready',
};

function cleanPhone(mobile: string): string {
  // Remove spaces, dashes, brackets; prepend country code 91 if no +
  const digits = mobile.replace(/\D/g, '');
  if (digits.startsWith('91') && digits.length === 12) return digits;
  if (digits.length === 10) return `91${digits}`;
  return digits;
}

function buildMessage(type: WAMessageType, input: WAMessageInput): string {
  const co = input.companyName ?? 'Sectore 360';
  const { taskNumber, customerName, engineerName, visitDate, visitTime, serviceType, issueTitle } = input;

  const date = visitDate ? new Date(visitDate).toLocaleDateString('en-IN', { dateStyle: 'medium' }) : '';
  const time = visitTime ?? '';

  switch (type) {
    case 'task_created':
      return [
        `Dear *${customerName}*,`,
        '',
        `Your service request has been registered with *${co}*.`,
        '',
        `📋 *Work Order:* ${taskNumber}`,
        serviceType ? `🔧 *Service:* ${serviceType}` : '',
        issueTitle  ? `📌 *Issue:* ${issueTitle}` : '',
        '',
        `Our team will contact you shortly to schedule a visit.`,
        '',
        `Thank you for choosing *${co}*!`,
      ].filter((l) => l !== undefined).join('\n');

    case 'engineer_assigned':
      return [
        `Dear *${customerName}*,`,
        '',
        `Your service request *${taskNumber}* has been assigned.`,
        '',
        `👨‍🔧 *Engineer:* ${engineerName ?? 'Our Team'}`,
        date ? `📅 *Scheduled:* ${date}${time ? ` at ${time}` : ''}` : '',
        '',
        `Please keep the relevant equipment ready and accessible.`,
        '',
        `— *${co}*`,
      ].filter(Boolean).join('\n');

    case 'on_the_way':
      return [
        `Dear *${customerName}*,`,
        '',
        `Our engineer *${engineerName ?? 'from our team'}* is on the way to your location.`,
        '',
        `📋 *Work Order:* ${taskNumber}`,
        `🚗 Please ensure site access is available.`,
        '',
        `— *${co}*`,
      ].join('\n');

    case 'engineer_arrived':
      return [
        `Dear *${customerName}*,`,
        '',
        `Our engineer *${engineerName ?? 'from our team'}* has arrived at your site.`,
        '',
        `📋 *Work Order:* ${taskNumber}`,
        `⏱️ Work will begin shortly.`,
        '',
        `— *${co}*`,
      ].join('\n');

    case 'task_completed':
      return [
        `Dear *${customerName}*,`,
        '',
        `Your service request *${taskNumber}* has been completed successfully. ✅`,
        '',
        serviceType ? `🔧 *Service:* ${serviceType}` : '',
        engineerName ? `👨‍🔧 *Engineer:* ${engineerName}` : '',
        '',
        `Thank you for trusting *${co}*. Please let us know if you need any further assistance.`,
        '',
        `— *${co}*`,
      ].filter(Boolean).join('\n');

    case 'report_ready':
      return [
        `Dear *${customerName}*,`,
        '',
        `Your service report for *${taskNumber}* is ready.`,
        '',
        input.reportUrl ? `📄 *View Report:* ${input.reportUrl}` : '📄 Please contact us to receive your service report.',
        '',
        `Thank you for choosing *${co}*!`,
      ].join('\n');

    default:
      return `Service update for ${taskNumber}. — ${co}`;
  }
}

export interface WAMessage {
  type: WAMessageType;
  label: string;
  message: string;
  url: string;
}

/**
 * Generate all WhatsApp click-to-chat messages for a task.
 * Returns only messages relevant to the current task state.
 */
export function generateWAMessages(input: WAMessageInput): WAMessage[] {
  const phone = cleanPhone(input.contactMobile);
  if (!phone) return [];

  const all: WAMessageType[] = [
    'task_created', 'engineer_assigned', 'on_the_way',
    'engineer_arrived', 'task_completed', 'report_ready',
  ];

  return all.map((type) => {
    const message = buildMessage(type, input);
    const encoded = encodeURIComponent(message);
    return {
      type,
      label: LABEL[type],
      message,
      url:   `https://wa.me/${phone}?text=${encoded}`,
    };
  });
}

export function openWhatsApp(url: string): void {
  window.open(url, '_blank', 'noopener,noreferrer');
}
