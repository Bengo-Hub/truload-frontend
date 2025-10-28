import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    service: 'TruLoad Frontend',
    timestamp: new Date().toISOString(),
    version: '0.1.0',
  });
}

