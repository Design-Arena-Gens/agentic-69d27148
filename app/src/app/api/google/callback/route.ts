import { NextRequest, NextResponse } from 'next/server';
import { handleOAuthCallback } from '@/lib/google';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const cookieStore = await cookies();
  const stored = cookieStore.get('google_oauth_state')?.value;

  if (!code || !state || !stored) {
    return NextResponse.redirect('/?auth=failed');
  }

  const [expectedState, redirectPath] = stored.split('|');

  if (!expectedState || expectedState !== state) {
    cookieStore.delete('google_oauth_state');
    return NextResponse.redirect('/?auth=failed');
  }

  try {
    await handleOAuthCallback(code);
    cookieStore.delete('google_oauth_state');
    return NextResponse.redirect(`${redirectPath}?auth=success`);
  } catch (err) {
    console.error(err);
    cookieStore.delete('google_oauth_state');
    return NextResponse.redirect('/?auth=failed');
  }
}
