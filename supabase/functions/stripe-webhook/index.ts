// Stripe webhook — verifies the signature and credits golden leaves on a
// completed checkout. Idempotent via credit_golden_leaves(tx = session id).
// verify_jwt = false (Stripe signs the request, it has no Supabase JWT).
//
// Deploy:
//   supabase functions deploy stripe-webhook
//   supabase secrets set STRIPE_SECRET_KEY=sk_live_... STRIPE_WEBHOOK_SECRET=whsec_...
//   Register this function's URL as a Stripe webhook for checkout.session.completed

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")
const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET")
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? ""
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("ok", { status: 405 })

  const sig = req.headers.get("stripe-signature")
  if (!STRIPE_SECRET_KEY || !STRIPE_WEBHOOK_SECRET || !sig) {
    return new Response("missing configuration", { status: 400 })
  }

  const { default: Stripe } = await import("npm:stripe@14")
  const stripe = new Stripe(STRIPE_SECRET_KEY)
  const body = await req.text()

  let event: { type: string; data: { object: Record<string, unknown> } }
  try {
    event = stripe.webhooks.constructEvent(body, sig, STRIPE_WEBHOOK_SECRET) as never
  } catch {
    return new Response("invalid signature", { status: 400 })
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object
    const userId = session.metadata?.userId as string | undefined
    const golden = Number(session.metadata?.golden ?? 0)
    const cents = Number(session.amount_total ?? 0)
    const txn = session.id as string

    if (userId && golden > 0 && txn) {
      const { createClient } = await import("npm:@supabase/supabase-js@2")
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
      const { error } = await supabase.rpc("credit_golden_leaves", {
        p_user: userId,
        p_amount: golden,
        p_cents: cents,
        p_tx: txn,
      })
      if (error) {
        console.error("credit_golden_leaves error", error.message)
        return new Response("failed to credit", { status: 500 })
      }
    }
  }

  return new Response("ok", { status: 200 })
})
