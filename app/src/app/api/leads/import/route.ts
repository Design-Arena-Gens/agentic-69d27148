import { NextRequest, NextResponse } from 'next/server';
import { importLeads } from '@/lib/campaigns';
import { z } from 'zod';

const importSchema = z.object({
  campaignId: z.string().uuid(),
  source: z.string().optional(),
  leads: z
    .array(
      z.object({
        email: z.string(),
        name: z.string().nullable().optional(),
        company: z.string().nullable().optional(),
        niche: z.string().nullable().optional(),
        website: z.string().nullable().optional(),
        tags: z.union([z.string(), z.array(z.string())]).optional(),
        note: z.string().optional(),
      }),
    )
    .min(1),
});

export async function POST(request: NextRequest) {
  const payload = await request.json();
  const parsed = importSchema.parse(payload);
  const result = await importLeads({
    campaignId: parsed.campaignId,
    leads: parsed.leads.map((lead) => ({
      email: lead.email.toLowerCase(),
      name: lead.name ?? undefined,
      company: lead.company ?? undefined,
      niche: lead.niche ?? undefined,
      website: lead.website ?? undefined,
      note: lead.note ?? undefined,
      tags: normalizeTags(lead.tags),
    })),
    source: parsed.source,
  });
  return NextResponse.json(result);
}

function normalizeTags(input?: string | string[]) {
  if (!input) return [];
  if (Array.isArray(input)) return input.map((tag) => tag.trim()).filter(Boolean);
  return input
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
}
