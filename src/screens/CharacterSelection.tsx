import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ErrorBoundary from './ErrorBoundary'

// Simple character data for testing
const ALL_CHARACTERS = [
  { id: 'james', name: 'James', description: 'Classic student' },
  { id: 'claire', name: 'Claire', description: 'Studious student' },
  { id: 'samurai', name: 'Samurai', description: 'Legendary warrior', special: true }
]



interface CharacterCardProps {
  character: any
  isSelected: boolean
  onSelect: () => void
}

function CharacterCard({ character, isSelected, onSelect }: CharacterCardProps) {
  return (
    <div 
      className={`character-card ${isSelected ? 'selected' : ''}`}
      onClick={onSelect}
    >
      <div className="character-preview">
        <div className="character-3d">
          <div className="character-placeholder">
            <div className="avatar-icon">
              {character.id === 'samurai' ? '🗡️' : '👤'}
            </div>
            <div className="avatar-name">{character.name}</div>
          </div>
        </div>
      </div>
      <div className="character-info">
        <h3>{character.name}</h3>
        {character.special && (
          <span className="character-special">🌟 Special</span>
        )}
      </div>
      {isSelected && (
        <div className="character-selected">
          <span>✓ Selected</span>
        </div>
      )}
    </div>
  )
}

export function CharacterSelection() {
  const navigate = useNavigate()
  
  const [selectedCharacter, setSelectedCharacter] = useState('james')
  
  const allCharacters = ALL_CHARACTERS
  
  const handleCharacterSelect = (characterId: string) => {
    setSelectedCharacter(characterId)
  }
  
  const handleBack = () => {
    navigate('/avatar')
  }
  
  return (
    <ErrorBoundary>
      <div className="character-selection-root">
        {/* Header */}
        <div className="character-selection-header">
          <button className="back-button" onClick={handleBack}>
            ← Back to Avatar
          </button>
          
          <div className="character-selection-title">
            <h1>Choose Your Character</h1>
            <p>Select an avatar to customize</p>
          </div>
          
          <div className="user-stats">
            <span className="xp-petal">
              🌿 0
            </span>
            <span className="xp-gem">
              💎 0
            </span>
          </div>
        </div>
        
        {/* Character Grid */}
        <div className="character-grid">
          {allCharacters.map((character) => (
            <CharacterCard
              key={character.id}
              character={character}
              isSelected={selectedCharacter === character.id}
              onSelect={() => handleCharacterSelect(character.id)}
            />
          ))}
        </div>
        
      {/* Selected Character Info */}
      <div className="selected-character-info">
        <div className="selected-character-preview">
          <h2>Selected: {allCharacters.find(c => c.id === selectedCharacter)?.name}</h2>
          <div className="preview-3d">
            <div className="simple-avatar">
              <div className="avatar-emoji">
                {selectedCharacter === 'samurai' ? '🗡️' : '👤'}
              </div>
              <div className="avatar-name">{allCharacters.find(c => c.id === selectedCharacter)?.name}</div>
            </div>
          </div>
        </div>
        
        <div className="character-actions">
          <button 
            className="customize-button"
            onClick={() => navigate('/avatar')}
          >
            Customize Avatar
          </button>
        </div>
      </div>
        
        {/* Special Character Notice */}
        {selectedCharacter === 'samurai' && (
          <div className="samurai-notice">
            <div className="notice-content">
              <h3>🗡️ Samurai Character Selected!</h3>
              <p>
                You've chosen the legendary Samurai! This special character features:
              </p>
              <ul>
                <li>Traditional blue samurai armor</li>
                <li>Red shoulder guards and helmet crest</li>
                <li>White belt details</li>
                <li>Black face mask with eye holes</li>
                <li>Detailed katana sword</li>
              </ul>
              <p>
                Customize your samurai's appearance in the avatar editor!
              </p>
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  )
}