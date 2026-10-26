import { NextResponse } from 'next/server';
import { getSensorResponse } from '@/lib/data-store';

// All data is generated locally — no external database
export async function GET() {
  const response = getSensorResponse();
  return NextResponse.json(response);
}
