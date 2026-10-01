import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

const AUTH_ONLY_PATHS = ["/login", "/signup", "/forgot-password"];
// API routes authenticate themselves and answer 401 instead of redirecting.
const PUBLIC_PATHS = [...AUTH_ONLY_PATHS, "/auth", "/api"];
const MFA_PATH = "/mfa";
// Reachable by a session that still has to pass the second factor.
const MFA_ALLOWED_PATHS = [MFA_PATH, "/auth", "/api"];

function matches(pathname: string, paths: string[]) {
  return paths.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/** Refreshes the Supabase session cookies and applies auth redirects. */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // Must run right after client creation: it refreshes an expired session.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname, search } = request.nextUrl;

  const redirectTo = (path: string) => {
    const url = request.nextUrl.clone();
    url.pathname = path;
    url.search = "";
    if (path === "/login" || path === MFA_PATH) url.searchParams.set("next", pathname + search);
    const redirect = NextResponse.redirect(url);
    for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie);
    return redirect;
  };

  if (!user && !matches(pathname, PUBLIC_PATHS)) return redirectTo("/login");
  if (user) {
    // UX only: RLS already denies data to aal1 sessions of users with a verified factor.
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    // user comes from getUser() (fresh), the session cookie may hold stale factors.
    const hasFactor = user.factors?.some((f) => f.status === "verified") ?? false;
    const needsMfa = hasFactor && aal?.currentLevel !== "aal2";
    if (needsMfa && !matches(pathname, MFA_ALLOWED_PATHS)) return redirectTo(MFA_PATH);
    if (!needsMfa && matches(pathname, [...AUTH_ONLY_PATHS, MFA_PATH])) return redirectTo("/");
  }

  return response;
}
