import { useNavigate } from 'react-router-dom'
import './About.css'

// About FocusLily — the story / mission page, opened from Interact → Info.

const FEATURES = [
  { icon: '🌙', title: 'Study Together, Stay Focused', body: 'Join study rooms filled with students working toward their own goals. The presence of others creates accountability and motivation while keeping a distraction-free environment.' },
  { icon: '🪷', title: 'Beautiful Virtual Realms', body: 'Study inside carefully crafted environments inspired by magical libraries, moonlit forests, floating gardens, ancient halls, and other immersive worlds.' },
  { icon: '👤', title: 'Identity Optional', body: 'Take part comfortably through customizable avatars and profiles — a welcoming space where the focus stays on learning.' },
  { icon: '🤝', title: 'Find Focus Buddies', body: 'Connect with students who share similar goals, subjects, and study schedules.' },
  { icon: '📈', title: 'Build Consistency', body: 'Track focus time, maintain streaks, celebrate milestones, and watch your progress grow over time.' },
]

const VISION = [
  'Studying feels enjoyable.',
  'Progress feels visible.',
  'Motivation feels natural.',
  'Community supports growth.',
]

export function About() {
  const navigate = useNavigate()
  return (
    <div className="about">
      <div className="about__sheet">
        <button className="about__close" onClick={() => navigate('/')} aria-label="Back to lobby">✕</button>

        <section className="about__hero">
          <div className="about__lily">🪷</div>
          <span className="about__kicker">About FocusLily</span>
          <h1>A Better Way to Study Together</h1>
          <p className="about__belief">FocusLily was created with a simple belief:<br /><b>No student should have to study alone.</b></p>
        </section>

        <section className="about__lead">
          <p>Around the world, millions of students struggle to stay focused, motivated, and consistent. Traditional study spaces can feel isolating, while social platforms often create distractions instead of helping students reach their goals.</p>
          <p>FocusLily reimagines online studying by combining the <b>accountability of studying with others</b> and the <b>comfort of a beautiful virtual world</b>. Instead of joining a crowded video call, students enter magical study realms where they can focus, grow, and connect with like-minded learners.</p>
        </section>

        <section className="about__mission">
          <h2>Our Mission</h2>
          <p>To help students build better study habits through <b>focus, community, and consistency</b>. Productivity should feel motivating, peaceful, and rewarding — not stressful or overwhelming. FocusLily makes studying feel like entering a calm world built specifically for learning.</p>
        </section>

        <section>
          <h2 className="about__center">What Makes FocusLily Different</h2>
          <div className="about__features">
            {FEATURES.map((f) => (
              <div key={f.title} className="about__feature">
                <div className="about__feature-icon">{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="about__vision">
          <h2>Our Vision</h2>
          <p>We imagine a future where students from every corner of the world gather in one shared learning space — a place where:</p>
          <ul>
            {VISION.map((v) => (
              <li key={v}><span>✦</span>{v}</li>
            ))}
          </ul>
          <p className="about__more">FocusLily is more than a study platform. It is a virtual world built around learning.</p>
        </section>

        <section className="about__name">
          <h2>Why the Name FocusLily?</h2>
          <p>The lily symbolizes <b>growth, calmness, and progress</b>. Just as a lily slowly blooms over time, meaningful learning happens through small, consistent efforts every day. FocusLily represents that journey — helping students grow one focused session at a time.</p>
        </section>

        <footer className="about__footer">
          <div className="about__lily about__lily--sm">🪷</div>
          <div className="about__tag">Study Together. Grow Together. Bloom Together.</div>
          <button className="sf-btn about__cta" onClick={() => navigate('/rooms')}>Enter a study realm</button>
        </footer>
      </div>
    </div>
  )
}
