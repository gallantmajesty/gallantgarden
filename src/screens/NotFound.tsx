import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

export function NotFound() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(180deg, #0a0604 0%, #16100a 100%)',
      color: '#d4af37',
      fontFamily: 'var(--font-serif-heading)',
      padding: '2rem',
    }}>
      <div style={{ textAlign: 'center', maxWidth: 400 }}>
        <div style={{ fontSize: '8rem', marginBottom: '1rem', opacity: 0.3 }}>404</div>
        <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', letterSpacing: '0.1em' }}>
          {t('notFound.title') || 'Realm Not Found'}
        </h1>
        <p style={{ color: '#b8956a', marginBottom: '2rem', lineHeight: 1.6 }}>
          {t('notFound.description') || "This path doesn't exist in FocusLily. The corridor you're looking for may have shifted, or never existed at all."}
        </p>
        <button
          onClick={() => navigate('/lobby')}
          style={{
            padding: '0.75rem 2rem',
            fontSize: '1rem',
            fontFamily: 'var(--font-serif-heading)',
            letterSpacing: '0.1em',
            background: 'linear-gradient(135deg, rgba(212,175,55,0.2), rgba(120,90,30,0.2))',
            border: '1px solid rgba(212,175,55,0.5)',
            color: '#d4af37',
            borderRadius: 4,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'linear-gradient(135deg, rgba(212,175,55,0.3), rgba(120,90,30,0.3))' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'linear-gradient(135deg, rgba(212,175,55,0.2), rgba(120,90,30,0.2))' }}
        >
          {t('notFound.backToLobby') || 'Return to Lobby'}
        </button>
      </div>
    </div>
  )
}