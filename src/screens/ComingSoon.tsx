import { useNavigate } from 'react-router-dom'
import './ComingSoon.css'

const features = [
  {
    id: 'train',
    title: 'Train Realms',
    description: 'Board the FocusLily Express and study in magical train carriages as you journey through enchanted destinations.',
    image: '/teasers/train-realms.png',
  },
  {
    id: 'blueprint',
    title: 'Blueprint',
    description: 'Visual mind-mapping with sticky notes, idea threads, and AI-powered study note generation.',
    image: '/teasers/blueprint.png',
  },
  {
    id: 'magnet',
    title: 'Task Magnet',
    description: 'Your all-in-one productivity command center with tasks, goals, habits, analytics, and more.',
    image: '/teasers/task-magnet.png',
  },
  {
    id: 'games',
    title: 'Games',
    description: 'Fun mini-games to take a break and recharge during your study sessions.',
    image: '/teasers/games.png',
  },
]

export function ComingSoon() {
  const navigate = useNavigate()

  return (
    <div className="cs-root">
      <button className="sf-btn secondary cs-back" onClick={() => navigate('/')}>
        ← Back
      </button>

      <header className="cs-header">
        <span className="sf-pill">FocusLily</span>
        <h1 className="cs-title">Coming Soon</h1>
        <p className="cs-subtitle">We're building something magical. Here's a sneak peek at what's next.</p>
      </header>

      <main className="cs-grid">
        {features.map((f) => (
          <article key={f.id} className="cs-card">
            <div className="cs-card-image">
              <img src={f.image} alt={f.title} loading="lazy" />
              <div className="cs-card-overlay">
                <span className="cs-badge">Coming Soon</span>
              </div>
            </div>
            <div className="cs-card-content">
              <h2 className="cs-card-title">{f.title}</h2>
              <p className="cs-card-desc">{f.description}</p>
            </div>
          </article>
        ))}
      </main>

      <footer className="cs-footer">
        <p>Want to be notified when these launch?</p>
        <span className="cs-footer-hint">Join FocusLily today — the Library is live.</span>
        <button className="sf-btn cs-cta" onClick={() => navigate('/')}>
          Explore the Library →
        </button>
      </footer>
    </div>
  )
}
