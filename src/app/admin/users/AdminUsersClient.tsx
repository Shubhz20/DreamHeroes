"use client";
import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Card, Field, Input } from "@/components/ui";
import { formatDate, formatMoney } from "@/lib/format";

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  charityId: string | null;
  charityName: string | null;
  charityPct: number;
  scoreCount: number;
  winCount: number;
  subscription: {
    plan: string;
    status: string;
    priceCents: number;
    currentPeriodEnd: string;
  } | null;
  createdAt: string;
};

export default function AdminUsersClient({
  users,
  charities,
}: {
  users: User[];
  charities: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<User | null>(null);
  const [draft, setDraft] = useState<any>({});
  const [err, setErr] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return users;
    return users.filter((u) => [u.email, u.name].some((s) => s.toLowerCase().includes(t)));
  }, [q, users]);

  function openEdit(u: User) {
    setEditing(u);
    setErr(null);
    setDraft({
      name: u.name,
      role: u.role,
      charityId: u.charityId ?? "",
      charityPct: u.charityPct,
      subPlan: u.subscription?.plan ?? "",
      subStatus: u.subscription?.status ?? "",
      subPeriodEnd: u.subscription?.currentPeriodEnd.slice(0, 10) ?? "",
    });
  }

  async function save() {
    if (!editing) return;
    setErr(null);
    const res = await fetch(`/api/admin/users/${editing.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: draft.name,
        role: draft.role,
        charityId: draft.charityId || null,
        charityPct: Number(draft.charityPct),
        subscription: editing.subscription
          ? {
              plan: draft.subPlan,
              status: draft.subStatus,
              currentPeriodEnd: draft.subPeriodEnd,
            }
          : undefined,
      }),
    });
    const body = await res.json();
    if (!res.ok) return setErr(body.error ?? "Failed");
    setEditing(null);
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="font-display italic text-4xl">Users</h1>
          <p className="text-ink-300 mt-1">{users.length} account(s).</p>
        </div>
        <Input
          placeholder="Search name or email..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="max-w-xs"
        />
      </header>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead className="bg-ink-950/60">
              <tr className="text-left text-xs uppercase tracking-widest text-ink-400">
                <th className="py-3 px-5">User</th>
                <th className="py-3 px-5">Role</th>
                <th className="py-3 px-5">Subscription</th>
                <th className="py-3 px-5">Charity</th>
                <th className="py-3 px-5">Scores / Wins</th>
                <th className="py-3 px-5">Joined</th>
                <th className="py-3 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-800">
              {filtered.map((u) => (
                <tr key={u.id}>
                  <td className="py-3 px-5">
                    <div className="font-medium">{u.name}</div>
                    <div className="text-xs text-ink-400">{u.email}</div>
                  </td>
                  <td className="py-3 px-5">
                    <Badge tone={u.role === "ADMIN" ? "accent" : "neutral"}>{u.role}</Badge>
                  </td>
                  <td className="py-3 px-5">
                    {u.subscription ? (
                      <div className="text-xs">
                        <div>{u.subscription.plan} · {formatMoney(u.subscription.priceCents)}</div>
                        <div className="text-ink-400">{u.subscription.status} → {formatDate(u.subscription.currentPeriodEnd)}</div>
                      </div>
                    ) : (
                      <span className="text-xs text-ink-400">None</span>
                    )}
                  </td>
                  <td className="py-3 px-5 text-xs">
                    {u.charityName ? (
                      <>
                        <div>{u.charityName}</div>
                        <div className="text-ink-400">{u.charityPct}%</div>
                      </>
                    ) : (
                      <span className="text-ink-400">—</span>
                    )}
                  </td>
                  <td className="py-3 px-5 text-xs">
                    {u.scoreCount} / {u.winCount}
                  </td>
                  <td className="py-3 px-5 text-xs">{formatDate(u.createdAt)}</td>
                  <td className="py-3 px-5 text-right">
                    <Button size="sm" variant="ghost" onClick={() => openEdit(u)}>Edit</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/80 p-4">
          <Card className="w-full max-w-xl">
            <h3 className="font-display italic text-2xl mb-4">Edit {editing.email}</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Name">
                <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
              </Field>
              <Field label="Role">
                <select
                  value={draft.role}
                  onChange={(e) => setDraft({ ...draft, role: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-ink-950 border border-ink-700"
                >
                  <option value="USER">USER</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              </Field>
              <Field label="Charity">
                <select
                  value={draft.charityId}
                  onChange={(e) => setDraft({ ...draft, charityId: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-ink-950 border border-ink-700"
                >
                  <option value="">— none —</option>
                  {charities.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </Field>
              <Field label="Charity %">
                <Input
                  type="number"
                  min={10}
                  max={50}
                  value={draft.charityPct}
                  onChange={(e) => setDraft({ ...draft, charityPct: parseInt(e.target.value) })}
                />
              </Field>
              {editing.subscription && (
                <>
                  <Field label="Plan">
                    <select
                      value={draft.subPlan}
                      onChange={(e) => setDraft({ ...draft, subPlan: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-ink-950 border border-ink-700"
                    >
                      <option value="MONTHLY">MONTHLY</option>
                      <option value="YEARLY">YEARLY</option>
                    </select>
                  </Field>
                  <Field label="Subscription status">
                    <select
                      value={draft.subStatus}
                      onChange={(e) => setDraft({ ...draft, subStatus: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-ink-950 border border-ink-700"
                    >
                      {["ACTIVE", "CANCELED", "LAPSED", "PENDING"].map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Period end">
                    <Input
                      type="date"
                      value={draft.subPeriodEnd}
                      onChange={(e) => setDraft({ ...draft, subPeriodEnd: e.target.value })}
                    />
                  </Field>
                </>
              )}
            </div>
            <p className="text-xs text-ink-400 mt-4">
              Need to edit scores? Use the user page from the API or direct Prisma studio — a dedicated
              editor is wired to <code>/api/admin/users/:id/scores</code>.
            </p>
            {err && <p className="text-sm text-rose-400 mt-3">{err}</p>}
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
              <Button onClick={save} disabled={isPending}>Save</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
