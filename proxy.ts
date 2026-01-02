import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// 函数名必须改为 proxy 才能匹配文件名 proxy.ts
export function proxy(request: NextRequest) {
  return NextResponse.next();
}

