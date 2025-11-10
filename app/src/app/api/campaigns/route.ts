import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createCampaign } from '@/lib/campaigns';
import { z } from 'zod';

const createSchema = z.object({
  name: z.string().min(2),
  fromName: z.string().min(2),
  replyTo: z.string().email().optional().nullable(),
  objective: z.string().optional().nullable(),
  openingLineStyle: z.string().optional().nullable(),
  dailySendTarget: z.number().int().min(10).max(2000).optional(),
  followUpDelayDays: z.number().int().min(1).max(14).optional(),
  followUpLimit: z.number().int().min(0).max(5).optional(),
  sendWindowStartUtc: z.string().optional().nullable(),
  sendWindowEndUtc: z.string().optional().nullable(),
  emailStylePrompt: z.string().optional().nullable(),
  subjectStylePrompt: z.string().optional().nullable(),
  followUpPrompt: z.string().optional().nullable(),
});

export async function GET() {
  const campaigns = await prisma.campaign.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      prompts: true,
      leads: {
        select: {
          id: true,
          status: true,
        },
      },
      jobs: {
        select: {
          id: true,
          status: true,
        },
      },
    },
  });

  const withCounts = campaigns.map((campaign) => ({
    ...campaign,
    leadCount: campaign.leads.length,
    queuedCount: campaign.jobs.filter((job) => job.status === 'PENDING')
      .length,
  }));

  return NextResponse.json({ campaigns: withCounts });
}

export async function POST(request: NextRequest) {
  const payload = await request.json();
  const parsed = createSchema.parse(payload);

  const campaign = await createCampaign({
    name: parsed.name,
    fromName: parsed.fromName,
    replyTo: parsed.replyTo ?? undefined,
    objective: parsed.objective ?? undefined,
    openingLineStyle: parsed.openingLineStyle ?? undefined,
    dailySendTarget: parsed.dailySendTarget ?? undefined,
    followUpDelayDays: parsed.followUpDelayDays ?? undefined,
    followUpLimit: parsed.followUpLimit ?? undefined,
    sendWindowStartUtc: parsed.sendWindowStartUtc
      ? new Date(parsed.sendWindowStartUtc)
      : null,
    sendWindowEndUtc: parsed.sendWindowEndUtc
      ? new Date(parsed.sendWindowEndUtc)
      : null,
    emailStylePrompt: parsed.emailStylePrompt ?? undefined,
    subjectStylePrompt: parsed.subjectStylePrompt ?? undefined,
    followUpPrompt: parsed.followUpPrompt ?? undefined,
  });

  return NextResponse.json({ campaign });
}
