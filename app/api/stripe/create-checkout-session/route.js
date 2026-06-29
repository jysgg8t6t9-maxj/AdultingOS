export const dynamic = "force-dynamic";

import Stripe from "stripe";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { cookies: { getAll: () => cookieStore.getAll() } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("subscription_status, stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingProfile && ["active", "trialing"].includes(existingProfile.subscription_status)) {
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: existingProfile.stripe_customer_id,
      return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/app`,
    });
    return Response.json({ url: portalSession.url });
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
    client_reference_id: user.id,
    customer_email: user.email,
    success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/app`,
    cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/pricing`,
  });
  return Response.json({ url: session.url });
}