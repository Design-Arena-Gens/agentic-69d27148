'use client';

import { useMemo, useState } from 'react';
import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import Papa from 'papaparse';

type GmailAccount = {
  id: string;
  email: string;
  label: string | null;
  dailyLimit: number;
  randomDelayMin: number;
  randomDelayMax: number;
  active: boolean;
  createdAt: string;
};

type Campaign = {
  id: string;
  name: string;
  fromName: string;
  replyTo: string | null;
  objective: string | null;
  openingLineStyle: string | null;
  dailySendTarget: number;
  followUpDelayDays: number;
  followUpLimit: number;
  sendWindowStartUtc: string | null;
  sendWindowEndUtc: string | null;
  leadCount?: number;
  queuedCount?: number;
};

type LeadInput = {
  email: string;
  name?: string | null;
  company?: string | null;
  niche?: string | null;
  website?: string | null;
  tags?: string | string[] | null;
  note?: string | null;
};

const sectionClass =
  'rounded-3xl border border-slate-800 bg-slate-900/40 backdrop-blur-sm p-6 shadow-xl shadow-slate-950/40 space-y-6';

const headingClass =
  'text-slate-100 font-semibold text-lg tracking-tight flex items-center justify-between gap-4';

const labelClass =
  'text-sm font-medium text-slate-300 flex flex-col gap-2';

export default function Dashboard() {
  const queryClient = useQueryClient();

  const accountsQuery = useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      const res = await fetch('/api/accounts');
      if (!res.ok) throw new Error('Unable to load accounts');
      return (await res.json()) as { accounts: GmailAccount[] };
    },
  });

  const campaignsQuery = useQuery({
    queryKey: ['campaigns'],
    queryFn: async () => {
      const res = await fetch('/api/campaigns');
      if (!res.ok) throw new Error('Unable to load campaigns');
      return (await res.json()) as { campaigns: Campaign[] };
    },
  });

  const dispatcherMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/dispatcher', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error('Dispatch failed');
      return res.json();
    },
  });

  const updateAccount = useMutation({
    mutationFn: async (payload: Partial<GmailAccount> & { id: string }) => {
      const res = await fetch('/api/accounts', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accountId: payload.id,
          dailyLimit: payload.dailyLimit,
          randomDelayMin: payload.randomDelayMin,
          randomDelayMax: payload.randomDelayMax,
          active: payload.active,
          label: payload.label,
        }),
      });
      if (!res.ok) throw new Error('Unable to update account');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });

  const createCampaignMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Unable to create campaign');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    },
  });

  const queueCampaignMutation = useMutation({
    mutationFn: async (campaignId: string) => {
      const res = await fetch(`/api/campaigns/${campaignId}/queue`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Unable to queue campaign');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    },
  });

  const importLeadsMutation = useMutation({
    mutationFn: async (payload: {
      campaignId: string;
      leads: LeadInput[];
      source: string;
    }) => {
      const res = await fetch('/api/leads/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Unable to import leads');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    },
  });

  const sheetImportMutation = useMutation({
    mutationFn: async (payload: {
      campaignId: string;
      spreadsheetId: string;
      range: string;
    }) => {
      const res = await fetch('/api/leads/import/sheets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Unable to import sheet');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    },
  });

  const activeCampaign = campaignsQuery.data?.campaigns?.[0] ?? null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <div className="mx-auto flex max-w-7xl flex-col gap-10 px-6 pb-32 pt-16 lg:px-10">
        <header className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.5em] text-slate-500">
                Outreach Control Tower
              </p>
              <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Gmail Outreach Automation Agent
              </h1>
            </div>
            <div className="rounded-full border border-slate-800 bg-slate-900/70 px-4 py-2 text-sm text-slate-300">
              {new Date().toLocaleString()}
            </div>
          </div>
          <p className="max-w-3xl text-base text-slate-400">
            Connect Gmail inboxes, ingest fresh leads, and launch AI-personalized
            outreach that sends, tracks, and follows-up automatically with smart
            account rotation and throttled delivery.
          </p>
        </header>

        <StatsBar campaigns={campaignsQuery.data?.campaigns ?? []} accounts={accountsQuery.data?.accounts ?? []} />

        <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr]">
          <section className={sectionClass}>
            <SectionHeading title="1. Connect Gmail Accounts" />
            <p className="text-sm text-slate-400">
              Authorize burner or SDR inboxes via OAuth2. We store refresh tokens securely
              so the agent can rotate and send automatically.
            </p>
            <button
              className="inline-flex items-center justify-center rounded-full bg-emerald-500 px-4 py-2 text-sm font-medium text-emerald-50 transition hover:bg-emerald-400"
              onClick={() => {
                const redirect = encodeURIComponent(window.location.pathname);
                window.location.href = `/api/google/auth?redirect=${redirect}`;
              }}
            >
              Connect Gmail Inbox
            </button>
            <AccountTable
              accounts={accountsQuery.data?.accounts ?? []}
              isLoading={accountsQuery.isLoading}
              onUpdate={(account, patch) =>
                updateAccount.mutate({ ...account, ...patch })
              }
            />
          </section>

          <section className={sectionClass}>
            <SectionHeading title="Quick Actions" />
            <div className="space-y-3 text-sm text-slate-300">
              <ActionButton
                label="Process Pending Sends"
                hint="Trigger dispatcher to send all due emails now."
                loading={dispatcherMutation.isPending}
                onClick={() => dispatcherMutation.mutate()}
              />
              <ActionButton
                label="Refresh Campaigns"
                hint="Pull latest stats and queue state."
                onClick={() => queryClient.invalidateQueries()}
              />
              <ActionButton
                label="Queue Next Batch"
                hint={
                  activeCampaign
                    ? `Queue all NEW leads for ${activeCampaign.name}`
                    : 'Create a campaign before queuing leads.'
                }
                disabled={!activeCampaign || queueCampaignMutation.isPending}
                loading={queueCampaignMutation.isPending}
                onClick={() => {
                  if (activeCampaign) {
                    queueCampaignMutation.mutate(activeCampaign.id);
                  }
                }}
              />
            </div>
          </section>
        </div>

        <section className="grid gap-8 lg:grid-cols-[1.2fr_1fr]">
          <section className={sectionClass}>
            <SectionHeading title="2. Create Outreach Campaign" />
            <CampaignForm
              onSubmit={(payload) => createCampaignMutation.mutate(payload)}
              isSubmitting={createCampaignMutation.isPending}
            />
            <CampaignList
              campaigns={campaignsQuery.data?.campaigns ?? []}
              isLoading={campaignsQuery.isLoading}
            />
          </section>

          <section className={sectionClass}>
            <SectionHeading title="3. Load Lead Sources" />
            <LeadImportSection
              campaigns={campaignsQuery.data?.campaigns ?? []}
              onImportCsv={(payload) => importLeadsMutation.mutate(payload)}
              onImportSheet={(payload) => sheetImportMutation.mutate(payload)}
              isImporting={importLeadsMutation.isPending || sheetImportMutation.isPending}
            />
          </section>
        </section>
      </div>
    </div>
  );
}

function StatsBar({
  campaigns,
  accounts,
}: {
  campaigns: Campaign[];
  accounts: GmailAccount[];
}) {
  const totalTracks = useMemo(() => {
    const leadCount = campaigns.reduce((acc, campaign) => acc + (campaign.leadCount ?? 0), 0);
    const queued = campaigns.reduce((acc, campaign) => acc + (campaign.queuedCount ?? 0), 0);
    return { leadCount, queued };
  }, [campaigns]);

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Active Campaigns"
        value={campaigns.length}
        subtitle="ready to deploy"
      />
      <StatCard
        title="Connected Inboxes"
        value={accounts.length}
        subtitle="rotated automatically"
      />
      <StatCard
        title="Leads Imported"
        value={totalTracks.leadCount}
        subtitle="unique recipients"
      />
      <StatCard
        title="Emails Queued"
        value={totalTracks.queued}
        subtitle="awaiting send window"
      />
    </div>
  );
}

function StatCard({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: number;
  subtitle: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-900 bg-slate-900/60 p-5 shadow-lg shadow-slate-950/40">
      <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
        {title}
      </p>
      <div className="mt-3 text-3xl font-semibold text-white">{value}</div>
      <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
    </div>
  );
}

function SectionHeading({ title }: { title: string }) {
  return (
    <div className={headingClass}>
      <span>{title}</span>
      <span className="h-px flex-1 bg-gradient-to-r from-emerald-500/60 to-transparent" />
    </div>
  );
}

function AccountTable({
  accounts,
  isLoading,
  onUpdate,
}: {
  accounts: GmailAccount[];
  isLoading: boolean;
  onUpdate: (account: GmailAccount, patch: Partial<GmailAccount>) => void;
}) {
  if (isLoading) {
    return <p className="text-sm text-slate-500">Loading accounts…</p>;
  }

  if (!accounts.length) {
    return (
      <p className="text-sm text-slate-500">
        No inboxes connected yet. Authorize at least one Gmail account.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {accounts.map((account) => (
        <div
          key={account.id}
          className="grid gap-4 rounded-2xl border border-slate-800 bg-slate-900/50 p-4 sm:grid-cols-[1.2fr_1fr] sm:items-center"
        >
          <div>
            <p className="font-medium text-slate-100">{account.email}</p>
            <p className="text-xs text-slate-500">
              Daily limit {account.dailyLimit} emails • {account.randomDelayMin}-
              {account.randomDelayMax}s spacing
            </p>
          </div>
          <div className="flex items-center gap-3 sm:justify-end">
            <label className="flex items-center gap-2 text-xs text-slate-400">
              Active
              <input
                type="checkbox"
                checked={account.active}
                onChange={(event) =>
                  onUpdate(account, { active: event.target.checked })
                }
                className="h-4 w-4 rounded border border-slate-700 bg-slate-950 accent-emerald-500"
              />
            </label>
            <button
              className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300 transition hover:border-emerald-500/60 hover:text-emerald-400"
              onClick={() =>
                onUpdate(account, {
                  dailyLimit: account.dailyLimit + 25,
                })
              }
            >
              +25 cap
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function CampaignForm({
  onSubmit,
  isSubmitting,
}: {
  onSubmit: (payload: Record<string, unknown>) => void;
  isSubmitting: boolean;
}) {
  const [form, setForm] = useState({
    name: '',
    fromName: '',
    replyTo: '',
    objective: '',
    openingLineStyle: '',
    dailySendTarget: 200,
    followUpDelayDays: 2,
    followUpLimit: 1,
    sendWindowStart: '09:00',
    sendWindowEnd: '18:00',
    emailStylePrompt: '',
    subjectStylePrompt: '',
  });

  return (
    <form
      className="grid gap-4 rounded-2xl border border-slate-800 bg-slate-950/40 p-5"
      onSubmit={(event) => {
        event.preventDefault();
        const payload = {
          name: form.name || `Campaign ${new Date().toLocaleDateString()}`,
          fromName: form.fromName || 'Growth Team',
          replyTo: form.replyTo || null,
          objective: form.objective || null,
          openingLineStyle: form.openingLineStyle || null,
          dailySendTarget: form.dailySendTarget,
          followUpDelayDays: form.followUpDelayDays,
          followUpLimit: form.followUpLimit,
          sendWindowStartUtc: timeToUtc(form.sendWindowStart),
          sendWindowEndUtc: timeToUtc(form.sendWindowEnd),
          emailStylePrompt: form.emailStylePrompt || null,
          subjectStylePrompt: form.subjectStylePrompt || null,
        };
        onSubmit(payload);
        setForm({
          ...form,
          name: '',
          objective: '',
          openingLineStyle: '',
          emailStylePrompt: '',
          subjectStylePrompt: '',
        });
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={labelClass}>
          Campaign Name
          <input
            className="rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-500"
            value={form.name}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, name: event.target.value }))
            }
            placeholder="AI Partners Outreach"
          />
        </label>
        <label className={labelClass}>
          From Name
          <input
            className="rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-500"
            value={form.fromName}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, fromName: event.target.value }))
            }
            placeholder="Maya from CloserAI"
          />
        </label>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={labelClass}>
          Reply-To
          <input
            className="rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-500"
            value={form.replyTo}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, replyTo: event.target.value }))
            }
            placeholder="success@closer.ai"
          />
        </label>
        <label className={labelClass}>
          Objective
          <input
            className="rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-500"
            value={form.objective}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, objective: event.target.value }))
            }
            placeholder="Book discovery calls with AI agencies"
          />
        </label>
      </div>
      <label className={labelClass}>
        Personalization Notes
        <input
          className="rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-500"
          value={form.openingLineStyle}
          onChange={(event) =>
            setForm((prev) => ({
              ...prev,
              openingLineStyle: event.target.value,
            }))
          }
          placeholder="Compliment case studies & reference latest blog insight"
        />
      </label>
      <div className="grid gap-4 sm:grid-cols-3">
        <label className={labelClass}>
          Daily Target
          <input
            type="number"
            className="rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-500"
            value={form.dailySendTarget}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                dailySendTarget: Number(event.target.value),
              }))
            }
          />
        </label>
        <label className={labelClass}>
          Follow-up Days
          <input
            type="number"
            className="rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-500"
            value={form.followUpDelayDays}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                followUpDelayDays: Number(event.target.value),
              }))
            }
          />
        </label>
        <label className={labelClass}>
          Follow-up Count
          <input
            type="number"
            className="rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-500"
            value={form.followUpLimit}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                followUpLimit: Number(event.target.value),
              }))
            }
          />
        </label>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={labelClass}>
          Send Window Start (UTC)
          <input
            type="time"
            className="rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-500"
            value={form.sendWindowStart}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                sendWindowStart: event.target.value,
              }))
            }
          />
        </label>
        <label className={labelClass}>
          Send Window End (UTC)
          <input
            type="time"
            className="rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-500"
            value={form.sendWindowEnd}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                sendWindowEnd: event.target.value,
              }))
            }
          />
        </label>
      </div>
      <label className={labelClass}>
        Stylistic Guidance for AI
        <textarea
          className="rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-500"
          rows={3}
          value={form.emailStylePrompt}
          onChange={(event) =>
            setForm((prev) => ({
              ...prev,
              emailStylePrompt: event.target.value,
            }))
          }
          placeholder="Keep tone warm, non-salesy. Reference partner directory insights."
        />
      </label>
      <label className={labelClass}>
        Subject Line Direction
        <textarea
          className="rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-500"
          rows={2}
          value={form.subjectStylePrompt}
          onChange={(event) =>
            setForm((prev) => ({
              ...prev,
              subjectStylePrompt: event.target.value,
            }))
          }
          placeholder="Short, curiosity-driven subjects that mention partner niche."
        />
      </label>
      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-2 inline-flex items-center justify-center rounded-full bg-emerald-500 px-4 py-2 text-sm font-medium text-emerald-50 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? 'Creating…' : 'Save Campaign'}
      </button>
    </form>
  );
}

function CampaignList({
  campaigns,
  isLoading,
}: {
  campaigns: Campaign[];
  isLoading: boolean;
}) {
  if (isLoading) {
    return <p className="text-sm text-slate-500">Loading campaigns…</p>;
  }

  if (!campaigns.length) {
    return (
      <p className="text-sm text-slate-500">
        No campaigns yet. Launch your first sequence and connect leads.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {campaigns.map((campaign) => (
        <div
          key={campaign.id}
          className="rounded-2xl border border-slate-900 bg-slate-900/50 p-4"
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-white">{campaign.name}</p>
              <p className="text-xs text-slate-500">
                {campaign.leadCount ?? 0} leads • {campaign.queuedCount ?? 0} queued
              </p>
            </div>
            <div className="text-xs text-slate-500">
              Follow-ups: {campaign.followUpLimit} every{' '}
              {campaign.followUpDelayDays}d
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function LeadImportSection({
  campaigns,
  onImportCsv,
  onImportSheet,
  isImporting,
}: {
  campaigns: Campaign[];
  onImportCsv: (payload: {
    campaignId: string;
    leads: LeadInput[];
    source: string;
  }) => void;
  onImportSheet: (payload: {
    campaignId: string;
    spreadsheetId: string;
    range: string;
  }) => void;
  isImporting: boolean;
}) {
  const [selectedCampaign, setSelectedCampaign] = useState<string>('');
  const [sheetId, setSheetId] = useState('');
  const [sheetRange, setSheetRange] = useState('Leads!A:E');

  const handleCsvUpload = (file: File) => {
    if (!selectedCampaign) return;

    Papa.parse<LeadInput>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const leads = (results.data ?? []).filter(
          (lead) => lead.email && lead.email.length > 3,
        );
        if (leads.length) {
          onImportCsv({
            campaignId: selectedCampaign,
            leads,
            source: `csv:${file.name}`,
          });
        }
      },
    });
  };

  return (
    <div className="space-y-5">
      <label className={labelClass}>
        Target Campaign
        <select
          className="rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500"
          value={selectedCampaign}
          onChange={(event) => setSelectedCampaign(event.target.value)}
        >
          <option value="">Select campaign</option>
          {campaigns.map((campaign) => (
            <option key={campaign.id} value={campaign.id}>
              {campaign.name}
            </option>
          ))}
        </select>
      </label>

      <div className="space-y-3 rounded-2xl border border-dashed border-emerald-500/30 bg-emerald-500/5 p-4 text-sm text-emerald-200">
        <p className="font-medium text-emerald-100">Upload CSV</p>
        <p className="text-xs text-emerald-200/80">
          Required columns: email, optional: name, company, niche, website, tags
        </p>
        <input
          type="file"
          accept=".csv"
          className="w-full cursor-pointer rounded-xl border border-emerald-500/40 bg-emerald-950/10 px-3 py-2 text-emerald-100"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) handleCsvUpload(file);
            event.target.value = '';
          }}
          disabled={!selectedCampaign || isImporting}
        />
      </div>

      <div className="grid gap-3 rounded-2xl border border-slate-800 bg-slate-950/40 p-4 text-sm">
        <p className="font-medium text-slate-200">Sync from Google Sheets</p>
        <label className="text-xs text-slate-300">
          Spreadsheet ID
          <input
            className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500"
            value={sheetId}
            onChange={(event) => setSheetId(event.target.value)}
            placeholder="1A2b3C4d..."
          />
        </label>
        <label className="text-xs text-slate-300">
          Range (optional)
          <input
            className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500"
            value={sheetRange}
            onChange={(event) => setSheetRange(event.target.value)}
          />
        </label>
        <button
          className="inline-flex items-center justify-center rounded-full bg-slate-800 px-4 py-2 text-xs font-medium text-slate-200 transition hover:bg-slate-700 disabled:opacity-50"
          disabled={!selectedCampaign || !sheetId || isImporting}
          onClick={() => {
            if (selectedCampaign && sheetId) {
              onImportSheet({
                campaignId: selectedCampaign,
                spreadsheetId: sheetId,
                range: sheetRange,
              });
            }
          }}
        >
          {isImporting ? 'Syncing…' : 'Import Sheets'}
        </button>
      </div>
    </div>
  );
}

function ActionButton({
  label,
  hint,
  loading,
  onClick,
  disabled,
}: {
  label: string;
  hint: string;
  loading?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className="flex w-full flex-col items-start rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-3 text-left text-sm text-slate-200 transition hover:border-emerald-500/60 disabled:cursor-not-allowed disabled:opacity-60"
      onClick={onClick}
      disabled={disabled || loading}
    >
      <span className="font-medium text-white">
        {loading ? 'Processing…' : label}
      </span>
      <span className="text-xs text-slate-500">{hint}</span>
    </button>
  );
}

function timeToUtc(value: string) {
  if (!value) return null;
  const [hours, minutes] = value.split(':').map(Number);
  const now = new Date();
  now.setUTCHours(hours ?? 0, minutes ?? 0, 0, 0);
  return now.toISOString();
}
