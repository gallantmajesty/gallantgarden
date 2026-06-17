// One-off generator for src/lib/countries.ts — full ISO 3166-1 alpha-2 list with
// emoji flags derived from the code's regional-indicator codepoints.
import { writeFileSync } from 'fs'

const list = [
  ['AF', 'Afghanistan'], ['AX', 'Åland Islands'], ['AL', 'Albania'], ['DZ', 'Algeria'],
  ['AS', 'American Samoa'], ['AD', 'Andorra'], ['AO', 'Angola'], ['AI', 'Anguilla'],
  ['AQ', 'Antarctica'], ['AG', 'Antigua & Barbuda'], ['AR', 'Argentina'], ['AM', 'Armenia'],
  ['AW', 'Aruba'], ['AU', 'Australia'], ['AT', 'Austria'], ['AZ', 'Azerbaijan'],
  ['BS', 'Bahamas'], ['BH', 'Bahrain'], ['BD', 'Bangladesh'], ['BB', 'Barbados'],
  ['BY', 'Belarus'], ['BE', 'Belgium'], ['BZ', 'Belize'], ['BJ', 'Benin'], ['BM', 'Bermuda'],
  ['BT', 'Bhutan'], ['BO', 'Bolivia'], ['BA', 'Bosnia & Herzegovina'], ['BW', 'Botswana'],
  ['BV', 'Bouvet Island'], ['BR', 'Brazil'], ['IO', 'British Indian Ocean Territory'],
  ['BN', 'Brunei'], ['BG', 'Bulgaria'], ['BF', 'Burkina Faso'], ['BI', 'Burundi'],
  ['CV', 'Cabo Verde'], ['KH', 'Cambodia'], ['CM', 'Cameroon'], ['CA', 'Canada'],
  ['KY', 'Cayman Islands'], ['CF', 'Central African Republic'], ['TD', 'Chad'], ['CL', 'Chile'],
  ['CN', 'China'], ['CX', 'Christmas Island'], ['CC', 'Cocos (Keeling) Islands'],
  ['CO', 'Colombia'], ['KM', 'Comoros'], ['CG', 'Congo - Brazzaville'], ['CD', 'Congo - Kinshasa'],
  ['CK', 'Cook Islands'], ['CR', 'Costa Rica'], ['CI', 'Côte d’Ivoire'], ['HR', 'Croatia'],
  ['CU', 'Cuba'], ['CW', 'Curaçao'], ['CY', 'Cyprus'], ['CZ', 'Czechia'], ['DK', 'Denmark'],
  ['DJ', 'Djibouti'], ['DM', 'Dominica'], ['DO', 'Dominican Republic'], ['EC', 'Ecuador'],
  ['EG', 'Egypt'], ['SV', 'El Salvador'], ['GQ', 'Equatorial Guinea'], ['ER', 'Eritrea'],
  ['EE', 'Estonia'], ['SZ', 'Eswatini'], ['ET', 'Ethiopia'], ['FK', 'Falkland Islands'],
  ['FO', 'Faroe Islands'], ['FJ', 'Fiji'], ['FI', 'Finland'], ['FR', 'France'],
  ['GF', 'French Guiana'], ['PF', 'French Polynesia'], ['TF', 'French Southern Territories'],
  ['GA', 'Gabon'], ['GM', 'Gambia'], ['GE', 'Georgia'], ['DE', 'Germany'], ['GH', 'Ghana'],
  ['GI', 'Gibraltar'], ['GR', 'Greece'], ['GL', 'Greenland'], ['GD', 'Grenada'],
  ['GP', 'Guadeloupe'], ['GU', 'Guam'], ['GT', 'Guatemala'], ['GG', 'Guernsey'],
  ['GN', 'Guinea'], ['GW', 'Guinea-Bissau'], ['GY', 'Guyana'], ['HT', 'Haiti'],
  ['HM', 'Heard & McDonald Islands'], ['VA', 'Vatican City'], ['HN', 'Honduras'],
  ['HK', 'Hong Kong'], ['HU', 'Hungary'], ['IS', 'Iceland'], ['IN', 'India'], ['ID', 'Indonesia'],
  ['IR', 'Iran'], ['IQ', 'Iraq'], ['IE', 'Ireland'], ['IM', 'Isle of Man'], ['IL', 'Israel'],
  ['IT', 'Italy'], ['JM', 'Jamaica'], ['JP', 'Japan'], ['JE', 'Jersey'], ['JO', 'Jordan'],
  ['KZ', 'Kazakhstan'], ['KE', 'Kenya'], ['KI', 'Kiribati'], ['KP', 'North Korea'],
  ['KR', 'South Korea'], ['KW', 'Kuwait'], ['KG', 'Kyrgyzstan'], ['LA', 'Laos'], ['LV', 'Latvia'],
  ['LB', 'Lebanon'], ['LS', 'Lesotho'], ['LR', 'Liberia'], ['LY', 'Libya'], ['LI', 'Liechtenstein'],
  ['LT', 'Lithuania'], ['LU', 'Luxembourg'], ['MO', 'Macao'], ['MG', 'Madagascar'],
  ['MW', 'Malawi'], ['MY', 'Malaysia'], ['MV', 'Maldives'], ['ML', 'Mali'], ['MT', 'Malta'],
  ['MH', 'Marshall Islands'], ['MQ', 'Martinique'], ['MR', 'Mauritania'], ['MU', 'Mauritius'],
  ['YT', 'Mayotte'], ['MX', 'Mexico'], ['FM', 'Micronesia'], ['MD', 'Moldova'], ['MC', 'Monaco'],
  ['MN', 'Mongolia'], ['ME', 'Montenegro'], ['MS', 'Montserrat'], ['MA', 'Morocco'],
  ['MZ', 'Mozambique'], ['MM', 'Myanmar (Burma)'], ['NA', 'Namibia'], ['NR', 'Nauru'],
  ['NP', 'Nepal'], ['NL', 'Netherlands'], ['NC', 'New Caledonia'], ['NZ', 'New Zealand'],
  ['NI', 'Nicaragua'], ['NE', 'Niger'], ['NG', 'Nigeria'], ['NU', 'Niue'], ['NF', 'Norfolk Island'],
  ['MK', 'North Macedonia'], ['MP', 'Northern Mariana Islands'], ['NO', 'Norway'], ['OM', 'Oman'],
  ['PK', 'Pakistan'], ['PW', 'Palau'], ['PS', 'Palestine'], ['PA', 'Panama'],
  ['PG', 'Papua New Guinea'], ['PY', 'Paraguay'], ['PE', 'Peru'], ['PH', 'Philippines'],
  ['PN', 'Pitcairn Islands'], ['PL', 'Poland'], ['PT', 'Portugal'], ['PR', 'Puerto Rico'],
  ['QA', 'Qatar'], ['RE', 'Réunion'], ['RO', 'Romania'], ['RU', 'Russia'], ['RW', 'Rwanda'],
  ['BL', 'St. Barthélemy'], ['SH', 'St. Helena'], ['KN', 'St. Kitts & Nevis'], ['LC', 'St. Lucia'],
  ['MF', 'St. Martin'], ['PM', 'St. Pierre & Miquelon'], ['VC', 'St. Vincent & Grenadines'],
  ['WS', 'Samoa'], ['SM', 'San Marino'], ['ST', 'São Tomé & Príncipe'], ['SA', 'Saudi Arabia'],
  ['SN', 'Senegal'], ['RS', 'Serbia'], ['SC', 'Seychelles'], ['SL', 'Sierra Leone'],
  ['SG', 'Singapore'], ['SX', 'Sint Maarten'], ['SK', 'Slovakia'], ['SI', 'Slovenia'],
  ['SB', 'Solomon Islands'], ['SO', 'Somalia'], ['ZA', 'South Africa'],
  ['GS', 'South Georgia & South Sandwich Islands'], ['SS', 'South Sudan'], ['ES', 'Spain'],
  ['LK', 'Sri Lanka'], ['SD', 'Sudan'], ['SR', 'Suriname'], ['SJ', 'Svalbard & Jan Mayen'],
  ['SE', 'Sweden'], ['CH', 'Switzerland'], ['SY', 'Syria'], ['TW', 'Taiwan'], ['TJ', 'Tajikistan'],
  ['TZ', 'Tanzania'], ['TH', 'Thailand'], ['TL', 'Timor-Leste'], ['TG', 'Togo'], ['TK', 'Tokelau'],
  ['TO', 'Tonga'], ['TT', 'Trinidad & Tobago'], ['TN', 'Tunisia'], ['TR', 'Türkiye'],
  ['TM', 'Turkmenistan'], ['TC', 'Turks & Caicos Islands'], ['TV', 'Tuvalu'], ['UG', 'Uganda'],
  ['UA', 'Ukraine'], ['AE', 'United Arab Emirates'], ['GB', 'United Kingdom'],
  ['US', 'United States'], ['UM', 'U.S. Outlying Islands'], ['UY', 'Uruguay'], ['UZ', 'Uzbekistan'],
  ['VU', 'Vanuatu'], ['VE', 'Venezuela'], ['VN', 'Vietnam'], ['VG', 'British Virgin Islands'],
  ['VI', 'U.S. Virgin Islands'], ['WF', 'Wallis & Futuna'], ['EH', 'Western Sahara'],
  ['YE', 'Yemen'], ['ZM', 'Zambia'], ['ZW', 'Zimbabwe'],
]

const emoji = (cc) => cc.replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)))

const rows = list
  .map(([code, name]) => `  { code: '${code}', name: ${JSON.stringify(name)}, emoji: '${emoji(code)}' },`)
  .join('\n')

const out = `// Full ISO 3166-1 country list (code = ISO alpha-2, UPPERCASE; lowercase it for
// flag-icons CSS classes). The emoji flag is kept as a cross-platform fallback
// and for text summaries. Generated by .assets-stage/gen-countries.mjs.

export interface Country {
  /** ISO 3166-1 alpha-2, UPPERCASE */
  code: string
  name: string
  /** regional-indicator emoji flag (fallback when CSS flags are unavailable) */
  emoji: string
}

export const COUNTRIES: Country[] = [
${rows}
]

const BY_CODE = new Map(COUNTRIES.map((c) => [c.code, c]))

export function getCountry(code: string | null | undefined): Country | null {
  return (code && BY_CODE.get(code)) || null
}
`

writeFileSync('src/lib/countries.ts', out)
console.log('wrote src/lib/countries.ts with', list.length, 'countries')
