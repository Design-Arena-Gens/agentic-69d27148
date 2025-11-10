import { NextRequest, NextResponse } from 'next/server';
import { processDueJobs } from '@/lib/dispatcher';
import { z } from 'zod';

const bodySchema = z
  .object({
    limit: z.number().int().min(1).max(50).optional(),
  })
  .optional();

export async function POST(request: NextRequest) {
  const json = await request.json().catch(() => ({}));
  const parsed = bodySchema.parse(json);
  const result = await processDueJobs(parsed?.limit);
  return NextResponse.json(result);
}
