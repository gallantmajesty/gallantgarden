import { useNavigate } from 'react-router-dom'
import { ComingSoonModal } from '../components/ComingSoonModal'

export interface FeatureData {
  id: string
  title: string
  description: string
  image: string
}

export const featureData: Record<string, FeatureData> = {
  blueprint: {
    id: 'blueprint',
    title: 'Blueprint',
    description: 'Visual mind-mapping with sticky notes, idea threads, and AI-powered study note generation.',
    image: '/teasers/blueprint.png',
  },
  magnet: {
    id: 'magnet',
    title: 'Task Magnet',
    description: 'Your all-in-one productivity command center with tasks, goals, habits, analytics, and more.',
    image: '/teasers/task-magnet.png',
  },
  games: {
    id: 'games',
    title: 'Games',
    description: 'Fun mini-games to take a break and recharge during your study sessions.',
    image: '/teasers/games.png',
  },
  train: {
    id: 'train',
    title: 'Train Realms',
    description: 'Board the FocusLily Express and study in magical train carriages as you journey through enchanted destinations.',
    image: '/teasers/train-realms.png',
  },
  'uk-cafe': {
    id: 'uk-cafe',
    title: 'UK Cafe',
    description: 'A cozy British cafe atmosphere for focused study sessions with warm tea and soft rain.',
    image: '/teasers/uk-cafe.png',
  },
}

export function IndividualComingSoon({ featureId }: { featureId: string }) {
  const navigate = useNavigate()
  const f = featureData[featureId]

  if (!f) {
    // Fallback if feature not found
    navigate('/coming-soon', { replace: true })
    return null
  }

  return (
    <ComingSoonModal
      open={true}
      title={f.title}
      description={f.description}
      image={f.image}
      onClose={() => navigate('/lobby', { replace: true })}
    />
  )
}
