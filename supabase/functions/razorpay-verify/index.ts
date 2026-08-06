// Razorpay verify — called by the client after a successful checkout for
// near-instant credit. Verifies the Razorpay signature, then confirms the
// payment is captured against the Razorpay API before crediting. Idempotent
// with the webhook (both use txn = payment_id).

const RAZORPAY_KEY_ID = Deno.env.get("RAZORPAY_KEY_ID") ?? ""
const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET") ?? ""
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? ""
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
}

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
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405)

  try {
    const token = req.headers.get("authorization")?.replace("Bearer ", "")
    if (!token) return json({ error: "Unauthorized" }, 401)
    const { createClient } = await import("npm:@supabase/supabase-js@2")
    const userClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const { data: { user }, error: authError } = await userClient.auth.getUser(token)
    if (authError || !user) return json({ error: "Unauthorized" }, 401)

    const { paymentId, orderId, signature } = await req.json()
    if (!paymentId || !orderId || !signature) return json({ error: "Missing fields" }, 400)

    // 1. Verify the client-side signature: HMAC(order_id|payment_id, key_secret).
    const expected = await hmacSha256(RAZORPAY_KEY_SECRET, `${orderId}|${paymentId}`)
    if (expected !== signature) return json({ error: "Invalid signature" }, 400)

    // 2. Confirm the payment is real + captured via the Razorpay API.
    const basic = "Basic " + btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`)
    const res = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}`, {
      headers: { Authorization: basic },
    })
    if (!res.ok) return json({ error: "Payment not found" }, 404)
    const payment = await res.json()
    if (payment.status !== "captured") return json({ error: "Payment not captured" }, 400)

    const ownerId = payment.notes?.user_id as string | undefined
    const golden = Number(payment.notes?.golden ?? 0)
    // Only the paying user may trigger the credit for this payment.
    if (!ownerId || ownerId !== user.id) return json({ error: "Not your payment" }, 403)
    if (!golden || golden <= 0) return json({ error: "Unknown pack" }, 400)

    const { error } = await userClient.rpc("credit_golden_leaves", {
      p_user: ownerId,
      p_amount: golden,
      p_cents: Number(payment.amount ?? 0),
      p_tx: paymentId,
    })
    if (error) {
      console.error("credit_golden_leaves error", error.message)
      return json({ error: "Failed to credit" }, 500)
    }

    return json({ ok: true, golden })
  } catch (err) {
    console.error("razorpay verify error", err)
    return json({ error: err instanceof Error ? err.message : "Verification failed" }, 500)
  }
})
