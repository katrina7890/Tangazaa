export const BILLBOARD_TYPES = [
  { value: 'standard_4x3', label: 'Standard 4x3' },
  { value: 'digital_led', label: 'Digital LED' },
  { value: 'gantry', label: 'Gantry' },
  { value: 'wall_wrap', label: 'Wall Wrap' },
];

export function billboardTypeLabel(value) {
  return BILLBOARD_TYPES.find((type) => type.value === value)?.label || value;
}
