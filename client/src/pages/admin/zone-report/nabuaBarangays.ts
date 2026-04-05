export const NABUA_BARANGAYS = [
  'Angustia (Inapatan)',
  'Antipolo Old',
  'Antipolo Young',
  'Aro-aldao',
  'Bustrac',
  'Duran',
  'Del Rosario (Inapatan)',
  'La Purisima',
  'Lourdes Old',
  'Lourdes Young',
  'La Opinion',
  'Malawag',
  'Paloyon Oriental',
  'Paloyon Proper',
  'Salvacion Que Gatos',
  'San Antonio (Pob.)',
  'San Antonio Ogbon',
  'San Esteban (Pob.)',
  'San Francisco (Pob.)',
  'San Isidro (Inapatan)',
  'San Isidro (Pob.)',
  'San Jose (Pangaraon)',
  'San Juan (Pob.)',
  'San Luis (Pob.)',
  'San Miguel (Pob.)',
  'San Nicolas (Pob.)',
  'San Roque (Madawon)',
  'San Roque (Pob.)',
  'San Vicente (Gorong-Gorong)',
  'San Vicente (Ogbon)',
  'Sta. Barbara (Maliban)',
  'Sta. Cruz',
  'Sta. Elena (Baras)',
  'Sta. Lucia (Baras)',
  'Santiago Old',
  'Santiago Young',
  'Sto. Domingo',
  'Tandaay',
  'Topas Proper',
  'Topas Sogod',
  'Duran (Jesus Duran)',
  'Malawag (San Jose Malawag)',
  'San Roque Sagumay',
] as const

export const NABUA_LOCATION_OPTIONS = NABUA_BARANGAYS.map((barangay) => `Nabua ${barangay}`)

const normalizeForMatch = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '')

export const normalizeNabuaLocation = (rawValue: string) => {
  const value = rawValue.trim()
  if (!value) return ''

  const withoutTown = value.replace(/^nabua\s*/i, '').trim()
  const needle = normalizeForMatch(withoutTown || value)

  if (!needle) return ''

  const exactBarangay = NABUA_BARANGAYS.find((barangay) => normalizeForMatch(barangay) === needle)
  if (exactBarangay) return `Nabua ${exactBarangay}`

  const startsWithBarangay = NABUA_BARANGAYS.find((barangay) => normalizeForMatch(barangay).startsWith(needle))
  if (startsWithBarangay) return `Nabua ${startsWithBarangay}`

  const includesBarangay = NABUA_BARANGAYS.find((barangay) => normalizeForMatch(barangay).includes(needle))
  if (includesBarangay) return `Nabua ${includesBarangay}`

  const fullMatch = NABUA_LOCATION_OPTIONS.find((option) => normalizeForMatch(option) === normalizeForMatch(value))
  if (fullMatch) return fullMatch

  return value
}
