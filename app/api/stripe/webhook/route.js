import Stripe from "stripe";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(req) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");
  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Webhook signature failed:", err.message);
    return new Response("Invalid signature", { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const s = event.data.object;
    const { error } = await supabaseAdmin.from("profiles").upsert({
      user_id: s.client_reference_id,
      stripe_customer_id: s.customer,
      stripe_subscription_id: s.subscription,
      subscription_status: "active",
      updated_at: new Date().toISOString(),
      email: s.customer_details?.email,
    });
    if (error) console.error("Supabase upsert failed:", error.message);
  }

  if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
    const sub = event.data.object;
    await supabaseAdmin
      .from("profiles")
      .update({ subscription_status: sub.status, updated_at: new Date().toISOString() })
      .eq("stripe_customer_id", sub.customer);
  }

  return new Response("ok", { status: 200 });
}