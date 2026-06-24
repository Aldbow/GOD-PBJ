import { NextResponse } from 'next/server';
import { ppkRoster, satkerData } from '../db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  // Simulate network delay for animations
  await new Promise(resolve => setTimeout(resolve, 500));

  if (id) {
    const ppk = ppkRoster.find(p => p.id === id);
    if (!ppk) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Find packages belonging to this PPK
    const satker = satkerData[ppk.satkerId];
    const packages = satker ? satker.packages.filter(p => p.pic === ppk.name) : [];

    return NextResponse.json({ ppk, packages });
  }

  // Return all roster
  return NextResponse.json(ppkRoster);
}
