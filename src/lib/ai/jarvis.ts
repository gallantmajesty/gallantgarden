// Jarvis — the AI study assistant provider.
//
// Calls an LLM directly from the browser using a USER-SUPPLIED API key
// (stored only in localStorage, never synced to the cloud). Supports OpenAI
// and Anthropic today. The interface is deliberately small so an InsForge
// edge-function gateway can be dropped in later without touching callers.

export type AIProvider = 'openai' | 'anthropic'

export interface AIConfig {
  provider: AIProvider
  apiKey: string
  model: string
}

const KEY = 'sf.jarvis.config'

export function loadAIConfig(): AIConfig | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const c = JSON.parse(raw) as AIConfig
    if (!c.apiKey) return null
    return c
  } catch {
    return null
  }
}

export function saveAIConfig(c: AIConfig) {
  localStorage.setItem(KEY, JSON.stringify(c))
}

export function clearAIConfig() {
  localStorage.removeItem(KEY)
}

// ---- request helpers -------------------------------------------------------

interface ChatMsg {
  role: 'system' | 'user' | 'assistant'
  content: string
}

async function callLLM(cfg: AIConfig, messages: ChatMsg[], jsonMode: boolean): Promise<string> {
  if (cfg.provider === 'openai') {
    const body: Record<string, unknown> = {
      model: cfg.model,
      messages,
      temperature: 0.7,
    }
    if (jsonMode) body.response_format = { type: 'json_object' }
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cfg.apiKey}`,
      },
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(`OpenAI ${res.status}: ${(await res.text()).slice(0, 200)}`)
    const data = await res.json()
    return data.choices?.[0]?.message?.content ?? ''
  }

  // Anthropic
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': cfg.apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: cfg.model,
      max_tokens: 2000,
      system: messages.find((m) => m.role === 'system')?.content ?? '',
      messages: messages.filter((m) => m.role !== 'system').map((m) => ({ role: m.role, content: m.content })),
    }),
  })
  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${(await res.text()).slice(0, 200)}`)
  const data = await res.json()
  const text = Array.isArray(data.content) ? data.content.map((b: any) => b.text ?? '').join('') : ''
  return text
}

// Robust JSON extraction — models sometimes wrap JSON in markdown fences.
function parseJSON<T>(raw: string): T {
  const cleaned = raw.trim().replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim()
  try {
    return JSON.parse(cleaned) as T
  } catch {
    const start = cleaned.indexOf('{')
    const end = cleaned.lastIndexOf('}')
    if (start >= 0 && end > start) return JSON.parse(cleaned.slice(start, end + 1)) as T
    throw new Error('Model did not return valid JSON')
  }
}

// ---- public Jarvis API -----------------------------------------------------

export async function jarvisChat(
  messages: { role: 'user' | 'assistant'; content: string }[],
): Promise<string> {
  const cfg = loadAIConfig()
  if (!cfg) throw new Error('NO_API_KEY')
  const sys =
    'You are Jarvis, a helpful study assistant inside Focus Lily — a student productivity app. ' +
    'Answer concisely and clearly. Use plain text, no markdown fences. ' +
    'If the student asks about study techniques, focus methods, or academic topics, give practical advice.'
  const allMessages: ChatMsg[] = [
    { role: 'system', content: sys },
    ...messages.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
  ]
  return callLLM(cfg, allMessages, false)
}

export interface GeneratedNote {
  label: string
  html: string
  tags: string[]
}

export interface Flashcard {
  q: string
  a: string
}

export interface SuggestedLink {
  fromLabel: string
  toLabel: string
  reason: string
}

export async function jarvisGenerateNotes(prompt: string, count = 6): Promise<GeneratedNote[]> {
  const cfg = loadAIConfig()
  if (!cfg) throw new Error('Set your AI API key in Settings → AI Assistant first.')
  const sys =
    'You are Jarvis, an academic study assistant. Given a topic, produce concise, accurate study notes. ' +
    'Return ONLY JSON: {"notes":[{"label":"short title","html":"1-2 sentence plain summary (no markdown)","tags":["topic","subtopic"]}]}.'
  const user = `Topic: ${prompt}\nCreate about ${count} connected study notes that build understanding from fundamentals to detail.`
  const raw = await callLLM(cfg, [
    { role: 'system', content: sys },
    { role: 'user', content: user },
  ], true)
  const data = parseJSON<{ notes: GeneratedNote[] }>(raw)
  return data.notes ?? []
}

export async function jarvisSummarize(html: string, mode: 'simplify' | 'expand' | 'keyfacts'): Promise<string> {
  const cfg = loadAIConfig()
  if (!cfg) throw new Error('Set your AI API key in Settings → AI Assistant first.')
  const sys =
    'You are Jarvis, an academic study assistant. Rewrite study-note text on request. Return ONLY the rewritten text, no preamble, no markdown fences.'
  const map = {
    simplify: 'Rewrite this note in simpler language a beginner would understand, keep it 1-3 sentences.',
    expand: 'Expand this note with one extra clarifying detail or example, keep it concise.',
    keyfacts: 'Extract the 3 key facts as a short bullet list (use • ).',
  } as const
  const raw = await callLLM(cfg, [
    { role: 'system', content: sys },
    { role: 'user', content: `${map[mode]}\n\nNOTE:\n${html}` },
  ], false)
  return raw.trim()
}

export async function jarvisFlashcards(text: string, count = 5): Promise<Flashcard[]> {
  const cfg = loadAIConfig()
  if (!cfg) throw new Error('Set your AI API key in Settings → AI Assistant first.')
  const sys =
    'You are Jarvis, an academic study assistant. From study material produce quiz flashcards. ' +
    'Return ONLY JSON: {"cards":[{"q":"question","a":"answer"}]}.'
  const raw = await callLLM(cfg, [
    { role: 'system', content: sys },
    { role: 'user', content: `Make ${count} flashcards from this material:\n\n${text}` },
  ], true)
  const data = parseJSON<{ cards: Flashcard[] }>(raw)
  return data.cards ?? []
}

export async function jarvisSuggestLinks(notes: { label: string; text: string }[]): Promise<SuggestedLink[]> {
  const cfg = loadAIConfig()
  if (!cfg) throw new Error('Set your AI API key in Settings → AI Assistant first.')
  const sys =
    'You are Jarvis, an academic study assistant. Given a list of notes, suggest which pairs are related and should be linked. ' +
    'Return ONLY JSON: {"links":[{"fromLabel":"...","toLabel":"...","reason":"one phrase"}]}. Only suggest strong, non-obvious links.'
  const list = notes.map((n, i) => `${i + 1}. ${n.label} — ${n.text}`).join('\n')
  const raw = await callLLM(cfg, [
    { role: 'system', content: sys },
    { role: 'user', content: `Notes:\n${list}` },
  ], true)
  const data = parseJSON<{ links: SuggestedLink[] }>(raw)
  return data.links ?? []
}
