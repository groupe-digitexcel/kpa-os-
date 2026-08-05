import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { verifyLocalSession } from "@/lib/auth/localSession";

// Maps URL prefix -> allowed roles
const ROLE_ROUTES: Record<string, string[]> = {
  "/dashboard/director": ["director"],
  "/dashboard/accountant": ["accountant", "director"],
  "/dashboard/secretary": ["secretary", "director"],
  "/dashboard/teacher": ["teacher", "director"],
};

export async function middleware(request: NextRequest) {
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
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isProtected = path.startsWith("/dashboard");

  // Local desktop mode: a valid, SIGNED PIN session cookie is an acceptable
  // substitute for a live Supabase Auth session, so staff can start a fresh
  // session fully offline. The signature (HMAC) prevents a user from simply
  // editing the cookie in devtools to claim a different role. Role-specific
  // checks still also happen at the page/action level as defense in depth.
  const localSessionCookie =
    process.env.DATA_MODE === "local" ? request.cookies.get("local_pin_session")?.value : undefined;
  const localSession = localSessionCookie ? await verifyLocalSession(localSessionCookie) : null;
  const hasLocalPinSession = !!localSession;

  if (isProtected && !user && !hasLocalPinSession) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (isProtected && hasLocalPinSession && !user) {
    const role = localSession!.role;
    const matchedPrefix = Object.keys(ROLE_ROUTES).find((prefix) => path.startsWith(prefix));
    if (matchedPrefix && !ROLE_ROUTES[matchedPrefix].includes(role)) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  if (isProtected && user) {
    const { data: staff } = await supabase
      .from("staff")
      .select("role, active")
      .eq("auth_user_id", user.id)
      .single();

    if (!staff || !staff.active) {
      return NextResponse.redirect(new URL("/login?error=inactive", request.url));
    }

    const matchedPrefix = Object.keys(ROLE_ROUTES).find((prefix) => path.startsWith(prefix));
    if (matchedPrefix && !ROLE_ROUTES[matchedPrefix].includes(staff.role)) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
