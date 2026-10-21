import { NextRequest, NextResponse } from 'next/server';
import { analyzeUserContext } from '@/lib/analyze';

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim();
  if (!q) {
    return NextResponse.json({ error: 'Missing q' }, { status: 400 });
  }
  const ids = (req.nextUrl.searchParams.get('ids') ?? '').split(',').map(s => s.trim()).filter(Boolean);
  return NextResponse.json(await analyzeUserContext(q, ids));
}
