import { STUDY_GOAL_GROUPS } from './studyGoals'

/* Every single goal in the catalog gets its own line from Max. Keyed by the
   goal LABEL (the source of truth in studyGoals.ts) so the ids derived below
   always match exactly — no slug-mismatch bugs. Local-language cheers for
   the country exams, motivation for the school classes, hype for the rest. */

const LINES_BY_LABEL: Record<string, string> = {
  // ------------------------------------------------------------ school
  'Class 1': "school's just starting for you — soak it up little one, every day counts!",
  'Class 2': "class two — tiny steps now, big leaps later. keep at it!",
  'Class 3': "class three — reading and maths are your best friends. enjoy the ride!",
  'Class 4': "class four — you're getting the hang of it. proud of you already!",
  'Class 5': "class five — the fun years. learn everything with wide eyes!",
  'Class 6': "middle school starts — build the habit now and it'll carry you forever.",
  'Class 7': "class seven — the science world opens up. stay curious!",
  'Class 8': "class eight — the year things get real. you're ready for it.",
  'Class 9': "class nine — foundations for the boards. steady practice and you'll walk in chill.",
  'Class 10': "class ten — boards are close. one chapter at a time, no stress.",
  'Class 11': "class eleven — this is where it gets serious. keep your head down and pace yourself.",
  'Class 12': "class twelve — the final lap. finish strong, the whole forest is rooting for you!",

  // ------------------------------------------------------------ India
  'JEE Main': "ohh JEE Main — that's a proper grind. but you got this, just stay consistent and it'll click.",
  'JEE Advanced': "JEE Advanced?? okay okay, i see you. respect. keep the basics sharp and you're golden.",
  'NEET UG': 'NEET — big syllabus, no cap. one chapter at a time and you\'ll be unstoppable.',
  CUET: "CUET — solid pick. lean into your strong subjects and it's yours.",
  NDA: "NDA — brains AND fitness. train your mind and your body and you're in.",
  'UPSC CSE': "UPSC is a marathon, not a sprint. go steady, trust the process, and you'll clear it.",
  'SSC CGL': "SSC CGL — speed on the maths, accuracy on reasoning, you'll smash it.",
  'SSC CHSL': "SSC CHSL — keep the typing sharp and the GK fresh, easy win.",
  CAT: "CAT — that's the speed game. grind those mocks and you'll smash it.",
  GATE: 'GATE prep, nice. past papers are your best friend there.',
  CLAT: "CLAT — the legal game. read wide, think fast, you'll clear it.",
  'CA Foundation': "CA Foundation — step one of a long climb. one paper at a time.",
  'CA Intermediate': "CA Inter — the real grind starts here. keep your notes tight.",
  'CA Final': "CA Final — last lap of a long race. finish strong, the articleship's waiting.",
  CS: "CS — company law and all that. stay consistent, you'll get there.",
  CMA: "CMA — cost n management accounting. practice the sums, easy.",
  'Railway Exams': 'Railway exams — speed matters. drill those mocks daily.',
  'State PSC Exams': 'State PSC — long syllabus, big dream. pace yourself and revise.',
  'Banking Exams': "Banking exams — accuracy first, speed later. you'll crack it.",
  'IBPS PO': "IBPS PO — prelims are the gate. mock tests are your weapon.",
  'SBI PO': "SBI PO — the big one. sharpen the quants and you're in.",
  'RRB Exams': "RRB — section by section, mock by mock. you got this.",

  // ------------------------------------------------------------ United States
  SAT: "SAT — practice tests are the real cheat code. you're on it.",
  ACT: "ACT — it's a pace game. drill the timing and you'll fly.",
  'AP Exams': "APs — college credit before college, nice. one subject at a time.",
  GRE: "GRE — vocab + quant reps and you're set. i believe in you.",
  GMAT: "GMAT — adaptive test, so stay calm and keep your head in the game.",
  LSAT: "LSAT — logic games are the boss fight. practice them till they're easy.",
  MCAT: "MCAT — that's a mountain. but summits are made one step at a time.",
  CPA: "CPA — four parts, one goal. keep the schedule and it's yours.",
  CLEP: "CLEP — shortcut to credits, respect. knock em out quick.",
  DSST: "DSST — another credit shortcut. study smart and clear it fast.",

  // ------------------------------------------------------------ United Kingdom
  GCSE: "GCSEs — steady revision and you'll walk in calm.",
  'A-Level': "A-Levels — the real deal. past papers + consistency = win.",
  UCAT: "UCAT — it's a timing beast. drill the sections daily.",
  LNAT: "LNAT — read wide and argue sharp. you'll ace the essay.",
  BMAT: "BMAT — the science + thinking mix. practice papers are key.",
  STEP: "STEP — Cambridge asks for the best, and you're working like it. keep pushing.",
  MAT: "MAT — Oxford maths. think slow, solve clean.",
  TSA: "TSA — critical thinking game. practice the logic and you're set.",

  // ------------------------------------------------------------ Canada
  'Alberta Diploma Exam': "Alberta diploma — finals carry weight, so prep like it. you got this.",
  'Ontario Literacy Test': "OSSLT — literacy check. read carefully and it's an easy pass.",
  CAEL: "CAEL — academic English in a day. practice the integrated tasks.",
  CELPIP: "CELPIP — all digital. get comfy with the interface and you'll score.",

  // ------------------------------------------------------------ Australia
  'HSC (NSW)': "HSC — the big finale of school. spread the revision, don't cram.",
  'VCE (Victoria)': "VCE — study designs are your map. follow em and you're safe.",
  'QCE (Queensland)': "QCE — keep those assessment tasks on track and you're golden.",
  'SACE (SA)': "SACE — stages 1 and 2. pace the research project, it's a chunk.",
  'WACE (WA)': "WACE — stay on top of the school-based assessments.",
  ATAR: "ATAR — the number everyone chases. just focus on learning, the rank follows.",

  // ------------------------------------------------------------ China
  Gaokao: 'Gaokao — jia you! one of the toughest, but day by day you\'ll get there. 加油!',
  'HSK (Chinese Proficiency)': 'HSK — jiā yóu! a little hanzi every day and the levels melt. 加油!',
  'CET-4': "CET-4 — vocab + listening reps. you'll clear it easy.",
  'CET-6': "CET-6 — the harder cousin. keep the reading sharp and you're in.",

  // ------------------------------------------------------------ Japan (speaks a little Japanese)
  'Common Test for University Admissions': 'common test huh — ganbatte ne! steady practice and you\'ll walk in calm. 頑張って!',
  EJU: 'EJU — ganbatte! keep the kanji and the basics sharp, the uni spot\'s yours. 頑張ってね!',
  JLPT: 'JLPT — ganbatte ne! a little kanji and listening every day and you\'re there. がんばれ!',
  'Center Test': 'center test — ganbarou! steady drills beat last-minute panic. 頑張ろう!',

  // ------------------------------------------------------------ South Korea
  'CSAT (Suneung)': "Suneung — hwaiting! it's one long hard day, but you've trained for it. 화이팅!",
  TOPIK: "TOPIK — hwaiting! vocab and reading reps and the level climbs. 화이팅!",

  // ------------------------------------------------------------ Europe
  'Abitur (Germany)': 'Abitur — viel Erfolg! steady on the LKs and you\'ll finish strong.',
  'Baccalauréat (France)': "le bac — bon courage! the dissertation practice pays off, trust it.",
  'Selectividad (Spain)': 'selectividad — ¡ánimo! repasa bien y tranquilo, you got it.',
  'Matura (Austria)': 'Matura — viel Erfolg! keep the written and oral practice balanced.',
  'Esame di Stato (Italy)': "esame di Stato — in bocca al lupo! the tesina prep is half the win.",
  'Vwo/Havo (Netherlands)': "vwo/havo — succes! stay on top of the exam topics, no stress.",
  'Studentereksamen (Denmark)': "studentereksamen — held og lykke! keep the subjects balanced and you're set.",
  'Studentexamen (Sweden)': "studentexamen — lycka till! the exam weeks are a marathon, pace yourself.",
  'Pohjakoulutus (Finland)': 'ylioppilaskirjoitukset — onnea! steady revision wins the spring.',
  'Bacalaureat (Romania)': "bacalaureat — succes! the probes need practice, you'll handle it.",
  'Maturita (Czech Republic)': "maturita — hodně štěstí! the oral part is half the game, practice speaking it.",
  'Érettségi (Hungary)': "érettségi — sok szerencsét! keep the two levels balanced and you're fine.",
  'Unified State Exam (Russia)': 'ЕГЭ — удачи! the test bank is your friend, drill it daily.',
  'GSAT (Taiwan)': 'GSAT — jiā yóu! 加油! keep the practice tests coming, you\'ll crush it.',

  // ------------------------------------------------------------ Southeast Asia
  'SPM (Malaysia)': "SPM — jom! keep the core subjects strong and you're set.",
  'STPM (Malaysia)': "STPM — two years of work pays off here. stay consistent.",
  'GCE-O (Singapore)': "O-Levels — semangat! the papers are fair if you've done the work.",
  'GCE-A (Singapore)': "A-Levels — the deep dive. past papers are your bible now.",
  'UPCAT (Philippines)': "UPCAT — laban! review the basics and the exam's just a formality.",
  'SBMPTN (Indonesia)': "SBMPTN — semangat! the try-outs are your best practice.",
  'TNTHPT (Vietnam)': 'TNTHPT — cố lên! steady revision and the score follows.',
  'Thai University Entrance Exam': "Thai entrance — su su na! keep your strong subjects sharp and you'll pass. สู้ๆ!",

  // ------------------------------------------------------------ Middle East & Africa
  'Thanaweya Amma (Egypt)': 'thanawya — ربنا معاك! the final year is heavy but you\'ve got this.',
  'Tawjihi (Jordan/Palestine)': 'tawjihi — بالتوفيق! pace the material, revise in chunks.',
  'Konkour (Iran)': 'konkur — موفق باشی! this one takes consistency, and you have it.',
  'YÖS (Turkey)': "YÖS — kolay gelsin! the maths section is your friend, drill it.",
  'UTME (Nigeria)': "UTME — you've got this! practice the past questions and JAMB is easy.",
  'KCSE (Kenya)': "KCSE — kazi iendelee! keep the revision steady, results follow.",
  'NSC (South Africa)': "NSC — ons gaan dit maak! pace your subjects and you'll shine.",

  // ------------------------------------------------------------ South America
  'ENEM (Brazil)': "ENEM — boa sorte! the redação needs practice, write a little daily.",
  'Vestibular (Brazil)': 'vestibular — força! past prova drills make it easy.',
  'PSU (Chile)': 'PSU — ¡ánimo! the math and language sections, drill them.',
  'ICFES (Colombia)': 'ICFES — ¡tú puedes! keep the components balanced.',
  'UNAM (Mexico)': 'UNAM — ¡échale ganas! the guide is gold, follow it.',
  'UTEC (Uruguay)': 'UTEC — ¡fuerza! steady study beats cramming.',

  // ------------------------------------------------------------ International
  'IB Diploma': "IB — the essays + exams marathon. keep the IA deadlines and you're golden.",
  'Cambridge IGCSE': "IGCSE — solid foundation pick. past papers and you're sorted.",
  IELTS: "IELTS — easy once you get the rhythm of the sections. you got this.",
  TOEFL: "TOEFL — consistent listening practice and you're golden.",
  PTE: "PTE — computer-scored, so speak clear and pace the sections.",
  CFA: "CFA — three levels of grind. one at a time, you'll charter it.",
  ACCA: "ACCA — the paper ladder. keep passing and the letters follow.",
  'Cambridge English': "Cambridge English — the levels climb with practice. keep going.",
  'TestDaF (German)': 'TestDaF — viel Erfolg! the academic German sections need daily reps.',
  'DELE (Spanish)': 'DELE — ¡suerte! hablar un poquito cada día y lo logras.',
  'DELF/DALF (French)': "DELF — bon courage! practice the listening and you'll pass.",
  'HSK (Chinese)': 'HSK — jiā yóu! 加油! a little hanzi daily and the levels melt.',
  'JLPT (Japanese)': 'JLPT — ganbatte! 頑張って! a bit of kanji daily and you\'re there.',
  'TOPIK (Korean)': "TOPIK — hwaiting! 화이팅! vocab + reading reps and the level climbs.",

  // ------------------------------------------------------------ Professional
  'AWS Certification': "AWS — build a little in the console daily, the cert follows.",
  'Google Cloud Certification': "GCP — the hands-on labs are your cheat code.",
  'Azure Certification': "Azure — spin up the labs and the concepts stick.",
  PMP: "PMP — the PMBOK is long, but the mock exams are your map.",
  'CompTIA A+': "A+ — hardware + software basics. the acronyms come with reps.",
  'CompTIA Network+': "Network+ — the OSI model is the skeleton. learn it once, use it forever.",
  'Cisco CCNA': "CCNA — lab, lab, lab. packet tracer is your best friend.",
  CISSP: "CISSP — think like a manager. the domains click with practice tests.",
  CEH: "CEH — the tools are the toys. practice the labs ethically, of course.",
  ITIL: "ITIL — the lifecycle is the story. learn the flow, pass the exam.",
  'Six Sigma': "Six Sigma — the DMAIC loop is the heart. learn it cold.",
  SHRM: "SHRM — the people rules. study the competencies, you'll clear it.",
  'Bar Exam': "the bar — heavy, but heavy just means extra proud when you pass.",
  'Medical Board Exams': "medical boards — that's a big one. take it block by block, you'll get there.",
  'Pharmacy License': "pharmacy license — the Naplex grind. practice questions daily.",

  // ------------------------------------------------------------ Other
  'College / University': "college — a fresh chapter. keep the balance and you'll love it.",
  'Professional Certification': "a cert — proof of the grind. pick your lane and commit.",
  'Language Learning': "language learning — a little every day beats a lot sometimes.",
  'Personal Learning': "personal learning — my favourite. learn what you love.",
  Other: "whatever it is — the forest's got your back. let's get it!",
}

export const GOAL_LINES: Record<string, string> = {}
for (const group of STUDY_GOAL_GROUPS) {
  for (const goal of group.goals) {
    // Some labels in the catalog carry a stray leading space; match on trim.
    GOAL_LINES[goal.id] = LINES_BY_LABEL[goal.label.trim()] ?? ''
  }
}
