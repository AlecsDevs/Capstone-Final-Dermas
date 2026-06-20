// Approximate centroid coordinates [lat, lng] for each Nabua barangay
export const BARANGAY_COORDS: Record<string, [number, number]> = {
  'Angustia':                    [13.4300, 123.3700],
  'Antipolo Old':                [13.4280, 123.3580],
  'Antipolo Young':              [13.4300, 123.3560],
  'Aro-aldao':                   [13.4200, 123.3550],
  'Bustrac':                     [13.4380, 123.3680],
  'Inapatan':                    [13.4220, 123.3520],
  'Dolorosa':                    [13.4180, 123.3720],
  'Duran':                       [13.4150, 123.3850],
  'La Opinion':                  [13.4020, 123.3900],
  'La Purisima':                 [13.3980, 123.3880],
  'Lourdes Old':                 [13.4100, 123.3780],
  'Lourdes Young':               [13.4080, 123.3760],
  'Malawag':                     [13.4120, 123.3480],
  'Paloyon Oriental':            [13.4060, 123.3920],
  'Paloyon Proper':              [13.4080, 123.3900],
  'Salvacion Que Gatos':         [13.4030, 123.3700],
  'San Antonio (Pob.)':          [13.4060, 123.3740],
  'San Antonio Ogbon':           [13.4000, 123.3720],
  'San Esteban (Pob.)':          [13.4050, 123.3760],
  'San Francisco (Pob.)':        [13.4070, 123.3750],
  'San Isidro (Pob.)':           [13.4040, 123.3730],
  'San Isidro Inapatan':         [13.4180, 123.3580],
  'San Jose':                    [13.3920, 123.3720],
  'San Juan (Pob.)':             [13.4080, 123.3740],
  'San Luis (Pob.)':             [13.4030, 123.3770],
  'San Miguel (Pob.)':           [13.4060, 123.3780],
  'San Nicolas (Pob.)':          [13.4090, 123.3750],
  'San Roque (Pob.)':            [13.4030, 123.3730],
  'San Roque Madawon':           [13.3880, 123.3760],
  'San Roque Sagumay':           [13.3850, 123.3700],
  'San Vicente Gorong-Gorong':   [13.3930, 123.3800],
  'San Vicente Ogbon':           [13.3960, 123.3780],
  'Santa Barbara':               [13.4080, 123.3540],
  'Santa Cruz':                  [13.4040, 123.3500],
  'Santa Elena Baras':           [13.3980, 123.3480],
  'Santa Lucia Baras':           [13.3940, 123.3500],
  'Santiago Old':                [13.3950, 123.3620],
  'Santiago Young':              [13.3930, 123.3600],
  'Santo Domingo':               [13.3820, 123.3740],
  'Tandaay':                     [13.3780, 123.3700],
  'Topas Proper':                [13.3740, 123.3680],
  'Topas Sogod':                 [13.3700, 123.3650],
}

// Centroid coordinates for each zone (fallback when no barangay match)
export const ZONE_COORDS: Record<string, [number, number]> = {
  'Rail Road':     [13.4080, 123.3600],
  'Poblacion':     [13.4057, 123.3744],
  'Mountain Area': [13.4320, 123.3670],
  'River Side':    [13.3920, 123.3780],
}

// Accurate boundary polygon for Nabua municipality
// Source: OpenStreetMap relation 19798164, simplified with Douglas-Peucker (ε=0.0005)
export const NABUA_BOUNDARY: [number, number][] = [
  [13.393836, 123.266107],
  [13.391275, 123.266908],
  [13.383584, 123.277779],
  [13.367246, 123.285678],
  [13.363486, 123.294226],
  [13.359841, 123.296435],
  [13.359272, 123.306503],
  [13.368600, 123.336999],
  [13.365503, 123.373970],
  [13.366352, 123.377834],
  [13.365492, 123.380895],
  [13.365809, 123.394999],
  [13.377229, 123.394585],
  [13.386397, 123.399709],
  [13.391958, 123.401471],
  [13.398762, 123.402399],
  [13.407498, 123.401908],
  [13.410743, 123.401014],
  [13.410050, 123.396975],
  [13.416238, 123.395147],
  [13.424005, 123.397260],
  [13.426412, 123.396496],
  [13.427523, 123.397700],
  [13.428810, 123.397538],
  [13.430808, 123.395596],
  [13.427556, 123.364568],
  [13.429229, 123.353798],
  [13.427451, 123.349964],
  [13.432814, 123.328656],
  [13.426687, 123.313243],
  [13.425176, 123.312991],
  [13.425241, 123.310697],
  [13.421294, 123.312059],
  [13.418540, 123.309462],
  [13.417462, 123.311238],
  [13.416267, 123.309538],
  [13.412533, 123.309356],
  [13.412740, 123.307869],
  [13.414747, 123.308036],
  [13.415654, 123.306436],
  [13.417212, 123.305669],
  [13.415399, 123.305001],
  [13.415308, 123.303302],
  [13.413847, 123.301224],
  [13.413037, 123.301821],
  [13.413649, 123.302394],
  [13.412270, 123.303490],
  [13.412056, 123.302723],
  [13.410663, 123.302717],
  [13.410788, 123.301821],
  [13.408847, 123.301285],
  [13.408611, 123.299514],
  [13.410229, 123.297234],
  [13.409074, 123.296680],
  [13.408454, 123.298158],
  [13.408163, 123.296103],
  [13.409932, 123.294290],
  [13.411866, 123.295075],
  [13.411122, 123.293842],
  [13.411602, 123.293337],
  [13.412826, 123.294247],
  [13.413084, 123.292710],
  [13.410470, 123.291631],
  [13.411722, 123.291476],
  [13.412343, 123.289287],
  [13.413173, 123.290451],
  [13.413308, 123.289030],
  [13.412061, 123.288319],
  [13.408951, 123.288783],
  [13.407614, 123.290112],
  [13.408105, 123.288847],
  [13.405679, 123.288267],
  [13.405438, 123.287288],
  [13.406509, 123.287879],
  [13.407193, 123.286535],
  [13.406576, 123.284708],
  [13.405376, 123.284663],
  [13.407392, 123.282509],
  [13.406144, 123.279444],
  [13.404311, 123.280232],
  [13.405109, 123.276126],
  [13.403275, 123.275705],
  [13.400177, 123.268913],
  [13.398329, 123.267374],
  [13.394077, 123.266784],
  [13.393836, 123.266107],
]

export const NABUA_BARANGAYS = [
  'Angustia',
  'Antipolo Old',
  'Antipolo Young',
  'Aro-aldao',
  'Bustrac',
  'Inapatan',
  'Dolorosa',
  'Duran',
  'La Opinion',
  'La Purisima',
  'Lourdes Old',
  'Lourdes Young',
  'Malawag',
  'Paloyon Oriental',
  'Paloyon Proper',
  'Salvacion Que Gatos',
  'San Antonio (Pob.)',
  'San Antonio Ogbon',
  'San Esteban (Pob.)',
  'San Francisco (Pob.)',
  'San Isidro (Pob.)',
  'San Isidro Inapatan',
  'San Jose',
  'San Juan (Pob.)',
  'San Luis (Pob.)',
  'San Miguel (Pob.)',
  'San Nicolas (Pob.)',
  'San Roque (Pob.)',
  'San Roque Madawon',
  'San Roque Sagumay',
  'San Vicente Gorong-Gorong',
  'San Vicente Ogbon',
  'Santa Barbara',
  'Santa Cruz',
  'Santa Elena Baras',
  'Santa Lucia Baras',
  'Santiago Old',
  'Santiago Young',
  'Santo Domingo',
  'Tandaay',
  'Topas Proper',
  'Topas Sogod'
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
