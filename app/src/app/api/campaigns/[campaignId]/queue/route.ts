import { NextRequest, NextResponse } from 'next/server';
import { queueCampaign } from '@/lib/campaigns';

export async function POST(request: NextRequest) {
  const url = new URL(request.url);
  const segments = url.pathname.split('/');
  const index = segments.indexOf('campaigns');
  const campaignId = index >= 0 ? segments[index + 1] : null;

  if (!campaignId) {
    return NextResponse.json({ error: 'Campaign ID missing in URL' }, { status: 400 });
  }

  const result = await queueCampaign(campaignId);
  return NextResponse.json(result);
}
