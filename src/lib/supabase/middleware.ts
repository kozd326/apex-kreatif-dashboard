import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('placeholder')) {
    return supabaseResponse;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isLoginPage = request.nextUrl.pathname.startsWith('/login');
  const isAuth = request.nextUrl.pathname.startsWith('/auth/');
  // Customer shares use an opaque, expiring token verified by a narrowly scoped
  // RPC; they must not inherit the team dashboard session requirement.
  const isClientPortal = request.nextUrl.pathname.startsWith('/portal/');
  const isPublicDemo =
    request.nextUrl.pathname === '/scald' ||
    request.nextUrl.pathname.startsWith('/scald/') ||
    request.nextUrl.pathname.startsWith('/demos/');

  if (!user && request.nextUrl.pathname.startsWith('/api/apex/')) return NextResponse.json({error:'Oturum açmanız gerekiyor.'},{status:401});
  if (!user && !isLoginPage && !isAuth && !isClientPortal && !isPublicDemo) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  if (user && isLoginPage) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
