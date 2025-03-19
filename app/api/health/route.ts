import { NextResponse } from 'next/server';

export async function GET() {
  const healthcheck = {
    uptime: process.uptime(),
    status: 'ok',
    timestamp: Date.now(),
    version: process.env.VERSION || '1.0.0'
  };

  return NextResponse.json(healthcheck);
} 