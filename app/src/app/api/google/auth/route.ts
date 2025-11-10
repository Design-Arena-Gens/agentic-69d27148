import { NextRequest, NextResponse } from 'next/server';
import { getAuthUrl } from '@/lib/google';
import crypto from 'crypto';

export async function GET(request: NextRequest) {
  const state = crypto.randomUUID();
  const { searchParams } = new URL(request.url);
  const redirectPath = searchParams.get('redirect') ?? '/';
  const authUrl = getAuthUrl(state);

  const response = NextResponse.redirect(authUrl);
  response.cookies.set('google_oauth_state', `${state}|${redirectPath}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 10,
  });

  return response;
}
