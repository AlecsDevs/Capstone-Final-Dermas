// Weather & earthquake data for Nabua, Camarines Sur
// Sources: Open-Meteo (weather) + USGS (earthquakes) — both free, no API key

const NABUA_LAT = 13.41
const NABUA_LNG = 123.38

// ── Types ────────────────────────────────────────────────────

export interface CurrentWeather {
  temperature: number    // °C
  precipitation: number  // mm/hr (current)
  weathercode: number    // WMO code
  windspeed: number      // km/h
  winddirection: number  // degrees
  time: string
}

export interface DailyForecast {
  date: string
  precipitationSum: number   // mm total for the day
  precipProbability: number  // % chance of rain
  weathercode: number
  maxWindspeed: number       // km/h
  tempMax: number            // °C
  tempMin: number            // °C
}

export interface WeatherData {
  current: CurrentWeather
  daily: DailyForecast[]   // 7 days
}

export interface Earthquake {
  id: string
  magnitude: number
  place: string
  time: number   // Unix ms
  depth: number  // km
  sourceUrl: string  // USGS event page link
}

// ── Fetchers ─────────────────────────────────────────────────

export async function fetchNabuaWeather(): Promise<WeatherData> {
  const params = new URLSearchParams({
    latitude: String(NABUA_LAT),
    longitude: String(NABUA_LNG),
    current: 'temperature_2m,precipitation,weathercode,windspeed_10m,winddirection_10m',
    daily: 'precipitation_sum,precipitation_probability_max,weathercode,windspeed_10m_max,temperature_2m_max,temperature_2m_min',
    forecast_days: '7',
    timezone: 'Asia/Manila',
  })

  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`)
  if (!res.ok) throw new Error('Weather fetch failed')
  const data = await res.json()

  const current: CurrentWeather = {
    temperature:   data.current.temperature_2m,
    precipitation: data.current.precipitation,
    weathercode:   data.current.weathercode,
    windspeed:     data.current.windspeed_10m,
    winddirection: data.current.winddirection_10m,
    time:          data.current.time,
  }

  const daily: DailyForecast[] = (data.daily.time as string[]).map((date, i) => ({
    date,
    precipitationSum:  data.daily.precipitation_sum[i]              ?? 0,
    precipProbability: data.daily.precipitation_probability_max[i]  ?? 0,
    weathercode:       data.daily.weathercode[i],
    maxWindspeed:      data.daily.windspeed_10m_max[i]              ?? 0,
    tempMax:           data.daily.temperature_2m_max[i]             ?? 0,
    tempMin:           data.daily.temperature_2m_min[i]             ?? 0,
  }))

  return { current, daily }
}

export async function fetchPhilippineEarthquakes(): Promise<Earthquake[]> {
  // Philippines bounding box: lat 4–21, lng 116–127
  const params = new URLSearchParams({
    format:       'geojson',
    minmagnitude: '4.5',
    minlatitude:  '4',
    maxlatitude:  '21',
    minlongitude: '116',
    maxlongitude: '127',
    limit:        '5',
    orderby:      'time',
  })

  const res = await fetch(`https://earthquake.usgs.gov/fdsnws/event/1/query?${params}`)
  if (!res.ok) throw new Error('Earthquake fetch failed')
  const data = await res.json()

  return data.features.map((f: {
    id: string
    properties: { mag: number; place: string; time: number; url: string }
    geometry: { coordinates: [number, number, number] }
  }) => ({
    id:        f.id,
    magnitude: f.properties.mag,
    place:     f.properties.place,
    time:      f.properties.time,
    depth:     f.geometry.coordinates[2],
    sourceUrl: f.properties.url,
  }))
}
