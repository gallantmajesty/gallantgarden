// Razorpay checkout — creates a Razorpay Order (INR).
// verify_jwt = true so only signed-in users can call. Amounts decided HERE.
//
// Deploy:
//   supabase functions deploy razorpay-checkout razorpay-verify razorpay-webhook
//   supabase secrets set RAZORPAY_KEY_ID=rzp_live_... RAZORPAY_KEY_SECRET=... RAZORPAY_WEBHOOK_SECRET=...

// Golden packs (INR): id → [golden leaves, amount in paise]
const PACKS: Record<string, [number, number]> = {
  r120: [120, 9900],
  r320: [320, 24900],
  r900: [900, 64900],
  r2400: [2400, 149900],
}

const RAZORPAY_KEY_ID = Deno.env.get("RAZORPAY_KEY_ID") ?? ""
const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET") ?? ""
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? ""
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? ""

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405)

  try {
    const token = req.headers.get("authorization")?.replace("Bearer ", "")
    if (!token) return json({ error: "Unauthorized" }, 401)

    const { createClient } = await import("npm:@supabase/supabase-js@2")
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) return json({ error: "Unauthorized" }, 401)

    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      return json({ error: "Payments not configured" }, 500)
    }

    const { packId } = await req.json()
    const pack = PACKS[packId as string]
    if (!pack) return json({ error: "Unknown pack" }, 400)
    const [golden, paise] = pack

    const basic = "Basic " + btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`)
    const res = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: { Authorization: basic, "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: paise,
        currency: "INR",
        receipt: `gold_${user.id.slice(0, 8)}_${Date.now()}`,
        notes: { user_id: user.id, golden: String(golden) },
      }),
    })
    const order = await res.json()
    if (!res.ok || !order.id) {
      console.error("razorpay create order", res.status, order)
      return json({ error: "Razorpay order failed" }, 502)
    }

    return json({
      orderId: order.id,
      keyId: RAZORPAY_KEY_ID,
      amount: order.amount,
      currency: "INR",
      golden,
      name: (user.email ?? "").split("@")[0] || "Player",
      email: user.email ?? "",
    })
  } catch (err) {
    console.error("razorpay checkout error", err)
    return json({ error: err instanceof Error ? err.message : "Checkout failed" }, 500)
  }
})
