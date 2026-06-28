"use client";

import { Fragment, useMemo, useState } from "react";
import {
  type BoardLead,
  formatCurrency,
  groupLeadsByAccount,
} from "@/lib/pipeline-board";
import { AccountProfileCard } from "./AccountProfileCard";
import { ScoreBadge } from "./ScoreBadge";

type AccountsTableProps = {
  leads: BoardLead[];
  brandColors?: string[];
  onSelectLead: (lead: BoardLead) => void;
};

export function AccountsTable({
  leads,
  brandColors,
  onSelectLead,
}: AccountsTableProps) {
  const accounts = useMemo(() => groupLeadsByAccount(leads), [leads]);
  const [expanded, setExpanded] = useState<string | null>(null);

  if (leads.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 px-6 py-16 text-center">
        <p className="font-[family-name:var(--font-display)] text-2xl text-white">
          Accounts appear as leads are scored
        </p>
        <p className="mx-auto mt-3 max-w-md text-sm text-zinc-400">
          Orange Slice ranks companies by hiring signals, news, and Reddit
          mentions — top accounts show here first.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#141414]">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className="border-b border-white/10 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            <th className="px-4 py-3">Account</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Score</th>
            <th className="px-4 py-3">Top contact</th>
            <th className="px-4 py-3">Persona</th>
            <th className="px-4 py-3 text-right">Value</th>
          </tr>
        </thead>
        <tbody>
          {accounts.map((account) => {
            const key = account.company.toLowerCase();
            const isOpen = expanded === key;
            const hasMultiple = account.contacts.length > 1;

            return (
              <Fragment key={key}>
                <tr
                  onClick={() => {
                    if (hasMultiple) {
                      setExpanded(isOpen ? null : key);
                    } else {
                      onSelectLead(account.topContact);
                    }
                  }}
                  className="cursor-pointer border-b border-white/5 transition hover:bg-white/5"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <CompanyMark name={account.company} />
                      <span className="font-medium text-white">
                        {account.company}
                      </span>
                      {hasMultiple && (
                        <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] text-zinc-400">
                          {account.contacts.length} contacts
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-xs text-zinc-300">
                      {account.contacts.length > 1 ? "Multi" : "New"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <ScoreBadge intentScore={account.maxScore} />
                  </td>
                  <td className="px-4 py-3 text-zinc-400">
                    {account.topContact.name}
                    <span className="text-zinc-600"> · </span>
                    {account.topContact.title}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {account.personaNames.slice(0, 2).map((name) => (
                        <span
                          key={name}
                          className="rounded border border-white/10 px-1.5 py-0.5 text-[10px] text-zinc-500"
                        >
                          {name}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums text-zinc-300">
                    {formatCurrency(account.totalValue)}
                  </td>
                </tr>
                {isOpen && (
                  <tr className="border-b border-white/5 bg-[#1a1a1a]/30">
                    <td colSpan={6} className="px-4 py-4">
                      <div className="mx-auto max-w-md">
                        <AccountProfileCard
                          lead={account.topContact}
                          brandColors={brandColors}
                        />
                        <button
                          type="button"
                          onClick={() => onSelectLead(account.topContact)}
                          className="mt-3 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs font-medium text-zinc-300 transition hover:bg-white/10 hover:text-white"
                        >
                          Open account details
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
                {isOpen &&
                  account.contacts.map((contact) => (
                    <tr
                      key={contact.id}
                      onClick={() => onSelectLead(contact)}
                      className="cursor-pointer border-b border-white/5 bg-[#1a1a1a]/50 transition hover:bg-white/5"
                    >
                      <td className="px-4 py-2.5 pl-14">
                        <span className="text-sm text-zinc-400">
                          {contact.name}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-300">
                          Suggested
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <ScoreBadge intentScore={contact.intentScore} compact />
                      </td>
                      <td className="px-4 py-2.5 text-xs text-zinc-500">
                        {contact.title}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-zinc-600">
                        {contact.personaName}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-xs tabular-nums text-zinc-500">
                        {formatCurrency(contact.value)}
                      </td>
                    </tr>
                  ))}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function CompanyMark({ name }: { name: string }) {
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  const hue = name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;

  return (
    <span
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-semibold text-white"
      style={{ backgroundColor: `hsl(${hue} 45% 35%)` }}
    >
      {initial}
    </span>
  );
}
