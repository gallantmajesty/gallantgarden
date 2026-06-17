// The "what are you studying for?" catalog, grouped exactly as the onboarding
// spec lays it out. Selections are stored on the profile as a flat list of ids
// and later drive AI recommendations, study-room matching, and content.

export interface StudyGoal {
  id: string
  label: string
}

export interface StudyGoalGroup {
  id: string
  title: string
  goals: StudyGoal[]
}

const goal = (label: string): StudyGoal => ({
  id: label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
  label,
})

export const STUDY_GOAL_GROUPS: StudyGoalGroup[] = [
  {
    id: 'school',
    title: 'School Education',
    goals: Array.from({ length: 12 }, (_, i) => goal(`Class ${i + 1}`)),
  },
  {
    id: 'india',
    title: 'India',
    goals: [
      'JEE Main', 'JEE Advanced', 'NEET UG', 'CUET', 'NDA', 'UPSC CSE', 'SSC CGL', 'SSC CHSL',
      'CAT', 'GATE', 'CLAT', 'CA Foundation', 'CA Intermediate', 'CA Final', 'CS', 'CMA',
      'Railway Exams', 'State PSC Exams', 'Banking Exams', 'IBPS PO', 'SBI PO', 'RRB Exams',
    ].map(goal),
  },
  {
    id: 'us',
    title: 'United States',
    goals: ['SAT', 'ACT', 'AP Exams', 'GRE', 'GMAT', 'LSAT', 'MCAT', 'CPA'].map(goal),
  },
  {
    id: 'uk',
    title: 'United Kingdom',
    goals: ['GCSE', 'A-Level', 'UCAT', 'LNAT'].map(goal),
  },
  {
    id: 'international',
    title: 'International',
    goals: ['IB Diploma', 'Cambridge IGCSE', 'IELTS', 'TOEFL', 'PTE', 'CFA', 'ACCA'].map(goal),
  },
  {
    id: 'other',
    title: 'Other',
    goals: [
      'College / University', 'Professional Certification', 'Language Learning',
      'Personal Learning', 'Other',
    ].map(goal),
  },
]

export const STUDY_GOALS_BY_ID = new Map(
  STUDY_GOAL_GROUPS.flatMap((g) => g.goals).map((g) => [g.id, g]),
)

export function studyGoalLabel(id: string): string {
  return STUDY_GOALS_BY_ID.get(id)?.label ?? id
}
