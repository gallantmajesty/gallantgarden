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
    goals: ['SAT', 'ACT', 'AP Exams', 'GRE', 'GMAT', 'LSAT', 'MCAT', 'CPA', 'CLEP', 'DSST'].map(goal),
  },
  {
    id: 'uk',
    title: 'United Kingdom',
    goals: ['GCSE', 'A-Level', 'UCAT', 'LNAT', 'BMAT', 'STEP', 'MAT', 'TSA'].map(goal),
  },
  {
    id: 'canada',
    title: 'Canada',
    goals: ['Alberta Diploma Exam', 'Ontario Literacy Test', 'CAEL', 'CELPIP'].map(goal),
  },
  {
    id: 'australia',
    title: 'Australia',
    goals: ['HSC (NSW)', 'VCE (Victoria)', 'QCE (Queensland)', 'SACE (SA)', 'WACE (WA)', 'ATAR'].map(goal),
  },
  {
    id: 'china',
    title: 'China',
    goals: ['Gaokao', 'HSK (Chinese Proficiency)', 'CET-4', 'CET-6'].map(goal),
  },
  {
    id: 'japan',
    title: 'Japan',
    goals: ['Common Test for University Admissions', 'EJU', 'JLPT', 'Center Test'].map(goal),
  },
  {
    id: 'korea',
    title: 'South Korea',
    goals: ['CSAT (Suneung)', 'TOPIK'].map(goal),
  },
  {
    id: 'europe',
    title: 'Europe',
    goals: [
      'Abitur (Germany)', 'Baccalauréat (France)', 'Selectividad (Spain)', 'Matura (Austria)',
      'Esame di Stato (Italy)', 'Vwo/Havo (Netherlands)', 'Studentereksamen (Denmark)',
      'Studentexamen (Sweden)', 'Pohjakoulutus (Finland)', 'Bacalaureat (Romania)',
      'Maturita (Czech Republic)', 'Érettségi (Hungary)', 'Unified State Exam (Russia)',
      'GSAT (Taiwan)',
    ].map(goal),
  },
  {
    id: 'southeast-asia',
    title: 'Southeast Asia',
    goals: [
      'SPM (Malaysia)', 'STPM (Malaysia)', 'GCE-O (Singapore)', 'GCE-A (Singapore)',
      'UPCAT (Philippines)', 'SBMPTN (Indonesia)', 'TNTHPT (Vietnam)',
      'Thai University Entrance Exam',
    ].map(goal),
  },
  {
    id: 'middle-east-africa',
    title: 'Middle East & Africa',
    goals: [
      'Thanaweya Amma (Egypt)', 'Tawjihi (Jordan/Palestine)', 'Konkour (Iran)',
      'YÖS (Turkey)', 'UTME (Nigeria)', 'KCSE (Kenya)', 'NSC (South Africa)',
    ].map(goal),
  },
  {
    id: 'south-america',
    title: 'South America',
    goals: [
      'ENEM (Brazil)', 'Vestibular (Brazil)', ' PSU (Chile)', 'ICFES (Colombia)',
      'UNAM (Mexico)', 'UTEC (Uruguay)',
    ].map(goal),
  },
  {
    id: 'international',
    title: 'International',
    goals: [
      'IB Diploma', 'Cambridge IGCSE', 'IELTS', 'TOEFL', 'PTE', 'CFA', 'ACCA',
      'Cambridge English', 'TestDaF (German)', 'DELE (Spanish)', 'DELF/DALF (French)',
      'HSK (Chinese)', 'JLPT (Japanese)', 'TOPIK (Korean)',
    ].map(goal),
  },
  {
    id: 'professional',
    title: 'Professional Certifications',
    goals: [
      'AWS Certification', 'Google Cloud Certification', 'Azure Certification',
      'PMP', 'CompTIA A+', 'CompTIA Network+', 'Cisco CCNA',
      'CISSP', 'CEH', 'ITIL', 'Six Sigma', 'SHRM',
      'Bar Exam', 'Medical Board Exams', 'Pharmacy License',
    ].map(goal),
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
