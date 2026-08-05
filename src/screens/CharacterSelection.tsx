import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ErrorBoundary from './ErrorBoundary'
import { effectiveCharacters } from '../avatar/characters'

// Derived from the single roster in src/avatar/characters.ts so editing there
// updates both this picker and the customization screen. Uses the effective
// roster so /owner rarity changes apply here automatically.
const ALL_CHARACTERS = effectiveCharacters().map((c) => ({
  id: c.id,
  name: c.name,
  description: c.description ?? '',
  icon: c.icon ?? '',
  gender: c.gender ?? 'male',
  rarity: (c.rarity ?? 'Common').toLowerCase() as 'common' | 'rare' | 'epic' | 'legendary',
}))

interface CharacterCardProps {
  character: typeof ALL_CHARACTERS[number]
  isSelected: boolean
  onSelect: () => void
}

function CharacterCard({ character, isSelected, onSelect }: CharacterCardProps) {
  const rarityColors: Record<string, string> = {
    common: '#8a8a8a',
    rare: '#4a90d9',
    epic: '#a855f7',
    legendary: '#f59e0b',
  }
  return (
    <div
      className={`character-card ${isSelected ? 'selected' : ''}`}
      onClick={onSelect}
      style={{ borderColor: isSelected ? rarityColors[character.rarity] : undefined }}
    >
      <div className="character-preview">
        <div className="character-3d">
          <div className="character-placeholder">
            <div className="avatar-icon">
              <img src={character.icon} alt={character.name} style={{ width: '64px', height: '64px', objectFit: 'contain' }} />
            </div>
          </div>
        </div>
      </div>
      <div className="character-info">
        <h3>{character.name}</h3>
        <span className="character-rarity" style={{ color: rarityColors[character.rarity] }}>
          {character.rarity.charAt(0).toUpperCase() + character.rarity.slice(1)}
        </span>
      </div>
      {isSelected && (
        <div className="character-selected" style={{ background: rarityColors[character.rarity] }}>
          <span>SELECTED</span>
        </div>
      )}
    </div>
  )
}

export function CharacterSelection() {
  const navigate = useNavigate()
  const [selectedCharacter, setSelectedCharacter] = useState('james')

  return (
    <ErrorBoundary>
      <div className="character-selection-root">
        <div className="character-selection-header">
          <button className="back-button" onClick={() => navigate('/avatar')}>
            ← Back
          </button>
          <div className="character-selection-title">
            <h1>Choose Your Character</h1>
          </div>
          <div className="user-stats">
            <span className="xp-petal">🌿 0</span>
            <span className="xp-gem">💎 0</span>
          </div>
        </div>

        <div className="character-grid">
          {ALL_CHARACTERS.map((character) => (
            <CharacterCard
              key={character.id}
              character={character}
              isSelected={selectedCharacter === character.id}
              onSelect={() => setSelectedCharacter(character.id)}
            />
          ))}
        </div>

        <div className="selected-character-info">
          <div className="selected-character-preview">
            <h2>{ALL_CHARACTERS.find(c => c.id === selectedCharacter)?.name}</h2>
            <div className="preview-3d">
              <div className="simple-avatar">
                <div className="avatar-emoji">
                  <img src={ALL_CHARACTERS.find(c => c.id === selectedCharacter)?.icon} alt="" style={{ width: '96px', height: '96px', objectFit: 'contain' }} />
                </div>
              </div>
            </div>
          </div>
          <div className="character-actions">
            <button className="customize-button" onClick={() => navigate('/avatar')}>
              Customize Avatar
            </button>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  )
}
