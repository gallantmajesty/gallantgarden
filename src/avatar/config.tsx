export type BodyType = 'male' | 'female'
export type HairStyle =
  | 'none'
  | 'crop'
  | 'pixie'
  | 'bob'
  | 'short_messy'
  | 'side_part'
  | 'curly'
  | 'fade'
  | 'medium_layered'
  | 'spiky'
  | 'academic_neat'
  | 'wavy'
  | 'long_straight'
  | 'shoulder'
  | 'wavy_long'
  | 'curly_long'
  | 'ponytail'
  | 'bun'
  | 'braided'
  | 'twintails'

export type SkinTone = 'light' | 'medium' | 'dark'
export type HairColor = 'brown' | 'black' | 'blonde' | 'chestnut' | 'red'
export type EyeColor = 'brown' | 'blue' | 'green' | 'hazel'
export type TopStyle = 'tee' | 'hoodie' | 'jacket' | 'blazer' | 'robe' | 'frock' | 'sarafan'
export type BottomStyle = 'pants' | 'shorts' | 'skirt' | 'wizardpants'
export type ShoeStyle = 'sneakers' | 'boots' | 'sandals' | 'whiteshoes'

export type AvatarConfig = {
  characterId?: string
  bodyType?: BodyType
  skin?: SkinTone
  hair?: HairStyle
  hairColor?: HairColor
  eyeColor?: EyeColor
  top?: TopStyle
  bottom?: BottomStyle
  shoes?: ShoeStyle
  height?: number
}

export const DEFAULT_AVATAR: Omit<Required<AvatarConfig>, 'characterId'> = {
  bodyType: 'male',
  skin: 'light',
  hair: 'short_messy',
  hairColor: 'brown',
  eyeColor: 'brown',
  top: 'hoodie',
  bottom: 'pants',
  shoes: 'sneakers',
  height: 170,
}