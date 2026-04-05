import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session — keeps auth tokens alive
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch org & tier information to enforce the walled garden
  let isStandaloneOnly = false;
  if (user) {
    try {
      const { data: member } = await supabase
        .from("organization_members")
        .select("org_id, organizations!inner(tier)")
        .eq("user_id", user.id)
        .single();
        
      const orgTier = (member?.organizations as { tier?: string } | null)?.tier;
      if (member && orgTier === "trial") {
        const { data: flags } = await supabase
          .from("org_feature_flags")
          .select("standalone_tour_builder, standalone_punchwalk")
          .eq("org_id", member.org_id)
          .maybeSingle();
          
        const hasStandalone = flags?.standalone_tour_builder || flags?.standalone_punchwalk;
        if (hasStandalone) {
          isStandaloneOnly = true;
        }
      }
    } catch (err) {
      console.error("[Middleware] Walled garden check failed:", err);
    }
  }

  const { pathname } = request.nextUrl;

  // ── Super Admin gate ────────────────────────────────────────────
  // Violently reject anyone without is_super_admin from /super-admin.
  // This runs BEFORE any other route check so there is no fallthrough.
  if (pathname.startsWith("/super-admin")) {
    if (!user) {
      return new NextResponse(null, { status: 403 });
    }
    const isSuperAdmin =
      user.app_metadata?.is_super_admin === true ||
      user.user_metadata?.is_super_admin === true;
    if (!isSuperAdmin) {
      return new NextResponse(null, { status: 403 });
    }
  }

  // Protect authenticated routes — redirect to login if not authenticated
  if (
    !user &&
    (pathname.startsWith("/dashboard") ||
      pathname.startsWith("/slatedrop") ||
      pathname.startsWith("/project-hub") ||
      pathname.startsWith("/tour-builder") ||
      pathname.startsWith("/punchwalk") ||
      pathname.startsWith("/site-walk") ||
      pathname.startsWith("/apps"))
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(url);
  }

  // Walled Garden Enforcer: Standalone-only users cannot access main platform
  if (
    user &&
    isStandaloneOnly &&
    (pathname.startsWith("/dashboard") ||
     pathname.startsWith("/slatedrop") ||
     pathname.startsWith("/project-hub"))
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/apps";
    return NextResponse.redirect(url);
  }

  // Redirect logged-in users away from /login and /signup
  if (
    user &&
    (pathname === "/login" || pathname === "/signup")
  ) {
    const url = request.nextUrl.clone();
    url.pathname = isStandaloneOnly ? "/apps" : "/dashboard";
    return NextResponse.redirect(url);
  }

  // Clickjacking protection for public portal routes
  // frame-ancestors 'none' — prevents embedding the portal page itself
  // frame-src — allows OUR page to embed S3 PDFs in an iframe
  if (pathname.startsWith("/portal")) {
    supabaseResponse.headers.set("X-Frame-Options", "DENY");
    supabaseResponse.headers.set(
      "Content-Security-Policy",
      "frame-ancestors 'none'; frame-src 'self' blob: https://*.s3.amazonaws.com;"
    );
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|glb|obj|mtl)$).*)",
  ],
};
