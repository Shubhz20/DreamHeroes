"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge, Ball, Button, Card, Field } from "@/components/ui";
import { formatMoney, formatMonthYear, formatDate } from "@/lib/format";

type Draw = {
  id: string;
  month: number;
  year: number;
  algorithm: string;
  status: string;
  winningNumbers: number[];
  poolTotalCents: number;
  pool5Cents: number;
  pool4Cents: number;
  pool3Cents: number;
  jackpotCarry: number;
  publishedAt: string | null;
  winnerCount: number;
};

type Simulation = {
  month: number;
  year: number;
  algorithm: string;
  winningNumbers: number[];
  poolTotalCents: number;
  pool5Cents: number;
  pool4Cents: number;
  pool3Cents: number;
  jackpotCarry: number;
  winners: { userId: string; userName: string; userEmail: string; tier: number; matchedCount: number; matchedNumbers: number[]; scoresSnapshot: number[] }[];
  perWinnerPrizes: { tier: number; cents: number; winnerCount: number }[];
};

export default function DrawsClient({
  defaultMonth,
  defaultYear,
  draws,
}: {
  defaultMonth: number;
  defaultYear: number;
  draws: Draw[];
}) {
  const router = useRouter();
  const [month, setMonth] = useState(defaultMonth);
  const [year, setYear] = useState(defaultYear);
  const [algorithm, setAlgorithm] = useState<"RANDOM" | "ALGORITHMIC">("RANDOM");
  const [sim, setSim] = useState<Simulation | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function runSimulation() {
    setBusy(true);
    setErr(null);
    const res = await fetch("/api/admin/draws/simulate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ month, year, algorithm }),
    });
    const body = await res.json();
    setBusy(false);
    if (!res.ok) return setErr(body.error ?? "Failed");
    setSim(body.data.simulation);
  }

  async function publish() {
    if (!sim) return;
    if (!confirm(`Publish ${formatMonthYear(sim.month, sim.year)}? This is final.`)) return;
    setBusy(true);
    setErr(null);
    const res = await fetch("/api/admin/draws/publish", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        month: sim.month,
        year: sim.year,
        algorithm: sim.algorithm,
        winningNumbers: sim.winningNumbers,
      }),
    });
    const body = await res.json();
    setBusy(false);
    if (!res.ok) return setErr(body.error ?? "Failed");
    setSim(null);
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display italic text-4xl">Draws</h1>
        <p className="text-ink-300 mt-1">Simulate, pre-analyse, and publish the monthly draw.</p>
      </header>

      <Card>
        <h2 className="font-display italic text-2xl mb-4">Run a draw</h2>
        <div className="grid md:grid-cols-4 gap-4 items-end">
          <Field label="Month">
            <select
              value={month}
              onChange={(e) => setMonth(parseInt(e.target.value))}
              className="w-full px-3.5 py-2.5 rounded-xl bg-ink-950 border border-ink-700"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>{new Date(Date.UTC(2024, m - 1, 1)).toLocaleString("en-US", { month: "long", timeZone: "UTC" })}</option>
              ))}
            </select>
          </Field>
          <Field label="Year">
            <select
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value))}
              className="w-full px-3.5 py-2.5 rounded-xl bg-ink-950 border border-ink-700"
            >
              {[year - 1, year, year + 1].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </Field>
          <Field label="Algorithm">
            <select
              value={algorithm}
              onChange={(e) => setAlgorithm(e.target.value as any)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-ink-950 border border-ink-700"
            >
              <option value="RANDOM">Random</option>
              <option value="ALGORITHMIC">Algorithmic (weighted)</option>
            </select>
          </Field>
          <div className="flex gap-2">
            <Button onClick={runSimulation} disabled={busy}>
              {busy ? "Running..." : "Simulate"}
            </Button>
            {sim && (
              <Button variant="danger" onClick={publish} disabled={busy}>
                Publish
              </Button>
            )}
          </div>
        </div>
        {err && <p className="text-sm text-rose-400 mt-3">{err}</p>}
      </Card>

      {sim && (
        <Card shimmer>
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
            <div className="flex-1">
              <div className="text-xs uppercase tracking-widest text-ember-300">Simulation preview (not published)</div>
              <h3 className="font-display italic text-3xl mt-2">
                {formatMonthYear(sim.month, sim.year)} · {sim.algorithm}
              </h3>
              <div className="mt-4 flex flex-wrap gap-2">
                {sim.winningNumbers.map((n) => (
                  <Ball key={n} value={n} size="lg" />
                ))}
              </div>
              <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <div className="text-xs uppercase tracking-widest text-ink-400">Pool total</div>
                  <div className="font-display italic text-xl">{formatMoney(sim.poolTotalCents)}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-widest text-ink-400">5-tier (40%)</div>
                  <div className="font-display italic text-xl">{formatMoney(sim.pool5Cents)}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-widest text-ink-400">4-tier (35%)</div>
                  <div className="font-display italic text-xl">{formatMoney(sim.pool4Cents)}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-widest text-ink-400">3-tier (25%)</div>
                  <div className="font-display italic text-xl">{formatMoney(sim.pool3Cents)}</div>
                </div>
              </div>
              {sim.jackpotCarry > 0 && (
                <p className="mt-3 text-xs text-ember-300">
                  Includes {formatMoney(sim.jackpotCarry)} carried from the previous month's jackpot.
                </p>
              )}
            </div>
          </div>

          <div className="mt-6">
            <div className="flex items-end justify-between mb-3">
              <h4 className="font-semibold">Projected winners — {sim.winners.length}</h4>
              <div className="flex gap-2 text-xs">
                {sim.perWinnerPrizes.map((p) => (
                  <Badge key={p.tier} tone="neutral">
                    {p.tier}-match · {p.winnerCount} × {formatMoney(p.cents)}
                  </Badge>
                ))}
              </div>
            </div>
            {sim.winners.length === 0 ? (
              <p className="text-sm text-ink-400">No winners with current scores in the pool.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-widest text-ink-400">
                      <th className="py-2">User</th>
                      <th className="py-2">Tier</th>
                      <th className="py-2">Matched</th>
                      <th className="py-2">Scores snapshot</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-800">
                    {sim.winners.map((w) => (
                      <tr key={w.userId}>
                        <td className="py-2">
                          <div className="font-medium">{w.userName}</div>
                          <div className="text-xs text-ink-400">{w.userEmail}</div>
                        </td>
                        <td className="py-2">
                          <Badge tone="accent">{w.tier}</Badge>
                        </td>
                        <td className="py-2 flex gap-1 flex-wrap">
                          {w.matchedNumbers.map((n) => <Ball key={n} value={n} size="sm" />)}
                        </td>
                        <td className="py-2 text-xs text-ink-400">{w.scoresSnapshot.join(", ")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Card>
      )}

      <section>
        <h2 className="font-display italic text-2xl mb-3">History</h2>
        {draws.length === 0 ? (
          <Card className="text-center text-ink-400 py-10">No draws yet.</Card>
        ) : (
          <Card className="p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[800px]">
                <thead className="bg-ink-950/60">
                  <tr className="text-left text-xs uppercase tracking-widest text-ink-400">
                    <th className="py-3 px-5">Month</th>
                    <th className="py-3 px-5">Status</th>
                    <th className="py-3 px-5">Algo</th>
                    <th className="py-3 px-5">Numbers</th>
                    <th className="py-3 px-5">Pool</th>
                    <th className="py-3 px-5">Winners</th>
                    <th className="py-3 px-5">Published</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-800">
                  {draws.map((d) => (
                    <tr key={d.id}>
                      <td className="py-3 px-5">{formatMonthYear(d.month, d.year)}</td>
                      <td className="py-3 px-5"><Badge tone={d.status === "PUBLISHED" ? "success" : "warn"}>{d.status}</Badge></td>
                      <td className="py-3 px-5"><Badge>{d.algorithm}</Badge></td>
                      <td className="py-3 px-5">
                        <div className="flex gap-1 flex-wrap">
                          {d.winningNumbers.map((n) => <Ball key={n} value={n} size="sm" />)}
                        </div>
                      </td>
                      <td className="py-3 px-5">{formatMoney(d.poolTotalCents)}</td>
                      <td className="py-3 px-5">{d.winnerCount}</td>
                      <td className="py-3 px-5 text-xs">{d.publishedAt ? formatDate(d.publishedAt) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </section>
    </div>
  );
}
