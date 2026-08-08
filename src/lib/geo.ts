import { getCountry } from './countries'

// Auto-detects the player's country from their real location so the onboarding
// "country" step can't be spoofed by free manual choice.
//
// Strategy (in order):
//   1. IP geolocation via https://api.country.is (free, CORS-open, no key).
//      Returns { country: "IN" } — validated against the app's country list.
//   2. Browser timezone → ISO country map (works offline, no network).
//   3. null if both fail — the UI falls back to the manual picker.

const IP_GEO_URL = 'https://api.country.is'
const IP_TIMEOUT_MS = 4000

/** IANA timezone → ISO 3166-1 alpha-2 for the common zones. Unknown zones
 *  simply don't match and fall through to the manual picker. */
const TZ_TO_COUNTRY: Record<string, string> = {
  // Asia
  'Asia/Kolkata': 'IN', 'Asia/Shanghai': 'CN', 'Asia/Tokyo': 'JP', 'Asia/Seoul': 'KR',
  'Asia/Singapore': 'SG', 'Asia/Dubai': 'AE', 'Asia/Riyadh': 'SA', 'Asia/Jakarta': 'ID',
  'Asia/Manila': 'PH', 'Asia/Ho_Chi_Minh': 'VN', 'Asia/Bangkok': 'TH', 'Asia/Karachi': 'PK',
  'Asia/Dhaka': 'BD', 'Asia/Kathmandu': 'NP', 'Asia/Colombo': 'LK', 'Asia/Tehran': 'IR',
  'Asia/Baghdad': 'IQ', 'Asia/Jerusalem': 'IL', 'Asia/Beirut': 'LB', 'Asia/Istanbul': 'TR',
  'Asia/Hong_Kong': 'HK', 'Asia/Taipei': 'TW', 'Asia/Kuala_Lumpur': 'MY', 'Asia/Almaty': 'KZ',
  'Asia/Tashkent': 'UZ', 'Asia/Yerevan': 'AM', 'Asia/Baku': 'AZ', 'Asia/Tbilisi': 'GE',
  'Asia/Kabul': 'AF', 'Asia/Ashgabat': 'TM', 'Asia/Dushanbe': 'TJ', 'Asia/Bishkek': 'KG',
  'Asia/Ulaanbaatar': 'MN', 'Asia/Damascus': 'SY', 'Asia/Amman': 'JO', 'Asia/Kuwait': 'KW',
  'Asia/Doha': 'QA', 'Asia/Muscat': 'OM', 'Asia/Bahrain': 'BH', 'Asia/Nicosia': 'CY',
  // Europe
  'Europe/London': 'GB', 'Europe/Dublin': 'IE', 'Europe/Lisbon': 'PT', 'Europe/Madrid': 'ES',
  'Europe/Paris': 'FR', 'Europe/Berlin': 'DE', 'Europe/Amsterdam': 'NL', 'Europe/Brussels': 'BE',
  'Europe/Vienna': 'AT', 'Europe/Zurich': 'CH', 'Europe/Rome': 'IT', 'Europe/Stockholm': 'SE',
  'Europe/Oslo': 'NO', 'Europe/Copenhagen': 'DK', 'Europe/Helsinki': 'FI', 'Europe/Warsaw': 'PL',
  'Europe/Prague': 'CZ', 'Europe/Budapest': 'HU', 'Europe/Athens': 'GR', 'Europe/Bucharest': 'RO',
  'Europe/Sofia': 'BG', 'Europe/Belgrade': 'RS', 'Europe/Zagreb': 'HR', 'Europe/Bratislava': 'SK',
  'Europe/Ljubljana': 'SI', 'Europe/Moscow': 'RU', 'Europe/Kyiv': 'UA', 'Europe/Minsk': 'BY',
  'Europe/Tallinn': 'EE', 'Europe/Riga': 'LV', 'Europe/Vilnius': 'LT',
  // North America
  'America/New_York': 'US', 'America/Chicago': 'US', 'America/Denver': 'US',
  'America/Los_Angeles': 'US', 'America/Phoenix': 'US', 'America/Anchorage': 'US',
  'America/Adak': 'US', 'Pacific/Honolulu': 'US', 'America/Toronto': 'CA',
  'America/Vancouver': 'CA', 'America/Montreal': 'CA', 'America/Mexico_City': 'MX',
  'America/Guatemala': 'GT', 'America/Panama': 'PA', 'America/Costa_Rica': 'CR',
  'America/Havana': 'CU', 'America/Santo_Domingo': 'DO', 'America/Puerto_Rico': 'PR',
  'America/Jamaica': 'JM', 'America/Port-au-Prince': 'HT', 'America/Nassau': 'BS',
  // South America
  'America/Bogota': 'CO', 'America/Lima': 'PE', 'America/Santiago': 'CL',
  'America/Argentina/Buenos_Aires': 'AR', 'America/Sao_Paulo': 'BR', 'America/Caracas': 'VE',
  'America/Montevideo': 'UY', 'America/Asuncion': 'PY', 'America/La_Paz': 'BO',
  'America/Guayaquil': 'EC', 'America/El_Salvador': 'SV', 'America/Honduras': 'HN',
  'America/Managua': 'NI',
  // Oceania
  'Australia/Sydney': 'AU', 'Australia/Melbourne': 'AU', 'Australia/Brisbane': 'AU',
  'Australia/Perth': 'AU', 'Australia/Adelaide': 'AU', 'Pacific/Auckland': 'NZ',
  'Pacific/Fiji': 'FJ', 'Pacific/Port_Moresby': 'PG',
  // Africa
  'Africa/Cairo': 'EG', 'Africa/Lagos': 'NG', 'Africa/Nairobi': 'KE',
  'Africa/Johannesburg': 'ZA', 'Africa/Casablanca': 'MA', 'Africa/Algiers': 'DZ',
  'Africa/Tunis': 'TN', 'Africa/Accra': 'GH', 'Africa/Addis_Ababa': 'ET',
  'Africa/Dar_es_Salaam': 'TZ', 'Africa/Kampala': 'UG', 'Africa/Khartoum': 'SD',
  'Africa/Luanda': 'AO', 'Africa/Mogadishu': 'SO', 'Africa/Rwanda': 'RW',
  'Africa/Dakar': 'SN',
  // Others
  'Atlantic/Reykjavik': 'IS',
  'America/Godthab': 'GL', 'America/Scoresbysund': 'GL', 'America/Thule': 'GL',
}

async function detectByIp(): Promise<string | null> {
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), IP_TIMEOUT_MS)
    const res = await fetch(IP_GEO_URL, { signal: ctrl.signal })
    clearTimeout(timer)
    if (!res.ok) return null
    const data = (await res.json()) as { country?: string }
    const code = (data.country ?? '').trim().toUpperCase()
    return getCountry(code) ? code : null
  } catch {
    return null
  }
}

function detectByTimezone(): string | null {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    if (!tz) return null
    const code = TZ_TO_COUNTRY[tz]
    return getCountry(code) ? code : null
  } catch {
    return null
  }
}

/** Best-effort country detection. Returns an ISO 3166-1 alpha-2 code that
 *  exists in the app's country list, or null when nothing could be resolved. */
export async function detectCountryCode(): Promise<string | null> {
  const ip = await detectByIp()
  if (ip) return ip
  return detectByTimezone()
}
