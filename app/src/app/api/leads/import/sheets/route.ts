import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { importLeads } from '@/lib/campaigns';
import { z } from 'zod';

const schema = z.object({
  campaignId: z.string().uuid(),
  spreadsheetId: z.string(),
  range: z.string().default('Leads!A:E'),
  headerRow: z.number().int().min(1).default(1),
  source: z.string().optional(),
});

const REQUIRED_COLUMNS = ['email'];

export async function POST(request: NextRequest) {
  const payload = await request.json();
  const parsed = schema.parse(payload);

  const email = process.env.GOOGLE_SHEETS_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(
    /\\n/g,
    '\n',
  );

  if (!email || !privateKey) {
    return NextResponse.json(
      {
        error:
          'Missing Google Sheets service account credentials. Configure GOOGLE_SHEETS_SERVICE_ACCOUNT_EMAIL and GOOGLE_SHEETS_PRIVATE_KEY.',
      },
      { status: 500 },
    );
  }

  const auth = new google.auth.JWT({
    email,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  const sheets = google.sheets({ version: 'v4', auth });
  const range = parsed.range || 'Leads!A:E';
  const { data } = await sheets.spreadsheets.values.get({
    spreadsheetId: parsed.spreadsheetId,
    range,
  });

  const rows = data.values ?? [];
  if (!rows.length) {
    return NextResponse.json({ created: 0 });
  }

  const headers = rows[parsed.headerRow - 1]?.map((header) =>
    header.toString().trim().toLowerCase(),
  );

  if (!headers) {
    return NextResponse.json(
      { error: 'Unable to parse headers from sheet' },
      { status: 400 },
    );
  }

  for (const column of REQUIRED_COLUMNS) {
    if (!headers.includes(column)) {
      return NextResponse.json(
        { error: `Sheet is missing required column: ${column}` },
        { status: 400 },
      );
    }
  }

  const leads = rows
    .slice(parsed.headerRow)
    .map((row) => {
      const mapped: Record<string, string> = {};
      headers.forEach((header, index) => {
        mapped[header] = row[index] ?? '';
      });

      return {
        email: (mapped['email'] ?? '').toLowerCase(),
        name: mapped['name']?.trim() || undefined,
        company: mapped['company']?.trim() || undefined,
        niche: mapped['niche']?.trim() || mapped['industry']?.trim() || undefined,
        website: mapped['website']?.trim() || undefined,
        tags: normalizeTags(mapped['tags']),
      };
    })
    .filter((lead) => !!lead.email);

  const result = await importLeads({
    campaignId: parsed.campaignId,
    leads,
    source: parsed.source ?? `sheets:${parsed.spreadsheetId}`,
  });

  return NextResponse.json(result);
}

function normalizeTags(value?: string) {
  if (!value) return [];
  return value
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
}
