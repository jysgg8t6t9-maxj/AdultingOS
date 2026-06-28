import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

export async function middleware(req) {
  const res = NextResponse.next();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (cookiesToSet) => cookiesToSet.forEach(({ name, value, options }) => res.cookies.set(name, value, options)),
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", req.url));

  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_status")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!profile || !["active", "trialing"].includes(profile.subscription_status)) {
    return NextResponse.redirect(new URL("/pricing", req.url));
  }

  return res;
}

export const config = { matcher: ["/app/:path*"] };