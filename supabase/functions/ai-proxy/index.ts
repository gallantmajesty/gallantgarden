// Supabase Edge Function for AI Chat Proxy
// Deno runtime

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

interface RequestBody {
  messages: ChatMessage[]
  model?: string
  temperature?: number
  max_tokens?: number
}

// Only these models may be requested — a client cannot ask for arbitrary (and
// arbitrarily expensive) models through this proxy.
const OPENAI_MODELS = new Set(['gpt-4o-mini', 'gpt-4o', 'gpt-4.1-mini', 'gpt-4.1'])
const ANTHROPIC_MODELS = new Set(['claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022', 'claude-sonnet-4-20250514', 'claude-haiku-4-20250514'])
const MAX_TOKENS = 4000
const MIN_TEMPERATURE = 0
const MAX_TEMPERATURE = 2

function pickModel(model: string | undefined, provider: string): string {
  if (model) {
    const allowed = provider === 'anthropic' ? ANTHROPIC_MODELS : OPENAI_MODELS
    if (allowed.has(model)) return model
  }
  return provider === 'anthropic' ? 'claude-3-5-sonnet-20241022' : 'gpt-4o-mini'
}

async function callOpenAI(apiKey: string, body: RequestBody, model: string) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: body.messages,
      temperature: body.temperature ?? 0.7,
      max_tokens: Math.min(body.max_tokens ?? 2000, MAX_TOKENS),
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`OpenAI error: ${response.status} - ${error}`)
  }

  return response.json()
}

async function callAnthropic(apiKey: string, body: RequestBody, model: string) {
  const systemMessage = body.messages.find(m => m.role === 'system')
  const messages = body.messages.filter(m => m.role !== 'system')

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      system: systemMessage?.content || '',
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      temperature: body.temperature ?? 0.7,
      max_tokens: Math.min(body.max_tokens ?? 2000, MAX_TOKENS),
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Anthropic error: ${response.status} - ${error}`)
  }

  const data = await response.json()
  return {
    choices: [{
      message: {
        content: data.content[0]?.text || '',
        role: 'assistant'
      }
    }]
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  try {
    const body: RequestBody = await req.json()
    
    if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
      return new Response(JSON.stringify({ error: 'Messages array required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    if (body.messages.length > 50) {
      return new Response(JSON.stringify({ error: 'Too many messages' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    for (const m of body.messages) {
      if (typeof m.content !== 'string' || m.content.length > 20000) {
        return new Response(JSON.stringify({ error: 'Invalid message content' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
    }

    // Get API key from Supabase secrets
    const openaiKey = Deno.env.get('OPENAI_API_KEY')
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')
    const provider = Deno.env.get('AI_PROVIDER') || 'openai'

    if (provider === 'anthropic' && !anthropicKey) {
      return new Response(JSON.stringify({ error: 'Anthropic API key not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (provider === 'openai' && !openaiKey) {
      return new Response(JSON.stringify({ error: 'OpenAI API key not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const temp = body.temperature ?? 0.7
    if (typeof temp !== 'number' || temp < MIN_TEMPERATURE || temp > MAX_TEMPERATURE) {
      return new Response(JSON.stringify({ error: 'Invalid temperature' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const model = pickModel(body.model, provider)

    let data
    if (provider === 'anthropic') {
      data = await callAnthropic(anthropicKey!, body, model)
    } else {
      data = await callOpenAI(openaiKey!, body, model)
    }

    const content = data.choices?.[0]?.message?.content || ''

    return new Response(JSON.stringify({ content }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('AI Proxy error:', error)
    return new Response(JSON.stringify({ error: error.message || 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})