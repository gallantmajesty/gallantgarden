// ShotHarness: add `look=char` (render the character's exact defined look from
// its fallback config) and `bg=warm` (warm portrait backdrop matching the
// existing character thumbnails). Default behavior is unchanged.
import { readFileSync, writeFileSync } from 'node:fs'

const p = 'src/screens/ShotHarness.tsx'
let s = readFileSync(p, 'utf8')
const eol = s.includes('\r\n') ? '\r\n' : '\n'
let text = s.replace(/\r\n/g, '\n')

const pairs = [
  ["import { DEFAULT_AVATAR, type AvatarConfig, type BodyType } from '../avatar/config'",
   "import { DEFAULT_AVATAR, type AvatarConfig, type BodyType } from '../avatar/config'\nimport { CHARACTERS } from '../avatar/characters'"],
  [`  const [params] = useSearchParams()
  const view = (params.get('view') as View) || 'front'
  const emote = (params.get('emote') as PreviewState) || 'idle'
  const bodyType = (params.get('body') as BodyType) || (params.get('char') === 'sunflower' ? 'female' : 'male')

  // A clean fitted tee + pants + sneakers reads the torso silhouette best (and
  // matches the reference sheets). Query params can override individual fields.
  const config = useMemo<AvatarConfig>(
    () => ({
      ...DEFAULT_AVATAR,
      characterId: params.get('char') || undefined,
      bodyType,
      top: params.get('top') || 'tee',
      bottom: params.get('bottom') || 'pants',
      shoes: params.get('shoes') || 'sneakers',
      hair: params.get('hair') || DEFAULT_AVATAR.hair,
    }),
    [bodyType, params],
  )`,
   `  const [params] = useSearchParams()
  const view = (params.get('view') as View) || 'front'
  const emote = (params.get('emote') as PreviewState) || 'idle'
  const bodyType = (params.get('body') as BodyType) || (params.get('char') === 'sunflower' ? 'female' : 'male')
  const charId = params.get('char') || undefined
  const character = charId ? CHARACTERS.find((c) => c.id === charId) : undefined

  // look=char renders the character's exact defined look (fallback config) —
  // used for character thumbnails. Otherwise a clean tee/pants silhouette with
  // optional per-field overrides.
  const config = useMemo<AvatarConfig>(
    () => {
      if (params.get('look') === 'char' && character?.fallback) {
        return { ...character.fallback, characterId: charId }
      }
      return {
        ...DEFAULT_AVATAR,
        characterId: charId,
        bodyType,
        top: params.get('top') || 'tee',
        bottom: params.get('bottom') || 'pants',
        shoes: params.get('shoes') || 'sneakers',
        hair: params.get('hair') || DEFAULT_AVATAR.hair,
      }
    },
    [bodyType, charId, character, params],
  )`],
  [`  return (
    <div style={{ position: 'fixed', inset: 0, background: '#1a1430' }}>`,
   `  const warmBg =
    'radial-gradient(140% 120% at 85% -5%, rgba(15,8,2,0.9) 0%, rgba(15,8,2,0.35) 42%, rgba(15,8,2,0) 60%), linear-gradient(160deg, #e7cb90 0%, #d9a763 55%, #c68f52 100%)'

  return (
    <div style={{ position: 'fixed', inset: 0, background: params.get('bg') === 'warm' ? warmBg : '#1a1430' }}>`],
]

for (const [from, to] of pairs) {
  if (!text.includes(from)) {
    console.error('MISS:', JSON.stringify(from.slice(0, 80)))
    process.exit(1)
  }
  text = text.split(from).join(to)
}

writeFileSync(p, text.split('\n').join(eol))
console.log('patched ShotHarness.tsx')
