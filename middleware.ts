import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const INVITE_COOKIE_NAME = "slate360_invite_token";
const INVITE_TOKEN_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });
  const inviteToken = request.nextUrl.searchParams.get("invite")?.trim();

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

      if (member) {
        const { data: flags } = await supabase
          .from("org_feature_flags")
          .select("standalone_tour_builder, standalone_punchwalk")
          .eq("org_id", member.org_id)
          .maybeSingle();

        const hasStandalone = flags?.standalone_tour_builder || flags?.standalone_punchwalk;
        const orgTier = (member.organizations as { tier?: string } | null)?.tier;

        // Standalone-only: user has a standalone app flag but their org is on
        // trial (no platform subscription). Check is tier-independent so that
        // a DB-level tier change alone cannot escape the Walled Garden.
        if (hasStandalone && (!orgTier || orgTier === "trial")) {
          isStandaloneOnly = true;
        }
      }
    } catch (err) {
      console.error("[Middleware] Walled garden check failed:", err);
    }
  }

  const { pathname } = request.nextUrl;

  // ── Legacy route redirects ──────────────────────────────────────
  if (pathname === "/ceo" || pathname.startsWith("/ceo/")) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.replace(/^\/ceo/, "/operations-console");
    return NextResponse.redirect(url);
  }

  // ── Super Admin gate ────────────────────────────────────────────
  // Violently reject anyone without is_super_admin from /super-admin.
  // This runs BEFORE any other route check so there is no fallthrough.
  if (pathname.startsWith("/super-admin")) {
    if (!user) {
      return new NextResponse(null, { status: 403 });
    }
    // ONLY check app_metadata — user_metadata is user-writable and
    // would allow any authenticated user to self-escalate.
    const isSuperAdmin = user.app_metadata?.is_super_admin === true;
    if (!isSuperAdmin) {
      return new NextResponse(null, { status: 403 });
    }
  }

  // Protect authenticated routes — redirect to login if not authenticated
  const isBetaProtectedRoute =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/slatedrop") ||
    pathname.startsWith("/project-hub") ||
    pathname.startsWith("/site-walk");

  if (
    !user &&
    (isBetaProtectedRoute ||
      pathname.startsWith("/tour-builder") ||
      pathname.startsWith("/punchwalk"))
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(url);
  }

  // ── Phase 1: Block hidden placeholder module routes ──────────────
  // These modules are hidden from nav but must also be unreachable by
  // direct URL during Phase 1 beta. Pathname-only check — no DB query.
  const PHASE_1_BLOCKED_PATHS = [
    "/tours",
    "/design-studio",
    "/content-studio",
    "/geospatial",
    "/virtual-studio",
    "/analytics",
    "/tour-builder",
  ];
  if (user && PHASE_1_BLOCKED_PATHS.some((p) => pathname.startsWith(p))) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // ── Phase 1: Block hidden project sub-routes ──────────────────────
  // Tabs were trimmed but page files still compile. Block direct URL
  // access so beta users cannot manually navigate to placeholder pages.
  const PHASE_1_HIDDEN_PROJECT_SEGMENTS = [
    "budget",
    "schedule",
    "daily-logs",
    "observations",
    "drawings",
    "rfis",
    "submittals",
    "management",
  ];
  const projectSubMatch = pathname.match(/^\/project-hub\/[^/]+\/([^/]+)/);
  if (
    user &&
    projectSubMatch &&
    PHASE_1_HIDDEN_PROJECT_SEGMENTS.includes(projectSubMatch[1])
  ) {
    const projectId = pathname.split("/")[2];
    const url = request.nextUrl.clone();
    url.pathname = `/project-hub/${projectId}`;
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
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // Redirect logged-in users away from /login and /signup
  if (
    user &&
    (pathname === "/login" || pathname === "/signup")
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // Clickjacking protection for public portal routes
  // frame-ancestors 'none' — prevents embedding the portal page itself
  // frame-src — allows OUR page to embed S3 PDFs in an iframe
  if (pathname.startsWith("/portal")) {
    supabaseResponse.headers.set("X-Frame-Options", "DENY");
    supabaseResponse.headers.set(
      "Content-Security-Policy",
      "frame-ancestors 'none'; frame-src 'self' blob: https://*.s3.amazonaws.com https://*.r2.cloudflarestorage.com;"
    );
  }

  if (inviteToken && INVITE_TOKEN_PATTERN.test(inviteToken)) {
    supabaseResponse.cookies.set(INVITE_COOKIE_NAME, inviteToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: request.nextUrl.protocol === "https:",
      path: "/",
      maxAge: 60 * 60 * 24,
    });
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|glb|obj|mtl)$).*)",
  ],
};
