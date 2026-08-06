// Razorpay webhook — authoritative credit. Verifies x-razorpay-signature
// (HMAC-SHA256 of the raw body with the webhook secret), then credits on
// payment.captured. Idempotent with razorpay-verify (txn = payment_id).

const RAZORPAY_WEBHOOK_SECRET = Deno.env.get("RAZORPAY_WEBHOOK_SECRET") ?? ""
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? ""
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""

async function hmacSha256(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  )
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data))
  return btoa(String.fromCharCode(...new Uint8Array(sig)))
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("ok", { status: 405 })
  if (!RAZORPAY_WEBHOOK_SECRET) return new Response("missing configuration", { status: 400 })

  const body = await req.text()
  const expected = await hmacSha256(RAZORPAY_WEBHOOK_SECRET, body)
  const received = req.headers.get("x-razorpay-signature") ?? ""
  if (expected !== received) return new Response("invalid signature", { status: 400 })

  let payload: { event?: string; payload?: { payment?: { entity?: Record<string, unknown> } } }
  try {
    payload = JSON.parse(body)
  } catch {
    return new Response("invalid body", { status: 400 })
  }

  if (payload.event === "payment.captured") {
    const entity = payload.payload?.payment?.entity
    if (entity) {
      const paymentId = entity.id as string
      const ownerId = (entity.notes as Record<string, string> | undefined)?.user_id as string | undefined
      const golden = Number((entity.notes as Record<string, string> | undefined)?.golden ?? 0)
      const amount = Number(entity.amount ?? 0)

      if (ownerId && golden > 0 && paymentId) {
        const { createClient } = await import("npm:@supabase/supabase-js@2")
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        const { error } = await supabase.rpc("credit_golden_leaves", {
          p_user: ownerId,
          p_amount: golden,
          p_cents: amount,
          p_tx: paymentId,
        })
        if (error) {
          console.error("credit_golden_leaves error", error.message)
          return new Response("failed to credit", { status: 500 })
        }
      }
    }
  }

  return new Response("ok", { status: 200 })
})
