import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const updateSchema = z.object({
  accountId: z.string().uuid(),
  dailyLimit: z.number().int().min(50).max(2000).optional(),
  randomDelayMin: z.number().int().min(5).max(600).optional(),
  randomDelayMax: z.number().int().min(5).max(1200).optional(),
  active: z.boolean().optional(),
  label: z.string().optional(),
});

export async function GET() {
  const accounts = await prisma.gmailAccount.findMany({
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json({ accounts });
}

export async function PATCH(request: NextRequest) {
  const payload = await request.json();
  const parsed = updateSchema.parse(payload);

  if (
    parsed.randomDelayMin &&
    parsed.randomDelayMax &&
    parsed.randomDelayMin > parsed.randomDelayMax
  ) {
    throw new Error('randomDelayMin cannot exceed randomDelayMax');
  }

  const updated = await prisma.gmailAccount.update({
    where: { id: parsed.accountId },
    data: {
      dailyLimit: parsed.dailyLimit ?? undefined,
      randomDelayMin: parsed.randomDelayMin ?? undefined,
      randomDelayMax: parsed.randomDelayMax ?? undefined,
      active: parsed.active ?? undefined,
      label: parsed.label ?? undefined,
    },
  });

  return NextResponse.json({ account: updated });
}
