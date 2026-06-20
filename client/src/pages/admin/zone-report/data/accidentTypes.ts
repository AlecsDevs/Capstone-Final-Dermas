export const ACCIDENT_TYPES = [
  { value: 'Vehicular Accident', icon: 'bi-car-front-fill',       color: '#dc2626', bg: '#fef2f2', border: '#fca5a5' },
  { value: 'Fire Incident',      icon: 'bi-fire',                  color: '#ea580c', bg: '#fff7ed', border: '#fdba74' },
  { value: 'Drowning',           icon: 'bi-water',                 color: '#2563eb', bg: '#eff6ff', border: '#93c5fd' },
  { value: 'Electrocution',      icon: 'bi-lightning-charge-fill', color: '#d97706', bg: '#fefce8', border: '#fde047' },
  { value: 'Medical Emergency',  icon: 'bi-heart-pulse-fill',      color: '#db2777', bg: '#fdf2f8', border: '#f9a8d4' },
  { value: 'Trauma / Injury',    icon: 'bi-bandaid-fill',          color: '#7c3aed', bg: '#f5f3ff', border: '#c4b5fd' },
  { value: 'Building Collapse',  icon: 'bi-house-x-fill',          color: '#78350f', bg: '#fef3c7', border: '#fcd34d' },
  { value: 'Explosion',          icon: 'bi-stars',                 color: '#b45309', bg: '#fff7ed', border: '#fbbf24' },
  { value: 'Others',             icon: 'bi-three-dots-vertical',   color: '#4b5563', bg: '#f9fafb', border: '#d1d5db' },
] as const

export type AccidentTypeEntry = (typeof ACCIDENT_TYPES)[number]

export function getAccidentMeta(value: string): AccidentTypeEntry | null {
  return (ACCIDENT_TYPES as readonly AccidentTypeEntry[]).find(a => a.value === value) ?? null
}
