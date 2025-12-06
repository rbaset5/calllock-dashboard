import { NextResponse, type NextRequest } from 'next/server';

// Middleware completely disabled - using client-side auth only
// The @supabase/ssr library has bugs causing "Invalid fetch" errors
export async function middleware(request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  // Only match API routes that need middleware
  matcher: ['/api/:path*'],
};
