// TypeScript mirrors of the InsForge schema (see migrations/).

// The full, versioned avatar description lives in src/avatar/config.ts (it owns
// the catalogs, defaults, and shared-material cache). Re-exported here so schema
// mirrors that reference a profile's avatar have a single import site.
export type { AvatarConfig } from '../avatar/config'

export interface Profile {
  id: string
  display_name: string
  /** unique numeric Player ID (Free Fire–style). Assigned at signup, permanent,
   *  used for sharing/links/search in place of the old text username. */
  player_id: number | null
  /** how many times the (non-unique) display name has been changed. Capped at
   *  DISPLAY_NAME_CHANGES_MAX; further changes require a paid name card. */
  display_name_changes: number
  /** rank id (mirror of settings.onboarding.rank), promoted to a column so the
   *  public view can expose it. */
  rank: string | null
  /** ISO alpha-2 country code (UPPERCASE), the one public onboarding field. */
  country: string | null
  /** optional uploaded profile picture URL (storage `avatars` bucket). */
  avatar_url: string | null
  avatar: import('../avatar/config').AvatarConfig
  /** intentionally-public profile blob (see ProfilePublic). */
  public_profile: ProfilePublic
  settings: Record<string, unknown>
  created_at: string
  updated_at: string
}

/** Max free display-name changes in a lifetime. Beyond this a paid name card
 *  (added later) is required. Mirrors the product spec. */
export const DISPLAY_NAME_CHANGES_MAX = 2

/** A single off-platform link shown on a profile. */
export interface SocialLink {
  label: string
  url: string
}

/** The intentionally-public profile blob (stored as profiles.public_profile
 *  jsonb, exposed verbatim through the public_profiles view). Everything here is
 *  safe for any authenticated user to read. */
export interface ProfilePublic {
  bio: string
  favoriteSubject: string
  studySchedule: string
  studyInterests: string[]
  /** banner design id (see BANNERS catalog in lib/banners.ts). */
  banner: string
  /** optional uploaded banner image URL — when set it overrides the gradient. */
  bannerImage: string | null
  /** vertical focus of the banner image, as object-position Y % (0–100). */
  bannerPos: number
  /** selected logo id from the logo catalog (independent from banner). */
  logo: string
  socialLinks: SocialLink[]
  /** total likes received on this profile (public counter). */
  likes: number
}

export const EMPTY_PROFILE_PUBLIC: ProfilePublic = {
  bio: '',
  favoriteSubject: '',
  studySchedule: '',
  studyInterests: [],
  banner: 'default_banner',
  bannerImage: null,
  bannerPos: 50,
  logo: '',
  socialLinks: [],
  likes: 0,
}

/** Parse a raw `public_profile` jsonb value into a well-formed ProfilePublic. */
export function parseProfilePublic(raw: unknown): ProfilePublic {
  if (!raw || typeof raw !== 'object') return { ...EMPTY_PROFILE_PUBLIC }
  const o = raw as Record<string, unknown>
  const str = (v: unknown) => (typeof v === 'string' ? v : '')
  const num = (v: unknown, fallback: number) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback)
  const strArr = (v: unknown) =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []
  const links = Array.isArray(o.socialLinks)
    ? (o.socialLinks as unknown[])
        .map((l) => (l && typeof l === 'object' ? (l as Record<string, unknown>) : {}))
        .filter((l) => typeof l.url === 'string' && l.url)
        .map((l) => ({ label: str(l.label) || str(l.url), url: str(l.url) }))
        .filter((l) => {
          // Validate URL protocol to prevent javascript:/data: XSS
          try {
            const u = new URL(l.url)
            return ['https:', 'http:', 'mailto:'].includes(u.protocol)
          } catch {
            return false
          }
        })
    : []
  return {
    bio: str(o.bio),
    favoriteSubject: str(o.favoriteSubject),
    studySchedule: str(o.studySchedule),
    studyInterests: strArr(o.studyInterests),
    banner: str(o.banner) || EMPTY_PROFILE_PUBLIC.banner,
    bannerImage: str(o.bannerImage) || null,
    bannerPos: Math.min(100, Math.max(0, num(o.bannerPos, 50))),
    logo: str(o.logo),
    socialLinks: links,
    likes: num(o.likes, 0),
  }
}

/** A row of the `public_profiles` view — the safe, cross-user-readable shape.
 *  NEVER contains age, email, or the private settings jsonb. */
export interface PublicProfile {
  id: string
  /** unique numeric Player ID — the shareable, searchable identity key. */
  player_id: number | null
  display_name: string
  avatar: import('../avatar/config').AvatarConfig
  avatar_url: string | null
  country: string | null
  rank: string | null
  public_profile: ProfilePublic
  created_at: string
  /** presence (from the chat migration); null/absent before it's applied. */
  last_seen_at?: string | null
  study_status?: StudyStatus
}

// Hard limits from the product spec.

// ============================================================================
// Chat system (friend-only messaging). Mirrors migrations/*_add-chat-system.sql.
// ============================================================================

/** Study/presence status a user broadcasts. 'focus' silences their chat popups. */
export type StudyStatus = 'available' | 'studying' | 'focus' | 'break' | 'offline'

export const STUDY_STATUS_LABEL: Record<StudyStatus, string> = {
  available: 'Available',
  studying: 'Studying',
  focus: 'Focus session',
  break: 'Taking a break',
  offline: 'Offline',
}

/** A friend request row, joined with the other party's public profile. */
export interface FriendRequest {
  id: string
  requester_id: string
  addressee_id: string
  status: 'pending' | 'accepted' | 'declined'
  created_at: string
}

/** A conversation (DM or group). */
export interface Conversation {
  id: string
  kind: 'dm' | 'group'
  title: string | null
  icon_url: string | null
  created_by: string
  dm_key: string | null
  created_at: string
  updated_at: string
}

/** A single chat message. */
export interface Message {
  id: string
  conversation_id: string
  sender_id: string
  body: string
  created_at: string
}

/** A member row (read cursor lives here). */
export interface ConversationMember {
  conversation_id: string
  user_id: string
  role: 'owner' | 'member'
  last_read_at: string
  joined_at: string
}

export type ReportReason = 'spam' | 'harassment' | 'inappropriate'

/** Max members in a group conversation (v1). */
export const MAX_GROUP_MEMBERS = 20
/** A user counts as "online" if seen within this window. */
export const ONLINE_WINDOW_MS = 90_000
