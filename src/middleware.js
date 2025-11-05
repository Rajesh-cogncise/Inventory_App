import { NextResponse } from 'next/server'
 
// This function can be marked `async` if using `await` inside
export function middleware(request) {
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set('x-pathname', request.nextUrl.pathname);
      console.log("Middleware Pathname:", request.nextUrl.pathname);
      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
    }
 
export const config = {
  matcher: "/((?!api|_next/static|_next/image|favicon.ico).*)",
}