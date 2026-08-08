// Golden-leaf store — creates a Stripe Checkout Session.
// verify_jwt = true (see supabase/config.toml) so only signed-in users can call.
// Amounts are decided HERE (server-side); the client only picks a pack id.
//
// Deploy:
//   supabase functions deploy stripe-checkout
//   supabase secrets set STRIPE_SECRET_KEY=sk_live_...
//
// Golden packs: id → [golden leaves, price in USD cents]
const PACKS: Record<string, [number, number]> = {
  g120: [120, 199],
  g320: [320, 499],
  g900: [900, 1299],
  g2400: [2400, 2999],
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? ""
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? ""
const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")

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

// Only allow return URLs on the caller's own origin (from the Origin header).
// Otherwise a scripted caller could redirect the post-payment page to a
// phishing site. Falls back to the app URL when untrusted or absent.
function safeReturnUrl(raw: unknown, origin: string | null): string {
  if (typeof raw !== "string" || raw.length === 0 || raw.length > 2000) return SUPABASE_URL
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return SUPABASE_URL
  }
  if (url.protocol !== "https:") {
    const isLocal = url.hostname === "localhost" || url.hostname === "127.0.0.1"
    if (url.protocol !== "http:" || !isLocal) return SUPABASE_URL
  }
  if (!origin) return SUPABASE_URL
  try {
    const o = new URL(origin)
    if (o.host !== url.host) return SUPABASE_URL
  } catch {
    return SUPABASE_URL
  }
  return url.toString()
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

    if (!STRIPE_SECRET_KEY) return json({ error: "Payments not configured" }, 500)

    const { packId, returnUrl } = await req.json()
    const pack = PACKS[packId as string]
    if (!pack) return json({ error: "Unknown pack" }, 400)
    const [golden, cents] = pack
    const base = safeReturnUrl(returnUrl, req.headers.get("origin"))

    const { default: Stripe } = await import("npm:stripe@14")
    const stripe = new Stripe(STRIPE_SECRET_KEY)

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: cents,
            product_data: { name: `${golden} Golden Leaves` },
          },
        },
      ],
      client_reference_id: user.id,
      metadata: { userId: user.id, golden: String(golden) },
      success_url: `${base}/store?status=success`,
      cancel_url: `${base}/store?status=cancel`,
    })

    return json({ url: session.url })
  } catch (err) {
    console.error("checkout error", err)
    return json({ error: err instanceof Error ? err.message : "Checkout failed" }, 500)
  }
})
