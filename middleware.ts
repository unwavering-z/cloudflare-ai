import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// 必须叫这个名字
export function middleware(request: NextRequest) {
  return NextResponse.next();
}

// 关键：在这里强制声明
export const runtime = 'edge';

// 匹配规则，确保它不拦截不该拦截的东西
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
