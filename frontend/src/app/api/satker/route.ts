import { NextResponse } from 'next/server';
import { satkerData } from '../db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  // Simulate network delay for animations
  await new Promise(resolve => setTimeout(resolve, 500));

  if (id) {
    const satker = satkerData[id];
    if (satker) return NextResponse.json(satker);
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Return all as array
  return NextResponse.json(Object.values(satkerData));
}
