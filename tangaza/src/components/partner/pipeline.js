// The ERP's 7-stage booking pipeline, mirroring App\Enums\PipelineStage.
// Package-tracking colour language: done = green, current = blue, future = grey.

export const PIPELINE_STAGES = [
  { value: 'confirmed', label: 'Booking confirmed' },
  { value: 'artwork', label: 'Artwork' },
  { value: 'printing', label: 'Printing' },
  { value: 'installation_scheduled', label: 'Installation scheduled' },
  { value: 'installed', label: 'Billboard installed' },
  { value: 'campaign_active', label: 'Campaign active' },
  { value: 'payment_released', label: 'Vendor payment released' },
];

export const SUBSTATUS_LABELS = {
  waiting: 'Waiting for artwork',
  client_providing: 'Client providing artwork',
  provider_designing: 'We are designing',
  approved: 'Artwork approved',
  client_printing: 'Client printing',
  provider_printing: 'We are printing',
  completed: 'Printing completed',
};

export function substatusLabel(value) {
  return SUBSTATUS_LABELS[value] || value;
}

/**
 * Progress summary from a bookings-list row (which carries only the touched
 * stage records): the set of completed stages, the current stage, and counts.
 */
export function deriveProgress(booking) {
  const applicable = PIPELINE_STAGES.filter(
    (stage) => !(stage.value === 'payment_released' && booking.source === 'offline'),
  );
  const done = new Set(
    (booking.stages || []).filter((row) => row.completedAt).map((row) => row.stage),
  );
  // "Booking confirmed" completes itself once the booking is confirmed.
  if (booking.status === 'confirmed') done.add('confirmed');

  const current = applicable.find((stage) => !done.has(stage.value)) || null;
  const completedCount = applicable.filter((stage) => done.has(stage.value)).length;

  return { applicable, done, current, completedCount, total: applicable.length };
}
